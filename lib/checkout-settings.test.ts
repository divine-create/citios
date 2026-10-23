import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutConfig } from './actions/checkout-settings';

test('Platform Checkout Settings Contract Suite', async (t) => {
  await t.test('1. getCheckoutConfig returns default platform config gracefully', async () => {
    const config = await getCheckoutConfig();
    assert.ok(config, 'Config should not be null');
    assert.equal(typeof config.enableWhatsApp, 'boolean');
    assert.equal(typeof config.enableWallet, 'boolean');
    assert.equal(typeof config.enableCard, 'boolean');
    assert.equal(typeof config.enableTransfer, 'boolean');
    assert.ok(
      config.defaultMethod === 'whatsapp' ||
      config.defaultMethod === 'wallet' ||
      config.defaultMethod === 'card' ||
      config.defaultMethod === 'transfer',
      'Default method should be valid'
    );
    assert.equal(typeof config.deliveryBaseFee, 'number');
    assert.ok(config.deliveryBaseFee! >= 0, 'deliveryBaseFee should be non-negative');
    assert.equal(typeof config.deliveryBaseDistanceKm, 'number');
    assert.ok(config.deliveryBaseDistanceKm! > 0, 'deliveryBaseDistanceKm should be positive');
    assert.equal(typeof config.deliveryPerKmRate, 'number');
    assert.ok(config.deliveryPerKmRate! >= 0, 'deliveryPerKmRate should be non-negative');
  });
});
