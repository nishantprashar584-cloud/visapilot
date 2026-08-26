import { NextResponse } from "next/server";
import { z } from "zod";
import { lockApplicantIdentityFromFields } from "@/lib/security/identityLock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const identityLockSchema = z.object({
  fullName: z.string().trim().min(3, "Full name is required."),
  passportNumber: z.string().trim().min(6, "Passport number is required."),
});

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to initialize the applicant identity lock." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedRequest = identityLockSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid identity lock payload.",
          issues: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const applicantId = await lockApplicantIdentityFromFields(
      supabase,
      user.id,
      parsedRequest.data.fullName,
      parsedRequest.data.passportNumber,
    );

    return NextResponse.json({
      success: true,
      applicantId,
      message: "Identity lock initialized for this applicant.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to initialize the identity lock.",
      },
      { status: 400 },
    );
  }
}