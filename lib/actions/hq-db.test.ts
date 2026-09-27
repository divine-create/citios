import { test } from 'node:test';
import * as assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { randomUUID } from 'crypto';

test('HQ Schema & Audit DB constraints', async () => {
  const actor = await db.orm.public.Person.create({
    firstName: 'Test',
    lastName: 'Admin'
  });

  const org = await db.orm.public.Organization.create({
    name: 'HQ Test Org',
    type: 'RESTAURANT',
  });

  try {
    assert.strictEqual(org.status, 'ACTIVE');

    // Suspend
    await db.transaction(async (tx) => {
      await tx.orm.public.Organization.where({ id: org.id }).update({ status: 'SUSPENDED' });
      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: actor.id,
        action: 'ORGANIZATION_SUSPENDED',
        targetType: 'Organization',
        targetId: org.id,
        metadata: { previousStatus: org.status }
      });
    });

    const suspendedOrg = await db.orm.public.Organization.where({ id: org.id }).all().first();
    assert.strictEqual(suspendedOrg?.status, 'SUSPENDED');

    // Check Audit
    const audits = await db.orm.public.HQAuditEvent.where({ targetId: org.id }).all();
    assert.strictEqual(audits.length, 1);
    assert.strictEqual(audits[0].action, 'ORGANIZATION_SUSPENDED');
  } finally {
    // Cleanup
    await db.orm.public.HQAuditEvent.where({ targetId: org.id }).delete();
    await db.orm.public.Organization.where({ id: org.id }).delete();
    await db.orm.public.Person.where({ id: actor.id }).delete();
  }
});
