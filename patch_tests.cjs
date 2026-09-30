const fs = require('fs');

let code = fs.readFileSync('lib/voice/core/security.test.ts', 'utf8');

code += `
  await t.test('6. Phase 6: Workflow-Specific Cancellation Isolation', async () => {
    await updateVoiceContext(dummySession.user.personId, {
      activeWorkflows: {
        'wf-1': { workflowId: 'wf-1', action: 'confirm_checkout', domain: 'commerce', confirmationId: 'wf-1' },
        'wf-2': { workflowId: 'wf-2', action: 'confirm_service_request', domain: 'services', confirmationId: 'wf-2' }
      }
    });

    const result = await executeTool('cancel_workflow', { workflow_id: 'wf-1' }, dummySession);
    assert.strictEqual(result.ok, true);
    
    const ctx = await getVoiceContext(dummySession.user.personId);
    assert.ok(!ctx.activeWorkflows?.['wf-1'], 'Targeted workflow should be removed');
    assert.ok(ctx.activeWorkflows?.['wf-2'], 'Other workflow must remain active');
  });

  await t.test('7. Phase 6: Concurrent Execution Determinism', async () => {
    // This is a unit test simulation of concurrent confirmations for a single action
    // In a real environment, Prisma handles this atomically.
    const results = await Promise.all([
       executeTool('cancel_workflow', { workflow_id: 'wf-2' }, dummySession),
       executeTool('cancel_workflow', { workflow_id: 'wf-2' }, dummySession)
    ]);
    
    // We expect both to technically succeed or one to fail gracefully, but state must be consistent
    const ctx = await getVoiceContext(dummySession.user.personId);
    assert.ok(!ctx.activeWorkflows?.['wf-2'], 'Workflow should be fully gone after concurrent cancels');
  });

  await t.test('8. Phase 6: Operation Reconciliation', async () => {
    const result = await executeTool('get_operation_status', { operation_id: 'fake-id' }, dummySession);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.data?.status, 'UNKNOWN');
  });
`;

fs.writeFileSync('lib/voice/core/security.test.ts', code);
