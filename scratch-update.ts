import { db } from './src/prisma/db';

async function main() {
  const job = await db.orm.public.DeliveryJob.create({
    providerId: "00000000-0000-0000-0000-000000000000",
    status: "REQUESTED",
    sourceType: "DIRECT_DELIVERY",
    sourceId: "123",
    dropoffAddress: "123 Main St"
  });
  console.log('Created job:', job.id);

  // Try update with just ID
  const u1 = await db.orm.public.DeliveryJob.where({ id: job.id }).update({ status: "PRICED" });
  console.log('u1:', u1.status);

  // Try update with ID and wrong status
  try {
     const u2 = await db.orm.public.DeliveryJob.where({ id: job.id, status: "REQUESTED" }).update({ status: "CREATED" });
     console.log('u2 (should have failed or returned null?):', u2?.status);
  } catch (e: any) {
     console.log('u2 threw:', e.message);
  }
}

main().catch(console.error);
