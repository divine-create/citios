import { SHOPOS_DATA } from './shopos';
import { SERVICEOS_DATA } from './serviceos';
import { SCHOOLOS_DATA } from './schoolos';
import type { CityJob } from './shopos';

const CITY_EXTRA_JOBS: CityJob[] = [
  {
    id: 'j-city-01',
    orgId: 'org_shepherds_care',
    orgName: "Shepherd's Care Clinic",
    os: null,
    title: 'Clinic Nursing Aide',
    type: 'Full-time',
    category: 'Health',
    area: 'Ekorinim',
    pay: '₦65,000/mo',
    posted: '3d ago',
    applicants: 13,
    spots: 2,
    desc: 'Support the GP rooms with vital signs, waiting-room flow and after-hours lab pickups.',
    requirements: ['Nursing aide certification', 'Evenings available', 'COVID-curious not required'],
    perks: ['Uniform', 'Night allowance', 'Free staff clinic visits'],
  },
  {
    id: 'j-city-02',
    orgId: 'org_crossriver_homes',
    orgName: 'CrossRiver Homes & Estates',
    os: null,
    title: 'Property Viewing Agent',
    type: 'Contract',
    category: 'Property',
    area: 'Calabar metro',
    pay: '₦25,000 per visit + commission',
    posted: '5d ago',
    applicants: 18,
    spots: 3,
    desc: 'Host CityHouse viewings, document key points and chase deposits through the app. Own transport a real plus.',
    requirements: ['Great first impression', 'Basic note-taking', 'Weekend slots'],
    perks: ['Per-visit pay', 'Commission on closed deals', 'Fuel support'],
  },
  {
    id: 'j-city-03',
    orgId: 'org_creative_hub',
    orgName: 'Calabar Creative Hub',
    os: null,
    title: 'Desk Assistant & Community Host',
    type: 'Part-time',
    category: 'Media',
    area: 'Big Qua Town',
    pay: '₦50,000/mo',
    posted: '2d ago',
    applicants: 24,
    spots: 1,
    desc: 'Run the front desk, keep the gig bulletin fresh and host the Friday open mic.',
    requirements: ['Personability', 'Sound system basics', 'Friday evenings free'],
    perks: ['Free desk membership', 'Open mic stage time', 'Referral cut'],
  },
];

const ALL: CityJob[] = [
  ...Object.values(SHOPOS_DATA).flatMap((d) => d.jobs),
  ...Object.values(SERVICEOS_DATA).flatMap((d) => d.jobs),
  ...Object.values(SCHOOLOS_DATA).flatMap((d) => d.jobs),
  ...CITY_EXTRA_JOBS,
];

const seen = new Set<string>();
export const CITY_JOBS: CityJob[] = ALL.filter((j) => {
  if (seen.has(j.id)) return false;
  seen.add(j.id);
  return true;
});

export const JOB_CATEGORIES = ['All', 'Shop', 'Service', 'School', 'Health', 'Property', 'Media'];

export function getJob(id: string): CityJob | undefined {
  return CITY_JOBS.find((j) => j.id === id);
}

export function getJobsByOrg(orgId: string): CityJob[] {
  return CITY_JOBS.filter((j) => j.orgId === orgId);
}