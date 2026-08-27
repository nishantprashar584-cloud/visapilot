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

function cleanSentence(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/\.{2,}/g, ".");

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function buildLocalCoverLetterFallback(applicant: ApplicantInfo): string {
  const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim();
  const destinationCountry = applicant.trip.destinationCountry;
  const consulateName = buildConsulateName(destinationCountry);
  const arrivalDate = formatDate(applicant.trip.arrivalDate);
  const departureDate = formatDate(applicant.trip.departureDate);
  const purpose = applicant.trip.purpose.replace(/_/g, " ");
  const accommodations = applicant.trip.accommodations.trim();
  const bookingReference = applicant.trip.hotelBookingReference.trim();
  const firstEntryCountry = applicant.trip.firstEntryCountry.trim();
  const portOfEntry = applicant.trip.portOfEntry.trim();
  const employerName = applicant.employment.employerName?.trim() ?? "";
  const occupation = applicant.employment.occupation.trim();
  const monthlyIncome = applicant.employment.monthlyIncomeEur.toFixed(0);
  const savingsBalance = applicant.employment.savingsBalanceEur.toFixed(0);
  const returnIntent = cleanSentence(applicant.homeTies.returnIntentEvidence.trim()) || "I maintain strong professional and personal ties in my country of residence and will return promptly after my approved travel period.";
  const dependentInformation = cleanSentence(applicant.homeTies.dependentInformation?.trim() ?? "");
  const placeOfApplication = applicant.application.placeOfApplication.trim();
  const sponsorLine = applicant.sponsor.type === "self"
    ? "I will personally cover my travel, accommodation, and daily expenses."
    : `My trip support arrangement is recorded under ${applicant.sponsor.type.replace(/_/g, " ")}.`;
  const employmentLine = employerName || occupation
    ? `I am currently employed${occupation ? ` as ${occupation}` : ""}${employerName ? ` with ${employerName}` : ""}, which supports the continuity of my obligations after travel.`
    : "My current professional and personal commitments support my planned return after travel.";
  const accommodationLine = accommodations
    ? `My accommodation arrangements for this trip are confirmed as ${cleanSentence(accommodations).replace(/[.]$/, "")}${bookingReference ? ` under booking reference ${bookingReference}` : ""}.`
    : `My accommodation arrangements for the trip have been organized and are consistent with my travel dates.${bookingReference ? ` Booking reference: ${bookingReference}.` : ""}`;
  const routeLine = firstEntryCountry || portOfEntry
    ? `My itinerary reflects entry through ${firstEntryCountry || destinationCountry}${portOfEntry ? ` via ${portOfEntry}` : ""}, with travel planned from ${arrivalDate} until ${departureDate}.`
    : `My itinerary is planned from ${arrivalDate} until ${departureDate} and remains consistent across the submitted travel evidence.`;
  const dependentLine = dependentInformation
    ? `I also maintain ongoing family responsibilities, including ${dependentInformation.replace(/[.]$/, "")}.`
    : null;

  return [
    fullName || "Applicant",
    placeOfApplication || "",
    "",
    `${consulateName}`,
    "",
    `Subject: Cover Letter for Schengen Visa Application to ${destinationCountry}`,
    "",
    `Dear Visa Officer,`,
    "",
    `I am writing to respectfully submit my Schengen visa application for travel to ${destinationCountry} from ${arrivalDate} to ${departureDate} for the purpose of ${purpose}. I request that my application be considered based on the enclosed travel, accommodation, and financial supporting documents.`,
    "",
    routeLine,
    "",
    accommodationLine,
    "",
    `I am financially prepared for this trip. My monthly income is EUR ${monthlyIncome}, and I currently maintain available savings of EUR ${savingsBalance}. ${sponsorLine}`,
    "",
    employmentLine,
    "",
    dependentLine,
    dependentLine ? "" : null,
    `I maintain clear ties to my home country and fully intend to return after my temporary visit. ${returnIntent}`,
    "",
    "I respectfully assure you that I will comply with the visa conditions and return before the expiry of my authorized stay. I would be grateful for your favorable consideration of my application.",
    "",
    "Thank you for your time and consideration.",
    "",
    "Sincerely,",
    fullName || "Applicant",
  ].filter((line): line is string => line !== null).join("\n");
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
  const purpose = applicant.trip.purpose.replace(/_/g, " ");

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
                    ? "You write formal supporting letters for Schengen visa applications. Output polished markdown only, with no preamble and no code fences. The result must read like a real applicant submission and follow the requested purpose precisely."
                    : "You write formal Schengen visa cover letters. Output polished markdown only, with no preamble and no code fences. The result must read like a real consular submission, not generic AI copy.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: isCustomLetter
                  ? `Draft a formal Schengen visa supporting letter addressed to ${consulateName}. The requested letter title is: ${options.customTitle ?? "Additional supporting letter"}. The user wants this letter to cover the following points: ${options.customInstructions ?? ""}. Use the applicant context below to make the letter specific, factual, and visa-relevant. Keep it formal and credible. Do not invent facts. If a requested point is not present in the applicant record, acknowledge it carefully without fabricating details. Applicant record:\n${buildApplicantSummary(applicant)}`
                  : `Draft a consular-grade Schengen visa cover letter addressed to ${consulateName}. The letter must be specific to ${destinationCountry}, formal, factually grounded in the applicant record, and framed to support visa approval. Use the structure typically seen in real Schengen cover letters: applicant introduction, purpose of travel, exact itinerary and first-entry logic, accommodation confirmation, employment and financial capacity, home-country ties, and a respectful closing request. Include a clear subject line and salutation. Avoid sounding generic, robotic, or promotional. Do not invent facts. If a fact is missing, omit it rather than speculate. Applicant record:\n${buildApplicantSummary(applicant)}`,
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
        : buildLocalCoverLetterFallback(applicant),
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