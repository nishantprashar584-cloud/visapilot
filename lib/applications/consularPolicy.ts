import type {
  ApplicantInfo,
  ApplicantProfileRequirements,
  ApplicantProfileRoute,
  RefusalReasonCode,
  UnitEconomicEstimate,
  UnitEconomicGuardrail,
} from "@/types";

export const unitEconomicGuardrails: UnitEconomicGuardrail[] = [
  {
    id: "ocr_table_extraction",
    label: "OCR & Table Extraction Service",
    maxCostUsd: 1.5,
    description: "Ingest Indian bank statements, ITR acknowledgments, Form 16 records, and digital payout histories.",
  },
  {
    id: "live_reservations_pnr",
    label: "Flight Reservation & PNR Validation",
    maxCostUsd: 2,
    description: "Maintain verifiable flight and hotel reservation references during automated review.",
  },
  {
    id: "automated_anomaly_resolution",
    label: "Automated Anomaly Resolution",
    maxCostUsd: 0.5,
    description: "Run the source-of-funds wizard and annexure generation flow when deposits or profile mismatches need clarification.",
  },
  {
    id: "cloud_pdf_vault",
    label: "Cloud PDF Processing & Vault",
    maxCostUsd: 0.5,
    description: "Encrypt, normalize, flatten, and store the packet securely.",
  },
] as const;

export const strictDocumentSequence = [
  "VFS Cover & Appointment Slip",
  "Signed Schengen Form",
  "Passport & Visas",
  "Cover Letter & Itinerary",
  "Flight & Inter-City Transit",
  "Accommodations",
  "Travel Insurance",
  "Financial Proof",
  "Employment / Ties Proof",
  "Minor / Special Docs",
  "VFS Administrative Forms",
] as const;

function calculateAge(dateOfBirth: string): number | null {
  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

export function resolveApplicantProfileRoute(applicant: ApplicantInfo): ApplicantProfileRoute {
  const age = calculateAge(applicant.personal.dateOfBirth);
  const employmentStatus = applicant.employment.employmentStatus;

  if (age !== null && age < 18 && (age < 6 || employmentStatus !== "student")) {
    return "minor_non_school";
  }

  if (employmentStatus === "student") {
    return "student";
  }

  if (employmentStatus === "self_employed" || employmentStatus === "contractor") {
    return "freelancer_self_employed";
  }

  if (employmentStatus === "employed") {
    return "salaried";
  }

  return "general";
}

export function resolveApplicantProfileRequirements(applicant: ApplicantInfo): ApplicantProfileRequirements {
  const route = resolveApplicantProfileRoute(applicant);

  switch (route) {
    case "salaried":
      return {
        route,
        label: "Salaried applicant",
        requiredDocuments: [
          "Three months of salary slips.",
          "Corporate NOC on official letterhead approving leave.",
          "Three years of ITR-V acknowledgments or Form 16 records.",
        ],
        waivedDocuments: [
          "Freelance payout statements.",
          "Business registration portfolio.",
        ],
        notes: [
          "Employment proof should align with the itinerary and declared occupation.",
        ],
      };
    case "freelancer_self_employed":
      return {
        route,
        label: "Freelancer / self-employed applicant",
        requiredDocuments: [
          "Digital payout statements from platforms such as Wise, Upwork, or Deel.",
          "Business registration evidence such as GSTIN or Udyam registration.",
          "Tax filings establishing an institutional proof-of-income trail.",
        ],
        waivedDocuments: [
          "Corporate NOC on employer letterhead.",
        ],
        notes: [
          "Irregular cash spikes should be backed by a source-of-funds explanation before packet lock.",
        ],
      };
    case "student":
      return {
        route,
        label: "Student applicant",
        requiredDocuments: [
          "Certificate of Enrollment from the school or university.",
          "Approved leave letter covering the travel dates.",
          "Parent or guardian sponsorship proof where the student is not self-funded.",
        ],
        waivedDocuments: [
          "Employment NOC on company letterhead.",
        ],
        notes: [
          "Student leave evidence should match the stated travel duration and academic calendar.",
        ],
      };
    case "minor_non_school":
      return {
        route,
        label: "Non-school minor / toddler applicant",
        requiredDocuments: [
          "Official birth certificate establishing legal parentage.",
          "Notarized parental consent affidavit from any non-traveling parent.",
          "Combined family financial sponsorship declaration.",
        ],
        waivedDocuments: [
          "School enrollment records.",
          "Employment NOC documents.",
        ],
        notes: [
          "Minor files should bind guardian identity and sponsorship evidence directly to the child packet.",
        ],
      };
    default:
      return {
        route,
        label: "General applicant",
        requiredDocuments: [
          "Income or pension evidence consistent with the declared funding plan.",
          "Return-tie evidence supporting departure from Schengen after the trip.",
        ],
        waivedDocuments: [],
        notes: [
          "Use the automated clarification flow when the route does not cleanly fit salaried, student, or freelancer patterns.",
        ],
      };
  }
}

function calculateMedian(values: number[]): number | null {
  const filtered = values.filter((value) => Number.isFinite(value) && value >= 0).sort((left, right) => left - right);

  if (filtered.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(filtered.length / 2);

  if (filtered.length % 2 === 1) {
    return filtered[middleIndex];
  }

  return (filtered[middleIndex - 1] + filtered[middleIndex]) / 2;
}

export function detectFinancialAnomaly(applicant: ApplicantInfo): {
  detected: boolean;
  thresholdEur: number | null;
  blockingReason: string | null;
} {
  const recentDeposits = applicant.financialEvidence?.recentDepositsEur ?? [];
  const median = calculateMedian(recentDeposits);

  if (median === null) {
    return {
      detected: false,
      thresholdEur: null,
      blockingReason: null,
    };
  }

  const thresholdEur = median * 3;
  const hasSpike = recentDeposits.some((deposit) => deposit > thresholdEur);
  const explanationPresent = Boolean(applicant.financialEvidence?.sourceOfFundsNote?.trim());

  if (!hasSpike || explanationPresent) {
    return {
      detected: false,
      thresholdEur,
      blockingReason: null,
    };
  }

  return {
    detected: true,
    thresholdEur,
    blockingReason: `Detected a recent deposit spike above EUR ${thresholdEur.toFixed(2)} without a source-of-funds note. Packet lock should stay blocked until an explanation is attached.`,
  };
}

export function estimateUnitEconomicCost(input: {
  requiresAutomatedAnomalyResolution: boolean;
}): UnitEconomicEstimate {
  const baselineCostUsd = unitEconomicGuardrails
    .filter((guardrail) => guardrail.id !== "automated_anomaly_resolution")
    .reduce((total, guardrail) => total + guardrail.maxCostUsd, 0);
  const automatedResolutionReserveUsd = input.requiresAutomatedAnomalyResolution
    ? unitEconomicGuardrails.find((guardrail) => guardrail.id === "automated_anomaly_resolution")?.maxCostUsd ?? 0
    : 0;
  const maximumPotentialCostUsd = baselineCostUsd + automatedResolutionReserveUsd;

  return {
    baselineCostUsd,
    automatedResolutionReserveUsd,
    maximumPotentialCostUsd,
    withinBudgetGuardrail: maximumPotentialCostUsd <= 8,
  };
}

export function buildStrictDocumentSequence(
  applicant: ApplicantInfo,
  refusalReasonCode: RefusalReasonCode | null,
): string[] {
  const profile = resolveApplicantProfileRequirements(applicant);
  const sponsorNote = applicant.sponsor.type !== "self"
    ? "Sponsor declaration, sponsor identity proof, and sponsor finances included."
    : "Self-funded file with no sponsor declaration required.";
  const returnTieNote = applicant.homeTies.returnIntentEvidence.trim().length > 0
    ? "Return-tie evidence summarized and attached."
    : "Return-tie evidence still needs to be attached.";

  return [
    `VFS Cover & Appointment Slip - system summary and booking slip placed first for intake desk review.`,
    `Signed Schengen Form - autofilled form printed and signed after field review.`,
    `Passport & Visas - passport bio page and prior visas normalized to portrait A4.`,
    `Cover Letter & Itinerary - generated narrative and synchronized day-by-day itinerary matrix.`,
    `Flight & Inter-City Transit - live PNR flight reservations plus text-based inter-city movement notes and optional proof uploads.`,
    `Accommodations - chronological hotel or host vouchers with gap checks against the itinerary.`,
    `Travel Insurance - EUR 30,000 minimum coverage certificate with travel dates highlighted.`,
    `Financial Proof - sequenced bank statements, tax records, and declared transit buffer evidence.`,
    `Employment / Ties Proof - ${profile.requiredDocuments.join(" ")} ${returnTieNote}`,
    `Minor / Special Docs - ${profile.route === "minor_non_school" ? profile.requiredDocuments.join(" ") : sponsorNote}`,
    `VFS Administrative Forms - SMS tracking, courier consent, and ancillary center forms placed last.`,
    ...(refusalReasonCode
      ? [`Annex VI Refusal Remediation - prior refusal reason ${refusalReasonCode} answered with targeted supporting evidence.`]
      : []),
  ];
}