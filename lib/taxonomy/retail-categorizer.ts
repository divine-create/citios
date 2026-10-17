export interface StoreSectorDefinition {
  id: string;
  label: string;
  shortLabel: string;
  keywords: string[];
}

export interface CanonicalCategoryDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  subcategories: Array<{ name: string; slug: string; description?: string }>;
}

/**
 * Canonical Platform-Wide E-Commerce Categories (Jumia / Jiji / Amazon standard).
 * Includes the 9 established core categories plus universal e-commerce departments
 * so any new store opening on the platform has ready-made categories out of the box.
 */
export const CANONICAL_ECOMMERCE_CATEGORIES: CanonicalCategoryDefinition[] = [
  {
    id: 'phones-iphones-tablets',
    label: 'Phones, iPhones & Tablets',
    shortLabel: 'Phones & Tablets',
    description: 'Smartphones, Apple iPhones, iPads, Android tablets, and feature phones.',
    subcategories: [
      { name: 'iPhone 16, 17 & Air Series', slug: 'iphone-16-17-air-series' },
      { name: 'iPhone 14 & 15 Series', slug: 'iphone-14-15-series' },
      { name: 'iPhone 12 & 13 Series', slug: 'iphone-12-13-series' },
      { name: 'Apple iPads', slug: 'apple-ipads' },
      { name: 'Android Smartphones & Tablets', slug: 'android-smartphones-tablets' },
      { name: 'Feature & Button Phones', slug: 'feature-button-phones' },
    ],
  },
  {
    id: 'laptops-macbooks-monitors',
    label: 'Laptops, MacBooks & Monitors',
    shortLabel: 'Laptops & Monitors',
    description: 'Apple MacBooks, Windows notebooks, business laptops, desktops, and monitors.',
    subcategories: [
      { name: 'Apple MacBooks & iMacs', slug: 'apple-macbooks' },
      { name: 'Windows Laptops & Ultrabooks', slug: 'laptops-computers' },
      { name: 'Monitors & Curved Displays', slug: 'monitors-displays' },
      { name: 'Keyboards, Mice & Computer Accessories', slug: 'computer-accessories' },
    ],
  },
  {
    id: 'power-banks-inverters-backup-power',
    label: 'Power Banks, Inverters & Backup Power',
    shortLabel: 'Power & Inverters',
    description: 'Fast-charging power banks, portable power stations, solar generators, and inverters.',
    subcategories: [
      { name: 'Power Banks & Fast Portable Power', slug: 'power-banks-fast-portable-power' },
      { name: 'Portable Power Stations & Generators', slug: 'power-backup-stations' },
      { name: 'Inverters, Solar Panels & Batteries', slug: 'inverters-solar-batteries' },
    ],
  },
  {
    id: 'earbuds-airpods-headphones',
    label: 'Earbuds, AirPods & Headphones',
    shortLabel: 'Earbuds & Headphones',
    description: 'Apple AirPods, wireless earbuds, noise-canceling headphones, neckbands, and headsets.',
    subcategories: [
      { name: 'AirPods & Wireless Audio', slug: 'airpods-wireless-audio' },
      { name: 'Wireless Earbuds & FreePods', slug: 'wireless-earbuds' },
      { name: 'Over-Ear Headphones & Neckbands', slug: 'headphones-neckbands' },
      { name: 'Wired Earphones & Call Headsets', slug: 'wired-earphones-headsets' },
    ],
  },
  {
    id: 'bluetooth-speakers-creator-microphones',
    label: 'Bluetooth Speakers & Creator Microphones',
    shortLabel: 'Speakers & Mics',
    description: 'Portable Bluetooth speakers, party boomboxes, soundbars, wireless mics, and gimbals.',
    subcategories: [
      { name: 'Bluetooth Speakers & Soundbars', slug: 'bluetooth-speakers-audio' },
      { name: 'Wireless Microphones & Creator Audio', slug: 'microphones-creator-audio' },
      { name: 'Tripods, Gimbals & Ring Lights', slug: 'tripods-gimbals-lighting' },
    ],
  },
  {
    id: 'smartwatches-fitness-wearables',
    label: 'Smartwatches & Fitness Wearables',
    shortLabel: 'Smartwatches',
    description: 'Apple Watch Ultra/Series, smartwatches, fitness bands, and activity trackers.',
    subcategories: [
      { name: 'Apple Watch', slug: 'apple-watch' },
      { name: 'Smartwatches & Fitness Bands', slug: 'smartwatches-fitness-bands' },
      { name: 'Watch Straps & Wearable Chargers', slug: 'watch-straps-chargers' },
    ],
  },
  {
    id: 'fast-chargers-cables-extensions',
    label: 'Fast Chargers, Cables & Extensions',
    shortLabel: 'Chargers & Cables',
    description: 'Wall chargers, Type-C & Lightning cables, car chargers, and surge extension sockets.',
    subcategories: [
      { name: 'Fast Wall Chargers & Adapters', slug: 'fast-wall-chargers' },
      { name: 'Type-C, Lightning & Data Cables', slug: 'charging-data-cables' },
      { name: 'Car Chargers & Transmitters', slug: 'car-chargers' },
      { name: 'Extension Sockets & Power Strips', slug: 'extension-sockets' },
    ],
  },
  {
    id: 'starlink-4g-mifi-networking',
    label: 'Starlink, 4G MiFi & Networking',
    shortLabel: 'Starlink & WiFi',
    description: 'Starlink satellite kits, 4G/5G pocket MiFis, Wi-Fi 6 routers, and network switches.',
    subcategories: [
      { name: 'Starlink Kits & Mounts', slug: 'starlink-networking' },
      { name: '4G LTE MiFi & Pocket Routers', slug: '4g-mifi-wifi-routers' },
      { name: 'Wi-Fi Routers, Mesh & Switches', slug: 'wifi-routers-switches' },
    ],
  },
  {
    id: 'gaming-consoles-storage-smart-gadgets',
    label: 'Gaming Consoles, Storage & Smart Gadgets',
    shortLabel: 'Gaming, Storage & Gadgets',
    description: 'PlayStation consoles, controllers, flash drives, memory cards, phone parts, and grooming clippers.',
    subcategories: [
      { name: 'Gaming Consoles, Pads & Games', slug: 'gaming-consoles' },
      { name: 'Flash Drives & Memory Cards', slug: 'flash-drives-memory-cards' },
      { name: 'Phone Batteries, Screen Guards & Parts', slug: 'batteries-screen-guards-parts' },
      { name: 'Rechargeable Clippers & Smart Gadgets', slug: 'clippers-smart-appliances' },
    ],
  },
  // Universal E-Commerce Categories (Jumia / Jiji / Amazon standard for any new merchant)
  {
    id: 'supermarket-groceries',
    label: 'Supermarket & Groceries',
    shortLabel: 'Supermarket',
    description: 'Foodstuff, cooking essentials, beverages, snacks, bakery, and household cleaning supplies.',
    subcategories: [
      { name: 'Rice, Pasta & Grains', slug: 'rice-pasta-grains' },
      { name: 'Cooking Oil & Condiments', slug: 'cooking-oil-condiments' },
      { name: 'Drinks, Water & Beverages', slug: 'drinks-beverages' },
      { name: 'Snacks, Cereals & Bakery', slug: 'snacks-cereals-bakery' },
      { name: 'Household & Laundry Supplies', slug: 'household-laundry' },
    ],
  },
  {
    id: 'fashion-shoes-accessories',
    label: 'Fashion, Shoes & Accessories',
    shortLabel: 'Fashion & Style',
    description: 'Men’s and women’s clothing, sneakers, footwear, bags, watches, and jewelry.',
    subcategories: [
      { name: 'Men’s Clothing & Native Wear', slug: 'mens-fashion' },
      { name: 'Women’s Dresses & Apparel', slug: 'womens-fashion' },
      { name: 'Sneakers, Shoes & Heeled Footwear', slug: 'shoes-footwear' },
      { name: 'Bags, Belts, Watches & Jewelry', slug: 'bags-watches-jewelry' },
    ],
  },
  {
    id: 'health-beauty-personal-care',
    label: 'Health, Beauty & Personal Care',
    shortLabel: 'Health & Beauty',
    description: 'Skincare, perfumes, fragrances, wigs, hair care, makeup, and wellness essentials.',
    subcategories: [
      { name: 'Perfumes, Body Sprays & Fragrances', slug: 'perfumes-fragrances' },
      { name: 'Skincare, Lotions & Serums', slug: 'skincare-lotions' },
      { name: 'Hair, Wigs & Salon Care', slug: 'hair-wigs-salon' },
      { name: 'Makeup, Cosmetics & Grooming', slug: 'makeup-cosmetics' },
      { name: 'Pharmacy, Vitamins & First Aid', slug: 'pharmacy-vitamins' },
    ],
  },
  {
    id: 'home-kitchen-appliances',
    label: 'Home, Kitchen & Appliances',
    shortLabel: 'Home & Kitchen',
    description: 'Refrigerators, air conditioners, blenders, microwaves, smart TVs, furniture, and bedding.',
    subcategories: [
      { name: 'Kitchen Appliances (Blenders, Air Fryers, Microwaves)', slug: 'kitchen-appliances' },
      { name: 'Cooling & Laundry (Fridges, ACs, Washing Machines)', slug: 'cooling-laundry-appliances' },
      { name: 'Smart TVs & Home Entertainment', slug: 'smart-tvs-entertainment' },
      { name: 'Furniture, Bedding & Home Decor', slug: 'furniture-bedding-decor' },
    ],
  },
  {
    id: 'automobile-tools-hardware',
    label: 'Automobile, Tools & Hardware',
    shortLabel: 'Auto & Tools',
    description: 'Car accessories, tyres, batteries, power tools, electrical hardware, and safety gear.',
    subcategories: [
      { name: 'Car Electronics & Interior Accessories', slug: 'car-accessories' },
      { name: 'Power Tools & Workshop Equipment', slug: 'power-tools-equipment' },
      { name: 'Electrical, Plumbing & Hardware', slug: 'electrical-plumbing-hardware' },
    ],
  },
  {
    id: 'baby-kids-toys',
    label: 'Baby, Kids & Toys',
    shortLabel: 'Baby & Kids',
    description: 'Diapers, baby feeding, strollers, kids’ clothing, and educational toys.',
    subcategories: [
      { name: 'Diapers, Wipes & Baby Care', slug: 'diapers-baby-care' },
      { name: 'Baby Feeding, Strollers & Nursery', slug: 'baby-feeding-nursery' },
      { name: 'Kids’ Fashion & School Bags', slug: 'kids-fashion-bags' },
      { name: 'Toys, Games & Learning', slug: 'toys-games-learning' },
    ],
  },
  {
    id: 'sports-fitness-outdoors',
    label: 'Sports, Fitness & Outdoors',
    shortLabel: 'Sports & Fitness',
    description: 'Gym equipment, dumbbells, jerseys, football gear, and outdoor/camping equipment.',
    subcategories: [
      { name: 'Home Gym & Fitness Equipment', slug: 'gym-fitness-equipment' },
      { name: 'Jerseys, Sportswear & Boots', slug: 'jerseys-sportswear' },
      { name: 'Outdoor, Travel & Camping Gear', slug: 'outdoor-travel-camping' },
    ],
  },
];

export const STORE_SECTORS: StoreSectorDefinition[] = [
  {
    id: 'electronics-computers',
    label: 'Electronics & Gadget Store',
    shortLabel: 'Electronics & Tech',
    keywords: [
      'laptop', 'macbook', 'monitor', 'computer', 'pc', 'desktop', 'hp', 'dell', 'lenovo',
      'starlink', 'router', 'jbl', 'ps5', 'playstation', 'speaker', 'microphone', 'webcam',
    ],
  },
  {
    id: 'phones-tablets',
    label: 'Phones, iPhones & Tablets',
    shortLabel: 'Phones & Apple',
    keywords: ['iphone', 'samsung', 'galaxy', 'ipad', 'apple watch', 'airpods', 'redmi', 'xiaomi', 'infinix', 'tecno', 'smartwatch', 'earbuds', 'phone', 'istore'],
  },
  {
    id: 'supermarket-groceries',
    label: 'Supermarket & Groceries',
    shortLabel: 'Supermarkets',
    keywords: ['grocery', 'supermarket', 'rice', 'oil', 'beverage', 'milk', 'cereal', 'noodles', 'provision', 'mart', 'foodstuff'],
  },
  {
    id: 'fashion-apparel',
    label: 'Fashion & Apparel',
    shortLabel: 'Fashion & Style',
    keywords: ['shirt', 'dress', 'sneaker', 'shoe', 'bag', 'watch', 'jean', 'trouser', 'boutique', 'wear', 'fashion', 'heels'],
  },
  {
    id: 'health-beauty',
    label: 'Health & Beauty',
    shortLabel: 'Beauty & Care',
    keywords: ['perfume', 'skincare', 'lotion', 'cream', 'makeup', 'wig', 'hair', 'cosmetic', 'fragrance', 'soap', 'serum'],
  },
  {
    id: 'home-appliances',
    label: 'Home, Furniture & Appliances',
    shortLabel: 'Home & Appliances',
    keywords: ['fridge', 'freezer', 'air conditioner', 'blender', 'microwave', 'television', 'smart tv', 'sofa', 'mattress', 'bed', 'washing machine', 'fan'],
  },
  {
    id: 'solar-power',
    label: 'Solar & Power Solutions',
    shortLabel: 'Solar & Power',
    keywords: ['inverter', 'solar', 'battery', 'lithium', 'tubular', 'panel', 'generator', 'power station', 'ups', 'charge controller'],
  },
];

export interface ProductClassification {
  globalCategory: string;
  inStoreCategory: string;
  brand: string | null;
  specTags: string[];
}

const BRAND_MATCHERS: Array<{ brand: string; regex: RegExp }> = [
  { brand: 'Apple', regex: /\b(apple|macbook|imac|ipad|iphone|airpods|iwatch|watch\s+ultra|watch\s+series|magic\s+keyboard|magic\s+mouse|magic\s+trackpad|pencil\s+pro)\b/i },
  { brand: 'Oraimo', regex: /\b(oraimo|freepods|powerjet|boompop|soundbass)\b/i },
  { brand: 'New Age', regex: /\b(new\s*age)\b/i },
  { brand: 'Starlink', regex: /\b(starlink)\b/i },
  { brand: 'JBL', regex: /\b(jbl)\b/i },
  { brand: 'Zealot', regex: /\b(zealot)\b/i },
  { brand: 'Sony', regex: /\b(sony|ps5|ps4|playstation|dualsense|dualshock)\b/i },
  { brand: 'HP', regex: /\b(hp|elitebook|probook|pavilion|envy|omen|zbook|spectre)\b/i },
  { brand: 'Dell', regex: /\b(dell|latitude|inspiron|xps|precision|alienware|vostro)\b/i },
  { brand: 'Lenovo', regex: /\b(lenovo|thinkpad|ideapad|yoga|legion)\b/i },
  { brand: 'DJI', regex: /\b(dji)\b/i },
  { brand: 'Hollyland', regex: /\b(hollyland)\b/i },
  { brand: 'Maono', regex: /\b(maono)\b/i },
  { brand: 'Harman Kardon', regex: /\b(onyx\s*studio|harman\s*kardon)\b/i },
  { brand: 'Logitech', regex: /\b(logitech)\b/i },
  { brand: 'Microsoft', regex: /\b(microsoft|surface|life\s*cam)\b/i },
  { brand: 'D-Link', regex: /\b(d-link|dlink)\b/i },
  { brand: 'Wavlink', regex: /\b(wavlink)\b/i },
  { brand: 'TP-Link', regex: /\b(tp-link|tplink)\b/i },
  { brand: 'Itel', regex: /\b(itel)\b/i },
  { brand: 'Tecno', regex: /\b(tecno|techno)\b/i },
  { brand: 'Infinix', regex: /\b(infinix)\b/i },
  { brand: 'Nokia', regex: /\b(nokia|hmd\d*)\b/i },
  { brand: 'SanDisk', regex: /\b(sandisk)\b/i },
  { brand: 'Green Lion', regex: /\b(green\s*lion)\b/i },
  { brand: 'LDNIO', regex: /\b(ldnio)\b/i },
  { brand: 'Poolee', regex: /\b(poolee)\b/i },
  { brand: 'SHPlus', regex: /\b(shplus)\b/i },
  { brand: 'Foomee', regex: /\b(foomee)\b/i },
  { brand: 'Villaon', regex: /\b(villaon)\b/i },
  { brand: 'Asus', regex: /\b(asus|zenbook|vivobook|rog|tuf)\b/i },
  { brand: 'Acer', regex: /\b(acer|aspire|predator|nitro|swift)\b/i },
  { brand: 'Samsung', regex: /\b(samsung|galaxy)\b/i },
];

export function extractProductBrand(text: string): string | null {
  for (const m of BRAND_MATCHERS) {
    if (m.regex.test(text)) return m.brand;
  }
  return null;
}

export function extractSpecTags(name: string, description?: string | null): string[] {
  const combined = `${name} ${description || ''}`;
  const tags: string[] = [];

  if (/\b(open[-\s]*box)\b/i.test(name)) {
    tags.push('Open-Box');
  } else if (/\b(us[-\s]*used)\b/i.test(name)) {
    tags.push('US-Used');
  } else if (/\b(uk[-\s]*used)\b/i.test(combined)) {
    tags.push('UK-Used');
  } else if (/\b(new|brand\s*new)\b/i.test(name) && !/\bnew\s*age\b/i.test(name)) {
    tags.push('Brand New');
  } else if (/\b(used)\b/i.test(name)) {
    tags.push('Pre-Owned');
  }

  const mahMatch = name.match(/\b(\d{4,6})\s*mah\b/i);
  if (mahMatch) {
    tags.push(`${Number(mahMatch[1]).toLocaleString()}mAh`);
  }

  const wattMatch = name.match(/\b(\d+(?:\.\d+)?)\s*w\b/i);
  if (wattMatch && Number(wattMatch[1]) >= 10 && Number(wattMatch[1]) <= 600) {
    tags.push(`${wattMatch[1].toUpperCase()}W`);
  }

  const cpuMatch = combined.match(/\b(core\s*i[3579]|i[3579]\s*-\s*\d+|ryzen\s*[3579]|m[1234]\s*(pro|max)?|celeron|pentium)\b/i);
  if (cpuMatch) {
    const raw = cpuMatch[0].toUpperCase().replace(/\s+/g, ' ');
    if (raw.includes('I9')) tags.push('Core i9');
    else if (raw.includes('I7')) tags.push('Core i7');
    else if (raw.includes('I5')) tags.push('Core i5');
    else if (raw.includes('I3')) tags.push('Core i3');
    else if (raw.includes('RYZEN')) tags.push(raw);
    else if (/^M[1234]\b/.test(raw)) tags.push(`Apple ${raw}`);
  }

  const capMatch = name.match(/\b(4|8|16|32|64|128|256|512)\s*GB\b|\b(1|2)\s*TB\b/i);
  if (capMatch) {
    tags.push(capMatch[0].toUpperCase().replace(/\s+/g, ''));
  }

  const ramMatch = combined.match(/\b(8|16|24|32|64)\s*GB\s*(RAM|DDR\d|Memory|Intel)\b/i);
  if (ramMatch && !tags.includes(`${ramMatch[1]}GB`)) {
    tags.push(`${ramMatch[1]}GB RAM`);
  }

  if (/\b(nano\s*\+\s*esim)\b/i.test(name)) {
    tags.push('Nano + eSIM');
  } else if (/\b(physical\s*sim)\b/i.test(name)) {
    tags.push('Physical SIM');
  } else if (/\b(esim)\b/i.test(name)) {
    tags.push('eSIM');
  } else if (/\b(cellular)\b/i.test(name)) {
    tags.push('Wi-Fi + Cellular');
  } else if (/\b(type-c|usb-c)\b/i.test(name)) {
    tags.push('Type-C');
  } else if (/\b(4g\s*lte)\b/i.test(name)) {
    tags.push('4G LTE');
  }

  if (/\b(gen\s*3|v4)\b/i.test(combined)) tags.push('Gen 3 V4');
  if (/\b(ax3000|wifi\s*6)\b/i.test(combined)) tags.push('Wi-Fi 6');
  if (/\b(ip67|ip68|waterproof)\b/i.test(combined) && tags.length < 3) tags.push('Waterproof');

  const hoursMatch = combined.match(/\b(24|28|34)\s*h(ours|rs|r)?\b/i);
  if (hoursMatch && tags.length < 3) tags.push(`${hoursMatch[1]}h Playtime`);

  if (/\b(500w|1000w|1000wh|1kwh|lifepo4)\b/i.test(combined) && tags.length < 3) {
    tags.push('1000Wh LiFePO4');
  }

  return Array.from(new Set(tags)).slice(0, 3);
}

/**
 * Classifies a retail product into both:
 * 1. `globalCategory`: One of the canonical platform-wide categories (e.g., the 9 core categories + Jumia/Jiji/Amazon departments)
 * 2. `inStoreCategory`: Granular aisle used inside a specific store (/org/[id])
 */
export function classifyRetailProduct(input: {
  name: string;
  description?: string | null;
  price?: number;
  storeCategory?: string | null;
  wcCategory?: string | null;
}): ProductClassification {
  const name = (input.name || '').trim();
  const desc = (input.description || '').trim();
  const wcCat = (input.wcCategory || '').trim().toLowerCase();
  const text = `${name} ${desc} ${wcCat}`.toLowerCase();
  const brand = extractProductBrand(`${name} ${desc}`);
  const specTags = extractSpecTags(name, desc);

  // 1. Apple Watch
  if (/\b(apple\s*watch|watch\s+ultra|watch\s+series\s*\d+|iwatch)\b/i.test(name)) {
    return {
      globalCategory: 'Smartwatches & Fitness Wearables',
      inStoreCategory: 'Apple Watch',
      brand: 'Apple',
      specTags,
    };
  }

  // 1b. Other Smartwatches & Fitness Trackers (Oraimo Watch, Fitband, etc.)
  if (
    wcCat.includes('smart watch') ||
    wcCat.includes('activities tracker') ||
    wcCat.includes('fitband') ||
    /\b(smart\s*watch|smartwatch|oraimo\s*watch|fitband|fitness\s*tracker|watch\s*es\s*\d|watch\s*\d\s*(pro|plus|lite|max|r)?|osw-)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Smartwatches & Fitness Wearables',
      inStoreCategory: 'Smartwatches & Fitness Bands',
      brand,
      specTags,
    };
  }

  // 2. AirPods (Apple Official)
  if (/\b(airpods)\b/i.test(name) && !/\b(andriod|android|oraimo)\b/i.test(name)) {
    return {
      globalCategory: 'Earbuds, AirPods & Headphones',
      inStoreCategory: 'AirPods & Wireless Audio',
      brand: 'Apple',
      specTags,
    };
  }

  // 3. Apple iPads
  if (/\b(ipad)\b/i.test(name)) {
    return {
      globalCategory: 'Phones, iPhones & Tablets',
      inStoreCategory: 'Apple iPads',
      brand: 'Apple',
      specTags,
    };
  }

  // 4. Apple MacBooks
  if (/\b(macbook|imac|mac\s+mini|mac\s+studio)\b/i.test(name)) {
    return {
      globalCategory: 'Laptops, MacBooks & Monitors',
      inStoreCategory: 'Apple MacBooks',
      brand: 'Apple',
      specTags,
    };
  }

  // 5. Apple Magic Accessories & Pencil
  if (/\b(magic\s+keyboard|magic\s+mouse|magic\s+trackpad|pencil\s+pro|apple\s+pencil)\b/i.test(name)) {
    return {
      globalCategory: 'Laptops, MacBooks & Monitors',
      inStoreCategory: 'Apple Keyboards, Mice & Pencil',
      brand: 'Apple',
      specTags,
    };
  }

  // 6. Apple iPhones (segmented by generation series for in-store aisles!)
  if (/\b(iphone)\b/i.test(name) && !/\b(for\s+iphone|cable|screen|guard|battery|earpods|case|charger)\b/i.test(name)) {
    let inStoreCategory = 'Apple iPhones';
    if (/\biphone\s*(17|16|air)/i.test(name)) {
      inStoreCategory = 'iPhone 16, 17 & Air Series';
    } else if (/\biphone\s*(15|14)/i.test(name)) {
      inStoreCategory = 'iPhone 14 & 15 Series';
    } else if (/\biphone\s*(13|12|11|xr|xs)/i.test(name)) {
      inStoreCategory = 'iPhone 12 & 13 Series';
    }
    return {
      globalCategory: 'Phones, iPhones & Tablets',
      inStoreCategory,
      brand: 'Apple',
      specTags,
    };
  }

  // 7. Starlink, 4G MiFi, Routers & Networking
  if (/\b(starlink|router|mifi|pocket\s*wifi|4g\s*lte|access\s*point|wavlink|d-link|tp-link|mikrotik|ethernet\s*cable|pipe\s*adapter|modem|network\s*switch|mesh\s*wifi)\b/i.test(name)) {
    return {
      globalCategory: 'Starlink, 4G MiFi & Networking',
      inStoreCategory: /\b(mifi|4g\s*lte|airtel|mtn)\b/i.test(name) ? '4G MiFi & WiFi Routers' : 'Starlink & Networking',
      brand,
      specTags,
    };
  }

  // 8. Gaming Consoles, Controllers & Video Games
  if (/\b(ps5|ps4|playstation|xbox|nintendo|controller|game\s*pad|gamepad|fc27|fc26|fc25|fc24|fifa|steam\s*deck|gaming\s*console)\b/i.test(name)) {
    return {
      globalCategory: 'Gaming Consoles, Storage & Smart Gadgets',
      inStoreCategory: 'Gaming & Consoles',
      brand,
      specTags,
    };
  }

  // 9. Power Banks, Portable Power Stations, Solar & Inverters
  if (
    wcCat.includes('power bank') ||
    /\b(power\s*bank|powerbank|power\s*box|powerjet|powerpulse|powerpluse|power\s*go|traveler\s*\d+|toast\s*\d+|turbo\s*(ultra|\d+)|power\s*tank|power\s*station|inverter|solar|lithium\s*battery|tubular\s*battery|ecoflow|bluetti|ups|lifepo4|\d{4,6}\s*mah)\b/i.test(name)
  ) {
    const isHeavyStation = /\b(power\s*tank|power\s*station|inverter|solar|1000wh|320wh|100000mah)\b/i.test(name);
    return {
      globalCategory: 'Power Banks, Inverters & Backup Power',
      inStoreCategory: isHeavyStation ? 'Power & Backup Stations' : 'Power Banks & Fast Portable Power',
      brand,
      specTags,
    };
  }

  // 10. Wireless Earbuds, Headsets & Earphones
  if (
    wcCat.includes('wireless earbud') ||
    wcCat.includes('wireless earphone') ||
    wcCat.includes('wireless headphone') ||
    wcCat.includes('talking wireless headset') ||
    wcCat.includes('wire earphone') ||
    /\b(earbud|earphone|earpods|freepods|necklace|neckband|airbuds|headset|headphone|overear|boompop|halo\s*airy|shark\s*\d|riff\s*\d|conch)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Earbuds, AirPods & Headphones',
      inStoreCategory: 'Earbuds, Headsets & Earphones',
      brand,
      specTags,
    };
  }

  // 11. Microphones, Gimbals & Creator Audio/Video
  if (/\b(microphone|mini\s*mic|dji\s*mic|hollyland|maono|boya|rode|xlr|wireless\s*mic|selfie\s*stick|tripod|gimbal|quadrapod)\b/i.test(name)) {
    return {
      globalCategory: 'Bluetooth Speakers & Creator Microphones',
      inStoreCategory: 'Microphones & Creator Audio',
      brand,
      specTags,
    };
  }

  // 12. Bluetooth Speakers & Soundbars
  if (
    wcCat.includes('wireless speaker') ||
    /\b(jbl|boombox|xtreme|charge\s*\d|flip\s*\d|onyx\s*studio|harman|speaker|soundbar|soundbass|subwoofer|zealot|obs-)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Bluetooth Speakers & Creator Microphones',
      inStoreCategory: 'Bluetooth Speakers & Audio',
      brand,
      specTags,
    };
  }

  // 13. Chargers, Cables & Power Strips
  if (
    wcCat.includes('wall charger') ||
    wcCat.includes('car charger') ||
    wcCat.includes('cables') ||
    /\b(wall\s*charger|car\s*charger|fast\s*charger|charger\s*kit|data\s*cable|charging\s*cable|flat\s*cable|type-c\s*cable|lightning\s*cable|power\s*strip|extension\s*socket|power\s*cube|power\s*cord|cable)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Fast Chargers, Cables & Extensions',
      inStoreCategory: 'Chargers, Cables & Extensions',
      brand,
      specTags,
    };
  }

  // 14. Flash Drives, Memory Cards & Storage
  if (
    wcCat.includes('flash drives') ||
    wcCat.includes('memory card') ||
    /\b(flash\s*drive|flashdrive|otg\s*flash|memory\s*card|tf\s*card|micro\s*sd|sd\s*card|external\s*ssd|hard\s*drive)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Gaming Consoles, Storage & Smart Gadgets',
      inStoreCategory: 'Flash Drives & Memory Cards',
      brand,
      specTags,
    };
  }

  // 15. Phone Batteries, Screen Guards & Replacement Parts
  if (
    wcCat.includes('battery') ||
    wcCat.includes('screens guard') ||
    /\b(screen\s*guard|tempered\s*glass|privacy\s*glass|phone\s*battery|bl-\d+[a-z]*\s*battery|replacement\s*battery|battery\s*cover|sub\s*board)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Gaming Consoles, Storage & Smart Gadgets',
      inStoreCategory: 'Batteries, Screen Guards & Parts',
      brand,
      specTags,
    };
  }

  // 16a. Clippers, Trimmers, Shavers & Smart Gadgets
  if (
    wcCat.includes('clipper') ||
    /\b(clipper|trimmer|shaver|smart\s*kettle|webcam|life\s*cam|smart\s*glasses|smart\s*socket|laptop\s*stand|adapter|mouse|keyboard|docking)\b/i.test(text)
  ) {
    return {
      globalCategory: 'Gaming Consoles, Storage & Smart Gadgets',
      inStoreCategory: /\b(clipper|trimmer|shaver|smart\s*kettle)\b/i.test(name)
        ? 'Clippers & Smart Appliances'
        : 'Webcams, Stands & Smart Gadgets',
      brand,
      specTags,
    };
  }

  // 16b. Home & Kitchen Heavy Appliances
  if (
    /\b(refrigerator|fridge|freezer|washing\s*machine|microwave|blender|air\s*fryer|air\s*conditioner|standing\s*fan|smart\s*tv|television|sofa|mattress)\b/i.test(text)
  ) {
    return {
      globalCategory: 'Home, Kitchen & Appliances',
      inStoreCategory: 'Home & Kitchen Appliances',
      brand,
      specTags,
    };
  }

  // 17. Monitors & Displays
  if (/\b(monitor|curved\s+display|led\s+monitor|ips\s+monitor|frameless\s+monitor)\b/i.test(name)) {
    return {
      globalCategory: 'Laptops, MacBooks & Monitors',
      inStoreCategory: 'Monitors & Displays',
      brand,
      specTags,
    };
  }

  // 18. Laptops & Desktops
  if (/\b(laptop|notebook|ultrabook|elitebook|probook|pavilion|envy|omen|zbook|spectre|latitude|inspiron|xps|precision|alienware|vostro|thinkpad|ideapad|yoga|legion|zenbook|vivobook|aspire|predator|nitro|desktop\s*computer|core\s*i[3579])\b/i.test(text)) {
    return {
      globalCategory: 'Laptops, MacBooks & Monitors',
      inStoreCategory: 'Laptops & Computers',
      brand,
      specTags,
    };
  }

  // 19. Mobile, Feature & Button Phones
  if (
    wcCat.includes('button phone') ||
    /\b(samsung\s+galaxy|redmi|xiaomi|infinix|tecno|techno|itel|nokia|villaon|pixel\s+\d|smartphone|tablet|telephone|dual\s*sim|button\s*phone)\b/i.test(text)
  ) {
    return {
      globalCategory: 'Phones, iPhones & Tablets',
      inStoreCategory: 'Phones & Communication',
      brand,
      specTags,
    };
  }

  // 20. Universal E-Commerce Categories (Groceries, Fashion, Beauty, Baby, Sports, Auto)
  if (/\b(rice|noodles|spaghetti|pasta|vegetable\s*oil|palm\s*oil|milk|milo|cereal|biscuit|beverage|juice|bread|grocery|provisions|detergent|tissue)\b/i.test(text)) {
    return {
      globalCategory: 'Supermarket & Groceries',
      inStoreCategory: 'Supermarket & Groceries',
      brand,
      specTags,
    };
  }

  if (/\b(shirt|t-shirt|trouser|jeans|dress|gown|skirt|sneaker|shoe|heels|sandals|handbag|backpack|wristwatch|jewelry|necklace|hoodie|suit)\b/i.test(text)) {
    return {
      globalCategory: 'Fashion, Shoes & Accessories',
      inStoreCategory: 'Fashion & Apparel',
      brand,
      specTags,
    };
  }

  if (/\b(perfume|fragrance|body\s*spray|deodorant|lotion|face\s*cream|serum|cleanser|wig|hair\s*extension|shampoo|conditioner|lipstick|makeup|foundation|vitamin)\b/i.test(text)) {
    return {
      globalCategory: 'Health, Beauty & Personal Care',
      inStoreCategory: 'Health & Beauty',
      brand,
      specTags,
    };
  }

  if (/\b(diaper|pampers|baby\s*wipes|baby\s*food|infant|stroller|cot|toy|lego)\b/i.test(text)) {
    return {
      globalCategory: 'Baby, Kids & Toys',
      inStoreCategory: 'Baby & Kids',
      brand,
      specTags,
    };
  }

  if (/\b(dumbbell|treadmill|yoga\s*mat|football|jersey|gym|camping\s*tent)\b/i.test(text)) {
    return {
      globalCategory: 'Sports, Fitness & Outdoors',
      inStoreCategory: 'Sports & Fitness',
      brand,
      specTags,
    };
  }

  return {
    globalCategory: 'Gaming Consoles, Storage & Smart Gadgets',
    inStoreCategory: 'Tech & Accessories',
    brand,
    specTags,
  };
}

/**
 * Infers the primary Shop Sector (`storeCategory`) and top specialty `aisles`
 * from a store's product catalog.
 */
export function inferStoreProfileTaxonomy(
  products: Array<{ name: string; description?: string | null; price?: number }>,
  currentStoreCategory?: string | null
): {
  storeCategory: string;
  aisles: string[];
} {
  const globalCounts = new Map<string, number>();
  const inStoreCounts = new Map<string, number>();

  for (const p of products) {
    const c = classifyRetailProduct({
      name: p.name,
      description: p.description,
      price: p.price,
      storeCategory: currentStoreCategory,
    });
    globalCounts.set(c.globalCategory, (globalCounts.get(c.globalCategory) || 0) + 1);
    inStoreCounts.set(c.inStoreCategory, (inStoreCounts.get(c.inStoreCategory) || 0) + 1);
  }

  const topGlobal = Array.from(globalCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topInStore = Array.from(inStoreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  let storeCategory = currentStoreCategory || 'General Merchandise';
  const primaryGlobal = topGlobal[0]?.[0] || '';

  if (
    primaryGlobal === 'Phones, iPhones & Tablets' ||
    primaryGlobal === 'Smartwatches & Fitness Wearables'
  ) {
    storeCategory = 'Phones, Apple & Devices';
  } else if (
    primaryGlobal === 'Laptops, MacBooks & Monitors' ||
    primaryGlobal === 'Starlink, 4G MiFi & Networking' ||
    primaryGlobal === 'Earbuds, AirPods & Headphones' ||
    primaryGlobal === 'Bluetooth Speakers & Creator Microphones' ||
    primaryGlobal === 'Fast Chargers, Cables & Extensions' ||
    primaryGlobal === 'Gaming Consoles, Storage & Smart Gadgets' ||
    currentStoreCategory === 'Electronics'
  ) {
    storeCategory = 'Electronics & Gadgets';
  } else if (primaryGlobal === 'Power Banks, Inverters & Backup Power') {
    storeCategory = 'Solar & Power Solutions';
  } else if (primaryGlobal === 'Home, Kitchen & Appliances') {
    storeCategory = 'Home, Furniture & Appliances';
  } else if (primaryGlobal === 'Fashion, Shoes & Accessories') {
    storeCategory = 'Fashion & Apparel';
  } else if (primaryGlobal === 'Health, Beauty & Personal Care') {
    storeCategory = 'Health & Beauty';
  } else if (primaryGlobal === 'Supermarket & Groceries') {
    storeCategory = 'Supermarket & Groceries';
  }

  return {
    storeCategory,
    aisles: topInStore.slice(0, 8),
  };
}
