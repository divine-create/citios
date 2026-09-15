'use server'

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function epochMs(instant: unknown) {
  return (instant as { epochMilliseconds: number }).epochMilliseconds;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const TAX_RATE = 0.08;

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function getCategories(organizationId: string) {
  try {
    const categories = await db.orm.public.RetailCategory.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(categories));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function createCategory(input: { organizationId: string; name: string; description?: string; parentId?: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Category name is required.' };
    const category = await db.orm.public.RetailCategory.create({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      parentId: input.parentId,
    });
    return { success: true, category: JSON.parse(JSON.stringify(category)) };
  } catch (error) {
    console.error('Error creating category:', error);
    return { error: 'Failed to create category.' };
  }
}

export async function updateCategory(categoryId: string, input: { name?: string; description?: string | null; parentId?: string | null }) {
  try {
    const cat = await db.orm.public.RetailCategory.where({ id: categoryId }).all().first();
    if (cat) await requireMembership(cat.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.parentId !== undefined) data.parentId = input.parentId;
    await db.orm.public.RetailCategory.where({ id: categoryId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { error: 'Failed to update category.' };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const cat = await db.orm.public.RetailCategory.where({ id: categoryId }).all().first();
    if (cat) await requireMembership(cat.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const productsUsingIt = await db.orm.public.RetailProduct.where({ categoryId }).all();
    if (productsUsingIt.length > 0) return { error: `${productsUsingIt.length} product(s) still use this category — reassign them first.` };
    await db.orm.public.RetailCategory.where({ id: categoryId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { error: 'Failed to delete category.' };
  }
}

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------

export async function getProducts(organizationId: string) {
  try {
    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    const categories = await db.orm.public.RetailCategory.where({ organizationId }).all();
    const enriched = products.map((p) => ({ ...p, categoryName: categories.find((c) => c.id === p.categoryId)?.name ?? null }));
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function createProduct(input: {
  organizationId: string;
  name: string;
  description?: string;
  barcode?: string;
  sku?: string;
  price: number;
  cost?: number;
  stockQuantity?: number;
  lowStockLevel?: number;
  isWeighed?: boolean;
  unit?: string;
  categoryId?: string;
  imageAssetId?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Product name is required.' };
    if (input.price == null || input.price < 0) return { error: 'A valid price is required.' };
    const product = await db.orm.public.RetailProduct.create({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      barcode: input.barcode,
      sku: input.sku,
      price: input.price,
      cost: input.cost,
      stockQuantity: input.stockQuantity ?? 0,
      lowStockLevel: input.lowStockLevel,
      isWeighed: input.isWeighed ?? false,
      unit: input.unit ?? 'ea',
      categoryId: input.categoryId,
      imageAssetId: input.imageAssetId,
    });
    return { success: true, product: JSON.parse(JSON.stringify(product)) };
  } catch (error) {
    console.error('Error creating product:', error);
    return { error: 'Failed to create product.' };
  }
}

export async function updateProduct(productId: string, input: {
  name?: string;
  description?: string | null;
  barcode?: string | null;
  sku?: string | null;
  price?: number;
  cost?: number | null;
  lowStockLevel?: number | null;
  isWeighed?: boolean;
  unit?: string;
  categoryId?: string | null;
  imageAssetId?: string | null;
}) {
  try {
    const prod = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (prod) await requireMembership(prod.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.barcode !== undefined) data.barcode = input.barcode;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.price !== undefined) data.price = input.price;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.lowStockLevel !== undefined) data.lowStockLevel = input.lowStockLevel;
    if (input.isWeighed !== undefined) data.isWeighed = input.isWeighed;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.imageAssetId !== undefined) data.imageAssetId = input.imageAssetId;
    await db.orm.public.RetailProduct.where({ id: productId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { error: 'Failed to update product.' };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const prod = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (prod) await requireMembership(prod.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.RetailProduct.where({ id: productId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error: 'Failed to delete product.' };
  }
}

// Manual stock correction (receiving stock outside a PO, shrinkage/damage
// write-offs, stocktake adjustments). `delta` is signed.
export async function adjustStock(productId: string, delta: number) {
  try {
    const prod = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (prod) await requireMembership(prod.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const product = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (!product) return { error: 'Product not found.' };
    const next = product.stockQuantity + delta;
    if (next < 0) return { error: 'Stock cannot go below zero.' };
    await db.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });
    return { success: true, stockQuantity: next };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { error: 'Failed to adjust stock.' };
  }
}

// ---------------------------------------------------------------------
// Registers & Shifts
// ---------------------------------------------------------------------

export async function getRegisters(organizationId: string) {
  try {
    const registers = await db.orm.public.RetailRegister.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(registers));
  } catch (error) {
    console.error('Error fetching registers:', error);
    return [];
  }
}

export async function createRegister(organizationId: string, name: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!name.trim()) return { error: 'Register name is required.' };
    const register = await db.orm.public.RetailRegister.create({ organizationId, name, isActive: true });
    return { success: true, register: JSON.parse(JSON.stringify(register)) };
  } catch (error) {
    console.error('Error creating register:', error);
    return { error: 'Failed to create register.' };
  }
}

// The single open shift for this org, if any — the whole POS/dashboard UI
// assumes one active register/shift at a time (matches the MVP scope of
// the existing ShopDashboard UI, which shows a single "Register: OPEN" chip).
export async function getOpenShift(organizationId: string) {
  try {
    const registers = await db.orm.public.RetailRegister.where({ organizationId }).all();
    for (const register of registers) {
      const shifts = await db.orm.public.RetailShift.where({ registerId: register.id, status: 'OPEN' }).all();
      if (shifts.length > 0) return JSON.parse(JSON.stringify({ ...shifts[0], registerName: register.name }));
    }
    return null;
  } catch (error) {
    console.error('Error fetching open shift:', error);
    return null;
  }
}

export async function openShift(input: { organizationId: string; registerId: string; openedById: string; openingFloat: number }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const existing = await db.orm.public.RetailShift.where({ registerId: input.registerId, status: 'OPEN' }).all();
    if (existing.length > 0) return { error: 'This register already has an open shift.' };
    const shift = await db.orm.public.RetailShift.create({
      organizationId: input.organizationId,
      registerId: input.registerId,
      openedById: input.openedById,
      openingFloat: input.openingFloat,
      status: 'OPEN',
    });
    return { success: true, shift: JSON.parse(JSON.stringify(shift)) };
  } catch (error) {
    console.error('Error opening shift:', error);
    return { error: 'Failed to open shift.' };
  }
}

export async function closeShift(shiftId: string, input: { closedById: string; actualCash: number }) {
  try {
    const s = await db.orm.public.RetailShift.where({ id: shiftId }).all().first();
    if (s) await requireMembership(s.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const shift = await db.orm.public.RetailShift.where({ id: shiftId }).all().first();
    if (!shift) return { error: 'Shift not found.' };
    if (shift.status === 'CLOSED') return { error: 'Shift is already closed.' };

    const orders = await db.orm.public.RetailOrder.where({ shiftId }).all();
    const cashSales = orders
      .filter((o) => o.paymentMethod === 'CASH' && o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const expectedCash = shift.openingFloat + cashSales;
    const discrepancy = input.actualCash - expectedCash;

    await db.orm.public.RetailShift.where({ id: shiftId }).update({
      status: 'CLOSED',
      closedById: input.closedById,
      closedAt: toInstant(new Date()),
      expectedCash,
      actualCash: input.actualCash,
      discrepancy,
    });
    return { success: true, expectedCash, discrepancy };
  } catch (error) {
    console.error('Error closing shift:', error);
    return { error: 'Failed to close shift.' };
  }
}

export async function getShiftHistory(organizationId: string) {
  try {
    const shifts = await db.orm.public.RetailShift.where({ organizationId }).all();
    shifts.sort((a, b) => epochMs(b.openedAt) - epochMs(a.openedAt));
    return JSON.parse(JSON.stringify(shifts));
  } catch (error) {
    console.error('Error fetching shift history:', error);
    return [];
  }
}

// ---------------------------------------------------------------------
// Orders / Checkout
// ---------------------------------------------------------------------

export async function createOrder(input: {
  organizationId: string;
  shiftId?: string;
  cashierId: string;
  customerDataId?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT';
  discountAmount?: number;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    if (input.items.length === 0) return { error: 'Cart is empty.' };

    const lineItems: { productId: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
    let subtotal = 0;
    for (const item of input.items) {
      const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      if (!product) return { error: 'A product in the cart no longer exists.' };
      if (!product.isWeighed && product.stockQuantity < item.quantity) {
        return { error: `Not enough stock for ${product.name} (have ${product.stockQuantity}, need ${item.quantity}).` };
      }
      const lineSubtotal = product.price * item.quantity;
      lineItems.push({ productId: product.id, quantity: item.quantity, unitPrice: product.price, subtotal: lineSubtotal });
      subtotal += lineSubtotal;
    }

    const discountAmount = input.discountAmount ?? 0;
    
    // FETCH REAL TAX RATE
    let taxRate = 0;
    const settings = await db.orm.public.RetailSettings.where({ organizationId: input.organizationId }).all().first();
    if (settings && settings.taxRate !== undefined) {
      taxRate = settings.taxRate / 100; // assuming UI inputs 8 for 8%
    } else {
      taxRate = 0;
    }
    // Note: Actually UI sets 0.08 if it's decimal. Let's check Settings.tsx.
    
    const taxAmount = (subtotal - discountAmount) * taxRate;
    const totalAmount = subtotal - discountAmount + taxAmount;

    const order = await db.orm.public.RetailOrder.create({
      organizationId: input.organizationId,
      shiftId: input.shiftId,
      cashierId: input.cashierId,
      customerDataId: input.customerDataId,
      totalAmount,
      taxAmount,
      discountAmount,
      paymentMethod: input.paymentMethod,
      status: 'COMPLETED',
    });

    for (const line of lineItems) {
      await db.orm.public.RetailOrderItem.create({
        orderId: order.id,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      });
      const product = await db.orm.public.RetailProduct.where({ id: line.productId }).all().first();
      if (product) {
        await db.orm.public.RetailProduct.where({ id: line.productId }).update({ stockQuantity: Math.max(0, product.stockQuantity - line.quantity) });
      }
    }

    return { success: true, orderId: order.id, totalAmount, taxAmount };
  } catch (error) {
    console.error('Error creating order:', error);
    return { error: 'Failed to complete sale.' };
  }
}

async function enrichOrders(organizationId: string, orders: any[]) {
  const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
  
  const cashierIds = [...new Set(orders.map((o) => o.cashierId))];
  const cashiers: Record<string, string> = {};
  for (const id of cashierIds) {
    const membership = await db.orm.public.Membership.where({ id }).all().first();
    if (membership) {
       const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
       cashiers[id] = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
    } else {
       cashiers[id] = 'Unknown';
    }
  }

  const customerIds = [...new Set(orders.map((o) => o.customerDataId).filter(Boolean))] as string[];
  const customers: Record<string, string> = {};
  for (const id of customerIds) {
    const cd = await db.orm.public.CustomerData.where({ id }).all().first();
    if (cd) {
       const rel = await db.orm.public.Relationship.where({ id: cd.relationshipId }).all().first();
       if (rel) {
           const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
           customers[id] = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
       }
    }
  }

  const enriched = [];
  for (const order of orders) {
    const items = await db.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
    enriched.push({
      ...order,
      cashierName: cashiers[order.cashierId] ?? 'Unknown',
      customerName: order.customerDataId ? (customers[order.customerDataId] ?? 'Unknown') : null,
      items: items.map((i) => ({ ...i, productName: products.find((p) => p.id === i.productId)?.name ?? 'Unknown' })),
    });
  }
  return enriched;
}

export async function getOrders(organizationId: string, options?: { limit?: number; status?: 'COMPLETED' | 'REFUNDED' }) {
  try {
    let orders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    if (options?.status) orders = orders.filter((o) => o.status === options.status);
    orders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    const limited = options?.limit ? orders.slice(0, options.limit) : orders;

    const enriched = await enrichOrders(organizationId, limited);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export async function getOrder(organizationId: string, orderId: string) {
  try {
    const order = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!order) return null;
    const [enriched] = await enrichOrders(organizationId, [order]);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export async function refundOrder(orderId: string, input: { refundedById: string; reason?: string }) {
  try {
    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (o) await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const order = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!order) return { error: 'Order not found.' };
    if (order.status === 'REFUNDED') return { error: 'Order is already refunded.' };

    const items = await db.orm.public.RetailOrderItem.where({ orderId }).all();
    for (const item of items) {
      const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      if (product) {
        await db.orm.public.RetailProduct.where({ id: item.productId }).update({ stockQuantity: product.stockQuantity + item.quantity });
      }
    }
    await db.orm.public.RetailOrder.where({ id: orderId }).update({
      status: 'REFUNDED',
      refundedAt: toInstant(new Date()),
      refundedById: input.refundedById,
      refundReason: input.reason,
    });
    return { success: true };
  } catch (error) {
    console.error('Error refunding order:', error);
    return { error: 'Failed to refund order.' };
  }
}

// ---------------------------------------------------------------------
// Suppliers & Purchase Orders
// ---------------------------------------------------------------------

export async function getSuppliers(organizationId: string) {
  try {
    const suppliers = await db.orm.public.RetailSupplier.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(suppliers));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}

export async function createSupplier(input: { organizationId: string; name: string; contactName?: string; email?: string; phone?: string; leadTimeDays?: number; paymentTerms?: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Supplier name is required.' };
    const supplier = await db.orm.public.RetailSupplier.create({
      organizationId: input.organizationId,
      name: input.name,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
    });
    return { success: true, supplier: JSON.parse(JSON.stringify(supplier)) };
  } catch (error) {
    console.error('Error creating supplier:', error);
    return { error: 'Failed to create supplier.' };
  }
}

export async function updateSupplier(supplierId: string, input: { name?: string; contactName?: string | null; email?: string | null; phone?: string | null; leadTimeDays?: number | null; paymentTerms?: string | null }) {
  try {
    const sup = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();
    if (sup) await requireMembership(sup.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.contactName !== undefined) data.contactName = input.contactName;
    if (input.email !== undefined) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.leadTimeDays !== undefined) data.leadTimeDays = input.leadTimeDays;
    if (input.paymentTerms !== undefined) data.paymentTerms = input.paymentTerms;
    await db.orm.public.RetailSupplier.where({ id: supplierId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { error: 'Failed to update supplier.' };
  }
}

export async function deleteSupplier(supplierId: string) {
  try {
    const sup = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();
    if (sup) await requireMembership(sup.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const posUsingIt = await db.orm.public.RetailPurchaseOrder.where({ supplierId }).all();
    if (posUsingIt.length > 0) return { error: `${posUsingIt.length} purchase order(s) reference this supplier.` };
    await db.orm.public.RetailSupplier.where({ id: supplierId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { error: 'Failed to delete supplier.' };
  }
}

export async function getPurchaseOrders(organizationId: string) {
  try {
    const pos = await db.orm.public.RetailPurchaseOrder.where({ organizationId }).all();
    const suppliers = await db.orm.public.RetailSupplier.where({ organizationId }).all();
    const enriched = pos.map((po) => ({ ...po, supplierName: suppliers.find((s) => s.id === po.supplierId)?.name ?? 'Unknown' }));
    enriched.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
}

export async function createPurchaseOrder(input: { organizationId: string; supplierId: string; poNumber: string; expectedDate?: string; totalAmount?: number }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.poNumber.trim()) return { error: 'PO number is required.' };
    const po = await db.orm.public.RetailPurchaseOrder.create({
      organizationId: input.organizationId,
      supplierId: input.supplierId,
      poNumber: input.poNumber,
      status: 'DRAFT',
      expectedDate: input.expectedDate ? toInstant(new Date(input.expectedDate)) : undefined,
      totalAmount: input.totalAmount,
    });
    return { success: true, po: JSON.parse(JSON.stringify(po)) };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { error: 'Failed to create purchase order.' };
  }
}

export async function updatePurchaseOrderStatus(poId: string, status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL') {
  try {
    const po = await db.orm.public.RetailPurchaseOrder.where({ id: poId }).all().first();
    if (po) await requireMembership(po.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.RetailPurchaseOrder.where({ id: poId }).update({ status });
    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { error: 'Failed to update purchase order.' };
  }
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------

export async function getShopDashboardData(organizationId: string) {
  try {
    const allOrders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    const startOfToday = startOfDay(new Date()).getTime();
    const todayOrders = allOrders.filter((o) => epochMs(o.createdAt) >= startOfToday);

    const completedToday = todayOrders.filter((o) => o.status === 'COMPLETED');
    const refundedToday = todayOrders.filter((o) => o.status === 'REFUNDED');
    const grossSales = completedToday.reduce((sum, o) => sum + o.totalAmount, 0);
    const refundsTotal = refundedToday.reduce((sum, o) => sum + o.totalAmount, 0);

    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    const lowStockCount = products.filter((p) => p.lowStockLevel != null && p.stockQuantity <= (p.lowStockLevel as number)).length;

    const openShift = await getOpenShift(organizationId);
    const settings = await getRetailSettings(organizationId);

    return {
      grossSales,
      transactions: completedToday.length,
      refunds: refundsTotal,
      netSales: grossSales - refundsTotal,
      lowStockCount,
      totalProducts: products.length,
      openShift,
      settings,
    };
  } catch (error) {
    console.error('Error fetching shop dashboard data:', error);
    return { grossSales: 0, transactions: 0, refunds: 0, netSales: 0, lowStockCount: 0, totalProducts: 0, openShift: null, settings: null };
  }
}

// ---------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Payroll', 'Maintenance', 'Marketing', 'Other'] as const;

export async function getExpenses(organizationId: string, options?: { category?: string }) {
  try {
    let expenses = await db.orm.public.RetailExpense.where({ organizationId }).all();
    if (options?.category) expenses = expenses.filter((e) => e.category === options.category);
    expenses.sort((a, b) => epochMs(b.expenseDate) - epochMs(a.expenseDate));
    return JSON.parse(JSON.stringify(expenses));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

export async function createExpense(input: {
  organizationId: string;
  category: string;
  description?: string;
  amount: number;
  expenseDate: string;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  vendorName?: string;
  receiptAssetId?: string;
  recordedById: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.category.trim()) return { error: 'Category is required.' };
    if (input.amount == null || input.amount <= 0) return { error: 'A valid amount is required.' };
    const date = new Date(input.expenseDate);
    if (isNaN(date.getTime())) return { error: 'Invalid expense date.' };

    const expense = await db.orm.public.RetailExpense.create({
      organizationId: input.organizationId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      expenseDate: toInstant(date),
      paymentMethod: input.paymentMethod,
      vendorName: input.vendorName,
      receiptAssetId: input.receiptAssetId,
      recordedById: input.recordedById,
    });
    return { success: true, expense: JSON.parse(JSON.stringify(expense)) };
  } catch (error) {
    console.error('Error creating expense:', error);
    return { error: 'Failed to record expense.' };
  }
}

export async function updateExpense(expenseId: string, input: {
  category?: string;
  description?: string | null;
  amount?: number;
  expenseDate?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  vendorName?: string | null;
  receiptAssetId?: string | null;
}) {
  try {
    const exp = await db.orm.public.RetailExpense.where({ id: expenseId }).all().first();
    if (exp) await requireMembership(exp.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.category !== undefined) data.category = input.category;
    if (input.description !== undefined) data.description = input.description;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.expenseDate !== undefined) {
      const date = new Date(input.expenseDate);
      if (isNaN(date.getTime())) return { error: 'Invalid expense date.' };
      data.expenseDate = toInstant(date);
    }
    if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod;
    if (input.vendorName !== undefined) data.vendorName = input.vendorName;
    if (input.receiptAssetId !== undefined) data.receiptAssetId = input.receiptAssetId;
    await db.orm.public.RetailExpense.where({ id: expenseId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { error: 'Failed to update expense.' };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    const exp = await db.orm.public.RetailExpense.where({ id: expenseId }).all().first();
    if (exp) await requireMembership(exp.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.RetailExpense.where({ id: expenseId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { error: 'Failed to delete expense.' };
  }
}

export async function getExpenseSummary(organizationId: string) {
  try {
    const expenses = await db.orm.public.RetailExpense.where({ organizationId }).all();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const thisMonth = expenses.filter((e) => epochMs(e.expenseDate) >= monthStart);
    const totalThisMonth = thisMonth.reduce((sum, e) => sum + e.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const cat of EXPENSE_CATEGORIES) byCategory[cat] = 0;
    for (const e of thisMonth) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }

    return {
      totalThisMonth,
      countThisMonth: thisMonth.length,
      totalAllTime: expenses.reduce((sum, e) => sum + e.amount, 0),
      byCategory,
    };
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    return { totalThisMonth: 0, countThisMonth: 0, totalAllTime: 0, byCategory: {} };
  }
}

// ---------------------------------------------------------------------
// Customers (store-scoped loyalty contacts)
// ---------------------------------------------------------------------

// totalSpent/orderCount/lastVisit are computed from RetailOrder at read
// time rather than stored on RetailCustomer, so they can never drift.
async function enrichCustomers(organizationId: string, customers: any[]) {
  const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();
  return customers.map((c) => {
    const theirOrders = orders.filter((o) => o.customerDataId === c.id && o.status === 'COMPLETED');
    const lastVisit = theirOrders.reduce((max, o) => Math.max(max, epochMs(o.createdAt)), 0);
    return {
      ...c,
      totalSpent: theirOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orderCount: theirOrders.length,
      lastVisit: lastVisit > 0 ? lastVisit : null,
    };
  });
}

export async function getCustomers(organizationId: string) {
  try {
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
    const customerDataList = [];
    for (const rel of relationships) {
      const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
      if (cd) customerDataList.push(cd);
    }
    const enriched = await enrichCustomers(organizationId, customerDataList);
    enriched.sort((a, b) => b.totalSpent - a.totalSpent);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

export async function getCustomer(organizationId: string, customerDataId: string) {
  try {
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return null;
    const [enriched] = await enrichCustomers(organizationId, [customer]);

    const orders = await db.orm.public.RetailOrder.where({ organizationId, customerDataId }).all();
    orders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    const orderHistory = await enrichOrders(organizationId, orders);

    return JSON.parse(JSON.stringify({ ...enriched, orders: orderHistory }));
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

export async function createCustomer(input: { organizationId: string; name: string; phone?: string; email?: string; notes?: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    if (!input.name.trim()) return { error: 'Customer name is required.' };

    // Find or create Person via PersonIdentifier
    let person = null;
    if (input.email) {
      const emailId = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: input.email.toLowerCase() }).all().first();
      if (emailId) person = await db.orm.public.Person.where({ id: emailId.personId }).all().first();
    }
    if (!person && input.phone) {
      const phoneId = await db.orm.public.PersonIdentifier.where({ type: 'PHONE', normalizedValue: input.phone }).all().first();
      if (phoneId) person = await db.orm.public.Person.where({ id: phoneId.personId }).all().first();
    }

    if (!person) {
      const [firstName, ...lastNames] = input.name.split(' ');
      person = await db.orm.public.Person.create({
        firstName: firstName || 'Unknown',
        lastName: lastNames.join(' ') || 'Unknown',
      });
      if (input.email) await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'EMAIL', normalizedValue: input.email.toLowerCase() });
      if (input.phone) await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'PHONE', normalizedValue: input.phone });
    }

    const relationship = await db.orm.public.Relationship.create({
      organizationId: input.organizationId,
      personId: person.id,
      type: 'CUSTOMER',
    });

    const customerData = await db.orm.public.CustomerData.create({
      relationshipId: relationship.id,
      notes: input.notes,
      loyaltyPoints: 0,
    });

    return { success: true, customer: JSON.parse(JSON.stringify(customerData)) };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { error: 'Failed to create customer.' };
  }
}

export async function updateCustomer(customerDataId: string, input: { name?: string; phone?: string | null; email?: string | null; notes?: string | null }) {
  try {
    const c = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (c) {
        const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();
        if (rel) await requireMembership(rel.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    }
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return { error: 'Customer not found.' };

    if (input.notes !== undefined) {
      await db.orm.public.CustomerData.where({ id: customerDataId }).update({ notes: input.notes });
    }

    const relationship = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
    if (relationship && (input.name !== undefined || input.phone !== undefined || input.email !== undefined)) {
      const pUpdate: any = {};
      if (input.name !== undefined) {
        const [firstName, ...lastNames] = input.name.split(' ');
        pUpdate.firstName = firstName || 'Unknown';
        pUpdate.lastName = lastNames.join(' ') || 'Unknown';
      }
      if (input.phone !== undefined) pUpdate.phone = input.phone;
      if (input.email !== undefined) pUpdate.email = input.email;
      await db.orm.public.Person.where({ id: relationship.personId }).update(pUpdate);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { error: 'Failed to update customer.' };
  }
}

export async function deleteCustomer(customerDataId: string) {
  try {
    const c = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (c) {
        const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();
        if (rel) await requireMembership(rel.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    }
    const ordersUsingIt = await db.orm.public.RetailOrder.where({ customerDataId }).all();
    if (ordersUsingIt.length > 0) return { error: `This customer has ${ordersUsingIt.length} order(s) on file - cannot delete.` };
    
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (customer) {
      await db.orm.public.CustomerData.where({ id: customerDataId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { error: 'Failed to delete customer.' };
  }
}

export async function adjustLoyaltyPoints(customerDataId: string, delta: number) {
  try {
    const c = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (c) {
        const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();
        if (rel) await requireMembership(rel.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    }
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return { error: 'Customer not found.' };
    const next = customer.loyaltyPoints + delta;
    if (next < 0) return { error: 'Loyalty points cannot go below zero.' };
    await db.orm.public.CustomerData.where({ id: customerDataId }).update({ loyaltyPoints: next });
    return { success: true, loyaltyPoints: next };
  } catch (error) {
    console.error('Error adjusting loyalty points:', error);
    return { error: 'Failed to adjust loyalty points.' };
  }
}
// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

export async function getRetailSettings(organizationId: string) {
  try {
    let settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    if (!settings) {
      settings = await db.orm.public.RetailSettings.create({
        organizationId,
        storeName: 'My Retail Store',
        customUnits: JSON.stringify(['ea', 'kg', 'lb', 'pack', 'box']),
      });
    }
    return settings;
  } catch (error) {
    console.error('Error fetching retail settings:', error);
    return null;
  }
}

export async function updateRetailSettings(organizationId: string, input: {
  storeName?: string;
  storeAddress?: string;
  receiptMessage?: string;
  taxRate?: number;
  currencySymbol?: string;
  customUnits?: string[];
  hasSetPayment?: boolean;
  hasStoreInfo?: boolean;
  hasShippingPrices?: boolean;
  hasProducts?: boolean;
  paymentGateway?: string;
  bankDetails?: string;
  shippingRates?: string;
}) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN']);
    const data: any = {};
    if (input.storeName !== undefined) data.storeName = input.storeName;
    if (input.storeAddress !== undefined) data.storeAddress = input.storeAddress;
    if (input.receiptMessage !== undefined) data.receiptMessage = input.receiptMessage;
    if (input.taxRate !== undefined) data.taxRate = input.taxRate;
    if (input.currencySymbol !== undefined) data.currencySymbol = input.currencySymbol;
    if (input.customUnits !== undefined) data.customUnits = JSON.stringify(input.customUnits);
    if (input.hasSetPayment !== undefined) data.hasSetPayment = input.hasSetPayment;
    if (input.hasStoreInfo !== undefined) data.hasStoreInfo = input.hasStoreInfo;
    if (input.hasShippingPrices !== undefined) data.hasShippingPrices = input.hasShippingPrices;
    if (input.hasProducts !== undefined) data.hasProducts = input.hasProducts;
    if (input.paymentGateway !== undefined) data.paymentGateway = input.paymentGateway;
    if (input.bankDetails !== undefined) data.bankDetails = input.bankDetails;
    if (input.shippingRates !== undefined) data.shippingRates = input.shippingRates;

    await db.orm.public.RetailSettings.where({ organizationId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating retail settings:', error);
    return { error: 'Failed to update settings.' };
  }
}
// ---------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------

export async function getReceiptData(orderId: string) {
  try {
    const order = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!order) return null;

    const items = await db.orm.public.RetailOrderItem.where({ orderId }).all();
    const populatedItems = await Promise.all(items.map(async (item) => {
      const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      return { ...item, product };
    }));

    const cashierMembership = await db.orm.public.Membership.where({ id: order.cashierId }).all().first();
    const cashierPerson = cashierMembership ? await db.orm.public.Person.where({ id: cashierMembership.personId }).all().first() : null;
    const settings = await getRetailSettings(order.organizationId);

    return {
      order,
      items: populatedItems,
      cashier: cashierPerson ? `${cashierPerson.firstName} ${cashierPerson.lastName}`.trim() : 'Staff',
      settings
    };
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    return null;
  }
}
