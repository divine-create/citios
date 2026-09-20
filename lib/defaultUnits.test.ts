import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_RETAIL_UNITS } from './defaultUnits';

describe('default retail units', () => {
  it('includes a default unit list for products', () => {
    assert.ok(DEFAULT_RETAIL_UNITS.length > 0);
    assert.ok(DEFAULT_RETAIL_UNITS.includes('ea'));
    assert.ok(DEFAULT_RETAIL_UNITS.includes('pcs'));
    assert.ok(DEFAULT_RETAIL_UNITS.includes('kg'));
  });
});
