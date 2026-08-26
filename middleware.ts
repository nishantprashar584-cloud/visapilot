import { NextResponse, type NextRequest } from "next/server";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rateLimit";

const protectedApiRoutes = new Set([
  "/api/parse-document",
  "/api/generate-cover-letter",
]);

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

function getRequestIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const headerUserId = request.headers.get("x-user-id");
  const authorization = request.headers.get("authorization");

  if (headerUserId && headerUserId.trim().length > 0) {
    return `user:${headerUserId.trim()}`;
  }

  if (authorization && authorization.trim().length > 0) {
    return `auth:${authorization.slice(0, 32)}`;
  }

  if (forwardedFor && forwardedFor.trim().length > 0) {
    return `ip:${forwardedFor.split(",")[0]?.trim()}`;
  }

  return "ip:unknown";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (protectedApiRoutes.has(pathname)) {
    const rateLimit = enforceRateLimit({
      key: buildRateLimitKey(getRequestIdentifier(request), pathname),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded. Retry later.",
        },
        { status: 429 },
      );

      response.headers.set("Retry-After", `${rateLimit.retryAfterSeconds}`);
      response.headers.set("X-RateLimit-Limit", "10");
      response.headers.set("X-RateLimit-Remaining", `${rateLimit.remaining}`);
      response.headers.set("X-RateLimit-Reset", `${Math.floor(rateLimit.resetAt / 1000)}`);

      return applySecurityHeaders(response);
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", "10");
    response.headers.set("X-RateLimit-Remaining", `${rateLimit.remaining}`);
    response.headers.set("X-RateLimit-Reset", `${Math.floor(rateLimit.resetAt / 1000)}`);
    return applySecurityHeaders(response);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};