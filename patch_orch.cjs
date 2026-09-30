const fs = require('fs');

let code = fs.readFileSync('lib/voice/core/orchestrator.ts', 'utf8');

const target = `  if (def.requiresConfirmation) {
    const ctx = await getVoiceContext(session.user.personId);
    
    // Check if the current action is matching the pending action
    if (!ctx.pendingAction || ctx.pendingAction.action !== name) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'This action requires a prior preparation step and explicit confirmation.' } };
    }

    // Check expiration
    if (ctx.pendingAction.expiresAt && new Date(ctx.pendingAction.expiresAt) < new Date()) {
      return { ok: false, error: { code: 'EXPIRED_CONFIRMATION', message: 'The confirmation window has expired. Please prepare the action again.' } };
    }
  }`;

const replacement = `  if (def.requiresConfirmation) {
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
  }`;

code = code.replace(target, replacement);

fs.writeFileSync('lib/voice/core/orchestrator.ts', code);
