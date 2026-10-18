import 'dotenv/config';
import { db } from '../src/prisma/db';

interface SeedEventDef {
  title: string;
  orgName: string;
  orgType: 'EVENT_ORGANIZER' | 'HOTEL' | 'RESTAURANT' | 'GOVERNMENT' | 'SCHOOL' | 'SERVICES';
  orgDescription: string;
  orgAddress: string;
  eventImage: string;
  eventUrl?: string;
  location: string;
  dateIso: string;
  capacity: number;
  price: number;
  summary: string;
  tiers?: { name: string; price: number; capacity: number }[];
}

const CALABAR_EVENTS: SeedEventDef[] = [
  {
    title: 'Hit FM Calabar Entertainment Conference (CECF – Day 1)',
    orgName: 'Hit 95.9 FM Calabar',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Cross River State’s premier urban lifestyle radio station and entertainment event organizer.',
    orgAddress: '95.9 Hit FM Broadcast House, Marian Road, Calabar',
    eventImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://cec.hitfmcalabar.com',
    location: 'Hogis Royale Banquet Hall, Bishop Moynagh Ave, State Housing, Calabar',
    dateIso: '2026-10-23T09:00:00+01:00',
    capacity: 500,
    price: 0,
    summary:
      'Day 1 of the annual Calabar Entertainment Conference & Festival (CECF) hosted by Hit 95.9 FM. Features keynote panels with music executives, filmmakers, content creators, media buyers, and creative economy leaders across the South-South.',
    tiers: [
      { name: 'Conference Delegate Pass (Free)', price: 0, capacity: 450 },
      { name: 'VIP Speaker & Networking Lounge', price: 15000, capacity: 50 },
    ],
  },
  {
    title: 'Hit FM Calabar Entertainment Festival (CECF – Day 2)',
    orgName: 'Hit 95.9 FM Calabar',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Cross River State’s premier urban lifestyle radio station and entertainment event organizer.',
    orgAddress: '95.9 Hit FM Broadcast House, Marian Road, Calabar',
    eventImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://cec.hitfmcalabar.com',
    location: 'The Mirage Car Park, MCC Road, Calabar',
    dateIso: '2026-10-24T12:00:00+01:00',
    capacity: 1500,
    price: 5000,
    summary:
      'The outdoor live music, food, gaming, and lifestyle festival finale of CECF 2026. Featuring top DJs, live artist performances, grill vendors, and brand activations at The Mirage Car Park on MCC Road.',
    tiers: [
      { name: 'Regular Festival Pass', price: 5000, capacity: 1200 },
      { name: 'VIP Fast-Track & Lounge', price: 20000, capacity: 250 },
      { name: 'Cabana Table (6 Guests)', price: 150000, capacity: 50 },
    ],
  },
  {
    title: 'Coffee Festival International Nigeria (Calabar Chapter)',
    orgName: 'Calabar Enterprise & Youth Collective',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Community hub advancing youth entrepreneurship, specialty hospitality, and sustainable enterprise in Cross River State.',
    orgAddress: 'Marian Road (Ndidem Usang Iso), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar',
    location: 'Cultural Centre Complex, Barracks Road, Calabar',
    dateIso: '2026-10-30T10:00:00+01:00',
    capacity: 400,
    price: 0,
    summary:
      'A 3-day showcase celebrating Nigerian coffee & cocoa value chains, barista exhibitions, youth enterprise clinics, and creative networking in Calabar.',
    tiers: [
      { name: 'General Exhibition Access', price: 0, capacity: 350 },
      { name: 'Masterclass & Tasting Pass', price: 7500, capacity: 50 },
    ],
  },
  {
    title: 'CMFR 1st Annual Local Musicians Challenge Show (Auditions & Live Showcase)',
    orgName: 'Channel View Hotel',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Premier hospitality and conference destination on MCC Road, Calabar.',
    orgAddress: '29 MCC Road, Calabar, Cross River State',
    eventImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://www.eventbrite.com/d/nigeria--calabar/events/',
    location: 'Channel View Hotel Hall, MCC Road, Calabar',
    dateIso: '2026-11-03T08:00:00+01:00',
    capacity: 300,
    price: 0,
    summary:
      'Live auditions and talent showcase for emerging vocalists, instrumentalists, and bands across Calabar and Cross River State. Judges include veteran record producers and live music directors.',
    tiers: [
      { name: 'Contestant & Audience Registration', price: 0, capacity: 300 },
    ],
  },
  {
    title: 'Calabar Social Hangout (Mask Party & Everything Native Edition)',
    orgName: 'Hogis Royale & Suites',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Luxury hospitality, lounge, cinema, and event center in Calabar.',
    orgAddress: '7 Bishop Moynagh Avenue, State Housing Estate, Calabar',
    eventImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://tix.africa/discover/calabar',
    location: 'Hogis Royale Poolside & Lounge, State Housing, Calabar',
    dateIso: '2026-11-14T18:00:00+01:00',
    capacity: 350,
    price: 5000,
    summary:
      'An evening of curated Efik/Ibibio native cuisine ("Everything Native"), masquerade cocktail aesthetics, live highlife fusion, and social networking for young professionals in Calabar.',
    tiers: [
      { name: 'Early Bird Entry', price: 5000, capacity: 250 },
      { name: 'VIP Table Reservation', price: 50000, capacity: 100 },
    ],
  },
  {
    title: 'Carnival Calabar 2026 — Second Dry Run',
    orgName: 'Cross River State Carnival Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official state commission organizing Carnival Calabar — Africa’s Biggest Street Party.',
    orgAddress: 'Millennium Park (Eleven-Eleven), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Millennium Park (Eleven-Eleven) along the 12km Carnival Route, Calabar',
    dateIso: '2026-11-22T14:00:00+01:00',
    capacity: 5000,
    price: 0,
    summary:
      'Official Second Dry Run for the 2026 Carnival Calabar season under the theme "Rethinking Our Collective Destiny". Watch Seagull, Passion 4, Masta Blasta, Bayside, Freedom, Diamond, and Calas Vegas bands rehearse choreography along the 12km route.',
  },
  {
    title: 'ASUP International Hybrid Conference 2026',
    orgName: 'Cross River Academic & Innovation Forum',
    orgType: 'SCHOOL',
    orgDescription: 'Academic research and polytechnic education consortium in Cross River State.',
    orgAddress: 'Calabar – Ugep Corridor, Cross River State',
    eventImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://www.eventbrite.com/d/nigeria--calabar/conferences/',
    location: 'Federal Polytechnic Ugep & Calabar Virtual Hub, Cross River State',
    dateIso: '2026-11-25T09:00:00+01:00',
    capacity: 600,
    price: 15000,
    summary:
      'Academic Staff Union of Polytechnics (ASUP) International Hybrid Conference featuring paper presentations on technical education, AI in industry, and sustainable infrastructure across Nigeria.',
    tiers: [
      { name: 'Virtual Attendance Pass', price: 10000, capacity: 300 },
      { name: 'In-Person Delegate Registration', price: 15000, capacity: 300 },
    ],
  },
  {
    title: 'Calabar Festival Kickoff & Official Christmas Tree Lighting',
    orgName: 'Cross River State Tourism Bureau',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official tourism promotion and destination management agency of Cross River State.',
    orgAddress: 'Calabar Municipal, Cross River State',
    eventImage: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar',
    location: 'Millennium Park (Eleven-Eleven Roundabout) & Festival Village, Calabar',
    dateIso: '2026-11-30T19:00:00+01:00',
    capacity: 10000,
    price: 0,
    summary:
      'The ceremonial 32-day kickoff to the 2026 Calabar Festival season! Features the lighting of the giant Calabar Christmas Tree, fireworks display, mass choir carols, and the opening of the Calabar Festival Village.',
  },
  {
    title: 'Carnival Calabar 2026 — Final Dry Run',
    orgName: 'Cross River State Carnival Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official state commission organizing Carnival Calabar — Africa’s Biggest Street Party.',
    orgAddress: 'Millennium Park (Eleven-Eleven), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Millennium Park to U.J. Esuene Stadium (12km Carnival Route), Calabar',
    dateIso: '2026-12-06T14:00:00+01:00',
    capacity: 8000,
    price: 0,
    summary:
      'The final full-dress rehearsal along the 12km Carnival Route before the December main parade, featuring adjudication test points, sound trucks, and full band formations.',
  },
  {
    title: 'Junior Carnival Dry Run 2026',
    orgName: 'Cross River State Carnival Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official state commission organizing Carnival Calabar — Africa’s Biggest Street Party.',
    orgAddress: 'Millennium Park (Eleven-Eleven), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Mary Slessor Avenue Carnival Corridor, Calabar',
    dateIso: '2026-12-13T13:00:00+01:00',
    capacity: 3000,
    price: 0,
    summary:
      'Youth and children’s carnival bands take over Mary Slessor Avenue for the official Junior Carnival rehearsal ahead of the December showcase.',
  },
  {
    title: 'Mbuba Ubom Boat Regatta',
    orgName: 'Marina Resort Calabar',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Historic waterfront leisure, boat club, and tourism resort overlooking the Calabar River.',
    orgAddress: 'Marina Resort Waterfront, Duke Town, Calabar',
    eventImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar',
    location: 'Marina Resort Waterfront, Duke Town, Calabar',
    dateIso: '2026-12-18T11:00:00+01:00',
    capacity: 2500,
    price: 0,
    summary:
      'Colorful traditional riverine boat regatta on the Calabar River featuring decorated ceremonial war canoes, cultural drumming troupes, water sports, and waterfront dining at Marina Resort.',
    tiers: [
      { name: 'Waterfront Promenade Viewing', price: 0, capacity: 2300 },
      { name: 'VIP Waterfront Deck & Refreshments', price: 10000, capacity: 200 },
    ],
  },
  {
    title: 'Calabar Festival of Grills (Food, Drink & Live Music)',
    orgName: 'Marina Resort Calabar',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Historic waterfront leisure, boat club, and tourism resort overlooking the Calabar River.',
    orgAddress: 'Marina Resort Waterfront, Duke Town, Calabar',
    eventImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://tix.africa/discover/calabar',
    location: 'Marina Resort Waterfront, Calabar',
    dateIso: '2026-12-22T15:00:00+01:00',
    capacity: 2000,
    price: 5000,
    summary:
      'Calabar’s biggest open-air culinary and grill experience at the Marina Resort Waterfront! Enjoy flame-grilled seafood, suya, peppered snail, palm wine cocktails, and live Afrobeats sets.',
    tiers: [
      { name: 'Regular Gate Pass', price: 5000, capacity: 1800 },
      { name: 'Grill Master VIP Platter & Lounge', price: 25000, capacity: 200 },
    ],
  },
  {
    title: 'Cultural Carnival & Night of Kings and Queens',
    orgName: 'Calabar International Convention Centre (CICC)',
    orgType: 'EVENT_ORGANIZER',
    orgDescription: 'Iconic summit, exhibition, and cultural convention complex at Summit Hills, Calabar.',
    orgAddress: 'Summit Hills, Odukpani Road, Calabar',
    eventImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Millennium Park & CICC Summit Hills, Calabar',
    dateIso: '2026-12-26T10:00:00+01:00',
    capacity: 5000,
    price: 0,
    summary:
      'Morning parade of cultural troupes from all 18 Cross River LGAs and Nigerian states, followed at night by the dazzling "Night of Kings and Queens" costume showcase at CICC.',
    tiers: [
      { name: 'Daytime Cultural Parade (Free)', price: 0, capacity: 4500 },
      { name: 'Night of Kings & Queens Hall Pass', price: 15000, capacity: 500 },
    ],
  },
  {
    title: 'Junior Carnival Calabar 2026',
    orgName: 'Cross River State Carnival Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official state commission organizing Carnival Calabar — Africa’s Biggest Street Party.',
    orgAddress: 'Millennium Park (Eleven-Eleven), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Mary Slessor Avenue & Botanical Garden Route, Calabar',
    dateIso: '2026-12-27T12:00:00+01:00',
    capacity: 6000,
    price: 0,
    summary:
      'Family-friendly carnival showcase featuring vibrant costume parades, dance theatre, and floats by the junior wings of the competing Carnival Calabar bands.',
  },
  {
    title: 'Carnival Calabar 2026 — Grand Parade of the Bands (Main Event)',
    orgName: 'Cross River State Carnival Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official state commission organizing Carnival Calabar — Africa’s Biggest Street Party.',
    orgAddress: 'Millennium Park (Eleven-Eleven), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: '12km Carnival Route (Millennium Park → Mary Slessor → Marian → U.J. Esuene Stadium), Calabar',
    dateIso: '2026-12-28T09:00:00+01:00',
    capacity: 25000,
    price: 0,
    summary:
      'Africa’s Biggest Street Party! Full-day grand parade featuring Seagull, Passion 4, Masta Blasta, Bayside, Freedom, Diamond, and Calas Vegas competing across 5 adjudication points under the 2026 theme "Rethinking Our Collective Destiny".',
    tiers: [
      { name: 'Street Route Access (Free)', price: 0, capacity: 24000 },
      { name: 'Mary Slessor VIP Grandstand Bleachers', price: 20000, capacity: 1000 },
    ],
  },
  {
    title: 'Bikers Carnival & International Stunt Display',
    orgName: 'Cross River State Carnival Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official state commission organizing Carnival Calabar — Africa’s Biggest Street Party.',
    orgAddress: 'Millennium Park (Eleven-Eleven), Calabar',
    eventImage: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Mary Slessor Avenue & Marian Road Corridor, Calabar',
    dateIso: '2026-12-29T10:00:00+01:00',
    capacity: 15000,
    price: 0,
    summary:
      'High-octane superbike parade, custom power-bikes, exotic cars, and professional stunt riders from across Nigeria and international biker clubs riding the Calabar Carnival route.',
  },
  {
    title: 'Carnival Calabar Street Party & Colour Run Finale',
    orgName: 'Cross River State Tourism Bureau',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official tourism promotion and destination management agency of Cross River State.',
    orgAddress: 'Calabar Municipal, Cross River State',
    eventImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    eventUrl: 'https://allevents.in/calabar/carnival',
    location: 'Festival Village & Marian Road, Calabar',
    dateIso: '2026-12-30T14:00:00+01:00',
    capacity: 10000,
    price: 0,
    summary:
      'Closing street carnival celebration featuring colour runs, live concert stages at the Calabar Festival Village, and the countdown to the New Year fireworks.',
  },
];

async function main() {
  console.log('Starting Calabar verified events seeding...');

  let calabar = await db.orm.public.City.where({ slug: 'calabar' }).first();
  if (!calabar) {
    calabar = await db.orm.public.City.create({
      name: 'Calabar',
      slug: 'calabar',
      state: 'Cross River',
      country: 'Nigeria',
      currency: 'NGN',
      timezone: 'Africa/Lagos',
      latitude: 4.9757,
      longitude: 8.3417,
      isActive: true,
    });
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of CALABAR_EVENTS) {
    let org = await db.orm.public.Organization.where({ name: item.orgName }).first();
    if (!org) {
      org = await db.orm.public.Organization.create({
        name: item.orgName,
        type: item.orgType,
        description: item.orgDescription,
        address: item.orgAddress,
        logoAssetId: item.eventImage,
        status: 'ACTIVE',
      });
    } else if (!org.logoAssetId && item.eventImage) {
      await db.orm.public.Organization.where({ id: org.id }).update({
        logoAssetId: item.eventImage,
      });
    }

    const existingLoc = await db.orm.public.Location.where({ organizationId: org.id }).first();
    if (!existingLoc) {
      await db.orm.public.Location.create({
        organizationId: org.id,
        name: `${item.orgName} – Calabar`,
        address: item.orgAddress,
        cityId: calabar.id,
        latitude: 4.9757,
        longitude: 8.3417,
      });
    } else if (existingLoc.cityId !== calabar.id) {
      await db.orm.public.Location.where({ id: existingLoc.id }).update({
        cityId: calabar.id,
      });
    }

    const formattedDescription = [
      item.summary,
      item.eventImage ? `IMAGE_URL: ${item.eventImage}` : '',
      item.eventUrl ? `EVENT_URL: ${item.eventUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const eventInstant = (globalThis as any).Temporal.Instant.from(new Date(item.dateIso).toISOString());
    const existingEvent = await db.orm.public.Event.where({
      organizationId: org.id,
      title: item.title,
    }).first();

    let eventId: string;
    if (existingEvent) {
      await db.orm.public.Event.where({ id: existingEvent.id }).update({
        description: formattedDescription,
        location: item.location,
        date: eventInstant,
        capacity: item.capacity,
        price: item.price,
      });
      eventId = existingEvent.id;
      updatedCount++;
    } else {
      const created = await db.orm.public.Event.create({
        organizationId: org.id,
        title: item.title,
        description: formattedDescription,
        location: item.location,
        date: eventInstant,
        capacity: item.capacity,
        price: item.price,
      });
      eventId = created.id;
      createdCount++;
    }

    if (item.tiers && item.tiers.length > 0) {
      const existingTiers = await db.orm.public.EventTicketTier.where({ eventId }).all();
      for (const tier of item.tiers) {
        const match = existingTiers.find((t) => t.name === tier.name);
        if (!match) {
          await db.orm.public.EventTicketTier.create({
            eventId,
            name: tier.name,
            price: tier.price,
            capacity: tier.capacity,
          });
        }
      }
    }
  }

  console.log(`Calabar Events Sync Complete: ${createdCount} created, ${updatedCount} updated (Total: ${CALABAR_EVENTS.length}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding Calabar events:', err);
  process.exit(1);
});
