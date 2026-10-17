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

  // Condition (New / Open-Box / US-Used / UK-Used)
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

  // Power Bank mAh capacity
  const mahMatch = name.match(/\b(\d{4,6})\s*mah\b/i);
  if (mahMatch) {
    tags.push(`${Number(mahMatch[1]).toLocaleString()}mAh`);
  }

  // Fast Charging Wattage
  const wattMatch = name.match(/\b(\d+(?:\.\d+)?)\s*w\b/i);
  if (wattMatch && Number(wattMatch[1]) >= 10 && Number(wattMatch[1]) <= 600) {
    tags.push(`${wattMatch[1].toUpperCase()}W`);
  }

  // CPU / Chip
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

  // Storage / Memory (4GB, 8GB, 16GB, 32GB, 64GB, 128GB, 256GB, 512GB, 1TB)
  const capMatch = name.match(/\b(4|8|16|32|64|128|256|512)\s*GB\b|\b(1|2)\s*TB\b/i);
  if (capMatch) {
    tags.push(capMatch[0].toUpperCase().replace(/\s+/g, ''));
  }

  // RAM for Laptops if distinct
  const ramMatch = combined.match(/\b(8|16|24|32|64)\s*GB\s*(RAM|DDR\d|Memory|Intel)\b/i);
  if (ramMatch && !tags.includes(`${ramMatch[1]}GB`)) {
    tags.push(`${ramMatch[1]}GB RAM`);
  }

  // SIM / Connectivity
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

  // Starlink / Networking tags
  if (/\b(gen\s*3|v4)\b/i.test(combined)) tags.push('Gen 3 V4');
  if (/\b(ax3000|wifi\s*6)\b/i.test(combined)) tags.push('Wi-Fi 6');
  if (/\b(ip67|ip68|waterproof)\b/i.test(combined) && tags.length < 3) tags.push('Waterproof');

  // Audio / Battery playtime tags
  const hoursMatch = combined.match(/\b(24|28|34)\s*h(ours|rs|r)?\b/i);
  if (hoursMatch && tags.length < 3) tags.push(`${hoursMatch[1]}h Playtime`);

  // Power Station tags
  if (/\b(500w|1000w|1000wh|1kwh|lifepo4)\b/i.test(combined) && tags.length < 3) {
    tags.push('1000Wh LiFePO4');
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
      globalCategory: 'Smartwatches & Wearables',
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
      globalCategory: 'Smartwatches & Wearables',
      inStoreCategory: 'Smartwatches & Fitness Bands',
      brand,
      specTags,
    };
  }

  // 2. AirPods (Apple Official)
  if (/\b(airpods)\b/i.test(name) && !/\b(andriod|android|oraimo)\b/i.test(name)) {
    return {
      globalCategory: 'Audio, Speakers & Mics',
      inStoreCategory: 'AirPods & Wireless Audio',
      brand: 'Apple',
      specTags,
    };
  }

  // 3. Apple iPads
  if (/\b(ipad)\b/i.test(name)) {
    return {
      globalCategory: 'Phones & Tablets',
      inStoreCategory: 'Apple iPads',
      brand: 'Apple',
      specTags,
    };
  }

  // 4. Apple MacBooks
  if (/\b(macbook|imac|mac\s+mini|mac\s+studio)\b/i.test(name)) {
    return {
      globalCategory: 'Laptops & Computers',
      inStoreCategory: 'Apple MacBooks',
      brand: 'Apple',
      specTags,
    };
  }

  // 5. Apple Magic Accessories & Pencil
  if (/\b(magic\s+keyboard|magic\s+mouse|magic\s+trackpad|pencil\s+pro|apple\s+pencil)\b/i.test(name)) {
    return {
      globalCategory: 'Tech Accessories & Smart Gadgets',
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
      globalCategory: 'Phones & Tablets',
      inStoreCategory,
      brand: 'Apple',
      specTags,
    };
  }

  // 7. Starlink, 4G MiFi, Routers & Networking
  if (/\b(starlink|router|mifi|pocket\s*wifi|4g\s*lte|access\s*point|wavlink|d-link|tp-link|mikrotik|ethernet\s*cable|pipe\s*adapter|modem|network\s*switch|mesh\s*wifi)\b/i.test(name)) {
    return {
      globalCategory: 'Starlink & Networking',
      inStoreCategory: /\b(mifi|4g\s*lte|airtel|mtn)\b/i.test(name) ? '4G MiFi & WiFi Routers' : 'Starlink & Networking',
      brand,
      specTags,
    };
  }

  // 8. Gaming Consoles, Controllers & Video Games
  if (/\b(ps5|ps4|playstation|xbox|nintendo|controller|game\s*pad|gamepad|fc27|fc26|fc25|fc24|fifa|steam\s*deck|gaming\s*console)\b/i.test(name)) {
    return {
      globalCategory: 'Gaming & Consoles',
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
      globalCategory: 'Power & Inverters',
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
      globalCategory: 'Audio, Speakers & Mics',
      inStoreCategory: 'Earbuds, Headsets & Earphones',
      brand,
      specTags,
    };
  }

  // 11. Microphones, Gimbals & Creator Audio/Video
  if (/\b(microphone|mini\s*mic|dji\s*mic|hollyland|maono|boya|rode|xlr|wireless\s*mic|selfie\s*stick|tripod|gimbal|quadrapod)\b/i.test(name)) {
    return {
      globalCategory: 'Audio, Speakers & Mics',
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
      globalCategory: 'Audio, Speakers & Mics',
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
      globalCategory: 'Tech Accessories & Smart Gadgets',
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
      globalCategory: 'Tech Accessories & Smart Gadgets',
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
      globalCategory: 'Tech Accessories & Smart Gadgets',
      inStoreCategory: 'Batteries, Screen Guards & Parts',
      brand,
      specTags,
    };
  }

  // 16. Clippers, Grooming & Smart Home Appliances
  if (
    wcCat.includes('clipper') ||
    /\b(clipper|trimmer|shaver|smart\s*kettle|refrigerator|fridge|freezer|washing\s*machine|microwave|blender|air\s*conditioner|standing\s*fan|smart\s*tv|television)\b/i.test(name)
  ) {
    return {
      globalCategory: 'Home Appliances',
      inStoreCategory: 'Clippers & Smart Appliances',
      brand,
      specTags,
    };
  }

  // 17. Monitors & Displays
  if (/\b(monitor|curved\s+display|led\s+monitor|ips\s+monitor|frameless\s+monitor)\b/i.test(name)) {
    return {
      globalCategory: 'Monitors & Displays',
      inStoreCategory: 'Monitors & Displays',
      brand,
      specTags,
    };
  }

  // 18. Laptops & Desktops
  if (/\b(laptop|notebook|ultrabook|elitebook|probook|pavilion|envy|omen|zbook|spectre|latitude|inspiron|xps|precision|alienware|vostro|thinkpad|ideapad|yoga|legion|zenbook|vivobook|aspire|predator|nitro|desktop\s*computer|core\s*i[3579])\b/i.test(text)) {
    return {
      globalCategory: 'Laptops & Computers',
      inStoreCategory: 'Laptops & Computers',
      brand,
      specTags,
    };
  }

  // 19. Webcams, Smart Gadgets & Computer Accessories
  if (/\b(webcam|life\s*cam|smart\s*glasses|smart\s*socket|laptop\s*stand|adapter|mouse|keyboard|docking)\b/i.test(text)) {
    return {
      globalCategory: 'Tech Accessories & Smart Gadgets',
      inStoreCategory: 'Webcams, Stands & Smart Gadgets',
      brand,
      specTags,
    };
  }

  // 20. Mobile, Feature & Button Phones
  if (
    wcCat.includes('button phone') ||
    /\b(samsung\s+galaxy|redmi|xiaomi|infinix|tecno|techno|itel|nokia|villaon|pixel\s+\d|smartphone|tablet|telephone|dual\s*sim|button\s*phone)\b/i.test(text)
  ) {
    return {
      globalCategory: 'Phones & Tablets',
      inStoreCategory: 'Phones & Communication',
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

  if (primaryGlobal === 'Phones & Tablets' || primaryGlobal === 'Smartwatches & Wearables') {
    storeCategory = 'Phones, Apple & Devices';
  } else if (
    primaryGlobal === 'Laptops & Computers' ||
    primaryGlobal === 'Starlink & Networking' ||
    primaryGlobal === 'Audio, Speakers & Mics' ||
    primaryGlobal === 'Gaming & Consoles' ||
    primaryGlobal === 'Monitors & Displays' ||
    primaryGlobal === 'Tech Accessories & Smart Gadgets' ||
    currentStoreCategory === 'Electronics'
  ) {
    storeCategory = 'Electronics & Gadgets';
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
