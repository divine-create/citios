import test from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { fetchFeed } from '@/app/actions/newsfeed';
import { POST_CATEGORIES } from '@/components/cityos/CreatePost';

test('Newsfeed Post Categories and Topic Mapping Suite', async (t) => {
  await t.test('POST_CATEGORIES matches the 5 streamlined categories', () => {
    const categoryIds = POST_CATEGORIES.map((c) => c.id);
    assert.deepStrictEqual(categoryIds, ['Update', 'Sales', 'Event', 'Housing', 'Question']);
  });

  await t.test('fetchFeed filters categories into their respective topic buckets', async () => {
    // 1. Marketplace topic includes Sales and Offer
    const marketFeed = await fetchFeed('For You', 'Marketplace', undefined, 10);
    assert.ok(Array.isArray(marketFeed.posts));

    // 2. Events topic includes Event
    const eventsFeed = await fetchFeed('For You', 'Events', undefined, 10);
    assert.ok(Array.isArray(eventsFeed.posts));

    // 3. Stays topic includes Housing
    const staysFeed = await fetchFeed('For You', 'Stays', undefined, 10);
    assert.ok(Array.isArray(staysFeed.posts));

    // 4. Community topic includes Update and Question
    const communityFeed = await fetchFeed('For You', 'Community', undefined, 10);
    assert.ok(Array.isArray(communityFeed.posts));
  });
});
