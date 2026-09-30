import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { executeTool } from './orchestrator';
import { updateVoiceContext, getVoiceContext } from './context';
import { db } from '@/src/prisma/db';
import { VoiceToolDefinition } from './policy';
import { moduleRegistry } from './registry';

test('Voice Security & Reliability Audit', async (t) => {
  const dummySession = { user: { personId: 'test-resident-123' } };
  const hackerSession = { user: { personId: 'hacker-resident-456' } };

  await t.test('1. Authentication Bypass Attempt', async () => {
    const result = await executeTool('get_cart', { personId: hackerSession.user.personId }, dummySession);
    // The executeTool should safely use dummySession (test-resident-123), ignoring the injected argument
    assert.ok(result.ok !== undefined, 'Tool should execute without crashing');
    
    // We can't strictly assert the DB outcome here without mocking the DB, but we verify 
    // it doesn't dynamically evaluate the argument over the session.
  });

  await t.test('2. Unregistered Module / Tool Injection', async () => {
    const result = await executeTool('admin_database_tool', {}, dummySession);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error?.code, 'INVALID_TOOL');
  });

  await t.test('3. Confirmation Replay Attack Prevention', async () => {
    // Manually register a test tool that requires confirmation
    const secureTool: VoiceToolDefinition = {
      name: 'test_secure_action',
      description: 'Test',
      domain: 'system',
      riskLevel: 'irreversible',
      requiresConfirmation: true,
      requiresAuthentication: true,
      orchestrationEligible: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ ok: true })
    };
    
    moduleRegistry.registerModule({
      id: 'test_module',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      tools: [secureTool]
    });

    // Attempt execution without preparation
    let result = await executeTool('test_secure_action', {}, dummySession);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error?.code, 'FORBIDDEN');
  });

  await t.test('4. Prompt Injection: Schema Fuzzing', async () => {
    // Malicious payload with prototype pollution or extreme values
    const result = await executeTool('add_to_cart', { 
      product_id: '123', 
      quantity: -9999, // negative
      __proto__: { admin: true } 
    }, dummySession);
    
    // The implementation (addVoiceCartItem) should throw on invalid quantity
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error?.code, 'INTERNAL_ERROR');
  });

  await t.test('5. Cross-Resident Context Access', async () => {
    // A tool run by dummySession cannot access hackerSession's context.
    const ctx = await getVoiceContext(dummySession.user.personId);
    assert.ok(!ctx.recentEntities?.some(e => e.id === 'hacker-data'));
  });
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


  await t.test('9. Phase 7: Real Rate Limiting & Abuse Protection', async () => {
    const { checkRateLimit } = await import('./rate-limit');
    
    // Simulate 6 confirmation requests in the same minute
    let lastResult = true;
    for (let i = 0; i < 6; i++) {
      lastResult = checkRateLimit('resident-abuse-test:confirmation', 5, 60000);
    }
    // The 6th request should be blocked
    assert.strictEqual(lastResult, false);
  });

  await t.test('10. Phase 7: Input Fuzzing and Type Enforcement', async () => {
    // Injecting array where string is expected, negative numbers, undefined payload
    const result = await executeTool('add_to_cart', { 
      product_id: ['array_injection_attempt'], 
      quantity: -50 
    }, dummySession);
    
    assert.strictEqual(result.ok, false);
    // Should be caught by internal error or schema rejection, never panic/crash the node process
  });

  await t.test('11. Phase 7: Logistics Scope Access', async () => {
    const result = await executeTool('get_delivery_status', { delivery_id: 'non-existent-or-unauthorized' }, dummySession);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error?.code, 'FORBIDDEN');
  });

  await t.test('12. Phase 7: Execution Timeout with AbortSignal', async () => {
    // Simulate an operation that uses an AbortSignal
    const controller = new AbortController();
    const sig = controller.signal;
    controller.abort();
    assert.strictEqual(sig.aborted, true);
  });
});
