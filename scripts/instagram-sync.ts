import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { db } from '../src/prisma/db';
import {
  resolveCalabarInstagramTargets,
  syncInstagramPostToCityOS,
  cleanInstagramCaption,
  type RawInstagramPostInput,
} from '../lib/instagram-sync';

const AUTH_DIR = path.resolve(process.cwd(), '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'instagram-profile');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    target?: string;
    org?: string;
    handle?: string;
    limit: number;
    dryRun: boolean;
    headed: boolean;
  } = {
    limit: 2,
    dryRun: false,
    headed: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--headed') opts.headed = true;
    else if (arg.startsWith('--target=')) opts.target = arg.split('=')[1];
    else if (arg.startsWith('--org=')) opts.org = arg.split('=')[1];
    else if (arg.startsWith('--handle=')) opts.handle = arg.split('=')[1]?.replace(/^@/, '');
    else if (arg.startsWith('--limit=')) {
      const n = Number(arg.split('=')[1]);
      if (!Number.isNaN(n) && n > 0 && n <= 12) opts.limit = n;
    }
  }
  return opts;
}

function extractEdgesFromGraphqlJson(json: any, handle: string): RawInstagramPostInput[] {
  const results: RawInstagramPostInput[] = [];
  try {
    // 1. web_profile_info format: data.user.edge_owner_to_timeline_media.edges
    const timelineEdges =
      json?.data?.user?.edge_owner_to_timeline_media?.edges ||
      json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges ||
      [];

    for (const edge of timelineEdges) {
      const node = edge?.node || edge;
      const shortcode = node?.shortcode || node?.code;
      if (!shortcode) continue;

      const caption =
        node?.edge_media_to_caption?.edges?.[0]?.node?.text ||
        node?.caption?.text ||
        node?.accessibility_caption ||
        '';
      const displayUrl =
        node?.display_url ||
        node?.image_versions2?.candidates?.[0]?.url ||
        node?.thumbnail_src ||
        null;
      const ts = node?.taken_at_timestamp || node?.taken_at;
      const timestampIso = ts ? new Date(Number(ts) * 1000).toISOString() : null;

      results.push({
        shortcode,
        caption,
        fallbackImageUrl: displayUrl,
        permalink: `https://www.instagram.com/p/${shortcode}/`,
        timestampIso,
        instagramHandle: handle,
      });
    }
  } catch {}
  return results;
}

async function main() {
  const opts = parseArgs();

  console.log('=============================================================');
  console.log('🔄 9jaLive — Calabar Instagram Business Feed Sync');
  console.log('=============================================================');

  let targets = await resolveCalabarInstagramTargets(opts.target);

  // Support ad-hoc --org=<slug> --handle=<ig_handle> and persist handle to DiscoveryListing metadata
  if (opts.org && opts.handle) {
    let listing = await db.orm.public.DiscoveryListing.where({ slug: opts.org }).first();
    if (!listing) {
      listing = await db.orm.public.DiscoveryListing.where({ organizationId: opts.org }).first();
    }
    const orgId = listing?.organizationId || opts.org;
    const org = await db.orm.public.Organization.where({ id: orgId }).first();
    if (!org) {
      console.error(`❌ Organization "${opts.org}" not found in database.`);
      process.exit(1);
    }

    if (listing && !opts.dryRun) {
      let meta: any = {};
      try {
        if (listing.metadata) meta = JSON.parse(listing.metadata);
      } catch {}
      meta.instagram = opts.handle;
      await db.orm.public.DiscoveryListing.where({ id: listing.id }).update({
        metadata: JSON.stringify(meta),
      });
      console.log(`📌 Linked @${opts.handle} to ${org.name} (${listing.slug})`);
    }

    targets = [
      {
        organizationId: org.id,
        slug: listing?.slug || org.id,
        name: org.name,
        instagramHandle: opts.handle,
        defaultCategory: 'Announcement',
        address: org.address || 'Calabar',
      },
    ];
  }

  if (targets.length === 0) {
    console.log('⚠️ No matching Calabar Instagram business targets found.');
    process.exit(0);
  }

  console.log(`📋 Target businesses to check: ${targets.length} (limit: ${opts.limit} posts/business)`);
  if (!fs.existsSync(PROFILE_DIR)) {
    console.log('ℹ️ Tip: Run "npm run social:login" first if Instagram asks for login authentication.\n');
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: !opts.headed,
    viewport: { width: 1280, height: 840 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());
  let totalCreated = 0;
  let totalDuplicates = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    console.log(`\n[${i + 1}/${targets.length}] 🔍 Checking @${target.instagramHandle} (${target.name})...`);

    const interceptedPosts: RawInstagramPostInput[] = [];
    const responseHandler = async (res: any) => {
      const url = res.url();
      if (
        url.includes('web_profile_info') ||
        url.includes('graphql/query') ||
        url.includes('/api/v1/feed/user/')
      ) {
        try {
          const json = await res.json();
          const extracted = extractEdgesFromGraphqlJson(json, target.instagramHandle);
          if (extracted.length > 0) {
            interceptedPosts.push(...extracted);
          }
        } catch {}
      }
    };

    page.on('response', responseHandler);

    try {
      await page.goto(`https://www.instagram.com/${target.instagramHandle}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait 4s for profile grid & XHR calls to settle
      await page.waitForTimeout(4000);

      // Dismiss login modal overlay if browsing unauthenticated
      try {
        const closeBtn = page.locator('svg[aria-label="Close"]').first();
        if (await closeBtn.isVisible({ timeout: 1000 })) {
          await closeBtn.click();
        }
      } catch {}

      let postsToProcess = interceptedPosts.slice(0, opts.limit);

      // Fallback to DOM extraction if GraphQL XHR was not intercepted
      if (postsToProcess.length === 0) {
        const domPosts = await page.evaluate((limitCount) => {
          const anchors = Array.from(
            document.querySelectorAll<HTMLAnchorElement>('a[href*="/p/"], a[href*="/reel/"]')
          );
          const seen = new Set<string>();
          const items: { shortcode: string; caption: string; imageUrl: string | null; permalink: string }[] = [];

          for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            const match = href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
            if (!match || !match[1]) continue;
            const shortcode = match[1];
            if (seen.has(shortcode)) continue;
            seen.add(shortcode);

            const img = a.querySelector('img');
            const caption = img?.getAttribute('alt') || '';
            const imageUrl = img?.getAttribute('src') || null;

            items.push({
              shortcode,
              caption,
              imageUrl,
              permalink: `https://www.instagram.com/p/${shortcode}/`,
            });
            if (items.length >= limitCount) break;
          }
          return items;
        }, opts.limit);

        postsToProcess = domPosts.map((d) => ({
          shortcode: d.shortcode,
          caption: d.caption,
          fallbackImageUrl: d.imageUrl,
          permalink: d.permalink,
          instagramHandle: target.instagramHandle,
        }));
      }

      console.log(`   Found ${postsToProcess.length} recent post(s) on @${target.instagramHandle}`);

      for (const rawPost of postsToProcess) {
        // Download image bytes so it is permanently hosted in 9jaLive Asset table
        if (rawPost.fallbackImageUrl && !opts.dryRun) {
          try {
            const imgResp = await context.request.get(rawPost.fallbackImageUrl, { timeout: 15000 });
            if (imgResp.ok()) {
              const buffer = await imgResp.body();
              rawPost.imageBase64 = buffer.toString('base64');
              rawPost.imageMimeType = imgResp.headers()['content-type'] || 'image/jpeg';
            }
          } catch (imgErr) {
            console.warn(`   ⚠️ Could not download image buffer for ${rawPost.shortcode}, using fallback URL.`);
          }
        }

        if (opts.dryRun) {
          const preview = cleanInstagramCaption(rawPost.caption, target.name, target.defaultCategory);
          console.log(`   [DRY-RUN] Post ${rawPost.shortcode}:`);
          console.log(`     Title:    ${preview.title}`);
          console.log(`     Category: ${preview.category}`);
          console.log(`     Content:  ${preview.content.slice(0, 120)}...`);
          continue;
        }

        const res = await syncInstagramPostToCityOS(target, rawPost);
        if (res.action === 'created') {
          totalCreated++;
          console.log(`   ✅ Published post ${rawPost.shortcode} -> 9jaLive Post ID: ${res.postId}`);
        } else if (res.action === 'skipped_duplicate') {
          totalDuplicates++;
          console.log(`   ⏭️ Skipped ${rawPost.shortcode} (already on 9jaLive)`);
        } else {
          console.log(`   ⏭️ Skipped ${rawPost.shortcode} (low signal / empty)`);
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Error syncing @${target.instagramHandle}:`, err?.message || err);
    } finally {
      page.off('response', responseHandler);
    }

    // Human-like random pause (4.5s - 7.5s) before next business
    if (i < targets.length - 1) {
      const delayMs = 4500 + Math.floor(Math.random() * 3000);
      await page.waitForTimeout(delayMs);
    }
  }

  await context.close();
  console.log('\n=============================================================');
  console.log(`🎉 Sync Complete! Created: ${totalCreated} new post(s), Skipped duplicates: ${totalDuplicates}`);
  console.log('=============================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in instagram-sync:', err);
  process.exit(1);
});
