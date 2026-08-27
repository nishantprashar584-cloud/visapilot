import { NextResponse } from "next/server";
import { z } from "zod";
import { applicantInfoSchema } from "@/lib/applications/schema";
import { generateCoverLetterResult } from "@/lib/openai/generateCoverLetter";
import { applyRateLimitHeaders, enforcePersistentRateLimit } from "@/lib/security/rateLimit";

const aiLetterRequestSchema = z.object({
  applicant: applicantInfoSchema,
  letterKind: z.enum(["cover_letter", "custom_letter"]).default("cover_letter"),
  customTitle: z.string().trim().min(1).max(120).optional(),
  customInstructions: z.string().trim().min(1).max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimit = await enforcePersistentRateLimit(request, {
      scope: "api:generate-cover-letter",
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

      applyRateLimitHeaders(response, rateLimit, 10);
      return response;
    }

    const requestBody = await request.json();
    const parsedApplicant = applicantInfoSchema.safeParse(requestBody);

    if (parsedApplicant.success) {
      const result = await generateCoverLetterResult(parsedApplicant.data);
      const response = NextResponse.json(result);
      applyRateLimitHeaders(response, rateLimit, 10);
      return response;
    }

    const parsedRequest = aiLetterRequestSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid applicant payload.",
          issues: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await generateCoverLetterResult(parsedRequest.data.applicant, {
      letterKind: parsedRequest.data.letterKind,
      customTitle: parsedRequest.data.customTitle,
      customInstructions: parsedRequest.data.customInstructions,
    });

    const response = NextResponse.json(result);
    applyRateLimitHeaders(response, rateLimit, 10);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate cover letter.",
      },
      { status: 500 },
    );
  }
}