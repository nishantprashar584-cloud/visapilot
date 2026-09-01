import { getSupportedTravelPurposeVisaLabel } from "@/lib/applications/travelPurpose";
import { buildConsultantContext, isSponsoredFundingSource } from "@/lib/consultantIntelligence";
import type { ApplicantInfo } from "@/types";

const itineraryMatrixPattern = /\n*## Itinerary Matrix[\s\S]*$/m;

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

function buildResidenceTieLine(applicant: ApplicantInfo, tiesCountry: string): string {
  switch (applicant.homeTies.propertyOwnership) {
    case "owned":
      return `I also maintain an owned residential address in ${tiesCountry}.`;
    case "family_owned":
      return `My established family residence remains in ${tiesCountry}.`;
    case "rented":
      return `My established residential tenancy remains active in ${tiesCountry}.`;
    default:
      return "";
  }
}

function buildRoutingParagraph(applicant: ApplicantInfo, arrivalDate: string, departureDate: string): string {
  const destinationCountry = applicant.trip.destinationCountry.trim() || "the principal Schengen destination";
  const firstEntryCountry = applicant.trip.firstEntryCountry.trim();
  const portOfEntry = applicant.trip.portOfEntry.trim();

  if (portOfEntry && firstEntryCountry && firstEntryCountry !== destinationCountry) {
    return `My arrival into the Schengen area is scheduled via ${portOfEntry} in ${firstEntryCountry}, after which I will continue onward to ${destinationCountry}, which remains my principal destination throughout the proposed stay from ${arrivalDate} to ${departureDate}.`;
  }

  if (portOfEntry) {
    return `My arrival into the Schengen area is scheduled via ${portOfEntry}, and ${destinationCountry} remains the principal destination for my planned stay from ${arrivalDate} to ${departureDate}.`;
  }

  if (firstEntryCountry) {
    return `My first Schengen entry is planned through ${firstEntryCountry}, with travel continuing in line with the enclosed itinerary from ${arrivalDate} to ${departureDate}.`;
  }

  return `My travel schedule is fixed from ${arrivalDate} to ${departureDate} and remains consistent with the itinerary and supporting reservations enclosed with this application.`;
}

export function stripItineraryMatrixSection(value: string): string {
  return value.replace(itineraryMatrixPattern, "").trim();
}

export function buildProfessionalCoverLetterFallback(applicant: ApplicantInfo): string {
  const consultantContext = buildConsultantContext(applicant);
  const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim() || "Applicant";
  const destinationCountry = applicant.trip.destinationCountry.trim() || "the requested Schengen state";
  const residenceCountry = resolveResidenceCountry(applicant);
  const tiesCountry = residenceCountry === "country of residence" ? "my country of residence" : residenceCountry;
  const placeOfApplication = applicant.application.placeOfApplication.trim();
  const placeOfApplicationLine = [placeOfApplication, residenceCountry === "country of residence" ? "" : residenceCountry]
    .filter(Boolean)
    .join(", ");
  const arrivalDate = formatDate(applicant.trip.arrivalDate);
  const departureDate = formatDate(applicant.trip.departureDate);
  const purpose = getSupportedTravelPurposeVisaLabel();
  const memberStates = applicant.trip.memberStatesToVisit.filter(Boolean);
  const itineraryScope = memberStates.length > 0 ? memberStates.join(", ") : destinationCountry;
  const employerName = applicant.employment.employerName?.trim() ?? "";
  const occupation = applicant.employment.occupation.trim();
  const employmentLabel = occupation || consultantContext.employmentStatusLabel.toLowerCase();
  const savingsBalance = applicant.financialEvidence?.closingBalanceEur ?? applicant.employment.savingsBalanceEur;
  const currentBalanceEur = savingsBalance.toFixed(0);
  const currentBalanceInr = Math.round(savingsBalance * 95).toLocaleString("en-IN");
  const monthlyIncome = applicant.employment.monthlyIncomeEur > 0 ? applicant.employment.monthlyIncomeEur.toFixed(0) : "0";
  const dailyAllowance = applicant.trip.stayDurationDays > 0
    ? Math.round(savingsBalance / applicant.trip.stayDurationDays).toString()
    : currentBalanceEur;
  const accommodationSummary = cleanSentence(applicant.trip.accommodations.trim());
  const bookingReference = applicant.trip.hotelBookingReference.trim();
  const maskedAccountEnding = applicant.passport.number.slice(-4) || "XXXX";
  const returnIntent = cleanSentence(applicant.homeTies.returnIntentEvidence.trim())
    || "I maintain strong professional and personal ties in my country of residence and will return promptly after my approved travel period.";
  const dependentInformation = cleanSentence(applicant.homeTies.dependentInformation?.trim() ?? "");
  const residenceTieLine = buildResidenceTieLine(applicant, tiesCountry);
  const sponsorParagraph = applicant.sponsor.type === "self"
    ? "All expenses for this trip, including international travel, accommodation, local transportation, and day-to-day expenses, will be met from my personal savings and regular income."
    : `This trip is ${consultantContext.fundingSourceLabel.toLowerCase()}, and the sponsor's supporting financial guarantees are enclosed for your review together with my own supporting records.`;
  const employmentParagraph = employerName || occupation
    ? `I am employed in ${tiesCountry} as ${employmentLabel}${employerName ? ` with ${employerName}` : ""}. My employment remains ongoing, and my professional responsibilities continue immediately upon my return.`
    : `My ongoing professional commitments in ${tiesCountry} remain active and support my clear intention to return after this temporary trip.`;
  const accommodationParagraph = accommodationSummary
    ? `Confirmed accommodation evidence has been arranged for the submitted travel period${bookingReference ? ` under booking reference ${bookingReference}` : ""}. ${accommodationSummary}`
    : `Confirmed accommodation evidence has been arranged for the submitted travel period${bookingReference ? ` under booking reference ${bookingReference}` : ""}.`;
  const consultantRiskParagraph = applicant.employment.employmentStatus === "self_employed"
    ? `My continuing client obligations, tax documentation, and active business commitments in ${tiesCountry} are also enclosed and reinforce my return intent.`
    : isSponsoredFundingSource(applicant.sponsor.fundingSource)
      ? "The enclosed sponsor documentation should be read alongside my itinerary, accommodation evidence, and home-country ties."
      : "";
  const tiesParagraph = [returnIntent, dependentInformation, residenceTieLine]
    .filter(Boolean)
    .join(" ");

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
    `Subject: Application for Short-Stay Schengen Visa (${purpose.charAt(0).toUpperCase()}${purpose.slice(1)}) - ${fullName} (Passport No: ${applicant.passport.number})`,
    "",
    "Dear Visa Officer,",
    "",
    `I respectfully submit my application for a short-stay Schengen ${purpose} visa for travel to ${destinationCountry} from ${arrivalDate} to ${departureDate}. The proposed journey is a temporary leisure visit, and the relevant supporting documents are enclosed for your consideration.`,
    "",
    "1. Travel Purpose and Proposed Itinerary",
    `The purpose of my visit is tourism and leisure travel. My itinerary has been planned in advance and covers ${itineraryScope}, with transportation and accommodation records aligned to the submitted travel dates.`,
    buildRoutingParagraph(applicant, arrivalDate, departureDate),
    "",
    `2. Employment and Professional Commitments in ${tiesCountry === "my country of residence" ? "the Home Country" : tiesCountry}`,
    employmentParagraph,
    `To support the stability of my profile, I have enclosed employment records, income evidence, and tax documentation relevant to my application.`,
    consultantRiskParagraph || null,
    "",
    "3. Financial Capacity and Accommodation Arrangements",
    sponsorParagraph,
    `I presently maintain approximately EUR ${currentBalanceEur} in accessible funds, equivalent to about INR ${currentBalanceInr}, which provides an average daily availability of approximately EUR ${dailyAllowance} over the course of this trip. My monthly income profile is recorded at approximately EUR ${monthlyIncome}, and the supporting bank records enclosed with this application are indexed against account ending ${maskedAccountEnding}.`,
    accommodationParagraph,
    "",
    `4. Return Assurances and Ties to ${tiesCountry === "my country of residence" ? "the Home Country" : tiesCountry}`,
    tiesParagraph,
    "",
    "I respectfully request that my application be considered favourably. I confirm that I will comply with the conditions of the visa and return to my country of residence before the end of the authorized stay.",
    "",
    "Yours faithfully,",
    "",
    "___________________________",
    fullName,
    `Email: ${applicant.contact.email}`,
    `Phone: ${applicant.contact.phone}`,
    `Address: ${[applicant.contact.addressLine1, applicant.contact.addressLine2, applicant.contact.city, applicant.contact.postalCode, residenceCountry === "country of residence" ? "" : residenceCountry].filter(Boolean).join(", ")}`,
  ].filter((line): line is string => line !== null).join("\n");
}