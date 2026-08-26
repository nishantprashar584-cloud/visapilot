import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const claimRecoverySchema = z.object({
  originalApplicationId: z.string().uuid("originalApplicationId must be a UUID."),
  refusalReasonCode: z.number().int().min(1).max(11).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to activate free re-application." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedRequest = claimRecoverySchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid recovery claim payload.",
          issues: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { data: ownedApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("id", parsedRequest.data.originalApplicationId)
      .maybeSingle();

    if (!ownedApplication) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("claim_reapplication_recovery_credit", {
      p_original_application_id: parsedRequest.data.originalApplicationId,
      p_refusal_reason_code: parsedRequest.data.refusalReasonCode ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to trigger free re-application.",
      },
      { status: 400 },
    );
  }
}