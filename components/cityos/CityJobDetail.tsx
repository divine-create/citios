import { getCanonicalJob, checkJobApplication, toggleJobApplication, getCityJobs } from '@/app/actions/org';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, Check, MapPin, Users, Clock, Briefcase, Send } from 'lucide-react';
import { SectionHead, Pill } from '@/components/cityos/CityUI';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function CityJobDetail({ id }: { id: string }) {
  const job = await getCanonicalJob(id);
  const session = await getServerSession(authOptions);

  if (!job) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">??</p>
        <h1 className="text-lg font-black text-ink">That role is not in the city graph.</h1>
        <Link href="/jobs" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to CityJobs
        </Link>
      </div>
    );
  }

  let applied = false;
  if (session?.user?.personId) {
    const app = await checkJobApplication(id);
    if (app) applied = true;
  }

  const toggleAction = async () => {
    'use server';
    await toggleJobApplication(id);
    revalidatePath(`/jobs/${id}`);
  };

  const orgName = job.organization?.name || 'Organization';
  
  // Find related jobs conceptually
  const allJobs = await getCityJobs();
  const related = allJobs.filter((r: any) => r.organizationId === job.organizationId && r.id !== job.id).slice(0, 2);

  const dateStr = typeof job.createdAt === 'string' ? new Date(job.createdAt).toLocaleDateString() : job.createdAt.toString();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-teal-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All jobs
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">??</span>
            <Pill tone="orange">{job.type.replace('_', ' ')}</Pill>
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">{job.title}</h1>
          <p className="mt-1.5 text-teal-50/85 text-[13px] font-medium">{`${orgName} ? ${job.category || 'General'}`}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-[12px] font-bold text-teal-100/90">
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.area || 'Remote'}</span>
            <span className="inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.pay || 'Unspecified'}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {dateStr}</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <form action={toggleAction}>
              <button
                type="submit"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black shadow-lg transition-colors ${
                  applied ? 'bg-emerald-500 text-white' : 'bg-white text-teal-950 hover:bg-teal-50'
                }`}
              >
                {applied ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {applied ? 'Application Sent' : 'Apply with CityProfile'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-base font-black text-ink mb-2">About the role</h2>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">{job.description || 'No description provided.'}</p>
          </section>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Hiring organization</p>
            {job.organization ? (
              <Link href={`/org/${job.organization.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors">
                <span className="text-2xl">??</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{job.organization.name}</p>
                  <p className="text-[10px] font-bold text-slate-400">{job.area || 'Local'}</p>
                </div>
              </Link>
            ) : null}
            <div className="mt-3 text-[11px] font-bold text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-teal-700" /> {job.area || 'Remote'}</p>
              <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-teal-700" /> Posted {dateStr}</p>
            </div>
          </div>

          {related.length ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">More from {orgName}</p>
              <div className="space-y-2">
                {related.map((r: any) => (
                  <Link key={r.id} href={`/jobs/${r.id}`} className="block p-3 rounded-xl hover:bg-teal-50/60 transition-colors">
                    <p className="text-[12px] font-black text-ink leading-snug">{r.title}</p>
                    <p className="text-[10px] font-bold text-teal-800 mt-0.5">{r.pay} ? {r.area}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}