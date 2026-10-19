'use server';

import { db } from '@/src/prisma/db';

export async function syncProductBroadcast(product: {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageAssetId?: string | null;
  organizationId: string;
}) {
  try {
    const existing = await db.orm.public.Post.where({
      linkedEntityType: 'RETAIL_PRODUCT',
      linkedEntityId: product.id,
    }).first();

    const title = product.name;
    const content = product.description?.trim() || `Available at local merchant storefront in Calabar.`;
    const price = product.price != null ? Number(product.price) : undefined;
    const imageUrl = product.imageAssetId || undefined;

    if (existing) {
      await db.orm.public.Post.where({ id: existing.id }).update({
        title,
        content,
        price,
        imageUrl,
        category: 'Marketplace',
        status: 'PUBLISHED',
      });
    } else {
      await db.orm.public.Post.create({
        title,
        content,
        category: 'Marketplace',
        price,
        imageUrl,
        organizationId: product.organizationId,
        linkedEntityType: 'RETAIL_PRODUCT',
        linkedEntityId: product.id,
        status: 'PUBLISHED',
        isEmergency: false,
      });
    }
  } catch (error) {
    console.error('Error syncing retail product broadcast post:', error);
  }
}

export async function syncMenuItemBroadcast(item: {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  organizationId: string;
}) {
  try {
    const existing = await db.orm.public.Post.where({
      linkedEntityType: 'MENU_ITEM',
      linkedEntityId: item.id,
    }).first();

    const title = item.name;
    const content = item.description?.trim() || `Freshly prepared meal available for order in Calabar.`;
    const price = item.price != null ? Number(item.price) : undefined;
    const imageUrl = item.imageUrl || undefined;

    if (existing) {
      await db.orm.public.Post.where({ id: existing.id }).update({
        title,
        content,
        price,
        imageUrl,
        category: 'Food',
        status: 'PUBLISHED',
      });
    } else {
      await db.orm.public.Post.create({
        title,
        content,
        category: 'Food',
        price,
        imageUrl,
        organizationId: item.organizationId,
        linkedEntityType: 'MENU_ITEM',
        linkedEntityId: item.id,
        status: 'PUBLISHED',
        isEmergency: false,
      });
    }
  } catch (error) {
    console.error('Error syncing menu item broadcast post:', error);
  }
}

export async function syncServiceBroadcast(service: {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageAssetId?: string | null;
  organizationId: string;
}) {
  try {
    const existing = await db.orm.public.Post.where({
      linkedEntityType: 'SERVICE',
      linkedEntityId: service.id,
    }).first();

    const title = service.name;
    const content = service.description?.trim() || `Verified professional service available in Calabar.`;
    const price = service.price != null ? Number(service.price) : undefined;
    const imageUrl = service.imageAssetId || undefined;

    if (existing) {
      await db.orm.public.Post.where({ id: existing.id }).update({
        title,
        content,
        price,
        imageUrl,
        category: 'Services',
        status: 'PUBLISHED',
      });
    } else {
      await db.orm.public.Post.create({
        title,
        content,
        category: 'Services',
        price,
        imageUrl,
        organizationId: service.organizationId,
        linkedEntityType: 'SERVICE',
        linkedEntityId: service.id,
        status: 'PUBLISHED',
        isEmergency: false,
      });
    }
  } catch (error) {
    console.error('Error syncing service broadcast post:', error);
  }
}

export async function syncJobBroadcast(job: {
  id: string;
  title: string;
  description: string;
  area?: string | null;
  organizationId: string;
}) {
  try {
    const existing = await db.orm.public.Post.where({
      linkedEntityType: 'JOB',
      linkedEntityId: job.id,
    }).first();

    const title = job.title;
    const content = job.description;
    const location = job.area || 'Calabar, Cross River';

    if (existing) {
      await db.orm.public.Post.where({ id: existing.id }).update({
        title,
        content,
        location,
        category: 'Jobs',
        status: 'PUBLISHED',
      });
    } else {
      await db.orm.public.Post.create({
        title,
        content,
        category: 'Jobs',
        location,
        organizationId: job.organizationId,
        linkedEntityType: 'JOB',
        linkedEntityId: job.id,
        status: 'PUBLISHED',
        isEmergency: false,
      });
    }
  } catch (error) {
    console.error('Error syncing job broadcast post:', error);
  }
}
