import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const trackingReferenceSchema = z.object({
  referenceNumber: z
    .string()
    .trim()
    .min(4, "Reference number must be at least 4 characters.")
    .max(64, "Reference number must be 64 characters or fewer."),
});

export async function PATCH(
  request: Request,
  { params }: { params: { applicationId: string } },
) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to save a tracking reference." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedRequest = trackingReferenceSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid tracking reference payload.",
          issues: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("applications")
      .update({
        vfs_reference_number: parsedRequest.data.referenceNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.applicationId)
      .select("id, vfs_reference_number")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      applicationId: data.id,
      referenceNumber: data.vfs_reference_number,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save tracking reference.",
      },
      { status: 400 },
    );
  }
}