import { getToolDefinition, moduleRegistry } from './registry';
import { getVoiceContext, updateVoiceContext } from './context';
import { intentResolver } from './resolver';
import { telemetry } from './telemetry';
import { AccountModule } from '../modules/account';
import { DiscoveryModule } from '../modules/discovery';
import { CommerceModule } from '../modules/commerce';
import { ServicesModule } from '../modules/services';
import { SystemModule } from '../modules/system';

// Explicitly register enabled modules
moduleRegistry.registerModule(AccountModule);
moduleRegistry.registerModule(DiscoveryModule);
moduleRegistry.registerModule(CommerceModule);
moduleRegistry.registerModule(ServicesModule);
moduleRegistry.registerModule(SystemModule);

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

export async function executeTool(name: string, args: any, session: any) {
  const def = getToolDefinition(name);
  if (!def) {
    return { ok: false, error: { code: 'INVALID_TOOL', message: `Tool ${name} is not registered.` } };
  }

  // Intent / Clarification Engine Check
  const clarificationCheck = intentResolver.evaluateToolClarification(def, args);
  if (!clarificationCheck.complete) {
    await updateVoiceContext(session.user.personId, {
      taskState: {
        status: 'awaiting_clarification',
        missingFields: clarificationCheck.missingFields,
        currentWorkflow: name
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
    
    // Check if the current action is matching the pending action
    if (!ctx.pendingAction || ctx.pendingAction.action !== name) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'This action requires a prior preparation step and explicit confirmation.' } };
    }

    // Check expiration
    if (ctx.pendingAction.expiresAt && new Date(ctx.pendingAction.expiresAt) < new Date()) {
      return { ok: false, error: { code: 'EXPIRED_CONFIRMATION', message: 'The confirmation window has expired. Please prepare the action again.' } };
    }
  }

  try {
    const startTime = Date.now();
    const result = await def.execute(args, session);
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
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'An internal error occurred while executing this tool.' } };
  }
}
