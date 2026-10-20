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
});
