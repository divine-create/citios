import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanInstagramCaption,
  resolveCalabarInstagramTargets,
  syncInstagramPostToCityOS,
} from './instagram-sync';
import { getCanonicalOrganization } from '../app/actions/org';
import { db } from '../src/prisma/db';

describe('Instagram Business Feed Sync Engine', () => {
  it('1. Cleans raw Instagram captions, strips hashtag blocks, and extracts Naira prices', () => {
    const raw = `Weekend Poolside Grill & Live Band at Axari Hotel! 🎶🔥
Join us this Friday from 7 PM for special grilled catfish and cocktails at ₦12,500 per platter.
Click the link in our bio to reserve a table.
.
.
#calabar #calabarbusiness #axarihotel #crossriver #explorepage #nigeria`;

    const cleaned = cleanInstagramCaption(raw, 'Axari Hotel & Suites', 'Announcement');
    assert.equal(cleaned.category, 'Events');
    assert.equal(cleaned.price, 12500);
    assert.ok(cleaned.title.includes('Weekend Poolside Grill'));
    assert.ok(!cleaned.content.includes('#calabarbusiness'), 'Should strip trailing hashtag spam');
    assert.ok(!cleaned.content.toLowerCase().includes('link in our bio'), 'Should strip link in bio boilerplate');
    assert.equal(cleaned.isLowSignal, false);
  });

  it('2. Infers Food and Marketplace categories accurately from caption text', () => {
    const foodCaption = cleanInstagramCaption(
      'Freshly prepared Afang Soup and pounded yam ready for lunch delivery! Order now for ₦4,500.',
      'Native Kitchen'
    );
    assert.equal(foodCaption.category, 'Food');
    assert.equal(foodCaption.price, 4500);

    const promoCaption = cleanInstagramCaption(
      'Mega weekend discount! 20% sale on all skincare items now in stock.',
      'MedPlus Pharmacy'
    );
    assert.equal(promoCaption.category, 'Marketplace');
  });

  it('3. Resolves Calabar Instagram targets and idempotently syncs post + permanent Asset', async () => {
    const targets = await resolveCalabarInstagramTargets('axari-hotel-calabar');
    assert.ok(targets.length > 0, 'Should resolve Axari Hotel Calabar target');
    const target = targets[0];
    assert.equal(target.instagramHandle, 'axarihotel');

    const testShortcode = `TEST_IG_${Date.now()}`;
    // 1x1 transparent PNG in base64
    const sampleBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    let createdPostId: string | undefined;
    try {
      const firstSync = await syncInstagramPostToCityOS(target, {
        shortcode: testShortcode,
        caption: 'Special Executive Suite Weekend Promo at Axari Hotel Calabar for ₦45,000! #calabar #hotels #promo #crs',
        imageBase64: sampleBase64,
        imageMimeType: 'image/png',
        instagramHandle: target.instagramHandle,
      });

      assert.equal(firstSync.action, 'created');
      assert.ok(firstSync.postId);
      createdPostId = firstSync.postId;

      // Second sync with same shortcode must deduplicate
      const secondSync = await syncInstagramPostToCityOS(target, {
        shortcode: testShortcode,
        caption: 'Duplicate check',
        instagramHandle: target.instagramHandle,
      });
      assert.equal(secondSync.action, 'skipped_duplicate');
      assert.equal(secondSync.postId, createdPostId);

      // Verify post appears in canonical organization profile postsData
      const orgProfile = await getCanonicalOrganization(target.organizationId);
      assert.ok(orgProfile);
      assert.ok(Array.isArray((orgProfile as any).postsData));
      const syncedInProfile = (orgProfile as any).postsData.find((p: any) => p.id === createdPostId);
      assert.ok(syncedInProfile, 'Synced Instagram post should appear in organization postsData');
      assert.ok(syncedInProfile.imageUrl?.startsWith('/api/assets/'), 'Image should be permanently hosted in Asset table');
    } finally {
      if (createdPostId) {
        const post = await db.orm.public.Post.where({ id: createdPostId }).first();
        if (post?.imageUrl?.startsWith('/api/assets/')) {
          const assetId = post.imageUrl.replace('/api/assets/', '');
          await db.orm.public.Asset.where({ id: assetId }).delete().catch(() => {});
        }
        await db.orm.public.Post.where({ id: createdPostId }).delete().catch(() => {});
      }
    }
  });
});
