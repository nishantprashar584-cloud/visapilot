import "server-only";
import { createResponseWithFallback } from "@/lib/openai";
import type { ApplicantInfo } from "@/types";

function buildConsulateName(destinationCountry: string): string {
  return `Consulate General of ${destinationCountry}`;
}

function buildApplicantSummary(applicant: ApplicantInfo): string {
  return JSON.stringify(
    {
      applicantName: `${applicant.personal.firstName} ${applicant.personal.lastName}`,
      dateOfBirth: applicant.personal.dateOfBirth,
      nationality: applicant.personal.currentNationality,
      passportNumber: applicant.passport.number,
      destinationCountry: applicant.trip.destinationCountry,
      purposeOfVisit: applicant.trip.purpose,
      itinerary: {
        arrivalDate: applicant.trip.arrivalDate,
        departureDate: applicant.trip.departureDate,
        firstEntryCountry: applicant.trip.firstEntryCountry,
        portOfEntry: applicant.trip.portOfEntry,
        accommodations: applicant.trip.accommodations,
        hotelBookingReference: applicant.trip.hotelBookingReference,
      },
      finances: {
        employmentStatus: applicant.employment.employmentStatus,
        occupation: applicant.employment.occupation,
        monthlyIncomeEur: applicant.employment.monthlyIncomeEur,
        savingsBalanceEur: applicant.employment.savingsBalanceEur,
        sponsorType: applicant.sponsor.type,
      },
      homeTies: applicant.homeTies,
    },
    null,
    2,
  );
}

export async function generateCoverLetterMarkdown(
  applicant: ApplicantInfo,
): Promise<string> {
  const destinationCountry = applicant.trip.destinationCountry;
  const consulateName = buildConsulateName(destinationCountry);

  const response = await createResponseWithFallback({
    model: "gpt-4o",
    fallbackModel: "gpt-4o-mini",
    temperature: 0.5,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You write formal Schengen visa cover letters. Output polished markdown only, with no preamble and no code fences.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Draft a consular-grade Schengen visa cover letter addressed to ${consulateName}. The letter must be specific to ${destinationCountry}, formal, factually grounded in the applicant record, and framed to support visa approval. Include a short subject line, a respectful salutation, and concise paragraphs that explicitly confirm: 1) the applicant has complete daily financial proof aligned with the destination's stay requirements, 2) the travel itinerary is internally consistent across dates, accommodation, and entry details, and 3) the applicant has clear proof of intent to return to their home country. Avoid inventing facts. If a fact is missing, omit it rather than speculate. Applicant record:\n${buildApplicantSummary(applicant)}`,
          },
        ],
      },
    ],
  });

  if (!("output_text" in response)) {
    throw new Error("OpenAI returned an unexpected streaming response.");
  }

  const coverLetterMarkdown = response.output_text.trim();

  if (!coverLetterMarkdown) {
    throw new Error("OpenAI did not return cover letter content.");
  }

  return coverLetterMarkdown;
}