import { VoiceToolDefinition } from '../../core/policy';

export const searchEvents: VoiceToolDefinition = {
  name: 'events.search',
  description: 'Search for upcoming events in the city by keyword, topic, or date.',
  domain: 'events',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false, // Public events can be searched
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search keywords, e.g., "music", "festival", or "this weekend"' },
      limit: { type: 'number', description: 'Max number of results to return (default 5)' }
    }
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    
    const events = await db.orm.public.Event.all();
    
    const filtered = args.query 
       ? events.filter(e => e.title.toLowerCase().includes(args.query.toLowerCase()) || (e.description && e.description.toLowerCase().includes(args.query.toLowerCase())))
       : events;

    return {
      ok: true,
      data: filtered.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
        location: e.location,
        price: e.price,
        capacity: e.capacity
      }))
    };
  }
};

export const getEvent: VoiceToolDefinition = {
  name: 'events.get',
  description: 'Get detailed information about a specific event using its ID.',
  domain: 'events',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      event_id: { type: 'string', description: 'The unique ID of the event' }
    },
    required: ['event_id']
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    const event = await db.orm.public.Event.where({ id: args.event_id }).all().first();
    
    if (!event) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Event not found.` } };
    }

    const org = await db.orm.public.Organization.where({ id: event.organizationId }).all().first();

    return {
      ok: true,
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        price: event.price,
        capacity: event.capacity,
        organizer: org?.name || 'Unknown Organizer'
      }
    };
  }
};
