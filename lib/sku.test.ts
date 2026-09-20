import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generateSku, generateUniqueSku } from './sku';

describe('shopos sku generation', () => {
  it('creates a generated SKU with the expected prefix shape', () => {
    const sku = generateSku();
    assert.match(sku, /^SKU-[A-Z0-9-]+$/);
  });

  it('avoids collisions with existing SKUs', () => {
    const existing = ['SKU-TEST-1'];
    const sku = generateUniqueSku(existing, 'SKU-TEST');
    assert.match(sku, /^SKU-TEST-/);
    assert.ok(!existing.includes(sku));
  });
});
