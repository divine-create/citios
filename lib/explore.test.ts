import { test } from 'node:test';
import assert from 'node:assert';
import { searchCityExplore } from '../app/actions/explore';

test('Explore search fetches and filters using DiscoveryListing', async () => {
  const result = await searchCityExplore('calabar', 'test', 'All');
  assert.ok(result);
  assert.ok(Array.isArray(result.organizations));
});
