import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";

// Mock Next.js headers & cookies for getServerSession
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import { encode } from 'next-auth/jwt';
import {
  getServiceSettings,
  updateServiceSettings,
  createOrgCustomer,
  getOrgCustomers,
  createServiceCatalogItem,
  getServiceCatalogItems,
  createServiceStaff,
  getServiceStaff,
  createServiceAppointment,
  getServiceAppointments,
  updateServiceAppointmentStatus,
  createServiceJob,
  getServiceJobs,
  updateServiceJobStatus,
  assignStaffToServiceJob,
  createServiceQuote,
  getServiceQuotes,
  createServiceInvoice,
  getServiceInvoices,
  markServiceInvoicePaid,
  getServiceRevenueStats,
  getCityBookableServices,
} from './actions/service';

async function createAuthenticatedUser(orgId: string, role = 'OWNER') {
  const testId = uuidv4().substring(0, 8);
  const email = `service-test-${testId}@example.com`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: "Pro",
    lastName: `Tech-${testId}`
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true
  });

  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true
  });

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: orgId
  });

  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role
  });

  const token = await encode({
    token: {
      email,
      name: `Pro Tech ${testId}`,
      personId: person.id,
      memberships: [{
        organizationId: orgId,
        organizationType: "SERVICES" as const,
        role: role as any
      }]
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || "super_secret_cityconnect_key_2026_!@#"
  });

  return { person, membership, token, email };
}

function setActiveUserToken(token: string | null) {
  if (token) {
    mockCookies['next-auth.session-token'] = token;
  } else {
    delete mockCookies['next-auth.session-token'];
  }
}

test('ServiceOS Reality & Production Hardening Suite', async (t) => {
  const testRunId = uuidv4().substring(0, 8);

  // 1. Setup Service Organization A and Service Organization B
  const orgA = await db.orm.public.Organization.create({
    id: `org_service_a_${testRunId}`,
    name: `Lagos Pro Services ${testRunId}`,
    type: 'SERVICES' as any,
    status: 'ACTIVE',
  });

  const orgB = await db.orm.public.Organization.create({
    id: `org_service_b_${testRunId}`,
    name: `Ikeja Quick Fix ${testRunId}`,
    type: 'SERVICES' as any,
    status: 'ACTIVE',
  });

  const userA = await createAuthenticatedUser(orgA.id, 'OWNER');
  const userB = await createAuthenticatedUser(orgB.id, 'OWNER');

  await t.test('1. Security & Authorization Boundary', async () => {
    // Unauthenticated request should fail
    setActiveUserToken(null);
    const unauthSettings = await getServiceSettings(orgA.id);
    assert.strictEqual(unauthSettings, null, 'Unauthenticated user cannot read service settings');

    // Cross-tenant request: User B attempting to read Org A settings
    setActiveUserToken(userB.token);
    const crossTenantSettings = await getServiceSettings(orgA.id);
    assert.strictEqual(crossTenantSettings, null, 'Cross-tenant user cannot read Org A settings');

    // Authenticated User A accessing Org A
    setActiveUserToken(userA.token);
    const authSettings = await getServiceSettings(orgA.id);
    assert.ok(authSettings, 'Authenticated owner can access Org A settings');
    assert.strictEqual(authSettings.organizationId, orgA.id);
  });

  await t.test('2. Settings & Module Toggles', async () => {
    setActiveUserToken(userA.token);
    const updateRes = await updateServiceSettings(orgA.id, {
      appointmentsEnabled: true,
      jobsEnabled: true,
      quotesEnabled: true,
      onlineBookingEnabled: true,
      currencySymbol: '₦',
      taxRate: 7.5,
    });
    assert.strictEqual(updateRes.success, true);

    const refreshed = await getServiceSettings(orgA.id);
    assert.strictEqual(refreshed.jobsEnabled, true);
    assert.strictEqual(refreshed.currencySymbol, '₦');
    assert.strictEqual(refreshed.taxRate, 7.5);
  });

  let customerDataId = '';
  await t.test('3. Universal CRM Customer Creation', async () => {
    setActiveUserToken(userA.token);
    const custRes = await createOrgCustomer({
      organizationId: orgA.id,
      firstName: 'Chidi',
      lastName: `Okafor-${testRunId}`,
      email: `chidi.${testRunId}@example.com`,
      phone: `0803${Math.floor(1000000 + Math.random() * 9000000)}`,
      notes: 'Prefers morning appointments',
    });

    assert.ok(custRes.success);
    assert.ok(custRes.customer);
    customerDataId = custRes.customer.id;

    const customers = await getOrgCustomers(orgA.id);
    assert.ok(customers.length >= 1);
    const found = customers.find((c: any) => c.id === customerDataId);
    assert.ok(found);
    assert.strictEqual(found.firstName, 'Chidi');
  });

  let serviceItemId = '';
  await t.test('4. Service Catalog Item Creation & City Feed', async () => {
    setActiveUserToken(userA.token);
    const srvRes = await createServiceCatalogItem({
      organizationId: orgA.id,
      name: `AC Deep Cleaning ${testRunId}`,
      price: 15000,
      durationMinutes: 90,
      description: 'Comprehensive cleaning and gas pressure check.',
      showOnFeed: true,
    });

    assert.ok(srvRes.success);
    assert.ok(srvRes.item);
    serviceItemId = srvRes.item.id;

    const items = await getServiceCatalogItems(orgA.id);
    assert.ok(items.some((i: any) => i.id === serviceItemId));

    // Verify post feed creation
    const post = await db.orm.public.Post.where({
      organizationId: orgA.id,
      linkedEntityId: serviceItemId,
    }).all().first();
    assert.ok(post, 'Post must be published to city feed upon catalog item creation');
  });

  let staffMembershipId = '';
  await t.test('5. Staff Creation & Role Verification', async () => {
    setActiveUserToken(userA.token);
    const staffRes = await createServiceStaff({
      organizationId: orgA.id,
      name: `Emeka Technician ${testRunId}`,
      role: 'TECHNICIAN',
      email: `emeka.${testRunId}@example.com`,
      phone: '08022223333',
    });

    assert.ok(staffRes.success);
    assert.ok(staffRes.staff);
    staffMembershipId = staffRes.staff.id;

    const staffList = await getServiceStaff(orgA.id);
    assert.ok(staffList.some((s: any) => s.id === staffMembershipId));
  });

  await t.test('6. Appointments & Double-Booking Prevention', async () => {
    setActiveUserToken(userA.token);
    const baseTime = new Date('2026-11-01T10:00:00Z');
    const endTime = new Date('2026-11-01T11:00:00Z');

    // 6a. Book first appointment with staff Emeka
    const apt1Res = await createServiceAppointment({
      organizationId: orgA.id,
      customerDataId,
      serviceId: serviceItemId,
      membershipId: staffMembershipId,
      startTime: baseTime,
      endTime: endTime,
      price: 15000,
      notes: 'Initial AC diagnostic',
    });

    assert.ok(apt1Res.success, 'First appointment must succeed');
    const apt1Id = apt1Res.appointment.id;

    // 6b. Attempt overlapping appointment with SAME staff (10:30 to 11:30)
    const overlappingRes = await createServiceAppointment({
      organizationId: orgA.id,
      customerDataId,
      serviceId: serviceItemId,
      membershipId: staffMembershipId,
      startTime: new Date('2026-11-01T10:30:00Z'),
      endTime: new Date('2026-11-01T11:30:00Z'),
      price: 15000,
    });

    assert.ok(overlappingRes.error, 'Overlapping appointment must be rejected');
    assert.match(overlappingRes.error, /overlapping appointment/, 'Error explains double-booking conflict');

    // 6c. Non-overlapping appointment with same staff (11:00 to 12:00)
    const nonOverlapRes = await createServiceAppointment({
      organizationId: orgA.id,
      customerDataId,
      serviceId: serviceItemId,
      membershipId: staffMembershipId,
      startTime: new Date('2026-11-01T11:00:00Z'),
      endTime: new Date('2026-11-01T12:00:00Z'),
      price: 15000,
    });
    assert.ok(nonOverlapRes.success, 'Non-overlapping appointment must succeed');

    // 6d. Update appointment status
    const statusUpdateRes = await updateServiceAppointmentStatus(apt1Id, 'CONFIRMED');
    assert.strictEqual(statusUpdateRes.success, true);
  });

  let jobId = '';
  await t.test('7. Service Jobs Lifecycle & Staff Assignment', async () => {
    setActiveUserToken(userA.token);

    // Create job
    const jobRes = await createServiceJob({
      organizationId: orgA.id,
      customerDataId,
      serviceId: serviceItemId,
      description: 'Full HVAC repair and maintenance',
      status: 'NEW',
    });

    assert.ok(jobRes.success);
    assert.ok(jobRes.job);
    jobId = jobRes.job.id;

    // Assign staff
    const assignRes = await assignStaffToServiceJob({
      organizationId: orgA.id,
      jobId,
      membershipId: staffMembershipId,
    });
    assert.strictEqual(assignRes.success, true);

    // Verify status advanced to ASSIGNED
    let jobs = await getServiceJobs(orgA.id);
    let job = jobs.find((j: any) => j.id === jobId);
    assert.ok(job);
    assert.strictEqual(job.membershipId, staffMembershipId);
    assert.strictEqual(job.status, 'ASSIGNED');

    // Advance status to IN_PROGRESS and COMPLETED
    const inProgRes = await updateServiceJobStatus({
      organizationId: orgA.id,
      jobId,
      status: 'IN_PROGRESS',
    });
    assert.strictEqual(inProgRes.success, true);

    const compRes = await updateServiceJobStatus({
      organizationId: orgA.id,
      jobId,
      status: 'COMPLETED',
    });
    assert.strictEqual(compRes.success, true);

    jobs = await getServiceJobs(orgA.id);
    job = jobs.find((j: any) => j.id === jobId);
    assert.strictEqual(job.status, 'COMPLETED');
  });

  let invoiceId = '';
  await t.test('8. Finance: Quotes, Invoices, and Revenue Stats', async () => {
    setActiveUserToken(userA.token);

    // Create Quote
    const quoteRes = await createServiceQuote({
      organizationId: orgA.id,
      customerDataId,
      total: 25000,
      discount: 2000,
      tax: 1500,
      notes: 'Valid for 14 days',
      items: [
        { description: 'Compressor Replacement', quantity: 1, unitPrice: 20000, subtotal: 20000 },
        { description: 'Refrigerant R410A', quantity: 2, unitPrice: 2500, subtotal: 5000 },
      ],
    });
    assert.ok(quoteRes.success);

    const quotes = await getServiceQuotes(orgA.id);
    assert.ok(quotes.length >= 1);

    // Create Invoice
    const invoiceRes = await createServiceInvoice({
      organizationId: orgA.id,
      customerDataId,
      jobId,
      subtotal: 30000,
      tax: 2250,
      discount: 0,
      total: 32250,
      items: [
        { description: 'Labor & Servicing', quantity: 1, unitPrice: 30000, subtotal: 30000 },
      ],
    });
    assert.ok(invoiceRes.success);
    invoiceId = invoiceRes.invoice.id;

    // Check stats before payment
    const statsBefore = await getServiceRevenueStats(orgA.id);
    assert.ok(statsBefore.pendingRevenue >= 32250, 'Pending revenue includes unpaid invoice');
    assert.strictEqual(statsBefore.totalRevenue, 0, 'No revenue collected yet');

    // Mark invoice paid
    const paidRes = await markServiceInvoicePaid({
      organizationId: orgA.id,
      invoiceId,
    });
    assert.strictEqual(paidRes.success, true);

    // Check stats after payment
    const statsAfter = await getServiceRevenueStats(orgA.id);
    assert.ok(statsAfter.totalRevenue >= 32250, 'Total revenue includes newly paid invoice');
    assert.strictEqual(statsAfter.paidCount, 1);
  });

  await t.test('9. Resident Discovery: getCityBookableServices', async () => {
    // Public resident query
    const bookable = await getCityBookableServices();
    assert.ok(bookable.length > 0, 'Bookable services returns active catalog items');
    const foundItem = bookable.find((b: any) => b.id === serviceItemId);
    assert.ok(foundItem, 'Active service catalog item is discoverable by residents');
    assert.strictEqual(foundItem.orgName, orgA.name);
    assert.strictEqual(foundItem.price, 15000);
  });

  t.after(async () => {
    try {
      // Clean up posts created for orgA / orgB
      const posts = await db.orm.public.Post.where((p: any) => p.organizationId.in([orgA.id, orgB.id])).all();
      for (const p of posts) {
        await db.orm.public.Post.where({ id: p.id }).delete();
      }
      await db.orm.public.Organization.where({ id: orgA.id }).delete();
      await db.orm.public.Organization.where({ id: orgB.id }).delete();
    } catch (e) {
      console.warn('[serviceos-reality.test] Teardown warning:', e);
    }
  });
});
