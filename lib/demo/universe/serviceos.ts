import { getOrg } from './orgs';
import type { CityJob } from './shopos';

export interface Service {
  id: string;
  name: string;
  category: string;
  desc: string;
  from: number;
  unit: string;
  rating: number;
  orders: number;
  tech: string;
  tag?: 'best' | 'promo' | 'new';
}

export interface ServiceRequest {
  id: string;
  ref: string;
  customer: string;
  area: string;
  service: string;
  note: string;
  status: 'new' | 'quoted' | 'accepted' | 'done' | 'cancelled';
  time: string;
}

export interface Quote {
  id: string;
  ref: string;
  customer: string;
  service: string;
  amount: number;
  sent: string;
  valid: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Booking {
  id: string;
  ref: string;
  customer: string;
  service: string;
  tech: string;
  date: string;
  time: string;
  amount: number;
  status: 'confirmed' | 'done' | 'rescheduled';
}

export interface Technician {
  id: string;
  name: string;
  skill: string;
  area: string;
  jobs: number;
  rating: number;
  active: boolean;
}

export interface Review {
  id: string;
  customer: string;
  rating: number;
  text: string;
  time: string;
  service: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  incl: string[];
  price: number;
  popular?: boolean;
}

export interface ServiceOSDataSet {
  orgId: string;
  week: number[];
  labels: string[];
  services: Service[];
  packages: ServicePackage[];
  requests: ServiceRequest[];
  quotes: Quote[];
  bookings: Booking[];
  technicians: Technician[];
  reviews: Review[];
  activity: { id: string; text: string; time: string; tone: string }[];
  jobs: CityJob[];
}

export const SERVICEOS_DATA: Record<string, ServiceOSDataSet> = {
  'mikes-ac-services': {
    orgId: 'org_mikes_ac',
    week: [21, 26, 18, 31, 27, 42, 15],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    services: [
      { id: 'ac-svc-01', name: 'AC Filter & Coil Service', category: 'Maintenance', desc: 'Filter wash, coil clean, drain check and a pressure test. Usually done in under an hour.', from: 9000, unit: 'per unit', rating: 4.9, orders: 214, tech: 'Mike Akpan', tag: 'best' },
      { id: 'ac-svc-02', name: 'AC Gas Refill (R22)', category: 'Maintenance', desc: 'Pressure test then refill to spec, quoted before we open the valve.', from: 12000, unit: 'per unit', rating: 4.8, orders: 96, tech: 'Chidi Eze', tag: 'best' },
      { id: 'ac-svc-03', name: 'Split AC Installation', category: 'Installation', desc: 'Mounting, copper pipe run, vacuum and full commissioning. Wall check first.', from: 35000, unit: 'per unit', rating: 4.9, orders: 41, tech: 'Mike Akpan', tag: 'promo' },
      { id: 'ac-svc-04', name: 'Window Unit Pick-up & Service', category: 'Maintenance', desc: 'We unbox, service at the shop and return the unit within 48 hours.', from: 11000, unit: 'per unit', rating: 4.7, orders: 28, tech: 'Pius Nyong' },
      { id: 'ac-svc-05', name: 'Carnival-Eve Rush Service', category: 'Priority', desc: 'Same-day slot ahead of the heat — booked units placed first in the queue.', from: 5000, unit: 'priority fee', rating: 4.6, orders: 33, tech: 'Mike Akpan', tag: 'new' },
      { id: 'ac-svc-06', name: 'Inverter AC Tune-up', category: 'Installation', desc: 'Diagnostics on inverter units, firmware note and gas top-up if needed.', from: 15000, unit: 'per unit', rating: 4.8, orders: 19, tech: 'Chidi Eze' },
    ],
    packages: [
      { id: 'ac-pkg-01', name: 'Home Comfort', incl: ['Service up to 2 units', 'Priority scheduling', 'Rider pickup optional'], price: 17000, popular: true },
      { id: 'ac-pkg-02', name: 'Office Fleet', incl: ['Up to 5 units', 'Quarterly visit', 'Bulk gas rate'], price: 38000 },
      { id: 'ac-pkg-03', name: 'Carnival-Ready', incl: ['Service + gas refill', 'Same-day slot', 'Post-event check'], price: 24500 },
    ],
    requests: [
      { id: 'r-01', ref: 'RQ-6521', customer: 'Whitney Atim', area: 'State Housing Estate', service: 'AC Filter & Coil Service', note: 'Two rooftop units, one drips water into the window.', status: 'accepted', time: 'Today, 10:12 AM' },
      { id: 'r-02', ref: 'RQ-6520', customer: 'Basil Oko', area: 'Parliamentary Extension', service: 'AC Gas Refill (R22)', note: 'Cold but not freezing — likely low gas.', status: 'quoted', time: 'Today, 9:40 AM' },
      { id: 'r-03', ref: 'RQ-6519', customer: 'Imoh Daniel', area: 'Big Qua Town', service: 'Split AC Installation', note: 'Studio opens next week, need 3 units before Friday.', status: 'new', time: 'Yesterday' },
      { id: 'r-04', ref: 'RQ-6518', customer: 'Emem Ekanem', area: 'Calabar South', service: 'Window Unit Pick-up & Service', note: 'Unit not starting — motor spins then stops.', status: 'new', time: 'Yesterday' },
      { id: 'r-05', ref: 'RQ-6517', customer: 'Tracy Bassey', area: 'Ikot Ansa', service: 'Inverter AC Tune-up', note: 'Noise from the outdoor fan at night.', status: 'done', time: '2 days ago' },
      { id: 'r-06', ref: 'RQ-6516', customer: 'Kufre Ene', area: 'Nyakasang', service: 'Carnival-Eve Rush Service', note: 'Hosting family for the parade weekend.', status: 'cancelled', time: '3 days ago' },
    ],
    quotes: [
      { id: 'q-01', ref: 'QT-3101', customer: 'Basil Oko', service: 'AC Gas Refill (R22)', amount: 14500, sent: 'Today', valid: '48 hrs', status: 'pending' },
      { id: 'q-02', ref: 'QT-3100', customer: 'Imoh Daniel', service: '3 × Split AC Installation', amount: 96000, sent: 'Yesterday', valid: '7 days', status: 'pending' },
      { id: 'q-03', ref: 'QT-3099', customer: 'Emem Ekanem', service: 'Window Unit Pick-up', amount: 16000, sent: 'Yesterday', valid: '48 hrs', status: 'pending' },
      { id: 'q-04', ref: 'QT-3098', customer: 'Grace Bassey', service: '2 × AC Service', amount: 17000, sent: '4 days ago', valid: 'expired', status: 'accepted' },
      { id: 'q-05', ref: 'QT-3097', customer: 'Nkoyo Effiom', service: 'AC Filter Service', amount: 9500, sent: '1w ago', valid: 'expired', status: 'declined' },
    ],
    bookings: [
      { id: 'b-01', ref: 'BK-2210', customer: 'Whitney Atim', service: 'AC Filter & Coil Service', tech: 'Mike Akpan', date: 'Today', time: '2:00 PM', amount: 18000, status: 'confirmed' },
      { id: 'b-02', ref: 'BK-2209', customer: 'Tracy Bassey', service: 'Inverter AC Tune-up', tech: 'Chidi Eze', date: 'Today', time: '4:30 PM', amount: 15000, status: 'confirmed' },
      { id: 'b-03', ref: 'BK-2208', customer: 'Grace Bassey', service: '2 × AC Service', tech: 'Pius Nyong', date: 'Yesterday', time: '11:00 AM', amount: 17000, status: 'done' },
      { id: 'b-04', ref: 'BK-2207', customer: 'Kufre Ene', service: 'Rush Service', tech: 'Mike Akpan', date: 'Thu', time: '9:00 AM', amount: 5000, status: 'rescheduled' },
    ],
    technicians: [
      { id: 't-01', name: 'Mike Akpan', skill: 'Install / R22 / Inverter', area: 'Ekorinim + City', jobs: 84, rating: 4.9, active: true },
      { id: 't-02', name: 'Chidi Eze', skill: 'Gas / Diagnostics', area: 'City wide', jobs: 61, rating: 4.8, active: true },
      { id: 't-03', name: 'Pius Nyong', skill: 'Service / Window units', area: 'Calabar South', jobs: 47, rating: 4.7, active: true },
      { id: 't-04', name: 'Okon Effiong', skill: 'Install assist', area: 'Big Qua Town', jobs: 29, rating: 4.6, active: false },
    ],
    reviews: [
      { id: 'rv-01', customer: 'Whitney A.', rating: 5, text: 'Mike replaced gas and cleaned both units before the wedding heat came. Perfect.', time: '1d ago', service: 'Gas Refill' },
      { id: 'rv-02', customer: 'Basil O.', rating: 5, text: 'Quoted ₦14,500 before opening the valve. That is how it should be done.', time: '2d ago', service: 'R22 Refill' },
      { id: 'rv-03', customer: 'Grace B.', rating: 4, text: 'Booking was 20 min late but the work was thorough and tidy.', time: '5d ago', service: '2 × Service' },
    ],
    activity: [
      { id: 'ac-01', text: 'RQ-6521 accepted — dispatch Mike for 2 PM', time: '10:15 AM', tone: 'ok' },
      { id: 'ac-02', text: 'Quote QT-3100 (3 installs) awaiting response', time: '9:50 AM', tone: 'warn' },
      { id: 'ac-03', text: 'Chidi finished inverter tune-up at Ikot Ansa', time: '8:40 AM', tone: 'ok' },
      { id: 'ac-04', text: 'Gas cylinder recertified for the month', time: 'Yesterday', tone: 'info' },
    ],
    jobs: [
      {
        id: 'j-sv-01',
        orgId: 'org_mikes_ac',
        orgName: "Mike's AC Services",
        os: 'serviceos',
        title: 'AC Technician (Field)',
        type: 'Full-time',
        category: 'Service',
        area: 'Ekorinim',
        pay: '₦95,000/mo + bonus',
        posted: '2d ago',
        applicants: 8,
        spots: 1,
        desc: 'Service and refill split and window units across Calabar metro from our Ekorinim base. Tool kit provided, jobs dispatched through the ServiceOS board.',
        requirements: ['2+ years AC service experience', 'R22 handling certification', 'Own transport preferred'],
        perks: ['Job-by-job bonus', 'Pay via CityPay on completion', 'Tool kit provided'],
      },
      {
        id: 'j-sv-02',
        orgId: 'org_mikes_ac',
        orgName: "Mike's AC Services",
        os: 'serviceos',
        title: 'Install Crew Member',
        type: 'Contract',
        category: 'Service',
        area: 'Calabar metro',
        pay: '₦45,000 per install set',
        posted: '1w ago',
        applicants: 11,
        spots: 2,
        desc: 'Pair up with a lead tech on split-unit installs and weekend rush season. Fittings, pipe runs and cleanup.',
        requirements: ['Comfortable at height', 'Basic tool safety', 'Weekend availability'],
        perks: ['Per-install pay', 'Transport covered', 'Path to full technician'],
      },
      {
        id: 'j-sv-03',
        orgId: 'org_clean_care',
        orgName: 'Calabar CleanCare',
        os: 'serviceos',
        title: 'Housekeeping Crew (2-person)',
        type: 'Full-time',
        category: 'Service',
        area: 'Satellite Town',
        pay: '₦55,000/mo',
        posted: '3d ago',
        applicants: 16,
        spots: 2,
        desc: 'Deep clean homes, offices and move-ins with a partner crew. Products provided, checklists on the app.',
        requirements: ['Team player', 'Reliable transport to base', 'Hygiene-first mindset'],
        perks: ['Crew bonuses on big cleans', 'Uniform + kit', 'Referral bonus'],
      },
      {
        id: 'j-sv-04',
        orgId: 'org_moments_photo',
        orgName: 'Calabar Moments Photography',
        os: 'serviceos',
        title: 'Event Photographer',
        type: 'Gig',
        category: 'Service',
        area: 'Calabar metro',
        pay: '₦28,000 per event',
        posted: '5d ago',
        applicants: 21,
        spots: 3,
        desc: 'Cover weddings, naming ceremonies and carnival band nights with the Moments crew. Camera bodies provided, bring a lens.',
        requirements: ['Own DSLR/mirrorless + prime lens', 'Portfolio link', 'Weekend availability'],
        perks: ['Featured in studio gallery', 'Edits handled in-house', 'Referral cut'],
      },
    ],
  },

  'calabar-cleancare': {
    orgId: 'org_clean_care',
    week: [12, 9, 15, 11, 18, 21, 8],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    services: [
      { id: 'cc-svc-01', name: 'Deep Home Clean', category: 'Residential', desc: 'Two-person crew, all rooms, kitchen degrease and a walk-through checklist.', from: 12000, unit: 'per visit', rating: 4.8, orders: 98, tech: 'Comfort Udofia', tag: 'best' },
      { id: 'cc-svc-02', name: 'Office Clean (Weekly)', category: 'Commercial', desc: 'Weekly floor + desk runs, stocked supply closet and a monthly deep day.', from: 9000, unit: 'per week', rating: 4.7, orders: 27, tech: 'Adaeze Nwosu' },
      { id: 'cc-svc-03', name: 'Move-in / Move-out', category: 'Residential', desc: 'Full turnover clean: inside cupboards, fittings, kitchen and bathrooms.', from: 25000, unit: 'per visit', rating: 4.9, orders: 18, tech: 'Comfort Udofia', tag: 'promo' },
      { id: 'cc-svc-04', name: 'Couch & Carpet Steam', category: 'Deep', desc: 'Mobile steam rig, kills the stains and the smell. One-to-two-hour block.', from: 8500, unit: 'per piece', rating: 4.6, orders: 22, tech: 'Okon Effiong' },
    ],
    packages: [
      { id: 'cc-pkg-01', name: 'Monthly Residency', incl: ['2 deep cleans / month', 'Priority slots', 'Products included'], price: 22000, popular: true },
      { id: 'cc-pkg-02', name: 'Landlord Turnover', incl: ['Move-out + move-in', 'Go through stubs', 'Key handover report'], price: 44000 },
    ],
    requests: [
      { id: 'cc-r-01', ref: 'CC-RQ-114', customer: 'Anita Edem', area: 'Ekorinim', service: 'Move-in / Move-out', note: 'Whitehouse duplex turnover for new tenants.', status: 'accepted', time: 'Today' },
      { id: 'cc-r-02', ref: 'CC-RQ-113', customer: 'Basil Oko', area: 'Parliamentary Extension', service: 'Deep Home Clean', note: '3-bed, focus on kitchen tile grout.', status: 'new', time: 'Yesterday' },
      { id: 'cc-r-03', ref: 'CC-RQ-112', customer: 'Nkoyo Effiom', area: '8 Miles', service: 'Couch & Carpet Steam', note: '3-seater sofa, pet-friendly products please.', status: 'quoted', time: '2 days ago' },
    ],
    quotes: [
      { id: 'cc-q-01', ref: 'CC-QT-041', customer: 'Nkoyo Effiom', service: 'Couch Steam', amount: 9500, sent: '2d ago', valid: '72 hrs', status: 'pending' },
      { id: 'cc-q-02', ref: 'CC-QT-040', customer: 'Basil Oko', service: 'Deep Home Clean', amount: 14000, sent: 'Yesterday', valid: '72 hrs', status: 'pending' },
    ],
    bookings: [
      { id: 'cc-b-01', ref: 'CC-BK-072', customer: 'Anita Edem', service: 'Move-in Clean', tech: 'Comfort Udofia', date: 'Sat', time: '9:00 AM', amount: 25000, status: 'confirmed' },
      { id: 'cc-b-02', ref: 'CC-BK-071', customer: 'Imoh Daniel', service: 'Office Weekly', tech: 'Adaeze Nwosu', date: 'Fri', time: '7:00 AM', amount: 9000, status: 'confirmed' },
    ],
    technicians: [
      { id: 'cc-t-01', name: 'Comfort Udofia', skill: 'Deep cleans / turnover', area: 'City wide', jobs: 112, rating: 4.9, active: true },
      { id: 'cc-t-02', name: 'Adaeze Nwosu', skill: 'Commercial / offices', area: 'Central', jobs: 64, rating: 4.7, active: true },
      { id: 'cc-t-03', name: 'Okon Effiong', skill: 'Steam rig', area: 'Outskirts', jobs: 37, rating: 4.6, active: true },
    ],
    reviews: [
      { id: 'cc-rv-01', customer: 'Anita E.', rating: 5, text: 'Turnover was spotless and the checklist helped the new tenants settle.', time: '3d ago', service: 'Move-in' },
      { id: 'cc-rv-02', customer: 'Imoh D.', rating: 5, text: 'Weekly office runs now include the store-room shelf. Worth every naira.', time: '1w ago', service: 'Office' },
    ],
    activity: [
      { id: 'cc-ac-01', text: 'Turnover crew booked for Whitehouse this Saturday', time: 'Today', tone: 'ok' },
      { id: 'cc-ac-02', text: 'Steam rig in for service before the weekend rush', time: 'Yesterday', tone: 'info' },
      { id: 'cc-ac-03', text: '3 new customers joined the Monthly Residency plan', time: '2d ago', tone: 'ok' },
    ],
    jobs: [
      {
        id: 'j-sv-03',
        orgId: 'org_clean_care',
        orgName: 'Calabar CleanCare',
        os: 'serviceos',
        title: 'Housekeeping Crew (2-person)',
        type: 'Full-time',
        category: 'Service',
        area: 'Satellite Town',
        pay: '₦55,000/mo',
        posted: '3d ago',
        applicants: 16,
        spots: 2,
        desc: 'Deep clean homes, offices and move-ins with a partner crew. Products provided, checklists on the app.',
        requirements: ['Team player', 'Reliable transport to base', 'Hygiene-first mindset'],
        perks: ['Crew bonuses on big cleans', 'Uniform + kit', 'Referral bonus'],
      },
    ],
  },

  'calabar-moments-photography': {
    orgId: 'org_moments_photo',
    week: [4, 6, 5, 9, 7, 14, 11],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    services: [
      { id: 'mp-svc-01', name: 'Studio Portrait Session', category: 'Studio', desc: '60-minute solo session, 12 edited frames in a private gallery.', from: 18000, unit: 'per session', rating: 4.9, orders: 63, tech: 'Imoh Daniel', tag: 'best' },
      { id: 'mp-svc-02', name: 'Wedding Coverage', category: 'Events', desc: 'Two shooters, full day, family album and a teaser within 48 hours.', from: 185000, unit: 'per event', rating: 4.8, orders: 12, tech: 'Tracy Bassey' },
      { id: 'mp-svc-03', name: 'Naming / Birthday Party', category: 'Events', desc: 'Single shooter, 3 hours, 40 edited frames the next day.', from: 45000, unit: 'per event', rating: 4.7, orders: 27, tech: 'Tracy Bassey', tag: 'promo' },
      { id: 'mp-svc-04', name: 'Product & Menu Shoots', category: 'Commercial', desc: 'Clean backgrounds, pricing-grade edits, fast turnaround for marketplaces.', from: 22000, unit: 'per set', rating: 4.8, orders: 15, tech: 'Imoh Daniel' },
      { id: 'mp-svc-05', name: 'Carnival Band Coverage', category: 'Events', desc: 'Night shoots at Bogobiri rehearsals and parade day — 200+ frames.', from: 65000, unit: 'per night', rating: 4.6, orders: 9, tech: 'Tracy Bassey', tag: 'new' },
    ],
    packages: [
      { id: 'mp-pkg-01', name: 'Fresh Start', incl: ['Studio portrait', '2 outfit changes', 'Social pack'], price: 24000, popular: true },
      { id: 'mp-pkg-02', name: 'Market Ready', incl: ['12 product shots', 'Banner + secondary', '72h turnaround'], price: 48000 },
    ],
    requests: [
      { id: 'mp-r-01', ref: 'MP-RQ-433', customer: 'FreshMart Calabar', area: 'Big Qua Town', service: 'Product & Menu Shoots', note: 'Weekly restock box + 6 hero products.', status: 'quoted', time: 'Yesterday' },
      { id: 'mp-r-02', ref: 'MP-RQ-432', customer: 'Whitney Atim', area: 'State Housing Estate', service: 'Studio Portrait Session', note: 'Carnival costume preview session.', status: 'new', time: 'Today' },
      { id: 'mp-r-03', ref: 'MP-RQ-431', customer: 'Calabar Creative Hub', area: 'Big Qua Town', service: 'Naming / Birthday Party', note: 'Hub anniversary, 3-hour coverage.', status: 'done', time: '3 days ago' },
    ],
    quotes: [
      { id: 'mp-q-01', ref: 'MP-QT-061', customer: 'FreshMart Calabar', service: 'Product Set (18 frames)', amount: 36000, sent: 'Yesterday', valid: '5 days', status: 'pending' },
      { id: 'mp-q-02', ref: 'MP-QT-060', customer: 'Whitney Atim', service: 'Studio Portrait', amount: 18000, sent: 'Today', valid: '72 hrs', status: 'pending' },
    ],
    bookings: [
      { id: 'mp-b-01', ref: 'MP-BK-098', customer: 'Whitney Atim', service: 'Studio Portrait', tech: 'Imoh Daniel', date: 'Sat', time: '11:00 AM', amount: 18000, status: 'confirmed' },
      { id: 'mp-b-02', ref: 'MP-BK-097', customer: 'Nne Usoro', service: 'Carnival Band Coverage', tech: 'Tracy Bassey', date: 'Today', time: '6:00 PM', amount: 65000, status: 'confirmed' },
    ],
    technicians: [
      { id: 'mp-t-01', name: 'Imoh Daniel', skill: 'Studio / Commercial', area: 'Big Qua Town', jobs: 88, rating: 4.9, active: true },
      { id: 'mp-t-02', name: 'Tracy Bassey', skill: 'Events / Carnival', area: 'City wide', jobs: 42, rating: 4.8, active: true },
      { id: 'mp-t-03', name: 'Samuel Edem', skill: 'Edits / Delivery', area: 'Studio', jobs: 120, rating: 4.7, active: true },
    ],
    reviews: [
      { id: 'mp-rv-01', customer: 'FreshMart M.', rating: 5, text: 'The restock box photos sold themselves — orders up the same week.', time: '1w ago', service: 'Product Set' },
      { id: 'mp-rv-02', customer: 'Nne U.', rating: 5, text: 'Band night coverage at Bogobiri was electric. 240 frames by midnight.', time: '3d ago', service: 'Carnival' },
    ],
    activity: [
      { id: 'mp-ac-01', text: 'FreshMart product shoot quoted at ₦36,000', time: 'Yesterday', tone: 'warn' },
      { id: 'mp-ac-02', text: 'Carnival night batch delivered — 240 frames', time: '1d ago', tone: 'ok' },
      { id: 'mp-ac-03', text: 'Studio calendar full for Saturday', time: '2d ago', tone: 'info' },
    ],
    jobs: [
      {
        id: 'j-sv-04',
        orgId: 'org_moments_photo',
        orgName: 'Calabar Moments Photography',
        os: 'serviceos',
        title: 'Event Photographer',
        type: 'Gig',
        category: 'Service',
        area: 'Calabar metro',
        pay: '₦28,000 per event',
        posted: '5d ago',
        applicants: 21,
        spots: 3,
        desc: 'Cover weddings, naming ceremonies and carnival band nights with the Moments crew. Camera bodies provided, bring a lens.',
        requirements: ['Own DSLR/mirrorless + prime lens', 'Portfolio link', 'Weekend availability'],
        perks: ['Featured in studio gallery', 'Edits handled in-house', 'Referral cut'],
      },
      {
        id: 'j-sv-05',
        orgId: 'org_moments_photo',
        orgName: 'Calabar Moments Photography',
        os: 'serviceos',
        title: 'Photo Editor / Retoucher',
        type: 'Part-time',
        category: 'Service',
        area: 'Big Qua Town',
        pay: '₦40,000/mo',
        posted: '4d ago',
        applicants: 7,
        spots: 1,
        desc: 'Retouch event batches in studio or remote, keep the 72-hour turnaround promise.',
        requirements: ['Lightroom/Photoshop fluency', 'Skin-friendly retouch style', 'Fast turnaround discipline'],
        perks: ['Studio desk', 'Per-batch bonus', 'Portfolio growth'],
      },
    ],
  },
};

export function getServiceOSDataset(slug: string): ServiceOSDataSet | undefined {
  return SERVICEOS_DATA[slug];
}

export function allServiceOSOrgs(): { slug: string; orgName: string }[] {
  return Object.keys(SERVICEOS_DATA).map((slug) => ({ slug, orgName: getOrg(slug)?.name ?? slug }));
}