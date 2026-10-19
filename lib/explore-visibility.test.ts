import { test } from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { getResidentOrganization } from '../app/actions/org';

test('Discovery Visibility & Tenant Isolation', async (t) => {
  await t.test('1. Non-existent identifier returns null', async () => {
    const notFound = await getResidentOrganization('non-existent-slug-xyz-12345');
    assert.strictEqual(notFound, null, 'Should return null for non-existent listing');
  });

  await t.test('2. Authentic active service organization resolves for public resident view', async () => {
    const resolved = await getResidentOrganization('service-centelleo-calabar');
    assert.ok(resolved, 'Should resolve authentic service organization');
    assert.strictEqual(resolved?.orgId, 'service-centelleo-calabar');
    assert.strictEqual(resolved?.isManager, false);
  });
});

