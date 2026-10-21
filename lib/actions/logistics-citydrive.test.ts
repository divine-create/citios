import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run integration tests.');
}
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Next.js headers & cookies for getServerSession
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

function setActiveUserToken(token: string | null) {
  if (token) {
    mockCookies['next-auth.session-token'] = token;
  } else {
    delete mockCookies['next-auth.session-token'];
  }
}

import { db } from '../../src/prisma/db';
import { authOptions } from '../auth';
import { encode } from 'next-auth/jwt';
import {
  createFleet,
  registerVehicle,
  updateVehicleStatus,
  onboardDriver,
  updateDriverStatus,
  assignDriverVehicle,
  getFleetAndDrivers,
} from './logistics-fleet';
import {
  findEligibleCandidates,
  dispatchDelivery,
  acceptDispatch,
  autoDispatchDelivery,
} from './logistics-dispatch';
import {
  createDeliveryJob,
  transitionDeliveryStatus,
  LogisticsDomainError,
} from './logistics-domain';
import {
  arriveAtPickup,
  confirmPickup,
  enterTransit,
  arriveAtDropoff,
  completeDelivery,
  failDelivery,
  cancelDelivery,
  closeWorkflow,
  logLocation,
} from './logistics-operations';
import {
  calculateDeliveryQuote,
  offerQuote,
  acceptQuote,
  updatePricingRule,
} from './logistics-pricing';
import {
  settleDelivery,
  getProviderSettlementSummary,
} from './logistics-settlement';
import {
  createLogisticsCustomer,
  getLogisticsCustomers,
  createManualCustomerDelivery,
  getCustomerStatement,
} from './logistics-customer';
import {
  createLogisticsDeliveryRequest,
  getDeliveryStatusForSource,
} from './logistics-api';
import {
  requestRestaurantDelivery,
  syncLogisticsStatusToRestaurantOS,
} from './restaurant-logistics';
import {
  processPartnerWebhook,
  setNetworkParticipation,
} from './logistics-network';
import { MockPartnerCourierAdapter } from './logistics-domain';
import { getPublicDeliveryTracking } from './logistics-tracking';

async function createAuthenticatedUser(orgId: string, role = 'OWNER') {
  const testId = uuidv4().substring(0, 8);
  const email = `citydrive-test-${testId}@example.com`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Test',
    lastName: `User-${testId}`,
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });

  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true,
  });

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: orgId,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role,
  });

  const token = await encode({
    token: {
      email,
      name: `Test User ${testId}`,
      personId: person.id,
      memberships: [{
        organizationId: orgId,
        organizationType: 'LOGISTICS' as any,
        role: role as any,
      }],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { person, membership, token, email };
}

test('CityDrive Comprehensive Logistics Operating System Suite', async (t) => {
  // Setup 2 Isolated Provider Organizations (Company A and Company B)
  const providerA = await db.orm.public.Organization.create({
    id: uuidv4(),
    name: `FastMovers Logistics ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });

  const providerB = await db.orm.public.Organization.create({
    id: uuidv4(),
    name: `SwiftRider Express ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });

  // Setup Pricing for Provider A
  await updatePricingRule({
    providerId: providerA.id,
    baseFee: 600,
    perKmRate: 120,
    perKgRate: 25,
    prioritySurcharge: 800,
  });

  // Setup Wallet for Provider A
  const walletA = await db.orm.public.Wallet.create({
    id: uuidv4(),
    organizationId: providerA.id,
    currency: 'NGN',
    balance: 0,
  });

  // Create real authenticated users for Company A and Company B
  const userA = await createAuthenticatedUser(providerA.id, 'OWNER');
  const userB = await createAuthenticatedUser(providerB.id, 'OWNER');

  let vehicleA: any = null;
  let driverA: any = null;
  let customerA: any = null;
  let manualJobA: any = null;

  await t.test('1. Multi-Tenant Fleet & Vehicle Operations', async () => {
    setActiveUserToken(userA.token);

    // Company A registers a vehicle
    vehicleA = await registerVehicle({
      providerId: providerA.id,
      type: 'MOTORCYCLE',
      licensePlate: `CAL-${uuidv4().slice(0, 4).toUpperCase()}`,
      capacityPayload: 30,
      capacityVolume: 0.2,
    });

    assert.ok(vehicleA.id, 'Vehicle ID must be generated');
    assert.strictEqual(vehicleA.providerId, providerA.id);
    assert.strictEqual(vehicleA.status, 'ACTIVE');

    // Multi-tenant isolation check: Company B user cannot register vehicle under Company A
    setActiveUserToken(userB.token);
    await assert.rejects(
      async () => {
        await registerVehicle({
          providerId: providerA.id,
          type: 'MOTORCYCLE',
          licensePlate: `CAL-BOGUS`,
        });
      },
      /FORBIDDEN: User does not have a membership at organization/,
      'Company B user must be blocked from modifying Company A fleet'
    );
    setActiveUserToken(userA.token);

    // Company A onboards a driver and assigns vehicle
    driverA = await onboardDriver({
      providerId: providerA.id,
      firstName: 'Emmanuel',
      lastName: 'Bassey',
      phone: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `driver-${uuidv4().slice(0, 6)}@citydrive.test`,
      vehicleId: vehicleA.id,
    });

    assert.ok(driverA.id, 'Driver profile ID must be generated');
    assert.strictEqual(driverA.providerId, providerA.id);
    assert.strictEqual(driverA.onboardingComplete, true);
    assert.strictEqual(driverA.currentVehicleId, vehicleA.id);

    // Toggle driver status to ONLINE
    await updateDriverStatus({
      providerId: providerA.id,
      driverProfileId: driverA.id,
      status: 'ONLINE',
    });

    // Verify Fleet roster contains vehicle and driver for Company A
    const fleetRoster = await getFleetAndDrivers(providerA.id);
    assert.ok(fleetRoster.vehicles.some((v: any) => v.id === vehicleA.id));
    assert.ok(fleetRoster.drivers.some((d: any) => d.id === driverA.id));

    // Verify Company B user cannot read Company A fleet roster
    setActiveUserToken(userB.token);
    await assert.rejects(
      async () => {
        await getFleetAndDrivers(providerA.id);
      },
      /FORBIDDEN: User does not have a membership at organization/,
      'Company B user cannot inspect Company A fleet roster'
    );

    // Verify Company B fleet does not leak Company A data
    const fleetB = await getFleetAndDrivers(providerB.id);
    assert.ok(!fleetB.vehicles.some((v: any) => v.id === vehicleA.id), 'Company B cannot see Company A vehicle');
    assert.ok(!fleetB.drivers.some((d: any) => d.id === driverA.id), 'Company B cannot see Company A driver');

    // Switch back to User A
    setActiveUserToken(userA.token);
  });

  await t.test('2. Standalone Private Customer Management & Direct Booking', async () => {
    setActiveUserToken(userA.token);

    // Onboard a private customer
    customerA = await createLogisticsCustomer({
      providerId: providerA.id,
      firstName: 'Grace',
      lastName: 'Duke',
      phone: `+23481${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `grace-${uuidv4().slice(0, 6)}@direct.test`,
      notes: 'VIP customer in State Housing Estate',
    });

    assert.ok(customerA.id, 'CustomerData ID must be generated');

    const customers = await getLogisticsCustomers(providerA.id);
    assert.ok(customers.some((c: any) => c.id === customerA.id));

    // Multi-tenant check: Company B cannot see Company A's private customers
    setActiveUserToken(userB.token);
    const customersB = await getLogisticsCustomers(providerB.id);
    assert.ok(!customersB.some((c: any) => c.id === customerA.id));
    setActiveUserToken(userA.token);

    // Book delivery directly on behalf of customer without vertical order
    const booking = await createManualCustomerDelivery({
      providerId: providerA.id,
      customerDataId: customerA.id,
      pickup: { address: '20 Marian Road, Calabar', contactName: 'Sender' },
      dropoff: { address: '5 Ndidem Usang Iso, Calabar', contactName: 'Grace' },
      packageDescription: 'Confidential Documents',
      packageWeightKg: 1.0,
      priority: true,
      distanceKm: 4.0,
      idempotencyKey: `direct-booking-${uuidv4()}`,
    });

    assert.ok(booking.job.id, 'Direct delivery job created');
    assert.ok(booking.job.trackingReference.startsWith('CD-'), 'Must have CD- tracking reference');
    assert.ok(booking.job.recipientOtp, 'Must generate recipient verification OTP');
    assert.strictEqual(booking.job.status, 'CREATED');
    manualJobA = booking.job;
  });

  await t.test('3. Automated Dispatch & Transparent Candidate Scoring', async () => {
    assert.ok(manualJobA);

    // Eligible candidates discovery
    const candidates = await findEligibleCandidates({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
    });
    assert.ok(candidates.drivers.some((d: any) => d.id === driverA.id));

    // Automated dispatch algorithm selects and offers to top candidate
    const dispatchRes = await autoDispatchDelivery({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
    });

    assert.strictEqual(dispatchRes.success, true);
    assert.ok(dispatchRes.dispatch);
    assert.strictEqual(dispatchRes.dispatch.status, 'OFFERED');
    assert.strictEqual(dispatchRes.driver.id, driverA.id);

    // Driver accepts dispatch
    const acceptRes = await acceptDispatch({
      dispatchId: dispatchRes.dispatch.id,
      driverProfileId: driverA.id,
      providerId: providerA.id,
    });

    assert.strictEqual(acceptRes.dispatch.status, 'ACCEPTED');
    assert.strictEqual(acceptRes.assignment.status, 'ACCEPTED');

    const job = await db.orm.public.DeliveryJob.where({ id: manualJobA.id }).first();
    assert.ok(job);
    assert.strictEqual(job.status, 'ASSIGNED');
  });

  await t.test('4. Real-Time Telemetry & Milestone Progression', async () => {
    assert.ok(manualJobA);

    // 1. Arrive at pickup
    const p1 = await arriveAtPickup({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
    });
    assert.strictEqual(p1.job.status, 'AT_PICKUP');

    // 2. Confirm pickup
    const p2 = await confirmPickup({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
    });
    assert.strictEqual(p2.job.status, 'PICKED_UP');

    // 3. Enter transit
    const p3 = await enterTransit({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
    });
    assert.strictEqual(p3.job.status, 'IN_TRANSIT');

    // 4. GPS ping
    await logLocation({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
      latitude: 4.9757,
      longitude: 8.3417,
    });

    // 5. Arrive at dropoff
    const p4 = await arriveAtDropoff({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
    });
    assert.strictEqual(p4.job.status, 'AT_DROPOFF');
  });

  await t.test('5. Proof of Delivery (POD) with OTP Verification', async () => {
    assert.ok(manualJobA);

    const job = await db.orm.public.DeliveryJob.where({ id: manualJobA.id }).first();
    assert.ok(job);
    const correctOtp = job.recipientOtp || undefined;
    const wrongOtp = '000000';

    // Attempt completion with wrong OTP must fail
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: manualJobA.id,
          providerId: providerA.id,
          driverProfileId: driverA.id,
          type: 'OTP',
          otp: wrongOtp,
          recipientName: 'Grace Duke',
        });
      },
      /Invalid recipient verification OTP/,
      'Incorrect OTP must be rejected server-side'
    );

    // Complete delivery with correct OTP succeeds
    const podRes = await completeDelivery({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
      type: 'OTP',
      otp: correctOtp,
      recipientName: 'Grace Duke',
      notes: 'Delivered directly to recipient',
    });

    assert.ok(podRes.proofOfDelivery);
    assert.strictEqual(podRes.job.status, 'DELIVERED');

    // Close operational workflow -> COMPLETED
    const closed = await closeWorkflow({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
    });
    assert.strictEqual(closed.job.status, 'COMPLETED');
  });

  await t.test('6. Financial Settlement & Ledger Precision', async () => {
    assert.ok(manualJobA);

    // Company B attempting to settle Company A's job must fail (IDOR check)
    setActiveUserToken(userB.token);
    await assert.rejects(
      async () => {
        await settleDelivery({
          deliveryJobId: manualJobA.id,
          providerId: providerB.id,
        });
      },
      /Provider isolation violation/,
      'Cross-company settlement must be rejected'
    );
    setActiveUserToken(userA.token);

    // Settle delivery for Provider A
    const settlement = await settleDelivery({
      deliveryJobId: manualJobA.id,
      providerId: providerA.id,
      idempotencyKey: `settle-suite-${manualJobA.id}`,
    });

    assert.strictEqual(settlement.status, 'SETTLED');
    assert.ok(Number(settlement.providerAmount) > 0);

    // Check financial ledger summary
    const summary = await getProviderSettlementSummary(providerA.id);
    assert.ok(summary.totalNet > 0);
    assert.strictEqual(summary.walletBalance, summary.totalNet);
  });

  await t.test('7. Customer Public Tracking Portal by Reference', async () => {
    assert.ok(manualJobA);

    const tracking = await getPublicDeliveryTracking(manualJobA.trackingReference);
    assert.ok(tracking);
    assert.strictEqual(tracking.trackingReference, manualJobA.trackingReference);
    assert.strictEqual(tracking.isDelivered, true);
    assert.ok(tracking.milestones.length >= 4);
    assert.ok(tracking.milestones.some((m: any) => m.eventType === 'DELIVERED'));
  });

  await t.test('8. RestaurantOS Food Delivery Integration', async () => {
    // 1. Create Restaurant Organization & Location
    const restaurant = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: `Mama Otu Kitchen ${uuidv4().slice(0, 6)}`,
      type: 'RESTAURANT' as any,
      status: 'ACTIVE',
    });

    // 2. Create Restaurant Order (orderNumber is Int)
    const restOrder = await db.orm.public.RestaurantOrder.create({
      id: uuidv4(),
      organizationId: restaurant.id,
      status: 'READY' as any,
      type: 'DELIVERY' as any,
      totalAmount: 4500,
      orderNumber: 101,
    });

    // Enable network participation on Provider A so network dispatch can find it
    await setNetworkParticipation({
      providerId: providerA.id,
      isParticipant: true,
      serviceRadiusKm: 30,
    });

    // 3. Request delivery fulfillment from RestaurantOS
    const reqRes = await createLogisticsDeliveryRequest({
      sourceType: 'RESTAURANT_ORDER',
      sourceId: restOrder.id,
      providerId: providerA.id,
      pickup: { address: 'Mama Otu Kitchen, Marian Road' },
      dropoff: { address: 'State Housing, Calabar' },
      idempotencyKey: `rest-order-del-${restOrder.id}`,
    });

    assert.ok(reqRes.id);
    assert.strictEqual(reqRes.sourceType, 'RESTAURANT_ORDER');

    // 4. Verify RestaurantOS can read fulfillment status
    const status = await getDeliveryStatusForSource('RESTAURANT_ORDER', restOrder.id);
    assert.ok(status);
    assert.strictEqual(status.deliveryJobId, reqRes.id);

    // 5. Test status synchronization back to restaurant order
    await transitionDeliveryStatus(reqRes.id, 'DISPATCHED', providerA.id);
    await transitionDeliveryStatus(reqRes.id, 'ASSIGNED', providerA.id);
    await transitionDeliveryStatus(reqRes.id, 'AT_PICKUP', providerA.id);
    await transitionDeliveryStatus(reqRes.id, 'PICKED_UP', providerA.id);
    await transitionDeliveryStatus(reqRes.id, 'IN_TRANSIT', providerA.id);
    await transitionDeliveryStatus(reqRes.id, 'AT_DROPOFF', providerA.id);
    await transitionDeliveryStatus(reqRes.id, 'DELIVERED', providerA.id);

    await syncLogisticsStatusToRestaurantOS(reqRes.id);
    const updatedOrder = await db.orm.public.RestaurantOrder.where({ id: restOrder.id }).first();
    assert.ok(updatedOrder);
    assert.strictEqual(updatedOrder.status, 'COMPLETED', 'RestaurantOrder should transition to COMPLETED upon delivery');
  });

  await t.test('9. External Partner Courier Integration & Webhooks', async () => {
    assert.ok(manualJobA);

    const adapter = new MockPartnerCourierAdapter();

    // 1. Get quote
    const quote = await adapter.getQuote({
      pickupAddress: 'Calabar Port',
      dropoffAddress: 'Watt Market',
      weightKg: 5,
      priority: true,
    });
    assert.strictEqual(quote.courierName, 'CityDrive Partner Express');
    assert.ok(quote.totalAmount > 0);

    // 2. Book external shipment
    const booking = await adapter.bookShipment({
      quoteReference: quote.quoteReference,
      pickupAddress: 'Calabar Port',
      dropoffAddress: 'Watt Market',
      recipientName: 'Kalu Okoro',
      recipientPhone: '+2348030000000',
      description: 'Machinery Parts',
      idempotencyKey: `partner-book-${uuidv4()}`,
    });
    assert.strictEqual(booking.success, true);
    assert.ok(booking.externalTrackingNumber.startsWith('CDP-'));

    // 3. Process webhook update
    const webhookRes = await processPartnerWebhook({
      providerId: providerA.id,
      eventType: 'IN_TRANSIT',
      deliveryJobId: manualJobA.id,
      externalReference: booking.externalTrackingNumber,
      notes: 'Out for final delivery via partner courier',
      idempotencyKey: `webhook-${booking.externalTrackingNumber}`,
    });

    assert.strictEqual(webhookRes.success, true);
    assert.strictEqual(webhookRes.duplicate, false);

    // Webhook idempotency test
    const dupWebhook = await processPartnerWebhook({
      providerId: providerA.id,
      eventType: 'IN_TRANSIT',
      deliveryJobId: manualJobA.id,
      externalReference: booking.externalTrackingNumber,
      notes: 'Out for final delivery via partner courier',
      idempotencyKey: `webhook-${booking.externalTrackingNumber}`,
    });
    assert.strictEqual(dupWebhook.duplicate, true);
  });

  await t.test('10. Delivery Exception & Cancellation Workflows', async () => {
    // Create job for exception test
    const jobToFail = await createDeliveryJob({
      providerId: providerA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `fail-job-${uuidv4()}`,
      dropoffAddress: 'Unreachable Island, Cross River',
    });

    // Move to CREATED -> DISPATCHED -> ASSIGNED
    await transitionDeliveryStatus(jobToFail.id, 'CREATED', providerA.id);
    await transitionDeliveryStatus(jobToFail.id, 'DISPATCHED', providerA.id);
    await db.orm.public.DeliveryAssignment.create({
      deliveryJobId: jobToFail.id,
      driverProfileId: driverA.id,
      status: 'ACCEPTED',
    });
    await transitionDeliveryStatus(jobToFail.id, 'ASSIGNED', providerA.id);

    // Report failure / exception
    const failRes = await failDelivery({
      deliveryJobId: jobToFail.id,
      providerId: providerA.id,
      driverProfileId: driverA.id,
      reason: 'INCORRECT_ADDRESS',
      notes: 'Road impassable due to flooding',
    });

    assert.strictEqual(failRes.job.status, 'FAILED');
    assert.strictEqual(failRes.job.failureReason, 'INCORRECT_ADDRESS');

    // Create job for cancellation test
    const jobToCancel = await createDeliveryJob({
      providerId: providerA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `cancel-job-${uuidv4()}`,
      dropoffAddress: '10 Target Road, Calabar',
    });

    const cancelRes = await cancelDelivery({
      deliveryJobId: jobToCancel.id,
      providerId: providerA.id,
      reason: 'Customer changed mind before dispatch',
    });

    assert.strictEqual(cancelRes.job.status, 'CANCELLED');
    assert.strictEqual(cancelRes.job.cancellationReason, 'Customer changed mind before dispatch');
  });

});
