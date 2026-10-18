import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeReviewBody,
  parseReviewBody,
  computeRatingDistribution,
} from './reviews';

describe('Review Serialization & Distribution Helpers', () => {
  it('parses legacy plain-text review body cleanly with empty photos and tags', () => {
    const parsed = parseReviewBody('Great service and friendly staff!');
    assert.equal(parsed.text, 'Great service and friendly staff!');
    assert.deepEqual(parsed.photos, []);
    assert.deepEqual(parsed.tags, []);
    assert.equal(parsed.isVerifiedCustomer, false);
    assert.equal(parsed.ownerReply, null);
  });

  it('serializes and parses review body with optional photo attachments, vibe tags, verified status, and owner reply', () => {
    const serialized = serializeReviewBody({
      text: 'Best Fisherman soup in Calabar!',
      photos: ['/uploads/soup1.jpg', '/uploads/soup2.jpg'],
      tags: ['Great Quality', 'Highly Recommended'],
      isVerifiedCustomer: true,
      ownerReply: {
        text: 'Thank you for dining with us!',
        repliedAt: '2026-10-18T10:00:00.000Z',
        authorName: 'Chef Bassey',
      },
    });

    const parsed = parseReviewBody(serialized);
    assert.equal(parsed.text, 'Best Fisherman soup in Calabar!');
    assert.deepEqual(parsed.photos, ['/uploads/soup1.jpg', '/uploads/soup2.jpg']);
    assert.deepEqual(parsed.tags, ['Great Quality', 'Highly Recommended']);
    assert.equal(parsed.isVerifiedCustomer, true);
    assert.deepEqual(parsed.ownerReply, {
      text: 'Thank you for dining with us!',
      repliedAt: '2026-10-18T10:00:00.000Z',
      authorName: 'Chef Bassey',
    });
  });

  it('omits delimiter when no metadata or photos are provided', () => {
    const serialized = serializeReviewBody({ text: 'Simple review without photos' });
    assert.equal(serialized, 'Simple review without photos');
  });

  it('computes 5-star rating distribution and average accurately', () => {
    const dist = computeRatingDistribution([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
      { rating: 3 },
    ]);
    assert.equal(dist.totalReviews, 5);
    assert.equal(dist.averageRating, 4.4);
    assert.deepEqual(dist.counts, {
      1: 0,
      2: 0,
      3: 1,
      4: 1,
      5: 3,
    });
  });
});
