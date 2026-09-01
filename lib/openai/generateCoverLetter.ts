import "server-only";
import { createResponseWithFallback } from "@/lib/openai";
import { buildConsultantContext, isSponsoredFundingSource } from "@/lib/consultantIntelligence";
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

function resolveResidenceCountry(applicant: ApplicantInfo): string {
  return applicant.contact.residenceCountry?.trim()
    || applicant.contact.country.trim()
    || "country of residence";
}

function buildLocalCoverLetterFallback(applicant: ApplicantInfo): string {
  const consultantContext = buildConsultantContext(applicant);
  const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim();
  const destinationCountry = applicant.trip.destinationCountry;
  const residenceCountry = resolveResidenceCountry(applicant);
  const placeOfApplication = applicant.application.placeOfApplication.trim();
  const placeOfApplicationLine = [placeOfApplication, residenceCountry === "country of residence" ? "" : residenceCountry]
    .filter(Boolean)
    .join(", ");
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
  const savingsBalance = applicant.financialEvidence?.closingBalanceEur ?? applicant.employment.savingsBalanceEur;
  const maskedAccountEnding = applicant.passport.number.slice(-4) || "XXXX";
  const currentBalanceInr = Math.round(savingsBalance * 95);
  const currentBalanceEur = savingsBalance.toFixed(0);
  const dailyAllowance = applicant.trip.stayDurationDays > 0
    ? (savingsBalance / applicant.trip.stayDurationDays).toFixed(0)
    : currentBalanceEur;
  const returnIntent = cleanSentence(applicant.homeTies.returnIntentEvidence.trim()) || "I maintain strong professional and personal ties in my country of residence and will return promptly after my approved travel period.";
  const dependentInformation = cleanSentence(applicant.homeTies.dependentInformation?.trim() ?? "");
  const sponsorLine = applicant.sponsor.type === "self"
    ? "All expenses associated with this trip, including flights, accommodation, local movement, and daily subsistence, will be fully self-funded from my personal savings."
    : `My trip is ${consultantContext.fundingSourceLabel.toLowerCase()}, and the sponsor's financial guarantees are enclosed with this application.`;
  const employmentLine = employerName || occupation
    ? `I am gainfully employed in ${residenceCountry === "country of residence" ? "my country of residence" : residenceCountry} as ${occupation || consultantContext.employmentStatusLabel.toLowerCase()}${employerName ? ` with ${employerName}` : ""}. My professional continuity there remains intact throughout this planned vacation.`
    : "My professional and personal commitments in my country of residence support my planned return after travel.";
  const accommodationLine = accommodations
    ? `My confirmed accommodation arrangements are attached and remain consistent with the submitted travel dates${bookingReference ? ` under booking reference ${bookingReference}` : ""}. ${cleanSentence(accommodations)}`
    : `My accommodation arrangements have been organized in line with the submitted travel dates.${bookingReference ? ` Booking reference: ${bookingReference}.` : ""}`;
  const routeLine = firstEntryCountry || portOfEntry
    ? `My detailed itinerary reflects entry through ${firstEntryCountry || destinationCountry}${portOfEntry ? ` via ${portOfEntry}` : ""}, with travel planned from ${arrivalDate} to ${departureDate}.`
    : `My detailed itinerary is planned from ${arrivalDate} to ${departureDate} and remains consistent across the submitted travel evidence.`;
  const dependentLine = dependentInformation
    ? `I also maintain ongoing family responsibilities in ${residenceCountry === "country of residence" ? "my country of residence" : residenceCountry}, including ${dependentInformation.replace(/[.]$/, "")}.`
    : null;
  const consultantRiskLine = applicant.employment.employmentStatus === "self_employed"
    ? `My active client relationships, tax records, and continuing work commitments in ${residenceCountry === "country of residence" ? "my country of residence" : residenceCountry} are part of the enclosed professional evidence and reinforce my return intent.`
    : isSponsoredFundingSource(applicant.sponsor.fundingSource)
      ? "The enclosed sponsor documents confirm the financial backing for this trip and should be read together with my itinerary and return-tie evidence."
      : null;

  return [
    new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    "",
    "To,",
    "The Visa Officer,",
    `Embassy of ${destinationCountry},`,
    placeOfApplicationLine || residenceCountry,
    "",
    `**Subject: Application for Short-Stay Schengen Visa (${purpose.charAt(0).toUpperCase()}${purpose.slice(1)}) - ${fullName || "Applicant"} (Passport No: ${applicant.passport.number})**`,
    "",
    "Respected Visa Officer,",
    "",
    `I am writing to formally submit my application for a short-stay Schengen ${purpose} visa to visit ${destinationCountry} and other participating Schengen member states from ${arrivalDate} to ${departureDate}.`,
    "",
    "**1. Purpose of Visit & Itinerary Overview**",
    "The primary objective of my travel is tourism, sightseeing, and experiencing the cultural heritage of Europe. My detailed day-by-day itinerary, confirmed accommodation vouchers, and travel logistics have been planned and attached to this application bundle.",
    `- **Cities to be Visited:** ${applicant.trip.memberStatesToVisit.join(", ") || destinationCountry}`,
    `- **Entry Port:** ${portOfEntry || firstEntryCountry || destinationCountry}`,
    `- **Exit Port:** ${applicant.trip.destinationCountry}`,
    "",
    routeLine,
    "",
    "**2. Employment & Professional Ties**",
    employmentLine,
    `To substantiate my financial and professional roots in ${residenceCountry === "country of residence" ? "my country of residence" : residenceCountry}, I have attached my tax and income records, employment evidence, and leave approvals where applicable.`,
    "",
    "**3. Financial Sufficiency & Bank Liquidity**",
    sponsorLine,
    `- **Primary Financial Capacity:** EUR ${currentBalanceEur} in accessible funds (approximately INR ${currentBalanceInr.toLocaleString("en-IN")}).`,
    `- **Average Daily Allowance:** Approximately EUR ${dailyAllowance} per day across the planned stay.`,
    `- **Income Profile:** Monthly income equivalent recorded at EUR ${monthlyIncome}.`,
    `- **Reference Marker:** Supporting financial records are attached and indexed against account ending ${maskedAccountEnding}.`,
    "",
    accommodationLine,
    "",
    consultantRiskLine,
    consultantRiskLine ? "" : null,
    dependentLine,
    dependentLine ? "" : null,
    "**4. Strong Ties and Obligation to Return**",
    `I maintain deep personal, familial, and economic ties to ${residenceCountry === "country of residence" ? "my country of residence" : residenceCountry} that guarantee my return upon the conclusion of my authorized stay. ${returnIntent}`,
    "",
    "I respectfully request you to process and approve my short-stay Schengen visa application. Thank you for your time, consideration, and professional evaluation of my file.",
    "",
    "Yours sincerely,",
    "",
    "___________________________",
    `**${fullName || "Applicant"}**`,
    `Email: ${applicant.contact.email}`,
    `Phone: ${applicant.contact.phone}`,
    `Address: ${[applicant.contact.addressLine1, applicant.contact.addressLine2, applicant.contact.city, applicant.contact.postalCode, residenceCountry === "country of residence" ? "" : residenceCountry].filter(Boolean).join(", ")}`,
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
                    ? "You write formal supporting letters for Schengen visa applications. Output polished markdown only, with no preamble and no code fences. The result must read like a real applicant submission and follow the requested purpose precisely."
                    : "You are an expert immigration lawyer writing Schengen cover letters. Output polished markdown only, with no preamble and no code fences. The result must read like a real consular submission, not generic AI copy. Preemptively address reasonable doubts tied to the applicant's employment profile, funding source, finances, and return intent without inventing facts.",
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
                  : `Draft a consular-grade Schengen visa cover letter addressed to ${consulateName}. The applicant is a ${consultantContext.employmentStatusLabel} and the trip is ${consultantContext.fundingSourceLabel.toLowerCase()}. If the applicant is a freelancer, emphasize home-country client ties and continuing professional obligations. If the trip is sponsored, explicitly reference the sponsor's attached financial guarantees. Use the structure typically seen in real Schengen cover letters: applicant introduction, purpose of travel, exact itinerary and first-entry logic, accommodation confirmation, employment and financial capacity, home-country ties, and a respectful closing request. Include a clear subject line and salutation. Preemptively address any doubts a consular officer may have about return intent or financial sufficiency based on this specific profile. Avoid sounding generic, robotic, or promotional. Do not invent facts. If a fact is missing, omit it rather than speculate. Applicant record:\n${buildApplicantSummary(applicant)}`,
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