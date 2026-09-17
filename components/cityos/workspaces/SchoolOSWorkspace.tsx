'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  UserRound,
  School,
  CalendarDays,
  Wallet,
  FileSpreadsheet,
  ClipboardPlus,
  Megaphone,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Star as StarIcon,
  CalendarDays as CalendarIcon,
} from 'lucide-react';
import { getOrg } from '@/lib/demo/universe/orgs';
import { getSchoolOSDataset, gradeColor, type SchoolOSDataSet } from '@/lib/demo/universe/schoolos';
import { fmtNaira } from '@/lib/demo/cityos';
import { StatTile, Pill, SectionHead, DemoBanner } from '@/components/cityos/CityUI';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Students', 'Teachers', 'Classes', 'Attendance', 'Fees', 'Exams & Results', 'Admissions', 'Jobs'] as const;
type Tab = (typeof TABS)[number];

export default function SchoolOSWorkspace({ slug }: { slug: string }) {
  const data = getSchoolOSDataset(slug);
  const org = getOrg(slug);
  const { setExperience } = useExperience();
  const [tab, setTab] = useState<Tab>('Overview');

  if (!data || !org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏫</p>
        <h1 className="text-lg font-black text-ink">No SchoolOS demo at this academy.</h1>
        <Link href="/demo/access" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Demo access
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-teal-900 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {org.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="teal">SchoolOS workspace</Pill>
                <Pill tone="teal">Accredited</Pill>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{org.name}</h1>
              <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{`${org.address} · school session in progress`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/demo/access"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Demo access
            </Link>
            <button
              onClick={() => setExperience('resident')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-teal-900 text-[11px] font-black hover:bg-teal-50 transition-colors"
            >
              Switch experience <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
        ))}
      </div>

      {tab === 'Overview' ? <Overview data={data} /> : null}
      {tab === 'Students' ? <Students data={data} /> : null}
      {tab === 'Teachers' ? <Teachers data={data} /> : null}
      {tab === 'Classes' ? <Classes data={data} /> : null}
      {tab === 'Attendance' ? <Attendance data={data} /> : null}
      {tab === 'Fees' ? <Fees data={data} /> : null}
      {tab === 'Exams & Results' ? <Exams data={data} /> : null}
      {tab === 'Admissions' ? <Admissions data={data} /> : null}
      {tab === 'Jobs' ? <Jobs data={data} /> : null}

      <DemoBanner />
    </div>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ring-1',
        active ? 'bg-teal-800 text-white ring-teal-800 shadow-sm' : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300',
      )}
    >
      {children}
    </button>
  );
}

function Overview({ data }: { data: SchoolOSDataSet }) {
  const today = data.week[3]; // Thursday peak
  const outstanding = data.students.reduce((s, st) => s + st.balance, 0);
  const collected = data.fees.records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const lowAttendance = data.students.filter((s) => s.status === 'probation').length;
  const max = Math.max(...data.week);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Students on roll" value={String(data.students.length)} delta={`${data.classes.length} classes`} icon={<Users className="w-4 h-4" />} />
        <StatTile label="Attendance today" value={String(today)} delta={`${data.attendance[3]?.absent ?? 0} absent`} icon={<CalendarDays className="w-4 h-4" />} tone="orange" />
        <StatTile label="Fees collected" value={fmtNaira(collected)} delta="via CityPay & bank" icon={<Wallet className="w-4 h-4" />} tone="blue" />
        <StatTile label="Fees outstanding" value={fmtNaira(outstanding)} delta={`${lowAttendance} on probation watch`} icon={<FileSpreadsheet className="w-4 h-4" />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Attendance this week" sub="School-wide registers" />
          <div className="flex items-end gap-2.5 h-36">
            {data.week.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-black text-teal-800">{v}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-800 to-teal-500 hover:opacity-80 transition-opacity" style={{ height: `${(v / max) * 100}%` }} />
                <span className="text-[9px] font-bold text-slate-400">{data.labels[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Announcements" sub="Latest notice, as posted" />
          <div className="space-y-3">
            {data.announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <p className="text-[12px] font-black text-ink leading-snug">{a.title}</p>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-snug mt-1 line-clamp-2">{a.body}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1.5">{`${a.time} · ${a.audience}`}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="School calendar" sub="Upcoming, from the registrar" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.events.map((e) => (
            <div key={e.id} className="rounded-xl ring-1 ring-slate-100 p-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </span>
                <Pill tone="slate">{e.tag}</Pill>
              </div>
              <p className="text-[13px] font-black text-ink mt-3 leading-snug">{e.title}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{`${e.date} · ${e.time} · ${e.venue}`}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Students({ data }: { data: SchoolOSDataSet }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <span className="col-span-4">Student</span>
        <span className="col-span-2">Class</span>
        <span className="col-span-2">Guardian</span>
        <span className="col-span-2 text-center">Attendance</span>
        <span className="col-span-2 text-right">Balance</span>
      </div>
      <div className="divide-y divide-slate-50">
        {data.students.map((s) => (
          <div key={s.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center px-5 py-3">
            <div className="col-span-2 md:col-span-4 flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-ink truncate">{s.name}</p>
                <p className="text-[9px] font-bold text-slate-400">{s.adm} · {s.gender}</p>
              </div>
            </div>
            <span className="hidden md:block md:col-span-2 text-[11px] font-bold text-slate-500">{s.cls}</span>
            <span className="col-span-1 md:col-span-2 hidden md:block text-[11px] font-medium text-slate-500 truncate">{s.guardian}</span>
            <div className="col-span-1 md:col-span-2 text-center">
              <Pill tone={s.attendance >= 95 ? 'green' : s.attendance >= 90 ? 'orange' : 'red'}>{`${s.attendance}%`}</Pill>
            </div>
            <div className="col-span-1 md:col-span-2 text-right">
              <span className={cn('text-[12px] font-black', s.balance > 0 ? 'text-amber-600' : 'text-emerald-600')}>{s.balance === 0 ? 'Clear' : fmtNaira(s.balance)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Teachers({ data }: { data: SchoolOSDataSet }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.teachers.map((t) => (
        <div key={t.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {t.name.split(' ').map((w) => w[0]).filter((_, i) => i <= 1).join('')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{t.name}</p>
            <p className="text-[10px] font-bold text-slate-400">{`${t.subject} · ${t.classes}`}</p>
          </div>
          <span className="hidden sm:block text-[10px] font-bold text-slate-400">{t.phone}</span>
          <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider', t.status === 'active' ? 'text-emerald-600' : 'text-slate-400')}>
            <span className={cn('w-2 h-2 rounded-full', t.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            {t.status === 'active' ? 'Teaching' : 'On leave'}
          </span>
        </div>
      ))}
    </div>
  );
}

function Classes({ data }: { data: SchoolOSDataSet }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.classes.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <School className="w-4 h-4" />
            </span>
            <Pill tone="slate">{c.level}</Pill>
          </div>
          <p className="mt-3 text-[15px] font-black text-ink">{c.name}</p>
          <p className="text-[11px] font-bold text-slate-400">{`${c.room} · ${c.students} students`}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-2">Class teacher: <span className="font-black text-teal-800">{c.teacher}</span></p>
        </div>
      ))}
    </div>
  );
}

function Attendance({ data }: { data: SchoolOSDataSet }) {
  const max = Math.max(...data.week);
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Daily register" sub="Present vs absent, school-wide" />
        <div className="space-y-4">
          {data.attendance.map((a) => (
            <div key={a.id} className="flex items-center gap-3">
              <span className="w-12 text-[11px] font-black text-slate-600">{a.date}</span>
              <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden flex">
                <div className="h-full bg-teal-600" style={{ width: `${(a.present / max) * 100}%` }} />
                <div className="h-full bg-orange-400" style={{ width: `${(a.absent / max) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 w-24 text-right">{`${a.present} / ${a.absent} abs`}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 flex items-start gap-3">
        <Megaphone className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
        <p className="text-[12px] font-medium text-orange-800 leading-relaxed">
          {`${data.students.filter((s) => s.status === 'probation').length} students flagged below the attendance threshold. Counsellors see the same list in Guidance.`}
        </p>
      </div>
    </div>
  );
}

function Fees({ data }: { data: SchoolOSDataSet }) {
  const allDue = data.fees.records.reduce((s, r) => s + r.amount, 0);
  const paid = data.fees.records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const collected = Math.round((paid / allDue) * 100);
  const meta: Record<string, { label: string; tone: 'green' | 'orange' | 'red' }> = {
    paid: { label: 'Paid', tone: 'green' },
    partial: { label: 'Partial', tone: 'orange' },
    due: { label: 'Due', tone: 'red' },
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.fees.schedule.map((fs) => (
          <div key={fs.id} className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{fs.term}</p>
            <div className="mt-3 space-y-1.5 text-[12px] font-bold text-slate-600">
              <p className="flex justify-between"><span>Tuition</span><span>{fmtNaira(fs.tuition)}</span></p>
              <p className="flex justify-between"><span>Feeding</span><span>{fmtNaira(fs.feeding)}</span></p>
              <p className="flex justify-between"><span>Books</span><span>{fmtNaira(fs.books)}</span></p>
            </div>
            <p className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[14px] font-black text-teal-800">
              <span>Total</span><span>{fmtNaira(fs.total)}</span>
            </p>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <SectionHead title="Collection status" sub="First term · 10 sampled students" />
          <span className="text-[13px] font-black text-teal-800">{collected}% collected</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-5">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400" style={{ width: `${collected}%` }} />
        </div>
        <div className="divide-y divide-slate-50">
          {data.fees.records.map((r) => {
            const m = meta[r.status];
            return (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-ink truncate">{r.student}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${r.cls} · ${r.term}`}</p>
                </div>
                <span className="text-[12px] font-black text-ink">{fmtNaira(r.amount)}</span>
                <Pill tone={m.tone}>{m.label}</Pill>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Exams({ data }: { data: SchoolOSDataSet }) {
  const top = [...data.results].sort((a, b) => b.avg - a.avg).slice(0, 5);
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {data.exams.map((e) => (
          <div key={e.id} className="px-5 py-4 flex items-center gap-3 flex-wrap">
            <span className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-ink truncate">{e.title}</p>
              <p className="text-[10px] font-bold text-slate-400">{`${e.term} · ${e.subjects} subjects`}</p>
            </div>
            {e.classAvg ? <span className="text-[11px] font-black text-teal-800">{`class avg ${e.classAvg}%`}</span> : null}
            <Pill tone={e.status === 'scheduled' ? 'orange' : 'green'}>{e.status === 'scheduled' ? `Scheduled · ${e.date}` : 'Closed'}</Pill>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Result leaderboard" sub="Last results · sampled classes" />
        <div className="space-y-3">
          {top.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-6 text-[12px] font-black text-slate-400 text-center">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">{r.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{`${r.cls} · rank ${r.rank}`}</p>
              </div>
              <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${r.avg}%` }} />
              </div>
              <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black w-8 text-center', gradeColor(r.grade))}>{r.grade}</span>
              <span className="text-[12px] font-black text-ink w-10 text-right">{r.avg}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Admissions({ data }: { data: SchoolOSDataSet }) {
  const meta: Record<string, { label: string; tone: 'orange' | 'blue' | 'green' }> = {
    pending: { label: 'In review', tone: 'orange' },
    offered: { label: 'Offer sent', tone: 'blue' },
    enrolled: { label: 'Enrolled', tone: 'green' },
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.admissions.map((a) => {
        const m = meta[a.status];
        return (
          <div key={a.id} className="px-5 py-4 flex items-center gap-3 flex-wrap">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-700 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
              {a.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-ink truncate">{a.name}</p>
              <p className="text-[10px] font-bold text-slate-400">{`Applying to ${a.appliedClass} · ${a.stage}`}</p>
            </div>
            <Pill tone={m.tone}>{m.label}</Pill>
          </div>
        );
      })}
    </div>
  );
}

function Jobs({ data }: { data: SchoolOSDataSet }) {
  return (
    <div className="space-y-4">
      <SectionHead title={`${data.jobs.length} open roles`} sub="Each vacancy posts to the city job board" more="Open CityJobs" moreHref="/jobs" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.jobs.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-black text-ink">{j.title}</p>
              <Pill tone="blue">{j.type}</Pill>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{`${j.area} · ${j.posted}`}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-black text-teal-800">{j.pay}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 ml-auto"><Briefcase className="w-3 h-3" /> {j.applicants} applicants</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}