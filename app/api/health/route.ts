import { NextResponse } from "next/server";
import { assertCriticalServerEnv, getCriticalEnvHealth } from "@/lib/config/envCheck";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const environment = getCriticalEnvHealth();
  let database = {
    ok: false,
    latencyMs: 0,
  };

  try {
    assertCriticalServerEnv();

    const startedAt = Date.now();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("users")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    database = {
      ok: !error,
      latencyMs: Date.now() - startedAt,
    };

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      status: "ok",
      environment,
      database,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        environment,
        database,
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed.",
      },
      { status: 500 },
    );
  }
}