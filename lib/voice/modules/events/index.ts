import { VoiceModule } from '../../core/policy';
import { searchEvents, getEvent } from '../../tools/impl/events';

export const EventsModule: VoiceModule = {
  id: 'events',
  name: 'CityEvents',
  description: 'Discover and retrieve information about upcoming local events.',
  version: '1.0.0',
  enabled: true,
  tools: [searchEvents, getEvent],
  authorize: async (session) => {
    // Basic module-level authorization.
    // Anyone with a valid session can browse public events.
    return !!session?.user?.personId;
  },
  mapError: (err) => {
    if (err.message.includes('NOT_FOUND')) return { code: 'NOT_FOUND', message: err.message };
    return { code: 'EVENTS_ERROR', message: err.message };
  }
};
