import { VoiceModule } from '../../core/policy';
import { searchJobs, getJob } from '../../tools/impl/jobs';

export const JobsModule: VoiceModule = {
  id: 'jobs',
  name: 'CityJobs',
  description: 'Find employment opportunities across the city.',
  version: '1.0.0',
  enabled: true,
  tools: [searchJobs, getJob],
  authorize: async (session) => {
    return !!session?.user?.personId;
  },
  mapError: (err) => {
    if (err.message.includes('NOT_FOUND')) return { code: 'NOT_FOUND', message: err.message };
    return { code: 'JOBS_ERROR', message: err.message };
  }
};
