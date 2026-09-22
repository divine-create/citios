'use server'

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'
import { revalidatePath } from 'next/cache'
import { DEFAULT_RETAIL_CATEGORIES } from '@/lib/defaultCategories'
import { DEFAULT_RETAIL_UNITS, normalizeRetailUnits } from '@/lib/defaultUnits'
import { generateUniqueSku } from '@/lib/sku'
import { sendWhatsAppOrderNotification } from '@/lib/whatsapp'
import { notifyPerson, personIdForCustomerData } from '@/lib/notify'
import { pusherServer } from '@/lib/pusher'
import { requireWithinLimit } from '@/lib/actions/entitlements'

export type ActionResponse<T = any> = { error?: string } & T;

// Server-action convention in this codebase: resolve the caller's Membership
// id from the authenticated session. Never accept a client-supplied
// cashierId/membershipId when it can be derived here.
async function getCurrentMembershipId(organizationId: string): Promise<string> {
  const { membership } = await requireMembership(organizationId);
  return membership.id;
}

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

async function createShopNotification(organizationId: string, type: string, title: string, message?: string) {
  try {
    await db.orm.public.RetailNotification.create({ organizationId, type, title, message, isRead: false });
    pusherServer.trigger(`org-${organizationId}`, 'new-shop-notification', { type, title, message }).catch(() => {});
  } catch (error) {
    console.error('Error creating shop notification:', error);
  }
}

// ISO date to a sortable Date (contract stores Temporal.Instant).
function instantToMillis(instant: unknown): number {
  return (instant as { epochMilliseconds: number }).epochMilliseconds;
}

// ---------------------------------------------------------------------

async function resolveLocationContext(organizationId: string, locationId?: string | null) {
  const locations = await db.orm.public.Location.where({ organizationId }).all();
  if (locations.length > 0) {
    if (!locationId) throw new Error('An active location is required for this operation.');
    const loc = locations.find(l => l.id === locationId);
    if (!loc) throw new Error('Location does not belong to this organization.');
    await requireMembership(organizationId, undefined, locationId);
    return loc;
  }
  return null;
}

async function getOrInitLocationStock(tx: any, organizationId: string, locationId: string, productId: string) {
  let stock = await tx.orm.public.RetailLocationStock.where({ locationId, productId }).all().first();
  if (!stock) {
    stock = await tx.orm.public.RetailLocationStock.create({
      organizationId,
      locationId,
      productId,
      stockQuantity: 0,
      lowStockLevel: null
    });
  }
  return stock;
}

// Categories
// ---------------------------------------------------------------------

export async function ensureDefaultCategories(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const existingCategories = await db.orm.public.RetailCategory.where({ organizationId }).all();
    const existingByName = new Map(existingCategories.map((category) => [category.name.toLowerCase(), category]));

    for (const category of DEFAULT_RETAIL_CATEGORIES) {
      let parentCategory = existingByName.get(category.name.toLowerCase());
      if (!parentCategory) {
        parentCategory = await db.orm.public.RetailCategory.create({
          organizationId,
          name: category.name,
          description: category.description,
          parentId: null,
        });
        existingByName.set(parentCategory.name.toLowerCase(), parentCategory);
      }

      const existingSubs = await db.orm.public.RetailCategory.where({ organizationId, parentId: parentCategory.id }).all();
      const subMap = new Map(existingSubs.map((item) => [item.name.toLowerCase(), item]));

      for (const subcategory of category.subcategories) {
        if (!subMap.has(subcategory.name.toLowerCase())) {
          await db.orm.public.RetailCategory.create({
            organizationId,
            name: subcategory.name,
            description: subcategory.description,
            parentId: parentCategory.id,
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring default categories:', error);
    return false;
  }
}

export async function getCategories(organizationId: string) {
  try {
    await requireMembership(organizationId);
    await ensureDefaultCategories(organizationId);
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
    if (productsUsingIt.length > 0) return { error: `${productsUsingIt.length} product(s) still use this category â€” reassign them first.` };
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

export async function getProducts(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    await ensureDefaultCategories(organizationId);
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
  sku?: string;
  price: number;
  cost?: number;
  stockQuantity?: number;
  lowStockLevel?: number;
  isWeighed?: boolean;
  unit?: string;
  categoryId?: string;
  imageAssetId?: string;
  showOnFeed?: boolean;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    
    // Entitlement limit check: count products and verify against plan limit
    const productCount = await db.orm.public.RetailProduct.where({ organizationId: input.organizationId }).all().then(p => p.length);
    await requireWithinLimit(input.organizationId, 'CITYMART_PRODUCTS', productCount);

    if (!input.name.trim()) return { error: 'Product name is required.' };
    if (input.price == null || input.price < 0) return { error: 'A valid price is required.' };
    const showOnFeed = input.showOnFeed ?? true;

    const existingSkus = await db.orm.public.RetailProduct.where({ organizationId: input.organizationId }).all().then((products) => products.map((product) => product.sku ?? ''));
    const nextSku = generateUniqueSku(existingSkus, input.name || 'ITEM');
    const normalizedSku = (input.sku ?? '').trim() || nextSku;
    
    const product = await db.transaction(async (tx: any) => {
      const createdProduct = await tx.orm.public.RetailProduct.create({
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        sku: normalizedSku,
        price: input.price,
        cost: input.cost,
        stockQuantity: input.stockQuantity ?? 0,
        lowStockLevel: input.lowStockLevel,
        isWeighed: input.isWeighed ?? false,
        unit: input.unit ?? 'ea',
        categoryId: input.categoryId,
        imageAssetId: input.imageAssetId,
      });

      if (showOnFeed) {
        await tx.orm.public.Post.create({
          organizationId: input.organizationId,
          title: `New product available: ${createdProduct.name}`,
          content: `New product available: ${createdProduct.name}`,
          category: 'RETAIL',
          linkedEntityType: 'RETAIL_PRODUCT',
          linkedEntityId: createdProduct.id,
        });
      }

      return createdProduct;
    });

    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    return { success: true, product: JSON.parse(JSON.stringify(product)) };
  } catch (error) {
    console.error('Error creating product:', error);
    return { error: 'Failed to create product.' };
  }
}

export async function updateProduct(productId: string, input: {
  name?: string;
  description?: string | null;
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
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.price !== undefined) data.price = input.price;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.lowStockLevel !== undefined) data.lowStockLevel = input.lowStockLevel;
    if (input.isWeighed !== undefined) data.isWeighed = input.isWeighed;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.imageAssetId !== undefined) data.imageAssetId = input.imageAssetId;
    await db.orm.public.RetailProduct.where({ id: productId }).update(data);
    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    revalidatePath(`/product/${productId}`);
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
    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    revalidatePath(`/product/${productId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error: 'Failed to delete product.' };
  }
}

// Manual stock correction (receiving stock outside a PO, shrinkage/damage
// write-offs, stocktake adjustments). `delta` is signed. Every change writes
// an immutable RetailStockMovement row so the store has an audit trail.
export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string | null) {
  try {
    const product = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (!product) return { error: 'Product not found.' };
    const { membership } = await requireMembership(product.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    if (!(Number.isFinite(delta))) return { error: 'Enter a valid stock change.' };

    await db.transaction(async (tx: any) => {
      const current = await tx.orm.public.RetailProduct.where({ id: productId }).all().first();
      if (!current) throw new Error('Product not found.');
      const next = current.stockQuantity + delta;
      if (next < 0) throw new Error('Stock cannot go below zero.');
      const loc = await resolveLocationContext(product.organizationId, locationId).catch(e => { throw e; });
      if (loc) {
        const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
        const next = stock.stockQuantity + delta;
        if (next < 0) throw new Error('Stock cannot go below zero.');
        await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          locationId: loc.id,
          productId,
          delta,
          beforeQty: stock.stockQuantity,
          afterQty: next,
          reason: 'ADJUSTMENT',
          note: note ?? null,
          recordedById: membership.id,
        });
      } else {
        await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });
      }
      await tx.orm.public.RetailStockMovement.create({
        organizationId: current.organizationId,
        productId,
        delta,
        beforeQty: current.stockQuantity,
        afterQty: next,
        reason: 'ADJUSTMENT',
        note: note ?? null,
        recordedById: membership.id,
      });
      if (delta < 0 && current.lowStockLevel != null && next <= current.lowStockLevel) {
        await txCheckLowStock(current);
      }
    });

    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    revalidatePath(`/product/${productId}`);
    return { success: true };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { error: error instanceof Error ? error.message : 'Failed to adjust stock.' };
  }
}

// Emits a LOW_STOCK notification when a product just crossed its threshold.
async function txCheckLowStock(product: { id: string; name: string; organizationId: string; lowStockLevel: number | null; stockQuantity: number }) {
  if (product.lowStockLevel != null && product.stockQuantity <= product.lowStockLevel) {
    await createShopNotification(
      product.organizationId,
      'LOW_STOCK',
      `Low stock: ${product.name}`,
      `${product.stockQuantity} remaining (min ${product.lowStockLevel}).`,
    );
  }
}

export async function getStockMovements(organizationId: string, productId?: string) {
  try {
    await requireMembership(organizationId);
    const rows = productId
      ? await db.orm.public.RetailStockMovement.where({ organizationId, productId }).all()
      : await db.orm.public.RetailStockMovement.where({ organizationId }).all();
    rows.sort((a, b) => instantToMillis(b.createdAt) - instantToMillis(a.createdAt));
    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    const productName = (id: string) => products.find((p) => p.id === id)?.name ?? 'Unknown';
    return JSON.parse(JSON.stringify(rows.map((r) => ({ ...r, productName: productName(r.productId) }))));
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return [];
  }
}

// ---------------------------------------------------------------------
// Locations (physical branches â€” V1 Location model, org-level)
// ---------------------------------------------------------------------

export async function getLocations(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const locations = await db.orm.public.Location.where({ organizationId }).all();
    locations.sort((a, b) => a.name.localeCompare(b.name));
    return JSON.parse(JSON.stringify(locations));
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export async function createLocation(input: { organizationId: string; name: string; address?: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Location name is required.' };
    const location = await db.orm.public.Location.create({
      organizationId: input.organizationId,
      name: input.name,
      address: input.address,
    });
    return { success: true, location: JSON.parse(JSON.stringify(location)) };
  } catch (error) {
    console.error('Error creating location:', error);
    return { error: 'Failed to create location.' };
  }
}

export async function updateLocation(locationId: string, input: { name?: string; address?: string | null }) {
  try {
    const location = await db.orm.public.Location.where({ id: locationId }).all().first();
    if (location) await requireMembership(location.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.address !== undefined) data.address = input.address;
    await db.orm.public.Location.where({ id: locationId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating location:', error);
    return { error: 'Failed to update location.' };
  }
}

export async function deleteLocation(locationId: string) {
  try {
    const location = await db.orm.public.Location.where({ id: locationId }).all().first();
    if (location) await requireMembership(location.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.Location.where({ id: locationId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting location:', error);
    return { error: 'Failed to delete location.' };
  }
}

// ---------------------------------------------------------------------
// Staff (workforce: Person â†’ Membership â†’ MembershipRole)
// ---------------------------------------------------------------------

const ASSIGNABLE_STAFF_ROLES = ['MANAGER', 'CASHIER', 'INVENTORY_STAFF'] as const;

// Adds a staff member by email. V1 identity: the email identifier pins the
// Person (created here if new, unverified until they first sign in and the
// auth flow claims it â€” one verified email â†’ one Person, Person may exist
// without an Account). Membership is org-scoped; no client-supplied ids.
export async function addStaffMember(input: { organizationId: string; email: string; name?: string; role: string }) {
  try {
    const { membership: actorMembership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN']);

    const email = String(input.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'A valid email is required.' };
    if (!(ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(input.role)) {
      return { error: 'Role must be MANAGER, CASHIER, or INVENTORY_STAFF.' };
    }

    // Deterministic email â†’ Person (no fuzzy matching).
    let identifier = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: email }).all().first();
    let person = identifier ? await db.orm.public.Person.where({ id: identifier.personId }).all().first() : null;

    if (!person) {
      const [firstName, ...lastNames] = (input.name || email.split('@')[0]).split(' ');
      person = await db.orm.public.Person.create({
        firstName: firstName || 'Team',
        lastName: lastNames.join(' ') || 'Member',
      });
      await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'EMAIL', normalizedValue: email, isVerified: false });
    } else if (input.name && input.name.trim()) {
      const [firstName, ...lastNames] = input.name.trim().split(' ');
      if (firstName) {
        await db.orm.public.Person.where({ id: person.id }).update({ firstName, lastName: lastNames.join(' ') || person.lastName });
      }
    }

    // One Membership per (person, org) â€” unique in the contract.
    let membership = await db.orm.public.Membership.where({ personId: person.id, organizationId: input.organizationId }).all().first();
    if (!membership) {
      membership = await db.orm.public.Membership.create({ personId: person.id, organizationId: input.organizationId });
    }

    const existingRole = await db.orm.public.MembershipRole.where({ membershipId: membership.id, role: input.role }).all().first();
    if (!existingRole) {
      await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: input.role });
    }

    return { success: true, staff: { membershipId: membership.id, personId: person.id, email, role: input.role } };
  } catch (error) {
    console.error('Error adding staff member:', error);
    return { error: error instanceof Error ? error.message : 'Failed to add staff member.' };
  }
}

export async function updateStaffRole(input: { organizationId: string; membershipId: string; role: string }) {
  try {
    const { roles: actorRoles } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!(ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(input.role)) {
      return { error: 'Role must be MANAGER, CASHIER, or INVENTORY_STAFF.' };
    }

    const target = await db.orm.public.Membership.where({ id: input.membershipId, organizationId: input.organizationId }).all().first();
    if (!target) return { error: 'Staff member not found in this store.' };

    const targetRoles = await db.orm.public.MembershipRole.where({ membershipId: target.id }).all();
    const isActorOwner = actorRoles.some((r) => r.role === 'OWNER');

    if (targetRoles.some((r) => r.role === 'OWNER')) {
      if (!isActorOwner) return { error: 'Only the store owner can manage owners.' };
      return { error: 'The store owner role cannot be changed from Staff.' };
    }

    // Replace the membership's assignable roles with the single new role.
    for (const roleRow of targetRoles) {
      await db.orm.public.MembershipRole.where({ id: roleRow.id, membershipId: target.id }).delete();
    }
    await db.orm.public.MembershipRole.create({ membershipId: target.id, role: input.role });
    return { success: true };
  } catch (error) {
    console.error('Error updating staff role:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update staff role.' };
  }
}

export async function removeStaffMember(input: { organizationId: string; membershipId: string }) {
  try {
    const { roles: actorRoles } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const target = await db.orm.public.Membership.where({ id: input.membershipId, organizationId: input.organizationId }).all().first();
    if (!target) return { error: 'Staff member not found in this store.' };

    const targetRoles = await db.orm.public.MembershipRole.where({ membershipId: target.id }).all();
    const isActorOwner = actorRoles.some((r) => r.role === 'OWNER');

    if (targetRoles.some((r) => r.role === 'OWNER')) {
      if (!isActorOwner) return { error: 'Only the store owner can remove owners.' };
      return { error: 'The store owner cannot be removed from their own store.' };
    }

    for (const roleRow of targetRoles) {
      await db.orm.public.MembershipRole.where({ id: roleRow.id, membershipId: target.id }).delete();
    }
    await db.orm.public.Membership.where({ id: target.id }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error removing staff member:', error);
    return { error: error instanceof Error ? error.message : 'Failed to remove staff member.' };
  }
}

export async function getStaff(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const memberships = await db.orm.public.Membership.where({ organizationId }).all();
    const staff = [];
    for (const m of memberships) {
      const roles = await db.orm.public.MembershipRole.where({ membershipId: m.id }).all();
      const person = await db.orm.public.Person.where({ id: m.personId }).all().first();
      const identifiers = await db.orm.public.PersonIdentifier.where({ personId: m.personId, type: 'EMAIL' }).all();
      staff.push({
        membershipId: m.id,
        personId: m.personId,
        name: person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown',
        email: identifiers[0]?.normalizedValue ?? null,
        roles: roles.map((r) => r.role),
      });
    }
    staff.sort((a, b) => a.name.localeCompare(b.name));
    return JSON.parse(JSON.stringify(staff));
  } catch (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
}

// ---------------------------------------------------------------------
// Registers & Shifts
// ---------------------------------------------------------------------

export async function getRegisters(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const registers = await db.orm.public.RetailRegister.where(locationId ? { organizationId, locationId } : { organizationId }).all();
    return JSON.parse(JSON.stringify(registers));
  } catch (error) {
    console.error('Error fetching registers:', error);
    return [];
  }
}

export async function createRegister(organizationId: string, name: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!name.trim()) return { error: 'Register name is required.' };
    const loc = await resolveLocationContext(organizationId, locationId).catch(e => { throw e; });
    const register = await db.orm.public.RetailRegister.create({ organizationId, locationId: loc ? loc.id : null, name, isActive: true });
    return { success: true, register: JSON.parse(JSON.stringify(register)) };
  } catch (error) {
    console.error('Error creating register:', error);
    return { error: 'Failed to create register.' };
  }
}

// The single open shift for this org, if any â€” the whole POS/dashboard UI
// assumes one active register/shift at a time (matches the MVP scope of
// the existing ShopDashboard UI, which shows a single "Register: OPEN" chip).
export async function getOpenShift(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
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

export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number; locationId?: string | null }) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const existing = await db.orm.public.RetailShift.where({ registerId: input.registerId, status: 'OPEN' }).all();
    if (existing.length > 0) return { error: 'This register already has an open shift.' };
    const shift = await db.orm.public.RetailShift.create({
      locationId: input.locationId,
      organizationId: input.organizationId,
      registerId: input.registerId,
      openedById: membership.id,
      openingFloat: input.openingFloat,
      status: 'OPEN',
    });
    return { success: true, shift: JSON.parse(JSON.stringify(shift)) };
  } catch (error) {
    console.error('Error opening shift:', error);
    return { error: 'Failed to open shift.' };
  }
}

export async function closeShift(shiftId: string, input: { actualCash: number }) {
  try {
    const s = await db.orm.public.RetailShift.where({ id: shiftId }).all().first();
    if (!s) return { error: 'Shift not found.' };
    const { membership } = await requireMembership(s.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const shift = await db.orm.public.RetailShift.where({ id: shiftId }).all().first();
    if (!shift) return { error: 'Shift not found.' };
    if (shift.status === 'CLOSED') return { error: 'Shift is already closed.' };

    const orders = await db.orm.public.RetailOrder.where({ shiftId }).all();
    const cashSales = orders
      .filter((o) => o.paymentMethod === 'CASH' && o.status === 'CONFIRMED')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const expectedCash = shift.openingFloat + cashSales;
    const discrepancy = input.actualCash - expectedCash;

    await db.orm.public.RetailShift.where({ id: shiftId }).update({
      status: 'CLOSED',
      closedById: membership.id,
      closedAt: toInstant(new Date()),
      expectedCash,
      actualCash: input.actualCash,
      discrepancy,
    });
    await createShopNotification(
      s.organizationId,
      'SHIFT_CLOSED',
      `Shift closed`,
      `Expected ${expectedCash.toFixed(2)}, counted ${input.actualCash.toFixed(2)}${discrepancy !== 0 ? ` (discrepancy ${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(2)})` : '.'}`,
    );
    return { success: true, expectedCash, discrepancy };
  } catch (error) {
    console.error('Error closing shift:', error);
    return { error: 'Failed to close shift.' };
  }
}

export async function getShiftHistory(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const shifts = await db.orm.public.RetailShift.where(locationId ? { organizationId, locationId } : { organizationId }).all();
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
  locationId?: string | null;
  customerDataId?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT';
  discountAmount?: number;
    couponCode?: string;
    idempotencyKey?: string;
  }) {
  try {
    // Determine exact location context
    const loc = await resolveLocationContext(input.organizationId, input.locationId).catch(e => { throw e; });
    if (!loc) return { error: 'An active location is required to create an order.' };

    // Validate location access
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], loc.id);
    const cashierId = membership.id;
    if (input.items.length === 0) return { error: 'Cart is empty.' };

    // Resolve products in ONE org-scoped fetch and refuse any cart item whose
    // product does not belong to the sale's organization. Without this guard a
    // member of another store could craft a cart that decrements that store's
    // stock â€” a cross-tenant inventory corruption vector.
    const orgProducts = await db.orm.public.RetailProduct.where({ organizationId: input.organizationId }).all();
    const productById = new Map(orgProducts.map((p) => [p.id, p]));

    const lineItems: { productId: string; quantity: number; unitPrice: number; unitCost: number | null; subtotal: number }[] = [];
    let subtotal = 0;
    for (const item of input.items) {
      const product = productById.get(item.productId);
      if (!product) return { error: 'A product in the cart is not available for this store.' };
      const quantity = item.quantity;
      if (!(quantity > 0)) return { error: 'Item quantities must be greater than zero.' };
      if (!product.isWeighed) {
        const stock = await db.orm.public.RetailLocationStock.where({ locationId: loc.id, productId: product.id }).all().first();
        const available = stock ? stock.stockQuantity : 0;
        if (available < quantity) {
          return { error: `Not enough stock for ${product.name} at this location (have ${available}, need ${quantity}).` };
        }
      }
      const lineSubtotal = product.price * quantity;
      lineItems.push({ productId: product.id, quantity, unitPrice: product.price, unitCost: product.cost ?? null, subtotal: lineSubtotal });
      subtotal += lineSubtotal;
    }

    // Manual discount (typed at the register) is clamped to the subtotal. A
    // coupon code, when given, is validated org-scoped and its discount is
    // stacked on top â€” still never taking the sale below zero.
    let coupon: { id: string; code: string; type: string; value: number; minSpend: number; isActive: boolean; usageLimit: number | null; timesUsed: number; expiresAt: unknown } | null = null;
    const manualDiscount = Math.max(0, Math.min(input.discountAmount ?? 0, subtotal));
    if (input.couponCode?.trim()) {
      const code = input.couponCode.trim().toUpperCase();
      const found = await db.orm.public.RetailCoupon.where({ organizationId: input.organizationId, code }).all().first();
      if (!found) return { error: `Coupon code ${code} is not valid for this store.` };
      if (!found.isActive) return { error: `Coupon code ${code} is inactive.` };
      if (found.minSpend > 0 && subtotal < found.minSpend) {
        return { error: `Coupon ${code} requires a minimum spend of ${found.minSpend}.` };
      }
      if (found.expiresAt) {
        const expires = instantToMillis(found.expiresAt);
        if (expires < Date.now()) return { error: `Coupon code ${code} has expired.` };
      }
      if (found.usageLimit != null && found.timesUsed >= found.usageLimit) {
        return { error: `Coupon code ${code} has reached its usage limit.` };
      }
      coupon = found;
    }
    const couponDiscount = coupon
      ? Math.max(0, Math.min(coupon.type === 'FIXED' ? coupon.value : (subtotal * coupon.value) / 100, subtotal - manualDiscount))
      : 0;
    const discountAmount = manualDiscount + couponDiscount;

    // Fetch the store's tax rate (Settings stores a percentage â€” 8 for 8%).
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

    if (input.idempotencyKey) {
      const existing = await db.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey, organizationId: input.organizationId }).all().first();
      if (existing) {
        if (existing.locationId !== (input.locationId ?? null)) return { error: 'Idempotency conflict: location mismatch.' };
        if (Math.abs(existing.totalAmount - totalAmount) > 0.01) return { error: 'Idempotency conflict: payload does not match the original request.' };
        return { success: true, orderId: existing.id, totalAmount: existing.totalAmount, taxAmount: existing.taxAmount };
      }
    }

    let order;
    try {
      order = await db.transaction(async (tx: any) => {
      const created = await tx.orm.public.RetailOrder.create({
        organizationId: input.organizationId,
        shiftId: input.shiftId,
        locationId: input.locationId,
        idempotencyKey: input.idempotencyKey,
        cashierId,
        customerDataId: input.customerDataId,
        couponId: coupon?.id,
        totalAmount,
        taxAmount,
        discountAmount,
        paymentMethod: input.paymentMethod,
        status: 'COMPLETED',
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

        const product = productById.get(line.productId);
        if (product && !product.isWeighed) {
          const stock = await getOrInitLocationStock(tx, input.organizationId, loc.id, line.productId);

          const updated = await tx.sql`
            UPDATE "RetailLocationStock"
            SET "stockQuantity" = "stockQuantity" - ${line.quantity}
            WHERE id = ${stock.id} AND "stockQuantity" >= ${line.quantity}
            RETURNING "stockQuantity"
          `;
          
          if (updated.length === 0) {
            throw new Error(`Insufficient stock for ${product.name} at this location.`);
          }
          const next = updated[0].stockQuantity;

          await tx.orm.public.RetailStockMovement.create({
            organizationId: input.organizationId,
            locationId: loc.id,
            productId: line.productId,
            delta: -line.quantity,
            beforeQty: stock.stockQuantity,
            afterQty: next,
            reason: 'SALE_PENDING',
            referenceType: 'ORDER',
            referenceId: created.id,
            note: `Order ${created.id.slice(0, 8)}`,
            recordedById: cashierId,
          });

          if (coupon) {
            await tx.orm.public.RetailCoupon.where({ id: coupon.id }).update({ timesUsed: coupon.timesUsed + 1 });
            coupon = { ...coupon, timesUsed: coupon.timesUsed + 1 };
          }
          
          if (next <= (stock.lowStockLevel ?? product.lowStockLevel ?? Number.NEGATIVE_INFINITY)) {
            await createShopNotification(input.organizationId, 'LOW_STOCK', `Low stock: ${product.name}`, `${next} remaining (min ${stock.lowStockLevel ?? product.lowStockLevel}).`);
          }
        }
      }

      // CityPay settlement: credit this store's organization wallet with the
      // sale total in the same transaction as the order itself. The wallet is
      // created on first settlement if the org doesn't have one yet.
      if (walletSettlementEnabled && totalAmount > 0) {
        let wallet = await tx.orm.public.Wallet.where({ organizationId: input.organizationId }).all().first();
        if (!wallet) {
          wallet = await tx.orm.public.Wallet.create({
            organizationId: input.organizationId,
            balance: 0,
            currency: 'USD',
          });
        }
        const transaction = await tx.orm.public.Transaction.create({
          status: 'SETTLED',
          reference: `RET-${created.id.slice(0, 8)}`,
          description: `ShopOS sale settlement`,
        });
        await tx.orm.public.LedgerEntry.create({
          walletId: wallet.id,
          transactionId: transaction.id,
          amount: totalAmount,
          currency: wallet.currency ?? 'USD',
        });
        await tx.orm.public.Wallet.where({ id: wallet.id }).update({ balance: wallet.balance + totalAmount });
      }

      return created;
      });
    } catch (error: any) {
      if (input.idempotencyKey && (error.code === 'P2002' || (error.message && (error.message.includes('idempotencyKey') || error.message.includes('Unique constraint'))))) {
        const existing = await db.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey, organizationId: input.organizationId }).all().first();
        if (existing) {
          if (existing.locationId !== (input.locationId ?? null)) return { error: 'Idempotency conflict: location mismatch.' };
          if (Math.abs(existing.totalAmount - totalAmount) > 0.01) return { error: 'Idempotency conflict: payload does not match the original request.' };
          return { success: true, orderId: existing.id, totalAmount: existing.totalAmount, taxAmount: existing.taxAmount };
        }
      }
      throw error;
    }

    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    for (const line of lineItems) {
      revalidatePath(`/product/${line.productId}`);
    }

    await createShopNotification(
      input.organizationId,
      'SALE',
      'Sale completed',
      `Order #${order.id.slice(0, 8).toUpperCase()} completed for ${totalAmount.toFixed(2)}.`,
    );

    if (input.customerDataId) {
      const personId = await personIdForCustomerData(input.customerDataId);
      if (personId) {
        await notifyPerson(personId, {
          type: 'ORDER_CONFIRMED',
          title: 'Order Confirmed',
          body: `Your order #${order.id.slice(0, 8).toUpperCase()} has been completed.`,
          href: '/orders',
        });
      }

      const customer = await db.orm.public.CustomerData.where({ id: input.customerDataId }).all().first();
      const relationship = customer ? await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first() : null;
      const phoneIdentifiers = relationship
        ? await db.orm.public.PersonIdentifier.where({ personId: relationship.personId, type: 'PHONE' }).all()
        : [];
      const storeSettings = await db.orm.public.RetailSettings.where({ organizationId: input.organizationId }).all().first();

      sendWhatsAppOrderNotification({
        phone: phoneIdentifiers[0]?.normalizedValue,
        orderId: order.id,
        storeName: storeSettings?.storeName,
        items: lineItems.map((line) => ({
          name: productById.get(line.productId)?.name ?? 'Product',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        totalAmount,
        currencySymbol: storeSettings?.currencySymbol,
      }).catch((error) => console.error('WhatsApp order notification failed:', error));
    }

    if ((order as any).payment && (order as any).payment.method === 'PAYSTACK') {
      return { success: true, orderId: order.id, checkoutUrl: `https://checkout.paystack.com/${(order as any).payment.id}`, totalAmount, taxAmount };
    }
    return { success: true, orderId: order.id, totalAmount, taxAmount };
  } catch (error) {
    console.error('Error creating order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to complete sale.' };
  }
}

async function enrichOrders(organizationId: string, orders: any[]) {
  const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
  
  const cashierIds = [...new Set(orders.map((o) => o.cashierId))];
  const cashiers: Record<string, string> = {};
  for (const id of cashierIds) {
    if (id === 'ONLINE_CHECKOUT') {
      cashiers[id] = 'Online Store';
      continue;
    }
    const membership = await db.orm.public.Membership.where({ id }).all().first();
    if (membership) {
       const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
       cashiers[id] = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
    } else {
       cashiers[id] = 'Former Staff';
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

export async function getOrders(organizationId: string, locationId?: string | null, options?: { limit?: number; status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; shiftId?: string }) {
  try {
    await requireMembership(organizationId);
    let orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();
    if (options?.status) orders = orders.filter((o) => o.status === options.status);
    if (options?.shiftId) orders = orders.filter((o) => o.shiftId === options.shiftId);
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
    await requireMembership(organizationId);
    const order = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!order || order.organizationId !== organizationId) return null;
    const [enriched] = await enrichOrders(organizationId, [order]);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export async function refundOrder(orderId: string, input: { reason?: string }) {
  try {
    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!o) return { error: 'Order not found.' };
    const { membership } = await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    // Stock restoration and the refunded status flip are one atomic unit â€” a
    // failure can never leave stock restored onto a still-"completed" order.
    await db.transaction(async (tx: any) => {
      const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (order.status === 'REFUNDED') throw new Error('Order is already refunded.');

      const items = await tx.orm.public.RetailOrderItem.where({ orderId }).all();
      for (const item of items) {
        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        if (product && !product.isWeighed && order.locationId) {
          const stock = await tx.orm.public.RetailLocationStock.where({ organizationId: product.organizationId, locationId: order.locationId, productId: product.id }).all().first();
          if (stock) {
            const updated = await tx.sql`
              UPDATE "RetailLocationStock"
              SET "stockQuantity" = "stockQuantity" + ${item.quantity}
              WHERE id = ${stock.id}
              RETURNING "stockQuantity"
            `;
            
            await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: order.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: stock.stockQuantity,
              afterQty: updated[0].stockQuantity,
              reason: 'REFUND',
              referenceType: 'REFUND',
              referenceId: item.id, // Idempotency
              note: input.reason ?? `Order ${order.id.slice(0, 8)} refunded`,
              recordedById: membership.id,
            });
          }
        }
      }
      await tx.orm.public.RetailOrder.where({ id: orderId }).update({
        status: 'REFUNDED',
        refundedAt: toInstant(new Date()),
        refundedById: membership.id,
        refundReason: input.reason,
      });
    });

    const matched = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (matched) {
      await createShopNotification(
        matched.organizationId,
        'REFUND',
        'Refund processed',
        `Order #${orderId.slice(0, 8)} was refunded.`,
      );

      if (matched.customerDataId) {
        const personId = await personIdForCustomerData(matched.customerDataId);
        if (personId) {
          await notifyPerson(personId, {
            type: 'SYSTEM',
            title: 'Order Refunded',
            body: `Your order #${orderId.slice(0, 8).toUpperCase()} has been refunded.`,
            href: '/orders',
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error refunding order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to refund order.' };
  }
}

// ---------------------------------------------------------------------
// Coupons / Discounts
// ---------------------------------------------------------------------

export async function getCoupons(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const coupons = await db.orm.public.RetailCoupon.where({ organizationId }).all();
    coupons.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    return JSON.parse(JSON.stringify(coupons));
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
}

// Validate a coupon against a live subtotal and return the exact discount it
// would apply. Used by the register so the cashier sees a true total before
// tendering. The authoritative, race-safe validation still happens inside
// createOrder's transaction.
export async function getCouponDiscount(organizationId: string, code: string, subtotal: number) {
  try {
    await requireMembership(organizationId);
    const found = await db.orm.public.RetailCoupon.where({ organizationId, code: code.trim().toUpperCase() }).all().first();
    if (!found) return { error: `Coupon code ${code.trim().toUpperCase()} is not valid for this store.` };
    if (!found.isActive) return { error: `Coupon code ${code.trim().toUpperCase()} is inactive.` };
    if (found.minSpend > 0 && subtotal < found.minSpend) {
      return { error: `Coupon ${code.trim().toUpperCase()} requires a minimum spend of ${found.minSpend}.` };
    }
    if (found.expiresAt) {
      if (instantToMillis(found.expiresAt) < Date.now()) return { error: `Coupon code ${code.trim().toUpperCase()} has expired.` };
    }
    if (found.usageLimit != null && found.timesUsed >= found.usageLimit) {
      return { error: `Coupon code ${code.trim().toUpperCase()} has reached its usage limit.` };
    }
    const discount = Math.max(0, Math.min(found.type === 'FIXED' ? found.value : (subtotal * found.value) / 100, subtotal));
    return JSON.parse(JSON.stringify({
      success: true,
      discount,
      type: found.type,
      label: found.type === 'FIXED' ? `${found.value}` : `${found.value}%`,
    }));
  } catch (error) {
    console.error('Error checking coupon:', error);
    return { error: 'Failed to check coupon.' };
  }
}

export async function createCoupon(input: {
  organizationId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSpend?: number;
  usageLimit?: number | null;
  expiresAt?: string | null;
  description?: string | null;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const code = input.code.trim().toUpperCase();
    if (!code) return { error: 'Coupon code is required.' };
    const existing = await db.orm.public.RetailCoupon.where({ organizationId: input.organizationId, code }).all().first();
    if (existing) return { error: `A coupon with code ${code} already exists.` };
    if (!(input.value > 0)) return { error: 'Coupon value must be greater than zero.' };
    const coupon = await db.orm.public.RetailCoupon.create({
      organizationId: input.organizationId,
      code,
      type: input.type,
      value: input.type === 'PERCENT' ? Math.min(100, input.value) : input.value,
      minSpend: input.minSpend ?? 0,
      usageLimit: input.usageLimit ?? null,
      expiresAt: input.expiresAt ? toInstant(new Date(input.expiresAt)) : null,
      description: input.description ?? null,
    });
    return { success: true, coupon: JSON.parse(JSON.stringify(coupon)) };
  } catch (error) {
    console.error('Error creating coupon:', error);
    return { error: 'Failed to create coupon.' };
  }
}

export async function updateCoupon(couponId: string, input: { isActive?: boolean; value?: number; minSpend?: number; usageLimit?: number | null; expiresAt?: string | null; description?: string | null }) {
  try {
    const existing = await db.orm.public.RetailCoupon.where({ id: couponId }).all().first();
    if (existing) await requireMembership(existing.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.value !== undefined) data.value = input.value;
    if (input.minSpend !== undefined) data.minSpend = input.minSpend;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? toInstant(new Date(input.expiresAt)) : null;
    if (input.description !== undefined) data.description = input.description;
    await db.orm.public.RetailCoupon.where({ id: couponId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating coupon:', error);
    return { error: 'Failed to update coupon.' };
  }
}

export async function deleteCoupon(couponId: string) {
  try {
    const existing = await db.orm.public.RetailCoupon.where({ id: couponId }).all().first();
    if (existing) await requireMembership(existing.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.RetailCoupon.where({ id: couponId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return { error: 'Failed to delete coupon.' };
  }
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------

export async function getShopNotifications(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const rows = await db.orm.public.RetailNotification.where({ organizationId }).all();
    rows.sort((a, b) => instantToMillis(b.createdAt) - instantToMillis(a.createdAt));
    return JSON.parse(JSON.stringify(rows));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markShopNotificationsRead(organizationId: string, notificationId?: string) {
  try {
    await requireMembership(organizationId);
    if (notificationId) {
      await db.orm.public.RetailNotification.where({ id: notificationId }).update({ isRead: true });
    } else {
      const unread = await db.orm.public.RetailNotification.where({ organizationId, isRead: false }).all();
      for (const n of unread) {
        await db.orm.public.RetailNotification.where({ id: n.id }).update({ isRead: true });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return { error: 'Failed to update notifications.' };
  }
}

// ---------------------------------------------------------------------
// CSV export of report data (client turns rows into a downloadable file)
// ---------------------------------------------------------------------

export async function exportShopReport(organizationId: string, kind: 'orders' | 'products' | 'customers') {
  try {
    await requireMembership(organizationId);
    const rows: Record<string, unknown>[] = [];
    if (kind === 'products') {
      const allProducts = await db.orm.public.RetailProduct.where({ organizationId }).all();
      for (const p of allProducts) {
        rows.push({ SKU: p.sku ?? '', Name: p.name, Price: p.price, Cost: p.cost ?? '', Stock: p.stockQuantity, LowStockLevel: p.lowStockLevel ?? '', Unit: p.unit });
      }
    } else if (kind === 'orders') {
      const allOrders = await db.orm.public.RetailOrder.where({ organizationId }).all();
      allOrders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
      for (const o of allOrders) {
        let customerName = 'Walk-in';
        if (o.customerDataId) {
          const cd = await db.orm.public.CustomerData.where({ id: o.customerDataId }).all().first();
          if (cd) {
            const rel = await db.orm.public.Relationship.where({ id: cd.relationshipId }).all().first();
            if (rel) {
              const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
              if (person) customerName = `${person.firstName} ${person.lastName}`.trim() || 'Customer';
            }
          }
        }
        rows.push({
          OrderId: o.id,
          Date: o.createdAt,
          Status: o.status,
          Total: o.totalAmount,
          Tax: o.taxAmount,
          Discount: o.discountAmount,
          PaymentMethod: o.paymentMethod,
          Customer: customerName,
        });
      }
    } else {
      const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
      for (const rel of relationships) {
        const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
        const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
        rows.push({
          Name: person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown',
          LoyaltyPoints: cd?.loyaltyPoints ?? 0,
          Notes: cd?.notes ?? '',
        });
      }
    }
    return JSON.parse(JSON.stringify(rows));
  } catch (error) {
    console.error('Error exporting report:', error);
    return [];
  }
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------

export async function getShopDashboardData(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const allOrders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    allOrders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    const startOfToday = startOfDay(new Date()).getTime();
    const todayOrders = allOrders.filter((o) => epochMs(o.createdAt) >= startOfToday);

    const completedToday = todayOrders.filter((o) => o.status === 'CONFIRMED');
    const refundedToday = todayOrders.filter((o) => o.status === 'CANCELLED');
    const grossSales = completedToday.reduce((sum, o) => sum + o.totalAmount, 0);
    const refundsTotal = refundedToday.reduce((sum, o) => sum + o.totalAmount, 0);

    const completedOrders = allOrders.filter((o) => o.status === 'CONFIRMED');
    const refundedAll = allOrders.filter((o) => o.status === 'CANCELLED');

    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    
    // Fetch location stock if locationId is provided, else aggregate all
    const stocks = locationId 
      ? await db.orm.public.RetailLocationStock.where({ organizationId, locationId }).all()
      : await db.orm.public.RetailLocationStock.where({ organizationId }).all();
      
    const stockMap = new Map<string, number>();
    for (const s of stocks) {
      stockMap.set(s.productId, (stockMap.get(s.productId) || 0) + s.stockQuantity);
    }
    
    const lowStockCount = products.filter((p) => p.lowStockLevel != null && (stockMap.get(p.id) || 0) <= (p.lowStockLevel as number)).length;
    const lowStockProducts = products
      .filter((p) => p.lowStockLevel != null && (stockMap.get(p.id) || 0) <= (p.lowStockLevel as number))
      .sort((a, b) => (stockMap.get(a.id) || 0) - (stockMap.get(b.id) || 0))
      .map((p) => ({ id: p.id, name: p.name, stockQuantity: stockMap.get(p.id) || 0, lowStockLevel: p.lowStockLevel, unit: p.unit, sku: p.sku }));

    // Top products by units sold & revenue â€” derived from this org's own
    // completed order line items (never a cross-tenant scan).
    const productById = new Map(products.map((p) => [p.id, p.name]));
    const salesByProduct: Record<string, { units: number; revenue: number }> = {};
    for (const order of completedOrders) {
      const items = await db.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
      for (const item of items) {
        const agg = (salesByProduct[item.productId] ??= { units: 0, revenue: 0 });
        agg.units += item.quantity;
        agg.revenue += item.subtotal;
      }
    }
    const topProducts = Object.entries(salesByProduct)
      .map(([productId, agg]) => ({ productId, name: productById.get(productId) ?? 'Unknown', ...agg }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // New customer relationships created since the start of today.
    let newCustomersToday = 0;
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
    newCustomersToday = relationships.filter((r) => epochMs(r.createdAt) >= startOfToday).length;

    const recentOrders = await enrichOrders(organizationId, completedOrders.slice(0, 6));

    const openShift = await getOpenShift(organizationId);
    const settings = await getRetailSettings(organizationId);

    return {
      grossSales,
      transactions: completedToday.length,
      refunds: refundsTotal,
      netSales: grossSales - refundsTotal,
      lowStockCount,
      totalProducts: products.length,
      totalOrders: allOrders.length,
      totalCompletedOrders: completedOrders.length,
      totalItemsSold: completedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      newCustomersToday,
      topProducts: JSON.parse(JSON.stringify(topProducts)),
      recentOrders: JSON.parse(JSON.stringify(recentOrders)),
      lowStockProducts: JSON.parse(JSON.stringify(lowStockProducts)),
      openShift,
      settings,
    };
  } catch (error) {
    console.error('Error fetching shop dashboard data:', error);
    return { grossSales: 0, transactions: 0, refunds: 0, netSales: 0, lowStockCount: 0, totalProducts: 0, totalOrders: 0, totalCompletedOrders: 0, totalItemsSold: 0, newCustomersToday: 0, topProducts: [], recentOrders: [], lowStockProducts: [], openShift: null, settings: null };
  }
}

// ---------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Payroll', 'Maintenance', 'Marketing', 'Other'] as const;

export async function getExpenses(organizationId: string, options?: { category?: string }) {
  try {
    await requireMembership(organizationId);
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
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const recordedById = membership.id;
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
      recordedById,
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
    await requireMembership(organizationId);
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
    const theirOrders = orders.filter((o) => o.customerDataId === c.id && o.status === 'CONFIRMED');
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
    await requireMembership(organizationId);
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
    const customerDataList = [];
    for (const rel of relationships) {
      const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
      if (cd) customerDataList.push(cd);
    }
    // Compose display name/contact from the Person behind each Relationship
    // (CustomerData is deliberately just loyalty data; PersonIdentifier holds
    // the canonical contact points). Identifiers are fetched per-relationship
    // so a tenant request never scans the global identifier table.
    const persons: Record<string, any> = {};
    for (const rel of relationships) {
      const p = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      if (p) persons[rel.id] = p;
    }
    const enriched = await enrichCustomers(organizationId, await Promise.all(customerDataList.map(async (cd: any) => {
      const rel = relationships.find((r) => r.id === cd.relationshipId);
      const person = rel ? persons[rel.id] : null;
      let phone: string | null = null;
      let email: string | null = null;
      if (rel) {
        const relIds = await db.orm.public.PersonIdentifier.where({ personId: rel.personId }).all();
        phone = relIds.find((i) => i.type === 'PHONE')?.normalizedValue ?? null;
        email = relIds.find((i) => i.type === 'EMAIL')?.normalizedValue ?? null;
      }
      return {
        ...cd,
        name: person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown',
        phone,
        email,
      };
    })));
    enriched.sort((a, b) => b.totalSpent - a.totalSpent);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

export async function getCustomer(organizationId: string, customerDataId: string) {
  try {
    await requireMembership(organizationId);
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return null;
    const [enriched] = await enrichCustomers(organizationId, [customer]);

    // Compose the same name/contact shape as getCustomers so the customer
    // 360 modal renders identically.
    const relationship = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
    let name = 'Unknown';
    let phone: string | null = null;
    let email: string | null = null;
    if (relationship) {
      const person = await db.orm.public.Person.where({ id: relationship.personId }).all().first();
      if (person) name = `${person.firstName} ${person.lastName}`.trim();
      const ids = await db.orm.public.PersonIdentifier.where({ personId: relationship.personId }).all();
      phone = ids.find((i) => i.type === 'PHONE')?.normalizedValue ?? null;
      email = ids.find((i) => i.type === 'EMAIL')?.normalizedValue ?? null;
    }

    const orders = await db.orm.public.RetailOrder.where({ organizationId, customerDataId }).all();
    orders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    const orderHistory = await enrichOrders(organizationId, orders);

    return JSON.parse(JSON.stringify({ ...enriched, name, phone, email, orders: orderHistory }));
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
      if (Object.keys(pUpdate).length > 0) {
        await db.orm.public.Person.where({ id: relationship.personId }).update(pUpdate);
      }
      // Contact points are canonical PersonIdentifier rows (V1: Person has no
      // phone/email columns). Upsert EMAIL/PHONE identifiers.
      if (input.email !== undefined) {
        const normalized = input.email ? input.email.trim().toLowerCase() : null;
        if (normalized) {
          const existing = await db.orm.public.PersonIdentifier.where({ personId: relationship.personId, type: 'EMAIL' }).all().first();
          if (existing) {
            await db.orm.public.PersonIdentifier.where({ id: existing.id }).update({ normalizedValue: normalized });
          } else {
            await db.orm.public.PersonIdentifier.create({ personId: relationship.personId, type: 'EMAIL', normalizedValue: normalized });
          }
        }
      }
      if (input.phone !== undefined) {
        const normalized = input.phone ? input.phone.trim() : null;
        if (normalized) {
          const existing = await db.orm.public.PersonIdentifier.where({ personId: relationship.personId, type: 'PHONE' }).all().first();
          if (existing) {
            await db.orm.public.PersonIdentifier.where({ id: existing.id }).update({ normalizedValue: normalized });
          } else {
            await db.orm.public.PersonIdentifier.create({ personId: relationship.personId, type: 'PHONE', normalizedValue: normalized });
          }
        }
      }
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
    await requireMembership(organizationId);
    let settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    if (!settings) {
      settings = await db.orm.public.RetailSettings.create({
        organizationId,
        storeName: 'My Retail Store',
        customUnits: JSON.stringify(DEFAULT_RETAIL_UNITS),
      });
    } else {
      const normalizedUnits = normalizeRetailUnits(settings.customUnits);
      if (JSON.stringify(normalizedUnits) !== settings.customUnits) {
        await db.orm.public.RetailSettings.where({ organizationId }).update({ customUnits: JSON.stringify(normalizedUnits) });
        settings = { ...settings, customUnits: JSON.stringify(normalizedUnits) };
      }
    }
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    return { ...settings, logoAssetId: org?.logoAssetId || null };
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
  logoAssetId?: string | null;
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
    
    if (input.logoAssetId !== undefined) {
      await db.orm.public.Organization.where({ id: organizationId }).update({ logoAssetId: input.logoAssetId });
    }
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
    await requireMembership(order.organizationId);

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

// ---------------------------------------------------------------------
// Global search (âŒ˜K palette)
// ---------------------------------------------------------------------

export async function searchShopOS(organizationId: string, query: string) {
  try {
    await requireMembership(organizationId);
    const q = query.trim().toLowerCase();
    if (!q) return { products: [], customers: [], orders: [], staff: [] };

    const [products, rels] = await Promise.all([
      db.orm.public.RetailProduct.where({ organizationId }).all(),
      db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all(),
    ]);

    const productResults = products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: `${p.sku ? `SKU ${p.sku} Â· ` : ''}${p.stockQuantity} ${p.unit} in stock`,
        icon: 'PRODUCT',
      }));

    const customerResults: any[] = [];
    for (const rel of rels) {
      const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
      if (!cd) continue;
      const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      const displayName = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
      const relIds = await db.orm.public.PersonIdentifier.where({ personId: rel.personId }).all();
      const phone = relIds.find((i) => i.type === 'PHONE')?.normalizedValue ?? '';
      const email = relIds.find((i) => i.type === 'EMAIL')?.normalizedValue ?? '';
      if (displayName.toLowerCase().includes(q) || phone.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
        customerResults.push({ id: cd.id, name: displayName, subtitle: phone || email || 'Customer', icon: 'CUSTOMER' });
        if (customerResults.length >= 6) break;
      }
    }

    // Orders match by short/long id reference or by cashier/customer/item name
    // over the 15 most recent orders (enrichment is bounded to that window).
    const allOrders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    allOrders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    const enrichedRecent = await enrichOrders(organizationId, allOrders.slice(0, 15));
    const orderResults = enrichedRecent
      .filter((o) =>
        o.id.toLowerCase().includes(q) ||
        o.cashierName.toLowerCase().includes(q) ||
        (o.customerName ?? '').toLowerCase().includes(q) ||
        o.items.some((i: any) => i.productName.toLowerCase().includes(q))
      )
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        name: `Order #${o.id.slice(0, 8)}`,
        subtitle: `${o.cashierName} Â· ${o.items.length} item${o.items.length === 1 ? '' : 's'} Â· ${o.paymentMethod}`,
        icon: 'ORDER',
      }));

    const staffRows = await getStaff(organizationId);
    const staffResults = staffRows
      .filter((s: any) => s.name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
      .slice(0, 6)
      .map((s: any) => ({ id: s.membershipId, name: s.name, subtitle: s.email ?? s.roles.join(', '), icon: 'STAFF' }));

    return JSON.parse(JSON.stringify({
      products: productResults,
      customers: customerResults,
      orders: orderResults,
      staff: staffResults,
    }));
  } catch (error) {
    console.error('Error searching shop:', error);
    return { products: [], customers: [], orders: [], staff: [] };
  }
}

// ---------------------------------------------------------------------
// Reports (real, derived figures â€” no fabrications)
// ---------------------------------------------------------------------

export async function getShopReports(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const allOrders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    const completed = allOrders.filter((o) => o.status === 'CONFIRMED');
    const refunded = allOrders.filter((o) => o.status === 'CANCELLED');

    const dayMs = 24 * 60 * 60 * 1000;
    const startToday = startOfDay(new Date()).getTime();
    const start7 = startToday - 6 * dayMs;
    const start30 = startToday - 29 * dayMs;

    const series = (since: number) => {
      const comp = completed.filter((o) => epochMs(o.createdAt) >= since);
      const ref = refunded.filter((o) => epochMs(o.refundedAt ?? o.createdAt) >= since);
      return {
        sales: comp.reduce((sum, o) => sum + o.totalAmount, 0),
        transactions: comp.length,
        refunds: ref.reduce((sum, o) => sum + o.totalAmount, 0),
      };
    };
    const periods = {
      today: series(startToday),
      sevenDays: series(start7),
      thirtyDays: series(start30),
    };

    // All-time product performance from this org's completed line items.
    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    const productById = new Map(products.map((p) => [p.id, p]));
    const byProduct: Record<string, { units: number; revenue: number; orders: number }> = {};
    let totalCogs = 0;
    for (const order of completed) {
      const items = await db.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
      for (const item of items) {
        const agg = (byProduct[item.productId] ??= { units: 0, revenue: 0, orders: 0 });
        agg.units += item.quantity;
        agg.revenue += item.subtotal;
        agg.orders += 1;
        const historicalCost = item.unitCost ?? (productById.get(item.productId)?.cost ?? 0);
        totalCogs += historicalCost * item.quantity;
      }
    }
    const salesByProduct = Object.entries(byProduct)
      .map(([productId, agg]) => {
        const p = productById.get(productId);
        return {
          productId,
          name: p?.name ?? 'Removed product',
          sku: p?.sku ?? null,
          unit: p?.unit ?? 'ea',
          ...agg,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const membershipCache: Record<string, string> = {};
    const cashierName = async (membershipId: string) => {
      if (membershipId === 'ONLINE_CHECKOUT') return 'Online Store';
      if (membershipCache[membershipId]) return membershipCache[membershipId];
      const m = await db.orm.public.Membership.where({ id: membershipId }).all().first();
      if (!m) { membershipCache[membershipId] = 'Former Staff'; return 'Former Staff'; }
      const p = await db.orm.public.Person.where({ id: m.personId }).all().first();
      const name = p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown';
      membershipCache[membershipId] = name;
      return name;
    };
    const byCashier: Record<string, { revenue: number; orders: number; name?: string }> = {};
    for (const order of completed) {
      const agg = (byCashier[order.cashierId] ??= { revenue: 0, orders: 0 });
      agg.revenue += order.totalAmount;
      agg.orders += 1;
    }
    const salesByCashier = [];
    for (const [cashierId, agg] of Object.entries(byCashier)) {
      salesByCashier.push({ cashierId, cashierName: await cashierName(cashierId), ...agg });
    }
    salesByCashier.sort((a, b) => b.revenue - a.revenue);

    const allCustomers = await getCustomers(organizationId);
    const customers = await Promise.all(
      allCustomers.map(async (c: any) => {
        const ords = await db.orm.public.RetailOrder.where({ customerDataId: c.id }).all();
        const comp = ords.filter((o) => o.status === 'CONFIRMED');
        return {
          ...c,
          totalSpent: comp.reduce((sum, o) => sum + o.totalAmount, 0),
          orderCount: comp.length,
        };
      }),
    );
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    const topCustomers = (customers as any[])
      .slice(0, 5)
      .map((c) => ({ id: c.id, name: c.name, totalSpent: c.totalSpent, orderCount: c.orderCount, loyaltyPoints: c.loyaltyPoints }));

    const lowStock = products
      .filter((p) => p.lowStockLevel != null && p.stockQuantity <= (p.lowStockLevel as number))
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .map((p) => ({ id: p.id, name: p.name, stockQuantity: p.stockQuantity, lowStockLevel: p.lowStockLevel, unit: p.unit }));

    const expenses = await db.orm.public.RetailExpense.where({ organizationId }).all();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalTax = completed.reduce((sum, o) => sum + o.taxAmount, 0);

    return JSON.parse(JSON.stringify({
      periods,
      salesByProduct,
      salesByCashier,
      topCustomers,
      lowStock,
      totals: {
        gross: completed.reduce((sum, o) => sum + o.totalAmount, 0),
        tax: totalTax,
        refunded: refunded.reduce((sum, o) => sum + o.totalAmount, 0),
        cogs: totalCogs,
        expenses: totalExpenses,
        completedCount: completed.length,
        refundedCount: refunded.length,
      },
    }));
  } catch (error) {
    console.error('Error fetching shop reports:', error);
    return {
      periods: { today: { sales: 0, transactions: 0, refunds: 0 }, sevenDays: { sales: 0, transactions: 0, refunds: 0 }, thirtyDays: { sales: 0, transactions: 0, refunds: 0 } },
      salesByProduct: [], salesByCashier: [], topCustomers: [], lowStock: [],
      totals: { gross: 0, refunded: 0, completedCount: 0, refundedCount: 0 },
    };
  }
}

// ---------------------------------------------------------------------
// Storefront publish flow
// ---------------------------------------------------------------------

export async function getShopStorefront(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    const site = await db.orm.public.Microsite.where({ organizationId }).all().first();
    return JSON.parse(JSON.stringify({
      settings,
      site: site
        ? { id: site.id, slug: site.slug, title: site.title, status: site.status, publishedAt: site.publishedAt }
        : null,
    }));
  } catch (error) {
    console.error('Error fetching storefront:', error);
    return { settings: null, site: null };
  }
}

export async function updateShopStorefront(
  organizationId: string,
  input: { storeName?: string; storeAddress?: string; receiptMessage?: string; published?: boolean },
) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN']);
    const data: Record<string, unknown> = {};
    if (input.storeName !== undefined) data.storeName = input.storeName;
    if (input.storeAddress !== undefined) data.storeAddress = input.storeAddress;
    if (input.receiptMessage !== undefined) data.receiptMessage = input.receiptMessage;
    if (Object.keys(data).length > 0) {
      data.hasStoreInfo = true;
      await db.orm.public.RetailSettings.where({ organizationId }).update(data);
    }

    if (input.published !== undefined) {
      const site = await db.orm.public.Microsite.where({ organizationId }).all().first();
      if (site) {
        await db.orm.public.Microsite.where({ id: site.id }).update({
          status: input.published ? 'published' : 'draft',
          publishedAt: input.published ? toInstant(new Date()) : null,
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating storefront:', error);
    return { error: 'Failed to update storefront.' };
  }
}

// ---------------------------------------------------------------------
// CityPay wallet settlement (Phase 7)
// ---------------------------------------------------------------------

export async function toggleWalletSettlement(organizationId: string, enabled: boolean) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN']);
    await db.orm.public.RetailSettings.where({ organizationId }).update({ walletSettlementEnabled: enabled });
    return { success: true };
  } catch (error) {
    console.error('Error toggling wallet settlement:', error);
    return { error: 'Failed to update wallet settlement.' };
  }
}

export async function getShopWalletBalance(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    const wallet = await db.orm.public.Wallet.where({ organizationId }).all().first();
    return JSON.parse(JSON.stringify({
      enabled: settings?.walletSettlementEnabled ?? false,
      wallet: wallet ? { balance: wallet.balance, currency: wallet.currency } : null,
    }));
  } catch (error) {
    console.error('Error fetching shop wallet:', error);
    return { enabled: false, wallet: null };
  }
}



export async function updateFulfillmentStatus(orderId: string, status: 'UNFULFILLED' | 'PROCESSING' | 'READY' | 'FULFILLED' | 'CANCELLED' | 'RETURNED', locationId?: string) {
  try {
    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!o) return { error: 'Order not found.' };
    const loc = await resolveLocationContext(o.organizationId, locationId || o.locationId).catch(e => { throw e; });
    if (!loc) return { error: 'Order location cannot be resolved.' };
    await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], loc.id);

    await db.orm.public.RetailOrder.where({ id: orderId }).update({ fulfillmentStatus: status });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

