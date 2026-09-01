import { getSupportedTravelPurposeLabel } from "@/lib/applications/travelPurpose";
import type { ApplicantInfo } from "@/types";

function formatDate(value: string): string {
  if (!value) {
    return "Pending";
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

function joinValues(values: Array<string | undefined>): string {
  const filtered = values.map((value) => value?.trim() ?? "").filter(Boolean);
  return filtered.length > 0 ? filtered.join(", ") : "Pending";
}

export function buildApplicationWorksheet(args: {
  applicant: ApplicantInfo;
  templateLabel: string;
  portalUrl: string;
  guidanceMessage: string | null;
}): string {
  const { applicant, templateLabel, portalUrl, guidanceMessage } = args;
  const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim() || "Applicant";
  const sponsorName = applicant.sponsor.name?.trim() || "Self-funded";
  const previousVisas = applicant.trip.previousSchengenVisasIssued
    ? applicant.trip.previousSchengenVisas
      .map((entry) => `${formatDate(entry.validFrom)} to ${formatDate(entry.validTo)}${entry.visaNumber ? ` (${entry.visaNumber})` : ""}`)
      .join("; ")
    : "No prior Schengen visas declared";

  return [
    "VisaPilot Tourist Application Worksheet",
    "",
    `Applicant: ${fullName}`,
    `Destination: ${applicant.trip.destinationCountry}`,
    `Travel scope: ${getSupportedTravelPurposeLabel()}`,
    `Travel window: ${formatDate(applicant.trip.arrivalDate)} to ${formatDate(applicant.trip.departureDate)}`,
    `Template reference: ${templateLabel}`,
    `Official guidance: ${portalUrl}`,
    "",
    "This worksheet replaces the misaligned overlay form for flat embassy templates. Transfer these values into the official blank form only where your jurisdiction requires it, and use the master VFS bundle as the primary packet.",
    guidanceMessage ? guidanceMessage : "",
    "",
    "1. Applicant Identity",
    `- Full name: ${fullName}`,
    `- Date of birth: ${formatDate(applicant.personal.dateOfBirth)}`,
    `- Place of birth: ${joinValues([applicant.personal.placeOfBirth, applicant.personal.countryOfBirth])}`,
    `- Current nationality: ${applicant.personal.currentNationality || "Pending"}`,
    `- Marital status: ${applicant.personal.maritalStatus.replace(/_/g, " ")}`,
    "",
    "2. Passport Details",
    `- Passport number: ${applicant.passport.number || "Pending"}`,
    `- Issued by: ${applicant.passport.issuedBy || "Pending"}`,
    `- Issue date: ${formatDate(applicant.passport.dateOfIssue)}`,
    `- Expiry date: ${formatDate(applicant.passport.dateOfExpiry)}`,
    "",
    "3. Contact Details",
    `- Email: ${applicant.contact.email || "Pending"}`,
    `- Phone: ${applicant.contact.phone || "Pending"}`,
    `- Address: ${joinValues([applicant.contact.addressLine1, applicant.contact.addressLine2, applicant.contact.city, applicant.contact.postalCode, applicant.contact.residenceCountry || applicant.contact.country])}`,
    `- Place of application: ${applicant.application.placeOfApplication || "Pending"}`,
    "",
    "4. Travel Plan",
    `- Main destination: ${applicant.trip.destinationCountry || "Pending"}`,
    `- First entry country: ${applicant.trip.firstEntryCountry || "Pending"}`,
    `- Port of entry: ${applicant.trip.portOfEntry || "Pending"}`,
    `- Member states to visit: ${applicant.trip.memberStatesToVisit.join(", ") || "Pending"}`,
    `- Entries requested: ${applicant.trip.entriesRequested}`,
    `- Stay duration: ${applicant.trip.stayDurationDays} days`,
    `- Accommodation summary: ${applicant.trip.accommodations || "Pending"}`,
    `- Booking reference: ${applicant.trip.hotelBookingReference || "Pending"}`,
    "",
    "5. Employment and Funding",
    `- Employment status: ${applicant.employment.employmentStatus.replace(/_/g, " ")}`,
    `- Occupation: ${applicant.employment.occupation || "Pending"}`,
    `- Employer: ${joinValues([applicant.employment.employerName, applicant.employment.employerAddress])}`,
    `- Monthly income: EUR ${applicant.employment.monthlyIncomeEur.toFixed(0)}`,
    `- Liquid savings: EUR ${(applicant.financialEvidence?.closingBalanceEur ?? applicant.employment.savingsBalanceEur).toFixed(0)}`,
    `- Funding source: ${applicant.sponsor.fundingSource.replace(/_/g, " ")}`,
    `- Sponsor reference: ${sponsorName}`,
    "",
    "6. Previous Travel and Biometrics",
    `- Previous Schengen visas: ${previousVisas}`,
    `- VIS fingerprint status: ${applicant.application.visFingerprintStatus}`,
    `- VIS reference date: ${applicant.application.visFingerprintApproximateDate || "Pending"}`,
    `- VIS sticker number: ${applicant.application.visFingerprintStickerNumber || "Pending"}`,
    "",
    "7. Return Ties",
    `- Property status: ${applicant.homeTies.propertyOwnership.replace(/_/g, " ")}`,
    `- Dependents or obligations: ${applicant.homeTies.dependentInformation || "Pending"}`,
    `- Return-intent summary: ${applicant.homeTies.returnIntentEvidence || "Pending"}`,
  ].filter(Boolean).join("\n");
}
