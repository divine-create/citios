'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  UserRound,
  ChevronRight,
  Store,
  BookOpen,
  Receipt,
} from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { StatTile, Pill, SectionHead } from '@/components/cityos/CityUI';
import { getSchoolAdminData } from '@/lib/actions/school';
import CityOSLive from '@/components/cityos/CityOSLive';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Students', 'Teachers', 'Classes', 'Fees'] as const;
type Tab = (typeof TABS)[number];

type SchoolData = NonNullable<Awaited<ReturnType<typeof getSchoolAdminData>>>;

export default function SchoolOSWorkspace({ slug }: { slug: string }) {
  const { setExperience } = useExperience();
  const [tab, setTab] = useState<Tab>('Overview');
  const [data, setData] = useState<SchoolData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        // getSchoolAdminData resolves the school by id and returns null when
        // the id is not a SCHOOL organization.
        const d = await getSchoolAdminData(slug);
        if (!live) return;
        if (!d) {
          setNotFound(true);
        } else {
          setData(d);
        }
      } catch {
        // Non-members: the server action path requires membership upstream;
        // treat transport/permission failures as an honest denial.
        if (live) setDenied(true);
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 text-[12px] font-bold text-slate-400">
        Loading workspace…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏫</p>
        <h1 className="text-lg font-black text-ink">Workspace not found.</h1>
        <p className="text-sm text-slate-500">This school does not exist on CityOS.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🔒</p>
        <h1 className="text-lg font-black text-ink">Members only</h1>
        <p className="text-sm text-slate-500">You are not a member of this school&apos;s workspace.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  const { school, settings, students, staff, courses, feeInvoices } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-teal-900 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {school.name.slice(0, 1)}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="teal">SchoolOS workspace</Pill>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{settings?.name || school.name}</h1>
              <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">
                {settings ? `${settings.address || school.address || ''}${settings.lga ? ` · ${settings.lga}` : ''}` : school.address || 'CityOS school'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/org/${school.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> Public page
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

      <CityOSLive orgId={school.id} name={school.name} />

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
        ))}
      </div>

      {tab === 'Overview' ? <Overview data={data} /> : null}
      {tab === 'Students' ? <Students data={students} /> : null}
      {tab === 'Teachers' ? <Teachers data={staff} /> : null}
      {tab === 'Classes' ? <Classes data={courses} /> : null}
      {tab === 'Fees' ? <Fees data={feeInvoices} /> : null}
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

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
      <p className="text-[13px] font-black text-ink">Nothing here yet</p>
      <p className="text-[11px] text-slate-400 font-medium mt-1">{text}</p>
    </div>
  );
}

function Overview({ data }: { data: SchoolData }) {
  const { students, staff, courses, feeInvoices, settings, activeYear } = data;
  const unpaid = feeInvoices.filter((f: any) => f.status !== 'PAID').length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Students" value={String(students.length)} icon={<Users className="w-4 h-4" />} />
        <StatTile label="Teachers" value={String(staff.length)} icon={<UserRound className="w-4 h-4" />} tone="orange" />
        <StatTile label="Classes" value={String(courses.length)} icon={<BookOpen className="w-4 h-4" />} tone="blue" />
        <StatTile label="Open fee invoices" value={String(unpaid)} icon={<Receipt className="w-4 h-4" />} tone="emerald" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="School profile" sub={activeYear ? `Academic year ${activeYear.name || activeYear.year || ''}` : 'No academic year set'} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[12px] font-medium">
          {[
            { label: 'Short name', value: settings?.shortName || '—' },
            { label: 'Phone', value: settings?.phone || '—' },
            { label: 'Email', value: settings?.email || '—' },
            { label: 'State', value: settings?.state || '—' },
            { label: 'LGA', value: settings?.lga || '—' },
            { label: 'Address', value: settings?.address || '—' },
          ].map((row) => (
            <div key={row.label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
              <p className="font-black text-ink mt-0.5 truncate">{row.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Students({ data }: { data: SchoolData['students'] }) {
  if (!data || data.length === 0) return <EmptyNote text="No students enrolled yet. Admissions happen from the school portal." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((s: any) => (
        <div key={s.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {`${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}` || '?'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{`${s.firstName} ${s.lastName}`}</p>
            <p className="text-[10px] font-bold text-slate-400">{s.admissionNumber || s.id}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Teachers({ data }: { data: SchoolData['staff'] }) {
  if (!data || data.length === 0) return <EmptyNote text="No teachers yet. Add staff from the school portal." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((t: any) => (
        <div key={t.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0">
            {`${t.firstName?.[0] ?? ''}${t.lastName?.[0] ?? ''}` || '?'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{`${t.firstName} ${t.lastName}`}</p>
            <p className="text-[11px] font-bold text-slate-400">{t.email || 'No email on file'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Classes({ data }: { data: SchoolData['courses'] }) {
  if (!data || data.length === 0) return <EmptyNote text="No classes yet. Create classes from the school portal." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((c: any) => (
        <div key={c.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{c.name}</p>
            <p className="text-[10px] font-bold text-slate-400">{`${c.classTeachers?.length ?? 0} teacher(s)`}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Fees({ data }: { data: SchoolData['feeInvoices'] }) {
  if (!data || data.length === 0) return <EmptyNote text="No fee invoices yet. Invoices appear when the bursar bills students." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((f: any) => (
        <div key={f.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{f.title || f.invoiceNumber || f.id}</p>
            <p className="text-[10px] font-bold text-slate-400">{f.dueDate ? `Due ${new Date(f.dueDate).toLocaleDateString()}` : 'No due date'}</p>
          </div>
          <span className="text-[12px] font-black text-ink">{f.totalAmount != null ? fmtNaira(f.totalAmount) : '—'}</span>
          <Pill tone={f.status === 'PAID' ? 'green' : 'orange'}>{f.status || 'PENDING'}</Pill>
        </div>
      ))}
    </div>
  );
}
