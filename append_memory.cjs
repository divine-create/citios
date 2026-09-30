const fs = require('fs');
const content = `
import { rememberPreference as dbRemember, forgetPreference as dbForget, listPreferences as dbListPreferences } from '../../intelligence/memory';

export const rememberPreference: VoiceToolDefinition = {
  name: 'account.remember_preference',
  description: 'Store a resident\\'s preference or routine.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: ['PREFERENCE', 'ROUTINE', 'ACCESSIBILITY', 'FOOD_PREFERENCE', 'SHOPPING_PREFERENCE', 'LOCATION_PREFERENCE', 'NOTIFICATION_PREFERENCE'] },
      key: { type: 'string', description: 'A short, stable identifier for this memory, e.g. seating' },
      value: { type: 'string', description: 'The value of the preference, e.g. outdoor' }
    },
    required: ['category', 'key', 'value']
  },
  execute: async (args, session) => {
    return await dbRemember(session.user.personId, args.category, args.key, args.value);
  }
};

export const forgetPreference: VoiceToolDefinition = {
  name: 'account.forget_preference',
  description: 'Forget a resident\\'s previously saved preference.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      key: { type: 'string' }
    },
    required: ['category', 'key']
  },
  execute: async (args, session) => {
    return await dbForget(session.user.personId, args.category, args.key);
  }
};

export const listPreferences: VoiceToolDefinition = {
  name: 'account.list_preferences',
  description: 'List all explicitly saved preferences and routines for the resident.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Optional filter by category' }
    }
  },
  execute: async (args, session) => {
    return await dbListPreferences(session.user.personId, args.category);
  }
};
`;
fs.appendFileSync('lib/voice/tools/impl/account.ts', content);
