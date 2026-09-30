const fs = require('fs');

let code = fs.readFileSync('lib/voice/tools/impl/cart.ts', 'utf8');

const target1 = `    // Explicitly update the context so we know what we're confirming
    await updateVoiceContext(session.user.personId, {
      pendingAction: {
        action: 'confirm_checkout',
        confirmationId: res.checkoutId,
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
      }
    });`;

const replacement1 = `    // Phase 6: Explicitly start workflow
    const { startWorkflow } = await import('../../core/context');
    await startWorkflow(session.user.personId, res.checkoutId, {
      workflowId: res.checkoutId,
      action: 'confirm_checkout',
      domain: 'commerce',
      confirmationId: res.checkoutId,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
    });
    
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'AWAITING_CONFIRMATION', currentWorkflowId: res.checkoutId }
    });`;

code = code.replace(target1, replacement1);

const target2 = `    const ctx = await getVoiceContext(session.user.personId);
    let checkoutId = args.checkout_id;

    if (!checkoutId && ctx.pendingAction?.action === 'confirm_checkout') {
      checkoutId = ctx.pendingAction.confirmationId;
    }

    if (!checkoutId) return { ok: false, error: { code: 'MISSING_CHECKOUT_ID', message: 'Checkout ID is required.' } };
    
    const res = await confirmVoiceCheckout(session.user.personId, checkoutId);
    
    // Clear pending action
    await updateVoiceContext(session.user.personId, { pendingAction: undefined });`;

const replacement2 = `    const { endWorkflow } = await import('../../core/context');
    const ctx = await getVoiceContext(session.user.personId);
    let checkoutId = args.checkout_id;

    if (!checkoutId && ctx.activeWorkflows) {
      for (const key of Object.keys(ctx.activeWorkflows)) {
        if (ctx.activeWorkflows[key].action === 'confirm_checkout') {
          checkoutId = ctx.activeWorkflows[key].confirmationId;
          break;
        }
      }
    }

    if (!checkoutId) return { ok: false, error: { code: 'MISSING_CHECKOUT_ID', message: 'Checkout ID is required.' } };
    
    const res = await confirmVoiceCheckout(session.user.personId, checkoutId);
    
    // Cleanup workflow
    await endWorkflow(session.user.personId, checkoutId);
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'COMPLETED' }
    });`;

code = code.replace(target2, replacement2);

fs.writeFileSync('lib/voice/tools/impl/cart.ts', code);
