import test from 'node:test';
import assert from 'node:assert';
import { assertIsolatedTestDatabase } from './test-database-guard';

test('Fail-Closed Database Guard Verification Suite', async (t) => {
  await t.test('1. Positively rejects production Supabase pooler URL', async () => {
    const prodUrl = 'postgresql://postgres.xxx:secret@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    await assert.rejects(
      async () => {
        await assertIsolatedTestDatabase(prodUrl);
      },
      /FATAL SAFETY VIOLATION: DATABASE_URL points to prohibited remote\/production host/
    );
  });

  await t.test('2. Rejects fake remote host even if database name contains "test"', async () => {
    const fakeRemoteUrl = 'postgresql://user:secret@database.mycompany.aws.com:5432/cityos_test';
    await assert.rejects(
      async () => {
        await assertIsolatedTestDatabase(fakeRemoteUrl);
      },
      /prohibited remote\/production host/
    );
  });

  await t.test('3. Rejects local URL if database name is not "cityos_test"', async () => {
    const wrongDbUrl = 'postgresql://testuser:testpassword@127.0.0.1:5432/production_copy';
    await assert.rejects(
      async () => {
        await assertIsolatedTestDatabase(wrongDbUrl);
      },
      /Database name "production_copy" is not the isolated test database "cityos_test"/
    );
  });

  await t.test('4. Positively accepts verified local isolated test database', async () => {
    const validTestUrl = 'postgresql://testuser:testpassword@127.0.0.1:5432/cityos_test';
    const result = await assertIsolatedTestDatabase(validTestUrl);
    assert.strictEqual(result.isIsolatedTestDatabase, true);
    assert.strictEqual(result.currentDatabase, 'cityos_test');
    assert.strictEqual(result.currentUser, 'testuser');
    assert.strictEqual(result.host, '127.0.0.1');
    assert.strictEqual(result.port, 5432);
  });
});
