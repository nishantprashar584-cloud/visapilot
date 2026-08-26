import { NextResponse } from "next/server";
import { applicantInfoSchema } from "@/lib/applications/schema";
import { generateCoverLetterMarkdown } from "@/lib/openai/generateCoverLetter";

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

    const coverLetterMarkdown = await generateCoverLetterMarkdown(parsedApplicant.data);

    return NextResponse.json({ coverLetterMarkdown });
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