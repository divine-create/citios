export class SecurityDomainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityDomainError';
  }
}

export class RateLimitExceededError extends SecurityDomainError {
  constructor(public tier: string, public retryAfterSeconds: number) {
    super(`Rate limit exceeded for tier ${tier}. Retry after ${retryAfterSeconds} seconds.`, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitExceededError';
  }
}

export class FinancialValidationError extends SecurityDomainError {
  constructor(message: string) {
    super(message, 'INVALID_FINANCIAL_INPUT');
    this.name = 'FinancialValidationError';
  }
}

export type RateLimitTier = 'AUTH' | 'CHECKOUT' | 'WALLET' | 'POS' | 'SUPPORT';

export interface TierConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitTier, TierConfig> = {
  AUTH: { limit: 5, windowMs: 60_000 },       // 5 per min
  CHECKOUT: { limit: 10, windowMs: 60_000 },  // 10 per min
  WALLET: { limit: 10, windowMs: 60_000 },    // 10 per min
  POS: { limit: 60, windowMs: 60_000 },       // 60 per min (cashiers)
  SUPPORT: { limit: 5, windowMs: 300_000 },   // 5 per 5 mins
};

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const failureTracker = new Map<string, { count: number; lockoutUntil: number }>();

/**
 * Checks and records an access attempt against a sliding rate limit window.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt <= now) {
    const newRecord: RateLimitRecord = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newRecord);
    return {
      allowed: true,
      count: 1,
      remaining: Math.max(0, limit - 1),
      resetAt: newRecord.resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      count: record.count,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSeconds,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    count: record.count,
    remaining: Math.max(0, limit - record.count),
    resetAt: record.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Enforces rate limiting for a specific security tier.
 * Throws RateLimitExceededError if the request exceeds threshold.
 */
export function enforceRateLimit(identifier: string, tier: RateLimitTier) {
  const config = RATE_LIMIT_CONFIGS[tier];
  const key = `${tier}:${identifier.trim().toLowerCase()}`;
  const result = checkRateLimit(key, config.limit, config.windowMs);

  if (!result.allowed) {
    throw new RateLimitExceededError(tier, result.retryAfterSeconds);
  }

  return result;
}

/**
 * Resets a rate limit key (useful for test isolation or admin unlocks).
 */
export function resetRateLimit(identifier: string, tier?: RateLimitTier) {
  if (tier) {
    rateLimitStore.delete(`${tier}:${identifier.trim().toLowerCase()}`);
  } else {
    for (const t of Object.keys(RATE_LIMIT_CONFIGS) as RateLimitTier[]) {
      rateLimitStore.delete(`${t}:${identifier.trim().toLowerCase()}`);
    }
  }
}

/**
 * Validates financial amounts to prevent negative numbers, NaNs, infinities, or fractional precision exploits.
 */
export function validateFinancialAmount(amount: unknown, fieldName = 'amount'): number {
  if (typeof amount !== 'number') {
    throw new FinancialValidationError(`Field '${fieldName}' must be a numeric value`);
  }

  if (Number.isNaN(amount)) {
    throw new FinancialValidationError(`Field '${fieldName}' cannot be NaN`);
  }

  if (!Number.isFinite(amount)) {
    throw new FinancialValidationError(`Field '${fieldName}' cannot be infinite`);
  }

  if (amount <= 0) {
    throw new FinancialValidationError(`Field '${fieldName}' must be greater than zero`);
  }

  // Ensure precision doesn't exceed 2 decimal places (kobo/cents)
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(amount - rounded) > 0.0001) {
    throw new FinancialValidationError(`Field '${fieldName}' has invalid fractional decimal precision`);
  }

  return rounded;
}

/**
 * Tracks and guards against brute-force attacks by recording authentication/authorization failures.
 */
export function recordFailureAttempt(identifier: string, maxFailures = 5, lockoutDurationMs = 300_000) {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = failureTracker.get(key) || { count: 0, lockoutUntil: 0 };

  if (record.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    throw new SecurityDomainError(
      `Account locked due to excessive failed attempts. Try again in ${remainingSeconds}s.`,
      'ACCOUNT_LOCKED'
    );
  }

  record.count += 1;
  if (record.count >= maxFailures) {
    record.lockoutUntil = now + lockoutDurationMs;
    failureTracker.set(key, record);
    throw new SecurityDomainError(
      `Account temporarily locked due to excessive failed attempts. Lockout duration: ${Math.round(lockoutDurationMs / 1000)}s.`,
      'ACCOUNT_LOCKED'
    );
  }

  failureTracker.set(key, record);
  return { failures: record.count, remainingBeforeLockout: maxFailures - record.count };
}

/**
 * Clears recorded failures upon successful authentication.
 */
export function clearFailureAttempts(identifier: string) {
  failureTracker.delete(identifier.trim().toLowerCase());
}

/**
 * Safely extracts client IP address from request headers.
 */
export function extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  let forwardedFor: string | string[] | undefined;

  if (typeof (headers as Headers).get === 'function') {
    forwardedFor = (headers as Headers).get('x-forwarded-for') || (headers as Headers).get('x-real-ip') || undefined;
  } else {
    const record = headers as Record<string, string | string[] | undefined>;
    forwardedFor = record['x-forwarded-for'] || record['x-real-ip'];
  }

  if (Array.isArray(forwardedFor)) {
    forwardedFor = forwardedFor[0];
  }

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    // Return first hop in comma-separated list
    return forwardedFor.split(',')[0].trim();
  }

  return '127.0.0.1';
}
