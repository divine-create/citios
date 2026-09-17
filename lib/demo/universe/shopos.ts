import { getOrg, type OSKind } from './orgs';

export interface CityJob {
  id: string;
  orgId: string;
  orgName: string;
  os?: OSKind;
  title: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Gig';
  category: string;
  area: string;
  pay: string;
  posted: string;
  applicants: number;
  spots?: number;
  desc: string;
  requirements: string[];
  perks: string[];
}

export interface PoshProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  tag?: 'best' | 'promo' | 'local' | 'new';
  sold7: number;
  image?: string;
  isLive: boolean;
}

export interface PoshOrder {
  id: string;
  ref: string;
  customer: string;
  area: string;
  items: string;
  total: number;
  status: 'packing' | 'enroute' | 'delivered' | 'cancelled';
  method: 'CityPay' | 'Card' | 'COC';
  time: string;
}

export interface PoshCustomer {
  id: string;
  name: string;
  area: string;
  spend: number;
  orders: number;
  since: string;
  tier: 'Gold' | 'Silver' | 'Regular';
}

export interface PoshStaff {
  id: string;
  name: string;
  role: string;
  shift: string;
  active: boolean;
}

export interface PoshPromo {
  id: string;
  title: string;
  sub: string;
  type: 'percent' | 'flat' | 'bundle';
  value: string;
  active: boolean;
}

export interface ShopOSDataSet {
  orgId: string;
  week: number[];
  labels: string[];
  products: PoshProduct[];
  orders: PoshOrder[];
  customers: PoshCustomer[];
  staff: PoshStaff[];
  promotions: PoshPromo[];
  activity: { id: string; text: string; time: string; tone: string }[];
  jobs: CityJob[];
}

const img = (i: string) => `https://images.unsplash.com/${i}?auto=format&fit=crop&w=500&q=80`;

export const SHOPOS_DATA: Record<string, ShopOSDataSet> = {
  'freshmart-calabar': {
    orgId: 'org_freshmart_calabar',
    week: [184, 206, 172, 241, 219, 268, 312],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    products: [
      { id: 'fm01', sku: 'FM-PRO-001', name: 'Wild Ogbono 1kg', category: 'Produce', price: 7200, cost: 4800, stock: 34, unit: 'pack', tag: 'best', sold7: 63, image: img('photo-1542838132-92c53300491e'), isLive: true },
      { id: 'fm02', sku: 'FM-PRO-002', name: 'Farm-fresh Palm Oil 1L', category: 'Produce', price: 6500, cost: 4100, stock: 28, unit: 'bottle', tag: 'best', sold7: 51, image: img('photo-1587049352846-4a222e784d38'), isLive: true },
      { id: 'fm03', sku: 'FM-PRO-003', name: 'Calabar Crayfish 500g', category: 'Produce', price: 4500, cost: 2800, stock: 41, unit: 'pack', sold7: 47, image: img('photo-1559314809-0d155014e29e'), isLive: true },
      { id: 'fm04', sku: 'FM-MEA-004', name: 'Fresh Snails (12)', category: 'Fresh Meat', price: 8000, cost: 5200, stock: 8, unit: 'dozen', sold7: 22, image: img('photo-1544025162-d76694265947'), isLive: true },
      { id: 'fm05', sku: 'FM-PRO-005', name: 'Periwinkle 1kg', category: 'Produce', price: 6000, cost: 3900, stock: 19, unit: 'pack', sold7: 31, image: img('photo-1565557623262-b51c2513a641'), isLive: true },
      { id: 'fm06', sku: 'FM-PRO-006', name: 'Big Robo (Smoked)', category: 'Fresh Meat', price: 15000, cost: 10500, stock: 3, unit: 'pc', sold7: 8, image: img('photo-1504674900247-0877df9cc836'), isLive: true },
      { id: 'fm07', sku: 'FM-PAN-007', name: 'Local Rice 5kg', category: 'Pantry', price: 17500, cost: 13200, stock: 54, unit: 'bag', tag: 'promo', sold7: 29, image: img('photo-1586201375761-83865001e31c'), isLive: true },
      { id: 'fm08', sku: 'FM-PAN-008', name: 'Groundnut Oil 2L', category: 'Pantry', price: 11500, cost: 8400, stock: 23, unit: 'bottle', sold7: 18, image: img('photo-1474979266404-7eaacbcd87c5'), isLive: true },
      { id: 'fm09', sku: 'FM-PAN-009', name: 'Uziza & Uda (Mixed)', category: 'Pantry', price: 2800, cost: 1500, stock: 61, unit: 'pack', sold7: 40, image: img('photo-1518977676601-b53f82aba655'), isLive: true },
      { id: 'fm10', sku: 'FM-PAN-010', name: 'Garri (Yellow) 2kg', category: 'Pantry', price: 5200, cost: 3400, stock: 71, unit: 'pack', tag: 'new', sold7: 33, image: img('photo-1522992319-0365e5f11656'), isLive: true },
      { id: 'fm11', sku: 'FM-EGG-011', name: 'Farm Eggs (Tray of 30)', category: 'Fresh Meat', price: 7600, cost: 5800, stock: 12, unit: 'tray', sold7: 26, image: img('photo-1506976785307-8732e854ad03'), isLive: true },
      { id: 'fm12', sku: 'FM-HOU-012', name: 'Premium Dish Wash 1L', category: 'Household', price: 3500, cost: 1900, stock: 47, unit: 'bottle', sold7: 21, image: img('photo-1584308666744-24d5c474f2ae'), isLive: true },
      { id: 'fm13', sku: 'FM-HOU-013', name: 'Laundry Detergent 2kg', category: 'Household', price: 6900, cost: 4200, stock: 39, unit: 'box', sold7: 16, image: img('photo-1523821741446-edb2b68bb7a0'), isLive: true },
      { id: 'fm14', sku: 'FM-HEA-014', name: 'Vitamin C 1000mg (60)', category: 'Health', price: 6800, cost: 4100, stock: 6, unit: 'bottle', sold7: 12, image: img('photo-1550547660-d9450f859349'), isLive: true },
      { id: 'fm15', sku: 'FM-HEA-015', name: 'Malaria Test Kit', category: 'Health', price: 2900, cost: 1700, stock: 15, unit: 'kit', sold7: 9, image: img('photo-1584362917165-526a968579e8'), isLive: true },
      { id: 'fm16', sku: 'FM-PRO-016', name: 'Ugu & Waterleaf Bundle', category: 'Produce', price: 1800, cost: 900, stock: 88, unit: 'bundle', sold7: 67, image: img('photo-1540420773420-3366772f4999'), isLive: true },
    ],
    orders: [
      { id: 'o-fm-01', ref: 'CC-3841', customer: 'Whitney Atim', area: 'State Housing Estate', items: 'Ogbono + Oil + Crayfish', total: 13700, status: 'enroute', method: 'CityPay', time: '1:20 PM' },
      { id: 'o-fm-02', ref: 'CC-3840', customer: 'Effiong Bassey', area: 'Ekorinim', items: 'Local Rice 5kg', total: 17500, status: 'packing', method: 'Card', time: '1:02 PM' },
      { id: 'o-fm-03', ref: 'CC-3839', customer: 'Nne Usoro', area: 'Bogobiri', items: 'Party bundle (6 packs)', total: 21900, status: 'delivered', method: 'CityPay', time: '12:44 PM' },
      { id: 'o-fm-04', ref: 'CC-3838', customer: 'Kufre Ene', area: 'Nyakasang', items: 'Ugu bundle + Eggs', total: 6500, status: 'delivered', method: 'COC', time: '12:20 PM' },
      { id: 'o-fm-05', ref: 'CC-3837', customer: 'Akan Ekpe', area: 'Marian Road', items: 'Dish Wash + Detergent', total: 5200, status: 'delivered', method: 'CityPay', time: '11:58 AM' },
      { id: 'o-fm-06', ref: 'CC-3836', customer: 'Tracy Bassey', area: 'Ikot Ansa', items: 'Snails + Periwinkle', total: 14000, status: 'delivered', method: 'CityPay', time: '11:31 AM' },
      { id: 'o-fm-07', ref: 'CC-3835', customer: 'Chidinma Okafor', area: 'Big Qua Town', items: 'Vitamin C + Test kit', total: 9700, status: 'delivered', method: 'Card', time: '10:48 AM' },
      { id: 'o-fm-08', ref: 'CC-3834', customer: 'Basil Oko', area: 'Parliamentary Extension', items: 'Garri 2kg + Groundnut oil', total: 16700, status: 'delivered', method: 'CityPay', time: '10:12 AM' },
      { id: 'o-fm-09', ref: 'CC-3833', customer: 'Comfort Udofia', area: 'State Housing Estate', items: 'Uzuza & Uda + Crayfish', total: 7300, status: 'delivered', method: 'CityPay', time: '9:47 AM' },
      { id: 'o-fm-10', ref: 'CC-3832', customer: 'Nkoyo Effiom', area: '8 Miles', items: 'Big Robo (smoked)', total: 15000, status: 'cancelled', method: 'COC', time: '9:15 AM' },
      { id: 'o-fm-11', ref: 'CC-3831', customer: 'Emem Ekanem', area: 'Calabar South', items: 'Farm eggs (tray)', total: 7600, status: 'delivered', method: 'CityPay', time: '8:38 AM' },
      { id: 'o-fm-12', ref: 'CC-3830', customer: 'Imoh Daniel', area: 'Big Qua Town', items: 'Weekend restock box', total: 28400, status: 'delivered', method: 'CityPay', time: '8:02 AM' },
    ],
    customers: [
      { id: 'cu-01', name: 'Whitney Atim', area: 'State Housing Estate', spend: 184500, orders: 31, since: 'Feb 2024', tier: 'Gold' },
      { id: 'cu-02', name: 'Basil Oko', area: 'Parliamentary Extension', spend: 129300, orders: 22, since: 'Mar 2024', tier: 'Gold' },
      { id: 'cu-03', name: 'Nne Usoro', area: 'Bogobiri', spend: 96800, orders: 17, since: 'Apr 2024', tier: 'Silver' },
      { id: 'cu-04', name: 'Kufre Ene', area: 'Nyakasang', spend: 74500, orders: 14, since: 'May 2024', tier: 'Silver' },
      { id: 'cu-05', name: 'Akan Ekpe', area: 'Marian Road', spend: 61200, orders: 11, since: 'Jun 2024', tier: 'Silver' },
      { id: 'cu-06', name: 'Chidinma Okafor', area: 'Big Qua Town', spend: 43800, orders: 9, since: 'Jul 2024', tier: 'Regular' },
      { id: 'cu-07', name: 'Emem Ekanem', area: 'Calabar South', spend: 29500, orders: 6, since: 'Aug 2024', tier: 'Regular' },
      { id: 'cu-08', name: 'Imoh Daniel', area: 'Big Qua Town', spend: 251000, orders: 38, since: 'Feb 2024', tier: 'Gold' },
    ],
    staff: [
      { id: 'st-01', name: 'Ngozi Udo', role: 'Store Manager', shift: '6 AM – 3 PM', active: true },
      { id: 'st-02', name: 'Ekaette Bassey', role: 'Head Picker', shift: '6 AM – 2 PM', active: true },
      { id: 'st-03', name: 'Ubong Okon', role: 'Weigher & Pricing', shift: '6 AM – 2 PM', active: true },
      { id: 'st-04', name: 'Pius Nyong', role: 'Packaging', shift: '10 AM – 7 PM', active: true },
      { id: 'st-05', name: 'Comfort Udofia', role: 'Counter & CityPay', shift: '10 AM – 7 PM', active: true },
      { id: 'st-06', name: 'Ifiok Essien', role: 'Dispatch / Rider lead', shift: '8 AM – 6 PM', active: false },
    ],
    promotions: [
      { id: 'pr-01', title: 'Market day bundle', sub: 'Any 3 packs — 15% off', type: 'bundle', value: '15%', active: true },
      { id: 'pr-02', title: 'New-customer offer', sub: '10% off first order over ₦10,000', type: 'percent', value: '10%', active: true },
      { id: 'pr-03', title: 'Oil & Rice combo', sub: 'Groundnut oil + local rice for ₦26,000', type: 'flat', value: '₦2,500 off', active: true },
      { id: 'pr-04', title: 'Weekend restock box', sub: 'Curated box, 12% under shelf price', type: 'bundle', value: '12%', active: false },
    ],
    activity: [
      { id: 'ac-01', text: 'New CityDrive order CC-3841 packed by Ekaette', time: '1:22 PM', tone: 'ok' },
      { id: 'ac-02', text: 'Pallet of fresh ugu arrived from Big Qua farm', time: '11:00 AM', tone: 'info' },
      { id: 'ac-03', text: 'Stock alert: snails below 10 — reorder sent', time: '9:30 AM', tone: 'warn' },
      { id: 'ac-04', text: 'Promo “Market day bundle” auto-applied 14 times', time: '8:45 AM', tone: 'ok' },
      { id: 'ac-05', text: 'Audit: 3 products re-priced with new farm rates', time: 'Yesterday', tone: 'info' },
      { id: 'ac-06', text: 'Rider squad expanded to 6 for the market rush', time: 'Yesterday', tone: 'ok' },
    ],
    jobs: [
      {
        id: 'j-sh-01',
        orgId: 'org_freshmart_calabar',
        orgName: 'FreshMart Calabar',
        os: 'shopos',
        title: 'Market Floor Picker & Packer',
        type: 'Full-time',
        category: 'Shop',
        area: 'Big Qua Town',
        pay: '₦65,000/mo',
        posted: '2d ago',
        applicants: 14,
        spots: 2,
        desc: 'Weigh, price and pack produce orders through the CityOS pick list. Early starts, market-floor energy, and a picker of the week bonus.',
        requirements: ['Comfortable standing long shifts', 'Trustworthy with weights & money', 'Basic phone/app literacy'],
        perks: ['Weekly shop discount', 'Lunch on shift', 'Pickers’ bonus pool'],
      },
      {
        id: 'j-sh-02',
        orgId: 'org_freshmart_calabar',
        orgName: 'FreshMart Calabar',
        os: 'shopos',
        title: 'Dispatch / CityDrive Rider',
        type: 'Contract',
        category: 'Shop',
        area: 'Calabar metro',
        pay: '₦350–₦120k/mo (per trip)',
        posted: '1w ago',
        applicants: 31,
        spots: 4,
        desc: 'Move CoolCabins short runs across Calabar metro. Keep your own schedule; the best weeks clear ₦120k.',
        requirements: ['Own keke or motorbike', 'Calabar road knowledge', 'Smartphone with data'],
        perks: ['Fuel support', 'Daily settlement via CityPay', 'Rider insurance'],
      },
      {
        id: 'j-sh-03',
        orgId: 'org_freshmart_calabar',
        orgName: 'FreshMart Calabar',
        os: 'shopos',
        title: 'Counter & CityPay Cashier',
        type: 'Full-time',
        category: 'Shop',
        area: 'Big Qua Town',
        pay: '₦70,000/mo',
        posted: '3d ago',
        applicants: 9,
        spots: 1,
        desc: 'Run the till, reconcile CityPay and cash at close, and keep the counter queue moving on market mornings.',
        requirements: ['Maths you can do in your head', 'Patience under rush', 'Cash + app payment handling'],
        perks: ['Month-end bonus', 'Health check annually', 'Staff discount'],
      },
      {
        id: 'j-sh-04',
        orgId: 'org_mamas_kitchen',
        orgName: "Mama's Kitchen Calabar",
        os: 'shopos',
        title: 'Kitchen Hand / Line Cook',
        type: 'Part-time',
        category: 'Shop',
        area: 'Marian Road',
        pay: '₦45,000/mo',
        posted: '4d ago',
        applicants: 22,
        spots: 2,
        desc: 'Prepping fresh greens, frying fish and plating party trays for the dinner rush. Weekends required.',
        requirements: ['Kitchen hygiene basics', 'Available 4 PM – 9 PM', 'Own knife set (or we lend one)'],
        perks: ['Free meal per shift', 'Weekend rate uplift', 'Referral bonus'],
      },
      {
        id: 'j-sh-05',
        orgId: 'org_urban_threads',
        orgName: 'Urban Threads Calabar',
        os: 'shopos',
        title: 'In-house Tailor (Ankara)',
        type: 'Full-time',
        category: 'Shop',
        area: 'State Housing Estate',
        pay: '₦85,000/mo',
        posted: '5d ago',
        applicants: 12,
        spots: 1,
        desc: 'Cut and finish ankara sets and office separates for the studio line, with fittings on Saturdays.',
        requirements: ['3+ years tailoring ankara', 'Reliable finish quality', 'Saturday fittings available'],
        perks: ['Studio let at cost', 'Fabric allowance', 'Sales commission on fittings'],
      },
      {
        id: 'j-sh-06',
        orgId: 'org_urban_threads',
        orgName: 'Urban Threads Calabar',
        os: 'shopos',
        title: 'Sales Associate',
        type: 'Part-time',
        category: 'Shop',
        area: 'State Housing Estate',
        pay: '₦48,000/mo',
        posted: '1w ago',
        applicants: 17,
        spots: 2,
        desc: 'Help shoppers build fits, process CityPay checkouts and keep the rails fresh between drops.',
        requirements: ['Fashion sense + product knowledge', 'Weekend availability', 'App-savvy'],
        perks: ['Staff fit allowance', 'Train-with-designer days', 'Referral bonus'],
      },
    ],
  },

  'mamas-kitchen': {
    orgId: 'org_mamas_kitchen',
    week: [96, 84, 112, 98, 138, 164, 121],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    products: [
      { id: 'mk01', sku: 'MK-MEA-001', name: 'Afang Soup + Fufu (2)', category: 'Plates', price: 9500, cost: 5200, stock: 42, unit: 'pack', tag: 'best', sold7: 84, image: img('photo-1546069901-ba9599a7e63c'), isLive: true },
      { id: 'mk02', sku: 'MK-MEA-002', name: 'Edikang Ikong + Akpu', category: 'Plates', price: 10500, cost: 5800, stock: 31, unit: 'pack', sold7: 61, image: img('photo-1567620905732-2d1ec7ab7445'), isLive: true },
      { id: 'mk03', sku: 'MK-TRA-003', name: 'Party Jollof Tray (serves 8)', category: 'Party Tray', price: 24500, cost: 14800, stock: 9, unit: 'tray', tag: 'promo', sold7: 17, image: img('photo-1563379926898-05f4575a45d8'), isLive: true },
      { id: 'mk04', sku: 'MK-TRA-004', name: 'Weekend Jollof Pack (3)', category: 'Plates', price: 12500, cost: 6900, stock: 27, unit: 'pack', sold7: 46, image: img('photo-1585032226651-759b368d7246'), isLive: true },
      { id: 'mk05', sku: 'MK-MEA-005', name: 'Pepper Soup + Goat Head', category: 'Plates', price: 8200, cost: 4700, stock: 22, unit: 'pack', sold7: 39, image: img('photo-1547592180-85f173990554'), isLive: true },
      { id: 'mk06', sku: 'MK-DES-006', name: 'Puff Puff (24 pcs)', category: 'Snacks', price: 5800, cost: 2600, stock: 64, unit: 'box', tag: 'new', sold7: 52, image: img('photo-1565958011703-44f9829ba187'), isLive: true },
      { id: 'mk07', sku: 'MK-DES-007', name: 'Chin Chin Bucket', category: 'Snacks', price: 7100, cost: 3400, stock: 48, unit: 'bucket', sold7: 28, image: img('photo-1627372265956-a2ff1c01f084'), isLive: true },
      { id: 'mk08', sku: 'MK-DRN-008', name: 'Zobo Jug (2L)', category: 'Drinks', price: 4200, cost: 1900, stock: 53, unit: 'jug', sold7: 33, image: img('photo-1502741224143-90386d7f8c39'), isLive: true },
    ],
    orders: [
      { id: 'o-mk-01', ref: 'MK-1131', customer: 'Basil Oko', area: 'Parliamentary Extension', items: 'Afang + Fufu (2)', total: 19000, status: 'enroute', method: 'CityPay', time: '1:10 PM' },
      { id: 'o-mk-02', ref: 'MK-1130', customer: 'Nne Usoro', area: 'Bogobiri', items: 'Party Jollof Tray', total: 24500, status: 'packing', method: 'Card', time: '1:01 PM' },
      { id: 'o-mk-03', ref: 'MK-1129', customer: 'Tracy Bassey', area: 'Ikot Ansa', items: 'Puff Puff + Zobo', total: 10000, status: 'delivered', method: 'CityPay', time: '12:22 PM' },
      { id: 'o-mk-04', ref: 'MK-1128', customer: 'Akan Ekpe', area: 'Marian Road', items: 'Pepper Soup', total: 8200, status: 'delivered', method: 'COC', time: '11:44 AM' },
      { id: 'o-mk-05', ref: 'MK-1127', customer: 'Kufre Ene', area: 'Nyakasang', items: 'Weekend Jollof Pack (3)', total: 12500, status: 'delivered', method: 'CityPay', time: '10:58 AM' },
    ],
    customers: [
      { id: 'mk-cu-01', name: 'Basil Oko', area: 'Parliamentary Extension', spend: 88900, orders: 19, since: 'May 2024', tier: 'Gold' },
      { id: 'mk-cu-02', name: 'Nne Usoro', area: 'Bogobiri', spend: 74200, orders: 15, since: 'Jun 2024', tier: 'Silver' },
      { id: 'mk-cu-03', name: 'Tracy Bassey', area: 'Ikot Ansa', spend: 51300, orders: 11, since: 'Jul 2024', tier: 'Silver' },
      { id: 'mk-cu-04', name: 'Akan Ekpe', area: 'Marian Road', spend: 29800, orders: 7, since: 'Aug 2024', tier: 'Regular' },
      { id: 'mk-cu-05', name: 'Kufre Ene', area: 'Nyakasang', spend: 22100, orders: 5, since: 'Sep 2024', tier: 'Regular' },
    ],
    staff: [
      { id: 'mk-st-01', name: 'Mama Efa', role: 'Head Cook', shift: '9 AM – 9 PM', active: true },
      { id: 'mk-st-02', name: 'Ima Archibong', role: 'Line Cook', shift: '10 AM – 8 PM', active: true },
      { id: 'mk-st-03', name: 'Okon Ndiyo', role: 'Packaging & Dispatch', shift: '10 AM – 9 PM', active: true },
      { id: 'mk-st-04', name: 'Uduak Thompson', role: 'Counter & CityPay', shift: '11 AM – 9 PM', active: true },
    ],
    promotions: [
      { id: 'mk-pr-01', title: 'Party tray early-bird', sub: '24h ahead — ₦3,500 off', type: 'flat', value: '₦3,500 off', active: true },
      { id: 'mk-pr-02', title: 'Combo plate', sub: 'Any plate + zobo for ₦200', type: 'bundle', value: '₦200', active: true },
      { id: 'mk-pr-03', title: 'Wednesday hair day', sub: '2-for-1 puff puff, 1–4 PM', type: 'bundle', value: '2-for-1', active: false },
    ],
    activity: [
      { id: 'mk-ac-01', text: 'First tray of party jollof out the door by 1 PM', time: '1:00 PM', tone: 'ok' },
      { id: 'mk-ac-02', text: 'Zobo batch #2 brewed — 20 jugs', time: '11:30 AM', tone: 'info' },
      { id: 'mk-ac-03', text: 'Chin chin bucket promo ends Sunday', time: '9:00 AM', tone: 'warn' },
      { id: 'mk-ac-04', text: 'Fufu supplier confirmed for tomorrow morning', time: 'Yesterday', tone: 'ok' },
    ],
    jobs: [
      {
        id: 'j-sh-04',
        orgId: 'org_mamas_kitchen',
        orgName: "Mama's Kitchen Calabar",
        os: 'shopos',
        title: 'Kitchen Hand / Line Cook',
        type: 'Part-time',
        category: 'Shop',
        area: 'Marian Road',
        pay: '₦45,000/mo',
        posted: '4d ago',
        applicants: 22,
        spots: 2,
        desc: 'Prepping fresh greens, frying fish and plating party trays for the dinner rush. Weekends required.',
        requirements: ['Kitchen hygiene basics', 'Available 4 PM – 9 PM', 'Own knife set (or we lend one)'],
        perks: ['Free meal per shift', 'Weekend rate uplift', 'Referral bonus'],
      },
      {
        id: 'j-sh-07',
        orgId: 'org_mamas_kitchen',
        orgName: "Mama's Kitchen Calabar",
        os: 'shopos',
        title: 'Weekend Delivery Rider',
        type: 'Gig',
        category: 'Shop',
        area: 'Calabar metro',
        pay: '₦400 per drop',
        posted: '6d ago',
        applicants: 19,
        spots: 3,
        desc: 'Hot food runs on Saturdays and Sundays across the metro. First 5 drops guaranteed daily.',
        requirements: ['Own bike/keke', 'Hot-box (we lend)', 'Weekend availability'],
        perks: ['Tip split', 'Fuel support', 'Same-day pay'],
      },
    ],
  },

  'urban-threads-calabar': {
    orgId: 'org_urban_threads',
    week: [54, 48, 39, 61, 72, 96, 77],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    products: [
      { id: 'ut01', sku: 'UT-ANK-001', name: 'Ankara Two-Piece Set', category: 'Ankara', price: 18500, cost: 9200, stock: 8, unit: 'set', tag: 'best', sold7: 12, image: img('photo-1529139574466-a303027c1d8b'), isLive: true },
      { id: 'ut02', sku: 'UT-OFF-002', name: 'Tailored Office Pant', category: 'Office', price: 11500, cost: 5800, stock: 14, unit: 'pc', sold7: 9, image: img('photo-1594633312681-425c7b97ccd1'), isLive: true },
      { id: 'ut03', sku: 'UT-ANK-003', name: 'Weekend Street Fit', category: 'Ankara', price: 14000, cost: 6800, stock: 11, unit: 'set', sold7: 7, image: img('photo-1445205170230-053b83016050'), isLive: true },
      { id: 'ut04', sku: 'UT-OFF-004', name: 'Linen Office Shirt', category: 'Office', price: 9800, cost: 4700, stock: 22, unit: 'pc', tag: 'new', sold7: 11, image: img('photo-1598032895397-b9472444bf93'), isLive: true },
      { id: 'ut05', sku: 'UT-ACC-005', name: 'Carload Ankara Cap', category: 'Accessories', price: 4500, cost: 1900, stock: 30, unit: 'pc', sold7: 6, image: img('photo-1534030347209-467a5b0ad3e6'), isLive: true },
      { id: 'ut06', sku: 'UT-ACC-006', name: 'Beaded Waist Bead Set', category: 'Accessories', price: 6200, cost: 2400, stock: 18, unit: 'set', sold7: 4, image: img('photo-1515372039744-b8f02a3ae446'), isLive: true },
    ],
    orders: [
      { id: 'o-ut-01', ref: 'UT-7721', customer: 'Tracy Bassey', area: 'Ikot Ansa', items: 'Ankara Two-Piece Set', total: 18500, status: 'delivered', method: 'CityPay', time: 'Yesterday' },
      { id: 'o-ut-02', ref: 'UT-7720', customer: 'Imoh Daniel', area: 'Big Qua Town', items: 'Office Pant + Shirt', total: 21300, status: 'enroute', method: 'Card', time: 'Today' },
      { id: 'o-ut-03', ref: 'UT-7719', customer: 'Emem Ekanem', area: 'Calabar South', items: 'Weekend Street Fit', total: 14000, status: 'delivered', method: 'CityPay', time: '2d ago' },
      { id: 'o-ut-04', ref: 'UT-7718', customer: 'Whitney Atim', area: 'State Housing Estate', items: 'Linen Shirt + Cap', total: 14300, status: 'delivered', method: 'CityPay', time: '3d ago' },
    ],
    customers: [
      { id: 'ut-cu-01', name: 'Tracy Bassey', area: 'Ikot Ansa', spend: 61200, orders: 6, since: 'Aug 2024', tier: 'Silver' },
      { id: 'ut-cu-02', name: 'Imoh Daniel', area: 'Big Qua Town', spend: 54900, orders: 4, since: 'Jul 2024', tier: 'Silver' },
      { id: 'ut-cu-03', name: 'Emem Ekanem', area: 'Calabar South', spend: 36500, orders: 3, since: 'Sep 2024', tier: 'Regular' },
      { id: 'ut-cu-04', name: 'Whitney Atim', area: 'State Housing Estate', spend: 29800, orders: 2, since: 'Oct 2024', tier: 'Regular' },
    ],
    staff: [
      { id: 'ut-st-01', name: 'Tunde Ade', role: 'Studio Lead Tailor', shift: '9 AM – 6 PM', active: true },
      { id: 'ut-st-02', name: 'Adaeze Nwosu', role: 'Sales & Styling', shift: '10 AM – 7 PM', active: true },
      { id: 'ut-st-03', name: 'Sylvia Eton', role: 'Fittings Coordinator', shift: '10 AM – 6 PM', active: true },
    ],
    promotions: [
      { id: 'ut-pr-01', title: 'First-fit Friday', sub: 'Free alt on any two-piece', type: 'bundle', value: 'Free alter', active: true },
      { id: 'ut-pr-02', title: 'Office restock', sub: '2 shirts, 15% off', type: 'percent', value: '15%', active: true },
    ],
    activity: [
      { id: 'ut-ac-01', text: 'New bolt of citadel ankara logged in', time: '10:15 AM', tone: 'info' },
      { id: 'ut-ac-02', text: 'UT-7721 fitted & dispatched', time: '9:40 AM', tone: 'ok' },
      { id: 'ut-ac-03', text: 'Saturday fittings: 4 bookings this week', time: 'Yesterday', tone: 'ok' },
    ],
    jobs: [
      {
        id: 'j-sh-05',
        orgId: 'org_urban_threads',
        orgName: 'Urban Threads Calabar',
        os: 'shopos',
        title: 'In-house Tailor (Ankara)',
        type: 'Full-time',
        category: 'Shop',
        area: 'State Housing Estate',
        pay: '₦85,000/mo',
        posted: '5d ago',
        applicants: 12,
        spots: 1,
        desc: 'Cut and finish ankara sets and office separates for the studio line, with fittings on Saturdays.',
        requirements: ['3+ years tailoring ankara', 'Reliable finish quality', 'Saturday fittings available'],
        perks: ['Studio let at cost', 'Fabric allowance', 'Sales commission on fittings'],
      },
      {
        id: 'j-sh-06',
        orgId: 'org_urban_threads',
        orgName: 'Urban Threads Calabar',
        os: 'shopos',
        title: 'Sales Associate',
        type: 'Part-time',
        category: 'Shop',
        area: 'State Housing Estate',
        pay: '₦48,000/mo',
        posted: '1w ago',
        applicants: 17,
        spots: 2,
        desc: 'Help shoppers build fits, process CityPay checkouts and keep the rails fresh between drops.',
        requirements: ['Fashion sense + product knowledge', 'Weekend availability', 'App-savvy'],
        perks: ['Staff fit allowance', 'Train-with-designer days', 'Referral bonus'],
      },
    ],
  },
};

export function getShopOSDataset(slug: string): ShopOSDataSet | undefined {
  return SHOPOS_DATA[slug];
}

export function orgIsShopOS(orgId: string): boolean {
  return Boolean(Object.values(SHOPOS_DATA).find((d) => d.orgId === orgId));
}

export function shopOSProductById(slug: string, productId: string): PoshProduct | undefined {
  return SHOPOS_DATA[slug]?.products.find((p) => p.id === productId);
}

export function allShopOSProducts(): { slug: string; orgName: string; product: PoshProduct }[] {
  return Object.entries(SHOPOS_DATA).flatMap(([slug, d]) => {
    const org = getOrg(slug);
    return d.products.map((product) => ({ slug, orgName: org?.name ?? slug, product }));
  });
}