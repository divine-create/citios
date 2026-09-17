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
  BedDouble,
  Zap,
  Droplets,
  Smartphone,
  Tv,
  GraduationCap,
  Newspaper,
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

export const DEMO_WALLET_INITIAL = DEMO_USER.walletBalance;
export const WALLET_STORAGE_KEY = 'cityos-demo-wallet';
export const TOP_UP_AMOUNT = 50000;

export function parseNaira(s: string | number): number {
  return typeof s === 'number' ? s : Number(String(s).replace(/[₦,\s]/g, '')) || 0;
}

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
  { id: 'stay', label: 'Hotels Tonight', icon: BedDouble, href: '/stay', desc: 'Rooms held with CityPay' },
  { id: 'health', label: 'Health', icon: Stethoscope, href: '/care', desc: 'Clinics & pharmacies' },
  { id: 'events', label: 'Events', icon: Calendar, href: '/events', desc: 'Around town today' },
  { id: 'services', label: 'Services', icon: Wrench, href: '/tasks', desc: 'Trades & services' },
  { id: 'bills', label: 'Bills & Airtime', icon: Zap, href: '/bills', desc: 'Power, water & data' },
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
  { id: 'p02', bizSlug: 'calabar-fresh', name: 'Wild Ogbono (Bush Mango)', price: 7200, unit: '1 kg', stock: 26, tag: 'local', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.9, reviews: 88, desc: 'Premium ogbono seeds for the thickest, richest draw soup. Sourced from Cross River bush markets.' },
  { id: 'p03', bizSlug: 'calabar-fresh', name: 'Fresh Snails (6 pcs)', price: 8000, unit: 'pack', stock: 15, tag: 'best', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80', category: 'Protein', rating: 4.7, reviews: 64, desc: 'Cleaned, live snails straight from the farm. Perfect for pepper soup and Sunday soup.' },
  { id: 'p04', bizSlug: 'calabar-fresh', name: 'Calabar Crayfish', price: 4500, unit: '500 g', stock: 58, tag: 'new', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.8, reviews: 143, desc: 'Sun-dried, smoked crayfish ground to order. The backbone of authentic Calabar soups.' },
  { id: 'p05', bizSlug: 'watt-market-delicacies', name: 'Periwinkle 1 kg', price: 6000, unit: '1 kg', stock: 19, tag: 'best', image: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=900&q=80', category: 'Protein', rating: 4.6, reviews: 57, desc: 'Salted periwinkle from the creeks, cleaned and ready for efik soup.' },
  { id: 'p06', bizSlug: 'watt-market-delicacies', name: 'Big Robo Pepper', price: 3200, unit: '250 g', stock: 33, tag: 'best', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80', category: 'Fresh', rating: 4.7, reviews: 92, desc: 'Smoky dried big robo — your secret ingredient for that deep-forest heat.' },
  { id: 'p07', bizSlug: 'watt-market-delicacies', name: 'Edikang Ikong Veg Pack', price: 5800, unit: 'bundle', stock: 12, tag: 'local', image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80', category: 'Fresh', rating: 4.9, reviews: 76, desc: 'Waterleaf + fluted pumpkin prepped and bundled. Make the king of Calabar soups tonight.' },
  { id: 'p08', bizSlug: 'eko-kitchen', name: 'Party Jollof + Chicken (Serves 8)', price: 24500, oldPrice: 28000, unit: 'tray', stock: 8, tag: 'promo', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.8, reviews: 210, desc: 'The Eko Kitchen party tray. Smoky rice, grilled chicken, and moin moin. Book 48 hours ahead.' },
  { id: 'p09', bizSlug: 'eko-kitchen', name: 'Afang Soup + Water Fufu (2)', price: 9500, unit: 'set', stock: 20, tag: 'best', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.7, reviews: 134, desc: 'Crown chef special: rich afang with palm oil, periwinkle and stockfish, plus fresh fufu.' },
  { id: 'p10', bizSlug: 'tinapa-fashion', name: 'Ankara Two-Piece Set', price: 24000, unit: 'piece', stock: 14, tag: 'new', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.6, reviews: 45, desc: 'Contemporary ankara blouse and wrapper set tailored in Tinapa district.' },
  { id: 'p11', bizSlug: 'tinapa-fashion', name: 'Men’s Leather Sandals', price: 15500, oldPrice: 19500, unit: 'pair', stock: 9, tag: 'promo', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.5, reviews: 31, desc: 'Hand-stitched leather sandals, made for our heat. Built to last years, not months.' },
  { id: 'p12', bizSlug: 'medline-pharmacy', name: 'Antimalarial Combo (3-day)', price: 4200, unit: 'pack', stock: 40, tag: 'best', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80', category: 'Health', rating: 4.9, reviews: 118, desc: 'Prescribed course, delivered to your door. Pharmacist consult included via City Care.' },
  { id: 'p13', bizSlug: 'medline-pharmacy', name: 'Vitamin C 1000mg (60 tabs)', price: 6800, unit: 'bottle', stock: 27, tag: 'best', image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=900&q=80', category: 'Health', rating: 4.7, reviews: 87, desc: 'Sustained-release vitamin C for the rainy season. Stocked by the City pharmacy network.' },
  { id: 'p14', bizSlug: 'marian-electronics', name: 'Noise-cancel Headphones', price: 45000, unit: 'unit', stock: 6, tag: 'best', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', category: 'Electronics', rating: 4.6, reviews: 52, desc: 'Studio-grade sound with 30h battery. 1-year CityCare protection plan available.' },
  { id: 'p15', bizSlug: 'marian-electronics', name: 'Power Bank 20,000mAh', price: 18500, oldPrice: 22000, unit: 'unit', stock: 18, tag: 'promo', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80', category: 'Electronics', rating: 4.7, reviews: 73, desc: 'Dual-port fast charge, the everyday companion for Calabar blackouts.' },
  { id: 'p16', bizSlug: 'calabar-coffee', name: 'Calabar Cappuccino', price: 2800, unit: 'cup', stock: 50, tag: 'best', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80', category: 'Cafe', rating: 4.8, reviews: 166, desc: 'Hausa-grown medium roast with Ghanaian cocoa dust. Sit by the Ekorinim garden or take away.' },
  { id: 'q01', bizSlug: 'freshmart-calabar', name: 'Local Rice 5kg bag', price: 17500, unit: 'bag', stock: 34, tag: 'promo', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.8, reviews: 96, desc: 'The market-day staple from the West African mill — steamed and fluffy every time.' },
  { id: 'q02', bizSlug: 'freshmart-calabar', name: 'Farm Eggs (Tray of 30)', price: 7600, unit: 'tray', stock: 12, tag: 'best', image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=80', category: 'Protein', rating: 4.7, reviews: 74, desc: 'Fresh-laid eggs from the Big Qua farm run, packed same morning for CityDrive.' },
  { id: 'q03', bizSlug: 'freshmart-calabar', name: 'Uzuza & Uda (Mixed)', price: 2800, unit: 'pack', stock: 40, tag: 'local', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.8, reviews: 51, desc: 'The pepper-and-aroma twosome for your best soups. Fresh stock every market day.' },
  { id: 'q04', bizSlug: 'freshmart-calabar', name: 'Groundnut Oil 2L', price: 11500, unit: 'bottle', stock: 23, tag: 'best', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.6, reviews: 83, desc: 'Cold-pressed groundnut oil, comes clean and cooks golden.' },
  { id: 'q05', bizSlug: 'freshmart-calabar', name: 'Weekend Restock Box', price: 28400, oldPrice: 32000, unit: 'box', stock: 6, tag: 'new', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80', category: 'Pantry', rating: 4.9, reviews: 28, desc: 'The curated monthly box — rice, oil, egusi, crayfish and a surprise snack under shelf price.' },
  { id: 'q06', bizSlug: 'mamas-kitchen', name: 'Afang Soup + Fufu (2)', price: 9500, unit: 'set', stock: 42, tag: 'best', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.8, reviews: 167, desc: "Mama's kitchen afang, rich with palm oil, periwinkle and stockfish, plus fresh water fufu." },
  { id: 'q07', bizSlug: 'mamas-kitchen', name: 'Party Jollof Tray (serves 8)', price: 24500, oldPrice: 28000, unit: 'tray', stock: 9, tag: 'promo', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.7, reviews: 118, desc: 'Smoky party jollof with grilled chicken. Order 48 hours ahead, arrive hot via CityDrive.' },
  { id: 'q08', bizSlug: 'mamas-kitchen', name: 'Puff Puff (24 pcs)', price: 5800, unit: 'box', stock: 64, tag: 'new', image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80', category: 'Snacks', rating: 4.8, reviews: 74, desc: 'Golden, greaseless puff puff dusted with a hint of nutmeg. Box of 24, gone in minutes.' },
  { id: 'q09', bizSlug: 'mamas-kitchen', name: 'Home Stew Pot (2L)', price: 12500, unit: 'pot', stock: 14, tag: 'best', image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=900&q=80', category: 'Meals', rating: 4.7, reviews: 92, desc: 'Rich tomato-and-pepper stew pot with assorted meat. Feed the whole house for days.' },
  { id: 'q10', bizSlug: 'urban-threads-calabar', name: 'Ankara Two-Piece Set', price: 18500, unit: 'set', stock: 8, tag: 'best', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.7, reviews: 66, desc: 'Studio-lined ankara blouse and wrapper, cut and finished in the S.H.E. studio.' },
  { id: 'q11', bizSlug: 'urban-threads-calabar', name: 'Tailored Office Pant', price: 11500, unit: 'pc', stock: 14, tag: 'new', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.6, reviews: 39, desc: 'Sharp office pant with a comfortable rise, made for the Calabar heat.' },
  { id: 'q12', bizSlug: 'urban-threads-calabar', name: 'Linen Office Shirt', price: 9800, tag: 'promo', unit: 'pc', stock: 22, image: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&w=900&q=80', category: 'Fashion', rating: 4.5, reviews: 31, desc: 'Lightweight linen shirt, wrinkle-resistant, five colours in stock.' },
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
  {
    slug: 'freshmart-calabar',
    name: 'FreshMart Calabar',
    categoryId: 'grocery',
    category: 'Groceries',
    area: 'Big Qua Town',
    address: '14 Big Qua Town Line, Calabar',
    tagline: 'Fresh produce, weighed and priced in-app',
    desc: 'The ShopOS anchor store. Fresh produce, pantry staples and household essentials weighed on the market floor and priced live in naira. CityDrive delivers around Calabar in under 25 minutes.',
    rating: 4.8,
    reviews: 641,
    isOpen: true,
    hours: '6:00 AM – 9:00 PM · Daily',
    deliveryEta: 22,
    deliveryFee: 1200,
    cover: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['q01', 'q02', 'q03', 'q04'],
    offers: [
      { title: 'Market day bundle', note: 'Any 3 packs, 15% off' },
      { title: 'Free delivery over ₦25,000', note: 'Auto-applied at checkout' },
    ],
    tags: ['ShopOS', 'Big Qua Town', 'CityDrive 22 min'],
  },
  {
    slug: 'mamas-kitchen',
    name: "Mama's Kitchen Calabar",
    categoryId: 'food',
    category: 'Restaurant',
    area: 'Marian Road',
    address: '22 Marian Road, Calabar',
    tagline: 'Home plates, party trays, delivered hot',
    desc: 'Fresh fufu, afang and edikang ikong by the plate or the party tray. Cooked to order around Marian Road and delivered by CityDrive.',
    rating: 4.7,
    reviews: 428,
    isOpen: true,
    hours: '10:00 AM – 9:30 PM · Daily',
    deliveryEta: 28,
    deliveryFee: 1500,
    cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['q06', 'q07', 'q08'],
    offers: [{ title: 'Party tray early-bird', note: '₦3,500 off 24h bookings' }],
    tags: ['ShopOS', 'Marian Road', 'Party Trays'],
  },
  {
    slug: 'urban-threads-calabar',
    name: 'Urban Threads Calabar',
    categoryId: 'services',
    category: 'Fashion',
    area: 'State Housing Estate',
    address: 'Margaret Ekpo Ave, S.H.E., Calabar',
    tagline: 'Ankara, office wear & street fits',
    desc: 'Locally tailored ankara sets, office separates and weekend street fits with next-day tailoring through the studio rail.',
    rating: 4.6,
    reviews: 310,
    isOpen: true,
    hours: '9:00 AM – 8:00 PM · Mon–Sat',
    deliveryEta: 40,
    deliveryFee: 1800,
    cover: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=200&q=80',
    featuredProductIds: ['q10', 'q11', 'q12'],
    offers: [{ title: 'First-fit Friday', note: 'Free alteration on any two-piece' }],
    tags: ['ShopOS', 'State Housing', 'Studio'],
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

export interface DemoHotel {
  slug: string;
  name: string;
  area: string;
  address: string;
  tagline: string;
  desc: string;
  rating: number;
  reviews: number;
  pricePerNight: number;
  nearStadium: boolean;
  guests: number;
  roomsLeft: number;
  image: string;
  amenities: string[];
  tags: string[];
  open24: boolean;
  featured: boolean;
}

export const DEMO_HOTELS: DemoHotel[] = [
  {
    slug: 'bogobiri-stadium-lodge',
    name: 'Bogobiri Stadium Lodge',
    area: 'Bogobiri',
    address: '7 Stadium Road, Bogobiri',
    tagline: 'Four minutes from the parade grounds',
    desc: 'The nearest beds to the carnival rehearsals. Simple, clean doubles with AC, hot water and parking — most rooms fill by 5 PM on rehearsal nights.',
    rating: 4.5,
    reviews: 212,
    pricePerNight: 9200,
    roomsLeft: 4,
    nearStadium: true,
    guests: 2,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80',
    amenities: ['A/C', 'Hot water', 'Parking', 'Free Wi-Fi'],
    tags: ['Near stadium', 'Budget'],
    open24: true,
    featured: false,
  },
  {
    slug: 'ekorinim-guest',
    name: 'Ekorinim Guest House',
    area: 'Ekorinim',
    address: '4 Ekorinim Avenue, Calabar',
    tagline: 'Clean rooms, steady power, sleep easy',
    desc: 'A favourite of the coffee-house crowd. Bright en-suite doubles with backup power through the night and a covered porch for morning phone calls.',
    rating: 4.6,
    reviews: 240,
    pricePerNight: 8500,
    roomsLeft: 6,
    nearStadium: false,
    guests: 2,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80',
    amenities: ['A/C', 'Hot water', 'Backup power', 'Free Wi-Fi'],
    tags: ['Best value', 'Quiet'],
    open24: true,
    featured: true,
  },
  {
    slug: 'tinapa-crown',
    name: 'Tinapa Crown Hotel',
    area: 'Tinapa',
    address: 'Tinapa Business Resort, Calabar',
    tagline: 'Resort rooms with the river view',
    desc: 'Full-service rooms by the Tinapa waterside — pool access, room service and the famous Friday night jollof buffet.',
    rating: 4.4,
    reviews: 96,
    pricePerNight: 12500,
    roomsLeft: 3,
    nearStadium: false,
    guests: 2,
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Pool', 'Room service', 'A/C', 'Breakfast'],
    tags: ['Resort'],
    open24: true,
    featured: false,
  },
  {
    slug: 'marina-suites',
    name: 'Calabar Marina Suites',
    area: 'Marina Road',
    address: 'Marina Road, Calabar South',
    tagline: 'Business comfort on the water',
    desc: 'Suites along the Marina with city-facing balconies, fast Wi-Fi and a rooftop restaurant that catches the sunset over the canal.',
    rating: 4.6,
    reviews: 158,
    pricePerNight: 24000,
    roomsLeft: 5,
    nearStadium: false,
    guests: 3,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Sea view', 'Fast Wi-Fi', 'Restaurant', 'Gym'],
    tags: ['Premium'],
    open24: true,
    featured: false,
  },
  {
    slug: 'maple-square',
    name: 'Maple Square Hotel',
    area: 'Ekorinim',
    address: '12 Ndidem, Ekorinim',
    tagline: 'Quiet rooms off the main drag',
    desc: 'Compact, spotless floors and a yard to park in. Popular with visitors who want the Ekorinim neighbourhood without the noise.',
    rating: 4.2,
    reviews: 71,
    pricePerNight: 11000,
    roomsLeft: 7,
    nearStadium: false,
    guests: 2,
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80',
    amenities: ['A/C', 'Parking', '24-hr desk'],
    tags: ['Quiet'],
    open24: false,
    featured: false,
  },
];

export function getHotel(slug: string): DemoHotel | undefined {
  return DEMO_HOTELS.find((h) => h.slug === slug);
}

export interface DemoDoctor {
  name: string;
  specialty: string;
  fee: number;
  slots: string;
  rating: number;
}

export interface DemoClinic {
  slug: string;
  name: string;
  type: string;
  area: string;
  address: string;
  tagline: string;
  desc: string;
  rating: number;
  reviews: number;
  hours: string;
  banner: string;
  doctors: DemoDoctor[];
  services: string[];
  open: boolean;
  featured: boolean;
}

export const DEMO_CLINICS: DemoClinic[] = [
  {
    slug: 'calabar-general',
    name: 'Calabar General Hospital · Outpatient',
    type: 'Hospital',
    area: 'Marina Road',
    address: 'General Hospital Road, Calabar South',
    tagline: 'The city hospital, without the queue of the past',
    desc: 'Outpatient clinics with appointments booked through CityOS. Labs, pharmacy and the walk-in ward are under one roof on the Marina.',
    rating: 4.6,
    reviews: 310,
    hours: '8:00 AM – 9:00 PM · Daily',
    banner: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
    doctors: [
      { name: 'Dr Nkechi Bassey', specialty: 'General Practice', fee: 4000, slots: '3 open today', rating: 4.8 },
      { name: 'Dr Orok Asuquo', specialty: 'Internal Medicine', fee: 6000, slots: '2 open today', rating: 4.7 },
      { name: 'Dr Ifiok Essien', specialty: 'Paediatrics', fee: 5000, slots: 'Am & PM tomorrow', rating: 4.9 },
    ],
    services: ['General practice', 'Labs & scans', 'Pharmacy on site', 'NHIS accepted'],
    open: true,
    featured: true,
  },
  {
    slug: 'shepherds-care',
    name: "Shepherd's Care Clinic",
    type: 'Clinic',
    area: 'Ekorinim',
    address: '9 Ekorinim Road, Calabar',
    tagline: 'Family medicine that keeps neighbourhood hours',
    desc: 'A small neighbourhood clinic with GP and skin clinics that stay open late. Same-day slots most evenings.',
    rating: 4.7,
    reviews: 188,
    hours: '8:00 AM – 8:00 PM · Mon–Sat',
    banner: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=1200&q=80',
    doctors: [
      { name: 'Dr Mercy Eyo', specialty: 'Family Medicine', fee: 3500, slots: '4 open today', rating: 4.8 },
      { name: 'Dr David Atim', specialty: 'Dermatology', fee: 5000, slots: 'Open Sat AM', rating: 4.6 },
    ],
    services: ['Family medicine', 'Skin clinic', 'Malaria tests', 'BP checks'],
    open: true,
    featured: true,
  },
  {
    slug: 'medline-care',
    name: 'Medline Care Centre',
    type: 'Pharmacy-led clinic',
    area: 'Ekorinim',
    address: '5 Ekorinim Road, Calabar',
    tagline: 'Pharmacist first, doctor when you need one',
    desc: 'Run by the Medline Pharmacy team. Start with a free pharmacist consult and escalate to a doctor if the situation asks for it.',
    rating: 4.8,
    reviews: 121,
    hours: '8:00 AM – 10:00 PM · Daily',
    banner: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
    doctors: [
      { name: 'Dr Aniekan Effiom', specialty: 'Pharmacist-led clinic', fee: 3000, slots: 'Walk in today', rating: 4.7 },
      { name: 'Phm Comfort Odu', specialty: 'Free pharmacist consult', fee: 0, slots: 'Instant', rating: 4.9 },
    ],
    services: ['Free pharmacist consult', 'Doctor on call', 'Med delivery', 'Vaccines'],
    open: true,
    featured: false,
  },
];

export function getClinic(slug: string): DemoClinic | undefined {
  return DEMO_CLINICS.find((c) => c.slug === slug);
}

export interface DemoSchool {
  slug: string;
  name: string;
  level: string;
  area: string;
  address: string;
  tagline: string;
  desc: string;
  rating: number;
  image: string;
  programs: string[];
  term: string;
  contact: string;
  featured: boolean;
  osSlug?: string;
}

export const DEMO_SCHOOLS: DemoSchool[] = [
  {
    slug: 'unical-admissions',
    name: 'University of Calabar',
    level: 'Higher Education',
    area: 'University of Calabar',
    address: 'PMB 1115, Calabar',
    tagline: 'Admissions office, open desk & help desk',
    desc: 'Admission enquiries for the new session: status checks, direct entry and pre-degree applications. Book a desk session and skip the morning queue.',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80',
    programs: ['Admissions & status checks', 'Direct entry', 'Pre-degree', 'Transcript requests'],
    term: '2026/27 session open',
    contact: 'admissions@unical.example',
    featured: true,
  },
  {
    slug: 'west-end-schools',
    name: 'West End School Calabar',
    level: 'Primary & Junior Secondary',
    area: 'Calabar South',
    address: '14 West End Lane, Calabar South',
    tagline: 'Crèche to JSS in one familiar compound',
    desc: 'A full-run school by the canal: creche mornings, structured primary classes and a junior secondary stream with after-school clubs.',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80',
    programs: ['Creche & daycare', 'Primary (Basic 1–6)', 'Junior Secondary (JSS 1–3)', 'After-school clubs'],
    term: 'New intake open · 60 places',
    contact: 'admin@westend.example',
    featured: true,
  },
  {
    slug: 'cypress-garden',
    name: 'Cypress Garden School',
    level: 'Creche to Secondary',
    area: 'Ekorinim',
    address: '2 Cypress Close, Ekorinim',
    tagline: 'Small classes, steady routines',
    desc: 'A garden school in Ekorinim with capped class sizes and a feeding programme. Tour bookings run every Saturday morning.',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1000&q=80',
    programs: ['Creche & nursery', 'Primary school', 'Secondary school', 'Saturday tours'],
    term: 'Tours open · 45 places',
    contact: 'hello@cypressgarden.example',
    featured: false,
    osSlug: 'cypress-garden-school',
  },
  {
    slug: 'hope-academy',
    name: 'Hope Academy Calabar',
    level: 'Nursery to Senior Secondary',
    area: 'Ikot Ansa',
    address: '5 Hope Avenue, Ikot Ansa, Calabar',
    tagline: 'Nursery to Senior Secondary',
    desc: 'The SchoolOS anchor school. Nursery through SSS with low student-teacher ratios, termly results published to parents, and intake around the year.',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80',
    programs: ['Creche & nursery', 'Primary school', 'Junior Secondary', 'Senior Secondary', 'ICT studio'],
    term: 'New intake open · 60 places',
    contact: 'admissions@hopeacademy.example',
    featured: true,
    osSlug: 'hope-academy',
  },
];

export function getSchool(slug: string): DemoSchool | undefined {
  return DEMO_SCHOOLS.find((s) => s.slug === slug);
}

export interface DemoTask {
  id: string;
  name: string;
  category: string;
  desc: string;
  area: string;
  from: number;
  eta: string;
  pro: string;
  rating: number;
  image: string;
}

export const DEMO_TASKS: DemoTask[] = [
  { id: 't01', name: 'Leaky pipe, sink or toilet', category: 'Plumbing', desc: 'Call-out, diagnosis and a same-day fix for a leak, blocked drain or running toilet. Parts billed after approval.', area: 'Anywhere in Calabar', from: 7500, eta: '2 hrs', pro: 'Ubong Okon', rating: 4.8, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80' },
  { id: 't02', name: 'Sockets, switches & rewiring', category: 'Electrical', desc: 'Dead sockets, tripping breakers or a new point for your inverter. Testing kit on board, invoice on the go.', area: 'Anywhere in Calabar', from: 6500, eta: '3 hrs', pro: 'Ekaette Bassey', rating: 4.7, image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80' },
  { id: 't03', name: 'Deep home & office cleaning', category: 'Cleaning', desc: 'Two-person crew, your products or ours. Floors, kitchens, bathrooms and a final walk-through list.', area: 'Calabar metro', from: 12000, eta: '4 hrs', pro: 'Comfort Udofia', rating: 4.9, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80' },
  { id: 't04', name: 'AC service & gas refill', category: 'HVAC', desc: 'Filter service, coil clean and a pressure test — with gas refill quoted before we touch the unit.', area: 'Calabar metro', from: 9000, eta: 'Half day', pro: 'Chidi Eze', rating: 4.6, image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80' },
  { id: 't05', name: 'Moving / haulage runs', category: 'Logistics', desc: 'One van, careful crew, cross-town moves and market pickups. Hourly rate with a fixed quote first.', area: 'Calabar + outskirts', from: 25000, eta: 'Same day', pro: 'Effiong Ekanem', rating: 4.7, image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80' },
  { id: 't06', name: 'TV mount & setup', category: 'Installation', desc: 'Mount, level, hide the cables and pair everything. We bring the drill and the anchors.', area: 'Calabar metro', from: 5000, eta: '2 hrs', pro: 'Pius Nyong', rating: 4.8, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80' },
];

export function getTask(id: string): DemoTask | undefined {
  return DEMO_TASKS.find((t) => t.id === id);
}

export interface DemoBill {
  slug: string;
  name: string;
  kind: 'power' | 'water' | 'data' | 'tv';
  note: string;
  balance: number;
  due: string;
}

export const DEMO_BILLS: DemoBill[] = [
  { slug: 'phec', name: 'Calabar Electric (PHEDC)', kind: 'power', note: 'Account 42-1829-01 · State Housing Estate', balance: 12400, due: 'due in 4 days' },
  { slug: 'water-board', name: 'Cross River Water Board', kind: 'water', note: 'Bill 005-7712 · Marian Road 02', balance: 3200, due: 'due in 9 days' },
  { slug: 'mtn-data', name: 'MTN Data Bundle', kind: 'data', note: 'Line 0803 44 55 66', balance: 5000, due: 'top up anytime' },
  { slug: 'dstv-go', name: 'DStv / GOtv Subscription', kind: 'tv', note: 'SmartCard 1200558827', balance: 19000, due: 'due in 2 days' },
];

export function getBill(slug: string): DemoBill | undefined {
  return DEMO_BILLS.find((b) => b.slug === slug);
}

export const BILL_KIND_ICONS: Record<DemoBill['kind'], LucideIcon> = {
  power: Zap,
  water: Droplets,
  data: Smartphone,
  tv: Tv,
};

export interface DemoNews {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  author: string;
  time: string;
  image: string;
  content: string[];
}

export const DEMO_NEWS: DemoNews[] = [
  {
    id: 'n01',
    title: 'Carnival 2026: parade route and traffic plan released',
    category: 'City',
    excerpt: 'The Carnival Commission has published the December route, road closures and the rehearsal schedule that starts this week.',
    author: 'Calabar City Journal',
    time: '2h ago',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    content: [
      'The Carnival Commission released the full parade route this morning, with the grand procession line opening at the stadium and closing at the marina roundabout.',
      'Rehearsal nights at Bogobiri Stadium Grounds begin this week and run 6–9 PM daily. Band lanes and keke parking are marked along the fence line.',
      'Residents can view the interactive route and register for road-closure alerts from the City desk inside the app. The full traffic plan applies from Friday.',
    ],
  },
  {
    id: 'n02',
    title: 'Cross River opens new rice mill near Eight Miles',
    category: 'Business',
    excerpt: 'The 3,000-tonne-capacity mill plans to take paddy from local farmers and cut imported rice reliance across the state.',
    author: 'Calabar City Journal',
    time: '6h ago',
    image: 'https://images.unsplash.com/photo-1581578749513-dbf749b2d9bb?auto=format&fit=crop&w=1000&q=80',
    content: [
      'A new rice mill has opened on the Estate Road near Eight Miles, backed by the state agricultural board and two trading cooperatives.',
      'Officials say the mill will process paddy bought directly from Cross River farmers, with first sale expected before the end of the month.',
      'The project adds about 40 jobs on the mill floor and a buying station on the outskirts of Calabar.',
    ],
  },
  {
    id: 'n03',
    title: 'Free blood-pressure clinics start at Watt Market',
    category: 'Health',
    excerpt: 'Pharmacists and nurses will run free BP checks at Stall D12 every market Tuesday, in partnership with the City care network.',
    author: 'Calabar City Journal',
    time: '1d ago',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1000&q=80',
    content: [
      'From this week, market Tuesday at Watt Market includes a free blood-pressure clinic under the canopy near Stall D12.',
      'Trained pharmacists take readings between 9 AM and 1 PM, with instant referrals to the outpatient clinic for anything high.',
      'The programme is a pilot with Shepherd’s Care Clinic and the pharmacy network, and may extend to Marian Road after the first month.',
    ],
  },
  {
    id: 'n04',
    title: 'Festive funfair lighting up Marina Road this weekend',
    category: 'Culture',
    excerpt: 'Stalls, carnival bands and an evening light show run Saturday to Sunday along the Marina walkway.',
    author: 'Calabar City Journal',
    time: '2d ago',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
    content: [
      'The Marina funfair returns this weekend with food stalls, two carnival band sessions and a late-evening light show on the walkway.',
      'Entry is free for residents; the main band performance on Saturday runs from 6 PM. Weekend parking is directed to the Bogobiri lot.',
      'Organisers ask everyone to use the marked keke stands so the walkway stays clear.',
    ],
  },
];

export function getNews(id: string): DemoNews | undefined {
  return DEMO_NEWS.find((n) => n.id === id);
}

export interface CityNotice {
  tone: 'info' | 'warn' | 'ok' | 'update';
  title: string;
  body: string;
  time: string;
}

export const DEMO_CITY_NOTICES: CityNotice[] = [
  { tone: 'warn', title: 'Water work on Marian Road', body: 'Cross River Water Board repairs run 9 AM – 1 PM. Feed your tank in the morning.', time: 'Starts today' },
  { tone: 'update', title: 'Carnival traffic plan published', body: 'Parade route and closures are live on the City desk and in the feed.', time: 'City Affairs' },
  { tone: 'info', title: 'Evening voltage low in S.H.E.', body: 'PHEDC reports lower evening load in State Housing Estate; keep backups charged.', time: 'Power' },
  { tone: 'ok', title: 'Market line open', body: 'Marian Road and Watt Market are moving freely this afternoon.', time: 'Just now' },
];

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
  { id: 'f09', author: 'FreshMart Calabar', role: 'ShopOS', avatarImg: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80', time: '20m ago', category: 'Marketplace', title: 'Saturday farm line is live', body: 'Direct-from-farm produce is rolling in at Big Qua Town. Market-day bundle — any 3 packs, 15% off — for the first 40 orders.', image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1000&q=80', likes: 96, comments: 12, shares: 14, href: { label: 'Shop FreshMart', url: '/biz/freshmart-calabar' }, isOrg: true },
  { id: 'f10', author: "Mama's Kitchen Calabar", role: 'ShopOS', avatarImg: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80', time: '45m ago', category: 'Offer', title: 'Thursday tasting is on', body: 'Free afang tasting at the Marian Road kitchen from 1 PM. Party tray bookings made today keep their same-week slot.', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=80', likes: 74, comments: 9, shares: 6, href: { label: 'See the event', url: '/events/e05' }, isOrg: true },
  { id: 'f11', author: 'David Ekong', role: 'Resident · S.H.E.', time: '1h ago', category: 'Community', title: 'Power lines restored in S.H.E.', body: 'PHEDC confirmed the estate line is back. Feed report from Nyakasang says their side comes on this evening.', likes: 49, comments: 21, shares: 8 },
  { id: 'f12', author: "Mike's AC Services", role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=200&q=80', time: '2h ago', category: 'Update', title: 'Check-up weekend opens', body: 'Filter service and gas check at 20% off this weekend at our Ekorinim base. Window units picked up same day.', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1000&q=80', likes: 62, comments: 7, shares: 9, href: { label: 'Book a slot', url: '/events/e09' }, isOrg: true },
  { id: 'f13', author: 'Hope Academy Calabar', role: 'SchoolOS', avatarImg: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=200&q=80', time: '3h ago', category: 'Event', title: 'Sports day this Saturday', body: 'Inter-house games march in from 9 AM. Food stalls run all morning; parents relay at 11 sharp. Free entry.', likes: 122, comments: 18, shares: 21, href: { label: 'Sports day details', url: '/events/e07' }, isOrg: true },
  { id: 'f14', author: 'Emem Ekanem', role: 'Resident · Calabar South', time: '4h ago', category: 'Ask the city', title: 'Anyone selling a used inverter?', body: '2kVA or bigger, working. Drop prices in the comments — cash on collection at Marina Road.', likes: 33, comments: 26, shares: 4 },
  { id: 'f15', author: 'Calabar CleanCare', role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80', time: '5h ago', category: 'Offer', title: 'Move-in cleans: 2 for 1', body: 'Landlord turnover package — move-out plus move-in at one price this month. Products included.', likes: 58, comments: 6, shares: 11, href: { label: 'Book a clean', url: '/workspaces/serviceos/calabar-cleancare' }, isOrg: true },
  { id: 'f16', author: 'Urban Threads Calabar', role: 'ShopOS', avatarImg: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=200&q=80', time: '6h ago', category: 'Commerce', title: 'Citadel ankara arrived', body: 'New bolt in the studio — two-piece sets ready from Friday. First-fit Friday means free alterations.', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=80', likes: 87, comments: 14, shares: 5, href: { label: 'Shop the studio', url: '/biz/urban-threads-calabar' }, isOrg: true },
  { id: 'f17', author: 'Calabar Moments Photography', role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?auto=format&fit=crop&w=200&q=80', time: '7h ago', category: 'Update', title: 'Carnival night gallery is up', body: '240 frames from Bogobiri rehearsal night are live in the studio gallery. Tag your friends, download free.', likes: 154, comments: 23, shares: 44, href: { label: 'Browse gallery', url: '/workspaces/serviceos/calabar-moments-photography' }, isOrg: true },
  { id: 'f18', author: 'Calabar Creative Hub', role: 'City Community', avatarImg: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80', time: '8h ago', category: 'Event', title: 'Open mic returns Friday', body: 'Five-minute slots at the Hub desk from 4 PM. The gig bulletin has three paid calls posted this week.', likes: 143, comments: 22, shares: 31, href: { label: 'Open mic details', url: '/events/e08' }, isOrg: true },
  { id: 'f19', author: 'Uduak Thompson', role: 'Resident · Marian Road', time: '10h ago', category: 'Housing', title: 'One-bedroom off Marian Road', body: 'Self-contained, prepaid meter, water tank. ₦600,000/yr. Serious tenants only — CityPay deposit holds the key.', likes: 47, comments: 14, shares: 6, href: { label: 'View listing', url: '/house/h07' } },
  { id: 'f20', author: 'Whitney Atim', role: 'Resident · S.H.E.', time: '12h ago', category: 'Community', title: 'Keke share: Watt Market 8 AM', body: 'Two seats from the estate gate to Watt Market at 8 AM. Split the fare three ways, as usual.', likes: 27, comments: 9, shares: 2 },
  { id: 'f21', author: 'CrossRiver Homes & Estates', role: 'CityHouse', avatarImg: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=200&q=80', time: '1d ago', category: 'Housing', title: 'Viewing agents wanted', body: 'Contract viewing roles opening around the metro — ₦25,000 per visit plus commission on closed deals.', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80', likes: 71, comments: 16, shares: 19, href: { label: 'View the role', url: '/jobs/j-city-02' }, isOrg: true },
  { id: 'f22', author: 'FreshMart Calabar', role: 'ShopOS', avatarImg: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80', time: '1d ago', category: 'Commerce', title: 'Picker roles open', body: 'Market-floor pickers and packers needed at Big Qua Town. Full-time, ₦65,000/mo, picker bonus pool.', likes: 103, comments: 30, shares: 26, href: { label: 'Apply at CityJobs', url: '/jobs/j-sh-01' }, isOrg: true },
  { id: 'f23', author: 'Nseobong Ene', role: 'Parent · Hope Academy', time: '1d ago', category: 'Community', title: 'Make-up lessons available', body: 'Hope Academy running CA make-up slots for students who missed the first test day. Check the school board.', likes: 39, comments: 11, shares: 3, href: { label: 'School workspace', url: '/workspaces/schoolos/hope-academy' } },
  { id: 'f24', author: 'Calabar Carnival Committee', role: 'Official', avatarImg: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=200&q=80', time: '1d ago', category: 'Event', title: 'Rehearsal schedule released', body: 'Full band rehearsal nights now published through the end of term. Road closures on Fridays from 5 PM.', likes: 318, comments: 47, shares: 89, href: { label: 'All events', url: '/events' }, isOrg: true },
  { id: 'f25', author: 'Basil Oko', role: 'Resident · Parliamentary Extension', time: '2d ago', category: 'Ask the city', title: 'AC guy to trust?', body: 'Three quotes around me for a refill. Ending at Mike’s on recommendation — price locked before the valve opens is non-negotiable.', likes: 41, comments: 18, shares: 3, href: { label: "Mike's AC workspace", url: '/workspaces/serviceos/mikes-ac-services' } },
  { id: 'f26', author: 'State Housing Estate Neighbours', role: 'Community', avatarImg: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80', time: '2d ago', category: 'Community', title: 'Community pantry day', body: 'Donation point at the estate gate today by 3 PM for the market-day relief run. Leafy wraps highest priority.', likes: 88, comments: 14, shares: 22, href: { label: 'Open the community', url: '/community/c1' }, isOrg: true },
  { id: 'f27', author: "Shepherd's Care Clinic", role: 'City Care', avatarImg: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=200&q=80', time: '2d ago', category: 'Update', title: 'Free BP checks this Tuesday', body: 'Watt Market canopy, 9 AM – 1 PM. Takings referred instantly to the outpatient desk at Marina.', likes: 132, comments: 11, shares: 17, href: { label: 'Care directory', url: '/care' }, isOrg: true },
  { id: 'f28', author: 'Mfoniso Edem', role: 'Student · Hope Academy', time: '2d ago', category: 'Community', title: 'Lost: blue Geometry set', body: 'Marked with a silver sticker, left in Block A after Wednesday prep. Check under your desks — reward is a chin chin bucket.', likes: 45, comments: 22, shares: 6 },
  { id: 'f29', author: 'Calabar CleanCare', role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80', time: '2d ago', category: 'Update', title: 'Crew joining bonus', body: 'Housekeeping crew roles get a ₦15,000 signing bonus this month. Two-person teams, domino schedules.', likes: 66, comments: 19, shares: 12, href: { label: 'View the role', url: '/jobs/j-sv-03' }, isOrg: true },
  { id: 'f30', author: 'Imoh Daniel', role: 'Hub Host', time: '3d ago', category: 'Community', title: 'Studio desk free from Monday', body: 'One hot desk at the Hub in Big Qua Town, ₦25,000/mo including power and Wi-Fi. Photographers first.', likes: 54, comments: 13, shares: 7 },
  { id: 'f31', author: 'Ekorinim Garden Circle', role: 'Community', avatarImg: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=200&q=80', time: '3d ago', category: 'Community', title: 'Garden brunch meet', body: 'Sunday 10 AM by the fountain. Coffee House catering, bring the kids and your best leftovers.', likes: 92, comments: 25, shares: 15, href: { label: 'Circle board', url: '/community/c2' }, isOrg: true },
  { id: 'f32', author: 'Nne Usoro', role: 'Resident · Bogobiri', time: '3d ago', category: 'Ask the city', title: 'Best oxtail soup in the metro?', body: 'Moonlight craving and I am not driving far. Eko or Mama’s — settle it for me.', likes: 38, comments: 41, shares: 2 },
  { id: 'f33', author: 'Hope Academy Calabar', role: 'SchoolOS', avatarImg: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=200&q=80', time: '3d ago', category: 'Commerce', title: 'Term fees open in two tranches', body: 'First Term fees payable half now, half later via CityPay. First tranche keeps the seat — receipts go straight to parents.', likes: 108, comments: 29, shares: 13, href: { label: 'School workspace', url: '/workspaces/schoolos/hope-academy' }, isOrg: true },
  { id: 'f34', author: 'Chidinma Okafor', role: 'Resident · Big Qua Town', time: '4d ago', category: 'Community', title: 'Farm line shared ride', body: 'Driving down to the FreshMart farm line Saturday 7 AM. Three seats free, no haggling on kola.', likes: 29, comments: 10, shares: 3 },
  { id: 'f35', author: 'Calabar Moments Photography', role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?auto=format&fit=crop&w=200&q=80', time: '4d ago', category: 'Offer', title: 'Event photographer rates', body: 'Gig roles open for wedding and naming season — ₦28,000 per event, cameras provided, gallery split fixed.', likes: 77, comments: 21, shares: 18, href: { label: 'View the gig', url: '/jobs/j-sv-04' }, isOrg: true },
  { id: 'f36', author: 'Kufre Ene', role: 'Resident · Nyakasang', time: '4d ago', category: 'Housing', title: 'Furnishing a Nyakasang flat', body: 'Looking for a sofa set and double bed in good condition. Pay in full via CityPay on delivery.', likes: 22, comments: 12, shares: 4 },
  { id: 'f37', author: 'FreshMart Calabar', role: 'ShopOS', avatarImg: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80', time: '4d ago', category: 'Commerce', title: 'Ugu price dip', body: 'Early-morning waterleaf bundles dropped to ₦1,800. Whole week’s soup sorted for under two drinks.', likes: 141, comments: 17, shares: 9, href: { label: 'Shop FreshMart', url: '/biz/freshmart-calabar' }, isOrg: true },
  { id: 'f38', author: 'Calabar Creative Hub', role: 'City Community', avatarImg: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80', time: '5d ago', category: 'Event', title: 'Gig board: three calls live', body: 'Wedding second-shooter, product-set photographer and a band-night front man. All listed with rates on CityJobs.', likes: 84, comments: 15, shares: 28, href: { label: 'Browse CityJobs', url: '/jobs' }, isOrg: true },
  { id: 'f39', author: 'Adaeze Nwosu', role: 'Stylist · Urban Threads', time: '5d ago', category: 'Ask the city', title: 'Five ankara colours due Friday', body: 'Which three should the studio cut first for the drop — citadel green, royal blue, or the dusty rose?', likes: 61, comments: 34, shares: 5 },
  { id: 'f40', author: "Mike's AC Services", role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=200&q=80', time: '5d ago', category: 'Commerce', title: 'Technician hired + lessons', body: 'We hired through CityJobs and paid a signing bonus via CityPay. First week review: local and sharp.', likes: 58, comments: 9, shares: 6, href: { label: 'ServiceOS workspace', url: '/workspaces/serviceos/mikes-ac-services' }, isOrg: true },
  { id: 'f41', author: 'Ita U.', role: 'Residents · Goldie', time: '5d ago', category: 'Community', title: 'Canal walkway litter bins', body: 'Three more bins installed on the Goldie line after the clean-up. Council confirmed the Sunday routine too.', likes: 72, comments: 8, shares: 10 },
  { id: 'f42', author: 'Nnenna Asuquo', role: 'Student · Hope Academy', time: '6d ago', category: 'Community', title: 'Science club plants go up', body: 'The JSS greenhouse now has peppers and scent leaf. Watering roster pinned at the Block C office.', likes: 83, comments: 12, shares: 9 },
  { id: 'f43', author: 'Calabar Carnival Committee', role: 'Official', avatarImg: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=200&q=80', time: '6d ago', category: 'Event', title: 'Costume unit needs hands', body: 'Carnival costume volunteers get a backstage pass for the parade. Sewing and glue guns welcome.', likes: 214, comments: 38, shares: 61, href: { label: 'See the schedule', url: '/events' }, isOrg: true },
  { id: 'f44', author: 'CrossRiver Homes & Estates', role: 'CityHouse', avatarImg: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=200&q=80', time: '6d ago', category: 'Housing', title: 'Deposits move via CityPay', body: 'Every holding deposit on a CrossRiver listing now settles instantly through CityPay. No cash, no stress.', likes: 67, comments: 10, shares: 8, href: { label: 'CityHouse', url: '/house' }, isOrg: true },
  { id: 'f45', author: 'Tracy Bassey', role: 'Photographer · Moments', time: '1w ago', category: 'Community', title: 'Second shooter recall', body: 'Naming ceremony Saturday at Tinapa still needs one more lens. Standard rate + transport on me.', likes: 49, comments: 17, shares: 12 },
  { id: 'f46', author: 'Mercy Eyo', role: 'Doctor · Shepherd’s Care', time: '1w ago', category: 'Update', title: 'Late clinics this week', body: 'GP desk open until 9 PM Thursday and Friday at Ekorinim. Same-day slots still showing on City Care.', likes: 91, comments: 12, shares: 9, href: { label: 'Book a slot', url: '/care/shepherds-care' }, isOrg: true },
  { id: 'f47', author: 'Watt Market Delicacies', role: 'Marketplace', avatarImg: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=200&q=80', time: '1w ago', category: 'Offer', title: 'Periwinkle restock Saturday', body: 'Big Saturday delivery at Stall D12 — first 20 bags at last week’s price.', likes: 96, comments: 13, shares: 9, href: { label: 'View stall', url: '/biz/watt-market-delicacies' }, isOrg: true },
  { id: 'f48', author: 'Calabar CleanCare', role: 'ServiceOS', avatarImg: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80', time: '1w ago', category: 'Update', title: 'Steam rig back online', body: 'The mobile steam unit is back for couch and carpet bookings after its service. Weekend slots going fast.', likes: 38, comments: 5, shares: 4, href: { label: 'Book steam clean', url: '/workspaces/serviceos/calabar-cleancare' }, isOrg: true },
  { id: 'f49', author: 'Urban Threads Calabar', role: 'ShopOS', avatarImg: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=200&q=80', time: '1w ago', category: 'Commerce', title: 'Alteration desk now Saturday', body: 'Fittings extended into Saturday afternoons at S.H.E. Walk-ins welcome, appointments preferred.', likes: 51, comments: 7, shares: 5, href: { label: 'Shop Urban Threads', url: '/biz/urban-threads-calabar' }, isOrg: true },
  { id: 'f50', author: 'Akan Ekpe', role: 'Resident · Marian Road', time: '1w ago', category: 'Community', title: 'Sunday club ride recap', body: 'Eight keke showed for the canal loop at 6 AM. Next month we try the Eight Miles estate route — join us.', likes: 59, comments: 11, shares: 7 },
];

export const FEED_FILTERS = ['For you', 'Following', 'Marketplace', 'Events', 'Housing', 'Community'];

export interface DemoEvent {
  id: string;
  title: string;
  venue: string;
  address: string;
  date: string;
  time: string;
  image: string;
  tag: string;
  price: string;
  ticket: number;
  host: string;
  desc: string;
  lineup: string[];
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: 'e01',
    title: 'Carnival Band Rehearsal',
    venue: 'Bogobiri Stadium Grounds',
    address: 'Stadium Road, Bogobiri',
    date: 'Today',
    time: '6:00 PM',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80',
    tag: 'Free',
    price: 'Free',
    ticket: 0,
    host: 'Calabar Carnival Committee',
    desc: 'The parade bands open a full rehearsal on the stadium field — drum lines, dance troupes and the costume units running their final formations.',
    lineup: ['Drum line warm-up', 'Senior band formation', 'Costume parade walk', 'Public photo window'],
  },
  {
    id: 'e02',
    title: 'Watt Market Weekend Fair',
    venue: 'Watt Market',
    address: 'Watt Market, Calabar',
    date: 'Sat',
    time: '10:00 AM',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80',
    tag: 'All day',
    price: 'Free entry',
    ticket: 0,
    host: 'Watt Market Traders Union',
    desc: 'The whole market opens late for a weekend fair — sample stalls, weighing demos and the day’s freshest produce straight off the trucks.',
    lineup: ['Morning fresh market', 'Cooking demos (noon)', 'Evening glows'],
  },
  {
    id: 'e03',
    title: 'UNICAL Art & Design Open Day',
    venue: 'UNICAL Gallery',
    address: 'University of Calabar Gallery',
    date: 'Fri',
    time: '2:00 PM',
    image: 'https://images.unsplash.com/photo-1536924940846-227afb31e858?auto=format&fit=crop&w=600&q=80',
    tag: 'Students',
    price: 'Free',
    ticket: 0,
    host: 'UNICAL Fine Arts Dept',
    desc: 'Final-year portfolios, printmaking demos and a short film block from the design programme. Open to residents and families.',
    lineup: ['Portfolio walk-through', 'Printmaking live', 'Short film block'],
  },
  {
    id: 'e04',
    title: 'Ekorinim Evening Football',
    venue: 'Ekorinim Field',
    address: 'Ekorinim Field, Calabar',
    date: 'Sun',
    time: '4:30 PM',
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80',
    tag: 'Family',
    price: '₦500 entry',
    ticket: 500,
    host: 'Ekorinim United',
    desc: 'The neighbourhood derby under lights. Entry is ₦500 through CityOS — keke parking is free on the grass verge.',
    lineup: ['Youths warm-up', 'Main derby', 'Kids penalty shootout'],
  },
  {
    id: 'e05',
    title: "Mama's Thursday Tasting",
    venue: "Mama's Kitchen Calabar",
    address: '22 Marian Road',
    date: 'Thu',
    time: '1:00 PM',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80',
    tag: 'Food',
    price: 'Free tasting',
    ticket: 0,
    host: "Mama's Kitchen Calabar",
    desc: 'Sample the new afang batch and home stew pot before they hit the menu. Party tray bookings get a same-week slot guarantee.',
    lineup: ['Soup tasting bar', 'Cook demo (1:30 PM)', 'Tray booking desk'],
  },
  {
    id: 'e06',
    title: 'First-Fit Friday · Urban Threads',
    venue: 'Urban Threads Studio',
    address: 'Margaret Ekpo Ave, S.H.E.',
    date: 'Fri',
    time: '4:00 PM',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80',
    tag: 'Fashion',
    price: 'Free',
    ticket: 0,
    host: 'Urban Threads Calabar',
    desc: 'Free fittings and alteration drop-off night. New ankara drop previews at 5 PM with a 10% launch code.',
    lineup: ['Fit consultations', 'New drop preview', 'Alteration desk'],
  },
  {
    id: 'e07',
    title: 'Hope Academy Sports Day',
    venue: 'Hope Academy Field',
    address: '5 Hope Avenue, Ikot Ansa',
    date: 'Sat',
    time: '9:00 AM',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
    tag: 'Family',
    price: 'Free',
    ticket: 0,
    host: 'Hope Academy Calabar',
    desc: 'Inter-house carnival games, football heats and the long-standing parents relay. Food stalls run all morning.',
    lineup: ['March-past', 'Track heats', 'Parents relay'],
  },
  {
    id: 'e08',
    title: 'Creative Hub Open Mic',
    venue: 'Calabar Creative Hub',
    address: '1 Studio Close, Big Qua Town',
    date: 'Fri',
    time: '6:00 PM',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80',
    tag: 'Culture',
    price: '₦1,000 entry',
    ticket: 1000,
    host: 'Calabar Creative Hub',
    desc: 'Five-minute slots for poets, comics and pick-up bands. Sign-up at the desk from 4 PM — the gig board posts new calls weekly.',
    lineup: ['Open sign-up', 'Spoken word', 'Featured band'],
  },
  {
    id: 'e09',
    title: 'AC Check-Up Weekend',
    venue: "Mike's AC Services",
    address: '8 Ekorinim Road',
    date: 'Sat–Sun',
    time: '9:00 AM',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=600&q=80',
    tag: 'Promo',
    price: '20% off service',
    ticket: 0,
    host: "Mike's AC Services",
    desc: 'Pre-carnival AC check-up weekend. Filter service and gas check at 20% off, window-unit pickups collected same day.',
    lineup: ['Filter service', 'Gas pressure test', 'Unit pickup lane'],
  },
  {
    id: 'e10',
    title: 'FreshMart Farm Morning',
    venue: 'FreshMart Calabar',
    address: '14 Big Qua Town Line',
    date: 'Sat',
    time: '8:00 AM',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80',
    tag: 'Market',
    price: 'Free entry',
    ticket: 0,
    host: 'FreshMart Calabar',
    desc: 'The Saturday farm line — direct-from-farm produce, weighing demos and the market-day bundle at 15% off to the first 40 orders.',
    lineup: ['Farm produce line', 'Weighing demo', 'Bundle lock-in'],
  },
];

export function getEvent(id: string): DemoEvent | undefined {
  return DEMO_EVENTS.find((e) => e.id === id);
}

export interface AIResultItem {
  type: 'business' | 'product' | 'property' | 'route' | 'hotel' | 'clinic';
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
    question: 'Best place to stay under ₦10,000 near the stadium tonight?',
    answer:
      'For tonight near the stadium, Bogobiri Stadium Lodge is ₦9,200 with A/C, hot water and parking — four minutes walk from the grounds. If you would rather sleep quiet, Ekorinim Guest House is ₦8,500 with backup power all night. Beds are held with a small CityPay deposit and refunded at the front desk on arrival.',
    results: [{ type: 'hotel', id: 'bogobiri-stadium-lodge' }, { type: 'hotel', id: 'ekorinim-guest' }],
    followUps: ['Hold the stadium lodge', 'Compare the ₦8,500 guest house', 'Add a ride to the venue'],
  },
  {
    keywords: ['doctor', 'clinic', 'hospital', 'care', 'pharmacist', 'malaria'],
    question: 'Is there a clinic I can see today around Ekorinim?',
    answer:
      "Around Ekorinim, Shepherd’s Care Clinic has GP slots this afternoon — Dr Mercy Eyo, ₦3,500 consult, open until 8 PM. For labs or something more serious, Calabar General outpatient is on the Marina and takes same-day appointments through CityOS.",
    results: [{ type: 'clinic', id: 'shepherds-care' }, { type: 'clinic', id: 'calabar-general' }],
    followUps: ['Book Dr Mercy Eyo', 'See the general hospital', 'Order antimalarial for delivery'],
  },
  {
    keywords: ['bill', 'electric', 'water', 'airtime', 'data', 'top up'],
    question: 'How do I pay my electricity bill?',
    answer:
      'CityPay settles utility bills in-app — no queues, no airtime stress. Your PHEDC account shows ₦12,400 due and the Cross River Water Board is at ₦3,200. Pay from the Bills page and the credit lands instantly on your account reference.',
    results: [],
    followUps: ['Pay my PHEDC bill', 'Buy a data bundle', 'Check the water bill'],
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