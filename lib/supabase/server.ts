import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config";

type CookieOptions = Partial<{
  domain: string;
  expires: Date;
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
}>;

function applyCookie(
  name: string,
  value: string,
  options: CookieOptions,
): void {
  const cookieStore = cookies();

  try {
    cookieStore.set({
      name,
      value,
      ...options,
    });
  } catch {
    return;
  }
}

export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, ...options } of cookiesToSet) {
          applyCookie(name, value, options as CookieOptions);
        }
      },
    },
  });
}