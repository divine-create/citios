const fs = require('fs');
let code = fs.readFileSync('lib/voice/core/orchestrator.ts', 'utf8');

// Replace the imports to include validator and new registry getter
code = code.replace(
  "import { getToolDefinition, moduleRegistry } from './registry';",
  "import { moduleRegistry } from './registry';\nimport { validateJsonSchema } from './validator';"
);

// Replace the execution block
const newExecute = `export async function executeTool(name: string, args: any, session: any, abortSignal?: AbortSignal) {
  const registered = moduleRegistry.getToolOwner(name);
  if (!registered) {
    return { ok: false, error: { code: 'INVALID_TOOL', message: \`Tool \${name} is not registered.\` } };
  }
  
  const { module, tool: def } = registered;

  // 1. Central Authentication Enforcement
  if (def.requiresAuthentication) {
    if (!session || !session.user || !session.user.personId) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'You must be logged in to perform this action.' } };
    }
  }

  // 2. Central Module Authorization
  if (module.authorize) {
    try {
      const isAuthorized = await module.authorize(session);
      if (!isAuthorized) {
        return { ok: false, error: { code: 'FORBIDDEN', message: \`You do not have permission to use the \${module.name} module.\` } };
      }
    } catch (err) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Authorization check failed.' } };
    }
  }

  // 3. Central Schema Validation
  const validationError = validateJsonSchema(args, def.inputSchema);
  if (validationError) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: validationError } };
  }

  try {
    let limitType: 'global' | 'expensive' | 'confirmation' = 'global';
    if (def.requiresConfirmation) limitType = 'confirmation';
    else if (def.riskLevel === 'irreversible' || def.riskLevel === 'financial') limitType = 'expensive';
    
    assertRateLimit(session?.user?.personId || 'anonymous', limitType);
  } catch (e) {
    return { ok: false, error: { code: 'RATE_LIMITED', message: 'You are performing actions too quickly. Please wait a moment.' } };
  }

  // Intent / Clarification Engine Check
  const clarificationCheck = intentResolver.evaluateToolClarification(def, args);
  if (!clarificationCheck.complete) {
    if (session?.user?.personId) {
      await updateVoiceContext(session.user.personId, {
        taskState: {
          status: 'AWAITING_CLARIFICATION',
          missingFields: clarificationCheck.missingFields,
          currentWorkflowId: name
        }
      });
    }
    
    return { 
      ok: false, 
      error: { 
        code: 'MISSING_INFORMATION', 
        message: \`I need more information to proceed. Missing: \${clarificationCheck.missingFields.join(', ')}.\` 
      } 
    };
  }

  // Safety check: ensure policy enforcement
  if (def.requiresConfirmation) {
    if (!session?.user?.personId) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'You must be logged in to confirm actions.' } };
    }
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
            // Optionally, delete or consume the token here so it can't be replayed!
            delete ctx.activeWorkflows[key];
            await updateVoiceContext(session.user.personId, { activeWorkflows: ctx.activeWorkflows });
            break;
          }
        }
      }
    }

    if (!isAuthorized) {
      if (expired) {
        return { ok: false, error: { code: 'EXPIRED_CONFIRMATION', message: 'The confirmation window has expired. Please prepare the action again.' } };
      }
      return { ok: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'This action requires a prior preparation step and explicit confirmation.' } };
    }
  }

  try {
    const startTime = Date.now();
    const result = await def.execute(args, session, abortSignal);
    const latency = Date.now() - startTime;
    
    telemetry.log({
      timestamp: new Date().toISOString(),
      event: 'VOICE_TOOL_EXECUTED',
      residentId: session?.user?.personId || 'anonymous',
      tool: name,
      riskLevel: def.riskLevel,
      success: result.ok,
      latencyMs: latency
    });
    
    return result;
  } catch (err: any) {
    console.error(\`Tool execution error [\${name}]:\`, err);
    telemetry.log({
      timestamp: new Date().toISOString(),
      event: 'VOICE_TOOL_FAILED',
      residentId: session?.user?.personId || 'anonymous',
      tool: name,
      riskLevel: def.riskLevel,
      errorCategory: 'INTERNAL_ERROR'
    });
    
    if (module.mapError) {
      const mapped = module.mapError(err);
      return { ok: false, error: mapped };
    }
    
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred while executing this tool.' } };
  }
}`;

const oldExecuteRegex = /export async function executeTool[\s\S]*?(?=\n$|$)/;
code = code.replace(oldExecuteRegex, newExecute);

fs.writeFileSync('lib/voice/core/orchestrator.ts', code);
console.log("Patched orchestrator.ts successfully");
