export interface StoreSectorDefinition {
  id: string;
  label: string;
  shortLabel: string;
  keywords: string[];
}

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
    label: 'Phones & Tablets',
    shortLabel: 'Phones & Gadgets',
    keywords: ['iphone', 'samsung', 'galaxy', 'ipad', 'redmi', 'xiaomi', 'infinix', 'tecno', 'airpods', 'smartwatch', 'earbuds', 'phone'],
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
  { brand: 'Starlink', regex: /\b(starlink)\b/i },
  { brand: 'JBL', regex: /\b(jbl)\b/i },
  { brand: 'Sony', regex: /\b(sony|ps5|ps4|playstation|dualsense|dualshock)\b/i },
  { brand: 'HP', regex: /\b(hp|elitebook|probook|pavilion|envy|omen|zbook|spectre)\b/i },
  { brand: 'Dell', regex: /\b(dell|latitude|inspiron|xps|precision|alienware|vostro)\b/i },
  { brand: 'Apple', regex: /\b(apple|macbook|imac|ipad|iphone|airpods)\b/i },
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
  { brand: 'Green Lion', regex: /\b(green\s*lion)\b/i },
  { brand: 'LDNIO', regex: /\b(ldnio)\b/i },
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

  // CPU
  const cpuMatch = combined.match(/\b(core\s*i[3579]|i[3579]\s*-\s*\d+|ryzen\s*[3579]|apple\s*m[123]|celeron|pentium)\b/i);
  if (cpuMatch) {
    const raw = cpuMatch[0].toUpperCase().replace(/\s+/g, ' ');
    if (raw.includes('I9')) tags.push('Core i9');
    else if (raw.includes('I7')) tags.push('Core i7');
    else if (raw.includes('I5')) tags.push('Core i5');
    else if (raw.includes('I3')) tags.push('Core i3');
    else if (raw.includes('RYZEN')) tags.push(raw);
    else if (raw.includes('M1') || raw.includes('M2') || raw.includes('M3')) tags.push(raw);
  }

  // RAM
  const ramMatch = combined.match(/\b(4|8|12|16|24|32|64)\s*GB\s*(RAM|DDR\d|Memory|Intel)?\b/i);
  if (ramMatch) {
    tags.push(`${ramMatch[1]}GB RAM`);
  }

  // Storage
  const ssdMatch = combined.match(/\b(128|256|512|1000)\s*GB\s*(SSD|NVMe|HDD)?\b|\b(1|2)\s*TB\s*(SSD|NVMe|HDD)?\b|\bSSD\s*(128|256|512)GB\b/i);
  if (ssdMatch) {
    const digits = ssdMatch[0].match(/\d+\s*(GB|TB)/i)?.[0]?.toUpperCase().replace(/\s+/g, '') || '';
    if (digits && !tags.includes(`${digits} RAM`)) {
      tags.push(`${digits} SSD`);
    }
  }

  // Starlink / Networking tags
  if (/\b(gen\s*3|v4)\b/i.test(combined)) tags.push('Gen 3 V4');
  if (/\b(ax3000|wifi\s*6|dual\s*band)\b/i.test(combined)) tags.push('Wi-Fi 6');
  if (/\b(ip67|ip68|waterproof)\b/i.test(combined)) tags.push('Waterproof');

  // Audio / Battery playtime tags
  const hoursMatch = combined.match(/\b(24|28|34)\s*h(ours|rs|r)?\b/i);
  if (hoursMatch) tags.push(`${hoursMatch[1]}h Playtime`);

  // Power Station tags
  if (/\b(500w|1000w|1000wh|1kwh|lifepo4)\b/i.test(combined)) {
    tags.push('1000Wh LiFePO4');
  }

  // Wireless / Bluetooth / 4K
  if (/\b(wireless|bluetooth)\b/i.test(combined) && tags.length < 3) {
    tags.push('Wireless');
  }
  if (/\b(4k|1080p|720p)\b/i.test(combined) && tags.length < 3) {
    const res = combined.match(/\b(4k|1080p|720p)\b/i)?.[0]?.toUpperCase();
    if (res) tags.push(`${res} Video`);
  }

  return Array.from(new Set(tags)).slice(0, 3);
}

/**
 * Classifies a retail product into both:
 * 1. `globalCategory`: Used across CityMarket (/market) to compare & browse across stores
 * 2. `inStoreCategory`: Used inside a specific store (/org/[id]) to group products into clean aisles
 */
export function classifyRetailProduct(input: {
  name: string;
  description?: string | null;
  price?: number;
  storeCategory?: string | null;
}): ProductClassification {
  const name = (input.name || '').trim();
  const desc = (input.description || '').trim();
  const text = `${name} ${desc}`.toLowerCase();
  const brand = extractProductBrand(`${name} ${desc}`);
  const specTags = extractSpecTags(name, desc);

  // 1. Starlink, Routers & Networking
  if (/\b(starlink|router|access\s*point|wavlink|d-link|tp-link|mikrotik|ethernet\s*cable|pipe\s*adapter|modem|network\s*switch|mesh\s*wifi)\b/i.test(text)) {
    return {
      globalCategory: 'Starlink & Networking',
      inStoreCategory: 'Starlink & Networking',
      brand,
      specTags,
    };
  }

  // 2. Gaming Consoles, Controllers & Video Games
  if (/\b(ps5|ps4|playstation|xbox|nintendo|controller|game\s*pad|gamepad|fc27|fc26|fc25|fc24|fifa|steam\s*deck|gaming\s*console)\b/i.test(text)) {
    return {
      globalCategory: 'Gaming & Consoles',
      inStoreCategory: 'Gaming & Consoles',
      brand,
      specTags,
    };
  }

  // 3. Speakers, Microphones & Pro Audio
  if (/\b(jbl|boombox|xtreme|charge\s*\d|flip\s*\d|onyx\s*studio|harman|speaker|soundbar|subwoofer|microphone|maono|dji\s*mic|hollyland|boya|rode|xlr|wireless\s*mic|airpods|earbuds|headphone)\b/i.test(text)) {
    const isMic = /\b(mic|microphone|maono|hollyland)\b/i.test(name);
    return {
      globalCategory: 'Audio, Speakers & Mics',
      inStoreCategory: isMic ? 'Microphones & Creator Audio' : 'Bluetooth Speakers & Audio',
      brand,
      specTags,
    };
  }

  // 4. Monitors & Displays
  if (/\b(monitor|curved\s+display|led\s+monitor|ips\s+monitor|frameless\s+monitor)\b/i.test(name)) {
    return {
      globalCategory: 'Monitors & Displays',
      inStoreCategory: 'Monitors & Displays',
      brand,
      specTags,
    };
  }

  // 5. Laptops & Desktops
  if (/\b(laptop|notebook|ultrabook|elitebook|probook|pavilion|envy|omen|zbook|spectre|latitude|inspiron|xps|precision|alienware|vostro|thinkpad|ideapad|yoga|legion|zenbook|vivobook|aspire|predator|nitro|macbook|imac|desktop\s*computer|core\s*i[3579])\b/i.test(text)) {
    return {
      globalCategory: 'Laptops & Computers',
      inStoreCategory: 'Laptops & Computers',
      brand,
      specTags,
    };
  }

  // 6. Power Banks, Portable Power Stations, Solar & Inverters
  if (/\b(power\s*tank|power\s*station|inverter|solar|lithium\s*battery|tubular\s*battery|ecoflow|bluetti|ups|charge\s*controller|lifepo4)\b/i.test(text)) {
    return {
      globalCategory: 'Power & Inverters',
      inStoreCategory: 'Power & Backup Stations',
      brand,
      specTags,
    };
  }

  // 7. Webcams, Smart Gadgets & Computer Accessories
  if (/\b(webcam|life\s*cam|smart\s*glasses|smart\s*socket|laptop\s*stand|charger|adapter|power\s*cord|cable|mouse|keyboard|flash\s*drive|hard\s*drive|external\s*ssd|docking)\b/i.test(text)) {
    return {
      globalCategory: 'Tech Accessories & Smart Gadgets',
      inStoreCategory: 'Webcams, Stands & Smart Gadgets',
      brand,
      specTags,
    };
  }

  // 8. Phones, Telephones & Tablets
  if (/\b(iphone|ipad|samsung\s+galaxy|redmi|xiaomi|infinix|tecno|itel|pixel\s+\d|smartphone|tablet|telephone|dual\s*sim)\b/i.test(text)) {
    return {
      globalCategory: 'Phones & Tablets',
      inStoreCategory: 'Phones & Communication',
      brand,
      specTags,
    };
  }

  // 9. Home Appliances
  if (/\b(refrigerator|fridge|freezer|washing\s*machine|microwave|blender|air\s*conditioner|standing\s*fan|smart\s*tv|television)\b/i.test(text)) {
    return {
      globalCategory: 'Home Appliances',
      inStoreCategory: 'Home Appliances',
      brand,
      specTags,
    };
  }

  // 10. Fashion & Apparel
  if (/\b(sneaker|shoe|shirt|trouser|jeans|dress|gown|handbag|wrist\s*watch|heels|sandals|hoodie|jacket)\b/i.test(text)) {
    return {
      globalCategory: 'Fashion & Style',
      inStoreCategory: 'Fashion & Apparel',
      brand,
      specTags,
    };
  }

  // 11. Beauty & Personal Care
  if (/\b(perfume|fragrance|body\s*spray|lotion|cream|serum|wig|makeup|skincare)\b/i.test(text)) {
    return {
      globalCategory: 'Health & Beauty',
      inStoreCategory: 'Beauty & Personal Care',
      brand,
      specTags,
    };
  }

  // Fallback
  const fallbackCat = input.storeCategory && input.storeCategory !== 'Supermarket' && input.storeCategory !== 'Electronics'
    ? input.storeCategory
    : 'Tech & Accessories';
  return {
    globalCategory: fallbackCat,
    inStoreCategory: fallbackCat,
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
    primaryGlobal === 'Laptops & Computers' ||
    primaryGlobal === 'Starlink & Networking' ||
    primaryGlobal === 'Audio, Speakers & Mics' ||
    primaryGlobal === 'Gaming & Consoles' ||
    primaryGlobal === 'Monitors & Displays' ||
    primaryGlobal === 'Tech Accessories & Smart Gadgets' ||
    currentStoreCategory === 'Electronics'
  ) {
    storeCategory = 'Electronics & Gadgets';
  } else if (primaryGlobal === 'Phones & Tablets') {
    storeCategory = 'Phones & Tablets';
  } else if (primaryGlobal === 'Power & Inverters') {
    storeCategory = 'Solar & Power Solutions';
  } else if (primaryGlobal === 'Home Appliances') {
    storeCategory = 'Home, Furniture & Appliances';
  } else if (primaryGlobal === 'Fashion & Style') {
    storeCategory = 'Fashion & Apparel';
  } else if (primaryGlobal === 'Health & Beauty') {
    storeCategory = 'Health & Beauty';
  }

  return {
    storeCategory,
    aisles: topInStore.slice(0, 8),
  };
}
