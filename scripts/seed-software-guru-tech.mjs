import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';

const { Pool } = pg;

const CATEGORY_MAP = {
  'networking-products': 'Networking Products',
  'security-and-surveillance': 'Security & Surveillance',
  'computers-and-laptops': 'Laptops & Computers',
  'audio-and-music-equipment': 'Audio & Music Equipment',
  'accessories-and-supplies-for-electronics': 'Electronics Accessories',
  'video-games-and-consoles': 'Video Game Consoles',
  'computer-accessories': 'Computer Accessories',
  'power-equipments': 'Power & Inverters',
  'videogames': 'Video Games',
};

const ITEMS = [
  {
    "title": "Starlink Gen3 V4 150ft Ethernet Cable",
    "price": 130000,
    "desc": "It is 150ft long for gen3 v4 starlink",
    "img": "https://pictures-nigeria.jijistatic.net/193444423_MzAwLTQwOC0zOWJjMDU4ZWVl.webp",
    "catSlug": "networking-products",
    "attrs": [
      "Starlink",
      "Brand New"
    ],
    "href": "/calabar-municipal/networking-products/starlink-gen3-v4-150ft-ethernet-cable-Cxu66RRzQCjJQgnUTGiAQ0k5.html?indexPosition=0"
  },
  {
    "title": "Aimb-G1 Ai Smart Glasses",
    "price": 95000,
    "desc": "AIMB-G1 AI Smart Glasses — Capture 1080P videos hands-free, take photos, make calls, listen to music...",
    "img": "https://pictures-nigeria.jijistatic.net/205973823_MzAwLTM4My0yZDg0ODY0ZDFh.webp",
    "catSlug": "security-and-surveillance",
    "attrs": [],
    "href": "/calabar-municipal/security-and-surveillance/aimb-g1-ai-smart-glasses-wBPyPX7Y35kHny8fgfwdAAyZ.html?indexPosition=1"
  },
  {
    "title": "Desktop Computer HP 16GB Intel Core i5 SSD 256GB",
    "price": 595000,
    "desc": "This is a 12th generation laptop and looks like brand new only that it is only laptop and charger.",
    "img": "https://pictures-nigeria.jijistatic.net/206610717_MzAwLTMzNi0xZGQ0ZTliMTJj.webp",
    "catSlug": "computers-and-laptops",
    "attrs": [
      "Used",
      "Intel Core i5",
      "13&quot; / 13.3&quot;"
    ],
    "href": "/calabar-municipal/computers-and-laptops/desktop-computer-hp-16gb-intel-core-i5-ssd-256gb-tP4SpTmdFuLDYbjg80dcdEWL.html?indexPosition=2"
  },
  {
    "title": "Maono Pd200x, USB/XLR Dynamic Microphone",
    "price": 130000,
    "desc": "• microphone type: dynamic capsule\n• polar pattern: cardioid (directional pickup that rejects...",
    "img": "https://pictures-nigeria.jijistatic.net/207930920_MzAwLTQzNy1mZWUyOGQwNzU5.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/maono-pd200x-usb-xlr-dynamic-microphone-cxPlfzHfrDUAiSn7qATnD3zp.html?indexPosition=3"
  },
  {
    "title": "Starlink Gen3 V4",
    "price": 670000,
    "desc": "Brand new sealed, connects 235 devices wirelessly, has 2 lan port and it's ip67 capability makes it...",
    "img": "https://pictures-nigeria.jijistatic.net/179883372_MzAwLTM4Ni0zYzgwZjZlZWZhLTE.webp",
    "catSlug": "networking-products",
    "attrs": [
      "Starlink",
      "Brand New"
    ],
    "href": "/calabar-municipal/networking-products/starlink-gen3-v4-hVboDDLOcZl9tf8fYunW2b7V.html?indexPosition=4"
  },
  {
    "title": "Laptop HP EliteBook 840 G8 16GB Intel Core i7 SSD 256GB",
    "price": 580000,
    "desc": "Direct uk used laptop like brand new",
    "img": "https://pictures-nigeria.jijistatic.net/195275357_MzAwLTM2OS0xYmNiZTg2ZGM2.webp",
    "catSlug": "computers-and-laptops",
    "attrs": [
      "Used",
      "Intel Core i7",
      "14&quot;"
    ],
    "href": "/calabar-municipal/computers-and-laptops/laptop-hp-elitebook-840-g8-16gb-intel-core-i7-ssd-256gb-rw1EScprE1JNsivegk4UVwrh.html?indexPosition=5"
  },
  {
    "title": "Ps5 Controller Game Pad",
    "price": 97000,
    "desc": "This is original sony ps5 controller",
    "img": "https://pictures-nigeria.jijistatic.net/193472705_MzAwLTQzMi0wYWZkNDVmYjVl.webp",
    "catSlug": "accessories-and-supplies-for-electronics",
    "attrs": [],
    "href": "/calabar-municipal/accessories-and-supplies-for-electronics/ps5-controller-game-pad-BQnPy4Jp8rk0VvoNsswNb9K7.html?indexPosition=6"
  },
  {
    "title": "Ldnio Smart Socket",
    "price": 40000,
    "desc": "Smart socket that will allow you pair with your phone and turn it on or off from anywhere in the...",
    "img": "https://pictures-nigeria.jijistatic.net/193880098_MzAwLTQwMC0zNGZhMGYxNWM4.webp",
    "catSlug": "accessories-and-supplies-for-electronics",
    "attrs": [],
    "href": "/calabar-municipal/accessories-and-supplies-for-electronics/ldnio-smart-socket-2J0xSX08y2dFylekQPchGRo0.html?indexPosition=7"
  },
  {
    "title": "D-Link Universal Router",
    "price": 90000,
    "desc": "Any SIM card can work on it and it can be used as an access point",
    "img": "https://pictures-nigeria.jijistatic.net/198904261_MzAwLTM4MS0wNGZhY2FjZDRk.webp",
    "catSlug": "networking-products",
    "attrs": [
      "D-Link",
      "Brand New"
    ],
    "href": "/calabar-municipal/networking-products/d-link-universal-router-uV4oGkM1EANz6VWNBNB7wEoY.html?indexPosition=8"
  },
  {
    "title": "Starlink Gen3 Pipe Adapter Mount",
    "price": 60000,
    "desc": "It is the pivot that helps the gen3 v4 to be installed on the pole easily and navigated to access...",
    "img": "https://pictures-nigeria.jijistatic.net/193443068_MzAwLTQwMC0zZTI5Yzk3MTZi.webp",
    "catSlug": "networking-products",
    "attrs": [
      "Starlink",
      "Brand New"
    ],
    "href": "/calabar-municipal/networking-products/starlink-gen3-pipe-adapter-mount-xalw32J0KpEdF9GLzAtb9Tto.html?indexPosition=9"
  },
  {
    "title": "JBL Boombox 4",
    "price": 690000,
    "desc": "Plays so well and lasts for 34 hours on full charge if play time feature is activated",
    "img": "https://pictures-nigeria.jijistatic.net/193444887_MzAwLTM3OS01MGJjNTAxNmRl.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/jbl-boombox-4-aoMEGDxJxd7OXO40lS64cr5r.html?indexPosition=10"
  },
  {
    "title": "JBL Charge 6",
    "price": 195000,
    "desc": "Plays for 28hrs non-stop and its bass is super",
    "img": "https://pictures-nigeria.jijistatic.net/180122208_MzAwLTI3My0wZmIwYTQ2MzUxLTE.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/jbl-charge-6-p20WlVImwTPKChIo6HGVStRN.html?indexPosition=11"
  },
  {
    "title": "Sony Slim Ps5",
    "price": 1120000,
    "desc": "Its brand new never used before, comes with its power cable, HDMI & 1 controller",
    "img": "https://pictures-nigeria.jijistatic.net/179882031_MzAwLTQwMC1kODllODIzNzEyLTE.webp",
    "catSlug": "video-games-and-consoles",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/video-games-and-consoles/sony-slim-ps5-chu5806OXYzQZFAG2ocuOyZf.html?indexPosition=12"
  },
  {
    "title": "Laptop Stand",
    "price": 9000,
    "desc": "Easy pocketable laptop stand",
    "img": "https://pictures-nigeria.jijistatic.net/193880546_MzAwLTMzMS01M2ZhZTA2OWQz.webp",
    "catSlug": "computer-accessories",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/computer-accessories/laptop-stand-eY2tLbNzQJK0wwK8TE5vIZGn.html?indexPosition=13"
  },
  {
    "title": "Dji Mic Mini",
    "price": 165000,
    "desc": "DJI MIC MINI is a Compact, lightweight, and powerful — the DJI Mic Mini is the perfect wireless...",
    "img": "https://pictures-nigeria.jijistatic.net/197929935_MzAwLTQwMC00YjM0NjQ2Y2Qx.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/dji-mic-mini-z6XuePF3RjDd4bpydCPrm0pL.html?indexPosition=14"
  },
  {
    "title": "JBL Xtreme 5",
    "price": 430000,
    "desc": "JBL XTREME 5 \n• Powerful JBL Pro Sound\n• Up to 28H Playtime \n• IP68 Waterproof & Dustproof \n•...",
    "img": "https://pictures-nigeria.jijistatic.net/206610973_MzAwLTQwMC01NjhjY2E2N2Zj.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/jbl-xtreme-5-uhNDS8dcMYIEa9i64AB8Tjp8.html?indexPosition=15"
  },
  {
    "title": "Green Lion Striker PS5 Controller",
    "price": 80000,
    "desc": "• Compatibility: PlayStation 5, PC, Mac, Android, iOS, and Steam Deck\n• Connectivity: Bluetooth 5.3...",
    "img": "https://pictures-nigeria.jijistatic.net/207928791_MzAwLTM4Ny0xNDJlYWRjNWE2.webp",
    "catSlug": "video-games-and-consoles",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/video-games-and-consoles/green-lion-striker-ps5-controller-CcGdCLBOJcd10zvr8baj90XH.html?indexPosition=16"
  },
  {
    "title": "Ps4 Controller",
    "price": 14000,
    "desc": "This is brand new Sony PS4 controller",
    "img": "https://pictures-nigeria.jijistatic.net/193879655_MzAwLTM5My0wNTkzNDJlNmFm.webp",
    "catSlug": "video-games-and-consoles",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/video-games-and-consoles/ps4-controller-aZoUk6FSjN0unQDL4zxj4D4l.html?indexPosition=17"
  },
  {
    "title": "Onyx Studio 9",
    "price": 290000,
    "desc": "Powerful JBL Pro Sound\n Rich Bass & Clear Audio\n High-Output Stereo Sound\n Bluetooth Wireless\n Easy...",
    "img": "https://pictures-nigeria.jijistatic.net/179883091_MzAwLTM4NS02NjZhMzEwNGRjLTE.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/onyx-studio-9-kyPrkGYrmBHVJnWYh4rHIeE2.html?indexPosition=18"
  },
  {
    "title": "JBL Boombox 3",
    "price": 580000,
    "desc": "Plays for 24hrs nonstop and doesnt need assistance of a DJ with its unique bass and has good...",
    "img": "https://pictures-nigeria.jijistatic.net/179920319_MzAwLTMwOC1hNDc4YzNiNDRiLTE.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/jbl-boombox-3-85Yin5Bysx68qNz1mvNq35Q0.html?indexPosition=19"
  },
  {
    "title": "Microsoft Life Cam Hd-3000",
    "price": 100000,
    "desc": "This is so good for video and photo",
    "img": "https://pictures-nigeria.jijistatic.net/193880586_MzAwLTQwMC0wNTM2YzJkMTA1.webp",
    "catSlug": "computer-accessories",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/computer-accessories/microsoft-life-cam-hd-3000-rt04ptgq0bjUi6EciWO1c4S3.html?indexPosition=0"
  },
  {
    "title": "Crossfire Dual Sim Telephone",
    "price": 35000,
    "desc": "It's a dual SIM telephone, has radio and slot for memory card",
    "img": "https://pictures-nigeria.jijistatic.net/193879882_MzAwLTQyNC0xNjM1YjExYjEx.webp",
    "catSlug": "accessories-and-supplies-for-electronics",
    "attrs": [],
    "href": "/calabar-municipal/accessories-and-supplies-for-electronics/crossfire-dual-sim-telephone-a5GPIFnfzoYDvA4HXmRfkent.html?indexPosition=1"
  },
  {
    "title": "Itel Power Tank",
    "price": 305000,
    "desc": "• Rated Power: 500W continuous output (1000W surge)\n• Battery Capacity: 1000Wh (1kWh) LiFePO4...",
    "img": "https://pictures-nigeria.jijistatic.net/208484655_MzAwLTQwMC1lNmRlNzBhZGVk.webp",
    "catSlug": "power-equipments",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/power-equipments/itel-power-tank-keBEMgt0zzFlLRgGCQlSmOiC.html?indexPosition=2"
  },
  {
    "title": "Playstation 5 Fc27",
    "price": 95000,
    "desc": "• Resolution & Frame Rate: Standard 4K resolution targeting a fluid 60 FPS during gameplay. (Note:...",
    "img": "https://pictures-nigeria.jijistatic.net/207929930_MzAwLTQwMC1mMzYzYjBhZDdi.webp",
    "catSlug": "videogames",
    "attrs": [
      "Sports",
      "Brand New"
    ],
    "href": "/calabar-municipal/videogames/playstation-5-fc27-heSOdrGnkUBrl1fzULNJS24P.html?indexPosition=3"
  },
  {
    "title": "Hollyland Mark M2 Mic",
    "price": 160000,
    "desc": "It's a wireless mic with superb noise cancelling. This is original and it's worth its price",
    "img": "https://pictures-nigeria.jijistatic.net/197432530_MzAwLTM2NC01N2NiNGNjYTE1.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/hollyland-mark-m2-mic-idb9UJP4TSC8tuzonF9HqIkc.html?indexPosition=4"
  },
  {
    "title": "JBL Xtreme 4",
    "price": 375000,
    "desc": "JBL XTREME 4 \n• Powerful JBL Pro Sound \n• Up to 24H Playtime \n• IP67 Waterproof & Dustproof \n•...",
    "img": "https://pictures-nigeria.jijistatic.net/206611914_MzAwLTM5Mi0xNWY5ZDcxNDc2.webp",
    "catSlug": "audio-and-music-equipment",
    "attrs": [
      "Brand New"
    ],
    "href": "/calabar-municipal/audio-and-music-equipment/jbl-xtreme-4-ksTWVfFFzwaF9sEjULRUqeX9.html?indexPosition=5"
  },
  {
    "title": "Starlink Mini",
    "price": 430000,
    "desc": "Its connects 128 devices wirelessly, one LAN PORT expandable and its IP67 capability make its water...",
    "img": "https://pictures-nigeria.jijistatic.net/179895970_MzAwLTM1NC04OTgzMGFiZmZlLTE.webp",
    "catSlug": "networking-products",
    "attrs": [
      "Starlink",
      "Brand New"
    ],
    "href": "/calabar-municipal/networking-products/starlink-mini-Bjhedytgmt6UKoKcI7OA4Dfx.html?indexPosition=6"
  },
  {
    "title": "Logitech C270 Webcam",
    "price": 35000,
    "desc": "It's a good webcam that shoots at 720p and it's very affordable compared to it's quality",
    "img": "https://pictures-nigeria.jijistatic.net/193880394_MzAwLTMwMC02NzhmNTRjMjMx.webp",
    "catSlug": "accessories-and-supplies-for-electronics",
    "attrs": [],
    "href": "/calabar-municipal/accessories-and-supplies-for-electronics/logitech-c270-webcam-fycazbHOZAWLcmpsN6DbEY0d.html?indexPosition=7"
  },
  {
    "title": "Wavlink Ax3000 Hd9",
    "price": 240000,
    "desc": "Best outdoor access point",
    "img": "https://pictures-nigeria.jijistatic.net/205783197_MzAwLTM5Ni1hOGEzODA5OTJj.webp",
    "catSlug": "networking-products",
    "attrs": [
      "Wavlink",
      "Brand New"
    ],
    "href": "/calabar-municipal/networking-products/wavlink-ax3000-hd9-hMd3SdMS8I7zQU31SSwkzIYP.html?indexPosition=8"
  },
  {
    "title": "Laptop HP EliteBook 830 G7 8GB Intel Core i5 SSD 256GB",
    "price": 480000,
    "desc": "Grade a direct uk used, looks like brand new and perfectly working. free charger included",
    "img": "https://pictures-nigeria.jijistatic.net/206378206_MzAwLTQ2Ny0wYWQ0ZWExMDk2.webp",
    "catSlug": "computers-and-laptops",
    "attrs": [
      "Used",
      "Intel Core i5",
      "13&quot; / 13.3&quot;"
    ],
    "href": "/calabar-municipal/computers-and-laptops/laptop-hp-elitebook-830-g7-8gb-intel-core-i5-ssd-256gb-u6dpv0HJhPKoPBDHFVH8dl3I.html?indexPosition=9"
  }
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    const resolveTable = (candidates) => {
      for (const c of candidates) {
        const found = tableNames.find((t) => t.toLowerCase() === c.toLowerCase());
        if (found) return `"${found}"`;
      }
      throw new Error(`Could not find table for candidates: ${candidates.join(', ')}`);
    };

    const T_CITY = resolveTable(['city', 'City']);
    const T_ORG = resolveTable(['organization', 'Organization']);
    const T_LOC = resolveTable(['location', 'Location']);
    const T_LISTING = resolveTable(['discoveryListing', 'DiscoveryListing', 'discovery_listing']);
    const T_SETTINGS = resolveTable(['retailSettings', 'RetailSettings', 'retail_settings']);
    const T_CATEGORY = resolveTable(['retailCategory', 'RetailCategory', 'retail_category']);
    const T_PRODUCT = resolveTable(['retailProduct', 'RetailProduct', 'retail_product']);
    const T_STOCK = resolveTable(['retailLocationStock', 'RetailLocationStock', 'retail_location_stock']);

    console.log('Resolved tables:', {
      T_CITY,
      T_ORG,
      T_LOC,
      T_LISTING,
      T_SETTINGS,
      T_CATEGORY,
      T_PRODUCT,
      T_STOCK,
    });

    await client.query('BEGIN');

    // 1. Find or create Calabar city
    let cityRes = await client.query(
      `SELECT id, name, slug FROM ${T_CITY} WHERE LOWER(slug) = 'calabar' OR LOWER(name) = 'calabar' LIMIT 1`
    );
    let cityId;
    if (cityRes.rows.length > 0) {
      cityId = cityRes.rows[0].id;
      console.log('Found Calabar city:', cityRes.rows[0]);
    } else {
      cityId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ${T_CITY} (id, name, slug, country, state, timezone, currency, "isActive", latitude, longitude)
         VALUES ($1, 'Calabar', 'calabar', 'NG', 'Cross River', 'Africa/Lagos', 'NGN', true, 4.9517, 8.3220)`,
        [cityId]
      );
      console.log('Created Calabar city:', cityId);
    }

    // 2. Upsert Organization: Software Guru Technology
    const orgName = 'Software Guru Technology';
    const orgAddress = 'Ettagbor, 181 Ettagbor Road, Opposite Peace Mass Park, Calabar';
    const orgDesc =
      'A Tech store where original gadgets and accessories meets with expertise. Located at 181 Ettagbor Road, Opposite Peace Mass Park beside former Ecobank Ettagbor Small Gate, Calabar.';
    const orgLogo = 'https://pictures-nigeria.jijistatic.net/193439197_MjAwLTIwMC1hZTBhZDY1MjIz.jpg';

    let orgRes = await client.query(
      `SELECT id FROM ${T_ORG} WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [orgName]
    );
    let orgId;
    if (orgRes.rows.length > 0) {
      orgId = orgRes.rows[0].id;
      await client.query(
        `UPDATE ${T_ORG}
         SET type = 'RETAIL',
             "storeCategory" = 'Electronics',
             description = $2,
             address = $3,
             "logoAssetId" = $4,
             status = 'ACTIVE'
         WHERE id = $1`,
        [orgId, orgDesc, orgAddress, orgLogo]
      );
      console.log('Updated existing Organization:', orgId);
    } else {
      orgId = 'software-guru-tech-calabar';
      await client.query(
        `INSERT INTO ${T_ORG} (id, name, type, "storeCategory", description, address, "logoAssetId", status)
         VALUES ($1, $2, 'RETAIL', 'Electronics', $3, $4, $5, 'ACTIVE')`,
        [orgId, orgName, orgDesc, orgAddress, orgLogo]
      );
      console.log('Created Organization:', orgId);
    }

    // 3. Upsert Location in Ettagbor, Calabar
    let locRes = await client.query(
      `SELECT id FROM ${T_LOC} WHERE "organizationId" = $1 LIMIT 1`,
      [orgId]
    );
    let locationId;
    if (locRes.rows.length > 0) {
      locationId = locRes.rows[0].id;
      await client.query(
        `UPDATE ${T_LOC}
         SET name = 'Ettagbor Showroom (181 Ettagbor Road)',
             address = $2,
             "cityId" = $3,
             latitude = 4.9532,
             longitude = 8.3385
         WHERE id = $1`,
        [locationId, orgAddress, cityId]
      );
      console.log('Updated Location:', locationId);
    } else {
      locationId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ${T_LOC} (id, "organizationId", name, address, "cityId", latitude, longitude)
         VALUES ($1, $2, 'Ettagbor Showroom (181 Ettagbor Road)', $3, $4, 4.9532, 8.3385)`,
        [locationId, orgId, orgAddress, cityId]
      );
      console.log('Created Location:', locationId);
    }

    // 4. Upsert DiscoveryListing with strictly real scraped Jiji data (no demo delivery/ratings)
    const listingMetadata = JSON.stringify({
      isVerified: true,
      neighborhood: 'Ettagbor',
      area: 'Ettagbor',
      workingHours: 'Mon – Sat · 08:00 AM – 06:00 PM',
      landmark: 'Opposite Peace Mass Park beside former Ecobank Ettagbor Small Gate',
      jijiUrl: 'https://jiji.ng/shop/softwaregurutech',
      coverImage: 'https://pictures-nigeria.jijistatic.net/193444887_MzAwLTM3OS01MGJjNTAxNmRl.webp',
      images: [
        orgLogo,
        'https://pictures-nigeria.jijistatic.net/193444887_MzAwLTM3OS01MGJjNTAxNmRl.webp',
        'https://pictures-nigeria.jijistatic.net/179882031_MzAwLTQwMC1kODllODIzNzEyLTE.webp',
        'https://pictures-nigeria.jijistatic.net/179883372_MzAwLTM4Ni0zYzgwZjZlZWZhLTE.webp',
      ],
      aisles: [
        'Audio & Music Equipment',
        'Networking Products',
        'Electronics Accessories',
        'Laptops & Computers',
        'Video Game Consoles',
        'Computer Accessories',
        'Power & Inverters',
        'Security & Surveillance',
      ],
    });

    let listRes = await client.query(
      `SELECT id FROM ${T_LISTING} WHERE "organizationId" = $1 LIMIT 1`,
      [orgId]
    );
    if (listRes.rows.length > 0) {
      await client.query(
        `UPDATE ${T_LISTING}
         SET "locationId" = $2,
             "cityId" = $3,
             vertical = 'RETAIL',
             slug = 'software-guru-tech-calabar',
             title = $4,
             description = $5,
             "coverAssetId" = $6,
             "isActive" = true,
             metadata = $7
         WHERE id = $1`,
        [listRes.rows[0].id, locationId, cityId, orgName, orgDesc, orgLogo, listingMetadata]
      );
      console.log('Updated DiscoveryListing:', listRes.rows[0].id);
    } else {
      const listingId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ${T_LISTING} (id, "organizationId", "locationId", "cityId", vertical, slug, title, description, "coverAssetId", "isActive", metadata)
         VALUES ($1, $2, $3, $4, 'RETAIL', 'software-guru-tech-calabar', $5, $6, $7, true, $8)`,
        [listingId, orgId, locationId, cityId, orgName, orgDesc, orgLogo, listingMetadata]
      );
      console.log('Created DiscoveryListing:', listingId);
    }

    // 5. Upsert RetailSettings for the store
    let settingsRes = await client.query(
      `SELECT id FROM ${T_SETTINGS} WHERE "organizationId" = $1 LIMIT 1`,
      [orgId]
    );
    if (settingsRes.rows.length === 0) {
      await client.query(
        `INSERT INTO ${T_SETTINGS} (id, "organizationId", "storeName", "storeAddress", "currencySymbol", country, "hasStoreInfo", "hasProducts")
         VALUES ($1, $2, $3, $4, '₦', 'NG', true, true)`,
        [crypto.randomUUID(), orgId, orgName, orgAddress]
      );
    }

    // 6. Upsert RetailCategories
    const categoryIdBySlug = new Map();
    for (const [slug, catName] of Object.entries(CATEGORY_MAP)) {
      let catRes = await client.query(
        `SELECT id FROM ${T_CATEGORY} WHERE "organizationId" = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [orgId, catName]
      );
      let catId;
      if (catRes.rows.length > 0) {
        catId = catRes.rows[0].id;
      } else {
        catId = crypto.randomUUID();
        await client.query(
          `INSERT INTO ${T_CATEGORY} (id, "organizationId", name, description)
           VALUES ($1, $2, $3, $4)`,
          [catId, orgId, catName, `${catName} at Software Guru Technology, Ettagbor Calabar`]
        );
      }
      categoryIdBySlug.set(slug, { id: catId, name: catName });
    }

    // 7. Upsert all 30 RetailProducts + RetailLocationStock
    let insertedProducts = 0;
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      const catInfo = categoryIdBySlug.get(item.catSlug) || {
        id: null,
        name: 'Electronics',
      };
      const sku = `SGT-CAL-${String(i + 1).padStart(3, '0')}`;
      const stockQty = item.price >= 500000 ? 4 : item.price >= 100000 ? 8 : 15;
      const fullDesc = item.attrs?.length
        ? `${item.desc} (${item.attrs.join(' • ')})`
        : item.desc;

      let prodRes = await client.query(
        `SELECT id FROM ${T_PRODUCT} WHERE "organizationId" = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [orgId, item.title]
      );
      let productId;
      if (prodRes.rows.length > 0) {
        productId = prodRes.rows[0].id;
        await client.query(
          `UPDATE ${T_PRODUCT}
           SET description = $2,
               sku = $3,
               price = $4,
               "stockQuantity" = $5,
               "lowStockLevel" = 2,
               "imageAssetId" = $6,
               "globalCategory" = $7,
               "categoryId" = $8
           WHERE id = $1`,
          [productId, fullDesc, sku, item.price, stockQty, item.img, catInfo.name, catInfo.id]
        );
      } else {
        productId = crypto.randomUUID();
        await client.query(
          `INSERT INTO ${T_PRODUCT} (id, "organizationId", name, description, sku, price, "stockQuantity", "lowStockLevel", "isWeighed", unit, "imageAssetId", "globalCategory", "categoryId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 2, false, 'ea', $8, $9, $10)`,
          [productId, orgId, item.title, fullDesc, sku, item.price, stockQty, item.img, catInfo.name, catInfo.id]
        );
      }

      // Upsert RetailLocationStock
      let stockRes = await client.query(
        `SELECT id FROM ${T_STOCK} WHERE "locationId" = $1 AND "productId" = $2 LIMIT 1`,
        [locationId, productId]
      );
      if (stockRes.rows.length > 0) {
        await client.query(
          `UPDATE ${T_STOCK} SET "stockQuantity" = $2 WHERE id = $1`,
          [stockRes.rows[0].id, stockQty]
        );
      } else {
        await client.query(
          `INSERT INTO ${T_STOCK} (id, "organizationId", "locationId", "productId", "stockQuantity", "lowStockLevel")
           VALUES ($1, $2, $3, $4, $5, 2)`,
          [crypto.randomUUID(), orgId, locationId, productId, stockQty]
        );
      }
      insertedProducts++;
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded Software Guru Technology (${orgId}) with ${insertedProducts} products in Ettagbor, Calabar!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding Software Guru Technology:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
