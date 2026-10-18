import test from 'node:test';
import assert from 'node:assert';
import { fetchFeed } from '../app/actions/newsfeed';

test('CityOS Newsfeed Reality Verification', async (t) => {
  await t.test('1. fetchFeed returns populated posts for "For You" with topic "All"', async () => {
    const res = await fetchFeed('For You', 'All', undefined, 15);
    assert.ok(res.posts.length > 0, 'Feed should return populated posts');
    assert.ok(res.posts.length <= 15, 'Post count should not exceed limit');

    const firstPost = res.posts[0];
    assert.ok(firstPost.id, 'Post has an id');
    assert.ok(firstPost.title, 'Post has a title');
    assert.ok(firstPost.category, 'Post has a category');
    assert.ok(firstPost.time, 'Post has an ISO formatted timestamp string');
    assert.doesNotThrow(() => new Date(firstPost.time), 'Timestamp is valid ISO string');
  });

  await t.test('2. Topic filters return strictly matching categories', async () => {
    const food = await fetchFeed('For You', 'Food');
    assert.ok(food.posts.length > 0, 'Food topic should return posts');
    assert.ok(food.posts.every((p: any) => ['Food', 'Restaurant', 'FOOD'].includes(p.category)));

    const events = await fetchFeed('For You', 'Events');
    assert.ok(events.posts.length > 0, 'Events topic should return posts');
    assert.ok(events.posts.every((p: any) => ['Events', 'Event', 'EVENT'].includes(p.category)));

    const stays = await fetchFeed('For You', 'Stays');
    assert.ok(stays.posts.length > 0, 'Stays topic should return posts');
    assert.ok(stays.posts.every((p: any) => ['Stays', 'Housing', 'Hotel', 'STAY'].includes(p.category)));

    const jobs = await fetchFeed('For You', 'Jobs');
    assert.ok(jobs.posts.length > 0, 'Jobs topic should return posts');
    assert.ok(jobs.posts.every((p: any) => ['Jobs', 'Careers', 'JOB'].includes(p.category)));

    const marketplace = await fetchFeed('For You', 'Marketplace');
    assert.ok(marketplace.posts.length > 0, 'Marketplace topic should return posts');
    assert.ok(marketplace.posts.every((p: any) => ['Offer', 'Marketplace', 'RETAIL', 'Shops'].includes(p.category)));
  });

  await t.test('3. Cursor-based pagination traverses feed without duplication', async () => {
    const page1 = await fetchFeed('For You', 'Events', undefined, 10);
    assert.strictEqual(page1.posts.length, 10, 'Page 1 should have 10 events');
    assert.ok(page1.nextCursor, 'Page 1 should have a nextCursor');

    const page2 = await fetchFeed('For You', 'Events', page1.nextCursor, 10);
    assert.ok(page2.posts.length > 0, 'Page 2 should return the remainder');

    const page1Ids = new Set(page1.posts.map((p: any) => p.id));
    const overlap = page2.posts.filter((p: any) => page1Ids.has(p.id));
    assert.strictEqual(overlap.length, 0, 'Page 2 items must not overlap with Page 1');
  });

  await t.test('4. Posts have valid interactive direct item links (href)', async () => {
    const feed = await fetchFeed('For You', 'All', undefined, 20);
    const withLinks = feed.posts.filter((p: any) => p.href != null);
    assert.ok(withLinks.length > 0, 'At least some feed posts should have interactive href links');
    for (const post of withLinks) {
      assert.ok(post.href.url.startsWith('/'), `Href url must be a valid internal path: ${post.href.url}`);
      assert.ok(post.href.label, 'Href must have a user-facing label');
    }

    // Specific direct item route tests
    const food = await fetchFeed('For You', 'Food');
    const dishPost = food.posts.find((p: any) => p.href != null);
    assert.ok(dishPost, 'Food post should have direct item link');
    assert.ok(dishPost.href.url.startsWith('/food/item/'), `Dish link must point to /food/item/: ${dishPost.href.url}`);

    const market = await fetchFeed('For You', 'Marketplace');
    const prodPost = market.posts.find((p: any) => p.href?.url.startsWith('/product/'));
    assert.ok(prodPost, 'Marketplace post should have direct product link');

    const events = await fetchFeed('For You', 'Events');
    const eventPost = events.posts.find((p: any) => p.href?.url.startsWith('/events/'));
    assert.ok(eventPost, 'Event post should have direct event link');

    const jobs = await fetchFeed('For You', 'Jobs');
    const jobPost = jobs.posts.find((p: any) => p.href?.url.startsWith('/jobs/'));
    assert.ok(jobPost, 'Job post should have direct job link');
  });
});
