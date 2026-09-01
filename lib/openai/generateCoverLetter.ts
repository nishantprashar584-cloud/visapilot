import "server-only";
import { buildProfessionalCoverLetterFallback } from "@/lib/applications/coverLetter";
import { getSupportedTravelPurposeLabel, getSupportedTravelPurposeValue, getSupportedTravelPurposeVisaLabel } from "@/lib/applications/travelPurpose";
import { createResponseWithFallback } from "@/lib/openai";
import { buildConsultantContext } from "@/lib/consultantIntelligence";
import type { ApplicantInfo } from "@/types";

function buildConsulateName(destinationCountry: string): string {
  return `Consulate General of ${destinationCountry}`;
}

function buildApplicantSummary(applicant: ApplicantInfo): string {
  const consultantContext = buildConsultantContext(applicant);

  return JSON.stringify(
    {
      applicantName: `${applicant.personal.firstName} ${applicant.personal.lastName}`,
      dateOfBirth: applicant.personal.dateOfBirth,
      nationality: applicant.personal.currentNationality,
      passportNumber: applicant.passport.number,
      destinationCountry: applicant.trip.destinationCountry,
      purposeOfVisit: getSupportedTravelPurposeValue(),
      supportedTravelScope: "short_stay_tourism_only",
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
        employmentStatusLabel: consultantContext.employmentStatusLabel,
        occupation: applicant.employment.occupation,
        monthlyIncomeEur: applicant.employment.monthlyIncomeEur,
        savingsBalanceEur: applicant.employment.savingsBalanceEur,
        sponsorType: applicant.sponsor.type,
        fundingSource: applicant.sponsor.fundingSource,
        fundingSourceLabel: consultantContext.fundingSourceLabel,
        statutoryFundsRequirement: consultantContext.financialRule.requiredTotalEur,
        statutoryFundsSummary: consultantContext.financialRule.summary,
      },
      requiredDocuments: consultantContext.requiredDocuments,
      homeTies: applicant.homeTies,
    },
    null,
    2,
  );
}

function cleanSentence(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/\.{2,}/g, ".");

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatDate(value: string): string {
  if (!value) {
    return "the planned travel dates";
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export type CoverLetterGenerationSource = "openai" | "fallback";

type LetterKind = "cover_letter" | "custom_letter";

type LetterGenerationOptions = {
  letterKind?: LetterKind;
  customTitle?: string;
  customInstructions?: string;
};

export type CoverLetterGenerationResult = {
  coverLetterMarkdown: string;
  source: CoverLetterGenerationSource;
};

const coverLetterAiTimeoutMs = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Cover letter generation timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function buildCustomLetterFallback(applicant: ApplicantInfo, options: LetterGenerationOptions): string {
  const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim() || "Applicant";
  const destinationCountry = applicant.trip.destinationCountry;
  const title = options.customTitle?.trim() || "Additional supporting letter";
  const instructions = cleanSentence(options.customInstructions?.trim() ?? "") || "Please prepare this additional visa-supporting letter using the applicant context below.";
  const arrivalDate = formatDate(applicant.trip.arrivalDate);
  const departureDate = formatDate(applicant.trip.departureDate);
  const purpose = getSupportedTravelPurposeVisaLabel();

  return [
    fullName,
    applicant.application.placeOfApplication.trim(),
    "",
    buildConsulateName(destinationCountry),
    "",
    `Subject: ${title}`,
    "",
    "Dear Visa Officer,",
    "",
    `I am submitting this additional supporting letter in relation to my Schengen visa application for ${destinationCountry}, planned from ${arrivalDate} to ${departureDate} for the purpose of ${purpose}.`,
    "",
    instructions,
    "",
    "This letter should be read together with my supporting documents, travel plan, financial evidence, and primary cover letter already included in the application package.",
    "",
    "I respectfully request that this additional context be considered as part of my application review.",
    "",
    "Sincerely,",
    fullName,
  ].filter(Boolean).join("\n");
}

export async function generateCoverLetterResult(
  applicant: ApplicantInfo,
  options: LetterGenerationOptions = {},
): Promise<CoverLetterGenerationResult> {
  const consultantContext = buildConsultantContext(applicant);
  const destinationCountry = applicant.trip.destinationCountry;
  const consulateName = buildConsulateName(destinationCountry);
  const letterKind = options.letterKind ?? "cover_letter";
  const isCustomLetter = letterKind === "custom_letter";

  try {
    const response = await withTimeout(
      createResponseWithFallback({
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
                  isCustomLetter
                    ? "You write formal supporting letters for Schengen visa applications. VisaPilot currently supports short-stay tourism and leisure travel only. Output polished plain text only, with no markdown, no bullets made from asterisks, no code fences, and no preamble. Keep the letter aligned to a tourist visa packet even if historical applicant data contains another purpose value. The result must read like a real applicant submission and follow the requested letter objective precisely without reframing the application into another visa category. Use business-letter spacing and professional paragraph structure."
                    : "You are an expert immigration lawyer writing Schengen cover letters. VisaPilot currently supports short-stay tourism and leisure travel only. Output polished plain text only, with no markdown, no code fences, and no preamble. Treat the application as a tourist visa packet even if historical applicant data contains another purpose value. The result must read like a real consular submission, not generic AI copy. Preemptively address reasonable doubts tied to the applicant's employment profile, funding source, finances, and return intent without inventing facts. Use a formal structure with a subject line, salutation, four numbered sections, and a closing signature block. Do not use checklist bullets inside the body unless the user explicitly asked for them. Use business-letter spacing and concise professional paragraphs."
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: isCustomLetter
                  ? `Draft a formal supporting letter for a short-stay Schengen tourist application addressed to ${consulateName}. The requested letter title is: ${options.customTitle ?? "Additional supporting letter"}. The user wants this letter to cover the following points: ${options.customInstructions ?? ""}. Keep the context anchored to tourism and leisure travel only, regardless of any stale purpose field in the applicant record. Use the applicant context below to make the letter specific, factual, and visa-relevant. Keep it formal and credible. Do not invent facts. If a requested point is not present in the applicant record, acknowledge it carefully without fabricating details. Applicant record:\n${buildApplicantSummary(applicant)}`
                  : `Draft a consular-grade short-stay Schengen tourist visa cover letter addressed to ${consulateName}. The applicant is a ${consultantContext.employmentStatusLabel} and the trip is ${consultantContext.fundingSourceLabel.toLowerCase()}. Keep the letter anchored to tourism and leisure travel only, regardless of any stale purpose field in the applicant record. If the applicant is a freelancer, emphasize home-country client ties and continuing professional obligations. If the trip is sponsored, explicitly reference the sponsor's attached financial guarantees. Use the structure typically seen in real Schengen tourist cover letters: applicant introduction, purpose of travel, exact itinerary and first-entry logic, accommodation confirmation, employment and financial capacity, home-country ties, and a respectful closing request. Include a clear subject line and salutation. Preemptively address any doubts a consular officer may have about return intent or financial sufficiency based on this specific profile. Avoid sounding generic, robotic, or promotional. Do not invent facts. If a fact is missing, omit it rather than speculate. Do not append raw itinerary tables, markdown headings, or developer-style notes to the letter body. The supported trip purpose is ${getSupportedTravelPurposeLabel().toLowerCase()}. Applicant record:\n${buildApplicantSummary(applicant)}`,
              },
            ],
          },
        ],
      }),
      coverLetterAiTimeoutMs,
    );

    if (!("output_text" in response)) {
      throw new Error("OpenAI returned an unexpected streaming response.");
    }

    const coverLetterMarkdown = response.output_text.trim();

    if (!coverLetterMarkdown) {
      throw new Error("OpenAI did not return cover letter content.");
    }

    return {
      coverLetterMarkdown,
      source: "openai",
    };
  } catch {
    return {
      coverLetterMarkdown: isCustomLetter
        ? buildCustomLetterFallback(applicant, options)
          : buildProfessionalCoverLetterFallback(applicant),
      source: "fallback",
    };
  }
}

export async function generateCoverLetterMarkdown(
  applicant: ApplicantInfo,
): Promise<string> {
  const result = await generateCoverLetterResult(applicant);
  return result.coverLetterMarkdown;
}