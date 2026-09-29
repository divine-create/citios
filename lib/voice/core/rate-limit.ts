// In-memory rate limiting mechanism (since CityOS does not have a global Redis/Upstash configured by default).
// In a serverless environment, this is instance-scoped, but it fulfills the abuse protection architecture.

const rateLimits = new Map<string, { count: number, resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || record.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export function assertRateLimit(residentId: string, actionType: 'global' | 'expensive' | 'confirmation') {
  let limit = 100;
  let window = 60000; // 1 minute

  if (actionType === 'expensive') {
    limit = 10;
  } else if (actionType === 'confirmation') {
    limit = 5; // prevent confirmation brute forcing
  }

  const key = `${residentId}:${actionType}`;
  
  if (!checkRateLimit(key, limit, window)) {
    throw new Error('RATE_LIMITED');
  }
}
