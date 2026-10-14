import test from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

import {
  enforceRateLimit,
  checkRateLimit,
  resetRateLimit,
  RateLimitExceededError,
  validateFinancialAmount,
  FinancialValidationError,
  recordFailureAttempt,
  clearFailureAttempts,
  SecurityDomainError,
  extractClientIp,
  RATE_LIMIT_CONFIGS,
} from '@/lib/security/production-hardening';

test('Phase 11 Production Hardening, Rate Limiting & Abuse Prevention Suite', async (t) => {
  const testIp = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
  const testUserId = `user-${uuidv4().slice(0, 8)}`;

  await t.test('1. Tiered Rate Limiting: AUTH tier enforcement (5 req/min)', () => {
    resetRateLimit(testIp, 'AUTH');

    // 5 allowed attempts
    for (let i = 1; i <= 5; i++) {
      const res = enforceRateLimit(testIp, 'AUTH');
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.count, i);
      assert.strictEqual(res.remaining, 5 - i);
    }

    // 6th attempt must be rejected with RateLimitExceededError
    assert.throws(
      () => enforceRateLimit(testIp, 'AUTH'),
      (err: any) => {
        return (
          err instanceof RateLimitExceededError &&
          err.tier === 'AUTH' &&
          err.retryAfterSeconds > 0 &&
          err.code === 'RATE_LIMIT_EXCEEDED'
        );
      }
    );

    // Reset rate limit allows request again
    resetRateLimit(testIp, 'AUTH');
    const freshRes = enforceRateLimit(testIp, 'AUTH');
    assert.strictEqual(freshRes.allowed, true);
    assert.strictEqual(freshRes.count, 1);
  });

  await t.test('2. Tiered Rate Limiting: CHECKOUT, WALLET, POS, and SUPPORT tiers', () => {
    const id = `test-tier-${uuidv4().slice(0, 6)}`;

    // CHECKOUT tier limit = 10
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(enforceRateLimit(id, 'CHECKOUT').allowed, true);
    }
    assert.throws(() => enforceRateLimit(id, 'CHECKOUT'), RateLimitExceededError);

    // WALLET tier limit = 10
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(enforceRateLimit(id, 'WALLET').allowed, true);
    }
    assert.throws(() => enforceRateLimit(id, 'WALLET'), RateLimitExceededError);

    // POS tier allows higher throughput (60 req/min)
    for (let i = 0; i < 60; i++) {
      assert.strictEqual(enforceRateLimit(id, 'POS').allowed, true);
    }
    assert.throws(() => enforceRateLimit(id, 'POS'), RateLimitExceededError);

    // SUPPORT tier limit = 5
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(enforceRateLimit(id, 'SUPPORT').allowed, true);
    }
    assert.throws(() => enforceRateLimit(id, 'SUPPORT'), RateLimitExceededError);
  });

  await t.test('3. Financial Input Sanitation & Attack Surface Hardening', () => {
    // Valid inputs
    assert.strictEqual(validateFinancialAmount(100), 100);
    assert.strictEqual(validateFinancialAmount(4999.99), 4999.99);
    assert.strictEqual(validateFinancialAmount(0.01), 0.01);

    // Negative values (Credit inversion exploit)
    assert.throws(
      () => validateFinancialAmount(-500),
      (err: any) => err instanceof FinancialValidationError && /must be greater than zero/.test(err.message)
    );

    // Zero value
    assert.throws(
      () => validateFinancialAmount(0),
      (err: any) => err instanceof FinancialValidationError && /must be greater than zero/.test(err.message)
    );

    // Non-finite values (Infinity exploit)
    assert.throws(
      () => validateFinancialAmount(Infinity),
      (err: any) => err instanceof FinancialValidationError && /cannot be infinite/.test(err.message)
    );
    assert.throws(
      () => validateFinancialAmount(-Infinity),
      (err: any) => err instanceof FinancialValidationError && /cannot be infinite/.test(err.message)
    );

    // NaN exploit
    assert.throws(
      () => validateFinancialAmount(NaN),
      (err: any) => err instanceof FinancialValidationError && /cannot be NaN/.test(err.message)
    );

    // Non-numeric types (Type confusion / injection)
    assert.throws(
      () => validateFinancialAmount("5000" as any),
      (err: any) => err instanceof FinancialValidationError && /must be a numeric value/.test(err.message)
    );
    assert.throws(
      () => validateFinancialAmount(null as any),
      (err: any) => err instanceof FinancialValidationError && /must be a numeric value/.test(err.message)
    );
    assert.throws(
      () => validateFinancialAmount({ amount: 100 } as any),
      (err: any) => err instanceof FinancialValidationError && /must be a numeric value/.test(err.message)
    );

    // Fractional precision exploitation (e.g. 10.0001 NGN)
    assert.throws(
      () => validateFinancialAmount(10.005),
      (err: any) => err instanceof FinancialValidationError && /fractional decimal precision/.test(err.message)
    );
  });

  await t.test('4. Brute Force Protection & Progressive Account Lockout', () => {
    const targetAccount = `attacker-${uuidv4().slice(0, 6)}`;
    clearFailureAttempts(targetAccount);

    // 4 failed attempts are tracked
    for (let i = 1; i <= 4; i++) {
      const res = recordFailureAttempt(targetAccount, 5, 30_000);
      assert.strictEqual(res.failures, i);
      assert.strictEqual(res.remainingBeforeLockout, 5 - i);
    }

    // 5th failure triggers lockout
    assert.throws(
      () => recordFailureAttempt(targetAccount, 5, 30_000),
      (err: any) => err instanceof SecurityDomainError && err.code === 'ACCOUNT_LOCKED'
    );

    // Subsequent calls remain locked
    assert.throws(
      () => recordFailureAttempt(targetAccount, 5, 30_000),
      (err: any) => err instanceof SecurityDomainError && err.code === 'ACCOUNT_LOCKED'
    );

    // Successful authentication clears lockout
    clearFailureAttempts(targetAccount);
    const fresh = recordFailureAttempt(targetAccount, 5, 30_000);
    assert.strictEqual(fresh.failures, 1);
    assert.strictEqual(fresh.remainingBeforeLockout, 4);
    clearFailureAttempts(targetAccount);
  });

  await t.test('5. Client IP Extraction & Header Sanitization', () => {
    // Comma-separated X-Forwarded-For (extracts first real client hop)
    const multiHopHeaders = {
      'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
    };
    assert.strictEqual(extractClientIp(multiHopHeaders), '203.0.113.195');

    // X-Real-IP fallback
    const realIpHeaders = {
      'x-real-ip': '198.51.100.24',
    };
    assert.strictEqual(extractClientIp(realIpHeaders), '198.51.100.24');

    // Direct / Local connection fallback
    const emptyHeaders = {};
    assert.strictEqual(extractClientIp(emptyHeaders), '127.0.0.1');

    // Headers Web API object
    const webHeaders = new Headers();
    webHeaders.set('x-forwarded-for', '102.89.33.15, 172.69.134.1');
    assert.strictEqual(extractClientIp(webHeaders), '102.89.33.15');
  });
});
