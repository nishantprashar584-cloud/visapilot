import { NextResponse } from "next/server";
import { applicantInfoSchema } from "@/lib/applications/schema";
import { generateCoverLetterResult } from "@/lib/openai/generateCoverLetter";

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const parsedApplicant = applicantInfoSchema.safeParse(requestBody);

    if (!parsedApplicant.success) {
      return NextResponse.json(
        {
          error: "Invalid applicant payload.",
          issues: parsedApplicant.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await generateCoverLetterResult(parsedApplicant.data);

    return NextResponse.json(result);
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