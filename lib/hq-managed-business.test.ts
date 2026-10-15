import test from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { randomUUID } from 'crypto';

test('HQ Managed Business & Order Lifecycle Suite', async (t) => {
  const adminActor = await db.orm.public.Person.create({
    firstName: 'HQ',
    lastName: 'Admin',
  });

  const testOrg = await db.orm.public.Organization.create({
    name: `Test Managed Spot ${randomUUID().slice(0, 6)}`,
    type: 'RESTAURANT',
    status: 'ACTIVE',
  });

  const city = (await db.orm.public.City.all().first()) || (await db.orm.public.City.create({
    name: 'Calabar',
    slug: 'calabar',
    state: 'Cross River',
    country: 'Nigeria',
    currency: 'NGN',
    isActive: true,
  }));

  const testLocation = await db.orm.public.Location.create({
    organizationId: testOrg.id,
    name: 'Main Branch',
    address: '12 Marian Road, Calabar',
    cityId: city.id,
  });

  const testListing = await db.orm.public.DiscoveryListing.create({
    organizationId: testOrg.id,
    title: testOrg.name,
    slug: `test-spot-${randomUUID().slice(0, 6)}`,
    vertical: 'FOOD',
    description: 'Fresh authentic test cuisine in Calabar',
    isActive: true,
    cityId: city.id,
  });

  try {
    await t.test('1. HQ Media updates: cover, logo, and metadata gallery', async () => {
      const sampleCover = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800';
      const sampleLogo = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200';
      const samplePhotos = [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
      ];
      const sampleVideos = ['https://www.youtube.com/watch?v=sample123'];

      await db.transaction(async (tx) => {
        await tx.orm.public.Organization.where({ id: testOrg.id }).update({
          logoAssetId: sampleLogo,
        });

        const meta = {
          coverImage: sampleCover,
          photos: samplePhotos,
          videos: sampleVideos,
          featuredVideo: sampleVideos[0],
        };

        await tx.orm.public.DiscoveryListing.where({ id: testListing.id }).update({
          coverAssetId: sampleCover,
          metadata: JSON.stringify(meta),
        });

        await tx.orm.public.HQAuditEvent.create({
          actorPersonId: adminActor.id,
          action: 'BUSINESS_MEDIA_UPDATED',
          targetType: 'Organization',
          targetId: testOrg.id,
          metadata: meta,
        });
      });

      const updatedOrg = await db.orm.public.Organization.where({ id: testOrg.id }).all().first();
      const updatedListing = await db.orm.public.DiscoveryListing.where({ id: testListing.id }).all().first();

      assert.strictEqual(updatedOrg?.logoAssetId, sampleLogo);
      assert.strictEqual(updatedListing?.coverAssetId, sampleCover);
      const parsed = JSON.parse(updatedListing?.metadata || '{}');
      assert.deepStrictEqual(parsed.photos, samplePhotos);
      assert.deepStrictEqual(parsed.videos, sampleVideos);
    });

    await t.test('2. HQ Catalog management: menu item pricing and availability', async () => {
      const menuItem = await db.orm.public.MenuItem.create({
        organizationId: testOrg.id,
        name: 'Afang Soup & Pounded Yam',
        description: 'Rich Calabar delicacy with stockfish and beef',
        price: 3500,
        isAvailable: true,
        category: 'Native Soups',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      });

      assert.strictEqual(menuItem.price, 3500);
      assert.strictEqual(menuItem.isAvailable, true);

      // Price revision
      await db.orm.public.MenuItem.where({ id: menuItem.id }).update({
        price: 3800,
        isAvailable: false,
      });

      const updatedItem = await db.orm.public.MenuItem.where({ id: menuItem.id }).all().first();
      assert.strictEqual(updatedItem?.price, 3800);
      assert.strictEqual(updatedItem?.isAvailable, false);

      // Clean up item
      await db.orm.public.MenuItem.where({ id: menuItem.id }).delete();
    });

    await t.test('3. HQ Order Lifecycle & status progression', async () => {
      const order = await db.orm.public.RestaurantOrder.create({
        organizationId: testOrg.id,
        status: 'PENDING',
        totalAmount: 5000,
      });

      assert.strictEqual(order.status, 'PENDING');

      // Transitions: PENDING -> PREPARING -> READY -> DELIVERING -> COMPLETED
      const transitions = ['PREPARING', 'READY', 'DELIVERING', 'COMPLETED'] as const;

      for (const nextStatus of transitions) {
        await db.transaction(async (tx) => {
          await tx.orm.public.RestaurantOrder.where({ id: order.id }).update({
            status: nextStatus,
          });

          await tx.orm.public.HQAuditEvent.create({
            actorPersonId: adminActor.id,
            action: 'MANAGED_ORDER_STATUS_CHANGED',
            targetType: 'RestaurantOrder',
            targetId: order.id,
            metadata: {
              previousStatus: order.status,
              newStatus: nextStatus,
            },
          });
        });

        const currentOrder = await db.orm.public.RestaurantOrder.where({ id: order.id }).all().first();
        assert.strictEqual(currentOrder?.status, nextStatus);
      }

      // Cleanup order
      await db.orm.public.RestaurantOrder.where({ id: order.id }).delete();
    });

    await t.test('4. HQ Proxy Community Posts on behalf of business', async () => {
      const post = await db.orm.public.Post.create({
        personId: adminActor.id,
        organizationId: testOrg.id,
        title: 'Sunday Brunch Special',
        content: 'Special Sunday Brunch Promo: 15% off all orders placed through CityOS!',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        category: 'PROMOTION',
      });

      assert.strictEqual(post.organizationId, testOrg.id);
      assert.strictEqual(post.personId, adminActor.id);

      const retrieved = await db.orm.public.Post.where({ id: post.id }).all().first();
      assert.ok(retrieved);
      assert.ok(retrieved.content.includes('Sunday Brunch'));

      // Cleanup post
      await db.orm.public.Post.where({ id: post.id }).delete();
    });
  } finally {
    try {
      const audits = await db.orm.public.HQAuditEvent.where({ actorPersonId: adminActor.id }).all();
      for (const a of audits) {
        await db.orm.public.HQAuditEvent.where({ id: a.id }).delete();
      }
    } catch (e) {
      console.error('HQAuditEvent cleanup err:', e);
    }
    try { await db.orm.public.DiscoveryListing.where({ id: testListing.id }).delete(); } catch (e) { console.error('DiscoveryListing cleanup err:', e); }
    try { await db.orm.public.Location.where({ id: testLocation.id }).delete(); } catch (e) { console.error('Location cleanup err:', e); }
    try { await db.orm.public.Organization.where({ id: testOrg.id }).delete(); } catch (e) { console.error('Organization cleanup err:', e); }
    try { await db.orm.public.Person.where({ id: adminActor.id }).delete(); } catch (e) { console.error('Person cleanup err:', e); }
  }
});
