/**
 * Diagnostic test — runs Test 1 instrumented to log every error.
 */
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { db } from './src/prisma/db.ts';
import { assignDelivery, createDeliveryJob, LogisticsDomainError } from './lib/actions/logistics-domain.ts';

async function run() {
  const uid = (p: string) => `${p}_${uuidv4().substring(0, 8)}`;

  const prov = await db.orm.public.Organization.create({ name: 'DiagProvider', type: 'LOGISTICS' });
  const p1   = await db.orm.public.Person.create({ firstName: 'D1', lastName: 'T' });
  const p2   = await db.orm.public.Person.create({ firstName: 'D2', lastName: 'T' });
  const d1   = await db.orm.public.LogisticsDriverProfile.create({ providerId: prov.id, personId: p1.id });
  const d2   = await db.orm.public.LogisticsDriverProfile.create({ providerId: prov.id, personId: p2.id });
  const job  = await createDeliveryJob({
    providerId: prov.id, sourceType: 'RETAIL_ORDER', sourceId: 'diag-1',
    idempotencyKey: uid('k'), dropoffAddress: '1 Diag St',
  });

  console.log('Setup complete. Job:', job.id, 'D1:', d1.id, 'D2:', d2.id);

  const r1 = assignDelivery({ deliveryJobId: job.id, driverProfileId: d1.id, providerId: prov.id })
    .then(r => { console.log('R1 SUCCESS:', r.id); return { ok: r }; })
    .catch(e => { console.log('R1 FAIL:', e.constructor.name, '|', e.code, '|', e.cause?.code, '|', e.message?.substring(0, 200)); return { err: e }; });

  const r2 = assignDelivery({ deliveryJobId: job.id, driverProfileId: d2.id, providerId: prov.id })
    .then(r => { console.log('R2 SUCCESS:', r.id); return { ok: r }; })
    .catch(e => { console.log('R2 FAIL:', e.constructor.name, '|', e.code, '|', e.cause?.code, '|', e.message?.substring(0, 200)); return { err: e }; });

  const [res1, res2] = await Promise.all([r1, r2]);
  
  const assignments = await db.orm.public.DeliveryAssignment
    .where({ deliveryJobId: job.id, status: { in: ['PENDING', 'ACCEPTED'] } })
    .all();
  console.log('Active assignments in DB:', assignments.length);

  await db.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
