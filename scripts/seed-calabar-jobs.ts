import { db } from '../src/prisma/db';

interface SeedJobDef {
  orgName: string;
  orgType:
    | 'GOVERNMENT'
    | 'SCHOOL'
    | 'HEALTHCARE'
    | 'RETAIL'
    | 'RESTAURANT'
    | 'REAL_ESTATE'
    | 'SERVICES'
    | 'LOGISTICS'
    | 'HOTEL'
    | 'EVENT_ORGANIZER'
    | 'PUBLISHER'
    | 'PHARMACY';
  orgDescription: string;
  orgAddress: string;
  title: string;
  category:
    | 'Banking & Finance'
    | 'Sales & Marketing'
    | 'Engineering & Manufacturing'
    | 'Healthcare & Pharma'
    | 'Hospitality & Food'
    | 'Tech & Media'
    | 'Logistics & Agro'
    | 'Government & NGO';
  type: 'FULL_TIME' | 'HYBRID' | 'TRAINEE' | 'CONTRACT';
  pay: string;
  area: string;
  summary: string;
  requirements: string[];
  applyUrl: string;
}

const CALABAR_JOBS: SeedJobDef[] = [
  // 1. Engineering & Manufacturing
  {
    orgName: 'Qualis Business Support Services Ltd (Pharma Manufacturing Client)',
    orgType: 'PHARMACY',
    orgDescription: 'Executive recruitment and business support partner for pharmaceutical manufacturing operations in Cross River State.',
    orgAddress: 'Calabar Industrial Layout, Calabar',
    title: 'Managing Director (Pharmaceutical Manufacturing)',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: '₦300,000 – ₦350,000 / mo',
    area: 'Calabar Municipality, Cross River',
    summary:
      'Provide strategic leadership, regulatory oversight, and full operational P&L management for a pharmaceutical manufacturing facility in Calabar.',
    requirements: [
      'B.Pharm, B.Sc in Pharmacy, or related scientific discipline (MBA desirable).',
      'Minimum of 15 years progressive experience, with at least 8 years at a senior executive level in pharmaceutical manufacturing.',
      'Strong command of NAFDAC/PCN regulatory standards and cGMP plant operations.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975549/managing-director-at-a-leading-pharmaceutical-manu.html',
  },
  {
    orgName: 'Wartsila Marine and Power Services Nigeria Limited',
    orgType: 'SERVICES',
    orgDescription: 'Global leader in innovative technologies and lifecycle solutions for the marine and energy markets operating power plant infrastructure in Calabar.',
    orgAddress: 'Calabar Free Trade Zone / Industrial Axis, Calabar',
    title: 'Plant Operator',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'EPZ / Industrial Axis, Calabar',
    summary:
      'Operate and monitor power generation plant equipment in Calabar, ensuring safe, reliable, and optimal thermal/electrical output during shift operations.',
    requirements: [
      'B.Eng or B.Tech in Mechanical, Electrical, or Mechatronics Engineering.',
      'At least 1+ year of relevant industrial or power plant operations experience.',
      'Strong troubleshooting skills and adherence to HSE protocols.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/972085/plant-operator-at-wartsila-marine-and-power-servic.html',
  },
  {
    orgName: 'Flour Mills of Nigeria Plc (Niger Mills Calabar)',
    orgType: 'SERVICES',
    orgDescription: 'Leading Nigerian food and agro-allied group operating Niger Mills on Murtala Mohammed Highway, Calabar.',
    orgAddress: 'Murtala Mohammed Highway, Calabar',
    title: 'Laboratory Assistant – Niger Mills, Calabar',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Murtala Mohammed Hwy, Calabar',
    summary:
      'Assist the Quality Control Manager at Niger Mills Calabar in verifying and examining raw grains, in-process mill streams, and finished flour products against quality specifications.',
    requirements: [
      'OND / HND / B.Sc in Food Science & Technology, Biochemistry, Industrial Chemistry, or Science Lab Technology.',
      'Experience in proximate analysis, moisture/protein testing, and quality assurance documentation.',
      'Ability to work shifts in a fast-paced flour milling environment.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/laboratory-assistant-niger-mills-calabar-flour-mills-of-nigeria-plc',
  },
  {
    orgName: 'HBM Nigeria Plc (Lafarge Mfamosing Plant)',
    orgType: 'SERVICES',
    orgDescription: 'Major industrial cement and building solutions manufacturer operating the Mfamosing integrated plant in the Calabar/Akamkpa axis.',
    orgAddress: 'Mfamosing / Akamkpa, Calabar Axis',
    title: 'Process Engineer & Assistant Production Manager',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Mfamosing / Akamkpa, Calabar Axis',
    summary:
      'Optimize kiln, raw mill, and cement mill process parameters to maximize throughput, thermal efficiency, and clinker quality at the Mfamosing plant.',
    requirements: [
      'B.Eng / B.Sc in Chemical, Mechanical, or Process Engineering.',
      'Minimum of 3–5 years continuous process manufacturing experience (cement or heavy industry preferred).',
      'Strong analytical skills in mass/heat balance and process control systems.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/971312/hbm-nigeria-plc-formerly-lafarge-job-recruitment-5.html',
  },
  {
    orgName: 'HBM Nigeria Plc (Lafarge Mfamosing Plant)',
    orgType: 'SERVICES',
    orgDescription: 'Major industrial cement and building solutions manufacturer operating the Mfamosing integrated plant in the Calabar/Akamkpa axis.',
    orgAddress: 'Mfamosing / Akamkpa, Calabar Axis',
    title: 'Assistant Electrical & Instrumentation Manager',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Mfamosing / Akamkpa, Calabar Axis',
    summary:
      'Lead electrical and instrumentation maintenance reliability across high-voltage drives, PLCs, and plant automation systems in the Calabar/Mfamosing plant.',
    requirements: [
      'Bachelor’s Degree in Electrical / Electronics Engineering.',
      'Minimum of 6+ years hands-on industrial electrical and instrumentation maintenance experience.',
      'Proficiency in PLC/SCADA troubleshooting, MV/LV switchgear, and preventive maintenance planning.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/974548/assistant-electrical-instrumentation-manager-at-hb.html',
  },
  {
    orgName: 'The Church of Jesus Christ of Latter-day Saints',
    orgType: 'SERVICES',
    orgDescription: 'Religious and community organization operating temple and institutional facilities in Calabar.',
    orgAddress: 'Calabar Municipality, Cross River State',
    title: 'Temple Facilities Manager I',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar Municipality',
    summary:
      'Manage preventive maintenance, HVAC, electrical/mechanical systems, groundskeeping, and lifecycle facility operations for the Calabar Temple complex.',
    requirements: [
      '4-year Degree in Facilities Management, Building Technology, Civil/Mechanical Engineering, or Project Management.',
      'Minimum of 6 years progressive experience in institutional or commercial facilities management.',
      'Strong vendor management, budgeting, and building automation skills.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975056/temple-facilities-manager-i-at-the-church-of-jesus.html',
  },
  {
    orgName: 'Calabar Infrastructure & Engineering Consortium',
    orgType: 'REAL_ESTATE',
    orgDescription: 'Civil, electrical, and mechanical engineering construction contractor executing infrastructure projects in Calabar.',
    orgAddress: 'Marian / Ndidem Usang Iso Road, Calabar',
    title: 'Project Civil Engineer & Quantity Surveyor',
    category: 'Engineering & Manufacturing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Marian / Calabar Municipality',
    summary:
      'Supervise civil/structural site execution, prepare bills of quantities (BOQ), and manage contractor valuations for active construction projects in Calabar.',
    requirements: [
      'B.Eng / HND in Civil Engineering or Quantity Surveying.',
      'COREN / NIQS registration or eligibility is an advantage.',
      '3+ years site supervision and project cost control experience.',
    ],
    applyUrl: 'https://www.jobberman.com/listings/project-civil-engineer-gm8q78',
  },

  // 2. Banking & Finance
  {
    orgName: 'FairMoney Microfinance Bank',
    orgType: 'SERVICES',
    orgDescription: 'Leading digital microfinance bank providing credit, business banking, and payment solutions to merchants and SMEs across Nigeria.',
    orgAddress: 'Calabar Municipality, Cross River State',
    title: 'Senior Relationship Manager – Business Banking (Hybrid)',
    category: 'Banking & Finance',
    type: 'HYBRID',
    pay: 'Competitive + Performance Bonus',
    area: 'Calabar Municipality (Hybrid)',
    summary:
      'Drive SME and commercial business banking acquisition, manage high-value corporate client portfolios, and grow commercial loan and deposit volumes across Calabar.',
    requirements: [
      'Bachelor’s Degree in Finance, Banking, Economics, Marketing, or Business Administration.',
      '8+ years of experience in SME lending, commercial banking, or fintech business credit sales.',
      'Deep knowledge of the Calabar commercial and SME ecosystem.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/970011/senior-relationship-manager-business-banking-cross.html',
  },
  {
    orgName: 'TeamAce Limited (Financial Institutions Division)',
    orgType: 'SERVICES',
    orgDescription: 'Human capital and financial services partner recruiting credit and recovery specialists for microfinance institutions in Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Field Credit Officer & Field Recovery Officer',
    category: 'Banking & Finance',
    type: 'FULL_TIME',
    pay: '₦170,000 – ₦180,000 / mo',
    area: 'Calabar Municipality & Calabar South',
    summary:
      'Evaluate borrower creditworthiness, originate quality micro/SME loans, monitor repayment schedules, and execute field recovery across Calabar.',
    requirements: [
      'B.Sc / HND / OND in Banking & Finance, Economics, Business Administration, or related discipline.',
      '1–2 years field credit origination or loan recovery experience in a Microfinance Bank or fintech lender.',
      'Strong negotiation skills and familiarity with Calabar business districts.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975261/field-credit-officer-at-a-reputable-financial-comp.html',
  },
  {
    orgName: 'Entourage Integrated Trust Limited',
    orgType: 'SERVICES',
    orgDescription: 'Micro-credit and financial empowerment institution with active branch operations in Calabar.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Credit Officer & Field Auditor – Calabar',
    category: 'Banking & Finance',
    type: 'FULL_TIME',
    pay: '₦112,000 / mo',
    area: 'Calabar, Cross River',
    summary:
      'Manage client onboarding, credit appraisal, loan disbursement verification, and field portfolio auditing for small business borrowers in Calabar.',
    requirements: [
      'NCE, OND, HND, or B.Sc in Finance, Accounting, Business Administration, or related field.',
      'Strong numerical accuracy, integrity, and ability to conduct field verifications across Calabar.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/credit-officer-calabar-entourage-integrated-trust-limited-1',
  },
  {
    orgName: 'Premium Human Resources Solution (Commercial Bank Client)',
    orgType: 'SERVICES',
    orgDescription: 'Banking workforce management partner supporting tier-1 commercial bank branches in Calabar.',
    orgAddress: 'Calabar Road / Marian Axis, Calabar',
    title: 'Direct Sales Agent & SME Banking Associate',
    category: 'Banking & Finance',
    type: 'FULL_TIME',
    pay: '₦115,000 – ₦126,000 / mo',
    area: 'Calabar Road / Marian, Calabar',
    summary:
      'Acquire retail and SME bank accounts, onboard POS/digital banking merchants, and deepen deposit mobilization for a commercial bank in Calabar.',
    requirements: [
      'NCE, OND, HND, or B.Sc in any discipline.',
      'Must be resident in Calabar and not more than 35 years old.',
      'Strong communication and interpersonal relationship skills.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/974616/direct-sales-agent-at-a-commercial-bank-premium-hu.html',
  },
  {
    orgName: 'Standard Life Organization (SLO)',
    orgType: 'SERVICES',
    orgDescription: 'Community development finance institution empowering entrepreneurs and micro-enterprises across Nigeria.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Internal Control Officer – Calabar',
    category: 'Banking & Finance',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar, Cross River',
    summary:
      'Conduct routine branch audits, verify compliance with lending policies, identify operational control gaps, and safeguard financial assets in Calabar.',
    requirements: [
      'B.Sc / HND in Accounting, Banking & Finance, or Economics.',
      'Experience in internal audit, compliance, or microfinance branch controls.',
      'High ethical standards and attention to detail.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/internal-control-officer-calabar-standard-life-organization',
  },
  {
    orgName: 'SeedStars Academy',
    orgType: 'SERVICES',
    orgDescription: 'Entrepreneurship and MSME financing program supporting small business growth in Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Collection Specialist – Calabar',
    category: 'Banking & Finance',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar, Cross River',
    summary:
      'Support loan repayment follow-up, entrepreneur advisory, and portfolio quality management for small businesses financed in Calabar.',
    requirements: [
      'Degree or Diploma in Finance, Business Administration, or related field.',
      'Proven experience in collections, debt recovery, or SME portfolio management in Calabar.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/collection-specialist-calabar-seedstars-academy',
  },
  {
    orgName: 'Careers Verified Limited',
    orgType: 'SERVICES',
    orgDescription: 'Graduate recruitment and banking talent placement firm in Nigeria.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Graduate Management Trainee & Entry-Level Banking Sales Officer',
    category: 'Banking & Finance',
    type: 'TRAINEE',
    pay: 'Competitive + Commission',
    area: 'Calabar Municipality',
    summary:
      'Structured entry-level banking program covering consumer lending, merchant acquisition, and retail banking operations in Calabar.',
    requirements: [
      'B.Sc or HND (minimum Second Class Lower / Lower Credit) in any discipline.',
      'Completed NYSC with strong interest in a banking and financial services career.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975522/entrylevel-banking-sales-officer-at-careers-verifi.html',
  },

  // 3. Sales & Marketing
  {
    orgName: 'Lumos Nigeria (Txtlight Power Solutions Limited)',
    orgType: 'SERVICES',
    orgDescription: 'Leading off-grid solar power provider delivering clean, reliable solar home and business systems across Nigeria.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Area Sales Manager – Calabar',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: '₦500,000 – ₦750,000 / mo',
    area: 'Calabar, Cross River',
    summary:
      'Lead regional sales strategy, manage territory sales executives and trade partners, and drive adoption of Lumos solar power systems across Calabar and Cross River State.',
    requirements: [
      'B.Sc / HND in Marketing, Business Administration, or related field.',
      '5+ years proven regional sales management experience in solar energy, telecoms, or FMCG.',
      'Strong team leadership and distributor network management track record.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/area-sales-manager-lumos-4',
  },
  {
    orgName: 'Lumos Nigeria (Txtlight Power Solutions Limited)',
    orgType: 'SERVICES',
    orgDescription: 'Leading off-grid solar power provider delivering clean, reliable solar home and business systems across Nigeria.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Territory Sales Executive – Calabar',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: '₦150,000 – ₦400,000 / mo',
    area: 'Calabar, Cross River',
    summary:
      'Execute direct B2C/B2B sales, manage retail partner kiosks, and hit monthly solar unit activation targets within assigned Calabar territories.',
    requirements: [
      'OND / HND / B.Sc with 2+ years field sales experience in telecoms, renewable energy, or consumer electronics.',
      'Excellent local territory knowledge across Calabar Municipality and Calabar South.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/972141/territory-sales-executive-at-txtlight-power-soluti.html',
  },
  {
    orgName: 'Inguest Global Partners Limited',
    orgType: 'SERVICES',
    orgDescription: 'Business development and commercial growth consultancy operating in Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Marketing Associate – Calabar',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: '₦180,000 – ₦230,000 / mo',
    area: 'Calabar Municipality',
    summary:
      'Plan and execute local client acquisition campaigns, manage brand activations, and build B2B/B2C customer pipelines across Calabar.',
    requirements: [
      'HND or B.Sc in Marketing, Mass Communication, Business Admin, or related discipline.',
      'NYSC discharge/exemption certificate and at least 2 years marketing or commercial sales experience.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/972410/marketing-associates-at-inguest-global-partners-li.html',
  },
  {
    orgName: 'Rainoil Limited',
    orgType: 'SERVICES',
    orgDescription: 'Integrated downstream oil and gas company operating retail service stations and commercial fuel distribution across Nigeria.',
    orgAddress: 'Calabar Depot / Service Axis, Calabar',
    title: 'Commercial Sales Executive – Calabar',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar, Cross River',
    summary:
      'Drive B2B commercial sales of petroleum products and lubricants to industrial, marine, and corporate clients across Calabar and Cross River State.',
    requirements: [
      'Bachelor’s Degree in Business, Engineering, Marketing, or Social Sciences.',
      '3+ years commercial sales experience in the downstream oil & gas or industrial sector.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975353/commercial-sales-executive-at-rainoil-limited-3-op.html',
  },
  {
    orgName: 'Mainland Oil & Gas Co. Ltd',
    orgType: 'SERVICES',
    orgDescription: 'Downstream petroleum and lubricants marketing company serving Southern Nigeria.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Sales Representative (Engine Oil & Lubricants)',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: 'Competitive + Commission',
    area: 'Calabar, Cross River',
    summary:
      'Expand wholesale and retail distribution of automotive and industrial engine oils across auto markets, dealers, and fleet operators in Calabar.',
    requirements: [
      'Minimum of 4 years hands-on experience selling engine oil/lubricant products in Calabar.',
      'Established relationships with lubricant distributors and auto-parts dealers in Cross River.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/sales-representatives-engine-oil-products-calabar-mainland-oil-gas-co-ltd',
  },
  {
    orgName: 'Ascentech Services Limited',
    orgType: 'RETAIL',
    orgDescription: 'Retail and commercial staffing partner managing electronics showrooms and retail outlets in Calabar.',
    orgAddress: 'Calabar Road, Calabar',
    title: 'Electronics Retail Manager & Assistant Store Manager',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar Road, Calabar',
    summary:
      'Oversee daily showroom operations, merchandising, inventory accuracy, and sales team targets for a consumer electronics retail store in Calabar.',
    requirements: [
      'HND / B.Sc in Business Administration, Marketing, or related field.',
      '3+ years retail store management experience (consumer electronics or appliances preferred).',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/972163/ascentech-services-limited-job-recruitment-56-posi.html',
  },
  {
    orgName: 'Fosad Consulting',
    orgType: 'SERVICES',
    orgDescription: 'Business advisory and field operations consulting firm with field teams in Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Partnership Executive – Calabar',
    category: 'Sales & Marketing',
    type: 'FULL_TIME',
    pay: '₦70,000 / mo',
    area: 'Calabar, Cross River',
    summary:
      'Identify, onboard, and support local merchant and community partners across Calabar.',
    requirements: [
      'OND / HND / B.Sc with strong field communication and relationship management skills in Calabar.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/974407/partnership-executive-at-fosad-consulting-14-openi.html',
  },

  // 4. Healthcare & Pharma
  {
    orgName: 'TNL Pharmaceutical Company',
    orgType: 'PHARMACY',
    orgDescription: 'Pharmaceutical manufacturing and healthcare distribution company expanding operations in Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Senior Medical Sales Rep, Production Pharmacist & Sales Trainee',
    category: 'Healthcare & Pharma',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar, Cross River',
    summary:
      'Multiple openings in Calabar for Production/Superintendent Pharmacists, Senior Medical Sales Representatives, and Entry-Level Medical Sales Trainees detailing ethical and OTC products to hospitals and pharmacies.',
    requirements: [
      'Pharmacist roles: B.Pharm with current PCN license.',
      'Medical Sales Rep / Trainee roles: B.Sc in Pharmacology, Microbiology, Biochemistry, or any Biological Science (no prior experience required for Trainee).',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975426/tnl-pharmaceutical-company-trainee-exp-job-recruit.html',
  },
  {
    orgName: 'Global Linkers Limited (Pharmaceutical Division)',
    orgType: 'PHARMACY',
    orgDescription: 'Supply chain and talent partner for pharmaceutical manufacturers in Calabar.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Procurement Officer (Pharmaceutical Manufacturing)',
    category: 'Healthcare & Pharma',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar, Cross River',
    summary:
      'Manage sourcing of Active Pharmaceutical Ingredients (APIs), excipients, packaging materials, and lab consumables for pharmaceutical production in Calabar.',
    requirements: [
      'B.Sc / HND in Procurement, Supply Chain Management, Pharmacology, or Business Administration.',
      '2–5 years procurement experience within a pharmaceutical or FMCG manufacturing environment.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/975040/procurement-officer-at-a-reputable-pharmaceutical.html',
  },
  {
    orgName: 'Calabar Specialist Diagnostic & Medical Centre',
    orgType: 'HEALTHCARE',
    orgDescription: 'Accredited clinical diagnostics and specialist healthcare facility in Calabar.',
    orgAddress: 'Marian / State Housing Axis, Calabar',
    title: 'Medical Laboratory Scientist',
    category: 'Healthcare & Pharma',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'State Housing / Marian, Calabar',
    summary:
      'Perform hematology, clinical chemistry, microbiology, and serology diagnostic assays with strict quality control and rapid turnaround for patients in Calabar.',
    requirements: [
      'Bachelor of Medical Laboratory Science (BMLS) from an accredited university.',
      'Valid MLSCN practicing license and post-NYSC clinical lab experience.',
    ],
    applyUrl: 'https://www.jobberman.com/listings/medical-laboratory-scientist-n9j7m0',
  },

  // 5. Hospitality & Food
  {
    orgName: 'Erisco Foods Limited',
    orgType: 'RESTAURANT',
    orgDescription: 'Leading indigenous food processing and FMCG manufacturer distributing culinary and food products across Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'Territorial Sales Manager & Warehouse Manager – Calabar',
    category: 'Hospitality & Food',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar, Cross River',
    summary:
      'Manage food product distribution, wholesale depot inventory, and territory sales teams serving markets, supermarkets, and HORECA buyers across Calabar.',
    requirements: [
      'B.Sc / HND in Marketing, Supply Chain, Food Science, or Business Administration.',
      '3+ years FMCG / food sector distribution or warehouse management experience in Cross River State.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/976014/erisco-foods-limited-job-recruitment-13-positions.html',
  },
  {
    orgName: 'Ascentech Services Limited (Hospitality & Bakery Division)',
    orgType: 'RESTAURANT',
    orgDescription: 'Food service and modern retail bakery operations in Calabar.',
    orgAddress: 'Calabar Municipality, Cross River State',
    title: 'Outlet Concept Manager (Bakery & Quick Service Restaurant)',
    category: 'Hospitality & Food',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar Municipality',
    summary:
      'Lead store operations, production quality, customer experience, and P&L performance for a flagship bakery and food outlet in Calabar.',
    requirements: [
      'HND / B.Sc in Hospitality Management, Food Technology, or Business Administration.',
      'Proven experience managing a commercial bakery, QSR, or hospitality food outlet.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/972163/ascentech-services-limited-job-recruitment-56-posi.html',
  },
  {
    orgName: 'Axari Hotel & Suites',
    orgType: 'SERVICES',
    orgDescription: 'Premier luxury hospitality and conference hotel located on Murtala Mohammed Highway, Calabar.',
    orgAddress: 'Murtala Mohammed Highway, Calabar',
    title: 'Food & Beverage Manager, Sous Chef & Pastry Chef',
    category: 'Hospitality & Food',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Murtala Mohammed Hwy, Calabar',
    summary:
      'Oversee kitchen culinary standards, banquet/event catering, pastry production, and restaurant guest service at Axari Hotel & Suites in Calabar.',
    requirements: [
      'Culinary certification or Degree/Diploma in Hospitality & Catering Management.',
      '3–6 years experience in a reputable 3-to-5 star hotel or upscale restaurant.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/location/922/0/jobs-in-cross-river-state',
  },

  // 6. Tech & Media
  {
    orgName: 'MTN Nigeria Communications Plc',
    orgType: 'SERVICES',
    orgDescription: 'Nigeria’s largest telecommunications and digital services network provider with regional operations in Calabar.',
    orgAddress: 'Calabar Municipality, Cross River State',
    title: 'Manager & Representative – Sales, Trade Development & Customer Analytics',
    category: 'Tech & Media',
    type: 'FULL_TIME',
    pay: 'Competitive (Telecoms Grade)',
    area: 'Calabar Municipality',
    summary:
      'Multiple openings in Calabar including Manager – Sales & Trade Development, Representative – Sales & Trade Development, Analyst – Customer Acquisition & Compliance, and Analyst – Loyalty Management.',
    requirements: [
      'First Degree (B.Sc / HND) in Business, Computer Science, Economics, Marketing, or Social Sciences.',
      'Strong data analytics, telecom trade channel management, and subscriber growth experience.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/972367/mtn-nigeria-job-recruitment-12-positions.html',
  },
  {
    orgName: 'Kedmax Technology Group Ltd',
    orgType: 'SERVICES',
    orgDescription: 'EdTech and enterprise software deployment company serving schools and institutions across Cross River State.',
    orgAddress: 'Calabar, Cross River State',
    title: 'School Technology Sales & Deployment Partner',
    category: 'Tech & Media',
    type: 'CONTRACT',
    pay: 'Base + Deployment Commission',
    area: 'Calabar, Cross River',
    summary:
      'Partner with private and public schools in Calabar to demo, onboard, and deploy school management software, CBT labs, and digital learning portals.',
    requirements: [
      'Strong IT literacy and experience working with school proprietors/principals in Calabar.',
      'Track record in software implementation, IT training, or B2B technology sales.',
    ],
    applyUrl: 'https://www.myjobmag.com/job/school-technology-sales-deployment-partner-kedmax-technology-group-ltd',
  },
  {
    orgName: 'FAD 93.1 FM Calabar',
    orgType: 'PUBLISHER',
    orgDescription: 'Leading urban commercial radio and digital broadcast station in Calabar.',
    orgAddress: 'Satellite Town / Calabar Municipality, Calabar',
    title: 'On-Air Personalities (OAP), News Reporters & Broadcast Traffic Officer',
    category: 'Tech & Media',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Calabar Municipality',
    summary:
      'Produce engaging radio shows, report live local news across Cross River State, and coordinate broadcast commercial traffic schedules at FAD 93.1 FM Calabar.',
    requirements: [
      'Degree/Diploma in Mass Communication, Journalism, Theatre Arts, or related field.',
      'Excellent broadcast diction, scriptwriting, and digital media production skills.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/location/922/0/jobs-in-cross-river-state',
  },

  // 7. Logistics & Agro
  {
    orgName: 'Calabar Transport & Fleet Logistics Hub',
    orgType: 'LOGISTICS',
    orgDescription: 'Inter-state passenger terminal and haulage fleet operator in Calabar.',
    orgAddress: 'Etta Agbor / Highway Axis, Calabar',
    title: 'Terminal Manager & Logistics Operations Manager',
    category: 'Logistics & Agro',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Etta Agbor / Highway, Calabar',
    summary:
      'Manage daily terminal dispatch, fleet maintenance scheduling, driver compliance, waybill reconciliation, and cargo/passenger operations in Calabar.',
    requirements: [
      'B.Sc / HND in Transport Management, Supply Chain, Logistics, or Business Administration.',
      '4+ years experience managing transport terminals or commercial fleet logistics.',
    ],
    applyUrl: 'https://www.jobberman.com/listings/terminal-manager-9knpvn',
  },
  {
    orgName: 'Edens Solutions and Resources Limited',
    orgType: 'SERVICES',
    orgDescription: 'Commercial agribusiness and plantation management company in Cross River State.',
    orgAddress: 'Odukpani / Calabar Axis, Cross River State',
    title: 'Commercial Plantain & Poultry Farm Manager (Accommodation Provided)',
    category: 'Logistics & Agro',
    type: 'FULL_TIME',
    pay: 'Competitive + Free Accommodation & Feeding',
    area: 'Odukpani / Calabar Axis',
    summary:
      'Oversee commercial plantation agronomy, poultry flock health, farm workforce supervision, and harvest logistics near Calabar (free accommodation and feeding provided).',
    requirements: [
      'B.Agric / HND in Agriculture, Agronomy, Animal Science, or Farm Management.',
      'Hands-on experience managing commercial plantain, oil palm, or poultry farm operations.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/hotjobs/971506/farm-manager-at-edens-solutions-and-resources-limi.html',
  },
  {
    orgName: 'Cross River Timber & Agro-Processing Mills',
    orgType: 'SERVICES',
    orgDescription: 'Forestry processing, sawmill, and timber logistics operator in Cross River State.',
    orgAddress: 'Akamkpa / Calabar Industrial Axis',
    title: 'Sawmill & Timber Operations Manager',
    category: 'Logistics & Agro',
    type: 'FULL_TIME',
    pay: 'Competitive',
    area: 'Akamkpa / Calabar Axis',
    summary:
      'Manage sawmill production lines, timber grading, kiln drying, equipment maintenance, and haulage dispatch in the Calabar/Akamkpa forestry belt.',
    requirements: [
      'Experience in wood processing, sawmill machinery operations, and forestry supply chain management.',
      'Strong leadership and safety compliance record.',
    ],
    applyUrl: 'https://www.jobberman.com/listings/sawmill-timber-operations-manager-qz5jre',
  },

  // 8. Government & NGO
  {
    orgName: 'Cross River State Civil Service Commission',
    orgType: 'GOVERNMENT',
    orgDescription: 'Official civil service and local government personnel commission of Cross River State, headquartered in Calabar.',
    orgAddress: 'New Secretariat Complex, Murtala Mohammed Highway, Calabar',
    title: 'Cross River State Civil & Local Government Service Recruitment',
    category: 'Government & NGO',
    type: 'FULL_TIME',
    pay: 'CONPSS Government Scale',
    area: 'Calabar Municipality & Calabar South',
    summary:
      'Statewide public service recruitment across administrative cadres, health workers, education officers, revenue officers, and technical staff in Calabar and the 18 LGAs.',
    requirements: [
      'B.Sc / HND / NCE / OND / SSCE depending on cadre level.',
      'NYSC discharge or exemption certificate for graduate cadres.',
      'Cross River State indigeneship / residency documentation as specified on the portal.',
    ],
    applyUrl: 'https://crscsc.crossriverstate.gov.ng/',
  },
  {
    orgName: 'Excellence Community Education Welfare Scheme (ECEWS)',
    orgType: 'HEALTHCARE',
    orgDescription: 'Leading non-governmental organization promoting public health, HIV/TB/Malaria, and maternal/child health programs in Cross River State.',
    orgAddress: 'State Housing Estate, Calabar',
    title: 'Senior Technical Officer – MNCH & Malaria Programs',
    category: 'Government & NGO',
    type: 'FULL_TIME',
    pay: 'NGO Grade (Competitive)',
    area: 'State Housing Estate, Calabar',
    summary:
      'Provide technical leadership for Maternal, Newborn & Child Health (MNCH) and Malaria prevention/treatment interventions across health facilities in Calabar and Cross River State.',
    requirements: [
      'MBBS, B.Sc Nursing, or Master of Public Health (MPH) with 5+ years USAID/Global Fund NGO program experience.',
      'Strong stakeholder engagement experience with the Cross River State Ministry of Health.',
    ],
    applyUrl: 'https://www.hotnigerianjobs.com/location/922/0/jobs-in-cross-river-state',
  },
];

async function main() {
  console.log('Starting Calabar verified jobs seeding...');

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

  // Remove any old job records so we have a clean, verified set without duplicates
  const existingJobs = await db.orm.public.Job.all();
  for (const j of existingJobs) {
    await db.orm.public.Job.where({ id: j.id }).delete();
  }

  let seededCount = 0;

  for (const item of CALABAR_JOBS) {
    // Find or create hiring Organization
    let org = await db.orm.public.Organization.where({ name: item.orgName }).first();
    if (!org) {
      org = await db.orm.public.Organization.create({
        name: item.orgName,
        type: item.orgType,
        description: item.orgDescription,
        address: item.orgAddress,
        status: 'ACTIVE',
      });
    }

    // Ensure Organization has a Location in Calabar so getCityJobs() includes it
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
      '',
      'Requirements & Qualifications:',
      ...item.requirements.map((r) => `- ${r}`),
      '',
      `APPLY_URL: ${item.applyUrl}`,
    ].join('\n');

    await db.orm.public.Job.create({
      organizationId: org.id,
      title: item.title,
      description: formattedDescription,
      type: item.type,
      pay: item.pay,
      area: item.area,
      category: item.category,
    });

    seededCount++;
  }

  console.log(`Successfully seeded ${seededCount} verified Calabar job openings across all 8 industry categories.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding Calabar jobs:', err);
  process.exit(1);
});
