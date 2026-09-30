import { VoiceToolDefinition } from '../../core/policy';
import { updateVoiceContext } from '../../core/context';
import { db } from '@/src/prisma/db';
import { getVoiceCart } from '@/lib/voice/cart';

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

import { planWorkflow } from '../../core/planner';
import { createWorkflow, getWorkflow, updateWorkflowState, advanceWorkflow, cancelWorkflow as cancelEngineWorkflow } from '../../core/workflow-engine';
export const cancelWorkflow: VoiceToolDefinition = {
  name: 'system.cancel_workflow', aliases: ['cancel_workflow'],
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
         const { cart } = await getVoiceCart(session.user.personId);
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
  name: 'system.get_operation_status', aliases: ['get_operation_status'],
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
    const order = await db.orm.public.RetailOrder.where({ idempotencyKey: args.operation_id }).first();
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

export const startWorkflowTool: VoiceToolDefinition = {
  name: 'system.start_workflow', aliases: ['start_workflow'],
  description: 'Plans and starts a multi-step workflow to achieve the resident\'s goal. Use this when the goal requires multiple coordinated actions across different domains.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: false, // The LLM calls this, but it cannot be planned within a workflow
  inputSchema: {
    type: "object",
    properties: {
      intent: { type: "string", description: "The specific goal or intent the user wants to achieve." }
    },
    required: ["intent"]
  },
  execute: async (args, session) => {
    // 1. Plan the workflow
    const plan = await planWorkflow(args.intent, session);
    if ('error' in plan) {
      return { ok: false, error: { code: 'PLANNING_FAILED', message: plan.error } };
    }

    // 2. Create workflow
    const wf = await createWorkflow(session.user.personId, plan);
    if ('error' in wf) {
      return { ok: false, error: { code: 'CREATE_FAILED', message: wf.error } };
    }

    // 3. Advance workflow
    const advanced = await advanceWorkflow(session.user.personId, wf.id, session);
    if ('error' in advanced) {
      return { ok: false, error: { code: 'EXECUTION_FAILED', message: advanced.error } };
    }

    return { ok: true, data: { workflow: advanced } };
  }
};

export const confirmWorkflowStepTool: VoiceToolDefinition = {
  name: 'system.confirm_workflow', aliases: ['confirm_workflow'],
  description: 'Confirms and resumes a workflow that is WAITING_FOR_CONFIRMATION.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: false,
  inputSchema: {
    type: "object",
    properties: {
      workflowId: { type: "string", description: "The ID of the workflow to confirm." }
    },
    required: ["workflowId"]
  },
  execute: async (args, session) => {
    const wf = await getWorkflow(session.user.personId, args.workflowId);
    if (!wf || wf.status !== 'WAITING_FOR_CONFIRMATION' || !wf.confirmationRequest) {
      return { ok: false, error: { code: 'INVALID_STATE', message: 'Workflow is not waiting for confirmation.' } };
    }

    const { getVoiceContext, updateVoiceContext } = await import('../../core/context');
    const ctx = await getVoiceContext(session.user.personId);
    
    // Inject the confirmation token into Phase 8.1's activeWorkflows so executeTool can consume it
    const activeWorkflows = ctx.activeWorkflows || {};
    const tokenKey = `confirm_${wf.id}`;
    activeWorkflows[tokenKey] = {
      workflowId: tokenKey,
      action: wf.confirmationRequest.action,
      domain: 'workflow',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
    
    await updateVoiceContext(session.user.personId, { activeWorkflows });

    // Mark the workflow back to running
    await updateWorkflowState(session.user.personId, wf.id, (w) => {
      w.status = 'RUNNING';
      w.confirmationRequest = undefined;
      return w;
    });

    // Advance the workflow (this will call executeTool, which will consume the token and succeed)
    const advanced = await advanceWorkflow(session.user.personId, wf.id, session);
    
    if ('error' in advanced) {
      return { ok: false, error: { code: 'EXECUTION_FAILED', message: advanced.error } };
    }

    return { ok: true, data: { workflow: advanced } };
  }
};

export const clarifyWorkflowStepTool: VoiceToolDefinition = {
  name: 'system.clarify_workflow', aliases: ['clarify_workflow'],
  description: 'Provides missing information to resume a workflow that is WAITING_FOR_INPUT.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: false,
  inputSchema: {
    type: "object",
    properties: {
      workflowId: { type: "string", description: "The ID of the workflow to clarify." },
      answers: { type: "object", description: "Key-value pairs of the missing information." }
    },
    required: ["workflowId", "answers"]
  },
  execute: async (args, session) => {
    const wf = await getWorkflow(session.user.personId, args.workflowId);
    if (!wf || wf.status !== 'WAITING_FOR_INPUT' || !wf.clarificationRequest) {
      return { ok: false, error: { code: 'INVALID_STATE', message: 'Workflow is not waiting for input.' } };
    }

    // Merge answers into the pending step's input
    await updateWorkflowState(session.user.personId, wf.id, (w) => {
      const step = w.steps.find(s => s.id === w.clarificationRequest?.stepId);
      if (step && typeof step.input === 'object' && step.input !== null) {
        step.input = { ...step.input, ...args.answers };
      }
      w.status = 'RUNNING';
      w.clarificationRequest = undefined;
      return w;
    });

    const advanced = await advanceWorkflow(session.user.personId, wf.id, session);
    
    if ('error' in advanced) {
      return { ok: false, error: { code: 'EXECUTION_FAILED', message: advanced.error } };
    }

    return { ok: true, data: { workflow: advanced } };
  }
};
