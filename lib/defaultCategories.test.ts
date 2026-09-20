import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_RETAIL_CATEGORIES } from './defaultCategories';

describe('default retail categories', () => {
  it('includes 10 top-level categories', () => {
    assert.equal(DEFAULT_RETAIL_CATEGORIES.length, 10);
  });

  it('includes subcategories for each top-level category', () => {
    for (const category of DEFAULT_RETAIL_CATEGORIES) {
      assert.ok(Array.isArray(category.subcategories));
      assert.ok(category.subcategories.length > 0);
    }
  });
});
