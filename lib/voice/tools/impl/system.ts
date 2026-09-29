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
  description: 'Cancels a specific ongoing workflow or pending confirmation.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      workflow_id: { type: "string", description: "Optional. The specific workflow ID to cancel. If omitted, attempts to cancel the active workflow." }
    }
  },
  execute: async (args, session) => {
    const { getVoiceContext, endWorkflow, updateVoiceContext } = await import('../../core/context');
    const ctx = await getVoiceContext(session.user.personId);
    
    let targetId = args.workflow_id;
    if (!targetId && ctx.taskState?.currentWorkflowId) {
      targetId = ctx.taskState.currentWorkflowId;
    }
    
    if (!targetId && ctx.activeWorkflows) {
      // Fallback: pick the latest workflow
      const keys = Object.keys(ctx.activeWorkflows);
      if (keys.length > 0) targetId = keys[keys.length - 1];
    }
    
    if (!targetId) {
       return { ok: false, error: { code: 'INVALID_STATE', message: 'No active workflow found to cancel.' } };
    }

    const workflow = ctx.activeWorkflows?.[targetId];
    if (workflow) {
      // Cleanup capability based on domain
      if (workflow.domain === 'commerce' || workflow.action === 'confirm_checkout') {
         const cart = await db.orm.public.Cart.where({ personId: session.user.personId }).first();
         if (cart) {
           await db.orm.public.CartCheckout.where({ cartId: cart.id }).delete();
         }
      }
      
      // We can remove it from active workflows
      await endWorkflow(session.user.personId, targetId);
    }

    await updateVoiceContext(session.user.personId, {
      taskState: {
        status: 'CANCELLED',
        currentWorkflowId: undefined
      }
    });
    
    return { ok: true, data: { message: 'Workflow successfully cancelled.', workflowId: targetId } };
  }
};

export const getOperationStatus: VoiceToolDefinition = {
  name: 'get_operation_status',
  description: 'Checks the reconciliation status of a previously initiated operation (e.g., checkout, service request) if a timeout or unknown result occurred.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      operation_id: { type: "string", description: "The operation ID or idempotency key to check." }
    },
    required: ["operation_id"]
  },
  execute: async (args, session) => {
    // Phase 6 Reconciliation logic
    // Check Orders for idempotency
    const order = await db.orm.public.Order.where({ idempotencyKey: args.operation_id, personId: session.user.personId }).first();
    if (order) {
      return { ok: true, data: { status: 'COMPLETED', safeToRetry: false, message: 'The transaction was successfully processed.' } };
    }
    
    // Check pending checkouts
    const pendingCheckout = await db.orm.public.CartCheckout.where({ idempotencyKey: args.operation_id }).first();
    if (pendingCheckout) {
      return { ok: true, data: { status: 'PENDING', safeToRetry: true, message: 'The transaction has not been confirmed yet.' } };
    }

    return { ok: true, data: { status: 'UNKNOWN', safeToRetry: false, message: 'Could not find a deterministic outcome for this operation. A human operator may need to review.' } };
  }
};
