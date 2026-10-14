import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/src/prisma/db';
import { ingestOpenStreetMapData, ingestCuratedSmeBatch, mapOsmTagToOrgType } from '@/lib/actions/ingestion';
import { submitCustomerEnquiry } from '@/lib/actions/enquiry';
import { processOutboxBatch, sendResendEmail } from '@/lib/email/resend';
import { submitOrganizationClaim, reviewOrganizationClaim, getPendingOrganizationClaims } from '@/lib/actions/claim';
import {
  getScrapedDiscoveryListings,
  updateAndApproveListing,
  rejectScrapedListing,
} from '@/lib/actions/discovery-admin';
import { searchCityExplore } from '@/app/actions/explore';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

// Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v })),
});

function toTemporal(date: Date = new Date()) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

async function createTestSession(person: any) {
  const email = `test-${person.id.slice(0, 8)}@cityos.test`;
  const existingIdent = await db.orm.public.PersonIdentifier.where({ personId: person.id, type: 'EMAIL' }).all().first();
  if (!existingIdent) {
    await db.orm.public.PersonIdentifier.create({
      personId: person.id,
      type: 'EMAIL',
      normalizedValue: email,
      isVerified: true,
    });
  }
  const existingAccount = await db.orm.public.Account.where({ personId: person.id }).all().first();
  if (!existingAccount) {
    await db.orm.public.Account.create({
      personId: person.id,
      isActive: true,
    });
  }

  const token = await encode({
    token: {
      email,
      name: `${person.firstName} ${person.lastName}`,
      personId: person.id,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });
  return token;
}

test('Business Discovery, Lead Routing & Profile Claiming Suite', async (t) => {
  const runId = uuidv4().slice(0, 6);
  const businessName = `Olumo Bistro ${runId}`;
  const businessEmail = `bistro-${runId}@olumo.ng`;

  // Ensure test city exists
  const citySlug = `test-city-${runId}`;
  const city = await db.orm.public.City.create({
    id: uuidv4(),
    name: 'Abeokuta',
    slug: citySlug,
    country: 'Nigeria',
    state: 'Ogun',
    currency: 'NGN',
    isActive: true,
  });

  // Ensure test Person exists (for claimant and admin)
  const claimantPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Tunde',
    lastName: 'Adeleke',
    isSystemAdmin: false,
  });

  const adminPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'System',
    lastName: 'Administrator',
    isSystemAdmin: true,
  });

  const claimantToken = await createTestSession(claimantPerson);
  const adminToken = await createTestSession(adminPerson);

  // --- TEST 1: Tag Mapping & Normalization ---
  await t.test('1. mapOsmTagToOrgType correctly maps OSM tags to CityOS verticals', () => {
    assert.strictEqual(mapOsmTagToOrgType({ amenity: 'restaurant' }), 'RESTAURANT');
    assert.strictEqual(mapOsmTagToOrgType({ amenity: 'cafe' }), 'RESTAURANT');
    assert.strictEqual(mapOsmTagToOrgType({ shop: 'supermarket' }), 'RETAIL');
    assert.strictEqual(mapOsmTagToOrgType({ tourism: 'hotel' }), 'HOTEL');
    assert.strictEqual(mapOsmTagToOrgType({ amenity: 'school' }), 'SCHOOL');
    assert.strictEqual(mapOsmTagToOrgType({ amenity: 'pharmacy' }), 'PHARMACY');
    assert.strictEqual(mapOsmTagToOrgType({ amenity: 'clinic' }), 'HEALTHCARE');
    assert.strictEqual(mapOsmTagToOrgType({ office: 'lawyer' }), 'SERVICES');
  });

  // --- TEST 2: Ingestion & Unclaimed Business Provisioning ---
  let ingestedOrgId: string = '';
  await t.test('2. Ingestion provisions unclaimed Organization, Location, Listing & Contact Points', async () => {
    const rawElements = [
      {
        id: Math.floor(Math.random() * 1000000),
        type: 'node' as const,
        lat: 7.155,
        lon: 3.345,
        tags: {
          name: businessName,
          amenity: 'restaurant',
          'addr:street': '12 Ikija Road',
          phone: '08031234567',
          email: businessEmail,
          website: 'https://olumobistro.ng',
        },
      },
    ];

    const result = await ingestOpenStreetMapData(city.slug, rawElements);
    assert.strictEqual(result.created, 1);
    assert.strictEqual(result.updated, 0);

    // Verify Organization was created without owner membership
    const org = await db.orm.public.Organization.where({ name: businessName }).all().first();
    assert.ok(org, 'Organization must exist');
    assert.strictEqual(org.type, 'RESTAURANT');
    ingestedOrgId = org.id;

    const memberships = await db.orm.public.Membership.where({ organizationId: org.id }).all();
    assert.strictEqual(memberships.length, 0, 'Unclaimed business must have 0 memberships');

    // Verify Location and Listing
    const location = await db.orm.public.Location.where({ organizationId: org.id }).all().first();
    assert.ok(location, 'Location must exist');
    assert.strictEqual(location.cityId, city.id);
    assert.strictEqual(location.latitude, 7.155);

    const listing = await db.orm.public.DiscoveryListing.where({ organizationId: org.id }).all().first();
    assert.ok(listing, 'DiscoveryListing must exist');
    assert.strictEqual(listing.isActive, true);

    // Verify Contact Points
    const contactPoints = await db.orm.public.OrganizationContactPoint.where({ organizationId: org.id }).all();
    assert.strictEqual(contactPoints.length, 3);
    const emailCp = contactPoints.find((c) => c.type === 'EMAIL');
    assert.strictEqual(emailCp?.value, businessEmail);
    const phoneCp = contactPoints.find((c) => c.type === 'PHONE');
    assert.strictEqual(phoneCp?.value, '+2348031234567');

    // Verify Source Observation
    const obs = await db.orm.public.SourceObservation.where({ organizationId: org.id }).all();
    assert.strictEqual(obs.length, 1);
    assert.strictEqual(obs[0].confidenceScore, 0.9);
  });

  // --- TEST 3: Deduplication & Idempotent Ingestion ---
  await t.test('3. Re-ingesting existing business updates provenance without duplicating organizations', async () => {
    const rawElements = [
      {
        id: Math.floor(Math.random() * 1000000),
        type: 'node' as const,
        tags: {
          name: businessName, // Exact match in same city
          amenity: 'restaurant',
          'addr:street': '12 Ikija Road, Updated',
        },
      },
    ];

    const result = await ingestOpenStreetMapData(city.slug, rawElements);
    assert.strictEqual(result.created, 0);
    assert.strictEqual(result.updated, 1);

    // Org count must remain 1
    const allOrgs = await db.orm.public.Organization.where({ name: businessName }).all();
    assert.strictEqual(allOrgs.length, 1);

    // Provenance observations incremented to 2
    const obs = await db.orm.public.SourceObservation.where({ organizationId: ingestedOrgId }).all();
    assert.strictEqual(obs.length, 2);
  });

  // --- TEST 4: Curated SME Ingestion Batch ---
  await t.test('4. ingestCuratedSmeBatch imports directory records with verified confidence', async () => {
    const smeRecords = [
      {
        name: `Kano Spice Bazaar ${runId}`,
        category: 'RETAIL',
        address: '5 Kurmi Market Way',
        email: `spices-${runId}@kanobazaar.ng`,
        phone: '08129876543',
        description: 'Authentic northern spices and grains.',
        latitude: 12.002,
        longitude: 8.591,
      },
    ];

    const res = await ingestCuratedSmeBatch('Curated SME Directory 2026', city.slug, smeRecords);
    assert.strictEqual(res.created, 1);

    const org = await db.orm.public.Organization.where({ name: `Kano Spice Bazaar ${runId}` }).all().first();
    assert.ok(org);
    assert.strictEqual(org.type, 'RETAIL');

    const obs = await db.orm.public.SourceObservation.where({ organizationId: org.id }).all();
    assert.strictEqual(obs.length, 1);
    assert.strictEqual(obs[0].confidenceScore, 1.0);
  });

  // --- TEST 5: Customer Enquiry Submission & Outbox Persistence ---
  let enquiryId: string = '';
  await t.test('5. submitCustomerEnquiry atomically persists enquiry, delivery, and outbox event', async () => {
    const input = {
      organizationId: ingestedOrgId,
      customerName: 'Chidi Okonkwo',
      customerEmail: 'chidi@example.com',
      customerPhone: '08123456789',
      serviceRequested: 'Table for 6 anniversary dinner',
      message: 'Hello, we would like to reserve a private booth this Friday evening.',
      consentGiven: true,
      idempotencyKey: `enq_${runId}_1`,
    };

    const res = await submitCustomerEnquiry(input);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.routable, true);
    assert.ok(res.enquiryId);
    enquiryId = res.enquiryId!;

    // Verify Enquiry in DB
    const enquiry = await db.orm.public.CustomerEnquiry.where({ id: enquiryId }).all().first();
    assert.ok(enquiry);
    assert.strictEqual(enquiry.customerName, 'Chidi Okonkwo');
    assert.strictEqual(enquiry.status, 'ACCEPTED');

    // Verify MessageDelivery
    const delivery = await db.orm.public.MessageDelivery.where({ enquiryId }).all().first();
    assert.ok(delivery);
    assert.strictEqual(delivery.recipientEmail, businessEmail);
    assert.strictEqual(delivery.status, 'QUEUED');

    // Verify OutboxEvent
    const outbox = await db.orm.public.OutboxEvent.where({ status: 'PENDING' }).all();
    const event = outbox.find((o) => o.payload.includes(enquiryId));
    assert.ok(event, 'Outbox event must be queued for delivery');
  });

  // --- TEST 6: Outbox Batch Dispatch via Resend ---
  await t.test('6. processOutboxBatch dispatches queued emails and transitions delivery status', async () => {
    const batchResult = await processOutboxBatch(10);
    assert.ok(batchResult.processed >= 1);
    assert.ok(batchResult.succeeded >= 1);

    // Verify MessageDelivery status transitioned to ACCEPTED_BY_PROVIDER
    const delivery = await db.orm.public.MessageDelivery.where({ enquiryId }).all().first();
    assert.strictEqual(delivery?.status, 'ACCEPTED_BY_PROVIDER');
    assert.ok(delivery?.providerMessageId);

    // Verify OutboxEvent marked COMPLETED
    const outbox = await db.orm.public.OutboxEvent.all();
    const event = outbox.find((o) => o.payload.includes(enquiryId));
    assert.strictEqual(event?.status, 'COMPLETED');
  });

  // --- TEST 7: Suppression List Enforcement ---
  await t.test('7. Suppressed emails are blocked before dispatch without retry spam', async () => {
    const deadEmail = `bounced-${runId}@deadmailbox.com`;
    await db.orm.public.SuppressionEntry.create({
      id: uuidv4(),
      type: 'EMAIL',
      value: deadEmail,
      reason: 'BOUNCE',
    });

    const sendRes = await sendResendEmail({
      to: deadEmail,
      subject: 'Test lead',
      html: '<p>Lead test</p>',
    });

    assert.strictEqual(sendRes.success, false);
    assert.strictEqual(sendRes.isSuppressed, true);
  });

  // --- TEST 8: Document-free Profile Claiming & Admin Verification ---
  await t.test('8. Document-free business claim (Phone, Address, Name) and admin verification', async () => {
    // 1. Submit claim as claimant (no document uploads, strictly contact & address info)
    mockCookies['next-auth.session-token'] = claimantToken;

    const claimRes = await submitOrganizationClaim({
      organizationId: ingestedOrgId,
      claimantName: 'Tunde Adeleke',
      claimantPhone: '08031234567',
      businessAddress: '12 Ikija Road, Abeokuta',
      businessRole: 'Owner / Founder',
      notes: 'Operating physically at this address daily. Contact me in the afternoon.',
    });

    assert.strictEqual(claimRes.success, true);
    assert.ok(claimRes.claimId);
    const claimId = claimRes.claimId!;

    // 2. Non-admin cannot review claim
    await assert.rejects(
      async () => {
        await reviewOrganizationClaim(claimId, 'APPROVE');
      },
      /FORBIDDEN: Only system administrators/
    );

    // 3. Admin fetches pending claims and verifies submitted Phone, Address, and Name
    mockCookies['next-auth.session-token'] = adminToken;
    const pendingClaims = await getPendingOrganizationClaims();
    const targetClaim = pendingClaims.find((c: any) => c.id === claimId);
    assert.ok(targetClaim, 'Pending claim must be visible in admin queue');
    assert.strictEqual(targetClaim.submittedInfo.name, 'Tunde Adeleke');
    assert.strictEqual(targetClaim.submittedInfo.phone, '+2348031234567');
    assert.strictEqual(targetClaim.submittedInfo.address, '12 Ikija Road, Abeokuta');
    assert.strictEqual(targetClaim.submittedInfo.role, 'Owner / Founder');

    // 4. Admin approves claim after verifying information
    const reviewRes = await reviewOrganizationClaim(claimId, 'APPROVE', 'Verified phone call and confirmed shop presence at address.');
    assert.strictEqual(reviewRes.success, true);
    assert.strictEqual(reviewRes.status, 'APPROVED');

    // 5. Verify Claimant now has canonical Membership with OWNER role
    const membership = await db.orm.public.Membership.where({
      organizationId: ingestedOrgId,
      personId: claimantPerson.id,
    }).all().first();

    assert.ok(membership, 'Membership must exist');

    const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
    assert.ok(roles.some((r) => r.role === 'OWNER'), 'Must have OWNER role');

    // 6. Verify Organization Wallet was provisioned
    const wallet = await db.orm.public.Wallet.where({ organizationId: ingestedOrgId }).all().first();
    assert.ok(wallet, 'Organization Wallet must be provisioned');
    assert.strictEqual(wallet.currency, 'NGN');
  });

  // --- TEST 9: Staged ingestion + admin edit/approve/reject ---
  await t.test('9. Staged listings are hidden until an admin edits and approves them', async () => {
    const stagedName = `OLUMO STAGED CAFE ${runId}`;
    const rejectName = `Reject Me Shop ${runId}`;

    await ingestOpenStreetMapData(
      city.slug,
      [
        { id: 900001, type: 'node' as const, lat: 7.1, lon: 3.3, tags: { name: stagedName, amenity: 'cafe' } },
        { id: 900002, type: 'node' as const, lat: 7.2, lon: 3.4, tags: { name: rejectName, shop: 'clothes' } },
      ],
      { autoPublish: false }
    );

    // Invisible to residents (query by the staged names, not runId, which also matches earlier published tests)
    const before = await searchCityExplore(city.slug, stagedName, 'All');
    assert.strictEqual(before.organizations.length, 0, 'Staged listings must not be public');
    const beforeReject = await searchCityExplore(city.slug, rejectName, 'All');
    assert.strictEqual(beforeReject.organizations.length, 0, 'Staged listings must not be public');

    // Non-admin is blocked
    mockCookies['next-auth.session-token'] = claimantToken;
    await assert.rejects(() => getScrapedDiscoveryListings(), /FORBIDDEN/);

    // Admin sees both in pending queue
    mockCookies['next-auth.session-token'] = adminToken;
    const pending = await getScrapedDiscoveryListings({ status: 'PENDING_REVIEW', cityId: city.id });
    const staged = pending.find((l: any) => l.title === stagedName);
    const toReject = pending.find((l: any) => l.title === rejectName);
    assert.ok(staged && toReject, 'Both staged listings are in the queue');

    // Admin edits and approves
    const approved = await updateAndApproveListing({
      listingId: staged.id,
      title: `Olumo Staged Cafe ${runId}`,
      vertical: 'RESTAURANT',
      address: '3 Customs Street, Abeokuta',
      phone: '08055550000',
      email: `cafe-${runId}@olumo.ng`,
      description: 'Corrected by admin.',
    });
    assert.ok(approved.success, approved.error);

    const after = await searchCityExplore(city.slug, `Olumo Staged Cafe ${runId}`, 'All');
    const live = after.organizations.find((o: any) => o.name === `Olumo Staged Cafe ${runId}`);
    assert.ok(live, 'Approved listing is public with the edited name');

    const cps = await db.orm.public.OrganizationContactPoint.where({ organizationId: staged.organizationId }).all();
    assert.ok(cps.some((c) => c.type === 'PHONE' && c.value === '+2348055550000'));
    assert.ok(cps.some((c) => c.type === 'EMAIL' && c.value === `cafe-${runId}@olumo.ng`));

    // Admin rejects the other; it leaves the pending queue and stays hidden
    const rej = await rejectScrapedListing(toReject.id, 'Not a real business');
    assert.ok(rej.success);
    const pendingAfter = await getScrapedDiscoveryListings({ status: 'PENDING_REVIEW', cityId: city.id });
    assert.ok(!pendingAfter.some((l: any) => l.id === toReject.id));
    const rejected = await getScrapedDiscoveryListings({ status: 'REJECTED', cityId: city.id });
    assert.ok(rejected.some((l: any) => l.id === toReject.id));
    const hidden = await searchCityExplore(city.slug, rejectName, 'All');
    assert.strictEqual(hidden.organizations.length, 0);
  });
});
