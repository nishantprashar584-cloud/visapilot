import { NextResponse } from "next/server";
import { normalizeNextPath } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    const redirectUrl = new URL("/auth", requestUrl.origin);
    redirectUrl.searchParams.set("next", nextPath);
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirectUrl = new URL("/auth", requestUrl.origin);
    redirectUrl.searchParams.set("next", nextPath);
    redirectUrl.searchParams.set("error", "exchange_failed");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}