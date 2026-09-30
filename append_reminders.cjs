const fs = require('fs');
const content = `
import { createReminder, cancelReminder, listReminders as getReminders } from '../../intelligence/reminders';

export const setReminder: VoiceToolDefinition = {
  name: 'account.set_reminder',
  description: 'Create a reminder for the resident. Can be time-based or event-based.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      dueAt: { type: 'string', description: 'ISO string of the time to remind, if time-based' },
      entityType: { type: 'string', description: 'e.g. ORDER, DELIVERY, SERVICE' },
      entityReference: { type: 'string', description: 'The ID to watch if event-based' }
    },
    required: ['title']
  },
  execute: async (args, session) => {
    return await createReminder(
      session.user.personId, 
      args.title, 
      args.description, 
      args.dueAt ? new Date(args.dueAt) : undefined,
      args.entityType,
      args.entityReference
    );
  }
};

export const cancelReminderTool: VoiceToolDefinition = {
  name: 'account.cancel_reminder',
  description: 'Cancel an existing reminder.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      reminderId: { type: 'string' }
    },
    required: ['reminderId']
  },
  execute: async (args, session) => {
    return await cancelReminder(session.user.personId, args.reminderId);
  }
};

export const listRemindersTool: VoiceToolDefinition = {
  name: 'account.list_reminders',
  description: 'List active reminders for the resident.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: 'object' },
  execute: async (args, session) => {
    return await getReminders(session.user.personId, 'PENDING');
  }
};
`;
fs.appendFileSync('lib/voice/tools/impl/account.ts', content);
