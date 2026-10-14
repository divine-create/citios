import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "integration-test-secret";

// Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

import { db } from '@/src/prisma/db';
import { searchCityExplore } from '@/app/actions/explore';
import { updateOrderStatus } from '@/lib/actions/restaurantos';
import { calculateDeliveryQuote, offerQuote, acceptQuote } from '@/lib/actions/logistics-pricing';
import { findEligibleCandidates, dispatchDelivery, acceptDispatch } from '@/lib/actions/logistics-dispatch';
import { arriveAtPickup, confirmPickup, enterTransit, arriveAtDropoff, completeDelivery, closeWorkflow } from '@/lib/actions/logistics-operations';
import { settleDelivery } from '@/lib/actions/logistics-settlement';
import { recordDoubleEntryTransaction, reconcileWalletBalance, getMerchantAccountingStatement } from '@/lib/actions/ledger';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

async function setupAuth(prefix: string) {
  const uid = uuidv4().slice(0, 8);
  const email = `${prefix.toLowerCase()}-${uid}@example.com`;
  
  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: prefix,
    lastName: 'PilotUser',
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

  const token = await encode({
    token: {
      email,
      name: `${prefix} PilotUser`,
      personId: person.id,
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || "cityos-jwt-secret-key-2026",
  });

  return { person, token };
}

test('Phase 10 Pilot Launch Readiness & End-to-End Pilot Verification Suite', async (t) => {
  // 1. Resolve Pilot City (e.g. Uyo)
  let city = await db.orm.public.City.where({ slug: 'uyo-akwa-ibom' }).all().first();
  if (!city) {
    city = (await db.orm.public.City.where({ isActive: true }).all())[0];
  }
  assert.ok(city, 'Active pilot city must exist in registry');

  // 2. Setup Platform HQ Organization & Wallet
  const platformOrg = await db.orm.public.Organization.create({
    name: `CityPlatform Pilot HQ ${uuidv4().slice(0, 6)}`,
    type: 'GOVERNMENT' as any,
  });
  const platformWallet = await db.orm.public.Wallet.create({
    organizationId: platformOrg.id,
    balance: 0.0,
    currency: 'NGN',
  });

  // 3. Setup Merchant (RestaurantOS)
  const merchantOwner = await setupAuth('PilotChef');
  const restaurantOrg = await db.orm.public.Organization.create({
    name: `Calabar Kitchen Pilot ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT' as any,
    status: 'ACTIVE',
  });
  const restaurantWallet = await db.orm.public.Wallet.create({
    organizationId: restaurantOrg.id,
    balance: 0.0,
    currency: 'NGN',
  });
  const restaurantMembership = await db.orm.public.Membership.create({
    personId: merchantOwner.person.id,
    organizationId: restaurantOrg.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: restaurantMembership.id,
    role: 'OWNER',
  });

  const restaurantLocation = await db.orm.public.Location.create({
    organizationId: restaurantOrg.id,
    cityId: city.id,
    name: 'Main Pilot Branch',
    address: '14 Oron Road, Uyo',
  });

  // Menu items
  const menuItem1 = await db.orm.public.MenuItem.create({
    organizationId: restaurantOrg.id,
    name: 'Edikang Ikong Soup & Pounded Yam',
    category: 'Mains',
    price: 3500.0,
    isAvailable: true,
  });
  const menuItem2 = await db.orm.public.MenuItem.create({
    organizationId: restaurantOrg.id,
    name: 'Zobo Iced Tea',
    category: 'Drinks',
    price: 1500.0,
    isAvailable: true,
  });

  // 4. Setup Logistics Provider & Driver
  const providerOrg = await db.orm.public.Organization.create({
    name: `FastCity Express Pilot ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });
  const providerWallet = await db.orm.public.Wallet.create({
    organizationId: providerOrg.id,
    balance: 0.0,
    currency: 'NGN',
  });
  const pricingRule = await db.orm.public.DeliveryPricingRule.create({
    providerId: providerOrg.id,
    version: 1,
    currency: 'NGN',
    baseFee: '500.00',
    perKmRate: '150.00',
    perKgRate: '20.00',
    prioritySurcharge: '0.00',
    isActive: true,
  });
  const logisticsSettings = await db.orm.public.LogisticsSettings.create({
    organizationId: providerOrg.id,
    platformFeeRate: 0.10,
  });

  const driverPerson = await setupAuth('PilotRider');
  const driverProfile = await db.orm.public.LogisticsDriverProfile.create({
    providerId: providerOrg.id,
    personId: driverPerson.person.id,
    status: 'ONLINE' as any,
    onboardingComplete: true,
  });

  // 5. Setup Resident Customer & Wallet
  const resident = await setupAuth('PilotResident');
  const residentWallet = await db.orm.public.Wallet.create({
    personId: resident.person.id,
    balance: 50000.0, // Initial funding
    currency: 'NGN',
  });
  const relationship = await db.orm.public.Relationship.create({
    personId: resident.person.id,
    organizationId: restaurantOrg.id,
    type: 'CUSTOMER',
  });
  const customerData = await db.orm.public.CustomerData.create({
    personId: resident.person.id,
    relationshipId: relationship.id,
  });

  // State handles across lifecycle
  let listingId: string | null = null;
  let orderId: string | null = null;
  let paymentId: string | null = null;
  let deliveryJobId: string | null = null;
  let deliveryQuoteId: string | null = null;
  let deliveryDispatchId: string | null = null;
  const createdTxnIds: string[] = [];

  // Seed initial wallet funding transaction
  const initialFundTxn = await db.orm.public.Transaction.create({
    status: 'COMPLETED',
    description: 'Initial Pilot Resident Wallet Topup',
  });
  createdTxnIds.push(initialFundTxn.id);
  await db.orm.public.LedgerEntry.create({
    walletId: residentWallet.id,
    transactionId: initialFundTxn.id,
    amount: 50000.0,
    currency: 'NGN',
  });

  await t.test('1. Step 1: Merchant Discovery in Pilot City', async () => {
    // Create & Publish DiscoveryListing
    const listing = await db.orm.public.DiscoveryListing.create({
      cityId: city.id,
      organizationId: restaurantOrg.id,
      locationId: restaurantLocation.id,
      title: restaurantOrg.name,
      slug: `restaurant-${restaurantOrg.id.slice(0, 8)}`,
      vertical: 'Restaurant',
      isActive: true,
      description: 'Authentic local cuisine in the heart of the pilot city',
      metadata: JSON.stringify({ rating: 4.8, isOpen: true, deliveryEta: 30 }),
    });
    listingId = listing.id;

    // Search explore
    const searchRes = await searchCityExplore(city.slug, restaurantOrg.name, 'All');
    assert.ok(searchRes.organizations.length > 0, 'Pilot restaurant must appear in city search');
    assert.ok(searchRes.organizations.some((o: any) => o.name === restaurantOrg.name));
  });

  await t.test('2. Step 2: Multi-Item Food Order Creation & Payment Settlement', async () => {
    mockCookies['next-auth.session-token'] = resident.token;

    // Order total: 3500 + 1500 = 5000 NGN
    const order = await db.orm.public.RestaurantOrder.create({
      customerDataId: customerData.id,
      organizationId: restaurantOrg.id,
      status: 'PENDING',
      type: 'DELIVERY',
      totalAmount: 5000.0,
      paymentMethod: 'ONLINE',
    });
    orderId = order.id;

    // Order items
    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: menuItem1.id,
      menuItemName: menuItem1.name,
      quantity: 1,
      unitPrice: 3500.0,
    });
    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: menuItem2.id,
      menuItemName: menuItem2.name,
      quantity: 1,
      unitPrice: 1500.0,
    });

    // Payment Processing
    const payment = await db.orm.public.Payment.create({
      amount: 5000.0,
      currency: 'NGN',
      status: 'COMPLETED',
      restaurantOrderId: order.id,
      method: 'CARD',
      provider: 'SANDBOX',
      reference: `PAY_PILOT_${order.id.slice(0, 8)}`,
    });
    paymentId = payment.id;

    // Update order payment status
    await db.orm.public.RestaurantOrder.where({ id: order.id }).update({
      paymentStatus: 'COMPLETED',
    });

    const confirmedOrder = await db.orm.public.RestaurantOrder.where({ id: order.id }).all().firstOrThrow();
    assert.strictEqual(confirmedOrder.status, 'PENDING');
    assert.strictEqual(confirmedOrder.paymentStatus, 'COMPLETED');
  });

  await t.test('3. Step 3: Kitchen Display System (KDS) Order Fulfillment', async () => {
    assert.ok(orderId);
    mockCookies['next-auth.session-token'] = merchantOwner.token;

    // Transition: CONFIRMED -> PREPARING
    const prepRes = await updateOrderStatus(orderId, 'PREPARING');
    assert.strictEqual(prepRes.status, 'PREPARING');

    // Transition: PREPARING -> READY
    const readyRes = await updateOrderStatus(orderId, 'READY');
    assert.strictEqual(readyRes.status, 'READY');
  });

  await t.test('4. Step 4: LogisticsOS Delivery Lifecycle: Quote, Dispatch, Transit & POD', async () => {
    assert.ok(orderId);

    // 1. Create DeliveryJob
    const job = await db.orm.public.DeliveryJob.create({
      providerId: providerOrg.id,
      sourceType: 'RESTAURANT_ORDER',
      sourceId: orderId,
      status: 'REQUESTED' as any,
      pickupAddress: restaurantLocation.address,
      dropoffAddress: '44 Gibbs Street, Uyo',
    });
    deliveryJobId = job.id;

    // 2. Pricing Quote (3.0 km distance, 1.5 kg weight)
    // base (500) + 3*150 (450) + 1.5*20 (30) = 980 NGN
    const quote = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      distanceKm: 3.0,
      weightKg: 1.5,
      priority: false,
    });
    deliveryQuoteId = quote.id;
    assert.strictEqual(quote.total, '980.00');

    await offerQuote(quote.id, providerOrg.id);
    await acceptQuote(quote.id, providerOrg.id);

    // 3. Dispatch & Driver Offer
    const candidates = await findEligibleCandidates({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
    });
    assert.ok(candidates.drivers.some((d: any) => d.id === driverProfile.id));

    const dispatch = await dispatchDelivery({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      driverProfileId: driverProfile.id,
    });
    deliveryDispatchId = dispatch.id;
    assert.strictEqual(dispatch.status, 'OFFERED');

    // 4. Driver Acceptance
    await acceptDispatch({
      dispatchId: dispatch.id,
      driverProfileId: driverProfile.id,
      providerId: providerOrg.id,
    });

    // 5. Telemetry: Pickup -> Transit -> Dropoff
    await arriveAtPickup({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      driverProfileId: driverProfile.id,
      latitude: 5.0377,
      longitude: 7.9128,
    });
    await confirmPickup({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      driverProfileId: driverProfile.id,
    });
    await enterTransit({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      driverProfileId: driverProfile.id,
    });
    await arriveAtDropoff({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      driverProfileId: driverProfile.id,
      latitude: 5.0420,
      longitude: 7.9250,
    });

    // 6. Complete delivery with PIN verification
    const podRes = await completeDelivery({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
      driverProfileId: driverProfile.id,
      type: 'PIN',
      recipientName: 'Pilot Resident',
    });
    assert.strictEqual(podRes.job.status, 'DELIVERED');

    await closeWorkflow({
      deliveryJobId: job.id,
      providerId: providerOrg.id,
    });

    const finalJob = await db.orm.public.DeliveryJob.where({ id: job.id }).all().firstOrThrow();
    assert.strictEqual(finalJob.status, 'COMPLETED');
  });

  await t.test('5. Step 5: Multi-Party Automated Financial Settlement & Balanced Ledger Reconciliation', async () => {
    assert.ok(deliveryJobId);

    // Settle Delivery: 980 NGN total, 10% platform fee (98 NGN), 882 NGN net to provider
    const settleRes = await settleDelivery({
      deliveryJobId: deliveryJobId,
      providerId: providerOrg.id,
      idempotencyKey: `settle-pilot-${deliveryJobId}`,
    });
    assert.strictEqual(Number(settleRes.grossAmount), 980.0);
    assert.strictEqual(Number(settleRes.fees), 98.0);
    assert.strictEqual(Number(settleRes.providerAmount), 882.0);

    // Post Food Order Double-Entry Settlement:
    // Resident Paid 5000 NGN
    // Platform Fee (5% of 5000 = 250 NGN)
    // Merchant Net (4750 NGN)
    // Resident Wallet debited -5000 NGN
    const splitTxn = await recordDoubleEntryTransaction({
      description: `Pilot Order #${orderId?.slice(0, 8)} Food Settlement Split`,
      reference: `SETTLE_FOOD_${orderId}`,
      entries: [
        { walletId: residentWallet.id, amount: -5000.0, currency: 'NGN' },
        { walletId: restaurantWallet.id, amount: 4750.0, currency: 'NGN' },
        { walletId: platformWallet.id, amount: 250.0, currency: 'NGN' },
      ],
    });
    createdTxnIds.push(splitTxn.transaction.id);

    // Verify all 4 wallets balance with zero discrepancies
    const reconResident = await reconcileWalletBalance(residentWallet.id);
    assert.strictEqual(reconResident.isBalanced, true);
    assert.strictEqual(reconResident.reportedBalance, 45000.0);

    const reconMerchant = await reconcileWalletBalance(restaurantWallet.id);
    assert.strictEqual(reconMerchant.isBalanced, true);
    assert.strictEqual(reconMerchant.reportedBalance, 4750.0);

    const reconProvider = await reconcileWalletBalance(providerWallet.id);
    assert.strictEqual(reconProvider.isBalanced, true);
    assert.strictEqual(reconProvider.reportedBalance, 882.0);

    const reconPlatform = await reconcileWalletBalance(platformWallet.id);
    assert.strictEqual(reconPlatform.isBalanced, true);
    assert.strictEqual(reconPlatform.reportedBalance, 250.0);

    // Verify merchant accounting statement
    mockCookies['next-auth.session-token'] = merchantOwner.token;
    const stmt = await getMerchantAccountingStatement(restaurantOrg.id);
    assert.strictEqual(stmt.isBalanced, true);
    assert.strictEqual(stmt.currentBalance, 4750.0);
    assert.strictEqual(stmt.grossEarnings, 4750.0);
  });

  // Teardown
  if (deliveryJobId) {
    const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId }).all();
    for (const e of events) {
      await db.orm.public.DeliveryTrackingEvent.where({ id: e.id }).delete();
    }
    const pods = await db.orm.public.ProofOfDelivery.where({ deliveryJobId }).all();
    for (const p of pods) {
      await db.orm.public.ProofOfDelivery.where({ id: p.id }).delete();
    }
    const assignments = await db.orm.public.DeliveryAssignment.where({ deliveryJobId }).all();
    for (const a of assignments) {
      await db.orm.public.DeliveryAssignment.where({ id: a.id }).delete();
    }
    const dispatches = await db.orm.public.DeliveryDispatch.where({ deliveryJobId }).all();
    for (const d of dispatches) {
      await db.orm.public.DeliveryDispatch.where({ id: d.id }).delete();
    }
    const settlements = await db.orm.public.LogisticsSettlement.where({ deliveryJobId }).all();
    for (const s of settlements) {
      await db.orm.public.LogisticsSettlement.where({ id: s.id }).delete();
      if (s.transactionId) {
        createdTxnIds.push(s.transactionId);
      }
    }
    if (deliveryQuoteId) {
      await db.orm.public.DeliveryQuote.where({ id: deliveryQuoteId }).delete();
    }
    await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).delete();
  }

  // Clean ledger entries & transactions
  const allWalletIds = [restaurantWallet.id, platformWallet.id, providerWallet.id, residentWallet.id];
  const entries = await db.orm.public.LedgerEntry.where((le: any) => le.walletId.in(allWalletIds)).all();
  for (const e of entries) {
    await db.orm.public.LedgerEntry.where({ id: e.id }).delete();
    createdTxnIds.push(e.transactionId);
  }
  for (const tid of Array.from(new Set(createdTxnIds))) {
    await db.orm.public.Transaction.where({ id: tid }).delete();
  }

  if (listingId) {
    await db.orm.public.DiscoveryListing.where({ id: listingId }).delete();
  }
  if (orderId) {
    const items = await db.orm.public.OrderItem.where({ orderId }).all();
    for (const it of items) {
      await db.orm.public.OrderItem.where({ id: it.id }).delete();
    }
    if (paymentId) {
      await db.orm.public.Payment.where({ id: paymentId }).delete();
    }
    await db.orm.public.RestaurantOrder.where({ id: orderId }).delete();
  }

  await db.orm.public.MenuItem.where({ id: menuItem1.id }).delete();
  await db.orm.public.MenuItem.where({ id: menuItem2.id }).delete();
  await db.orm.public.Location.where({ id: restaurantLocation.id }).delete();

  await db.orm.public.LogisticsDriverProfile.where({ id: driverProfile.id }).delete();
  await db.orm.public.DeliveryPricingRule.where({ id: pricingRule.id }).delete();
  await db.orm.public.LogisticsSettings.where({ id: logisticsSettings.id }).delete();

  await db.orm.public.CustomerData.where({ id: customerData.id }).delete();
  await db.orm.public.Relationship.where({ id: relationship.id }).delete();

  await db.orm.public.Wallet.where({ id: restaurantWallet.id }).delete();
  await db.orm.public.Wallet.where({ id: platformWallet.id }).delete();
  await db.orm.public.Wallet.where({ id: providerWallet.id }).delete();
  await db.orm.public.Wallet.where({ id: residentWallet.id }).delete();

  await db.orm.public.MembershipRole.where({ membershipId: restaurantMembership.id }).delete();
  await db.orm.public.Membership.where({ id: restaurantMembership.id }).delete();

  await db.orm.public.Organization.where({ id: restaurantOrg.id }).delete();
  await db.orm.public.Organization.where({ id: providerOrg.id }).delete();
  await db.orm.public.Organization.where({ id: platformOrg.id }).delete();

  await db.orm.public.Account.where({ personId: merchantOwner.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: merchantOwner.person.id }).delete();
  await db.orm.public.Person.where({ id: merchantOwner.person.id }).delete();

  await db.orm.public.Account.where({ personId: driverPerson.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: driverPerson.person.id }).delete();
  await db.orm.public.Person.where({ id: driverPerson.person.id }).delete();

  await db.orm.public.Account.where({ personId: resident.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: resident.person.id }).delete();
  await db.orm.public.Person.where({ id: resident.person.id }).delete();
});
