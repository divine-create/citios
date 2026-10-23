import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  parseEventDescription, 
  serializeEventDescription, 
  generateGoogleCalendarUrl, 
  generateICalDataUri, 
  generateCheckInCode,
  normalizeCategory,
  EVENT_CATEGORIES,
  DEFAULT_EVENT_SETTINGS,
  type EventSettings,
  type EventCustomQuestion,
} from './event-utils';
import { db } from '../src/prisma/db';
import { 
  claimEventRsvp, 
  approveEventRegistration, 
  declineEventRegistration, 
  checkInTicket,
  updateEventSettings,
  getOrganizerPageData
} from './actions/events';

describe('CityOS Events Vertical: Reality & Feature Tests', () => {

  describe('1. Event Description Serialization & Luma Settings Round-Trip', () => {
    it('serializes and parses clean description without metadata', () => {
      const raw = 'Just a standard community meetup in Calabar.';
      const parsed = parseEventDescription(raw);
      assert.equal(parsed.summary, 'Just a standard community meetup in Calabar.');
      assert.equal(parsed.category, 'Community & Culture');
      assert.equal(parsed.eventUrl, null);
      assert.equal(parsed.settings.requireApproval, false);
      assert.equal(parsed.settings.enableWaitlist, true);
    });

    it('round-trips custom questions, approval toggles, and gate instructions', () => {
      const questions: EventCustomQuestion[] = [
        { id: 'q1', label: 'Company / Project', type: 'text', required: true },
        { id: 'q2', label: 'Role in Tech', type: 'select', required: false, options: ['Founder', 'Engineer', 'Designer'] },
        { id: 'q3', label: 'Twitter / X Handle', type: 'social_url', required: false },
      ];

      const settings: EventSettings = {
        requireApproval: true,
        enableWaitlist: true,
        customConfirmationNote: 'Enter through Gate 2 and ask for Somto at the desk.',
        questions,
      };

      const serialized = serializeEventDescription({
        summary: 'Calabar Tech Summit 2026',
        category: 'Tech & Business',
        hostPersonId: 'person-test-123',
        hostName: 'Ini Edo',
        imageUrl: 'https://images.unsplash.com/photo-tech-summit',
        eventUrl: 'https://calabartech.org',
        settings,
      });

      const parsed = parseEventDescription(serialized);
      assert.equal(parsed.summary, 'Calabar Tech Summit 2026');
      assert.equal(parsed.category, 'Tech & Business');
      assert.equal(parsed.hostPersonId, 'person-test-123');
      assert.equal(parsed.hostName, 'Ini Edo');
      assert.equal(parsed.imageUrl, 'https://images.unsplash.com/photo-tech-summit');
      assert.equal(parsed.eventUrl, 'https://calabartech.org');
      assert.equal(parsed.settings.requireApproval, true);
      assert.equal(parsed.settings.customConfirmationNote, 'Enter through Gate 2 and ask for Somto at the desk.');
      assert.equal(parsed.settings.questions?.length, 3);
      assert.equal(parsed.settings.questions?.[0].label, 'Company / Project');
      assert.equal(parsed.settings.questions?.[1].options?.length, 3);
    });

    it('normalizes legacy or fuzzy category names into valid categories', () => {
      const parsed1 = parseEventDescription('Live music show\n\nEVENT_CATEGORY: Live Bands & Concerts');
      assert.equal(parsed1.category, 'Music & Nightlife');

      const parsed2 = parseEventDescription('Workshop event\n\nEVENT_CATEGORY: Masterclass and Bootcamp');
      assert.equal(parsed2.category, 'Workshop & Class');

      const parsed3 = parseEventDescription('Food feast\n\nEVENT_CATEGORY: Culinary & Bistro');
      assert.equal(parsed3.category, 'Food & Drink');

      const direct = normalizeCategory('tech startup pitch');
      assert.equal(direct, 'Tech & Business');
    });
  });

  describe('2. Calendar Export & Check-In Code Utilities', () => {
    it('generates a valid Google Calendar URL with correct parameters', () => {
      const gcalUrl = generateGoogleCalendarUrl({
        title: 'Calabar Carnival 2026',
        description: 'Annual street parade & celebration',
        location: 'U.J. Esuene Stadium, Calabar',
        date: new Date('2026-12-27T10:00:00Z'),
        durationMinutes: 240,
      });

      assert.ok(gcalUrl.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
      assert.ok(gcalUrl.includes('text=Calabar+Carnival+2026'));
      assert.ok(gcalUrl.includes('location=U.J.+Esuene+Stadium%2C+Calabar'));
      assert.ok(gcalUrl.includes('dates=20261227T100000Z%2F20261227T140000Z'));
    });

    it('generates an iCalendar RFC 5545 compliant data URI', () => {
      const icalUri = generateICalDataUri({
        id: 'event-uuid-456',
        title: 'Calabar Tech Mixer',
        description: 'Networking and product demos',
        location: 'Marina Resort, Calabar',
        date: new Date('2026-11-15T16:00:00Z'),
        durationMinutes: 180,
      });

      assert.ok(icalUri.startsWith('data:text/calendar;charset=utf8,'));
      const decoded = decodeURIComponent(icalUri.replace('data:text/calendar;charset=utf8,', ''));
      assert.ok(decoded.includes('BEGIN:VCALENDAR'));
      assert.ok(decoded.includes('VERSION:2.0'));
      assert.ok(decoded.includes('SUMMARY:Calabar Tech Mixer'));
      assert.ok(decoded.includes('LOCATION:Marina Resort\\, Calabar'));
      assert.ok(decoded.includes('END:VCALENDAR'));
    });

    it('generates a deterministic or prefixed check-in code', () => {
      const code1 = generateCheckInCode('reg-01234567-89ab');
      assert.equal(code1.startsWith('TKT-'), true);
      assert.equal(code1.length, 12);

      const codeCustom = generateCheckInCode('reg-01234567-89ab', 'VIP');
      assert.equal(codeCustom.startsWith('VIP-'), true);
    });
  });

  describe('3. Admissions, Guest RSVP & Capacity Integration Flow', () => {
    let testOrgId: string;
    let testEventId: string;
    const testGuestEmail = `guest.tester.${Date.now()}@calabar.cityos`;
    const testGuestName = 'Ekeng Bassey';

    it('creates a test event with approval required and custom questions', async () => {
      // Find active organization
      const orgs = await db.orm.public.Organization.all();
      assert.ok(orgs.length > 0, 'Database should contain organizations');
      testOrgId = orgs[0].id;

      const questions: EventCustomQuestion[] = [
        { id: 'q_role', label: 'Your role or industry', type: 'text', required: true }
      ];

      const serializedDesc = serializeEventDescription({
        summary: 'Automated Test Event for Luma Admissions',
        category: 'Tech & Business',
        settings: {
          requireApproval: true,
          enableWaitlist: true,
          customConfirmationNote: 'Please present your boarding pass at the main gate.',
          questions,
        }
      });

      const temporalDate = (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000);
      const testEvent = await db.orm.public.Event.create({
        organizationId: testOrgId,
        title: `Luma Admissions Test Event ${Date.now()}`,
        description: serializedDesc,
        location: 'Tinapa Business Resort, Calabar',
        date: temporalDate,
        capacity: 2,
        price: 0,
      });

      assert.ok(testEvent.id);
      testEventId = testEvent.id;
    });

    it('rejects guest RSVP if required custom question is missing', async () => {
      const res = await claimEventRsvp({
        eventId: testEventId,
        guestName: testGuestName,
        guestEmail: testGuestEmail,
        answers: {}, // missing required 'q_role'
      });

      assert.ok(res.error);
      assert.ok(res.error.includes('Please answer: "Your role or industry"'));
    });

    it('allows frictionless guest RSVP without signing in and places in PENDING_APPROVAL', async () => {
      const res = await claimEventRsvp({
        eventId: testEventId,
        guestName: testGuestName,
        guestEmail: testGuestEmail,
        guestPhone: '08031234567',
        answers: { q_role: 'Software Engineer' },
      });

      assert.equal(res.success, true);
      assert.equal(res.status, 'PENDING_APPROVAL');
      assert.ok(res.registrationId);

      // Verify canonical Person and PersonIdentifier were automatically resolved/created
      const identifier = await db.orm.public.PersonIdentifier.where({
        type: 'EMAIL',
        normalizedValue: testGuestEmail.toLowerCase().trim(),
      }).first();
      assert.ok(identifier, 'Canonical PersonIdentifier must be created for zero-login guest');

      const person = await db.orm.public.Person.where({ id: identifier.personId }).first();
      assert.ok(person, 'Canonical Person must exist');
      assert.equal(person.firstName, 'Ekeng');
      assert.equal(person.lastName, 'Bassey');
    });

    it('prevents duplicate registrations from the same guest (idempotency)', async () => {
      const res = await claimEventRsvp({
        eventId: testEventId,
        guestName: testGuestName,
        guestEmail: testGuestEmail,
        answers: { q_role: 'Software Engineer' },
      });

      assert.equal(res.success, true);
      assert.equal(res.alreadyRegistered, true);
      assert.equal(res.status, 'PENDING_APPROVAL');
    });

    it('allows host to approve pending registration, issuing a valid ticket and in-app alert', async () => {
      const reg = await db.orm.public.EventRegistration.where({
        eventId: testEventId,
        status: 'PENDING_APPROVAL',
      }).first();
      assert.ok(reg, 'Pending registration must exist');

      const approveRes = await approveEventRegistration(reg.id);
      assert.equal(approveRes.success, true);

      // Check registration status is now REGISTERED
      const updatedReg = await db.orm.public.EventRegistration.where({ id: reg.id }).first();
      assert.equal(updatedReg.status, 'REGISTERED');

      // Check valid ticket was generated
      const ticket = await db.orm.public.Ticket.where({
        eventId: testEventId,
        personId: reg.personId,
      }).first();
      assert.ok(ticket, 'Valid ticket must be generated on approval');
      assert.equal(ticket.status, 'VALID');
    });

    it('enforces capacity limits when event reaches full capacity', async () => {
      // Register second attendee to fill capacity (capacity = 2)
      const secondEmail = `guest2.${Date.now()}@calabar.cityos`;
      const res2 = await claimEventRsvp({
        eventId: testEventId,
        guestName: 'Second Attendee',
        guestEmail: secondEmail,
        answers: { q_role: 'Designer' },
      });
      assert.equal(res2.success, true);

      // Approve second attendee
      if (res2.registrationId) {
        await approveEventRegistration(res2.registrationId);
      }

      // Try registering third attendee (capacity is 2, enableWaitlist is true)
      const thirdEmail = `guest3.${Date.now()}@calabar.cityos`;
      const res3 = await claimEventRsvp({
        eventId: testEventId,
        guestName: 'Third Attendee',
        guestEmail: thirdEmail,
        answers: { q_role: 'Product Manager' },
      });

      assert.equal(res3.success, true);
      assert.equal(res3.status, 'WAITLISTED', 'When capacity is full, attendee must be placed on WAITLIST');
    });

    it('validates door check-in state machine: valid check-in, duplicate prevention, and rejection', async () => {
      const reg = await db.orm.public.EventRegistration.where({
        eventId: testEventId,
        status: 'REGISTERED',
      }).first();
      assert.ok(reg);

      // 1. Valid Check-In at the door
      const scan1 = await checkInTicket({
        eventId: testEventId,
        rawCode: reg.id,
      });
      assert.equal(scan1.success, true);
      assert.ok(scan1.attendeeName);

      // Check registration is now CHECKED_IN
      const checkedReg = await db.orm.public.EventRegistration.where({ id: reg.id }).first();
      assert.equal(checkedReg.status, 'CHECKED_IN');

      // 2. Duplicate Scan Prevention
      const scan2 = await checkInTicket({
        eventId: testEventId,
        rawCode: reg.id,
      });
      assert.ok(scan2.error, 'Duplicate check-in must return an error');
      assert.ok(scan2.error.includes('Already checked in!'));

      // 3. Mismatched Event Rejection
      const scanMismatch = await checkInTicket({
        eventId: 'different-fake-event-id',
        rawCode: reg.id,
      });
      assert.ok(scanMismatch.error, 'Cross-event check-in must return an error');

      // 4. Invalid Code Rejection
      const scanInvalid = await checkInTicket({
        eventId: testEventId,
        rawCode: 'NON-EXISTENT-CODE-999',
      });
      assert.ok(scanInvalid.error);
      assert.ok(scanInvalid.error.includes('No ticket or RSVP found'));
    });

    it('cleans up test event and registrations', async () => {
      await db.orm.public.Ticket.where({ eventId: testEventId }).delete();
      await db.orm.public.EventRegistration.where({ eventId: testEventId }).delete();
      await db.orm.public.Event.where({ id: testEventId }).delete();
    });
  });

  describe('4. Event Registration Link & Custom URL Configuration', () => {
    let linkEventId: string;
    let orgId: string;

    it('creates an event and updates its registration link/external URL via updateEventSettings', async () => {
      const org = await db.orm.public.Organization.all().first();
      orgId = org?.id || 'test-org-123';

      const temporalDate = (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000);
      const createdEvent = await db.orm.public.Event.create({
        organizationId: orgId,
        title: 'Calabar Design Meetup',
        location: 'Marian Road, Calabar',
        date: temporalDate,
        capacity: 100,
        price: 0,
        description: 'Monthly meetup for digital product designers in Calabar.',
      });
      linkEventId = createdEvent.id;

      // Update settings with a custom registration link
      const customUrl = 'https://luma.com/calabar-designers-2026';
      const res = await updateEventSettings({
        eventId: linkEventId,
        eventUrl: customUrl,
        settings: {
          requireApproval: false,
          enableWaitlist: true,
        },
      });

      assert.equal(res.success, true);

      // Verify the event in DB now has the EVENT_URL serialized and parsed
      const freshEvent = await db.orm.public.Event.where({ id: linkEventId }).first();
      assert.ok(freshEvent);
      const parsed = parseEventDescription(freshEvent.description);
      assert.equal(parsed.eventUrl, customUrl);
      assert.equal(parsed.settings.enableWaitlist, true);

      // Verify that getOrganizerPageData resolves this event for the organizer suite
      const organizerData = await getOrganizerPageData({ eventId: linkEventId });
      assert.ok(organizerData);
      assert.equal(organizerData.event.id, linkEventId);
      assert.equal(organizerData.event.eventUrl, customUrl);

      // Clean up
      await db.orm.public.Event.where({ id: linkEventId }).delete();
    });
  });
});
