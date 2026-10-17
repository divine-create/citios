import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

const CALABAR_SERVICES_DATA = [
  // 1. Home & Cleaning / Laundry
  {
    orgId: 'service-centelleo-calabar',
    name: 'Centelleo Professional Cleaning & Laundry',
    description: "Calabar's premier residential & commercial cleaning and garment care facility. Specializing in deep home sanitation, post-construction cleaning, and executive laundry.",
    address: 'Country Home Resort, Plot 3, South Industrial Layout, Ekorinim, Calabar',
    phone: '+2348112417171',
    whatsapp: '2348112417171',
    latitude: 4.9821,
    longitude: 8.3342,
    items: [
      {
        name: '2-Bedroom Deep Home Cleaning & Sanitation',
        description: 'Comprehensive top-to-bottom scrub, kitchen degreasing, bathroom descaling, window washing, and disinfection.',
        price: 25000,
        durationMinutes: 240,
      },
      {
        name: 'Post-Construction / Move-In Deep Cleaning',
        description: 'Complete removal of paint splatters, cement dust, deep floor scrubbing, and sanitization for newly completed or renovated properties.',
        price: 60000,
        durationMinutes: 360,
      },
      {
        name: 'Upholstery & Mattress Deep Steam Wash',
        description: 'Professional high-pressure steam extraction and allergen removal for 3-seater sofa or king-size mattress.',
        price: 18000,
        durationMinutes: 90,
      },
    ],
  },
  {
    orgId: 'service-presto-calabar',
    name: 'Presto Laundry & Dry Cleaning',
    description: 'Expert fabric care and dry cleaning in Parliamentary Extension. Fastidious care for suits, traditional agbadas, wedding dresses, and bedding.',
    address: 'Block B, Suites 4 & 5, Amabeya Plaza, Plot 1, Parliamentary Extension, Calabar',
    phone: '+2348105849552',
    whatsapp: '2348105849552',
    latitude: 4.9765,
    longitude: 8.3512,
    items: [
      {
        name: 'Executive 3-Piece Suit & Agbada Dry Cleaning',
        description: 'Delicate stain treatment, dry cleaning, and hand-press finishing for premium native wear and formal corporate suits.',
        price: 5500,
        durationMinutes: 120,
      },
      {
        name: 'Executive Shirt Wash & Crisp Steam Press (5-Pack)',
        description: 'Collar and cuff spot treatment, gentle wash, starch option, and crisp steam press on hangers.',
        price: 6000,
        durationMinutes: 90,
      },
      {
        name: 'Duvet & Heavy Comforter Deep Wash',
        description: 'Antibacterial laundering, gentle drying, and dust-proof packaging for double or king-size duvets.',
        price: 7000,
        durationMinutes: 180,
      },
    ],
  },
  {
    orgId: 'service-springforth-calabar',
    name: 'Springforth Laundromart',
    description: 'Modern laundromat services in Essien Town providing affordable, rapid wash-dry-fold cycles and doorstep delivery.',
    address: '21 Spring Road, Essien Town, Calabar',
    phone: '+2348037264419',
    whatsapp: '2348037264419',
    latitude: 4.9654,
    longitude: 8.3378,
    items: [
      {
        name: 'Everyday Wash, Dry & Fold Basket (10kg)',
        description: 'Complete detergent wash, fabric softener rinse, machine tumble-dry, and neat fold for up to 10kg everyday clothes.',
        price: 8000,
        durationMinutes: 120,
      },
      {
        name: 'Bed Linen & Heavy Curtain Express Laundry',
        description: 'Thorough cleaning and press for household window drapes, bedsheets, and pillow covers.',
        price: 12000,
        durationMinutes: 180,
      },
    ],
  },

  // 2. Tech, Solar & Security
  {
    orgId: 'service-tecil-calabar',
    name: 'TECIL Solar Engineering',
    description: 'Licensed solar engineering, hybrid inverter design, lithium battery storage systems, and renewable energy consulting on Marian Road.',
    address: 'Macson Plaza, 89 Ndidem Usang Iso Road, Marian, Calabar',
    phone: '+2348037135545',
    whatsapp: '2348037135545',
    latitude: 4.9682,
    longitude: 8.3421,
    items: [
      {
        name: 'Residential Solar Inverter Health Check & Inspection',
        description: 'Comprehensive audit of inverter output, panel voltage, battery state of charge (SoC), and wiring safety inspection.',
        price: 15000,
        durationMinutes: 90,
      },
      {
        name: 'Hybrid Solar Inverter Installation & Commissioning',
        description: 'Professional mounting and AC/DC wiring of 2.5kVA - 5kVA hybrid solar inverters with surge and lightning protection.',
        price: 75000,
        durationMinutes: 300,
      },
      {
        name: 'Solar Panel Array Deep Cleaning & Performance Tuning',
        description: 'Removal of dust, grime, and bird droppings with non-abrasive deionized wash to restore up to 25% lost generation efficiency.',
        price: 20000,
        durationMinutes: 120,
      },
    ],
  },
  {
    orgId: 'service-powersource-calabar',
    name: 'POWERSOURCE Energyvaults Ltd',
    description: 'Smart energy storage, solar inverters, lithium iron phosphate (LiFePO4) battery installations, and energy audits in Calabar.',
    address: '68 Marian Road, opposite Faith Foundation Clinic, Calabar',
    phone: '+2347034493941',
    whatsapp: '2347034493941',
    latitude: 4.9669,
    longitude: 8.3411,
    items: [
      {
        name: 'Home Energy Load Audit & Solar System Sizing',
        description: 'Precision measurement of household appliance power consumption to design the optimal battery and inverter setup.',
        price: 10000,
        durationMinutes: 60,
      },
      {
        name: 'Lithium Battery Bank Setup & BMS Configuration',
        description: 'Professional rack installation, battery management system (BMS) communication setup, and balance charging.',
        price: 45000,
        durationMinutes: 180,
      },
    ],
  },
  {
    orgId: 'service-channel-systems-calabar',
    name: 'Channel Systems Security & Tech',
    description: 'Full-service security engineering: IP/analogue CCTV surveillance, solar-powered 4G cameras, and smart access control.',
    address: 'Marian Road, Leopard Town, Calabar',
    phone: '+2348104751192',
    whatsapp: '2348104751192',
    latitude: 4.9712,
    longitude: 8.3445,
    items: [
      {
        name: '4-Channel HD CCTV Camera Home Installation',
        description: 'Full installation of 4 high-definition night-vision cameras, cabling, DVR/NVR configuration, and mobile phone live view setup.',
        price: 50000,
        durationMinutes: 360,
      },
      {
        name: 'Solar-Powered 4G Wireless Security Camera Setup',
        description: 'Installation of autonomous solar-powered outdoor security camera with motion detection and SIM card cloud access.',
        price: 25000,
        durationMinutes: 120,
      },
    ],
  },

  // 3. Automotive & Power Generators
  {
    orgId: 'service-raphbetto-calabar',
    name: 'Raphbetto Auto World & Electrical',
    description: 'Expert automotive technicians specializing in auto electrical diagnostics, computer key programming, wiring, and vehicle maintenance.',
    address: 'Plot 218 Etta Agbo Layout, Calabar',
    phone: '+2348076004045',
    whatsapp: '2348076004045',
    latitude: 4.9583,
    longitude: 8.3392,
    items: [
      {
        name: 'Computerized OBD2 Engine Diagnostic Scan & Report',
        description: 'Full computer diagnostic scan for check-engine lights, transmission errors, ABS, and sensor telemetry analysis.',
        price: 10000,
        durationMinutes: 45,
      },
      {
        name: 'Auto Electrical Rewiring & Alternator Servicing',
        description: 'Troubleshooting electrical battery drain, starter motor overhaul, and alternator charge testing.',
        price: 18000,
        durationMinutes: 120,
      },
    ],
  },
  {
    orgId: 'service-cybaco-calabar',
    name: 'Cybaco Auto Air-Conditioning Specialists',
    description: 'Long-standing automotive climate control center on Marian Road. AC compressor repair, gas refills, and leak diagnostics.',
    address: 'No. 4 Marian Road, Calabar',
    phone: '+2348061208714',
    whatsapp: '2348061208714',
    latitude: 4.9601,
    longitude: 8.3375,
    items: [
      {
        name: 'Car AC Refrigerant Gas Refill & Vacuum Leak Testing',
        description: 'System evacuation, nitrogen pressure leak check, compressor oil top-up, and fresh R134a refrigerant charging.',
        price: 15000,
        durationMinutes: 60,
      },
      {
        name: 'Car AC Compressor Overhaul & Condenser Coil Flush',
        description: 'Comprehensive disassembly, seal replacement, pulley bearing check, and high-pressure chemical flushing of cooling coils.',
        price: 35000,
        durationMinutes: 180,
      },
    ],
  },
  {
    orgId: 'service-calabar-gen-calabar',
    name: 'Calabar Plant & Gen Mechanics Network',
    description: 'Vetted mobile generator technicians covering petrol generators, residential soundproof sets, and industrial diesel plants.',
    address: 'MCC Road & Etta Agbor Junction, Calabar',
    phone: '+2348067850182',
    whatsapp: '2348067850182',
    latitude: 4.9625,
    longitude: 8.3418,
    items: [
      {
        name: 'Domestic Generator Routine Service & Tune-Up',
        description: 'Engine oil replacement, spark plug change, carburetor cleansing, valve adjustment, and load test (2.5kVA - 10kVA).',
        price: 8500,
        durationMinutes: 60,
      },
      {
        name: 'Diesel Plant Preventive Maintenance (Perkins/Mikano)',
        description: 'Full service of industrial diesel generators: primary and secondary fuel filter change, oil filter, air cleaner, and ATS check.',
        price: 40000,
        durationMinutes: 180,
      },
    ],
  },

  // 4. Trades & Home Repair (Plumbing, Electrical, AC)
  {
    orgId: 'service-cr-plumbers-calabar',
    name: 'Cross River Pro Plumbers',
    description: 'Licensed plumbers covering borehole pump installations, overhead water tanks, PPR hot/cold piping, and bathroom renovations.',
    address: 'Etta Agbor & State Housing Estate, Calabar',
    phone: '+2348067095839',
    whatsapp: '2348067095839',
    latitude: 4.9641,
    longitude: 8.3402,
    items: [
      {
        name: 'Water Borehole Submersible Pump Repair & Inspection',
        description: 'Electrical and mechanical check of borehole pump, control box testing, capacitor replacement, and pressure restoration.',
        price: 18000,
        durationMinutes: 120,
      },
      {
        name: 'Overhead Tank Plumbing & Automatic Float Valve Fix',
        description: 'Piping reconnection, float switch replacement to prevent overflow, and tank wash down.',
        price: 15000,
        durationMinutes: 90,
      },
      {
        name: 'Drainage & Kitchen Sink Pipe Unclogging',
        description: 'Mechanical snake clearing of blocked waste pipes, grease trap cleaning, and odor elimination.',
        price: 12000,
        durationMinutes: 60,
      },
    ],
  },
  {
    orgId: 'service-calabar-hvac-calabar',
    name: 'Calabar HVAC & Air-Conditioning Pros',
    description: 'Residential and commercial air conditioning technicians for split units, standing packages, and central HVAC systems.',
    address: 'Diamond Hill & Marian Road, Calabar',
    phone: '+2348076878406',
    whatsapp: '2348076878406',
    latitude: 4.9735,
    longitude: 8.3312,
    items: [
      {
        name: 'Split Unit AC Deep Chemical Wash & Filter Servicing',
        description: 'Indoor coil high-pressure antibacterial foam wash, outdoor condenser blowout, drain pan flush, and air quality restoration.',
        price: 10000,
        durationMinutes: 60,
      },
      {
        name: 'Inverter AC Gas Recharging (R410a / R32)',
        description: 'High-pressure vacuum check and precise electronic scale charging of eco-friendly inverter AC refrigerant.',
        price: 14000,
        durationMinutes: 75,
      },
      {
        name: 'New Split Unit AC Dismantling & Relocation',
        description: 'Safe refrigerant pump-down, wall bracket unmounting, transport prep, and reinstalling in new room or apartment.',
        price: 22000,
        durationMinutes: 150,
      },
    ],
  },
  {
    orgId: 'service-akim-electrical-calabar',
    name: 'Akim Electrical & Home Wiring',
    description: 'Certified electrical contractors for domestic conduit wiring, distribution board balancing, and changeover automation.',
    address: '83 IBB Way, Akim Qua Town, Calabar',
    phone: '+2348122006796',
    whatsapp: '2348122006796',
    latitude: 4.9592,
    longitude: 8.3381,
    items: [
      {
        name: 'DB Box & Circuit Breaker Fault Troubleshooting',
        description: 'Diagnostic tracing of tripping breakers, phase balancing, neutral leak repair, and earth leakage protection test.',
        price: 12000,
        durationMinutes: 90,
      },
      {
        name: 'Prepaid Meter Transfer Switch & Surge Protector Setup',
        description: 'Installation of heavy-duty automatic changeover switch and whole-home voltage surge protector.',
        price: 15000,
        durationMinutes: 120,
      },
    ],
  },

  // 5. Beauty, Grooming & Wellness Spas
  {
    orgId: 'service-hogis-spa-calabar',
    name: 'Hogis Spa & Wellness',
    description: 'Luxury hospitality spa offering certified massage therapies, body scrubs, aromatherapy, and holistic relaxation treatments.',
    address: 'Hogis Luxury Suites, State Housing Estate, Calabar',
    phone: '+2348139577321',
    whatsapp: '2348099903335',
    latitude: 4.9658,
    longitude: 8.3395,
    items: [
      {
        name: '60-Minute Swedish Relaxation Full Body Massage',
        description: 'Gentle, therapeutic long strokes with warm essential oils to release physical tension and calm the nervous system.',
        price: 22000,
        durationMinutes: 60,
      },
      {
        name: 'Deep Tissue Stress Relief Massage',
        description: 'Targeted high-pressure muscle therapy focused on chronic shoulder, neck, and lower back tightness.',
        price: 28000,
        durationMinutes: 75,
      },
      {
        name: 'Full Body Botanical Exfoliation & Herbal Scrub',
        description: 'Natural sea salt and herbal scrub to remove dead skin cells, followed by a warm botanical oil hydration wrap.',
        price: 18000,
        durationMinutes: 60,
      },
    ],
  },
  {
    orgId: 'service-styleplus-calabar',
    name: 'Styleplus Unisex Saloon and Spa',
    description: 'Full-service grooming hub in Akim Qua Town providing precision cuts, locks styling, pedicures, and beauty therapies.',
    address: '83 IBB Way, by Etta Agbor Roundabout, Akim Qua Town, Calabar',
    phone: '+2348122006796',
    whatsapp: '2347026386700',
    latitude: 4.9587,
    longitude: 8.3379,
    items: [
      {
        name: 'Executive Haircut, Beard Sculpting & Hot Towel Finish',
        description: 'Precision clipper fade, razor edge-up, organic beard balm conditioning, and relaxing eucalyptus hot towel treatment.',
        price: 5000,
        durationMinutes: 45,
      },
      {
        name: 'Dreadlocks Retwist & Deep Conditioning Treatment',
        description: 'Shampoo wash, clarifying scalp cleanse, palm-roll retwist with natural beeswax, and hooded dryer lock-in.',
        price: 15000,
        durationMinutes: 120,
      },
      {
        name: 'Deluxe Pedicure & Foot Reflexology Massage',
        description: 'Warm sea-salt foot soak, cuticle grooming, heel callus exfoliation, and relaxing foot/calf pressure-point massage.',
        price: 10000,
        durationMinutes: 60,
      },
    ],
  },
  {
    orgId: 'service-efixalon-calabar',
    name: 'Efixalon Barbing Salon & Beauty Clinic',
    description: 'Premier grooming and aesthetic studio on Diamond Hill. Specializing in luxury men cuts, custom wigs, and brow aesthetics.',
    address: '17 Diamond Hill, Calabar',
    phone: '+2348110753358',
    whatsapp: '2348110753358',
    latitude: 4.9721,
    longitude: 8.3298,
    items: [
      {
        name: 'Classic Signature Fade & Charcoal Face Scrub',
        description: 'Custom fade haircut, line-up, clarifying activated-charcoal face mask, and beard grooming.',
        price: 4500,
        durationMinutes: 45,
      },
      {
        name: 'Lace Front Wig Installation & Custom Styling',
        description: 'Skin-melt lace adhesive application, baby-hair customization, heat styling, and secure band fitting.',
        price: 18000,
        durationMinutes: 150,
      },
    ],
  },

  // 6. Health, Diagnostics & Dental
  {
    orgId: 'service-destinee-calabar',
    name: 'Destinee Medical Diagnostics (DMDL)',
    description: 'State-of-the-art pathology, microbiology, cancer screening, and ultrasound diagnostic laboratory in Calabar.',
    address: 'Ette Agbo, opposite Peace Mass Transit, Calabar',
    phone: '+2348106636359',
    whatsapp: '2348037202556',
    latitude: 4.9568,
    longitude: 8.3412,
    items: [
      {
        name: 'Comprehensive Wellness Blood Panel (Full Checkup)',
        description: 'Complete blood count (CBC), lipid profile, fasting blood glucose, liver function tests (LFT), and kidney function (RFT).',
        price: 20000,
        durationMinutes: 45,
      },
      {
        name: 'High-Resolution Abdominal & Pelvic Ultrasound Scan',
        description: 'Detailed 2D/3D sonography of internal organs (liver, gallbladder, kidneys, spleen, uterus/prostate) with instant report.',
        price: 12000,
        durationMinutes: 30,
      },
      {
        name: 'Phlebotomy Home Sample Collection Service',
        description: 'Certified medical phlebotomist house visit for hygienic blood, urine, or swab sample collection with courier to the lab.',
        price: 7500,
        durationMinutes: 45,
      },
    ],
  },
  {
    orgId: 'service-arubah-calabar',
    name: 'Arubah Specialist Hospital & Diagnostics',
    description: 'Full-service multi-specialty private clinic and diagnostics center offering private consultations and emergency care.',
    address: 'Nsefik Eyo Close, off Marian Road, Calabar',
    phone: '+2348113333822',
    whatsapp: '2348117333332',
    latitude: 4.9678,
    longitude: 8.3435,
    items: [
      {
        name: 'Specialist Physician Consultation (Cardio / Internal Med)',
        description: 'Direct in-person clinical consultation with a consultant specialist, thorough history review, and personalized care plan.',
        price: 15000,
        durationMinutes: 45,
      },
      {
        name: 'General Medical Consultation & Vitals Assessment',
        description: 'Doctor examination, BP, blood sugar, BMI, oxygen saturation assessment, and medical prescription.',
        price: 7000,
        durationMinutes: 30,
      },
    ],
  },
  {
    orgId: 'service-vincitore-calabar',
    name: 'Vincitore Dental Clinic',
    description: 'Professional dental clinic providing preventive oral care, scaling & polishing, teeth whitening, and restorative dentistry.',
    address: 'Marian & Akim Layout, Calabar',
    phone: '+2347053437136',
    whatsapp: '2347053437136',
    latitude: 4.9632,
    longitude: 8.3389,
    items: [
      {
        name: 'Teeth Scaling & Polishing (Complete Dental Cleaning)',
        description: 'Ultrasonic removal of hardened dental tartar/calculus, stain removal, fluoridation, and fresh breath polish.',
        price: 18000,
        durationMinutes: 45,
      },
      {
        name: 'Comprehensive Dental Examination & Oral X-Ray',
        description: 'Full intraoral examination for cavities, gum disease check, bite evaluation, and preventative oral counseling.',
        price: 8000,
        durationMinutes: 30,
      },
    ],
  },
];

async function seedCalabarServices() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log('🚀 Starting Calabar Services seed transaction...');
    
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
    const T_CONTACT = resolveTable(['organizationContactPoint', 'OrganizationContactPoint', 'organization_contact_point', 'contactPoint', 'ContactPoint']);
    const T_SERVICE_ITEM = resolveTable(['serviceCatalogItem', 'ServiceCatalogItem', 'service_catalog_item', 'serviceItem', 'ServiceItem']);

    await client.query('BEGIN');

    // 1. Get Calabar City ID
    const cityRes = await client.query(
      `SELECT id, name, slug FROM ${T_CITY} WHERE LOWER(slug) = 'calabar' OR LOWER(name) = 'calabar' LIMIT 1`
    );

    if (cityRes.rows.length === 0) {
      throw new Error('City "Calabar" not found in database. Please run bootstrap first.');
    }

    const cityId = cityRes.rows[0].id;
    console.log(`📍 Found Anchor City: ${cityRes.rows[0].name} (${cityId})`);

    let seededOrgs = 0;
    let seededServices = 0;

    for (const data of CALABAR_SERVICES_DATA) {
      // 2. Upsert Organization
      const existingOrg = await client.query(
        `SELECT id FROM ${T_ORG} WHERE id = $1 LIMIT 1`,
        [data.orgId]
      );

      if (existingOrg.rows.length > 0) {
        await client.query(
          `UPDATE ${T_ORG}
           SET name = $2,
               type = 'SERVICES',
               description = $3,
               address = $4,
               status = 'ACTIVE'
           WHERE id = $1`,
          [data.orgId, data.name, data.description, data.address]
        );
      } else {
        await client.query(
          `INSERT INTO ${T_ORG} (id, name, type, description, address, status)
           VALUES ($1, $2, 'SERVICES', $3, $4, 'ACTIVE')`,
          [data.orgId, data.name, data.description, data.address]
        );
      }

      // 3. Upsert Primary Location in Calabar
      const locRes = await client.query(
        `SELECT id FROM ${T_LOC} WHERE "organizationId" = $1 LIMIT 1`,
        [data.orgId]
      );

      let locationId;
      if (locRes.rows.length > 0) {
        locationId = locRes.rows[0].id;
        await client.query(
          `UPDATE ${T_LOC}
           SET name = $2,
               address = $3,
               "cityId" = $4,
               latitude = $5,
               longitude = $6
           WHERE id = $1`,
          [locationId, `${data.name} Hub`, data.address, cityId, data.latitude, data.longitude]
        );
      } else {
        locationId = crypto.randomUUID();
        await client.query(
          `INSERT INTO ${T_LOC} (id, "organizationId", name, address, "cityId", latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [locationId, data.orgId, `${data.name} Hub`, data.address, cityId, data.latitude, data.longitude]
        );
      }

      // 4. Upsert Contact Points (Phone and WhatsApp)
      if (data.phone) {
        const phoneRes = await client.query(
          `SELECT id FROM ${T_CONTACT} WHERE "organizationId" = $1 AND type = 'PHONE' LIMIT 1`,
          [data.orgId]
        );
        if (phoneRes.rows.length > 0) {
          await client.query(
            `UPDATE ${T_CONTACT} SET value = $2, "isPrimary" = true, "isVerified" = true WHERE id = $1`,
            [phoneRes.rows[0].id, data.phone]
          );
        } else {
          await client.query(
            `INSERT INTO ${T_CONTACT} (id, "organizationId", type, value, "isPrimary", "isVerified")
             VALUES ($1, $2, 'PHONE', $3, true, true)`,
            [crypto.randomUUID(), data.orgId, data.phone]
          );
        }
      }

      if (data.whatsapp) {
        const waRes = await client.query(
          `SELECT id FROM ${T_CONTACT} WHERE "organizationId" = $1 AND type = 'WHATSAPP' LIMIT 1`,
          [data.orgId]
        );
        if (waRes.rows.length > 0) {
          await client.query(
            `UPDATE ${T_CONTACT} SET value = $2, "isPrimary" = false, "isVerified" = true WHERE id = $1`,
            [waRes.rows[0].id, data.whatsapp]
          );
        } else {
          await client.query(
            `INSERT INTO ${T_CONTACT} (id, "organizationId", type, value, "isPrimary", "isVerified")
             VALUES ($1, $2, 'WHATSAPP', $3, false, true)`,
            [crypto.randomUUID(), data.orgId, data.whatsapp]
          );
        }
      }

      // 5. Clean & insert ServiceCatalogItems
      await client.query(
        `DELETE FROM ${T_SERVICE_ITEM} WHERE "organizationId" = $1`,
        [data.orgId]
      );

      for (const item of data.items) {
        const itemId = crypto.randomUUID();
        await client.query(
          `INSERT INTO ${T_SERVICE_ITEM} (id, "organizationId", name, description, price, "durationMinutes", "isActive")
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [itemId, data.orgId, item.name, item.description, item.price, item.durationMinutes]
        );
        seededServices++;
      }

      seededOrgs++;
      console.log(`✅ [${seededOrgs}/${CALABAR_SERVICES_DATA.length}] ${data.name} (${data.items.length} services seeded)`);
    }

    await client.query('COMMIT');
    console.log(`\n🎉 SEED COMPLETE!`);
    console.log(`✨ Total Organizations Seeded: ${seededOrgs}`);
    console.log(`✨ Total Bookable Services Seeded: ${seededServices}`);
    console.log(`📍 City: Calabar, Cross River State`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding Calabar services:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedCalabarServices();
