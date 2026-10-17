import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VERTICALS_CONFIG,
  VERTICAL_DEFINITIONS,
  getVerticalsConfig,
  saveVerticalsConfig,
  VerticalId,
} from './actions/verticals-config';

test('HQ Verticals Master Switch & Governance Suite', async (t) => {
  await t.test('1. Exactly 6 core verticals are defined and defaulted to true', () => {
    const requiredVerticals: VerticalId[] = ['jobs', 'houses', 'shops', 'food', 'services', 'events'];
    assert.equal(Object.keys(DEFAULT_VERTICALS_CONFIG).length, 6, 'Should have exactly 6 core verticals');

    for (const v of requiredVerticals) {
      assert.equal(DEFAULT_VERTICALS_CONFIG[v], true, `Vertical ${v} should be enabled by default`);
      assert.ok(VERTICAL_DEFINITIONS[v], `Vertical ${v} should have a valid definition`);
      assert.ok(VERTICAL_DEFINITIONS[v].path.startsWith('/'), `Path for ${v} should be a valid root route`);
      assert.ok(VERTICAL_DEFINITIONS[v].name, `Vertical ${v} should have a display name`);
    }
  });

  await t.test('2. getVerticalsConfig safely returns valid config with all 6 keys', async () => {
    const config = await getVerticalsConfig();
    assert.ok(config, 'Config should be resolved');
    assert.equal(typeof config.jobs, 'boolean', 'jobs should be boolean');
    assert.equal(typeof config.houses, 'boolean', 'houses should be boolean');
    assert.equal(typeof config.shops, 'boolean', 'shops should be boolean');
    assert.equal(typeof config.food, 'boolean', 'food should be boolean');
    assert.equal(typeof config.services, 'boolean', 'services should be boolean');
    assert.equal(typeof config.events, 'boolean', 'events should be boolean');
  });

  await t.test('3. saveVerticalsConfig enforces system admin access boundary', async () => {
    // Unauthenticated/anonymous callers must be rejected
    await assert.rejects(
      async () => {
        await saveVerticalsConfig({ jobs: false });
      },
      (err: any) => {
        return err.message.includes('NEXT_REDIRECT') ||
          err.message.includes('Unauthorized') ||
          err.message.includes('headers') ||
          err.message.includes('Forbidden');
      },
      'Unauthenticated call to saveVerticalsConfig must throw/reject',
    );
  });
});
