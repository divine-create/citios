import { test } from 'node:test';
import assert from 'node:assert';
import { assertStagingDatabase } from './staging-database-guard';

test('Staging Database Guard — Security & Anti-Fallback Verification', async (t) => {
  await t.test('1. Rejects missing or empty DATABASE_URL', async () => {
    await assert.rejects(
      async () => {
        await assertStagingDatabase('');
      },
      {
        message: /FAIL-CLOSED STAGING GUARD: DATABASE_URL is not set/,
      }
    );
  });

  await t.test('2. Rejects malformed connection string', async () => {
    await assert.rejects(
      async () => {
        await assertStagingDatabase('not-a-valid-url');
      },
      {
        message: /FAIL-CLOSED STAGING GUARD: Invalid DATABASE_URL/,
      }
    );
  });

  await t.test('3. Strictly rejects production Supabase pooler host', async () => {
    const prodUrl = 'postgresql://postgres.example:secret@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
    await assert.rejects(
      async () => {
        await assertStagingDatabase(prodUrl);
      },
      {
        message: /FATAL STAGING VIOLATION: DATABASE_URL points to shared production host/,
      }
    );
  });

  await t.test('4. Rejects cityos_test when APP_ENV=staging is set', async () => {
    const originalAppEnv = process.env.APP_ENV;
    try {
      process.env.APP_ENV = 'staging';
      const testDbUrl = 'postgresql://testuser:testpassword@127.0.0.1:5432/cityos_test';
      await assert.rejects(
        async () => {
          await assertStagingDatabase(testDbUrl);
        },
        {
          message: /FATAL STAGING VIOLATION: Hosted staging cannot run against local test database "cityos_test"/,
        }
      );
    } finally {
      process.env.APP_ENV = originalAppEnv;
    }
  });

  await t.test('5. Successfully verifies active database connection properties', async () => {
    // When connecting to our running isolated database (not in APP_ENV=staging)
    const testDbUrl = 'postgresql://testuser:testpassword@127.0.0.1:5432/cityos_test';
    const identity = await assertStagingDatabase(testDbUrl);

    assert.strictEqual(identity.currentDatabase, 'cityos_test');
    assert.strictEqual(identity.currentUser, 'testuser');
    assert.strictEqual(identity.host, '127.0.0.1');
    assert.strictEqual(identity.port, 5432);
    assert.strictEqual(identity.isStagingDatabase, true);
  });

  await t.test('6. Fails closed when connection cannot be established', async () => {
    const unreachableUrl = 'postgresql://testuser:testpassword@127.0.0.1:54329/nonexistent_db';
    await assert.rejects(
      async () => {
        await assertStagingDatabase(unreachableUrl);
      },
      {
        message: /FAIL-CLOSED STAGING GUARD: Verification failed/,
      }
    );
  });
});
