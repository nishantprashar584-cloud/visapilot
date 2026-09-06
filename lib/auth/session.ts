import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthenticatedAccount {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

function getAdminEmailAllowlist() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function normalizeNextPath(nextPath?: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  if (nextPath.startsWith("/auth")) {
    return "/dashboard";
  }

  return nextPath;
}

export function buildAuthRedirectPath(nextPath: string): string {
  const normalizedNextPath = normalizeNextPath(nextPath);
  return `/auth?next=${encodeURIComponent(normalizedNextPath)}`;
}

export async function getAuthenticatedAccount(): Promise<AuthenticatedAccount | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    isAdmin: user.email ? getAdminEmailAllowlist().has(user.email.toLowerCase()) : false,
  };
}