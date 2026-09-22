import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// The tricky part of createOrder is the lineItems verification and the transaction updates.
// Let's replace the whole function.

const start = content.indexOf('export async function createOrder(');
const end = content.indexOf('export async function refundOrder(', start);

const newCreateOrder = `export async function createOrder(input: {
  organizationId: string;
  shiftId?: string;
  locationId?: string | null;
  idempotencyKey?: string;
  customerDataId?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT';
  discountAmount?: number;
  couponCode?: string;
}) {
  try {
    if (input.idempotencyKey) {
      const existing = await db.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey, organizationId: input.organizationId }).all().first();
      if (existing) return { success: true, orderId: existing.id, totalAmount: existing.totalAmount, taxAmount: existing.taxAmount };
    }
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const cashierId = membership.id;
    if (input.items.length === 0) return { error: 'Cart is empty.' };

    const loc = await resolveLocationContext(input.organizationId, input.locationId).catch(e => { throw e; });

    if (input.shiftId) {
      const shift = await db.orm.public.RetailShift.where({ id: input.shiftId }).all().first();
      if (!shift || shift.organizationId !== input.organizationId) {
        throw new Error('Shift does not belong to this organization.');
      }
      if (loc && shift.locationId && shift.locationId !== loc.id) {
        throw new Error('Shift location does not match order location.');
      }
    }

    const orgProducts = await db.orm.public.RetailProduct.where({ organizationId: input.organizationId }).all();
    const productById = new Map(orgProducts.map((p) => [p.id, p]));

    const lineItems: { productId: string; quantity: number; unitPrice: number; unitCost: number | null; subtotal: number }[] = [];
    let subtotal = 0;
    
    // Check global limits first to fail fast, but transaction will do the real check on location stock
    for (const item of input.items) {
      const product = productById.get(item.productId);
      if (!product) return { error: 'A product in the cart is not available for this store.' };
      const quantity = item.quantity;
      if (!(quantity > 0)) return { error: 'Item quantities must be greater than zero.' };
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
        locationId: loc ? loc.id : null,
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
        
        if (loc) {
          const stock = await getOrInitLocationStock(tx, input.organizationId, loc.id, line.productId);
          if (!product.isWeighed && stock.stockQuantity < line.quantity) {
            throw new Error(\`Concurrency error: Not enough stock for \${product.name} at this location.\`);
          }
          const next = stock.stockQuantity - line.quantity;
          await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
          
          await tx.orm.public.RetailStockMovement.create({
            organizationId: input.organizationId,
            locationId: loc.id,
            productId: line.productId,
            delta: -line.quantity,
            beforeQty: stock.stockQuantity,
            afterQty: next,
            reason: 'SALE',
            referenceType: 'ORDER',
            referenceId: created.id,
            recordedById: cashierId,
          });
        } else {
          if (!product.isWeighed && product.stockQuantity < line.quantity) {
            throw new Error(\`Concurrency error: Not enough stock for \${product.name}\`);
          }
          const next = product.stockQuantity - line.quantity;
          await tx.orm.public.RetailProduct.where({ id: line.productId }).update({ stockQuantity: next });
          
          await tx.orm.public.RetailStockMovement.create({
            organizationId: input.organizationId,
            productId: line.productId,
            delta: -line.quantity,
            beforeQty: product.stockQuantity,
            afterQty: next,
            reason: 'SALE',
            referenceType: 'ORDER',
            referenceId: created.id,
            recordedById: cashierId,
          });
        }
      }

      if (coupon) {
        await tx.orm.public.RetailCoupon.where({ id: coupon.id }).update({ timesUsed: coupon.timesUsed + 1 });
      }

      if (input.paymentMethod !== 'SPLIT' && walletSettlementEnabled) {
        let wallet = await tx.orm.public.Wallet.where({ organizationId: input.organizationId }).all().first();
        if (!wallet) {
          wallet = await tx.orm.public.Wallet.create({ organizationId: input.organizationId, balance: 0, currency: 'USD' });
        }
        const transaction = await tx.orm.public.Transaction.create({
          status: 'COMPLETED',
          reference: \`RET-\${created.id.slice(0, 8)}\`,
          description: \`CityMart Sale (\${input.paymentMethod})\`
        });
        await tx.orm.public.Payment.create({
          transactionId: transaction.id,
          amount: totalAmount,
          currency: 'USD',
          method: input.paymentMethod,
          status: 'SUCCEEDED'
        });
        const newBalance = wallet.balance + totalAmount;
        await tx.orm.public.Wallet.where({ id: wallet.id }).update({ balance: newBalance });
        await tx.orm.public.LedgerEntry.create({
          walletId: wallet.id,
          transactionId: transaction.id,
          amount: totalAmount,
          type: 'CREDIT',
          balanceAfter: newBalance,
          description: \`Sale #\${created.id.slice(0, 8)}\`
        });
      }

      return created;
    });

    return { success: true, orderId: order.id, totalAmount, taxAmount };
  } catch (error) {
    console.error('Error creating order:', error);
    return { error: error instanceof Error ? error.message : 'Checkout failed.' };
  }
}

`;

content = content.substring(0, start) + newCreateOrder + content.substring(end);
fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched createOrder');
