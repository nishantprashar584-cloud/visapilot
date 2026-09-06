import { getProvenanceLabel } from "@/lib/applications/uxState";
import type { ApplicantInfo, CountrySubmissionType, DataProvenance } from "@/types";

export interface SubmissionGuideField {
  box: number;
  label: string;
  value: string;
  provenanceLabels?: string[];
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function joinOrFallback(values: string[], fallback = "Pending") {
  const filtered = values.map((value) => value.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered.join(", ") : fallback;
}

export function buildSubmissionGuideFields(applicant: ApplicantInfo): SubmissionGuideField[] {
  const fullName = [applicant.personal.firstName, applicant.personal.lastName].filter(Boolean).join(" ").trim();
  const employerBlock = [applicant.employment.employerName, applicant.employment.employerAddress].filter(Boolean).join(", ");
  const hostBlock = [applicant.trip.hostName, applicant.trip.hostAddress, applicant.trip.hostPhone].filter(Boolean).join(", ");
  const sponsorBlock = [applicant.sponsor.name, applicant.sponsor.address, applicant.sponsor.phone].filter(Boolean).join(", ");

  function withProvenance(field: SubmissionGuideField, provenance: DataProvenance[]): SubmissionGuideField {
    return {
      ...field,
      provenanceLabels: provenance.map((item) => getProvenanceLabel(item)),
    };
  }

  return [
    withProvenance({ box: 1, label: "Surname", value: applicant.personal.lastName || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 2, label: "Surname at birth", value: applicant.personal.lastNameAtBirth || applicant.personal.lastName || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 3, label: "First names", value: applicant.personal.firstName || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 4, label: "Date of birth", value: applicant.personal.dateOfBirth || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 5, label: "Place of birth", value: applicant.personal.placeOfBirth || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 6, label: "Country of birth", value: applicant.personal.countryOfBirth || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 7, label: "Current nationality", value: applicant.personal.currentNationality || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 8, label: "Nationality at birth", value: applicant.personal.nationalityAtBirth || applicant.personal.currentNationality || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 9, label: "Sex", value: applicant.personal.gender || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 10, label: "Marital status", value: applicant.personal.maritalStatus || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 11, label: "Parent / guardian details", value: hostBlock || sponsorBlock || "Not applicable" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 12, label: "National identity number", value: applicant.passport.number || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 13, label: "Travel document type", value: applicant.passport.documentType.replaceAll("_", " ") || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 14, label: "Passport number", value: applicant.passport.number || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 15, label: "Date of issue", value: applicant.passport.dateOfIssue || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 16, label: "Valid until", value: applicant.passport.dateOfExpiry || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 17, label: "Issued by", value: applicant.passport.issuedBy || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 18, label: "Residence in another country", value: applicant.contact.residenceCountry || applicant.contact.country || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 19, label: "Current occupation", value: applicant.employment.occupation || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 20, label: "Employer and employer address", value: employerBlock || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 21, label: "Main purpose of journey", value: applicant.trip.purpose.replaceAll("_", " ") || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 22, label: "Destination member states", value: joinOrFallback(applicant.trip.memberStatesToVisit) }, ["USER_CONFIRMED"]),
    withProvenance({ box: 23, label: "First member state of entry", value: applicant.trip.firstEntryCountry || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 24, label: "Number of entries requested", value: applicant.trip.entriesRequested || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 25, label: "Duration of stay", value: `${applicant.trip.stayDurationDays || 0} days` }, ["SYSTEM_CALCULATED"]),
    withProvenance({ box: 26, label: "Previous Schengen visas", value: yesNo(applicant.trip.previousSchengenVisasIssued) }, ["USER_CONFIRMED"]),
    withProvenance({ box: 27, label: "VIS fingerprints collected before", value: applicant.application.visFingerprintStatus === "yes" ? applicant.application.visFingerprintApproximateDate || "Yes" : applicant.application.visFingerprintStatus }, ["USER_CONFIRMED"]),
    withProvenance({ box: 28, label: "Entry permit for final destination", value: yesNo(applicant.application.finalDestinationPermitRequired) }, ["USER_CONFIRMED"]),
    withProvenance({ box: 29, label: "Intended arrival date", value: applicant.trip.arrivalDate || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 30, label: "Intended departure date", value: applicant.trip.departureDate || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 31, label: "Hotel address / accommodation", value: applicant.trip.accommodations || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 32, label: "Host or inviting company", value: hostBlock || applicant.trip.invitingCompanyName || "Not applicable" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 33, label: "Who pays travel costs", value: applicant.sponsor.fundingSource.replaceAll("_", " ") || "Pending" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 34, label: "Sponsor details", value: sponsorBlock || fullName || "Not applicable" }, ["USER_CONFIRMED"]),
    withProvenance({ box: 35, label: "Family relationship to EU/EEA citizen", value: "Not applicable for tourist filing" }, ["OFFICIAL_POLICY"]),
    withProvenance({ box: 36, label: "Place and date of application", value: `${applicant.application.placeOfApplication || "Pending"} on ${applicant.application.applicationDate || "Pending"}` }, ["USER_CONFIRMED"]),
    withProvenance({ box: 37, label: "Applicant signature reminder", value: `${fullName || "Applicant"} must sign the official submission form exactly as in the passport.` }, ["OFFICIAL_POLICY"]),
  ];
}

export function buildSubmissionGuideInstructions(destinationCountry: string, submissionType: CountrySubmissionType) {
  if (submissionType === "PAPER_PDF") {
    return [
      `Prepare the official ${destinationCountry} visa form beside this worksheet.`,
      "Transcribe each VisaPilot field into the flat PDF or paper form line by line.",
      "Keep the passport and hotel booking beside you so names, dates, and references match exactly.",
      "Print, sign, and stack the worksheet with the print-ready visa packet in the same order shown in your dashboard.",
    ];
  }

  return [
    `Open the official ${destinationCountry} portal in a second window.`,
    "Follow the screen order on the left while copying values from the quick-paste helper.",
    "Use your print-ready visa packet and supporting documents for uploads whenever the portal asks for proof.",
    "Return to your dashboard once the portal is submitted so tracking and appointment details stay recorded.",
  ];
}