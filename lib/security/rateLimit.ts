import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor?.trim()) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

export async function enforcePersistentRateLimit(
  request: Request,
  options: {
    scope: string;
    limit: number;
    windowMs: number;
  },
): Promise<RateLimitResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const identifier = user ? `user:${user.id}` : `ip:${getRequestIp(request)}`;
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_scope: options.scope,
    p_identifier: identifier,
    p_limit: options.limit,
    p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
  });

  if (error || !data || typeof data !== "object") {
    throw new Error(error?.message ?? "Persistent rate limit check failed.");
  }

  const result = data as {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
  };

  return {
    allowed: Boolean(result.allowed),
    remaining: Number.isFinite(result.remaining) ? Number(result.remaining) : 0,
    resetAt: Number.isFinite(result.resetAt) ? Number(result.resetAt) : Date.now(),
    retryAfterSeconds: Number.isFinite(result.retryAfterSeconds) ? Number(result.retryAfterSeconds) : 60,
  };
}

export function applyRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitResult,
  limit: number,
): NextResponse {
  response.headers.set("Retry-After", `${rateLimit.retryAfterSeconds}`);
  response.headers.set("X-RateLimit-Limit", `${limit}`);
  response.headers.set("X-RateLimit-Remaining", `${rateLimit.remaining}`);
  response.headers.set("X-RateLimit-Reset", `${Math.floor(rateLimit.resetAt / 1000)}`);
  return response;
}