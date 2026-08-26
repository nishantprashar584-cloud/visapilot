import { NextResponse } from "next/server";
import { z } from "zod";
import { applicantInfoSchema } from "@/lib/applications/schema";
import { generateApplicationPackage } from "@/lib/pdf/generateApplicationPackage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const applicationPackageRequestSchema = z.union([
  applicantInfoSchema,
  z.object({
    applicant: applicantInfoSchema,
    coverLetterMarkdown: z.string().trim().min(1).optional(),
  }),
]);

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to generate an application package." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedRequest = applicationPackageRequestSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid applicant payload.",
          issues: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const applicant = "applicant" in parsedRequest.data ? parsedRequest.data.applicant : parsedRequest.data;
    const coverLetterMarkdown = "applicant" in parsedRequest.data ? parsedRequest.data.coverLetterMarkdown : undefined;

    const result = await generateApplicationPackage(supabase, applicant, {
      userId: user.id,
      userEmail: user.email ?? applicant.contact.email,
      coverLetterMarkdown,
    });

    return NextResponse.json({
      applicationId: result.application.id,
      coverLetterMarkdown: result.coverLetterMarkdown,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate application package.",
      },
      { status: 500 },
    );
  }
}