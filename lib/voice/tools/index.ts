import { getToolDefinition, requiresConfirmation } from '../policy';
import { getVoiceContext } from '../context/manager';
import { initializeToolRegistry } from './registry';

// Initialize the registry
initializeToolRegistry();

export async function executeTool(name: string, args: any, session: any) {
  const def = getToolDefinition(name);
  if (!def) {
    return { ok: false, error: { code: 'INVALID_TOOL', message: `Tool ${name} is not registered.` } };
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
    const result = await def.execute(args, session);
    return result;
  } catch (err: any) {
    console.error(`Tool execution error [${name}]:`, err);
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'An internal error occurred while executing this tool.' } };
  }
}
