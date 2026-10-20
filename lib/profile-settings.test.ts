import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { updateFullProfile } from './actions/profile';
import { normalizePhoneNumber } from './identity';
import { getTwoLetterInitials, getAvatarGradient } from '../components/cityos/CityUI';

test('User Profile Settings & Identity Normalization Suite', async (t) => {
  await t.test('1. normalizePhoneNumber handles Nigerian local, international, and edge cases', () => {
    assert.strictEqual(normalizePhoneNumber('08012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('2348012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('+2348012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('0801 234 5678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('0801-234-5678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('123'), null);
    assert.strictEqual(normalizePhoneNumber(''), null);
    assert.strictEqual(normalizePhoneNumber(null), null);
    assert.strictEqual(normalizePhoneNumber(undefined), null);
  });

  await t.test('2. getTwoLetterInitials and getAvatarGradient provide resilient badge values', () => {
    assert.strictEqual(getTwoLetterInitials('Adaobi Eze'), 'AE');
    assert.strictEqual(getTwoLetterInitials('Resident'), 'RE');
    assert.strictEqual(getTwoLetterInitials(''), '9L');
    assert.strictEqual(getTwoLetterInitials('   '), '9L');

    const grad = getAvatarGradient('Adaobi Eze');
    assert.ok(grad.startsWith('from-') && grad.includes('to-'));
  });

  await t.test('3. updateFullProfile enforces authentication guard', async () => {
    const res = await updateFullProfile({
      firstName: 'Test',
      lastName: 'User',
      phone: '08012345678',
    });

    // Without active NextAuth session mock, returns 'Not authenticated'
    assert.strictEqual(res.error, 'Not authenticated');
  });
});
