const fs = require('fs');

let code = fs.readFileSync('lib/voice/tools/impl/services.ts', 'utf8');

const target1 = `    await updateVoiceContext(session.user.personId, {
      pendingAction: {
        action: 'confirm_service_request',
        confirmationId: confirmationId,
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
      },
      // Note: we'll cast via any since we didn't add these specific fields to VoiceContextData strictly
      ...({ pendingServiceNotes: args.notes || '', pendingServiceId: serviceId } as any)
    });`;

const replacement1 = `    const { startWorkflow } = await import('../../core/context');
    await startWorkflow(session.user.personId, confirmationId, {
      workflowId: confirmationId,
      action: 'confirm_service_request',
      domain: 'services',
      confirmationId: confirmationId,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      contextData: { pendingServiceNotes: args.notes || '', pendingServiceId: serviceId }
    });
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'AWAITING_CONFIRMATION', currentWorkflowId: confirmationId }
    });`;

code = code.replace(target1, replacement1);

const target2 = `    const ctx = await getVoiceContext(session.user.personId);
    let confirmationId = args.confirmation_id;

    if (!confirmationId && ctx.pendingAction?.action === 'confirm_service_request') {
      confirmationId = ctx.pendingAction.confirmationId;
    }

    if (!confirmationId || ctx.pendingAction?.confirmationId !== confirmationId) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Invalid or expired confirmation ID.' } };
    }

    // ATOMIC CONSUMPTION to prevent race conditions
    // If two concurrent requests hit this, only one will successfully clear the pendingAction.
    const plan = db.raw.sql\`
      UPDATE "VoiceContext"
      SET data = data - 'pendingAction' - 'pendingServiceId' - 'pendingServiceNotes'
      WHERE "personId" = \${session.user.personId}
        AND data->'pendingAction'->>'confirmationId' = \${confirmationId}
    \`.affectedCount().build();
    const consume = await db.runtime().execute(plan);
    
    if (consume.affectedRows === 0) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Confirmation already processed or invalid.' } };
    }

    const srvCtx = ctx as any;
    const serviceId = srvCtx.pendingServiceId;
    const notes = srvCtx.pendingServiceNotes;`;

const replacement2 = `    const { endWorkflow } = await import('../../core/context');
    const ctx = await getVoiceContext(session.user.personId);
    let confirmationId = args.confirmation_id;

    let workflow = null;
    if (!confirmationId && ctx.activeWorkflows) {
      for (const key of Object.keys(ctx.activeWorkflows)) {
        if (ctx.activeWorkflows[key].action === 'confirm_service_request') {
          confirmationId = ctx.activeWorkflows[key].confirmationId;
          workflow = ctx.activeWorkflows[key];
          break;
        }
      }
    } else if (confirmationId && ctx.activeWorkflows) {
       workflow = ctx.activeWorkflows[confirmationId];
    }

    if (!confirmationId || !workflow) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Invalid or expired confirmation ID.' } };
    }

    // ATOMIC CONSUMPTION to prevent race conditions for activeWorkflows
    const plan = db.raw.sql\`
      UPDATE "VoiceContext"
      SET data = jsonb_set(data, '{activeWorkflows}', (data->'activeWorkflows') - \${confirmationId}::text)
      WHERE "personId" = \${session.user.personId}
        AND data->'activeWorkflows' ? \${confirmationId}
    \`.affectedCount().build();
    const consume = await db.runtime().execute(plan);
    
    if (consume.affectedRows === 0) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Confirmation already processed or invalid.' } };
    }

    const serviceId = workflow.contextData?.pendingServiceId;
    const notes = workflow.contextData?.pendingServiceNotes;`;

code = code.replace(target2, replacement2);

fs.writeFileSync('lib/voice/tools/impl/services.ts', code);
