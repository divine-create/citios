import { VoiceToolDefinition } from '../../core/policy';
import { updateVoiceContext } from '../../core/context';
import { db } from '@/src/prisma/db';

export const rememberPreference: VoiceToolDefinition = {
  name: 'remember_preference',
  description: 'Saves a persistent preference for the resident (e.g., favorite food, preferred delivery address). Ask for consent before saving sensitive preferences.',
  domain: 'system',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    required: ["key", "value"],
    properties: {
      key: { type: "string", description: "The category of the preference (e.g., 'dietary', 'language', 'favorite_store')" },
      value: { type: "string", description: "The value of the preference to remember." }
    }
  },
  execute: async (args, session) => {
    // In a real CityOS implementation, this would save to a formal 'ResidentPreferences' table.
    // For now, we update the existing ResidentProfile model's 'interests' field conceptually,
    // or store it in a safe JSON column if added to the schema.
    const profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();
    
    if (profile) {
      let currentInterests = [];
      if (profile.interests) {
        try {
          currentInterests = JSON.parse(profile.interests);
        } catch(e) {}
      }
      
      const prefString = `${args.key}: ${args.value}`;
      if (!currentInterests.includes(prefString)) {
        currentInterests.push(prefString);
        await db.orm.public.ResidentProfile.where({ id: profile.id }).update({ interests: JSON.stringify(currentInterests) });
      }
    }
    
    return { ok: true, data: { message: `Preference saved: ${args.key}` } };
  }
};

export const forgetPreference: VoiceToolDefinition = {
  name: 'forget_preference',
  description: 'Forgets a previously saved preference for the resident.',
  domain: 'system',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    required: ["key"],
    properties: {
      key: { type: "string", description: "The category of the preference to forget." }
    }
  },
  execute: async (args, session) => {
    const profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();
    
    if (profile && profile.interests) {
      let currentInterests = [];
      try {
        currentInterests = JSON.parse(profile.interests);
      } catch(e) {}
      
      const filtered = currentInterests.filter((i: string) => !i.startsWith(`${args.key}:`));
      await db.orm.public.ResidentProfile.where({ id: profile.id }).update({ interests: JSON.stringify(filtered) });
    }
    
    return { ok: true, data: { message: `Preference forgotten: ${args.key}` } };
  }
};

export const cancelWorkflow: VoiceToolDefinition = {
  name: 'cancel_workflow',
  description: 'Cancels the current ongoing workflow or pending confirmation.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {}
  },
  execute: async (args, session) => {
    await updateVoiceContext(session.user.personId, {
      taskState: {
        status: 'cancelled'
      },
      pendingAction: undefined
    });
    
    return { ok: true, data: { message: 'Workflow successfully cancelled.' } };
  }
};
