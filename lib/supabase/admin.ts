import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/config";

let adminClient: SupabaseClient | undefined;

export function createSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    const env = getServerEnv();

    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}