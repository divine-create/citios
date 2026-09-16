import {
  Store,
  ShoppingBasket,
  Car,
  Package,
  Building2,
  Stethoscope,
  Calendar,
  Wrench,
  Sparkles,
  Heart,
  MessageSquare,
  Share2,
  ShoppingBag,
  Search,
  UserPlus,
  ShieldCheck,
  Banknote,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const APP_CITY = 'Calabar';
export const APP_STATE = 'Cross River';
export const DEMO_MODE = true;

export function fmtNaira(amount: number): string {
  return '₦' + Math.round(amount).toLocaleString('en-NG');
}

export const DEMO_USER = {
  name: 'David Ekong',
  initials: 'DE',
  area: 'State Housing Estate',
  tagline: 'Marian Road & Watt Market regular',
  memberSince: '2024',
  walletBalance: 146000,
  walletId: 'CCW-00912',
  referralCode: 'DAVE-CAL-01',
  stats: { orders: 23, rides: 41, payments: 87, deliveries: 18 },
};

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  desc: string;
}

export const CITY_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food & Market', icon: Store, href: '/explore?cat=food', desc: 'Watt Market, Marian Road' },
  { id: 'grocery', label: 'Groceries', icon: ShoppingBasket, href: '/explore?cat=grocery', desc: 'Delivered in minutes' },
  { id: 'ride', label: 'Ride Now', icon: Car, href: '/drive/ride', desc: 'Keke · Solo · SUV' },
  { id: 'delivery', label: 'Delivery', icon: Package, href: '/drive/delivery', desc: 'Track your parcels' },
  { id: 'house', label: 'Housing', icon: Building2, href: '/house', desc: 'CityHouse listings' },
  { id: 'health', label: 'Health', icon: Stethoscope, href: '/services/healthcare', desc: 'Pharmacies & clinics' },
  { id: 'events', label: 'Events', icon: Calendar, href: '/services/events', desc: 'Around town today' },
  { id: 'services', label: 'Services', icon: Wrench, href: '/services/local', desc: 'Trades & services' },
];

export interface Product {
  id: string;
  bizSlug: string;
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  stock: number;
  tag?: 'best' | 'new' | 'promo' | 'local';
  image: string;
  category: string;
  rating: number;
  reviews: number;
  desc: string;
}

export const DEMO_PRODUCTS: Product[] = [
  { id: 'p01', bizSlug: 'calabar-fresh', name: 'Farm-fresh Palm Oil', price: 6500, oldPrice: 7500, unit: '1 litre', stock: 42, tag: 'best', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.8, reviews: 121, desc: 'Single-origin palm oil pressed from Calabar groves this week. Rich, unrefined, and ready for your edikang ikong.' },
  { id: 'p02', bizSlug: 'calabar-fresh', name: 'Wild Ogbono (Bush Mango)', price: 7200, unit: '1 kg', stock: 26, tag: 'local', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.9, reviews: 88, desc: 'Premium ogbono seeds for the thickest, richest draw soup. Sourced from Cross River bush markets.' },
  { id: 'p03', bizSlug: 'calabar-fresh', name: 'Fresh Snails (6 pcs)', price: 8000, unit: 'pack', stock: 15, tag: 'best', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80', category: 'Protein', rating: 4.7, reviews: 64, desc: 'Cleaned, live snails straight from the farm. Perfect for pepper soup and Sunday soup.' },
  { id: 'p04', bizSlug: 'calabar-fresh', name: 'Calabar Crayfish', price: 4500, unit: '500 g', stock: 58, tag: 'new', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.8, reviews: 143, desc: 'Sun-dried, smoked crayfish ground to order. The backbone of authentic Calabar soups.' },
  { id: 'p05', bizSlug: 'watt-market-delicacies', name: 'Periwinkle 1 kg', price: 6000, unit: '1 kg', stock: 19, tag: 'best', image: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=900&q=80', category: 'Protein', rating: 4.6, reviews: 57, desc: 'Salted periwinkle from the creeks, cleaned and ready for efik soup.' },
  { id: 'p06', bizSlug: 'watt-market-delicacies', name: 'Big Robo Pepper', price: 3200, unit: '250 g', stock: 33, tag: 'best', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80', category: 'Fresh', rating: 4.7, reviews: 92, desc: 'Smoky dried big robo — your secret ingredient for that deep-forest heat.' },
  { id: 'p07', bizSlug: 'watt-market-delicacies', name: 'Edikang Ikong Veg Pack', price: 5800, unit: 'bundle', stock: 12, tag: 'local', image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80', category: 'Fresh', rating: 4.9, reviews: 76, desc: 'Waterleaf + fluted pumpkin prepped and bundled. Make the king of Calabar soups tonight.' },
  { id: 'p08', bizSlug: 'eko-kitchen', name: 'Party Jollof + Chicken (Serves 8)', price: 24500, oldPrice: 28000, unit: 'tray', stock: 8, tag: 'promo', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.8, reviews: 210, desc: 'The Eko Kitchen party tray. Smoky rice, grilled chicken, and moin moin. Book 48 hours ahead.' },
  { id: 'p09', bizSlug: 'eko-kitchen', name: 'Afang Soup + Water Fufu (2)', price: 9500, unit: 'set', stock: 20, tag: 'best', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.7, reviews: 134, desc: 'Crown chef special: rich afang with palm oil, periwinkle and stockfish, plus fresh fufu.' },
  { id: 'p10', bizSlug: 'tinapa-fashion', name: 'Ankara Two-Piece Set', price: 24000, unit: 'piece', stock: 14, tag: 'new', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.6, reviews: 45, desc: 'Contemporary ankara blouse and wrapper set tailored in Tinapa district.' },
  { id: 'p11', bizSlug: 'tinapa-fashion', name: 'Men’s Leather Sandals', price: 15500, oldPrice: 19500, unit: 'pair', stock: 9, tag: 'promo', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.5, reviews: 31, desc: 'Hand-stitched leather sandals, made for our heat. Built to last years, not months.' },
  { id: 'p12', bizSlug: 'medline-pharmacy', name: 'Antimalarial Combo (3-day)', price: 4200, unit: 'pack', stock: 40, tag: 'best', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80', category: 'Health', rating: 4.9, reviews: 118, desc: 'Prescribed course, delivered to your door. Pharmacist consult included via City Care.' },
  { id: 'p13', bizSlug: 'medline-pharmacy', name: 'Vitamin C 1000mg (60 tabs)', price: 6800, unit: 'bottle', stock: 27, tag: 'best', image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=900&q=80', category: 'Health', rating: 4.7, reviews: 87, desc: 'Sustained-release vitamin C for the rainy season. Stocked by the City pharmacy network.' },
  { id: 'p14', bizSlug: 'marian-electronics', name: 'Noise-cancel Headphones', price: 45000, unit: 'unit', stock: 6, tag: 'best', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', category: 'Electronics', rating: 4.6, reviews: 52, desc: 'Studio-grade sound with 30h battery. 1-year CityCare protection plan available.' },
  { id: 'p15', bizSlug: 'marian-electronics', name: 'Power Bank 20,000mAh', price: 18500, oldPrice: 22000, unit: 'unit', stock: 18, tag: 'promo', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80', category: 'Electronics', rating: 4.7, reviews: 73, desc: 'Dual-port fast charge, the everyday companion for Calabar blackouts.' },
  { id: 'p16', bizSlug: 'calabar-coffee', name: 'Calabar Cappuccino', price: 2800, unit: 'cup', stock: 50, tag: 'best', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80', category: 'Cafe', rating: 4.8, reviews: 166, desc: 'Hausa-grown medium roast with Ghanaian cocoa dust. Sit by the Ekorinim garden or take away.' },
];

export interface Business {
  slug: string;
  name: string;
  categoryId: string;
  category: string;
  area: string;
  address: string;
  tagline: string;
  desc: string;
  rating: number;
  reviews: number;
  isOpen: boolean;
  hours: string;
  deliveryEta: number;
  deliveryFee: number;
  cover: string;
  logo: string;
  featuredProductIds: string[];
  offers: { title: string; note: string }[];
  tags: string[];
}

export const DEMO_BUSINESSES: Business[] = [
  {
    slug: 'calabar-fresh',
    name: 'Calabar Fresh Market',
    categoryId: 'grocery',
    category: 'Groceries',
    area: 'Marian Road',
    address: '12 Marian Road, Calabar Municipal',
    tagline: 'Farm to table, before the sun gets high',
    desc: 'Calabar Fresh is a CityOS Marketplace merchant. We move produce from Cross River farms and creek markets to your kitchen the same morning — weighed, priced in naira, and packed for CityDrive.',
    rating: 4.8,
    reviews: 324,
    isOpen: true,
    hours: '6:00 AM – 9:00 PM · Mon–Sat',
    deliveryEta: 22,
    deliveryFee: 1200,
    cover: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p01', 'p02', 'p03', 'p04'],
    offers: [
      { title: 'New customer 10% off', note: 'First order over ₦10,000' },
      { title: 'Free delivery over ₦25,000', note: 'Auto-applied at checkout' },
    ],
    tags: ['Marketplace', 'Fresh Daily', 'CityDrive 22 min'],
  },
  {
    slug: 'watt-market-delicacies',
    name: 'Watt Market Delicacies',
    categoryId: 'food',
    category: 'Food & Market',
    area: 'Watt Market',
    address: 'Stall D12, Watt Market, Calabar',
    tagline: 'Every day is soup day',
    desc: 'The stall everyone knows at Watt Market. Periwinkle, big robo, edikang ikong packs and the best-smoked crayfish on the coast — now on your phone via CityOS.',
    rating: 4.6,
    reviews: 198,
    isOpen: true,
    hours: '7:00 AM – 8:00 PM · Daily',
    deliveryEta: 35,
    deliveryFee: 1500,
    cover: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p05', 'p06', 'p07'],
    offers: [{ title: 'Market day bundle', note: 'Any 3 packs, 15% off' }],
    tags: ['Marketplace', 'Stall Verified'],
  },
  {
    slug: 'eko-kitchen',
    name: 'Eko Kitchen',
    categoryId: 'food',
    category: 'Restaurant',
    area: 'Bogobiri',
    address: '3 Ndidem Usang Iso Road, Bogobiri',
    tagline: 'Where parties start early',
    desc: 'Calabar’s most-booked kitchen. Order a party tray for the weekend or a quick afang set — our riders handle the rest.',
    rating: 4.7,
    reviews: 210,
    isOpen: true,
    hours: '10:00 AM – 11:00 PM · Daily',
    deliveryEta: 30,
    deliveryFee: 1800,
    cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p08', 'p09'],
    offers: [{ title: 'Party tray discount', note: '₦3,500 off bookings this week' }],
    tags: ['Restaurant', 'Party Trays', 'Popular'],
  },
  {
    slug: 'tinapa-fashion',
    name: 'Tinapa Fashion',
    categoryId: 'food',
    category: 'Fashion',
    area: 'Tinapa District',
    address: 'Shop 21, Tinapa Business Resort',
    tagline: 'Made to move in the sun',
    desc: 'Everyday African fashion and tailored leather, cut in Calabar and ready for pickup or courier.',
    rating: 4.5,
    reviews: 96,
    isOpen: true,
    hours: '9:00 AM – 8:00 PM · Daily',
    deliveryEta: 45,
    deliveryFee: 2000,
    cover: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p10', 'p11'],
    offers: [{ title: 'Clearance at Tinapa', note: 'Up to 20% off store picks' }],
    tags: ['Fashion', 'Clearance'],
  },
  {
    slug: 'medline-pharmacy',
    name: 'Medline Pharmacy',
    categoryId: 'health',
    category: 'Pharmacy',
    area: 'Ekorinim',
    address: '5 Ekorinim Road, Calabar',
    tagline: 'Your health, delivered',
    desc: 'A licensed City pharmacy. Order medicine, get a pharmacist check, and have it ride to your door with CityDrive.',
    rating: 4.9,
    reviews: 140,
    isOpen: true,
    hours: '8:00 AM – 10:00 PM · Daily',
    deliveryEta: 25,
    deliveryFee: 1000,
    cover: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p12', 'p13'],
    offers: [{ title: 'CityCare cover', note: 'Free consult on pharma orders' }],
    tags: ['Pharmacy', 'Open Late'],
  },
  {
    slug: 'marian-electronics',
    name: 'Marian Electronics',
    categoryId: 'services',
    category: 'Electronics',
    area: 'Marian Road',
    address: '88 Marian Road, Calabar',
    tagline: 'Power for the city',
    desc: 'Genuine audio, power and home tech with a CityOS warranty. Inverter and solar setups installed by our team.',
    rating: 4.6,
    reviews: 88,
    isOpen: true,
    hours: '8:30 AM – 7:00 PM · Mon–Sat',
    deliveryEta: 40,
    deliveryFee: 2500,
    cover: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p14', 'p15'],
    offers: [{ title: 'Installation included', note: 'Free setup in Calabar metro' }],
    tags: ['Electronics', 'Install'],
  },
  {
    slug: 'calabar-coffee',
    name: 'Calabar Coffee House',
    categoryId: 'food',
    category: 'Cafe',
    area: 'Ekorinim',
    address: '1 Ekorinim Close, Calabar',
    tagline: 'Slow mornings, strong coffee',
    desc: 'The neighbourhood corner for bean-to-cup coffee, garden seats and free power. Ask us about our loyalty cup.',
    rating: 4.8,
    reviews: 166,
    isOpen: true,
    hours: '6:30 AM – 8:00 PM · Daily',
    deliveryEta: 18,
    deliveryFee: 1000,
    cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1511022154842-23f2d6f833e2?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['p16'],
    offers: [{ title: 'First cup free', note: 'With any CityOS order this week' }],
    tags: ['Cafe', 'Open Early'],
  },
  {
    slug: 'paradise-services',
    name: 'Paradise Home Services',
    categoryId: 'services',
    category: 'Local Services',
    area: 'Parliamentary Extension',
    address: '2 Parliamentary Extension, Calabar',
    tagline: 'Plumbers, sparks & cleaners on tap',
    desc: 'vetted tradespeople from the CityOS services network. Book a repair, cleaning or installation and pay in-app.',
    rating: 4.7,
    reviews: 74,
    isOpen: true,
    hours: '8:00 AM – 6:00 PM · Mon–Sat',
    deliveryEta: 60,
    deliveryFee: 0,
    cover: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: [],
    offers: [{ title: 'Fix-it Friday', note: 'No call-out fee on Fridays' }],
    tags: ['Services', 'Vetted'],
  },
  {
    slug: 'uni-cafe',
    name: 'UNICAL Eats',
    categoryId: 'food',
    category: 'Campus Eats',
    area: 'University of Calabar',
    address: 'UNICAL Student Arcade',
    tagline: 'Fuel for the student food chain',
    desc: 'Meal bundles and late-night snacks around the University of Calabar campus, delivered to hostels and halls.',
    rating: 4.4,
    reviews: 152,
    isOpen: true,
    hours: '9:00 AM – 12:00 AM · Daily',
    deliveryEta: 28,
    deliveryFee: 1200,
    cover: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: [],
    offers: [{ title: 'Hostel drop bundle', note: '2 meals, 1 delivery fee' }],
    tags: ['Campus', 'Open Late'],
  },
  {
    slug: 'calabar-books',
    name: 'Calabar Books & Prints',
    categoryId: 'services',
    category: 'Books & Prints',
    area: 'Bogobiri',
    address: '4 Egerton Lane, Bogobiri',
    tagline: 'Reading rooms and quick prints',
    desc: 'The last independent bookshop on Egerton Lane. Order books or documents and collect in store or by courier.',
    rating: 4.6,
    reviews: 39,
    isOpen: true,
    hours: '9:00 AM – 7:00 PM · Mon–Sat',
    deliveryEta: 50,
    deliveryFee: 1500,
    cover: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: [],
    offers: [{ title: 'CityOS Reads', note: 'Free delivery on orders over ₦20,000' }],
    tags: ['Books', 'Prints'],
  },
];

export function getBusiness(slug: string): Business | undefined {
  return DEMO_BUSINESSES.find((b) => b.slug === slug);
}

export function getProduct(id: string): Product | undefined {
  return DEMO_PRODUCTS.find((p) => p.id === id);
}

export interface DemoProperty {
  id: string;
  title: string;
  type: string;
  area: string;
  address: string;
  pricePerYear: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  image: string;
  landlord: string;
  tags: string[];
  amenities: string[];
  desc: string;
  available: boolean;
  featured: boolean;
}

export const DEMO_PROPERTIES: DemoProperty[] = [
  { id: 'h01', title: 'Ekorinim Garden Flat', type: 'Flat', area: 'Ekorinim', address: '5 Ekorinim Gardens, Calabar', pricePerYear: 800000, bedrooms: 2, bathrooms: 2, furnished: false, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80', landlord: 'Grace Bassey', tags: ['Available', 'Gated'], amenities: ['Prepaid meter', 'Water tank', 'Parking', '24-hr security'], desc: 'A quiet two-bedroom garden flat close to Medline Pharmacy and the coffee house. Spacious parlour, tiled throughout, and a kitchen that handles real cooking.', available: true, featured: true },
  { id: 'h02', title: 'Suntrip Apartments, Margaret Ekpo', type: 'Apartment', area: 'State Housing Estate', address: 'Margaret Ekpo Ave, S.H.E.', pricePerYear: 1200000, bedrooms: 3, bathrooms: 3, furnished: true, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', landlord: 'Daniel Effiong', tags: ['Furnished', 'Popular'], amenities: ['Furnished', 'Backup power', 'Master ensuite', 'Boys quarters'], desc: 'Fully furnished three-bedroom on Margaret Ekpo Avenue — the reliable choice for families and NGO staff. Backup inverter covers the house.', available: true, featured: true },
  { id: 'h03', title: 'Whitehouse Duplex, Bogobiri', type: 'Duplex', area: 'Bogobiri', address: 'Whitehouse Close, Bogobiri', pricePerYear: 1800000, bedrooms: 4, bathrooms: 4, furnished: false, image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80', landlord: 'Anita Edem', tags: ['New', 'Duplex'], amenities: ['Solar backup', 'Ensuite all', 'Kitchen island', 'Store room'], desc: 'A crisp white duplex on a private close. Solar-backed power, ensuite in every room, and a serious kitchen with island seating.', available: true, featured: false },
  { id: 'h04', title: 'Studio Room, Ekorinim Close', type: 'Room', area: 'Ekorinim', address: '1 Ekorinim Close', pricePerYear: 480000, bedrooms: 1, bathrooms: 1, furnished: true, image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80', landlord: 'Michael Eyo', tags: ['Furnished', 'Affordable'], amenities: ['Furnished', 'Prepaid meter', 'Water tank'], desc: 'Self-contained studio around Ekorinim Close. Furnished and walkable to Coffee House — ideal for young professionals.', available: true, featured: true },
  { id: 'h05', title: 'Creekview 3BR, Goldie', type: 'Flat', area: 'Goldie', address: '2 Goldie Street', pricePerYear: 950000, bedrooms: 3, bathrooms: 2, furnished: false, image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1000&q=80', landlord: 'Nkoyo Okon', tags: ['Available'], amenities: ['Prepaid meter', 'Parking', 'Gated'], desc: 'Three bedrooms a short walk from the Goldie eateries. Simple, safe, and town-centre close.', available: true, featured: false },
  { id: 'h06', title: 'Parliament Apartment', type: 'Apartment', area: 'Parliamentary Extension', address: '9 Parliamentary Extension', pricePerYear: 1500000, bedrooms: 3, bathrooms: 3, furnished: false, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80', landlord: 'Grace Bassey', tags: ['Available', 'Gated'], amenities: ['Ensuite', 'Water tank', '24-hr security', 'Parking'], desc: 'Executive three-bedroom in a gated parliamentary close with full en-suite bathrooms.', available: true, featured: false },
  { id: 'h07', title: 'Marina Road Compact 1BR', type: 'Flat', area: 'Marina Road', address: 'Marina Road, Calabar South', pricePerYear: 600000, bedrooms: 1, bathrooms: 1, furnished: false, image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80', landlord: 'Daniel Effiong', tags: ['Affordable'], amenities: ['Prepaid meter', 'Water tank'], desc: 'A compact one-bedroom off Marina Road with easy access to the canal views and Uyo Road.', available: false, featured: false },
  { id: 'h08', title: 'Eight Miles Family Home', type: 'Duplex', area: 'Eight Miles', address: '36 Eight Miles Estate', pricePerYear: 1600000, bedrooms: 4, bathrooms: 4, furnished: false, image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1000&q=80', landlord: 'Anita Edem', tags: ['New'], amenities: ['Solar backup', 'Boys quarters', 'Kitchen island'], desc: 'A new-build family duplex on the Eight Miles estate with solar array and boys quarters.', available: true, featured: false },
];

export function getProperty(id: string): DemoProperty | undefined {
  return DEMO_PROPERTIES.find((p) => p.id === id);
}

export const PROPERTY_TAGS = ['All', 'Available', 'Furnished', 'Affordable', 'New'];

export interface FeedPost {
  id: string;
  author: string;
  role: string;
  avatarImg?: string;
  time: string;
  category: string;
  title: string;
  body: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  href?: { label: string; url: string };
  isOrg?: boolean;
}

export const DEMO_POSTS: FeedPost[] = [
  { id: 'f01', author: 'Watt Market Delicacies', role: 'Marketplace', avatarImg: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=200&q=80', time: '2h ago', category: 'Offer', title: 'Market day bundle is back', body: 'Any three packs from the stall — periwinkle, big robo, edikang ikong — for 15% off, delivered around Calabar today. Order now and cook fresh tonight.', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80', likes: 214, comments: 38, shares: 22, href: { label: 'Browse the stall', url: '/biz/watt-market-delicacies' }, isOrg: true },
  { id: 'f02', author: 'David Ekong', role: 'Resident · S.H.E.', time: '5h ago', category: 'Ask the city', title: 'Where do I get ogbono before noon?', body: 'Two donation points open today for the market-day relief run. Leafy wraps are highest priority — drop at the Marian Road depot by 3 PM.', image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1000&q=80', likes: 86, comments: 12, shares: 5, href: { label: 'Get answers on Explore', url: '/explore?cat=food' } },
  { id: 'f03', author: 'Calabar Carnival Committee', role: 'Official', avatarImg: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=200&q=80', time: '8h ago', category: 'Event', title: 'Band practice opens at Bogobiri', body: 'The parade bands open rehearsal tonight from 6 PM at Bogobiri stadium grounds. Families welcome, Keke parking reserved along the fence.', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80', likes: 432, comments: 61, shares: 104, href: { label: 'Add to my plan', url: '/services/events' }, isOrg: true },
  { id: 'f04', author: 'Calabar Fresh Market', role: 'Marketplace', avatarImg: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80', time: '10h ago', category: 'Commerce', title: 'Farm-fresh palm oil arrived at 6 AM', body: 'New press of single-origin palm oil is on the shelf. Also restocked: wild ogbono, snails and creek periwinkle. CityDrive drops in under 25 minutes.', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=80', likes: 158, comments: 20, shares: 9, href: { label: 'Shop Calabar Fresh', url: '/biz/calabar-fresh' }, isOrg: true },
  { id: 'f05', author: 'Grace Bassey', role: 'Landlord · CityHouse', time: '1d ago', category: 'Housing', title: 'Two-bedroom freed up in Ekorinim', body: 'Ekorinim Garden Flat is back on CityHouse after an early exit. Gated, water tank, prepaid meter. Applications open — deposit holds through CityPay.', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80', likes: 97, comments: 24, shares: 12, href: { label: 'View on CityHouse', url: '/house/h01' } },
  { id: 'f06', author: 'City Drive Co-op', role: 'Mobility', avatarImg: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=200&q=80', time: '1d ago', category: 'Update', title: 'More Kekes in the evening rush', body: 'Rider supply is up 30% between 5 and 8 PM on Marian Road and the Uyo Road corridor. Shorter waits, same flat fares before surge.', likes: 122, comments: 17, shares: 8, href: { label: 'Request a ride', url: '/drive/ride' }, isOrg: true },
  { id: 'f07', author: 'UNICAL Eats', role: 'Campus Eats', avatarImg: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80', time: '1d ago', category: 'Offer', title: 'Hostel drop bundle for exam week', body: 'Two meals, one delivery fee across hostels on campus. Grab the bundle before the library crowd does.', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80', likes: 176, comments: 29, shares: 14, href: { label: 'UNICAL Eats menu', url: '/biz/uni-cafe' }, isOrg: true },
  { id: 'f08', author: 'Ita U. & 3 others', role: 'Residents · Goldie', time: '2d ago', category: 'Community', title: 'Goldie street clean-up — join in', body: 'Creekview neighbours are clearing the Goldie canal line Saturday at 8 AM. Bags and gloves provided at the junction; stay for the jollof after.', likes: 64, comments: 15, shares: 31 },
];

export const FEED_FILTERS = ['For you', 'Following', 'Marketplace', 'Events', 'Housing', 'Community'];

export interface DemoEvent {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  image: string;
  tag: string;
  price: string;
}

export const DEMO_EVENTS: DemoEvent[] = [
  { id: 'e01', title: 'Carnival Band Rehearsal', venue: 'Bogobiri Stadium Grounds', date: 'Today', time: '6:00 PM', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80', tag: 'Free', price: 'Free' },
  { id: 'e02', title: 'Watt Market Weekend Fair', venue: 'Watt Market', date: 'Sat', time: '10:00 AM', image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80', tag: 'All day', price: 'Free entry' },
  { id: 'e03', title: 'UNICAL Art & Design Open Day', venue: 'UNICAL Gallery', date: 'Fri', time: '2:00 PM', image: 'https://images.unsplash.com/photo-1536924940846-227afb31e858?auto=format&fit=crop&w=600&q=80', tag: 'Students', price: 'Free' },
  { id: 'e04', title: 'Ekorinim Evening Football', venue: 'Ekorinim Field', date: 'Sun', time: '4:30 PM', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80', tag: 'Family', price: '₦500 entry' },
];

export interface AIResultItem {
  type: 'business' | 'product' | 'property' | 'route';
  id: string;
}

export interface AIScript {
  keywords: string[];
  question: string;
  answer: string;
  results: AIResultItem[];
  followUps: string[];
}

export const AI_SCRIPTS: AIScript[] = [
  {
    keywords: ['room', 'stay', 'hotel', '10,000', 'tonight'],
    question: "Best place to stay under ₦10,000 near the stadium tonight?",
    answer: 'For tonight around the stadium, the best fit on CityHouse is the Ekorinim Close studio — ₦13,150/mo equivalent, furnished, and a 12-minute ride from Bogobiri. It is the most-booked room this week. Want me to hold it, or compare the garden flat instead?',
    results: [{ type: 'property', id: 'h04' }, { type: 'property', id: 'h01' }],
    followUps: ['Hold the studio room', 'Compare 2-bedroom flats', 'Add a ride to the venue'],
  },
  {
    keywords: ['ogbono', 'soup', 'palm oil', 'crayfish', 'market'],
    question: 'Where can I get ogbono that is fresh today?',
    answer: "Watt Market Delicacies restocked wild ogbono this morning and Calabar Fresh has the new palm-oil press in. Either can arrive within 35 minutes via CityDrive. The standard pack is 1 kg for ₦7,200 at Calabar Fresh.",
    results: [{ type: 'product', id: 'p02' }, { type: 'business', id: 'watt-market-delicacies' }],
    followUps: ['Add ogbono to cart', 'Order the market bundle', 'Get an edikang ikong pack'],
  },
  {
    keywords: ['ride', 'keke', 'airport', 'uff'],
    question: 'What does a ride to the airport cost right now?',
    answer: 'A CitySolo from Marian Road to the Margaret Ekpo Airport runs about ₦2,800 and takes 25 minutes in evening traffic. I can flag the nearest rider now.',
    results: [{ type: 'route', id: 'airport' }],
    followUps: ['Request a ride to the airport', 'Compare keke vs SUV'],
  },
  {
    keywords: ['party', 'tray', 'jollof', 'weekend feast'],
    question: 'Anyone doing a party jollof tray this weekend?',
    answer: 'Eko Kitchen has the party jollof tray (serves 8) for ₦24,500 this weekend with a ₦3,500 discount on bookings. Order 48 hours ahead and CityDrive will handle the tray.',
    results: [{ type: 'product', id: 'p08' }, { type: 'business', id: 'eko-kitchen' }],
    followUps: ['Book the party tray', 'Check delivery slots'],
  },
  {
    keywords: ['rent', '2 bedroom', 'flat', 'move'],
    question: 'Where can I rent a 2-bedroom in Calabar?',
    answer: 'Two-bedroom flats available now: Ekorinim Garden Flat (₦800,000/yr, gated) and the Margaret Ekpo furnished three-bedroom if you want space. Both hold a deposit through CityPay and the first month is due on move-in.',
    results: [{ type: 'property', id: 'h01' }, { type: 'property', id: 'h02' }],
    followUps: ['Apply for the garden flat', 'Pay deposit via CityPay', 'Book a viewing'],
  },
  {
    keywords: ['power', 'inverter', 'solar', 'blackout'],
    question: 'My power is out — what does an inverter cost?',
    answer: 'Marian Electronics installs inverters and solar in Calabar metro, with installation included this month. A backup power bank (20,000 mAh) is ₦18,500 if you want something portable today.',
    results: [{ type: 'product', id: 'p15' }, { type: 'business', id: 'marian-electronics' }],
    followUps: ['Add the power bank', 'Book an inverter install', 'Compare generators'],
  },
];

export type ActivityKind = 'order' | 'payment' | 'delivery' | 'rent' | 'promo' | 'security' | 'ride';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  body: string;
  time: string;
  href?: string;
}

export const ACTIVITY_KIND_META: Record<ActivityKind, { label: string; icon: LucideIcon }> = {
  order: { label: 'Order', icon: ShoppingBag },
  payment: { label: 'Payment', icon: Banknote },
  delivery: { label: 'Delivery', icon: Truck },
  rent: { label: 'CityHouse', icon: Building2 },
  promo: { label: 'Promo', icon: Sparkles },
  security: { label: 'Security', icon: ShieldCheck },
  ride: { label: 'Ride', icon: Car },
};

export const DEMO_ACTIVITY: ActivityItem[] = [
  { id: 'a01', kind: 'delivery', title: 'Delivery dispatched', body: 'Samuel Edem picked up your Calabar Fresh order. Arriving in 12 min at State Housing Estate.', time: '4 min ago', href: '/drive/delivery' },
  { id: 'a02', kind: 'payment', title: 'CityPay top-up confirmed', body: '₦50,000 added to your wallet from GTBank. Balance: ₦146,000.', time: '26 min ago', href: '/profile' },
  { id: 'a03', kind: 'order', title: 'Order CC-2841 confirmed', body: 'Your (2) items from Calabar Fresh Market are being packed. Paid with CityPay.', time: '1h ago', href: '/checkout' },
  { id: 'a04', kind: 'rent', title: 'Rent payment reminder', body: 'Ekorinim Garden Flat — next rent of ₦66,667 due in 12 days. Pay now to stay covered.', time: '3h ago', href: '/house/h01/pay' },
  { id: 'a05', kind: 'promo', title: 'New-customer offer', body: '10% off your first Calabar Fresh order over ₦10,000. Applied automatically at checkout.', time: '5h ago', href: '/biz/calabar-fresh' },
  { id: 'a06', kind: 'ride', title: 'Ride CC-R220 completed', body: 'CitySolo · Uyo Road to Ekorinim — ₦1,900. Thanks for riding with us.', time: '1d ago', href: '/drive/ride' },
  { id: 'a07', kind: 'security', title: 'New sign-in to CityPay', body: 'We noticed a new device on your account. Tap to confirm it was you.', time: '2d ago', href: '/profile' },
];

export const NOTIFICATIONS = [
  { title: 'Driver nearing', body: 'Samuel Edem is 5 min away with your market order.', time: 'Now', href: '/drive/delivery' },
  { title: 'Price drop on your list', body: 'Power bank 20,000 mAh dropped to ₦18,500.', time: '2h', href: '/product/p15' },
  { title: 'Ekorinim flat application', body: 'Grace accepted your viewing request for Sat 10 AM.', time: '6h', href: '/house/h01' },
];

export interface RecentOrder {
  id: string;
  ref: string;
  merchant: string;
  items: string;
  total: number;
  status: 'delivered' | 'enroute' | 'paid' | 'packing';
  time: string;
  productId?: string;
}

export const DEMO_ORDERS: RecentOrder[] = [
  { id: 'o01', ref: 'CC-2841', merchant: 'Calabar Fresh Market', items: 'Ogbono 1kg + Palm oil 1L', total: 13700, status: 'enroute', time: 'Today, 1:20 PM', productId: 'p02' },
  { id: 'o02', ref: 'CC-2798', merchant: 'Watt Market Delicacies', items: 'Periwinkle 1kg', total: 6000, status: 'delivered', time: 'Yesterday' },
  { id: 'o03', ref: 'CC-2745', merchant: 'Eko Kitchen', items: 'Afang soup + fufu (2)', total: 9500, status: 'delivered', time: 'Aug 30' },
  { id: 'o04', ref: 'CC-2710', merchant: 'Medline Pharmacy', items: 'Vitamin C 1000mg', total: 6800, status: 'delivered', time: 'Aug 26' },
];

export const DEMO_PAYMENTS = [
  { id: 'pay01', ref: 'TXN-88421', note: 'Watt Market Delicacies · Periwinkle', amount: 6000, at: 'Yesterday, 6:12 PM' },
  { id: 'pay02', ref: 'TXN-88397', note: 'Wallet top-up from GTBank', amount: 50000, at: 'Today, 11:40 AM' },
  { id: 'pay03', ref: 'TXN-88116', note: 'Ride · CitySolo Uyo Rd → Ekorinim', amount: -1900, at: '2 days ago' },
  { id: 'pay04', ref: 'TXN-88004', note: 'CityHouse deposit · Ekorinim Garden', amount: -80000, at: 'Aug 18' },
];

export interface RideArea {
  name: string;
  near: string;
}

export const RIDE_AREAS: RideArea[] = [
  { name: 'Marian Road', near: 'City centre · market line' },
  { name: 'Watt Market', near: 'Busy all morning' },
  { name: 'Ekorinim', near: 'Quiet residential' },
  { name: 'Bogobiri', near: 'Restaurants & stadium' },
  { name: 'State Housing Estate', near: 'Home base' },
  { name: 'University of Calabar', near: 'Campus gate' },
  { name: 'Margaret Ekpo Airport', near: 'Airport road' },
  { name: 'Eight Miles', near: 'Outskirts' },
];

export interface RideClass {
  id: string;
  name: string;
  tagline: string;
  baseFare: number;
  perKm: number;
  eta: string;
  pax: number;
  icon: LucideIcon;
}

export const RIDE_CLASSES: RideClass[] = [
  { id: 'keke', name: 'CityKeke', tagline: 'Quick trips, city fares', baseFare: 800, perKm: 250, eta: '3 min', pax: 3, icon: Car },
  { id: 'solo', name: 'CitySolo', tagline: 'Sedan for the everyday', baseFare: 1200, perKm: 400, eta: '5 min', pax: 4, icon: Car },
  { id: 'go', name: 'CityGo', tagline: 'SUV comfort, family-sized', baseFare: 1800, perKm: 650, eta: '8 min', pax: 6, icon: Car },
];

export interface RouteFare {
  from: string;
  to: string;
  km: number;
  fare: number;
}

export const DEMO_ROUTE_FARES: RouteFare[] = [
  { from: 'Marian Road', to: 'Ekorinim', km: 3.2, fare: 1900 },
  { from: 'Marian Road', to: 'Bogobiri', km: 2.1, fare: 1500 },
  { from: 'Ekorinim', to: 'University of Calabar', km: 6.4, fare: 3100 },
  { from: 'State Housing Estate', to: 'Watt Market', km: 4.8, fare: 2400 },
  { from: 'Marian Road', to: 'Margaret Ekpo Airport', km: 13.6, fare: 2800 },
];

export const DELIVERY_ROUTE_STOPS = [
  { label: 'Calabar Fresh Market', area: 'Marian Road', x: 22, y: 66, state: 'done' as const },
  { label: 'Marian Road junction', area: 'City centre', x: 34, y: 52, state: 'done' as const },
  { label: 'Watt Market turn', area: 'Market line', x: 47, y: 40, state: 'done' as const },
  { label: 'Ekorinim close', area: 'Residential', x: 62, y: 30, state: 'current' as const },
  { label: 'State Housing Estate', area: 'Delivery address', x: 82, y: 18, state: 'next' as const },
];

export interface DemoDashboard {
  merchant: string;
  currency: string;
  today: { revenue: string; orders: number; customers: number; gmv: string };
  week: number[];
  labels: string[];
  recentOrders: { ref: string; name: string; area: string; amount: string; status: string; time: string }[];
  topProducts: { name: string; sold: number; revenue: string }[];
  reviews: { name: string; rating: number; text: string }[];
  delivery: { eta: string; activeRiders: number; onTime: number };
  payments: { ref: string; method: string; amount: string; settled: string }[];
}

export const DEMO_BIZ_DASHBOARD: DemoDashboard = {
  merchant: 'Calabar Fresh Market',
  currency: 'NGN',
  today: { revenue: '₦284,500', orders: 47, customers: 39, gmv: '₦371,900' },
  week: [120, 186, 142, 208, 176, 231, 284],
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  recentOrders: [
    { ref: 'CC-2841', name: 'Whitney Atim', area: 'State Housing Estate', amount: '₦13,700', status: 'Packed & out', time: '1:20 PM' },
    { ref: 'CC-2840', name: 'Effiong Bassey', area: 'Ekorinim', amount: '₦8,000', status: 'Assigned rider', time: '1:02 PM' },
    { ref: 'CC-2839', name: 'Nne Usoro', area: 'Bogobiri', amount: '₦21,900', status: 'Delivered', time: '12:44 PM' },
    { ref: 'CC-2838', name: 'Kufre Ene', area: 'Watt Market', amount: '₦6,500', status: 'Delivered', time: '12:20 PM' },
    { ref: 'CC-2837', name: 'Akan Ekpe', area: 'Marian Road', amount: '₦5,200', status: 'Delivered', time: '11:58 AM' },
  ],
  topProducts: [
    { name: 'Wild Ogbono 1kg', sold: 63, revenue: '₦453,600' },
    { name: 'Farm-fresh Palm Oil', sold: 51, revenue: '₦331,500' },
    { name: 'Calabar Crayfish 500g', sold: 47, revenue: '₦211,500' },
    { name: 'Fresh Snails pack', sold: 22, revenue: '₦176,000' },
  ],
  reviews: [
    { name: 'Whitney A.', rating: 5, text: 'Ogbono arrived at 9 AM, still fresh. This is the city I grew up in.' },
    { name: 'Basil O.', rating: 5, text: 'Periwinkle from Watt Market, weigh and pay in app. Brilliant.' },
    { name: 'Chidinma O.', rating: 4, text: 'Delivery was 8 minutes late but the palm oil is the best I have had.' },
  ],
  delivery: { eta: '22 min', activeRiders: 6, onTime: 94 },
  payments: [
    { ref: 'TXN-88421', method: 'CityPay', amount: '₦13,700', settled: 'Instant' },
    { ref: 'TXN-88420', method: 'Card', amount: '₦8,000', settled: 'Settled' },
    { ref: 'TXN-88419', method: 'CityPay', amount: '₦21,900', settled: 'Instant' },
  ],
};

export const CITY_NOTES = {
  greeting: "It's market day in Calabar.",
  weather: { temp: '29°C', note: 'Warm sun, afternoon showers', label: 'Partly cloudy' },
  topPickTitle: 'Popular around you',
  aiPlaceholder: 'Ask CityOS — e.g. “best room under ₦10,000 tonight”',
  demoDisclaimer:
    'This is a CityOS prototype with simulated demo data (naira prices, Calabar places and sample names). Nothing here is real or billable — it exists to show how the city experience would feel.',
};

export const ABSTRACT_ICONS: Record<string, LucideIcon> = {
  search: Search,
  sparkle: Sparkles,
  heart: Heart,
  message: MessageSquare,
  share: Share2,
  bag: ShoppingBag,
  join: UserPlus,
};