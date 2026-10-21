import test from 'node:test';
import assert from 'node:assert';
import { fetchFeed } from '../app/actions/newsfeed';

test('CityOS Newsfeed Fixes Verification', async (t) => {
  await t.test('1. fetchFeed pagination preserves nextCursor across test org filtering', async () => {
    const res = await fetchFeed('For You', 'All', undefined, 15);
    assert.ok(res.posts.length > 0, 'Feed should return valid posts');
    // Because the DB has 600 posts, hasMore is true and nextCursor should not be null
    assert.ok(res.nextCursor != null, 'nextCursor must be preserved even if some test org posts were filtered out');
    assert.ok(typeof res.nextCursor === 'string', 'nextCursor must be a valid cursor string');

    // Fetch next page with that cursor
    const page2 = await fetchFeed('For You', 'All', res.nextCursor, 15);
    assert.ok(page2.posts.length > 0, 'Page 2 should return posts using nextCursor');
    
    // Ensure no overlapping IDs between page 1 and page 2
    const page1Ids = new Set(res.posts.map((p: any) => p.id));
    const overlap = page2.posts.filter((p: any) => page1Ids.has(p.id));
    assert.strictEqual(overlap.length, 0, 'Page 2 items must not overlap with Page 1');
  });

  await t.test('2. fetchFeed handles Following tab gracefully when user follows no organizations', async () => {
    const res = await fetchFeed('Following', 'All', undefined, 15);
    assert.strictEqual(Array.isArray(res.posts), true, 'Posts should be an array');
    assert.strictEqual(res.posts.length, 0, 'Guest / unfollowing user should receive 0 following posts');
    assert.strictEqual(res.nextCursor, null, 'nextCursor must be null for empty following feed');
  });

  await t.test('3. Multi-page pagination traverses through identical timestamps without truncation', async () => {
    // Tests through page 5 (150 rows) to ensure identical timestamps from batch seeding do not abort feed
    let cursor: string | undefined = undefined;
    const allSeenIds = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const page = await fetchFeed('For You', 'All', cursor, 30);
      assert.ok(page.posts.length > 0, `Page ${i + 1} should return posts`);
      for (const p of page.posts) {
        assert.ok(!allSeenIds.has(p.id), `Duplicate post id detected: ${p.id}`);
        allSeenIds.add(p.id);
      }
      assert.ok(page.nextCursor != null, `Page ${i + 1} should have nextCursor`);
      cursor = page.nextCursor;
    }
    assert.ok(allSeenIds.size >= 120, 'Should have retrieved over 120 unique posts across 5 pages');
  });
});
