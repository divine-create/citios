import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/prisma/db';
import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import { createRequire } from 'module';
import {
  isHotelOSReservationEnabled,
  bookResidentHotelReservation,
  updateHotelSettings,
  getAuthoritativeHotelListing,
  checkHotelRoomAvailability,
  checkHotelRoomsAvailability,
} from './actions/hotel';
import {
  resolveHotelWhatsAppDestination,
  processHotelWhatsAppCheckout,
} from '../app/actions/checkout';
import { getDefaultHotelWhatsApp } from './actions/stays';
import { initiateCheckout } from '../app/actions/payment';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

async function setSessionForPerson(person: any) {
  const email = `wa-hotel-${person.id.slice(0, 8)}@cityos.test`;
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
    secret: (authOptions.secret as string) || "cityos-jwt-secret-key-2026",
  });

  const cookieName = process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('Hotel Reservations & WhatsApp Fallback Product Rule Suite', async (t) => {
  // Setup Test Resident
  const resident = await db.orm.public.Person.create({
    firstName: 'Amaka',
    lastName: 'Eze',
  });

  await db.orm.public.ResidentProfile.create({
    personId: resident.id,
    phone: '08139876543',
  });

  await setSessionForPerson(resident);

  // Setup Test Hotel 1: HotelOS Enabled & Operational
  const operationalHotel = await db.orm.public.Organization.create({
    name: 'Transcorp Metropolitan Hotel',
    type: 'HOTEL',
    status: 'ACTIVE',
    address: 'Murtala Mohammed Highway, Calabar',
  });

  const operationalRoom = await db.orm.public.HotelRoom.create({
    organizationId: operationalHotel.id,
    roomNumber: '101',
    type: 'Deluxe',
    status: 'CLEAN',
    baseRate: 45000,
  });

  // Setup Test Hotel 2: Hotel without operational rooms (WhatsApp-only)
  const unconfiguredHotel = await db.orm.public.Organization.create({
    name: 'Heritage Boutique Lodge',
    type: 'HOTEL',
    status: 'ACTIVE',
    address: 'Diamond Hill, Calabar',
  });

  // Setup Test Hotel 3: Merchant with custom configured WhatsApp contact
  const customWhatsAppHotel = await db.orm.public.Organization.create({
    name: 'Calabar Grand Suites',
    type: 'HOTEL',
    status: 'ACTIVE',
    address: 'Marian Road, Calabar',
  });

  await db.orm.public.OrganizationContactPoint.create({
    organizationId: customWhatsAppHotel.id,
    type: 'WHATSAPP',
    value: '+234 812 999 8877',
    isPrimary: true,
    isVerified: true,
  });

  // Dates for testing
  const futureCheckIn = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const futureCheckOut = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // --------------------------------------------------------------------------
  // Requirement 1: HotelOS-enabled hotels continue using configured reservation flow
  // --------------------------------------------------------------------------
  await t.test('1. HotelOS-enabled hotels continue using their configured reservation flow', async () => {
    const isEnabled = await isHotelOSReservationEnabled(operationalHotel.id);
    assert.strictEqual(isEnabled, true, 'Operational hotel with rooms must have HotelOS enabled');

    const res = await bookResidentHotelReservation({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      guestName: 'Amaka Eze',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.reservationId, 'Must return confirmed reservation ID');
    assert.strictEqual(res.totalPrice, 90000, '2 nights at 45,000 = 90,000 NGN');

    // Verify reservation status in database
    const dbReservation = await db.orm.public.Reservation.where({ id: res.reservationId }).all().first();
    assert.ok(dbReservation);
    assert.strictEqual(dbReservation.status, 'CONFIRMED');
    assert.strictEqual(dbReservation.paymentStatus, 'PENDING');
    assert.strictEqual(dbReservation.guestName, 'Amaka Eze');
  });

  // --------------------------------------------------------------------------
  // Requirement 2: Hotels without configured reservation functionality default to WhatsApp
  // --------------------------------------------------------------------------
  await t.test('2. Hotels without configured reservation functionality default to WhatsApp', async () => {
    const isEnabled = await isHotelOSReservationEnabled(unconfiguredHotel.id);
    assert.strictEqual(isEnabled, false, 'Hotel without rooms must NOT have HotelOS reservation enabled');

    // Attempting direct resident reservation on unconfigured hotel must be rejected
    const bookAttempt = await bookResidentHotelReservation({
      organizationId: unconfiguredHotel.id,
      roomId: 'invalid-room-id',
      guestName: 'Amaka Eze',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
    });
    assert.ok(bookAttempt.error, 'Must reject resident booking on unconfigured hotel');
    assert.match(bookAttempt.error, /WhatsApp/i);

    // Default WhatsApp enquiry flow succeeds
    const enquiry = await processHotelWhatsAppCheckout({
      organizationId: unconfiguredHotel.id,
      guestName: 'Amaka Eze',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
      guestsCount: 2,
    });
    assert.strictEqual(enquiry.success, true);
    assert.ok(enquiry.whatsappUrl, 'Must return WhatsApp deep link');
  });

  // --------------------------------------------------------------------------
  // Requirement 3: Default WhatsApp destination is +2348065373747 (2348065373747)
  // --------------------------------------------------------------------------
  await t.test('3. Default WhatsApp destination is +2348065373747', async () => {
    assert.strictEqual(await getDefaultHotelWhatsApp(), '2348065373747');

    const destination = await resolveHotelWhatsAppDestination(unconfiguredHotel.id);
    assert.strictEqual(destination, '2348065373747', 'Unconfigured hotel must resolve to default +2348065373747');

    const enquiry = await processHotelWhatsAppCheckout({
      organizationId: unconfiguredHotel.id,
      guestName: 'Amaka Eze',
    });
    assert.match(enquiry.whatsappUrl!, /^https:\/\/wa\.me\/2348065373747\?text=/);
  });

  // --------------------------------------------------------------------------
  // Requirement 4: Valid hotel-specific WhatsApp number overrides the default
  // --------------------------------------------------------------------------
  await t.test('4. A valid hotel-specific WhatsApp number overrides the default', async () => {
    const destination = await resolveHotelWhatsAppDestination(customWhatsAppHotel.id);
    assert.strictEqual(destination, '2348129998877', 'Configured merchant contact must override default');

    const enquiry = await processHotelWhatsAppCheckout({
      organizationId: customWhatsAppHotel.id,
      guestName: 'Amaka Eze',
    });
    assert.match(enquiry.whatsappUrl!, /^https:\/\/wa\.me\/2348129998877\?text=/);
  });

  // --------------------------------------------------------------------------
  // Requirement 5: WhatsApp links contain correctly encoded booking enquiry details
  // --------------------------------------------------------------------------
  await t.test('5. WhatsApp links contain correctly encoded booking enquiry details', async () => {
    const enquiry = await processHotelWhatsAppCheckout({
      organizationId: operationalHotel.id,
      hotelName: 'Transcorp Metropolitan Hotel',
      roomId: operationalRoom.id,
      guestName: 'Amaka Eze',
      guestPhone: '08139876543',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
      guestsCount: 2,
      enquiryText: 'Do you offer late checkout on Sundays?',
    });

    assert.strictEqual(enquiry.success, true);
    assert.ok(enquiry.whatsappUrl);

    const encodedText = enquiry.whatsappUrl.split('?text=')[1];
    const decodedMessage = decodeURIComponent(encodedText);

    assert.match(decodedMessage, /STAY & HOTEL BOOKING ENQUIRY/);
    assert.match(decodedMessage, /Transcorp Metropolitan Hotel/);
    assert.match(decodedMessage, /Deluxe Room/);
    assert.match(decodedMessage, /Room #101/);
    assert.match(decodedMessage, /Amaka Eze/);
    assert.match(decodedMessage, /08139876543/);
    assert.match(decodedMessage, new RegExp(futureCheckIn));
    assert.match(decodedMessage, new RegExp(futureCheckOut));
    assert.match(decodedMessage, /2 nights/);
    assert.match(decodedMessage, /Do you offer late checkout on Sundays\?/);
  });

  // --------------------------------------------------------------------------
  // Requirement 6: Opening WhatsApp does not falsely confirm a reservation or payment
  // --------------------------------------------------------------------------
  await t.test('6. Opening WhatsApp does not falsely confirm a reservation or payment', async () => {
    const resCountBefore = (await db.orm.public.Reservation.where({ organizationId: unconfiguredHotel.id }).all()).length;
    const paymentCountBefore = (await db.orm.public.Payment.all()).length;
    const txnCountBefore = (await db.orm.public.Transaction.all()).length;

    const enquiry = await processHotelWhatsAppCheckout({
      organizationId: unconfiguredHotel.id,
      guestName: 'Amaka Eze',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
      guestsCount: 1,
    });

    assert.strictEqual(enquiry.success, true);
    assert.ok(enquiry.whatsappUrl);

    // Verify 0 reservations, 0 payments, 0 transactions created
    const resCountAfter = (await db.orm.public.Reservation.where({ organizationId: unconfiguredHotel.id }).all()).length;
    const paymentCountAfter = (await db.orm.public.Payment.all()).length;
    const txnCountAfter = (await db.orm.public.Transaction.all()).length;

    assert.strictEqual(resCountAfter, resCountBefore, 'No reservation rows created by WhatsApp enquiry');
    assert.strictEqual(paymentCountAfter, paymentCountBefore, 'No payment rows created by WhatsApp enquiry');
    assert.strictEqual(txnCountAfter, txnCountBefore, 'No transactions created by WhatsApp enquiry');
  });

  // --------------------------------------------------------------------------
  // Requirement 7: HotelOS configuration and payment settings cannot be bypassed by client requests
  // --------------------------------------------------------------------------
  await t.test('7. HotelOS configuration and payment settings cannot be bypassed by manipulating client requests', async () => {
    // Malicious/tampered client attempts to initiate wallet payment for WhatsApp-only hotel
    const tamperedWalletCheckout = await initiateCheckout({
      kind: 'hotel',
      method: 'wallet',
      items: [
        {
          productId: 'bogus-room-id',
          qty: 1,
          name: 'Amaka Eze',
          checkInDate: futureCheckIn,
          checkOutDate: futureCheckOut,
          organizationId: unconfiguredHotel.id,
        } as any,
      ],
    });

    assert.ok(tamperedWalletCheckout.error, 'Must reject wallet checkout for unconfigured hotel');
    assert.match(tamperedWalletCheckout.error, /WhatsApp/i);

    // Malicious/tampered client attempts to initiate card payment for hotel with disabled reservations
    const disabledHotel = await db.orm.public.Organization.create({
      name: 'Grand Disable Lodge',
      type: 'HOTEL',
      status: 'ACTIVE',
    });

    await db.orm.public.HotelRoom.create({
      organizationId: disabledHotel.id,
      roomNumber: '999',
      type: 'Standard',
      status: 'CLEAN',
      baseRate: 20000,
    });

    const city = await db.orm.public.City.all().first();
    let cityId = city?.id;
    if (!cityId) {
      const newCity = await db.orm.public.City.create({
        name: 'Calabar',
        slug: 'calabar',
        state: 'Cross River',
        country: 'Nigeria',
      });
      cityId = newCity.id;
    }

    // Explicitly disable reservations in listing metadata
    await db.orm.public.DiscoveryListing.create({
      organizationId: disabledHotel.id,
      cityId,
      slug: `hotel-disabled-${disabledHotel.id.slice(0, 8)}`,
      title: 'Grand Disable Lodge',
      vertical: 'HOTEL',
      metadata: JSON.stringify({ reservationEnabled: false, bookingEnabled: false }),
    });

    const isEnabled = await isHotelOSReservationEnabled(disabledHotel.id);
    assert.strictEqual(isEnabled, false, 'Explicitly disabled hotel must return false');

    const tamperedCardCheckout = await initiateCheckout({
      kind: 'hotel',
      method: 'card',
      items: [
        {
          productId: 'some-room-id',
          qty: 1,
          name: 'Amaka Eze',
          checkInDate: futureCheckIn,
          checkOutDate: futureCheckOut,
          organizationId: disabledHotel.id,
        } as any,
      ],
    });

    assert.ok(tamperedCardCheckout.error, 'Must reject gateway card checkout for disabled hotel');
    assert.match(tamperedCardCheckout.error, /WhatsApp/i);
  });

  // --------------------------------------------------------------------------
  // Requirement 8: Cross-organization room injection is strictly prevented
  // --------------------------------------------------------------------------
  await t.test('8. Cross-organization room injection is strictly rejected without records', async () => {
    // Hotel B setup
    const hotelB = await db.orm.public.Organization.create({
      name: 'Calabar Residency Suites',
      type: 'HOTEL',
      status: 'ACTIVE',
    });

    const roomB = await db.orm.public.HotelRoom.create({
      organizationId: hotelB.id,
      roomNumber: '505',
      type: 'Presidential Suite',
      status: 'CLEAN',
      baseRate: 85000,
    });

    const resCountBefore = (await db.orm.public.Reservation.all()).length;
    const paymentCountBefore = (await db.orm.public.Payment.all()).length;

    // Attacker passes operationalHotel.id (Org A) but roomId of Hotel B (Org B)
    const injectionAttempt = await bookResidentHotelReservation({
      organizationId: operationalHotel.id,
      roomId: roomB.id,
      guestName: 'Attacker Attempt',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
    });

    assert.strictEqual(injectionAttempt.success, false);
    assert.match(injectionAttempt.error!, /Room not found/i);

    // Verify no reservation or financial records created
    const resCountAfter = (await db.orm.public.Reservation.all()).length;
    const paymentCountAfter = (await db.orm.public.Payment.all()).length;
    assert.strictEqual(resCountAfter, resCountBefore, 'No reservation records written');
    assert.strictEqual(paymentCountAfter, paymentCountBefore, 'No payment records written');

    const roomBReservations = await db.orm.public.Reservation.where({ roomId: roomB.id }).all();
    assert.strictEqual(roomBReservations.length, 0, 'Room B has 0 reservations');
  });

  // --------------------------------------------------------------------------
  // Requirement 9: Invalid booking dates are rejected before reservation or payment
  // --------------------------------------------------------------------------
  await t.test('9. Invalid booking dates are rejected before reservation or payment', async () => {
    // 9.1 Check-in equal to check-out (0 nights)
    const sameDayAttempt = await bookResidentHotelReservation({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      guestName: 'Amaka Eze',
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckIn,
    });
    assert.strictEqual(sameDayAttempt.success, false);
    assert.match(sameDayAttempt.error!, /after check-in/i);

    // 9.2 Check-in after check-out (inverted interval)
    const invertedDateAttempt = await bookResidentHotelReservation({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      guestName: 'Amaka Eze',
      checkInDate: futureCheckOut,
      checkOutDate: futureCheckIn,
    });
    assert.strictEqual(invertedDateAttempt.success, false);
    assert.match(invertedDateAttempt.error!, /after check-in/i);

    // 9.3 Invalid date format
    const invalidDateAttempt = await bookResidentHotelReservation({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      guestName: 'Amaka Eze',
      checkInDate: 'not-a-valid-date',
      checkOutDate: 'invalid-date',
    });
    assert.strictEqual(invalidDateAttempt.success, false);
    assert.match(invalidDateAttempt.error!, /Invalid dates/i);

    // 9.4 Payment gateway checkout rejects invalid dates
    const invalidGatewayCheckout = await initiateCheckout({
      kind: 'hotel',
      method: 'card',
      items: [
        {
          productId: operationalRoom.id,
          organizationId: operationalHotel.id,
          name: 'Amaka Eze',
          qty: 1,
          checkInDate: futureCheckOut,
          checkOutDate: futureCheckIn,
        } as any,
      ],
    });
    assert.ok(invalidGatewayCheckout.error);
    assert.match(invalidGatewayCheckout.error, /after check-in/i);
  });

  // --------------------------------------------------------------------------
  // Requirement 10: Multiple listing resolution is consistent, deterministic, and isolated
  // --------------------------------------------------------------------------
  await t.test('10. Multiple listing resolution is deterministic and update isolation is preserved', async () => {
    const multiHotel = await db.orm.public.Organization.create({
      name: 'Marina Grand Hotel',
      type: 'HOTEL',
      status: 'ACTIVE',
      address: 'Marina Road, Calabar',
    });

    await db.orm.public.HotelRoom.create({
      organizationId: multiHotel.id,
      roomNumber: '101',
      type: 'Standard',
      status: 'CLEAN',
      baseRate: 30000,
    });

    const city = await db.orm.public.City.all().first();
    const cityId = city?.id || 'calabar-city-id';

    // Listing 1: Org-level primary listing (locationId: null)
    const primaryListing = await db.orm.public.DiscoveryListing.create({
      organizationId: multiHotel.id,
      cityId,
      slug: `marina-main-${multiHotel.id.slice(0, 8)}`,
      title: 'Marina Grand Hotel (Main Property)',
      vertical: 'HOTEL',
      locationId: null,
      isActive: true,
      metadata: JSON.stringify({ reservationEnabled: true }),
    });

    // Listing 2: Branch listing with locationId
    const branchLocation = await db.orm.public.Location.create({
      organizationId: multiHotel.id,
      name: 'Marina Beach Annex',
      cityId,
    });

    const branchListing = await db.orm.public.DiscoveryListing.create({
      organizationId: multiHotel.id,
      cityId,
      slug: `marina-annex-${multiHotel.id.slice(0, 8)}`,
      title: 'Marina Beach Annex',
      vertical: 'HOTEL',
      locationId: branchLocation.id,
      isActive: true,
      metadata: JSON.stringify({ reservationEnabled: true }),
    });

    // Non-hotel listing (vertical: 'SETTINGS')
    await db.orm.public.DiscoveryListing.create({
      organizationId: multiHotel.id,
      cityId,
      slug: `marina-cfg-${multiHotel.id.slice(0, 8)}`,
      title: 'Marina Platform Config',
      vertical: 'SETTINGS',
      isActive: true,
    });

    // Verify getAuthoritativeHotelListing resolves the org-level primary listing
    const authoritative = await getAuthoritativeHotelListing(multiHotel.id);
    assert.ok(authoritative);
    assert.strictEqual(authoritative.id, primaryListing.id, 'Must resolve org-level listing over branch or settings');

    // Authoritative read matches
    assert.strictEqual(await isHotelOSReservationEnabled(multiHotel.id), true);

    // Manager setup for multiHotel
    const manager = await db.orm.public.Person.create({
      firstName: 'Hotel',
      lastName: 'Manager',
    });
    const membership = await db.orm.public.Membership.create({
      personId: manager.id,
      organizationId: multiHotel.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'ADMIN',
    });
    await setSessionForPerson(manager);

    // Disable reservations ONLY on the branch listing
    const branchUpdate = await updateHotelSettings(multiHotel.id, {
      reservationEnabled: false,
      listingId: branchListing.id,
    });
    assert.strictEqual(branchUpdate.success, true);

    // Verify branch listing is disabled
    assert.strictEqual(await isHotelOSReservationEnabled(multiHotel.id, branchListing.id), false);

    // Verify primary listing and org-level default remain ENABLED (isolation preserved)
    assert.strictEqual(await isHotelOSReservationEnabled(multiHotel.id, primaryListing.id), true);
    assert.strictEqual(await isHotelOSReservationEnabled(multiHotel.id), true);

    // Anti-IDOR: verify trying to update another org's listing fails
    const tamperedListingUpdate = await updateHotelSettings(multiHotel.id, {
      reservationEnabled: false,
      listingId: 'non-existent-or-other-org-listing',
    });
    assert.ok(tamperedListingUpdate.error);
    assert.match(tamperedListingUpdate.error, /not belong/i);
  });

  // --------------------------------------------------------------------------
  // Requirement 11: HotelOS settings authorization restricts unauthorized users
  // --------------------------------------------------------------------------
  await t.test('11. Unauthorized users cannot update HotelOS settings', async () => {
    // Resident Amaka Eze has no membership in operationalHotel
    await setSessionForPerson(resident);

    const unauthorizedAttempt = await updateHotelSettings(operationalHotel.id, {
      name: 'Hacked Hotel Name',
      reservationEnabled: false,
    });

    assert.ok(unauthorizedAttempt.error);
    assert.match(unauthorizedAttempt.error, /FORBIDDEN/i);

    // Verify hotel name in database was untouched
    const freshOrg = await db.orm.public.Organization.where({ id: operationalHotel.id }).all().first();
    assert.strictEqual(freshOrg?.name, 'Transcorp Metropolitan Hotel');

    // Create an authorized ADMIN membership for operationalHotel
    const adminPerson = await db.orm.public.Person.create({
      firstName: 'Authorized',
      lastName: 'Admin',
    });
    const adminMem = await db.orm.public.Membership.create({
      personId: adminPerson.id,
      organizationId: operationalHotel.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: adminMem.id,
      role: 'ADMIN',
    });

    await setSessionForPerson(adminPerson);
    const authorizedUpdate = await updateHotelSettings(operationalHotel.id, {
      description: 'Premier hospitality destination in the heart of Calabar.',
    });
    assert.strictEqual(authorizedUpdate.success, true);

    const updatedOrg = await db.orm.public.Organization.where({ id: operationalHotel.id }).all().first();
    assert.strictEqual(updatedOrg?.description, 'Premier hospitality destination in the heart of Calabar.');
  });

  // --------------------------------------------------------------------------
  // Requirement 12: Ahead-of-time HotelOS Room Availability Verification
  // --------------------------------------------------------------------------
  await t.test('12. checkHotelRoomAvailability and checkHotelRoomsAvailability accurately report room status', async (t2) => {
    // 12a. Overlapping date range is reported as unavailable with reason
    const bookedOverlap = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
    });
    assert.strictEqual(bookedOverlap.available, false);
    assert.match(bookedOverlap.reason || '', /already booked/i);

    // Partial overlap (starts during existing booking)
    const partialOverlap = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      checkInDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    assert.strictEqual(partialOverlap.available, false);
    assert.match(partialOverlap.reason || '', /already booked/i);

    // 12b. Non-overlapping dates are reported as available with accurate stay pricing
    const availableDatesCheck = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      checkInDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    assert.strictEqual(availableDatesCheck.available, true);
    assert.strictEqual(availableDatesCheck.totalNights, 2);
    assert.strictEqual(availableDatesCheck.baseRate, 45000);
    assert.strictEqual(availableDatesCheck.totalPrice, 90000);

    // 12c. Adjacent date: check-in on existing check-out day is allowed (interval [checkIn, checkOut))
    const adjacentDateCheck = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: operationalRoom.id,
      checkInDate: futureCheckOut,
      checkOutDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    assert.strictEqual(adjacentDateCheck.available, true, 'Check-in on check-out day must not be treated as overlapping');

    // 12d. Cancelled and Checked-out reservations do not block availability
    const testRoom2 = await db.orm.public.HotelRoom.create({
      organizationId: operationalHotel.id,
      roomNumber: '102',
      type: 'Executive',
      status: 'CLEAN',
      baseRate: 60000,
    });

    const resInDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const resOutDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create a CANCELLED reservation
    await db.orm.public.Reservation.create({
      organizationId: operationalHotel.id,
      roomId: testRoom2.id,
      guestName: 'Cancelled Guest',
      status: 'CANCELLED',
      checkInDate: toInstant(new Date(resInDate)),
      checkOutDate: toInstant(new Date(resOutDate)),
      totalPrice: 120000,
    });

    const checkCancelledRoom = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: testRoom2.id,
      checkInDate: resInDate,
      checkOutDate: resOutDate,
    });
    assert.strictEqual(checkCancelledRoom.available, true, 'Cancelled reservation must not block room availability');

    // 12e. Out-of-order room is reported as unavailable
    const outOfOrderRoom = await db.orm.public.HotelRoom.create({
      organizationId: operationalHotel.id,
      roomNumber: '103',
      type: 'Standard',
      status: 'OUT_OF_ORDER',
      baseRate: 30000,
    });

    const checkOoo = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: outOfOrderRoom.id,
      checkInDate: resInDate,
      checkOutDate: resOutDate,
    });
    assert.strictEqual(checkOoo.available, false);
    assert.match(checkOoo.reason || '', /out of order/i);

    // 12f. Invalid date intervals
    const checkInvalidDates = await checkHotelRoomAvailability({
      organizationId: operationalHotel.id,
      roomId: testRoom2.id,
      checkInDate: resOutDate,
      checkOutDate: resInDate, // inverted
    });
    assert.strictEqual(checkInvalidDates.available, false);
    assert.match(checkInvalidDates.reason || '', /after check-in/i);

    // 12g. Anti-IDOR / Tenant isolation: wrong organization ID
    const crossTenantCheck = await checkHotelRoomAvailability({
      organizationId: unconfiguredHotel.id, // wrong org
      roomId: operationalRoom.id,
      checkInDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    assert.strictEqual(crossTenantCheck.available, false);
    assert.match(crossTenantCheck.reason || '', /not found/i);

    // 12h. Batch availability checking checkHotelRoomsAvailability
    const batchResult = await checkHotelRoomsAvailability({
      organizationId: operationalHotel.id,
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
    });
    // operationalRoom is booked
    assert.strictEqual(batchResult[operationalRoom.id]?.available, false);
    // testRoom2 is available
    assert.strictEqual(batchResult[testRoom2.id]?.available, true);
    // outOfOrderRoom is out of order
    assert.strictEqual(batchResult[outOfOrderRoom.id]?.available, false);
    assert.match(batchResult[outOfOrderRoom.id]?.reason || '', /out of order/i);
  });
});
