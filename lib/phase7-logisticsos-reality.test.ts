import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { calculateDeliveryQuote, offerQuote, acceptQuote } from './actions/logistics-pricing';
import { findEligibleCandidates, dispatchDelivery, acceptDispatch } from './actions/logistics-dispatch';
import { arriveAtPickup, confirmPickup, enterTransit, arriveAtDropoff, completeDelivery, logLocation, getTrackingHistory, closeWorkflow } from './actions/logistics-operations';
import { settleDelivery } from './actions/logistics-settlement';

test('Phase 7 LogisticsOS Reality End-to-End Suite', async (t) => {
  // 1. Setup Provider Organization
  const provider = await db.orm.public.Organization.create({
    name: `CityLogistics Provider ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });

  // 2. Setup Pricing Rule
  const pricingRule = await db.orm.public.DeliveryPricingRule.create({
    providerId: provider.id,
    version: 1,
    currency: 'NGN',
    baseFee: '500.00',
    perKmRate: '150.00',
    perKgRate: '20.00',
    prioritySurcharge: '1000.00',
    isActive: true,
  });

  // 3. Setup Logistics Settings (Platform Fee = 10%)
  const settings = await db.orm.public.LogisticsSettings.create({
    organizationId: provider.id,
    platformFeeRate: 0.10,
  });

  // 4. Setup Driver Person & Profile
  const driverPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Tari',
    lastName: 'Rider',
  });

  const driverProfile = await db.orm.public.LogisticsDriverProfile.create({
    providerId: provider.id,
    personId: driverPerson.id,
    status: 'ONLINE' as any,
    onboardingComplete: true,
  });

  // 5. Setup Provider Wallet
  const providerWallet = await db.orm.public.Wallet.create({
    organizationId: provider.id,
    currency: 'NGN',
    balance: 0,
  });

  // 6. Setup DeliveryJob
  const deliveryJob = await db.orm.public.DeliveryJob.create({
    providerId: provider.id,
    status: 'REQUESTED' as any,
    pickupAddress: '15 Marina Road, Calabar',
    dropoffAddress: '42 Ndidem Usang Iso Road, Calabar',
  });

  let createdQuoteId: string | null = null;
  let createdDispatchId: string | null = null;

  await t.test('1. Pricing Engine: quote calculation with distance & weight', async () => {
    const quote = await calculateDeliveryQuote({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      distanceKm: 4.5,
      weightKg: 2.0,
      priority: true,
      idempotencyKey: `quote-${deliveryJob.id}`,
    });

    assert.ok(quote.id, 'Quote must have an ID');
    assert.strictEqual(quote.status, 'CALCULATED');
    // base (500) + distance (150*4.5=675) + weight (20*2=40) + priority (1000) = 2215.00
    assert.strictEqual(quote.total, '2215.00');
    createdQuoteId = quote.id;

    // Offer quote to customer
    await offerQuote(quote.id, provider.id);
    const offeredQuote = (await db.orm.public.DeliveryQuote.where({ id: quote.id }).all())[0];
    assert.strictEqual(offeredQuote.status, 'OFFERED');
  });

  await t.test('2. Quote Acceptance -> Job Transitions to PRICED', async () => {
    assert.ok(createdQuoteId);

    const acceptedQuote = await acceptQuote(createdQuoteId, provider.id);
    assert.strictEqual(acceptedQuote.status, 'ACCEPTED');

    const job = await db.orm.public.DeliveryJob.where({ id: deliveryJob.id }).all().first();
    assert.strictEqual(job.status, 'PRICED');
  });

  await t.test('3. Candidate Discovery & Dispatch Offer Creation', async () => {
    const candidates = await findEligibleCandidates({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
    });

    assert.ok(candidates.drivers.length > 0, 'Online driver must be discovered as candidate');
    assert.ok(candidates.drivers.some((d: any) => d.id === driverProfile.id));

    const dispatch = await dispatchDelivery({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
      idempotencyKey: `dispatch-${deliveryJob.id}`,
    });

    assert.ok(dispatch.id, 'Dispatch ID must be generated');
    assert.strictEqual(dispatch.status, 'OFFERED');
    createdDispatchId = dispatch.id;
  });

  await t.test('4. Driver Acceptance & Assignment Locking', async () => {
    assert.ok(createdDispatchId);

    await acceptDispatch({
      dispatchId: createdDispatchId,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
    });

    const job = await db.orm.public.DeliveryJob.where({ id: deliveryJob.id }).all().first();
    assert.strictEqual(job.status, 'ASSIGNED');

    const assignment = (await db.orm.public.DeliveryAssignment.where({ deliveryJobId: deliveryJob.id }).all())[0];
    assert.ok(assignment, 'Assignment must exist for delivery job');
    assert.strictEqual(assignment.driverProfileId, driverProfile.id);
    assert.strictEqual(assignment.status, 'ACCEPTED');
  });

  await t.test('5. Operational Lifecycle: Pickup -> Transit -> Telemetry -> Dropoff', async () => {
    // Arrive at pickup
    const arrPickup = await arriveAtPickup({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
      latitude: 4.9757,
      longitude: 8.3417,
    });
    assert.strictEqual(arrPickup.event.eventType, 'AT_PICKUP');

    // Confirm pickup
    const confPickup = await confirmPickup({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
    });
    assert.strictEqual(confPickup.event.eventType, 'PICKED_UP');

    // Enter transit
    const transit = await enterTransit({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
    });
    assert.strictEqual(transit.event.eventType, 'IN_TRANSIT');

    // Telemetry: Log GPS coordinates
    await logLocation({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
      latitude: 4.9790,
      longitude: 8.3380,
    });

    const tracking = await getTrackingHistory(deliveryJob.id, provider.id);
    assert.ok(tracking.length >= 3, 'Tracking events must be recorded in temporal sequence');

    // Arrive at dropoff
    const arrDropoff = await arriveAtDropoff({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
      latitude: 4.9820,
      longitude: 8.3350,
    });
    assert.strictEqual(arrDropoff.event.eventType, 'AT_DROPOFF');
  });

  await t.test('6. Proof of Delivery (POD) & Workflow Closure', async () => {
    // Complete delivery with PIN verification
    const podRes = await completeDelivery({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      driverProfileId: driverProfile.id,
      type: 'PIN',
      recipientName: 'Alice Okon',
    });

    assert.ok(podRes.proofOfDelivery, 'Proof of delivery must be recorded');
    assert.strictEqual(podRes.job.status, 'DELIVERED');

    let job = await db.orm.public.DeliveryJob.where({ id: deliveryJob.id }).all().first();
    assert.strictEqual(job.status, 'DELIVERED');

    // Close workflow -> transitions to COMPLETED
    const closed = await closeWorkflow({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      idempotencyKey: `close-${deliveryJob.id}`,
    });
    assert.strictEqual(closed.job.status, 'COMPLETED');

    job = await db.orm.public.DeliveryJob.where({ id: deliveryJob.id }).all().first();
    assert.strictEqual(job.status, 'COMPLETED');
  });

  await t.test('7. Financial Settlement: Automated Wallet Credit & Ledger Posting', async () => {
    const settleRes = await settleDelivery({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      idempotencyKey: `settle-${deliveryJob.id}`,
    });

    assert.ok(settleRes.id, 'Settlement record created');
    assert.strictEqual(settleRes.status, 'SETTLED');
    assert.strictEqual(Number(settleRes.grossAmount), 2215.00);
    assert.strictEqual(Number(settleRes.fees), 221.50); // 10% platform fee
    assert.strictEqual(Number(settleRes.providerAmount), 1993.50); // Net 90% payout

    // Verify provider wallet was credited
    const updatedWallet = await db.orm.public.Wallet.where({ id: providerWallet.id }).all().first();
    assert.strictEqual(Number(updatedWallet.balance), 1993.50, 'Provider wallet must reflect net delivery earnings');

    // Verify settlement idempotency
    const dupRes = await settleDelivery({
      deliveryJobId: deliveryJob.id,
      providerId: provider.id,
      idempotencyKey: `settle-${deliveryJob.id}`,
    });
    assert.strictEqual(dupRes.id, settleRes.id, 'Duplicate settlement with same key must return existing settlement');
  });

  // Teardown
  const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: deliveryJob.id }).all();
  for (const e of events) {
    await db.orm.public.DeliveryTrackingEvent.where({ id: e.id }).delete();
  }
  const pods = await db.orm.public.ProofOfDelivery.where({ deliveryJobId: deliveryJob.id }).all();
  for (const p of pods) {
    await db.orm.public.ProofOfDelivery.where({ id: p.id }).delete();
  }
  const assignments = await db.orm.public.DeliveryAssignment.where({ deliveryJobId: deliveryJob.id }).all();
  for (const a of assignments) {
    await db.orm.public.DeliveryAssignment.where({ id: a.id }).delete();
  }
  const dispatches = await db.orm.public.DeliveryDispatch.where({ deliveryJobId: deliveryJob.id }).all();
  for (const d of dispatches) {
    await db.orm.public.DeliveryDispatch.where({ id: d.id }).delete();
  }
  const settlements = await db.orm.public.LogisticsSettlement.where({ deliveryJobId: deliveryJob.id }).all();
  for (const s of settlements) {
    await db.orm.public.LogisticsSettlement.where({ id: s.id }).delete();
    if (s.transactionId) {
      const entries = await db.orm.public.LedgerEntry.where({ transactionId: s.transactionId }).all();
      for (const e of entries) {
        await db.orm.public.LedgerEntry.where({ id: e.id }).delete();
      }
      await db.orm.public.Transaction.where({ id: s.transactionId }).delete();
    }
  }
  const remainingEntries = await db.orm.public.LedgerEntry.where({ walletId: providerWallet.id }).all();
  for (const re of remainingEntries) {
    await db.orm.public.LedgerEntry.where({ id: re.id }).delete();
  }
  if (createdQuoteId) {
    await db.orm.public.DeliveryQuote.where({ id: createdQuoteId }).delete();
  }
  await db.orm.public.DeliveryJob.where({ id: deliveryJob.id }).delete();
  await db.orm.public.DeliveryPricingRule.where({ id: pricingRule.id }).delete();
  await db.orm.public.LogisticsSettings.where({ id: settings.id }).delete();
  await db.orm.public.LogisticsDriverProfile.where({ id: driverProfile.id }).delete();
  await db.orm.public.Wallet.where({ id: providerWallet.id }).delete();
  await db.orm.public.Person.where({ id: driverPerson.id }).delete();
  await db.orm.public.Organization.where({ id: provider.id }).delete();
});
