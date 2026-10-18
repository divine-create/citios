import { getCanonicalJob, getCityJobs } from '@/app/actions/org';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Briefcase,
  ExternalLink,
  Building2,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { Pill } from '@/components/cityos/CityUI';
import { parseJobDescription, formatJobTypeLabel } from '@/lib/job-utils';

export default async function CityJobDetail({ id }: { id: string }) {
  const job = await getCanonicalJob(id);

  if (!job) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
          <Briefcase className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-ink">That role is not in the city graph.</h1>
        <Link
          href="/jobs"
          className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors"
        >
          Back to CityJobs
        </Link>
      </div>
    );
  }

  const orgName = job.organization?.name || 'Verified Employer';
  const orgDescription = (job.organization as any)?.description || null;
  const orgAddress = (job.organization as any)?.address || job.area || 'Calabar, Cross River State';
  const isCityOSProfileJob = Boolean((job as any).hasCityOSProfile);
  const parsed = parseJobDescription(job.description);

  const allJobs = await getCityJobs();
  const sameOrgJobs = allJobs
    .filter((r: any) => r.organizationId === job.organizationId && r.id !== job.id)
    .slice(0, 3);
  const sameCategoryJobs = allJobs
    .filter(
      (r: any) =>
        r.category === job.category &&
        r.organizationId !== job.organizationId &&
        r.id !== job.id
    )
    .slice(0, 3);

  const dateStr =
    typeof job.createdAt === 'string'
      ? new Date(job.createdAt).toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : job.createdAt instanceof Date
      ? job.createdAt.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently';

  const externalJobHref =
    parsed.applyUrl ||
    `https://www.google.com/search?q=${encodeURIComponent(
      `${job.title} ${orgName} Calabar job`
    )}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-teal-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All jobs in Calabar
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-teal-200" />
            </div>
            <Pill tone="orange">{formatJobTypeLabel(job.type)}</Pill>
            {job.category && (
              <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-bold text-teal-100">
                {job.category}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">{job.title}</h1>
          <p className="mt-1.5 text-teal-50/90 text-[14px] font-bold">
            Posted by: <span className="text-white underline decoration-teal-400/60 underline-offset-4">{orgName}</span>
          </p>

          <div className="mt-5 flex flex-wrap gap-4 text-[12px] font-bold text-teal-100/90">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-300" /> {job.area || 'Calabar, Cross River State'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-teal-300" /> {job.pay || 'Competitive'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-300" /> Posted {dateStr}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!isCityOSProfileJob ? (
              <a
                href={externalJobHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-teal-950 hover:bg-teal-50 text-sm font-black shadow-lg transition-colors"
              >
                See Job on {parsed.sourceName}
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : job.organization?.id ? (
              <Link
                href={`/org/${job.organization.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-teal-950 hover:bg-teal-50 text-sm font-black shadow-lg transition-colors"
              >
                View Company Profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-base font-black text-ink mb-2.5">About the role</h2>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
              {parsed.summary}
            </p>
          </section>

          {parsed.requirements.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-base font-black text-ink mb-3">
                Requirements & Qualifications
              </h2>
              <ul className="space-y-2.5">
                {parsed.requirements.map((req, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[13px] text-slate-600 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isCityOSProfileJob && (
            <section className="bg-teal-50/70 rounded-2xl border border-teal-100 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-black text-teal-950">
                    Posted by {orgName}
                  </p>
                  <p className="text-[12px] font-medium text-teal-800/80 mt-0.5">
                    Click below to view the full job posting and apply directly on {parsed.sourceName}.
                  </p>
                </div>
                <a
                  href={externalJobHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 text-white hover:bg-teal-900 text-xs font-black transition-colors shrink-0"
                >
                  See Job on {parsed.sourceName}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              {parsed.applyUrl && (
                <div className="pt-2 border-t border-teal-200/60 flex items-center gap-2 text-[11px] font-semibold text-teal-900 break-all">
                  <Globe className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <a
                    href={parsed.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-teal-700"
                  >
                    {parsed.applyUrl}
                  </a>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Company that posted this job
            </p>
            {isCityOSProfileJob && job.organization ? (
              <Link
                href={`/org/${job.organization.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-900 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{orgName}</p>
                  <p className="text-[10px] font-bold text-teal-700">Verified CityOS Business →</p>
                </div>
              </Link>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-900 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink leading-snug">{orgName}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{orgAddress}</p>
                  </div>
                </div>
                {orgDescription && (
                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    {orgDescription}
                  </p>
                )}
                <div className="pt-2">
                  <a
                    href={externalJobHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-800 hover:text-teal-950 underline underline-offset-2"
                  >
                    See job posting on {parsed.sourceName}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <div className="mt-3 text-[11px] font-bold text-slate-400 space-y-1.5">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>{job.area || 'Calabar, Cross River'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>{job.pay || 'Competitive'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Posted {dateStr}</span>
              </p>
            </div>
          </div>

          {sameOrgJobs.length ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                More roles from {orgName}
              </p>
              <div className="space-y-2">
                {sameOrgJobs.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/jobs/${r.id}`}
                    className="block p-3 rounded-xl hover:bg-teal-50/60 transition-colors border border-slate-50"
                  >
                    <p className="text-[12px] font-black text-ink leading-snug">{r.title}</p>
                    <p className="text-[10px] font-bold text-teal-800 mt-0.5">
                      {r.pay || 'Competitive'} • {r.area || 'Calabar'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {sameCategoryJobs.length ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Similar roles in {job.category}
              </p>
              <div className="space-y-2">
                {sameCategoryJobs.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/jobs/${r.id}`}
                    className="block p-3 rounded-xl hover:bg-teal-50/60 transition-colors border border-slate-50"
                  >
                    <p className="text-[12px] font-black text-ink leading-snug">{r.title}</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {r.organization?.name}
                    </p>
                    <p className="text-[10px] font-bold text-teal-800 mt-0.5">
                      {r.pay || 'Competitive'}
                    </p>
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