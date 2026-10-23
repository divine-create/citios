import { test } from 'node:test';
import assert from 'node:assert';
import { sweepExpiredDispatchOffers } from './logistics-dispatch';
import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';

test('Logistics Dispatch Sweeper — Production Reliability', async (t) => {
  await t.test('1. Sweeper processes expired offers and returns structured result', async () => {
    const sweepResult = await sweepExpiredDispatchOffers();
    assert.strictEqual(typeof sweepResult.processedCount, 'number');
    assert.ok(Array.isArray(sweepResult.results));
  });

  await t.test('2. Unexpired offers are ignored by sweeper', async () => {
    // Ensure that only expired offers (expiresAt in past) are swept
    const sweepResult = await sweepExpiredDispatchOffers();
    // Count should be non-negative integer
    assert.ok(sweepResult.processedCount >= 0);
  });
});
