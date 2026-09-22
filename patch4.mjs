import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// 1. Remove the broken idempotency key from openShift
code = code.replace(
  /if \(input\.idempotencyKey\) \{\n      const existing = await db\.orm\.public\.RetailOrder\.where\(\{ idempotencyKey: input\.idempotencyKey \}\)\.all\(\)\.first\(\);\n      if \(existing\) return \{ success: true, orderId: existing\.id, totalAmount: existing\.totalAmount, taxAmount: existing\.taxAmount \};\n    \}\n    const \{ membership \} = await requireMembership\(input\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'\]\);/g,
  `const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);`
);

// 2. We'll use the AST / string manipulation to completely replace createOrder.
const startIdx = code.indexOf('export async function createOrder(');
if (startIdx !== -1) {
  const endIdx = code.indexOf('\n  async function enrichOrders', startIdx);
  if (endIdx !== -1) {
    const replacement = `export async function createOrder(input: {
  organizationId: string;
  shiftId?: string;
  locationId?: string;
  idempotencyKey?: string;
  customerDataId?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT';
  discountAmount?: number;
  couponCode?: string;
}) {
  try {
    if (input.idempotencyKey) {
      const existing = await db.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey }).all().first();
      if (existing) return { success: true, orderId: existing.id, totalAmount: existing.totalAmount, taxAmount: existing.taxAmount };
    }
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const cashierId = membership.id;
    if (input.items.length === 0) return { error: 'Cart is empty.' };

    const orgProducts = await db.orm.public.RetailProduct.where({ organizationId: input.organizationId }).all();
    const productById = new Map(orgProducts.map((p) => [p.id, p]));

    const lineItems: { productId: string; quantity: number; unitPrice: number; unitCost: number | null; subtotal: number }[] = [];
    let subtotal = 0;
    for (const item of input.items) {
      const product = productById.get(item.productId);
      if (!product) return { error: 'A product in the cart is not available for this store.' };
      const quantity = item.quantity;
      if (!(quantity > 0)) return { error: 'Item quantities must be greater than zero.' };
      if (!product.isWeighed && product.stockQuantity < quantity) {
        return { error: \`Not enough stock for \${product.name} (have \${product.stockQuantity}, need \${quantity}).\` };
      }
      const lineSubtotal = product.price * quantity;
      lineItems.push({ productId: product.id, quantity, unitPrice: product.price, unitCost: product.cost ?? null, subtotal: lineSubtotal });
      subtotal += lineSubtotal;
    }

    let coupon: { id: string; code: string; type: string; value: number; minSpend: number; isActive: boolean; usageLimit: number | null; timesUsed: number; expiresAt: unknown } | null = null;
    const manualDiscount = Math.max(0, Math.min(input.discountAmount ?? 0, subtotal));
    if (input.couponCode?.trim()) {
      const code = input.couponCode.trim().toUpperCase();
      const found = await db.orm.public.RetailCoupon.where({ organizationId: input.organizationId, code }).all().first();
      if (!found) return { error: \`Coupon code \${code} is not valid for this store.\` };
      if (!found.isActive) return { error: \`Coupon code \${code} is inactive.\` };
      if (found.minSpend > 0 && subtotal < found.minSpend) {
        return { error: \`Coupon \${code} requires a minimum spend of \${found.minSpend}.\` };
      }
      if (found.usageLimit != null && found.timesUsed >= found.usageLimit) {
        return { error: \`Coupon code \${code} has reached its usage limit.\` };
      }
      coupon = found;
    }
    const couponDiscount = coupon
      ? Math.max(0, Math.min(coupon.type === 'FIXED' ? coupon.value : (subtotal * coupon.value) / 100, subtotal - manualDiscount))
      : 0;
    const discountAmount = manualDiscount + couponDiscount;

    let taxRate = 0;
    let walletSettlementEnabled = false;
    const settings = await db.orm.public.RetailSettings.where({ organizationId: input.organizationId }).all().first();
    if (settings && settings.taxEnabled && settings.taxRate !== undefined) {
      taxRate = settings.taxRate / 100;
    }
    if (settings && settings.walletSettlementEnabled) {
      walletSettlementEnabled = true;
    }

    const taxAmount = (subtotal - discountAmount) * taxRate;
    const totalAmount = subtotal - discountAmount + taxAmount;

    const order = await db.transaction(async (tx) => {
      const created = await tx.orm.public.RetailOrder.create({
        organizationId: input.organizationId,
        shiftId: input.shiftId,
        locationId: input.locationId,
        cashierId,
        customerDataId: input.customerDataId,
        couponId: coupon?.id,
        totalAmount,
        taxAmount,
        discountAmount,
        paymentMethod: input.paymentMethod,
        status: 'COMPLETED',
        idempotencyKey: input.idempotencyKey,
      });

      for (const line of lineItems) {
        await tx.orm.public.RetailOrderItem.create({
          orderId: created.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          subtotal: line.subtotal,
        });
        const product = await tx.orm.public.RetailProduct.where({ id: line.productId }).all().first();
        if (!product) throw new Error(\`Product not found during checkout.\`);
        if (!product.isWeighed && product.stockQuantity < line.quantity) {
          throw new Error(\`Concurrency error: Not enough stock for \${product.name}\`);
        }
        const next = product.stockQuantity - line.quantity;
        await tx.orm.public.RetailProduct.where({ id: line.productId }).update({ stockQuantity: next });
        await tx.orm.public.RetailStockMovement.create({
          organizationId: input.organizationId,
          locationId: input.locationId,
          productId: line.productId,
          delta: -line.quantity,
          beforeQty: product.stockQuantity,
          afterQty: next,
          reason: 'SALE',
          referenceType: 'ORDER',
          referenceId: created.id,
          note: \`Order \${created.id.slice(0, 8)}\`,
          recordedById: cashierId,
        });
        if (coupon) {
          await tx.orm.public.RetailCoupon.where({ id: coupon.id }).update({ timesUsed: coupon.timesUsed + 1 });
          coupon = { ...coupon, timesUsed: coupon.timesUsed + 1 };
        }
      }

      if (walletSettlementEnabled && totalAmount > 0) {
        let wallet = await tx.orm.public.Wallet.where({ organizationId: input.organizationId }).all().first();
        if (!wallet) {
          wallet = await tx.orm.public.Wallet.create({ organizationId: input.organizationId, balance: 0, currency: 'USD' });
        }
        const transaction = await tx.orm.public.Transaction.create({ status: 'SETTLED', reference: \`RET-\${created.id.slice(0, 8)}\`, description: \`ShopOS sale settlement\` });
        await tx.orm.public.LedgerEntry.create({ walletId: wallet.id, transactionId: transaction.id, amount: totalAmount, currency: wallet.currency ?? 'USD' });
        await tx.orm.public.Wallet.where({ id: wallet.id }).update({ balance: wallet.balance + totalAmount });
      }

      return created;
    });

    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');

    return { success: true, orderId: order.id, totalAmount, taxAmount };
  } catch (error) {
    console.error('Error creating order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create order.' };
  }
}\n`;

    code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  }
}

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('Fixed createOrder and openShift');
