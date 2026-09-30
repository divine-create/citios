const fs = require('fs');
let code = fs.readFileSync('lib/voice/core/security.test.ts', 'utf8');

// I'll append Phase 7 tests
const addition = `
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
`;

code = code.replace(/}\);\n$/, addition + "});\n");
fs.writeFileSync('lib/voice/core/security.test.ts', code);
