import { VoiceToolDefinition } from '../../core/policy';

export const searchJobs: VoiceToolDefinition = {
  name: 'jobs.search',
  description: 'Search for job opportunities in the city by keyword, location, or category.',
  domain: 'jobs',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: 'Search term for title or description (e.g. "software", "chef")' },
      location: { type: 'string', description: 'The area or location' },
      category: { type: 'string', description: 'Job category' }
    }
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    const jobs = await db.orm.public.Job.all();
    
    let filtered = jobs;
    if (args.keyword) {
      filtered = filtered.filter(j => j.title.toLowerCase().includes(args.keyword.toLowerCase()) || (j.description && j.description.toLowerCase().includes(args.keyword.toLowerCase())));
    }
    if (args.location) {
      filtered = filtered.filter(j => j.area && j.area.toLowerCase().includes(args.location.toLowerCase()));
    }
    if (args.category) {
      filtered = filtered.filter(j => j.category && j.category.toLowerCase() === args.category.toLowerCase());
    }

    return {
      ok: true,
      data: filtered.map(j => ({
        id: j.id,
        title: j.title,
        type: j.type,
        pay: j.pay,
        area: j.area,
        category: j.category
      })).slice(0, 5)
    };
  }
};

export const getJob: VoiceToolDefinition = {
  name: 'jobs.get',
  description: 'Get detailed information about a specific job posting.',
  domain: 'jobs',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      job_id: { type: 'string', description: 'The unique ID of the job' }
    },
    required: ['job_id']
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    const job = await db.orm.public.Job.where({ id: args.job_id }).all().first();
    
    if (!job) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Job not found.` } };
    }

    const org = await db.orm.public.Organization.where({ id: job.organizationId }).all().first();

    return {
      ok: true,
      data: {
        id: job.id,
        title: job.title,
        description: job.description,
        type: job.type,
        pay: job.pay,
        area: job.area,
        category: job.category,
        company: org?.name || 'Unknown Company'
      }
    };
  }
};
