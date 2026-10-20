import test from 'node:test';
import assert from 'node:assert';
import { fetchMyOrders } from '../app/actions/commerce';
import { getTwoLetterInitials, getAvatarGradient } from '../components/cityos/CityUI';

test('Profile Resilience & Unauthenticated Access Safeguards', async (t) => {
  await t.test('1. fetchMyOrders returns empty array when unauthenticated (never crashes with non-array)', async () => {
    // When no NextAuth session is present, fetchMyOrders must safely return []
    const orders = await fetchMyOrders();
    assert.ok(Array.isArray(orders), 'fetchMyOrders must always return an Array, never an error object');
    assert.strictEqual(orders.length, 0, 'Unauthenticated resident must have 0 orders');
  });

  await t.test('2. getTwoLetterInitials safely handles full names, single names, and nullish resident data', () => {
    assert.strictEqual(getTwoLetterInitials('John Doe'), 'JD');
    assert.strictEqual(getTwoLetterInitials('Resident'), 'RE');
    assert.strictEqual(getTwoLetterInitials(''), '9L');
    assert.strictEqual(getTwoLetterInitials(null), '9L');
    assert.strictEqual(getTwoLetterInitials(undefined), '9L');
  });

  await t.test('3. getAvatarGradient generates consistent Tailwind gradient for resident names', () => {
    const g1 = getAvatarGradient('Resident');
    const g2 = getAvatarGradient('Resident');
    assert.strictEqual(g1, g2);
    assert.ok(g1.startsWith('from-') && g1.includes('to-'));
  });
});
