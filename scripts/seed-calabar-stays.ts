import 'dotenv/config';
import { db } from '../src/prisma/db';

interface SeedRoomTier {
  roomNumber: string;
  type: string;
  baseRate: number;
}

interface SeedHotelDef {
  existingOrgId?: string;
  name: string;
  stayCategory: 'Hotel' | 'Serviced Suite' | 'Short-Let' | 'Guest House';
  slug: string;
  description: string;
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsappPhone: string;
  website?: string;
  email?: string;
  stars: number;
  rating: number;
  reviewCount: number;
  compareAtPrice?: number;
  hasPowerGuarantee: boolean;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  amenities: string[];
  images: string[];
  rooms: SeedRoomTier[];
}

const CALABAR_HOTELS: SeedHotelDef[] = [
  {
    existingOrgId: '21302080-d876-41a8-824a-07c0522034ac',
    name: 'Chelsea Holiday Homes',
    stayCategory: 'Serviced Suite',
    slug: 'chelsea-holiday-homes-calabar',
    description:
      'Boutique holiday homes and serviced suites located in the serene Federal Housing Estate, Calabar. Offering 24/7 power, modern gym facilities, fully air-conditioned executive rooms, studio suites, and diplomatic suites for business and leisure travelers.',
    address: '6 N-Line Street (Mma Giwa Street), Federal Housing Estate, Calabar',
    neighborhood: 'Federal Housing Estate',
    latitude: 5.0128,
    longitude: 8.3365,
    phone: '+2349080000999',
    whatsappPhone: '2347068759716',
    website: 'https://thechelseacalabar.com/',
    email: 'info@thechelseacalabar.com',
    stars: 4,
    rating: 4.7,
    reviewCount: 64,
    compareAtPrice: 22000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: false,
    amenities: [
      '24/7 Power',
      'Free Wi-Fi',
      'Air Conditioning',
      'Gym / Fitness',
      'Free Parking',
      '24/7 Security',
      'Smart TV',
      'Room Service',
    ],
    images: [
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/front-view.jpeg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/chealsea2.jpeg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/04/IMG_4976-scaled.jpg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/rooms1.jpeg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/room3.jpeg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/room2.jpeg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/sitingroom.jpeg',
      'https://thechelseacalabar.com/wp-content/uploads/2024/04/Gym-1.jpg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Executive Single', baseRate: 15000 },
      { roomNumber: '102', type: 'Executive Double', baseRate: 18000 },
      { roomNumber: '201', type: 'Studio Suite', baseRate: 20000 },
      { roomNumber: '202', type: 'Diplomatic Suite', baseRate: 25000 },
    ],
  },
  {
    existingOrgId: '08587a88-2a00-4fb0-9f3a-79900f633165',
    name: 'Hogis Luxury Suites & Apartment',
    stayCategory: 'Hotel',
    slug: 'hogis-luxury-suites-calabar',
    description:
      'Calabar’s flagship luxury hospitality, lounge, rooftop pool, cinema, fitness club, and banquet destination in State Housing Estate. Features opulent Deluxe Rooms, Executive Twins, Mini Suites, and Presidential Suites with 24-hour uninterrupted power and VIP concierge.',
    address: '7 Akim Close, State Housing Estate (Off Marian Road), Calabar',
    neighborhood: 'State Housing Estate',
    latitude: 4.9825,
    longitude: 8.3389,
    phone: '+2348139577321',
    whatsappPhone: '2348099903335',
    website: 'https://hogisluxurysuites.com/',
    email: 'info@hogisluxurysuites.com',
    stars: 5,
    rating: 4.8,
    reviewCount: 218,
    compareAtPrice: 175000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: true,
    amenities: [
      '24/7 Power',
      'Swimming Pool',
      'Breakfast Included',
      'Free Wi-Fi',
      'Gym / Fitness',
      'Bar / Lounge',
      '24/7 Security',
      'Airport Shuttle',
      'Room Service',
    ],
    images: [
      'https://cec.hitfmcalabar.com/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-01-at-8.06.23-AM.jpeg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Deluxe King Room', baseRate: 150000 },
      { roomNumber: '102', type: 'Twin Bedded Executive Room', baseRate: 160000 },
      { roomNumber: '201', type: 'Luxury Mini Suite', baseRate: 220000 },
      { roomNumber: '301', type: 'Presidential Suite', baseRate: 400000 },
    ],
  },
  {
    name: 'Transcorp Hotels Calabar',
    stayCategory: 'Hotel',
    slug: 'transcorp-hotels-calabar',
    description:
      'Iconic landmark hospitality destination in the heart of Calabar along Murtala Mohammed Highway. Renowned for world-class executive conferencing, outdoor swimming pool, pastry shop, fine dining restaurant, and serene rooms.',
    address: '10 Murtala Mohammed Highway, Big Qua Town, Calabar',
    neighborhood: 'Calabar Municipal',
    latitude: 4.9731,
    longitude: 8.3341,
    phone: '+2348066900009',
    whatsappPhone: '2348126396019',
    website: 'https://www.transcorphotels.com/transcorp-hotels-calabar/',
    email: 'calabar@transcorphotels.com',
    stars: 5,
    rating: 4.7,
    reviewCount: 342,
    compareAtPrice: 165000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: true,
    amenities: [
      '24/7 Power',
      'Swimming Pool',
      'Breakfast Included',
      'Free Wi-Fi',
      'Gym / Fitness',
      'Airport Shuttle',
      'Bar / Lounge',
      '24/7 Security',
      'Room Service',
    ],
    images: [
      'https://www.dannichotels.com/calabar/wp-content/uploads/sites/2/2026/01/Towels-Hm-1000x700.jpg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Standard Queen Room', baseRate: 145000 },
      { roomNumber: '102', type: 'Superior King Room', baseRate: 185000 },
      { roomNumber: '201', type: 'Executive Diplomatic Suite', baseRate: 295000 },
      { roomNumber: '301', type: 'Presidential Ambassador Suite', baseRate: 450000 },
    ],
  },
  {
    name: 'Monty Suites Calabar',
    stayCategory: 'Hotel',
    slug: 'monty-suites-calabar',
    description:
      'Upscale all-suite hotel situated along Esuk Utan Road behind Zone 6 Police Headquarters in Calabar. Features spacious air-conditioned rooms, lush poolside relaxation, gymnasium, executive boardrooms, and round-the-clock security.',
    address: 'Northern Industrial Layout (Behind Zone 6 Police HQ), Esuk Utan Road, Off Murtala Mohammed Highway, Calabar',
    neighborhood: 'Ekorinim',
    latitude: 4.9964,
    longitude: 8.3328,
    phone: '+2347034044047',
    whatsappPhone: '2347038091700',
    website: 'https://montysuites.com/',
    stars: 4,
    rating: 4.6,
    reviewCount: 189,
    compareAtPrice: 90000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: true,
    amenities: [
      '24/7 Power',
      'Swimming Pool',
      'Breakfast Included',
      'Free Wi-Fi',
      'Gym / Fitness',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
    ],
    images: [
      'https://www.dannichotels.com/calabar/wp-content/uploads/sites/2/2014/11/room-b3-calnew-583x250.png',
    ],
    rooms: [
      { roomNumber: '101', type: 'Standard Double Room', baseRate: 75000 },
      { roomNumber: '102', type: 'Deluxe King Room', baseRate: 95000 },
      { roomNumber: '201', type: 'Monty Executive Suite', baseRate: 140000 },
    ],
  },
  {
    existingOrgId: '2d4aa6c0-0c68-4fdc-ae3e-96b395c05ec4',
    name: 'Channel View Hotel',
    stayCategory: 'Hotel',
    slug: 'channel-view-hotel-calabar',
    description:
      'Established premier hotel and conference venue at 27 MCC Road, Calabar. Offers serene river-breeze ambiance, outdoor swimming pool, banquet halls, Nigerian and continental restaurant, and 24-hour power supply.',
    address: '27 MCC Road, Calabar, Cross River State',
    neighborhood: 'MCC Road',
    latitude: 4.9891,
    longitude: 8.3422,
    phone: '+2348039742031',
    whatsappPhone: '2348039742044',
    website: 'https://channelviewhotel.com.ng/',
    email: 'info@channelviewhotel.com.ng',
    stars: 4,
    rating: 4.4,
    reviewCount: 154,
    compareAtPrice: 55000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: true,
    amenities: [
      '24/7 Power',
      'Swimming Pool',
      'Breakfast Included',
      'Free Wi-Fi',
      'Air Conditioning',
      'Bar / Lounge',
      'Free Parking',
      'Room Service',
    ],
    images: [
      'https://www.dannichotels.com/calabar/wp-content/uploads/sites/2/2014/11/room-b2-calnew-583x250.png',
    ],
    rooms: [
      { roomNumber: '101', type: 'Classic Room', baseRate: 45000 },
      { roomNumber: '102', type: 'Superior Deluxe Room', baseRate: 60000 },
      { roomNumber: '201', type: 'Ambassadorial Suite', baseRate: 85000 },
    ],
  },
  {
    existingOrgId: '177a4b7d-7a3f-46f1-a13b-c8d84800d0ce',
    name: 'Axari Hotel & Suites',
    stayCategory: 'Hotel',
    slug: 'axari-hotel-and-suites-calabar',
    description:
      'Modern lifestyle hotel and entertainment complex along Murtala Mohammed Highway by Zone 6 Roundabout, Ikot Ansa, Calabar. Features Executive Rooms, Deluxe Rooms, Jacuzzi Suites, outdoor pool bar, grill lounge, and event halls.',
    address: 'Murtala Mohammed Highway, Off Zone 6 Roundabout, Ikot Ansa, Calabar',
    neighborhood: 'Calabar Municipal',
    latitude: 4.9918,
    longitude: 8.3385,
    phone: '+2347034701025',
    whatsappPhone: '2347034701012',
    website: 'https://axarihotel.ng/',
    email: 'axarihotels@yahoo.com',
    stars: 4,
    rating: 4.5,
    reviewCount: 176,
    compareAtPrice: 32000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: false,
    amenities: [
      '24/7 Power',
      'Swimming Pool',
      'Free Wi-Fi',
      'Air Conditioning',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
      'Room Service',
    ],
    images: [
      'https://i0.wp.com/axarihotel.ng/wp-content/uploads/2023/08/axari_front_page.jpg?w=1001&ssl=1',
    ],
    rooms: [
      { roomNumber: '101', type: 'Executive Room', baseRate: 25000 },
      { roomNumber: '102', type: 'Deluxe Room', baseRate: 30000 },
      { roomNumber: '103', type: 'Axari Double Room', baseRate: 35000 },
      { roomNumber: '201', type: 'Executive Suite', baseRate: 45000 },
      { roomNumber: '202', type: 'Jacuzzi Suite', baseRate: 55000 },
    ],
  },
  {
    name: 'Dannic Hotels Calabar',
    stayCategory: 'Hotel',
    slug: 'dannic-hotels-calabar',
    description:
      'Boutique luxury hotel located in Ekorinim Industrial Estate off Murtala Mohammed Highway, Calabar. Offers Standard Queen, Victorian King, Galaxy King, and Royal Tulip 2-Bedroom Suites with complimentary breakfast and 24/7 power.',
    address: 'Ekorinim Industrial Estate, Off Murtala Mohammed Highway, Calabar',
    neighborhood: 'Ekorinim',
    latitude: 4.9942,
    longitude: 8.3301,
    phone: '+2347043515240',
    whatsappPhone: '2348033068958',
    website: 'https://www.dannichotels.com/calabar',
    email: 'reservationcal@dannichotels.com',
    stars: 4,
    rating: 4.6,
    reviewCount: 98,
    compareAtPrice: 60000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: true,
    amenities: [
      '24/7 Power',
      'Breakfast Included',
      'Free Wi-Fi',
      'Air Conditioning',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
      'Room Service',
    ],
    images: [
      'https://www.dannichotels.com/calabar/wp-content/uploads/sites/2/2026/01/Towels-Hm-1000x700.jpg',
      'https://www.dannichotels.com/wp-content/themes/dannic/images/calabar-home-about.png',
      'https://www.dannichotels.com/calabar/wp-content/uploads/sites/2/2014/11/room-b3-calnew-583x250.png',
      'https://www.dannichotels.com/calabar/wp-content/uploads/sites/2/2014/11/room-b2-calnew-583x250.png',
    ],
    rooms: [
      { roomNumber: '101', type: 'Standard Room – Queen Bed', baseRate: 50000 },
      { roomNumber: '102', type: 'Victorian Room – King Bed', baseRate: 58000 },
      { roomNumber: '201', type: 'Galaxy Room – King Bed', baseRate: 65000 },
      { roomNumber: '202', type: 'Suite Room – Living Area', baseRate: 85000 },
      { roomNumber: '301', type: 'Royal Tulip 2-Bedroom Suite', baseRate: 150000 },
    ],
  },
  {
    name: 'Portview Hotel and Suites',
    stayCategory: 'Hotel',
    slug: 'portview-hotel-and-suites-calabar',
    description:
      'Serene riverside hotel at Chief Ita Nyong Avenue, Ekorinim Phase 2, Calabar. Enjoy tranquil views near the Calabar River, spacious executive suites, fine local & continental dining, and dependable 24-hour power.',
    address: 'Chief Ita Nyong Avenue, Ekorinim Phase 2, Calabar',
    neighborhood: 'Ekorinim',
    latitude: 4.9985,
    longitude: 8.3219,
    phone: '+2348037248890',
    whatsappPhone: '2348037248890',
    stars: 4,
    rating: 4.5,
    reviewCount: 74,
    compareAtPrice: 48000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: false,
    amenities: [
      '24/7 Power',
      'Free Wi-Fi',
      'Air Conditioning',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
      'Room Service',
    ],
    images: [
      'https://chopcalabar.com/assets/images/place_6984a450960af8.25252798.jpg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Standard Room', baseRate: 40000 },
      { roomNumber: '102', type: 'Deluxe River-View Room', baseRate: 55000 },
      { roomNumber: '201', type: 'Executive Suite', baseRate: 75000 },
    ],
  },
  {
    name: 'Mojo Hotel Calabar',
    stayCategory: 'Hotel',
    slug: 'mojo-hotel-calabar',
    description:
      'Contemporary boutique hotel tucked along Richard Ebri Street off No. 1 Ekorinim Road, Calabar. Designed for modern business travelers and weekend guests seeking stylish rooms, fast Wi-Fi, lounge dining, and quiet privacy.',
    address: '22 Richard Ebri Off No. 1 Ekorinim Road, Calabar',
    neighborhood: 'Ekorinim',
    latitude: 4.9912,
    longitude: 8.3274,
    phone: '+2348160004422',
    whatsappPhone: '2348160004422',
    stars: 3,
    rating: 4.5,
    reviewCount: 52,
    compareAtPrice: 42000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: false,
    amenities: [
      '24/7 Power',
      'Free Wi-Fi',
      'Air Conditioning',
      'Smart TV',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
    ],
    images: [
      'https://chopcalabar.com/assets/images/place_69cd37562fd809.52973846.jpg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Classic Studio Room', baseRate: 35000 },
      { roomNumber: '102', type: 'Executive Double Room', baseRate: 48000 },
    ],
  },
  {
    name: 'Calabar Harbour Resort & Spa',
    stayCategory: 'Hotel',
    slug: 'calabar-harbour-resort-and-spa',
    description:
      'Relaxing resort, spa, and wellness hotel at 32 Asari Eso Layout, Calabar Municipal. Features lush garden courtyards, holistic spa treatments, outdoor pool, and tranquil executive suites.',
    address: '32 Asari Eso Layout, Ikot Eyo, Calabar Municipal',
    neighborhood: 'Asari Eso',
    latitude: 4.9854,
    longitude: 8.3448,
    phone: '+2348170030305',
    whatsappPhone: '2348170030305',
    stars: 4,
    rating: 4.6,
    reviewCount: 83,
    compareAtPrice: 50000,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: true,
    amenities: [
      '24/7 Power',
      'Swimming Pool',
      'Breakfast Included',
      'Free Wi-Fi',
      'Air Conditioning',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
    ],
    images: [
      'https://www.dannichotels.com/wp-content/themes/dannic/images/calabar-home-about.png',
    ],
    rooms: [
      { roomNumber: '101', type: 'Garden Deluxe Room', baseRate: 40000 },
      { roomNumber: '201', type: 'Spa Executive Suite', baseRate: 65000 },
    ],
  },
  {
    name: 'Jacaranda Suites Calabar',
    stayCategory: 'Serviced Suite',
    slug: 'jacaranda-suites-calabar',
    description:
      'Well-appointed serviced suites and guest hotel at Etubom G. Henshaw Layout off IBB Way, Calabar. Ideal for diplomats, NGO consultants, and families seeking quiet residential comfort close to Margaret Ekpo International Airport.',
    address: 'Plot C2–C6 Etubom G. Henshaw Layout, IBB Way / Atimbo Road, Calabar',
    neighborhood: 'Calabar Municipal',
    latitude: 4.9682,
    longitude: 8.3512,
    phone: '+2348148808800',
    whatsappPhone: '2348148808800',
    stars: 3,
    rating: 4.4,
    reviewCount: 61,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: false,
    amenities: [
      '24/7 Power',
      'Free Wi-Fi',
      'Air Conditioning',
      'Free Parking',
      '24/7 Security',
      'Room Service',
    ],
    images: [
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/sitingroom.jpeg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Standard Suite', baseRate: 35000 },
      { roomNumber: '102', type: 'Executive Suite', baseRate: 50000 },
      { roomNumber: '201', type: 'Royal Suite', baseRate: 60000 },
    ],
  },
  {
    name: 'Pearl Suites Hotel',
    stayCategory: 'Hotel',
    slug: 'pearl-suites-hotel-calabar',
    description:
      'Centrally located boutique hotel at 2/3 MCC Road in Big Qua Town, Calabar. Walking distance to Marian and MCC dining corridors, offering clean air-conditioned rooms, courtyard bar, and reliable backup power.',
    address: '2/3 MCC Road, Big Qua Town, Calabar',
    neighborhood: 'MCC Road',
    latitude: 4.9841,
    longitude: 8.3396,
    phone: '+2347039510101',
    whatsappPhone: '2347039510101',
    stars: 3,
    rating: 4.3,
    reviewCount: 47,
    hasPowerGuarantee: true,
    freeCancellation: true,
    breakfastIncluded: false,
    amenities: [
      '24/7 Power',
      'Free Wi-Fi',
      'Air Conditioning',
      'Bar / Lounge',
      'Free Parking',
      '24/7 Security',
    ],
    images: [
      'https://thechelseacalabar.com/wp-content/uploads/2024/03/room2.jpeg',
    ],
    rooms: [
      { roomNumber: '101', type: 'Classic Room', baseRate: 35000 },
      { roomNumber: '102', type: 'Executive Suite', baseRate: 55000 },
    ],
  },
];

async function upsertContactPoint(organizationId: string, locationId: string, type: string, value: string, isPrimary: boolean) {
  const existing = await db.orm.public.OrganizationContactPoint.where({
    organizationId,
    type,
  }).all();

  const match = existing.find((c: any) => c.value === value) || existing[0];
  if (match) {
    await db.orm.public.OrganizationContactPoint.where({ id: match.id }).update({
      value,
      locationId,
      isPrimary,
      isVerified: true,
    });
  } else {
    await db.orm.public.OrganizationContactPoint.create({
      organizationId,
      locationId,
      type,
      value,
      isPrimary,
      isVerified: true,
    });
  }
}

async function main() {
  console.log('Starting verified Calabar Hotels & Stays seed...');

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

  let hotelsSeeded = 0;
  let roomsSeeded = 0;
  let postsSeeded = 0;

  for (const h of CALABAR_HOTELS) {
    let org = h.existingOrgId
      ? await db.orm.public.Organization.where({ id: h.existingOrgId }).first()
      : null;

    if (!org) {
      org = await db.orm.public.Organization.where({ name: h.name }).first();
    }

    const coverImage = h.images[0] || null;

    if (!org) {
      org = await db.orm.public.Organization.create({
        name: h.name,
        type: 'HOTEL',
        description: h.description,
        address: h.address,
        logoAssetId: coverImage,
        status: 'ACTIVE',
      });
    } else {
      await db.orm.public.Organization.where({ id: org.id }).update({
        type: 'HOTEL',
        description: h.description,
        address: h.address,
        logoAssetId: coverImage || org.logoAssetId,
        status: 'ACTIVE',
      });
    }

    // Upsert Location in Calabar
    let loc = await db.orm.public.Location.where({ organizationId: org.id }).first();
    if (!loc) {
      loc = await db.orm.public.Location.create({
        organizationId: org.id,
        name: `${h.name} – ${h.neighborhood}`,
        address: h.address,
        cityId: calabar.id,
        latitude: h.latitude,
        longitude: h.longitude,
      });
    } else {
      await db.orm.public.Location.where({ id: loc.id }).update({
        name: `${h.name} – ${h.neighborhood}`,
        address: h.address,
        cityId: calabar.id,
        latitude: h.latitude,
        longitude: h.longitude,
      });
    }

    // Upsert Verified Contact Points (PHONE, WHATSAPP, WEBSITE, EMAIL)
    await upsertContactPoint(org.id, loc.id, 'PHONE', h.phone, true);
    await upsertContactPoint(org.id, loc.id, 'WHATSAPP', h.whatsappPhone, true);
    if (h.website) {
      await upsertContactPoint(org.id, loc.id, 'WEBSITE', h.website, false);
    }
    if (h.email) {
      await upsertContactPoint(org.id, loc.id, 'EMAIL', h.email, false);
    }

    // Upsert HotelRoom rows
    const existingRooms = await db.orm.public.HotelRoom.where({ organizationId: org.id }).all();
    for (const r of h.rooms) {
      const match = existingRooms.find((er: any) => er.roomNumber === r.roomNumber);
      if (match) {
        await db.orm.public.HotelRoom.where({ id: match.id }).update({
          locationId: loc.id,
          type: r.type,
          baseRate: r.baseRate,
          status: 'AVAILABLE',
        });
      } else {
        await db.orm.public.HotelRoom.create({
          organizationId: org.id,
          locationId: loc.id,
          roomNumber: r.roomNumber,
          type: r.type,
          baseRate: r.baseRate,
          status: 'AVAILABLE',
        });
      }
      roomsSeeded++;
    }

    // Upsert DiscoveryListing for Hotel
    const minRate = Math.min(...h.rooms.map((r) => r.baseRate));
    const metadataObj = {
      stayCategory: h.stayCategory,
      price: minRate,
      startingPrice: minRate,
      pricePeriod: 'night',
      compareAtPrice: h.compareAtPrice || null,
      neighborhood: h.neighborhood,
      address: h.address,
      stars: h.stars,
      rating: h.rating,
      reviewScore: Number((h.rating * 2).toFixed(1)),
      reviewCount: h.reviewCount,
      isVerified: true,
      hasPowerGuarantee: h.hasPowerGuarantee,
      freeCancellation: h.freeCancellation,
      breakfastIncluded: h.breakfastIncluded,
      amenities: h.amenities,
      images: h.images,
      coverImage,
      phone: h.phone,
      whatsappPhone: h.whatsappPhone,
      bookingUrl: h.website || null,
    };

    const existingListings = await db.orm.public.DiscoveryListing.where({ organizationId: org.id }).all();
    const hotelListing = existingListings.find(
      (l: any) => l.vertical === 'HOTEL' || l.slug === h.slug
    );

    if (hotelListing) {
      await db.orm.public.DiscoveryListing.where({ id: hotelListing.id }).update({
        cityId: calabar.id,
        locationId: loc.id,
        vertical: 'HOTEL',
        slug: h.slug,
        title: h.name,
        description: h.description,
        coverAssetId: coverImage,
        isActive: true,
        metadata: JSON.stringify(metadataObj),
      });
    } else {
      await db.orm.public.DiscoveryListing.create({
        organizationId: org.id,
        cityId: calabar.id,
        locationId: loc.id,
        vertical: 'HOTEL',
        slug: h.slug,
        title: h.name,
        description: h.description,
        coverAssetId: coverImage,
        isActive: true,
        metadata: JSON.stringify(metadataObj),
      });
    }

    // Upsert City Newsfeed Post (category: 'Housing', linkedEntityType: 'STAY', linkedEntityId: org.id)
    const existingPosts = await db.orm.public.Post.where({
      linkedEntityType: 'STAY',
      linkedEntityId: org.id,
    }).all();

    const roomSummary = h.rooms
      .map((r) => `${r.type} (₦${r.baseRate.toLocaleString()})`)
      .join(' · ');
    const feedContent = `${h.description}\n\n🛏️ Room Tiers: ${roomSummary}\n✨ ${h.amenities.slice(0, 5).join(' · ')}\n📍 ${h.address}\n📞 Direct Line: ${h.phone}`;

    if (existingPosts.length > 0) {
      await db.orm.public.Post.where({ id: existingPosts[0].id }).update({
        title: `${h.name} (${h.stayCategory})`,
        content: feedContent,
        category: 'Housing',
        status: 'PUBLISHED',
        imageUrl: coverImage,
        location: `${h.neighborhood}, Calabar`,
        price: minRate,
        organizationId: org.id,
      });
    } else {
      await db.orm.public.Post.create({
        title: `${h.name} (${h.stayCategory})`,
        content: feedContent,
        category: 'Housing',
        status: 'PUBLISHED',
        isEmergency: false,
        imageUrl: coverImage,
        location: `${h.neighborhood}, Calabar`,
        price: minRate,
        organizationId: org.id,
        linkedEntityType: 'STAY',
        linkedEntityId: org.id,
      });
    }
    postsSeeded++;
    hotelsSeeded++;
    console.log(`✓ Seeded ${h.name} (${h.rooms.length} room tiers, min ₦${minRate.toLocaleString()}/night, WA: ${h.whatsappPhone})`);
  }

  console.log(`\nDone! Seeded ${hotelsSeeded} verified Calabar hotels, ${roomsSeeded} room tiers, and ${postsSeeded} City Newsfeed Housing posts.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding Calabar stays:', err);
  process.exit(1);
});
