import { getOrg } from './orgs';
import type { CityJob } from './shopos';

export interface Student {
  id: string;
  adm: string;
  name: string;
  cls: string;
  gender: 'M' | 'F';
  guardian: string;
  attendance: number;
  balance: number;
  status: 'active' | 'probation';
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  classes: string;
  phone: string;
  status: 'active' | 'on-leave';
}

export interface SchoolClass {
  id: string;
  name: string;
  level: string;
  room: string;
  students: number;
  teacher: string;
}

export interface Subject {
  id: string;
  name: string;
  classes: string;
  teacherId: string;
}

export interface AttendanceDay {
  id: string;
  date: string;
  cls: string;
  present: number;
  absent: number;
}

export interface FeeSchedule {
  id: string;
  term: string;
  tuition: number;
  feeding: number;
  books: number;
  total: number;
}

export interface FeeRecord {
  id: string;
  student: string;
  cls: string;
  term: string;
  amount: number;
  status: 'paid' | 'partial' | 'due';
}

export interface Exam {
  id: string;
  title: string;
  term: string;
  date: string;
  subjects: number;
  status: 'scheduled' | 'done';
  classAvg: number;
}

export interface StudentResult {
  id: string;
  name: string;
  cls: string;
  avg: number;
  grade: string;
  rank: number;
}

export interface Admission {
  id: string;
  name: string;
  appliedClass: string;
  status: 'pending' | 'offered' | 'enrolled';
  stage: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  time: string;
  audience: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  tag: string;
}

export interface SchoolOSDataSet {
  orgId: string;
  week: number[];
  labels: string[];
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  attendance: AttendanceDay[];
  fees: { schedule: FeeSchedule[]; records: FeeRecord[] };
  exams: Exam[];
  results: StudentResult[];
  admissions: Admission[];
  announcements: Announcement[];
  events: SchoolEvent[];
  activity: { id: string; text: string; time: string; tone: string }[];
  jobs: CityJob[];
}

export const SCHOOLOS_DATA: Record<string, SchoolOSDataSet> = {
  'hope-academy': {
    orgId: 'org_hope_academy',
    week: [118, 121, 119, 124, 117, 96, 92],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    students: [
      { id: 's01', adm: 'HA-2011', name: 'Adaeze Oko', cls: 'JSS 1A', gender: 'F', guardian: 'Basil Oko', attendance: 96, balance: 0, status: 'active' },
      { id: 's02', adm: 'HA-2012', name: 'Edet Okon', cls: 'JSS 1A', gender: 'M', guardian: 'Ubong Okon', attendance: 91, balance: 25000, status: 'active' },
      { id: 's03', adm: 'HA-2013', name: 'Nseobong Ene', cls: 'JSS 1A', gender: 'F', guardian: 'Kufre Ene', attendance: 88, balance: 0, status: 'active' },
      { id: 's04', adm: 'HA-2014', name: 'Chukwu Blessing', cls: 'JSS 1B', gender: 'F', guardian: 'Chidinma Okafor', attendance: 99, balance: 0, status: 'active' },
      { id: 's05', adm: 'HA-2015', name: 'Uti Bassey', cls: 'JSS 1B', gender: 'M', guardian: 'Ekaette Bassey', attendance: 94, balance: 0, status: 'active' },
      { id: 's06', adm: 'HA-2006', name: 'Efiong Etim', cls: 'JSS 2A', gender: 'M', guardian: 'Nkoyo Effiom', attendance: 90, balance: 50000, status: 'probation' },
      { id: 's07', adm: 'HA-2007', name: 'Immaculata Udoh', cls: 'JSS 2A', gender: 'F', guardian: 'Grace Bassey', attendance: 97, balance: 0, status: 'active' },
      { id: 's08', adm: 'HA-2008', name: 'Otobong Asuquo', cls: 'JSS 2B', gender: 'F', guardian: 'Mercy Eyo', attendance: 93, balance: 0, status: 'active' },
      { id: 's09', adm: 'HA-2009', name: 'Aniekan Effiong', cls: 'JSS 2B', gender: 'M', guardian: 'Daniel Effiong', attendance: 85, balance: 30000, status: 'active' },
      { id: 's10', adm: 'HA-2000', name: 'Mfoniso Edem', cls: 'JSS 3A', gender: 'F', guardian: 'Anita Edem', attendance: 98, balance: 0, status: 'active' },
      { id: 's11', adm: 'HA-2001', name: 'Ekpo Effiom', cls: 'JSS 3A', gender: 'M', guardian: 'Akan Ekpe', attendance: 89, balance: 0, status: 'active' },
      { id: 's12', adm: 'HA-2002', name: 'Bassey Nse', cls: 'JSS 3B', gender: 'M', guardian: 'Comfort Udofia', attendance: 92, balance: 0, status: 'active' },
      { id: 's13', adm: 'HA-2003', name: 'Chidinma Odu', cls: 'SSS 1A', gender: 'F', guardian: 'Phm Comfort Odu', attendance: 95, balance: 0, status: 'active' },
      { id: 's14', adm: 'HA-2004', name: 'Ime Archibong', cls: 'SSS 1A', gender: 'M', guardian: 'Mama Efa', attendance: 87, balance: 45000, status: 'active' },
      { id: 's15', adm: 'HA-1950', name: 'Nnenna Asuquo', cls: 'SSS 2A', gender: 'F', guardian: 'Tracy Bassey', attendance: 96, balance: 0, status: 'active' },
      { id: 's16', adm: 'HA-1951', name: 'Orok Etuk', cls: 'SSS 2A', gender: 'M', guardian: 'Okon Ndiyo', attendance: 90, balance: 0, status: 'active' },
      { id: 's17', adm: 'HA-1952', name: 'Imaobong Thompson', cls: 'SSS 2B', gender: 'F', guardian: 'Uduak Thompson', attendance: 94, balance: 15000, status: 'active' },
      { id: 's18', adm: 'HA-1953', name: 'Michael Eyo', cls: 'SSS 2B', gender: 'M', guardian: 'Pius Nyong', attendance: 86, balance: 60000, status: 'probation' },
      { id: 's19', adm: 'HA-1901', name: 'Udeme Okon', cls: 'SSS 3A', gender: 'F', guardian: 'Ifiok Essien', attendance: 97, balance: 0, status: 'active' },
      { id: 's20', adm: 'HA-1902', name: 'Kingsley Ekpensong', cls: 'SSS 3A', gender: 'M', guardian: 'Emem Ekanem', attendance: 93, balance: 0, status: 'active' },
    ],
    teachers: [
      { id: 't01', name: 'Mrs Adiaha Mbang', subject: 'English Language', classes: 'JSS 1–3', phone: '0803 111 2233', status: 'active' },
      { id: 't02', name: 'Mr Effanga Etim', subject: 'Mathematics', classes: 'JSS 1–3', phone: '0805 222 3344', status: 'active' },
      { id: 't03', name: 'Miss Arit Udom', subject: 'Basic Science', classes: 'JSS 1–2', phone: '0803 333 4455', status: 'active' },
      { id: 't04', name: 'Mr Ndifreke Nya', subject: 'Civic & Social Studies', classes: 'JSS 2–3', phone: '0806 444 5566', status: 'active' },
      { id: 't05', name: 'Mrs Onyinye Adegbite', subject: 'Literature-in-English', classes: 'SSS 1–2', phone: '0803 555 6677', status: 'active' },
      { id: 't06', name: 'Mr Esu Ukpong', subject: 'Further Mathematics', classes: 'SSS 1–3', phone: '0805 666 7788', status: 'active' },
      { id: 't07', name: 'Miss Ekaete Akpan', subject: 'Chemistry', classes: 'SSS 2–3', phone: '0803 777 8899', status: 'active' },
      { id: 't08', name: 'Mr Bassey Edet', subject: 'Biology', classes: 'SSS 1–3', phone: '0806 888 9900', status: 'active' },
      { id: 't09', name: 'Mrs Ngozi Udo', subject: 'ICT & Coding', classes: 'JSS 1–SSS 3', phone: '0803 999 0011', status: 'active' },
    ],
    classes: [
      { id: 'c01', name: 'JSS 1A', level: 'Junior Secondary', room: 'Block A · Room 1', students: 18, teacher: 'Mrs Adiaha Mbang' },
      { id: 'c02', name: 'JSS 1B', level: 'Junior Secondary', room: 'Block A · Room 2', students: 17, teacher: 'Mr Effanga Etim' },
      { id: 'c03', name: 'JSS 2A', level: 'Junior Secondary', room: 'Block A · Room 3', students: 20, teacher: 'Miss Arit Udom' },
      { id: 'c04', name: 'JSS 2B', level: 'Junior Secondary', room: 'Block B · Room 4', students: 19, teacher: 'Mr Ndifreke Nya' },
      { id: 'c05', name: 'JSS 3A', level: 'Junior Secondary', room: 'Block B · Room 5', students: 21, teacher: 'Mrs Onyinye Adegbite' },
      { id: 'c06', name: 'JSS 3B', level: 'Junior Secondary', room: 'Block B · Room 6', students: 20, teacher: 'Mr Esu Ukpong' },
      { id: 'c07', name: 'SSS 1A', level: 'Senior Secondary', room: 'Block C · Room 7', students: 22, teacher: 'Miss Ekaete Akpan' },
      { id: 'c08', name: 'SSS 2A', level: 'Senior Secondary', room: 'Block C · Room 8', students: 21, teacher: 'Mr Bassey Edet' },
      { id: 'c09', name: 'SSS 2B', level: 'Senior Secondary', room: 'Block C · Room 9', students: 20, teacher: 'Mrs Ngozi Udo' },
      { id: 'c10', name: 'SSS 3A', level: 'Senior Secondary', room: 'Block D · Hall', students: 24, teacher: 'Mrs Adiaha Mbang' },
    ],
    subjects: [
      { id: 'su01', name: 'English Language', classes: 'JSS 1–3', teacherId: 't01' },
      { id: 'su02', name: 'Mathematics', classes: 'JSS 1–3', teacherId: 't02' },
      { id: 'su03', name: 'Basic Science', classes: 'JSS 1–2', teacherId: 't03' },
      { id: 'su04', name: 'Civic Education', classes: 'JSS 2–3', teacherId: 't04' },
      { id: 'su05', name: 'Literature-in-English', classes: 'SSS 1–2', teacherId: 't05' },
      { id: 'su06', name: 'Further Mathematics', classes: 'SSS 1–3', teacherId: 't06' },
      { id: 'su07', name: 'Chemistry', classes: 'SSS 2–3', teacherId: 't07' },
      { id: 'su08', name: 'Biology', classes: 'SSS 1–3', teacherId: 't08' },
      { id: 'su09', name: 'ICT & Coding', classes: 'JSS 1–SSS 3', teacherId: 't09' },
    ],
    attendance: [
      { id: 'at01', date: 'Mon', cls: 'School-wide', present: 118, absent: 4 },
      { id: 'at02', date: 'Tue', cls: 'School-wide', present: 121, absent: 1 },
      { id: 'at03', date: 'Wed', cls: 'School-wide', present: 119, absent: 3 },
      { id: 'at04', date: 'Thu', cls: 'School-wide', present: 124, absent: 0 },
      { id: 'at05', date: 'Fri', cls: 'School-wide', present: 117, absent: 5 },
    ],
    fees: {
      schedule: [
        { id: 'fs01', term: 'First Term 2026/27', tuition: 95000, feeding: 28000, books: 12000, total: 135000 },
        { id: 'fs02', term: 'Second Term 2026/27', tuition: 95000, feeding: 28000, books: 6000, total: 129000 },
        { id: 'fs03', term: 'Third Term 2026/27', tuition: 95000, feeding: 28000, books: 0, total: 123000 },
      ],
      records: [
        { id: 'fr01', student: 'Adaeze Oko', cls: 'JSS 1A', term: '1st Term', amount: 135000, status: 'paid' },
        { id: 'fr02', student: 'Edet Okon', cls: 'JSS 1A', term: '1st Term', amount: 110000, status: 'partial' },
        { id: 'fr03', student: 'Nseobong Ene', cls: 'JSS 1A', term: '1st Term', amount: 135000, status: 'paid' },
        { id: 'fr04', student: 'Efiong Etim', cls: 'JSS 2A', term: '1st Term', amount: 85000, status: 'partial' },
        { id: 'fr05', student: 'Immaculata Udoh', cls: 'JSS 2A', term: '1st Term', amount: 135000, status: 'paid' },
        { id: 'fr06', student: 'Nnenna Asuquo', cls: 'SSS 2A', term: '1st Term', amount: 135000, status: 'paid' },
        { id: 'fr07', student: 'Imaobong Thompson', cls: 'SSS 2B', term: '1st Term', amount: 120000, status: 'partial' },
        { id: 'fr08', student: 'Michael Eyo', cls: 'SSS 2B', term: '1st Term', amount: 75000, status: 'partial' },
        { id: 'fr09', student: 'Udeme Okon', cls: 'SSS 3A', term: '1st Term', amount: 135000, status: 'paid' },
        { id: 'fr10', student: 'Kingsley Ekpensong', cls: 'SSS 3A', term: '1st Term', amount: 135000, status: 'paid' },
      ],
    },
    exams: [
      { id: 'ex01', title: 'First Term Continuous Assessment', term: '1st Term', date: 'this week', subjects: 9, status: 'scheduled', classAvg: 0 },
      { id: 'ex02', title: 'First Term Mock · JSS 3', term: '1st Term', date: 'next month', subjects: 9, status: 'scheduled', classAvg: 0 },
      { id: 'ex03', title: 'Common Entrance Prep · SS 3', term: '1st Term', date: 'Nov 12', subjects: 4, status: 'scheduled', classAvg: 0 },
      { id: 'ex04', title: 'Third Term Exam 2025/26', term: '3rd Term', date: 'closed', subjects: 9, status: 'done', classAvg: 74 },
    ],
    results: [
      { id: 'r01', name: 'Adaeze Oko', cls: 'JSS 1A', avg: 87, grade: 'A', rank: 1 },
      { id: 'r02', name: 'Uti Bassey', cls: 'JSS 1B', avg: 82, grade: 'A', rank: 3 },
      { id: 'r03', name: 'Chukwu Blessing', cls: 'JSS 1B', avg: 79, grade: 'B+', rank: 6 },
      { id: 'r04', name: 'Immaculata Udoh', cls: 'JSS 2A', avg: 88, grade: 'A', rank: 1 },
      { id: 'r05', name: 'Otobong Asuquo', cls: 'JSS 2B', avg: 76, grade: 'B+', rank: 9 },
      { id: 'r06', name: 'Efiong Etim', cls: 'JSS 2A', avg: 58, grade: 'C', rank: 19 },
      { id: 'r07', name: 'Mfoniso Edem', cls: 'JSS 3A', avg: 91, grade: 'A', rank: 1 },
      { id: 'r08', name: 'Chidinma Odu', cls: 'SSS 1A', avg: 84, grade: 'A', rank: 2 },
      { id: 'r09', name: 'Nnenna Asuquo', cls: 'SSS 2A', avg: 86, grade: 'A', rank: 1 },
      { id: 'r10', name: 'Orok Etuk', cls: 'SSS 2A', avg: 77, grade: 'B+', rank: 7 },
      { id: 'r11', name: 'Michael Eyo', cls: 'SSS 2B', avg: 55, grade: 'C', rank: 20 },
      { id: 'r12', name: 'Udeme Okon', cls: 'SSS 3A', avg: 93, grade: 'A', rank: 1 },
      { id: 'r13', name: 'Kingsley Ekpensong', cls: 'SSS 3A', avg: 80, grade: 'A', rank: 4 },
    ],
    admissions: [
      { id: 'ad01', name: 'Ibrahim Gana', appliedClass: 'JSS 1', status: 'pending', stage: 'Entrance test Sat' },
      { id: 'ad02', name: 'Ada Johnson', appliedClass: 'Creche', status: 'offered', stage: 'Offer sent · pay deposit' },
      { id: 'ad03', name: 'Temitope Ade', appliedClass: 'SSS 1', status: 'pending', stage: 'Docs review' },
      { id: 'ad04', name: 'Chiamaka Nwosu', appliedClass: 'Basic 4', status: 'enrolled', stage: 'Class placed' },
      { id: 'ad05', name: 'Yusuf Momoh', appliedClass: 'JSS 2', status: 'offered', stage: 'Offer sent · pay deposit' },
    ],
    announcements: [
      { id: 'an01', title: 'First Term CA begins this week', body: 'Continuous assessment runs Mon–Fri with timetables posted per class. Resits note goes out Friday.', time: '1d ago', audience: 'Parents & Students' },
      { id: 'an02', title: 'Entrance test this Saturday', body: 'New intake test holds at Block D hall, 9 AM sharp. Bring pencil, ruler and a photo.', time: '2d ago', audience: 'Applicants' },
      { id: 'an03', title: 'Fee payment windows open', body: '1st Term fees now payable in two tranches through CityPay. First tranche keeps the seat.', time: '3d ago', audience: 'Parents' },
      { id: 'an04', title: 'Carnival off-day announced', body: 'School closes Friday for the parade line-up. Home assembly moved to Thursday.', time: '5d ago', audience: 'School' },
    ],
    events: [
      { id: 'se01', title: 'Inter-house Sports & Carnival Games', date: 'Sat', time: '9:00 AM', venue: 'Hope Academy Field', tag: 'Sports' },
      { id: 'se02', title: 'Parents’ Forum · Term One', date: 'Fri 24th', time: '4:00 PM', venue: 'Assembly Hall', tag: 'Parents' },
      { id: 'se03', title: 'SSS 3 Career & Admissions Fair', date: 'Next month', time: '10:00 AM', venue: 'Block D Hall', tag: 'Guidance' },
    ],
    activity: [
      { id: 'ac-01', text: 'Admission offer sent to Ada Johnson (Creche)', time: 'Today, 9:15 AM', tone: 'ok' },
      { id: 'ac-02', text: 'CA timetables posted to all 10 classes', time: 'Today, 8:40 AM', tone: 'info' },
      { id: 'ac-03', text: '₦135,000 fee received from Nnenna Asuquo via CityPay', time: 'Yesterday', tone: 'ok' },
      { id: 'ac-04', text: 'Attendance at 124/124 — perfect Thursday', time: 'Yesterday', tone: 'ok' },
      { id: 'ac-05', text: 'Reminder: Efiong Etim (JSS 2A) below 90% attendance', time: '2d ago', tone: 'warn' },
    ],
    jobs: [
      {
        id: 'j-sc-01',
        orgId: 'org_hope_academy',
        orgName: 'Hope Academy Calabar',
        os: 'schoolos',
        title: 'Class Teacher · Junior Secondary',
        type: 'Full-time',
        category: 'School',
        area: 'Ikot Ansa',
        pay: '₦140,000/mo',
        posted: '2d ago',
        applicants: 11,
        spots: 2,
        desc: 'Lead a JSS form, teach English or Maths lines, and run one after-school club. Termly reporting through the SchoolOS board.',
        requirements: ['B.Ed or NCE + 3 years', 'Nigerian teacher qualification', 'Passion for structured routines'],
        perks: ['Fee concession for children', 'Term bonuses', 'Training budget'],
      },
      {
        id: 'j-sc-02',
        orgId: 'org_hope_academy',
        orgName: 'Hope Academy Calabar',
        os: 'schoolos',
        title: 'ICT & Coding Facilitator',
        type: 'Part-time',
        category: 'School',
        area: 'Ikot Ansa',
        pay: '₦75,000/mo',
        posted: '4d ago',
        applicants: 6,
        spots: 1,
        desc: 'Teach scratch-to-Web basics across JSS and SSS, and run the Saturday robotics club.',
        requirements: ['Comfortable with Scratch/HTML', 'Teaching patience', 'Saturday availability'],
        perks: ['Club equipment budget', 'Conference pass', 'Flexible hours'],
      },
      {
        id: 'j-sc-03',
        orgId: 'org_hope_academy',
        orgName: 'Hope Academy Calabar',
        os: 'schoolos',
        title: 'School Security Guard',
        type: 'Full-time',
        category: 'School',
        area: 'Ikot Ansa',
        pay: '₦55,000/mo',
        posted: '1w ago',
        applicants: 22,
        spots: 2,
        desc: 'Day and night roster at the gate and grounds. First aid basics provided at onboarding.',
        requirements: ['Valid ID & referral', 'Nights available (rotation)', 'Clear record'],
        perks: ['Uniform provided', 'Night allowance', 'Annual boots allowance'],
      },
      {
        id: 'j-sc-04',
        orgId: 'org_cypress_garden',
        orgName: 'Cypress Garden School',
        os: 'schoolos',
        title: 'Nursery Assistant',
        type: 'Full-time',
        category: 'School',
        area: 'Ekorinim',
        pay: '₦60,000/mo',
        posted: '3d ago',
        applicants: 9,
        spots: 1,
        desc: 'Support the creche and nursery rooms with routines, feeding and play-based learning.',
        requirements: ['Love of small humans', 'First aid certification (or willingness)', '8 AM–4 PM reliability'],
        perks: ['Meals on shift', 'Training days', 'Child care discount'],
      },
    ],
  },

  'cypress-garden-school': {
    orgId: 'org_cypress_garden',
    week: [42, 44, 43, 45, 41, 12, 8],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    students: [
      { id: 'cg-01', adm: 'CG-501', name: 'Afi Ekpo', cls: 'Creche', gender: 'F', guardian: 'Grace Bassey', attendance: 98, balance: 0, status: 'active' },
      { id: 'cg-02', adm: 'CG-502', name: 'Isoje Nya', cls: 'Nursery 2', gender: 'M', guardian: 'Ndifreke Nya', attendance: 95, balance: 0, status: 'active' },
      { id: 'cg-03', adm: 'CG-503', name: 'Uduak Ene', cls: 'Basic 2', gender: 'F', guardian: 'Kufre Ene', attendance: 92, balance: 12000, status: 'active' },
      { id: 'cg-04', adm: 'CG-504', name: 'Kingsley Edem', cls: 'Basic 4', gender: 'M', guardian: 'Anita Edem', attendance: 97, balance: 0, status: 'active' },
      { id: 'cg-05', adm: 'CG-505', name: 'Chidinma Odu', cls: 'Basic 5', gender: 'F', guardian: 'Comfort Odu', attendance: 94, balance: 0, status: 'active' },
      { id: 'cg-06', adm: 'CG-506', name: 'Ekanem Udo', cls: 'Basic 6', gender: 'F', guardian: 'Ngozi Udo', attendance: 96, balance: 0, status: 'active' },
      { id: 'cg-07', adm: 'CG-507', name: 'Ima Thompson', cls: 'JSS 2', gender: 'F', guardian: 'Uduak Thompson', attendance: 90, balance: 25000, status: 'active' },
      { id: 'cg-08', adm: 'CG-508', name: 'Okon Effiom', cls: 'JSS 3', gender: 'M', guardian: 'Akan Ekpe', attendance: 85, balance: 40000, status: 'probation' },
    ],
    teachers: [
      { id: 'cg-t01', name: 'Miss Emem Archibong', subject: 'Creche & Nursery Lead', classes: 'Creche–Nursery 2', phone: '0803 121 2121', status: 'active' },
      { id: 'cg-t02', name: 'Mr Bassey Udo', subject: 'Primary Class Teacher', classes: 'Basic 1–3', phone: '0805 343 4343', status: 'active' },
      { id: 'cg-t03', name: 'Mrs Nneka Effiong', subject: 'Primary Class Teacher', classes: 'Basic 4–6', phone: '0803 565 6565', status: 'active' },
      { id: 'cg-t04', name: 'Mr Aniekan Ekpo', subject: 'Secondary Math & Science', classes: 'JSS 1–3', phone: '0806 787 8787', status: 'active' },
    ],
    classes: [
      { id: 'cg-c01', name: 'Creche', level: 'Early Years', room: 'Garden Wing · Room 1', students: 8, teacher: 'Miss Emem Archibong' },
      { id: 'cg-c02', name: 'Nursery 2', level: 'Early Years', room: 'Garden Wing · Room 2', students: 9, teacher: 'Miss Emem Archibong' },
      { id: 'cg-c03', name: 'Basic 2', level: 'Primary', room: 'Main Block · Room 3', students: 12, teacher: 'Mr Bassey Udo' },
      { id: 'cg-c04', name: 'Basic 4', level: 'Primary', room: 'Main Block · Room 4', students: 13, teacher: 'Mrs Nneka Effiong' },
      { id: 'cg-c05', name: 'Basic 6', level: 'Primary', room: 'Main Block · Room 5', students: 14, teacher: 'Mrs Nneka Effiong' },
      { id: 'cg-c06', name: 'JSS 2–3', level: 'Secondary', room: 'Garden Block · Room 6', students: 16, teacher: 'Mr Aniekan Ekpo' },
    ],
    subjects: [
      { id: 'cg-su01', name: 'Early Literacy & Numeracy', classes: 'Creche–Nursery', teacherId: 'cg-t01' },
      { id: 'cg-su02', name: 'English & Mathematics', classes: 'Basic 1–3', teacherId: 'cg-t02' },
      { id: 'cg-su03', name: 'Verbal & Quantitative', classes: 'Basic 4–6', teacherId: 'cg-t03' },
      { id: 'cg-su04', name: 'Mathematics & Basic Science', classes: 'JSS 1–3', teacherId: 'cg-t04' },
    ],
    attendance: [
      { id: 'cg-at01', date: 'Mon', cls: 'School-wide', present: 42, absent: 1 },
      { id: 'cg-at02', date: 'Tue', cls: 'School-wide', present: 44, absent: 0 },
      { id: 'cg-at03', date: 'Wed', cls: 'School-wide', present: 43, absent: 1 },
      { id: 'cg-at04', date: 'Thu', cls: 'School-wide', present: 45, absent: 0 },
      { id: 'cg-at05', date: 'Fri', cls: 'School-wide', present: 41, absent: 2 },
    ],
    fees: {
      schedule: [
        { id: 'cg-fs01', term: 'First Term 2026/27', tuition: 78000, feeding: 21000, books: 9000, total: 108000 },
      ],
      records: [
        { id: 'cg-fr01', student: 'Afi Ekpo', cls: 'Creche', term: '1st Term', amount: 108000, status: 'paid' },
        { id: 'cg-fr02', student: 'Uduak Ene', cls: 'Basic 2', term: '1st Term', amount: 96000, status: 'partial' },
        { id: 'cg-fr03', student: 'Kingsley Edem', cls: 'Basic 4', term: '1st Term', amount: 108000, status: 'paid' },
        { id: 'cg-fr04', student: 'Ima Thompson', cls: 'JSS 2', term: '1st Term', amount: 83000, status: 'partial' },
        { id: 'cg-fr05', student: 'Okon Effiom', cls: 'JSS 3', term: '1st Term', amount: 68000, status: 'partial' },
      ],
    },
    exams: [
      { id: 'cg-ex01', title: 'Mid-Term Test · All classes', term: '1st Term', date: 'next week', subjects: 6, status: 'scheduled', classAvg: 0 },
      { id: 'cg-ex02', title: 'Common Entrance Mock · Basic 6', term: '1st Term', date: 'Nov 18', subjects: 2, status: 'scheduled', classAvg: 0 },
    ],
    results: [
      { id: 'cg-r01', name: 'Kingsley Edem', cls: 'Basic 4', avg: 81, grade: 'A', rank: 1 },
      { id: 'cg-r02', name: 'Chidinma Odu', cls: 'Basic 5', avg: 78, grade: 'B+', rank: 2 },
      { id: 'cg-r03', name: 'Ekanem Udo', cls: 'Basic 6', avg: 84, grade: 'A', rank: 1 },
      { id: 'cg-r04', name: 'Ima Thompson', cls: 'JSS 2', avg: 71, grade: 'B+', rank: 3 },
      { id: 'cg-r05', name: 'Okon Effiom', cls: 'JSS 3', avg: 54, grade: 'C', rank: 6 },
    ],
    admissions: [
      { id: 'cg-ad01', name: 'Mfon Bassey', appliedClass: 'Nursery 2', status: 'pending', stage: 'Saturday tour booked' },
      { id: 'cg-ad02', name: 'Daniel Archibong', appliedClass: 'Basic 1', status: 'offered', stage: 'Offer sent' },
    ],
    announcements: [
      { id: 'cg-an01', title: 'Saturday garden tours', body: 'Saturdays 10 AM sharp. Meet at the main gate; parents may book through CityOS.', time: '1d ago', audience: 'Applicants' },
      { id: 'cg-an02', title: 'Feeding menu change', body: 'Palm-oil rice now served with fish on Tuesdays based on parent feedback.', time: '2d ago', audience: 'Parents' },
    ],
    events: [
      { id: 'cg-se01', title: 'Open Garden Day', date: 'Sat 25th', time: '10:00 AM', venue: 'Cypress Garden Grounds', tag: 'Open Day' },
      { id: 'cg-se02', title: 'Basic 6 Graduation Prep', date: 'next month', time: '12:00 PM', venue: 'Garden Hall', tag: 'Graduation' },
    ],
    activity: [
      { id: 'cg-ac-01', text: 'Saturday tour booked for Mfon Bassey (Nursery 2)', time: 'Today', tone: 'ok' },
      { id: 'cg-ac-02', text: 'Feeding menu updated for next week', time: 'Yesterday', tone: 'info' },
      { id: 'cg-ac-03', text: 'Fee paid — Kingsley Edem confirmed Basic 4 seat', time: '2d ago', tone: 'ok' },
    ],
    jobs: [
      {
        id: 'j-sc-04',
        orgId: 'org_cypress_garden',
        orgName: 'Cypress Garden School',
        os: 'schoolos',
        title: 'Nursery Assistant',
        type: 'Full-time',
        category: 'School',
        area: 'Ekorinim',
        pay: '₦60,000/mo',
        posted: '3d ago',
        applicants: 9,
        spots: 1,
        desc: 'Support the creche and nursery rooms with routines, feeding and play-based learning.',
        requirements: ['Love of small humans', 'First aid certification (or willingness)', '8 AM–4 PM reliability'],
        perks: ['Meals on shift', 'Training days', 'Child care discount'],
      },
    ],
  },
};

export function getSchoolOSDataset(slug: string): SchoolOSDataSet | undefined {
  return SCHOOLOS_DATA[slug];
}

export function allSchoolOSOrgs(): { slug: string; orgName: string }[] {
  return Object.keys(SCHOOLOS_DATA).map((slug) => ({ slug, orgName: getOrg(slug)?.name ?? slug }));
}

export function gradeColor(grade: string): string {
  const map: Record<string, string> = {
    A: 'text-emerald-700 bg-emerald-50',
    'B+': 'text-teal-700 bg-teal-50',
    B: 'text-sky-700 bg-sky-50',
    C: 'text-amber-600 bg-amber-50',
    D: 'text-orange-600 bg-orange-50',
    F: 'text-red-600 bg-red-50',
  };
  return map[grade] ?? 'text-slate-600 bg-slate-100';
}