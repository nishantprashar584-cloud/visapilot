type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

function cleanupExpiredEntries(now: number): void {
  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function buildRateLimitKey(identifier: string, routeKey: string): string {
  return `${routeKey}:${identifier}`;
}

export function enforceRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const currentRecord = rateLimitStore.get(options.key);

  if (!currentRecord || currentRecord.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(options.key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  if (currentRecord.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: currentRecord.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((currentRecord.resetAt - now) / 1000)),
    };
  }

  currentRecord.count += 1;
  rateLimitStore.set(options.key, currentRecord);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - currentRecord.count),
    resetAt: currentRecord.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((currentRecord.resetAt - now) / 1000)),
  };
}