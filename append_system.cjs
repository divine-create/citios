const fs = require('fs');
const content = `
import { buildResidentContext } from '../../intelligence/context-builder';

export const getDailyBrief: VoiceToolDefinition = {
  name: 'system.get_daily_brief',
  description: 'Get a summary of what the resident needs to know today (active deliveries, orders, recent changes, reminders, preferences).',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: 'object' },
  execute: async (args, session) => {
    const ctx = await buildResidentContext(session.user.personId);
    return { 
      ok: true, 
      data: { 
        reminders: ctx.reminders, 
        recentChanges: ctx.recentChanges, 
        deliveries: ctx.activeDeliveries, 
        services: ctx.activeServiceRequests,
        preferences: ctx.preferences
      } 
    };
  }
};

export const getRecentChanges: VoiceToolDefinition = {
  name: 'system.get_recent_changes',
  description: 'Check for any updates or changes (e.g. order status changes, service updates) since the user last checked.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: 'object' },
  execute: async (args, session) => {
    const ctx = await buildResidentContext(session.user.personId);
    return { 
      ok: true, 
      data: { changes: ctx.recentChanges } 
    };
  }
};
`;
fs.appendFileSync('lib/voice/tools/impl/system.ts', content);
