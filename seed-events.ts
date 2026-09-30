import { db } from './src/prisma/db';

async function seedEvents() {
  let org = await db.orm.public.Organization.all().first();
  if (!org) {
    org = await db.orm.public.Organization.create({
      name: 'City Events Center',
      type: 'EVENT_ORGANIZER',
      description: 'The main events hub for the city'
    });
  }

  // Create an event
  const event1 = await db.orm.public.Event.create({
    organizationId: org.id,
    title: 'Tech Innovators Meetup',
    description: 'A networking event for local developers and founders.',
    date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow
    location: 'City Events Center, Main Hall',
    capacity: 100,
    price: 0
  });

  const event2 = await db.orm.public.Event.create({
    organizationId: org.id,
    title: 'Downtown Farmers Market',
    description: 'Fresh local produce, artisan goods, and live music.',
    date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 172800000), // Day after tomorrow
    location: 'City Square',
    capacity: 500,
    price: 0
  });

  const event3 = await db.orm.public.Event.create({
    organizationId: org.id,
    title: 'React Native Workshop',
    description: 'Learn how to build cross-platform apps with React Native.',
    date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 259200000), // 3 days from now
    location: 'City Library, Tech Room',
    capacity: 30,
    price: 15
  });

  console.log('Seeded Events:', event1.title, event2.title, event3.title);
}

seedEvents().catch(console.error);
