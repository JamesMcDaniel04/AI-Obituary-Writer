type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= options.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: options.limit - 1, resetMs: options.windowMs };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetMs: options.windowMs - (now - existing.windowStart),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: options.limit - existing.count,
    resetMs: options.windowMs - (now - existing.windowStart),
  };
}

export function resetRateLimit() {
  buckets.clear();
}

export function clientIpFrom(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
