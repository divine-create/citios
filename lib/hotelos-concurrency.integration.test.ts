import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "integration-test-secret";

// 1. Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

// 2. Import the rest of the application
import { db } from '../src/prisma/db';
import { createReservation, settleFolio } from './actions/hotel';
import { encode } from 'next-auth/jwt';

async function setupAuth(orgId: string, locationId: string) {
  const testId = uuidv4().substring(0, 8);
  const email = `test-${testId}@example.com`;
  
  const person = await db.orm.public.Person.create({ firstName: "Test", lastName: "User" });
  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });
  await db.orm.public.Account.create({ personId: person.id, isActive: true });

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: orgId,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role: 'RECEPTIONIST'
  });
  await db.orm.public.MembershipLocation.create({
    membershipId: membership.id,
    locationId: locationId
  });

  const token = await encode({
    token: { 
      email, 
      name: "Test User",
      personId: person.id,
      memberships: [{
        organizationId: orgId,
        organizationType: "HOTEL" as const,
        role: "ADMIN" as const
      }]
    },
    secret: process.env.NEXTAUTH_SECRET!
  });
  mockCookies['next-auth.session-token'] = token;
  return person;
}

test('HotelOS Integration Concurrency Tests', async (t) => {
  const testRunId = `test_${uuidv4().substring(0, 8)}`;
  
  await t.test('createReservation concurrent double-booking prevention', async () => {
    const orgId = `org_${testRunId}_room`;
    const locId = `loc_${testRunId}_room`;
    const roomId = `room_${testRunId}`;

    await db.orm.public.Organization.create({ id: orgId, name: `Org`, type: "HOTEL" });
    await db.orm.public.Location.create({ id: locId, organizationId: orgId, name: `Loc` });
    await db.orm.public.HotelRoom.create({
      id: roomId, organizationId: orgId, locationId: locId, roomNumber: "101", type: "King", baseRate: 100, status: "CLEAN"
    });

    await setupAuth(orgId, locId);

    const p1 = createReservation({
      organizationId: orgId, roomId: roomId, guestName: "Alice",
      checkInDate: "2026-10-01", checkOutDate: "2026-10-05"
    }).catch(e => ({ error: e.message }));

    const p2 = createReservation({
      organizationId: orgId, roomId: roomId, guestName: "Bob",
      checkInDate: "2026-10-01", checkOutDate: "2026-10-05"
    }).catch(e => ({ error: e.message }));

    const results = await Promise.all([p1, p2]);
    const successes = results.filter(r => (r as any).success);
    const errors = results.filter(r => (r as any).error);

    assert.strictEqual(successes.length, 1, 'Exactly one reservation should succeed');
    assert.strictEqual(errors.length, 1, 'Exactly one reservation should be rejected');

    const reservations = await db.orm.public.Reservation.where({ roomId }).all();
    assert.strictEqual(reservations.length, 1, 'Only one reservation must exist in the database');
  });

  await t.test('createReservation non-overlapping check', async () => {
    const orgId = `org_${testRunId}_nonoverlap`;
    const locId = `loc_${testRunId}_nonoverlap`;
    const roomId = `room_${testRunId}_nonoverlap`;

    await db.orm.public.Organization.create({ id: orgId, name: `Org`, type: "HOTEL" });
    await db.orm.public.Location.create({ id: locId, organizationId: orgId, name: `Loc` });
    await db.orm.public.HotelRoom.create({
      id: roomId, organizationId: orgId, locationId: locId, roomNumber: "102", type: "King", baseRate: 100, status: "CLEAN"
    });

    await setupAuth(orgId, locId);

    const r1 = await createReservation({
      organizationId: orgId, roomId: roomId, guestName: "Alice",
      checkInDate: "2026-10-01", checkOutDate: "2026-10-03"
    });
    assert.strictEqual((r1 as any).success, true);

    const r2 = await createReservation({
      organizationId: orgId, roomId: roomId, guestName: "Bob",
      checkInDate: "2026-10-03", checkOutDate: "2026-10-05"
    });
    assert.strictEqual((r2 as any).success, true);

    const reservations = await db.orm.public.Reservation.where({ roomId }).all();
    assert.strictEqual(reservations.length, 2, 'Both non-overlapping reservations should succeed');
  });

  await t.test('settleFolio concurrent financial settlement', async () => {
    const orgId = `org_${testRunId}_fin`;
    const locId = `loc_${testRunId}_fin`;
    const roomId = `room_${testRunId}_fin`;
    const walletId = `wallet_${testRunId}`;

    await db.orm.public.Organization.create({ id: orgId, name: `Org`, type: "HOTEL" });
    await db.orm.public.Location.create({ id: locId, organizationId: orgId, name: `Loc` });
    await db.orm.public.HotelRoom.create({
      id: roomId, organizationId: orgId, locationId: locId, roomNumber: "103", type: "King", baseRate: 100, status: "CLEAN"
    });
    await db.orm.public.Wallet.create({ id: walletId, organizationId: orgId, balance: 0, currency: "USD" });

    const person = await setupAuth(orgId, locId);

    const resResult = await createReservation({
      organizationId: orgId, roomId: roomId, guestName: "Charlie",
      checkInDate: "2026-10-01", checkOutDate: "2026-10-05"
    });
    assert.strictEqual((resResult as any).success, true);
    const reservationId = (resResult as any).reservationId as string;

    // Add folio charge (reservation already has paymentStatus PENDING from createReservation)
    await db.orm.public.FolioCharge.create({ reservationId, amount: 500, description: "Room" });
    const guestWallet = await db.orm.public.Wallet.create({ personId: person.id, balance: 1000, currency: "USD" });
    
    // We must manually link the reservation to the guest relationship for settleFolio
    const relationship = await db.orm.public.Relationship.create({
      personId: person.id, organizationId: orgId, type: "CUSTOMER"
    });
    await db.orm.public.Reservation.where({ id: reservationId }).update({ guestRelationshipId: relationship.id });

    // Fire two settlement requests concurrently
    const p1 = settleFolio(reservationId).catch(e => ({ error: e.message }));
    const p2 = settleFolio(reservationId).catch(e => ({ error: e.message }));

    const results = await Promise.all([p1, p2]);
    const walletDebits = results.filter(r => (r as any).paidViaWallet === true);

    // Only one concurrent settlement should have actually debited the wallet.
    // The other concurrent call may still return success=true (idempotent API)
    // but must NOT have created a second wallet transaction.
    assert.strictEqual(walletDebits.length, 1, 'Only one settlement should debit the wallet');

    const wallet = await db.orm.public.Wallet.where({ id: walletId }).all().first();
    // 4 nights × $100 base rate = $400 room totalPrice + $500 folio charge = $900 total
    assert.strictEqual(wallet?.balance, 900, 'Hotel wallet balance incremented exactly once');

    const guestW = await db.orm.public.Wallet.where({ id: guestWallet.id }).all().first();
    assert.strictEqual(guestW?.balance, 100, 'Guest wallet balance decremented exactly once');
  });

  await db.close();
});
