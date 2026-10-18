export const JOB_CATEGORIES = [
  'All',
  'Banking & Finance',
  'Sales & Marketing',
  'Engineering & Manufacturing',
  'Healthcare & Pharma',
  'Hospitality & Food',
  'Tech & Media',
  'Logistics & Agro',
  'Government & NGO',
] as const;

export type JobCategoryName = (typeof JOB_CATEGORIES)[number];

export interface ParsedJobDetails {
  summary: string;
  requirements: string[];
  applyUrl: string | null;
  sourceName: string;
}

/**
 * Extracts structured summary, bulleted requirements, and external application URL
 * from a Job's description field.
 */
export function parseJobDescription(rawDescription?: string | null): ParsedJobDetails {
  if (!rawDescription) {
    return {
      summary: 'No description provided.',
      requirements: [],
      applyUrl: null,
      sourceName: 'Job Portal',
    };
  }

  let text = rawDescription.trim();
  let applyUrl: string | null = null;

  // Match "APPLY_URL: https://..." or "Application Link: https://..."
  const urlMatch = text.match(/(?:APPLY_URL|Application Link|Apply Link):\s*(https?:\/\/\S+)/i);
  if (urlMatch) {
    applyUrl = urlMatch[1].trim();
    text = text.replace(urlMatch[0], '').trim();
  } else {
    const anyUrlMatch = text.match(/https?:\/\/[^\s)]+/i);
    if (anyUrlMatch) {
      applyUrl = anyUrlMatch[0].trim();
    }
  }

  let sourceName = 'External Portal';
  if (applyUrl) {
    if (applyUrl.includes('hotnigerianjobs.com')) sourceName = 'HotNigerianJobs';
    else if (applyUrl.includes('myjobmag.com')) sourceName = 'MyJobMag';
    else if (applyUrl.includes('jobberman.com')) sourceName = 'Jobberman';
    else if (applyUrl.includes('crossriverstate.gov.ng')) sourceName = 'CRS Civil Service Portal';
    else if (applyUrl.includes('ngcareers.com')) sourceName = 'NgCareers';
    else if (applyUrl.includes('indeed.com')) sourceName = 'Indeed Nigeria';
    else sourceName = 'Official Application Portal';
  }

  const reqSplit = text.split(/\n*Requirements & Qualifications:\n*/i);
  const summary = reqSplit[0]?.trim() || text;
  const requirements: string[] = [];

  if (reqSplit[1]) {
    const lines = reqSplit[1]
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    requirements.push(...lines);
  }

  return {
    summary,
    requirements,
    applyUrl,
    sourceName,
  };
}

export function formatJobTypeLabel(type?: string | null): string {
  if (!type) return 'Full-Time';
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
