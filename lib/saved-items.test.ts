import test from 'node:test';
import assert from 'node:assert';
import { SAVED_ENTITY_TYPES, isSavedEntityType, savedKey } from './saved-items';

test('saved-items: entity type whitelist', async (t) => {
  await t.test('accepts every canonical type', () => {
    for (const type of SAVED_ENTITY_TYPES) assert.strictEqual(isSavedEntityType(type), true);
  });

  await t.test('rejects legacy uppercase kinds that /saved can never display', () => {
    for (const legacy of ['PRODUCT', 'RESTAURANT', 'HOTEL', 'SCHOOL', 'JOB', 'EVENT']) {
      assert.strictEqual(isSavedEntityType(legacy), false, legacy);
    }
  });

  await t.test('rejects the service-likes namespace and arbitrary input', () => {
    assert.strictEqual(isSavedEntityType('service_org'), false);
    assert.strictEqual(isSavedEntityType(''), false);
    assert.strictEqual(isSavedEntityType('__proto__'), false);
  });

  await t.test('savedKey is stable and type-scoped', () => {
    assert.strictEqual(savedKey('job', 'abc'), 'job:abc');
    assert.notStrictEqual(savedKey('job', 'abc'), savedKey('event', 'abc'));
  });
});
