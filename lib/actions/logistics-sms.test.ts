import { test } from 'node:test';
import assert from 'node:assert';
import { maskPhone, normalizeNigerianPhone, dispatchDeliveryOtp } from './logistics-sms';

test('Logistics SMS — Phone Normalization & Masking', async (t) => {
  await t.test('1. Masks phone correctly', () => {
    assert.strictEqual(maskPhone('08031234567'), '0803123***4567');
    assert.strictEqual(maskPhone('+2348031234567'), '+234803***4567');
    assert.strictEqual(maskPhone(null), 'Unknown');
    assert.strictEqual(maskPhone('123'), '***');
  });

  await t.test('2. Normalizes Nigerian phone formats', () => {
    assert.strictEqual(normalizeNigerianPhone('08031234567'), '2348031234567');
    assert.strictEqual(normalizeNigerianPhone('+2348031234567'), '2348031234567');
    assert.strictEqual(normalizeNigerianPhone('2348031234567'), '2348031234567');
    assert.strictEqual(normalizeNigerianPhone('0803-123-4567'), '2348031234567');
  });

  await t.test('3. Test mode safely defaults to SMS_MOCK', async () => {
    const res = await dispatchDeliveryOtp({
      deliveryJobId: 'dummy-job-id',
      providerId: 'dummy-provider-id',
      rawOtp: '123456',
      trackingReference: 'CD-CAL-TEST-01',
      recipientPhone: '08031234567',
    });

    assert.strictEqual(res.dispatched, true);
    assert.strictEqual(res.channel, 'SMS_MOCK');
  });
});
