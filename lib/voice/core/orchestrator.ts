import { getToolDefinition, moduleRegistry } from './registry';
import { getVoiceContext, updateVoiceContext } from './context';
import { intentResolver } from './resolver';
import { telemetry } from './telemetry';
import { AccountModule } from '../modules/account';
import { DiscoveryModule } from '../modules/discovery';
import { CommerceModule } from '../modules/commerce';
import { ServicesModule } from '../modules/services';
import { SystemModule } from '../modules/system';
import { logisticsModule } from '../modules/logistics';
import { assertRateLimit } from './rate-limit';

// Explicitly register enabled modules
moduleRegistry.registerModule(AccountModule);
moduleRegistry.registerModule(DiscoveryModule);
moduleRegistry.registerModule(CommerceModule);
moduleRegistry.registerModule(ServicesModule);
moduleRegistry.registerModule(SystemModule);
moduleRegistry.registerModule(logisticsModule);

export function getRegisteredTools() {
  const tools = [];
  for (const def of moduleRegistry.getAllTools()) {
    tools.push({
      type: "function",
      name: def.name,
      description: def.description,
      parameters: def.inputSchema
    });
  }
  return tools;
}

export async function executeTool(name: string, args: any, session: any, abortSignal?: AbortSignal) {
  const def = getToolDefinition(name);
  if (!def) {
    return { ok: false, error: { code: 'INVALID_TOOL', message: `Tool ${name} is not registered.` } };
  }
  
  try {
    let limitType: 'global' | 'expensive' | 'confirmation' = 'global';
    if (def.requiresConfirmation) limitType = 'confirmation';
    else if (def.riskLevel === 'irreversible' || def.riskLevel === 'financial') limitType = 'expensive';
    
    assertRateLimit(session.user.personId, limitType);
  } catch (e) {
    return { ok: false, error: { code: 'RATE_LIMITED', message: 'You are performing actions too quickly. Please wait a moment.' } };
  }

  // Intent / Clarification Engine Check
  const clarificationCheck = intentResolver.evaluateToolClarification(def, args);
  if (!clarificationCheck.complete) {
    await updateVoiceContext(session.user.personId, {
      taskState: {
        status: 'AWAITING_CLARIFICATION',
        missingFields: clarificationCheck.missingFields,
        currentWorkflowId: name
      }
    });
    
    return { 
      ok: false, 
      error: { 
        code: 'MISSING_INFORMATION', 
        message: `I need more information to proceed. Missing: ${clarificationCheck.missingFields.join(', ')}.` 
      } 
    };
  }

  // Safety check: ensure policy enforcement
  if (def.requiresConfirmation) {
    const ctx = await getVoiceContext(session.user.personId);
    
    let isAuthorized = false;
    let expired = false;
    
    if (ctx.activeWorkflows) {
      for (const key of Object.keys(ctx.activeWorkflows)) {
        const wf = ctx.activeWorkflows[key];
        if (wf.action === name) {
          if (wf.expiresAt && new Date(wf.expiresAt) < new Date()) {
            expired = true;
          } else {
            isAuthorized = true;
            break;
          }
        }
      }
    }

    // Check if the current action is matching the pending action
    if (!isAuthorized) {
      if (expired) {
        return { ok: false, error: { code: 'CONFIRMATION_EXPIRED', message: 'The confirmation window has expired. Please prepare the action again.' } };
      }
      return { ok: false, error: { code: 'FORBIDDEN', message: 'This action requires a prior preparation step and explicit confirmation.' } };
    }
  }

  try {
    const startTime = Date.now();
    const result = await def.execute(args, session, abortSignal);
    const latency = Date.now() - startTime;
    
    telemetry.log({
      timestamp: new Date().toISOString(),
      event: 'VOICE_TOOL_EXECUTED',
      residentId: session.user.personId,
      tool: name,
      riskLevel: def.riskLevel,
      success: result.ok,
      latencyMs: latency
    });
    
    return result;
  } catch (err: any) {
    console.error(`Tool execution error [${name}]:`, err);
    telemetry.log({
      timestamp: new Date().toISOString(),
      event: 'VOICE_TOOL_FAILED',
      residentId: session.user.personId,
      tool: name,
      riskLevel: def.riskLevel,
      errorCategory: 'INTERNAL_ERROR'
    });
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: String(err.stack || err.message || 'An internal error occurred while executing this tool.') } };
  }
}
