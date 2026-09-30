import { db } from '@/src/prisma/db';
import { VoiceWorkflow, VoiceWorkflowStep, VoiceWorkflowStatus, VoiceWorkflowStepStatus } from './workflow-types';
import { getVoiceContext, updateVoiceContext } from './context';
import { moduleRegistry, getToolDefinition } from './registry';
import { executeTool } from './orchestrator';

const MAX_STEPS = 10;
const MAX_WORKFLOW_DURATION_MS = 1000 * 60 * 30; // 30 minutes

export async function createWorkflow(personId: string, plan: { workflowType: string; steps: any[] }): Promise<VoiceWorkflow | { error: string }> {
  if (plan.steps.length > MAX_STEPS) {
    return { error: `Workflow exceeds max steps limit of ${MAX_STEPS}` };
  }

  const workflowId = `wf_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();
  
  const workflow: VoiceWorkflow = {
    id: workflowId,
    personId,
    type: plan.workflowType,
    status: 'CREATED',
    steps: plan.steps.map((s, i) => ({
      id: s.id || `step-${i + 1}`,
      toolName: s.toolName,
      status: 'PENDING',
      input: s.arguments,
      dependsOn: s.dependsOn || []
    })),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAX_WORKFLOW_DURATION_MS).toISOString()
  };

  // Safe insertion using Prisma transaction
  await db.transaction(async (tx: any) => {
    const lockPlan = db.raw.sql`SELECT id FROM "voiceContext" WHERE "personId" = ${personId} FOR UPDATE`.affectedCount().build();
    await tx.execute(lockPlan);
    
    let ctx = await tx.orm.public.VoiceContext.where({ personId }).first();
    if (!ctx) {
      ctx = await tx.orm.public.VoiceContext.create({ personId, data: { activeWorkflows: {} } as any });
    }
    const data = ctx.data as any;
    if (!data.activeWorkflows) data.activeWorkflows = {};
    
    data.activeWorkflows[workflowId] = workflow;
    
    await tx.orm.public.VoiceContext.where({ id: ctx.id }).update({ data, updatedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) });
  });

  return workflow;
}

export async function getWorkflow(personId: string, workflowId: string): Promise<VoiceWorkflow | null> {
  const ctx = await db.orm.public.VoiceContext.where({ personId }).first();
  if (!ctx || !ctx.data) return null;
  const data = ctx.data as any;
  if (!data.activeWorkflows) return null;
  return data.activeWorkflows[workflowId] || null;
}

export async function updateWorkflowState(personId: string, workflowId: string, updater: (wf: VoiceWorkflow) => VoiceWorkflow | { error: string }): Promise<VoiceWorkflow | { error: string }> {
  let result: VoiceWorkflow | { error: string } = { error: 'Unknown' };
  
  await db.transaction(async (tx: any) => {
    const lockPlan = db.raw.sql`SELECT id FROM "voiceContext" WHERE "personId" = ${personId} FOR UPDATE`.affectedCount().build();
    await tx.execute(lockPlan);
    
    const ctx = await tx.orm.public.VoiceContext.where({ personId }).first();
    if (!ctx) {
      result = { error: 'Context not found' };
      return;
    }
    
    const data = ctx.data as any;
    if (!data.activeWorkflows || !data.activeWorkflows[workflowId]) {
      result = { error: 'Workflow not found' };
      return;
    }
    
    let wf = data.activeWorkflows[workflowId] as VoiceWorkflow;
    
    const updated = updater(wf);
    if ('error' in updated) {
      result = updated;
      return;
    }
    
    updated.updatedAt = new Date().toISOString();
    data.activeWorkflows[workflowId] = updated;
    
    await tx.orm.public.VoiceContext.where({ id: ctx.id }).update({ data, updatedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) });
    result = updated;
  });
  
  return result;
}

export async function cancelWorkflow(personId: string, workflowId: string): Promise<VoiceWorkflow | { error: string }> {
  return updateWorkflowState(personId, workflowId, (wf) => {
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(wf.status)) {
      return { error: 'Workflow has already finished' };
    }
    wf.status = 'CANCELLED';
    return wf;
  });
}

function resolveArguments(args: any, contextOutputs: Record<string, any>): any {
  if (typeof args === 'string') {
    const match = args.match(/^\{\{(.+?)\}\}$/);
    if (match) {
      const path = match[1].split('.');
      let current = contextOutputs;
      for (const p of path) {
        if (current === undefined) break;
        current = current[p];
      }
      return current !== undefined ? current : args;
    }
    return args;
  }
  if (Array.isArray(args)) {
    return args.map(a => resolveArguments(a, contextOutputs));
  }
  if (typeof args === 'object' && args !== null) {
    const resolved: any = {};
    for (const [k, v] of Object.entries(args)) {
      resolved[k] = resolveArguments(v, contextOutputs);
    }
    return resolved;
  }
  return args;
}

export async function advanceWorkflow(personId: string, workflowId: string, session: any): Promise<VoiceWorkflow | { error: string }> {
  let wfResult = await getWorkflow(personId, workflowId);
  if (!wfResult) return { error: 'Workflow not found' };
  
  if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(wfResult.status)) {
    return wfResult; // Already finished
  }

  // Find next runnable step
  while (true) {
    const wf = await getWorkflow(personId, workflowId);
    if (!wf) break;
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'WAITING_FOR_INPUT', 'WAITING_FOR_CONFIRMATION'].includes(wf.status)) {
      break; 
    }

    const pendingSteps = wf.steps.filter(s => s.status === 'PENDING');
    if (pendingSteps.length === 0) {
      const allCompleted = wf.steps.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');
      await updateWorkflowState(personId, workflowId, (w) => {
        w.status = allCompleted ? 'COMPLETED' : 'FAILED';
        return w;
      });
      break;
    }

    const stepToRun = pendingSteps.find(s => {
      if (!s.dependsOn || s.dependsOn.length === 0) return true;
      return s.dependsOn.every(depId => {
        const dep = wf.steps.find(x => x.id === depId);
        return dep && dep.status === 'COMPLETED';
      });
    });

    if (!stepToRun) {
      // Deadlock or missing dependencies
      await updateWorkflowState(personId, workflowId, (w) => {
        w.status = 'FAILED';
        return w;
      });
      break;
    }

    // Mark as running
    await updateWorkflowState(personId, workflowId, (w) => {
      w.status = 'RUNNING';
      const s = w.steps.find(x => x.id === stepToRun.id);
      if (s) {
        s.status = 'RUNNING';
        s.startedAt = new Date().toISOString();
      }
      w.currentStep = stepToRun.id;
      return w;
    });

    // Build context outputs for argument resolution
    const contextOutputs: Record<string, any> = {};
    for (const s of wf.steps) {
      if (s.status === 'COMPLETED') {
        contextOutputs[s.id] = { output: s.output };
      }
    }

    const resolvedArgs = resolveArguments(stepToRun.input, contextOutputs);
    
    // Check if tool requires confirmation first? Wait, executeTool handles requiresConfirmation natively, 
    // but in a workflow, we need to pause the workflow.
    // Let's actually execute it. If it returns CONFIRMATION_REQUIRED, we pause.
    
    const result = await executeTool(stepToRun.toolName, resolvedArgs, session);
    
    await updateWorkflowState(personId, workflowId, (w) => {
      const s = w.steps.find(x => x.id === stepToRun.id);
      if (!s) return w;
      
      if (result.ok) {
        s.status = 'COMPLETED';
        s.output = result.data;
        s.completedAt = new Date().toISOString();
      } else {
        if (result.error?.code === 'CONFIRMATION_REQUIRED') {
          s.status = 'PENDING'; // Can be retried once confirmed
          w.status = 'WAITING_FOR_CONFIRMATION';
          w.confirmationRequest = {
            stepId: s.id,
            action: stepToRun.toolName,
            summary: `Please confirm execution of ${stepToRun.toolName}`
          };
        } else if (result.error?.code === 'MISSING_INFORMATION') {
          s.status = 'PENDING';
          w.status = 'WAITING_FOR_INPUT';
          w.clarificationRequest = {
            stepId: s.id,
            missingFields: result.error.missingFields || [],
            question: result.error.message
          };
        } else {
          s.status = 'FAILED';
          s.errorCode = result.error?.code || 'UNKNOWN';
          s.completedAt = new Date().toISOString();
          // Fail the whole workflow on step failure for now
          w.status = 'FAILED';
        }
      }
      return w;
    });
  }

  return await getWorkflow(personId, workflowId) as VoiceWorkflow;
}
