'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';
import { requireEntitlement, requireWithinLimit } from './entitlements';

// ---------------------------------------------------------------------------
// Feature codes used by Citymart procurement
// ---------------------------------------------------------------------------
const FEAT_PROCUREMENT = 'CITYMART_PROCUREMENT';
const FEAT_MULTI_LOCATION = 'CITYMART_MULTI_LOCATION';
const LIMIT_PRODUCTS = 'CITYMART_PRODUCTS';

// ---------------------------------------------------------------------------
// Valid PO state transitions
// ---------------------------------------------------------------------------
const PO_TRANSITIONS: Record<string, string[]> = {
  DRAFT:     ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED:  ['PARTIAL', 'RECEIVED', 'CANCELLED'],
  PARTIAL:   ['RECEIVED', 'CANCELLED'],
  RECEIVED:  [],
  CANCELLED: [],
};

function assertLegalPOTransition(current: string, next: string): void {
  const allowed = PO_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Illegal PO status transition: ${current} → ${next}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getOrInitLocationStock(tx: any, organizationId: string, locationId: string, productId: string) {
  let stock = await tx.orm.public.RetailLocationStock
    .where({ locationId, productId })
    .all()
    .first();
  if (!stock) {
    stock = await tx.orm.public.RetailLocationStock.create({
      organizationId,
      locationId,
      productId,
      stockQuantity: 0,
    });
  }
  return stock;
}

// ---------------------------------------------------------------------------
// SUPPLIERS
// ---------------------------------------------------------------------------

export async function getSuppliers(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const suppliers = await db.orm.public.RetailSupplier
      .where({ organizationId })
      .all();
    return JSON.parse(JSON.stringify(suppliers));
  } catch (error) {
    console.error('getSuppliers:', error);
    return [];
  }
}

export async function createSupplier(input: {
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  leadTimeDays?: number;
  paymentTerms?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await requireEntitlement(input.organizationId, FEAT_PROCUREMENT);
    if (!input.name.trim()) return { error: 'Supplier name is required.' };
    const supplier = await db.orm.public.RetailSupplier.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      email: input.email,
      phone: input.phone,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
    });
    return { success: true, supplier: JSON.parse(JSON.stringify(supplier)) };
  } catch (error: any) {
    return { error: error.message || 'Failed to create supplier.' };
  }
}

export async function updateSupplier(supplierId: string, input: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
}) {
  try {
    // Always scope by id AND organizationId derived from membership
    const sup = await db.orm.public.RetailSupplier
      .where({ id: supplierId })
      .all()
      .first();
    if (!sup) return { error: 'Supplier not found.' };
    await requireMembership(sup.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await requireEntitlement(sup.organizationId, FEAT_PROCUREMENT);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.leadTimeDays !== undefined) data.leadTimeDays = input.leadTimeDays;
    if (input.paymentTerms !== undefined) data.paymentTerms = input.paymentTerms;
    // Scope update to org-owned supplier only
    await db.orm.public.RetailSupplier.where({ id: supplierId, organizationId: sup.organizationId }).update(data);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update supplier.' };
  }
}

export async function deleteSupplier(supplierId: string) {
  try {
    const sup = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();
    if (!sup) return { error: 'Supplier not found.' };
    await requireMembership(sup.organizationId, ['OWNER', 'ADMIN']);
    // Scoped delete
    await db.orm.public.RetailSupplier.where({ id: supplierId, organizationId: sup.organizationId }).delete();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete supplier.' };
  }
}

// ---------------------------------------------------------------------------
// PURCHASE ORDERS
// ---------------------------------------------------------------------------

export async function getPurchaseOrders(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const pos = await db.orm.public.RetailPurchaseOrder
      .where({ organizationId })
      .all();
    return JSON.parse(JSON.stringify(pos));
  } catch (error) {
    console.error('getPurchaseOrders:', error);
    return [];
  }
}

export async function createPurchaseOrder(input: {
  organizationId: string;
  supplierId: string;
  locationId: string;
  poNumber: string;
  notes?: string;
  expectedDate?: string;
  items: { productId: string; orderedQty: number; unitCost: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], input.locationId);
    await requireEntitlement(input.organizationId, FEAT_PROCUREMENT);
    if (!input.poNumber.trim()) return { error: 'PO number is required.' };
    if (!input.items || input.items.length === 0) return { error: 'A purchase order must have at least one item.' };

    // Validate supplier belongs to this org
    const supplier = await db.orm.public.RetailSupplier
      .where({ id: input.supplierId, organizationId: input.organizationId })
      .all()
      .first();
    if (!supplier) return { error: 'Supplier not found or does not belong to this organization.' };

    // Validate all products belong to this org — server calculates totals
    const orgProducts = await db.orm.public.RetailProduct
      .where({ organizationId: input.organizationId })
      .all();
    const productById = new Map(orgProducts.map(p => [p.id, p]));

    const itemsToCreate: { productId: string; orderedQty: number; unitCost: number; totalCost: number }[] = [];
    let totalAmount = 0;
    for (const item of input.items) {
      if (!productById.has(item.productId)) {
        return { error: `Product ${item.productId} does not belong to this organization.` };
      }
      if (item.orderedQty <= 0) return { error: 'Ordered quantity must be greater than zero.' };
      if (item.unitCost < 0) return { error: 'Unit cost cannot be negative.' };
      const totalCost = item.orderedQty * item.unitCost; // Server calculates
      itemsToCreate.push({ productId: item.productId, orderedQty: item.orderedQty, unitCost: item.unitCost, totalCost });
      totalAmount += totalCost;
    }

    const result = await db.transaction(async (tx: any) => {
      const po = await tx.orm.public.RetailPurchaseOrder.create({
        organizationId: input.organizationId,
        supplierId: input.supplierId,
        locationId: input.locationId,
        poNumber: input.poNumber.trim(),
        status: 'DRAFT',
        notes: input.notes,
        expectedDate: input.expectedDate ? new Date(input.expectedDate).toISOString() : undefined,
        totalAmount,
      });

      for (const item of itemsToCreate) {
        await tx.orm.public.RetailPurchaseOrderItem.create({
          poId: po.id,
          productId: item.productId,
          orderedQty: item.orderedQty,
          receivedQty: 0,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        });
      }

      return po;
    });

    return { success: true, po: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    return { error: error.message || 'Failed to create purchase order.' };
  }
}

export async function updatePurchaseOrderStatus(poId: string, nextStatus: 'SUBMITTED' | 'APPROVED' | 'CANCELLED') {
  try {
    const po = await db.orm.public.RetailPurchaseOrder.where({ id: poId }).all().first();
    if (!po) return { error: 'Purchase order not found.' };
    await requireMembership(po.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await requireEntitlement(po.organizationId, FEAT_PROCUREMENT);

    assertLegalPOTransition(po.status, nextStatus);

    await db.orm.public.RetailPurchaseOrder
      .where({ id: poId, organizationId: po.organizationId })
      .update({ status: nextStatus });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update purchase order status.' };
  }
}

// ---------------------------------------------------------------------------
// RECEIVING — the critical operation
// ---------------------------------------------------------------------------

export async function receivePurchaseOrder(input: {
  poId: string;
  items: { poItemId: string; receivingQty: number }[];
}) {
  try {
    if (!input.items || input.items.length === 0) return { error: 'No items to receive.' };

    const po = await db.orm.public.RetailPurchaseOrder.where({ id: input.poId }).all().first();
    if (!po) return { error: 'Purchase order not found.' };
    if (!po.locationId) return { error: 'Purchase order has no destination location.' };

    // Authorization: must be a member of the PO's organization AND have access to the target location
    const { membership } = await requireMembership(po.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], po.locationId);
    await requireEntitlement(po.organizationId, FEAT_PROCUREMENT);

    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      return { error: `Cannot receive a PO in status: ${po.status}.` };
    }
    if (po.status === 'DRAFT') {
      return { error: 'PO must be SUBMITTED or APPROVED before receiving.' };
    }

    await db.transaction(async (tx: any) => {
      // Fetch all PO items and lock them for this operation
      const poItems = await tx.orm.public.RetailPurchaseOrderItem
        .where({ poId: po.id })
        .all();

      const poItemById = new Map(poItems.map((i: any) => [i.id, i as any]));

      for (const incoming of input.items) {
        const poItem: any = poItemById.get(incoming.poItemId);
        if (!poItem) throw new Error(`PO item ${incoming.poItemId} not found.`);

        // Verify product belongs to this org (cross-tenant protection)
        const product = await tx.orm.public.RetailProduct
          .where({ id: poItem.productId, organizationId: po.organizationId })
          .all()
          .first();
        if (!product) throw new Error(`Product ${poItem.productId} not found in this organization.`);

        const remaining = poItem.orderedQty - poItem.receivedQty;
        if (incoming.receivingQty <= 0) throw new Error(`Receiving quantity must be greater than zero.`);
        if (incoming.receivingQty > remaining) {
          throw new Error(`Cannot receive ${incoming.receivingQty} units for item ${poItem.productId}: only ${remaining} remaining.`);
        }

        // 1. Atomic inventory increment (idempotency: unique referenceId per poItemId ensures no double-apply)
        const stock = await getOrInitLocationStock(tx, po.organizationId, po.locationId!, product.id);

        const updated = await tx.sql`
          UPDATE "RetailLocationStock"
          SET "stockQuantity" = "stockQuantity" + ${incoming.receivingQty}
          WHERE id = ${stock.id}
          RETURNING "stockQuantity"
        `;
        const newQty = updated[0].stockQuantity;

        // 2. Auditable movement record
        await tx.orm.public.RetailStockMovement.create({
          organizationId: po.organizationId,
          locationId: po.locationId,
          productId: product.id,
          delta: incoming.receivingQty,
          beforeQty: stock.stockQuantity,
          afterQty: newQty,
          reason: 'RECEIVED',
          referenceType: 'PO',
          referenceId: poItem.id, // Unique per item — prevents duplicate receiving same item twice
          note: `PO #${po.poNumber} received`,
          recordedById: membership.id,
        });

        // 3. Update received quantity on PO item (scoped to org)
        await tx.orm.public.RetailPurchaseOrderItem.where({ id: poItem.id }).update({
          receivedQty: poItem.receivedQty + incoming.receivingQty,
        });
      }

      // 4. Compute overall PO status
      const refreshedItems: any[] = await tx.orm.public.RetailPurchaseOrderItem.where({ poId: po.id }).all();
      const allReceived = refreshedItems.every((i: any) => i.receivedQty >= i.orderedQty);
      const anyReceived = refreshedItems.some((i: any) => i.receivedQty > 0);
      const newPoStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : po.status;

      await tx.orm.public.RetailPurchaseOrder
        .where({ id: po.id, organizationId: po.organizationId })
        .update({ status: newPoStatus });
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to receive purchase order.' };
  }
}

export async function getPurchaseOrderItems(poId: string) {
  try {
    const po = await db.orm.public.RetailPurchaseOrder.where({ id: poId }).all().first();
    if (!po) return { error: 'Purchase order not found.' };
    await requireMembership(po.organizationId);
    const items = await db.orm.public.RetailPurchaseOrderItem.where({ poId }).all();
    return { items: JSON.parse(JSON.stringify(items)) };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch PO items.' };
  }
}
