import { describe, expect, it } from "vitest";
import { calculateChecklistRequiredFunds } from "../lib/applications/consulateChecklist";
import {
  buildStrictDocumentSequence,
  detectFinancialAnomaly,
  estimateUnitEconomicCost,
  resolveApplicantProfileRequirements,
} from "../lib/applications/consularPolicy";
import { generateConsularInterviewQuestions } from "../lib/applications/interviewSimulator";
import { syncItineraryArtifacts } from "../lib/applications/itinerarySync";
import { decodeRefusalReason } from "../lib/applications/refusalDecoder";
import { previewWizardApplicant } from "../lib/mock/applications";
import { runRiskAudit } from "../lib/riskAudit";
import type { ApplicantInfo } from "../types";

function buildApplicant(overrides: Partial<ApplicantInfo> = {}): ApplicantInfo {
  return {
    ...previewWizardApplicant,
    ...overrides,
    personal: {
      ...previewWizardApplicant.personal,
      ...overrides.personal,
    },
    employment: {
      ...previewWizardApplicant.employment,
      ...overrides.employment,
    },
    trip: {
      ...previewWizardApplicant.trip,
      ...overrides.trip,
    },
    sponsor: {
      ...previewWizardApplicant.sponsor,
      ...overrides.sponsor,
    },
    homeTies: {
      ...previewWizardApplicant.homeTies,
      ...overrides.homeTies,
    },
    application: {
      ...previewWizardApplicant.application,
      ...overrides.application,
    },
    financialEvidence: {
      transitBufferEur: 0,
      recentDepositsEur: [],
      sourceOfFundsNote: "",
      incomeProofSources: [],
      ...previewWizardApplicant.financialEvidence,
      ...overrides.financialEvidence,
    },
  };
}

describe("consularPolicy", () => {
  it("adds the transit buffer to the checklist funds requirement", () => {
    const applicant = buildApplicant({
      trip: {
        ...previewWizardApplicant.trip,
        destinationCountry: "Spain",
        stayDurationDays: 10,
      },
      financialEvidence: {
        transitBufferEur: 120,
      },
    });

    expect(calculateChecklistRequiredFunds(applicant)).toBeCloseTo(1254, 2);
  });

  it("blocks a freelancer profile with unexplained deposit spikes", () => {
    const applicant = buildApplicant({
      employment: {
        ...previewWizardApplicant.employment,
        employmentStatus: "self_employed",
      },
      financialEvidence: {
        recentDepositsEur: [90, 100, 120, 500],
        sourceOfFundsNote: "",
        incomeProofSources: ["Wise", "Upwork"],
      },
    });

    const anomaly = detectFinancialAnomaly(applicant);
    const audit = runRiskAudit(applicant);

    expect(resolveApplicantProfileRequirements(applicant).route).toBe("freelancer_self_employed");
    expect(anomaly.detected).toBe(true);
    expect(anomaly.thresholdEur).toBeCloseTo(330, 2);
    expect(audit.status).toBe("RED");
    expect(audit.checks.financialAnomalyClearance).toBe(false);
    expect(audit.anomalyBlockingReason).toContain("source-of-funds note");
    expect(audit.unitEconomics.maximumPotentialCostUsd).toBeCloseTo(8, 2);
    expect(audit.unitEconomics.withinBudgetGuardrail).toBe(true);
  });

  it("routes non-school minors into the mandatory special-document sequence", () => {
    const applicant = buildApplicant({
      personal: {
        ...previewWizardApplicant.personal,
        dateOfBirth: "2023-05-20",
      },
      employment: {
        ...previewWizardApplicant.employment,
        employmentStatus: "other",
      },
    });

    const requirements = resolveApplicantProfileRequirements(applicant);
    const sequence = buildStrictDocumentSequence(applicant, null);

    expect(requirements.route).toBe("minor_non_school");
    expect(requirements.requiredDocuments).toContain("Official birth certificate establishing legal parentage.");
    expect(sequence[9]).toContain("Official birth certificate establishing legal parentage.");
    expect(sequence[9]).toContain("Notarized parental consent affidavit");
  });

  it("keeps the unit-economics ceiling under the eight-dollar guardrail", () => {
    const estimate = estimateUnitEconomicCost({ requiresManualSpotCheck: true });

    expect(estimate.baselineCostUsd).toBeCloseTo(4, 2);
    expect(estimate.maximumPotentialCostUsd).toBeCloseTo(8, 2);
    expect(estimate.withinBudgetGuardrail).toBe(true);
  });

  it("generates targeted interview questions for risky profiles", () => {
    const applicant = buildApplicant({
      employment: {
        ...previewWizardApplicant.employment,
        employmentStatus: "self_employed",
      },
      trip: {
        ...previewWizardApplicant.trip,
        previousSchengenVisasIssued: false,
        previousSchengenVisas: [],
        memberStatesToVisit: ["France", "Spain"],
      },
      financialEvidence: {
        recentDepositsEur: [100, 110, 120, 480],
      },
    });

    const questions = generateConsularInterviewQuestions(applicant);

    expect(questions.some((question) => question.id === "source-of-funds")).toBe(true);
    expect(questions.some((question) => question.id === "first-time-travel")).toBe(true);
    expect(questions.some((question) => question.id === "multi-country-split")).toBe(true);
  });

  it("decodes Annex VI refusal reasons into remediation steps", () => {
    const decoded = decodeRefusalReason(3);

    expect(decoded.title).toContain("Insufficient means of subsistence");
    expect(decoded.remediationSteps.join(" ")).toContain("source-of-funds");
  });

  it("keeps itinerary artifacts synchronized from one route matrix", () => {
    const synced = syncItineraryArtifacts({
      coverLetterMarkdown: "# Cover Letter",
      itineraryEntries: [
        {
          dayLabel: "Day 1",
          city: "Paris",
          stayType: "hotel",
          transitMode: "Eurostar",
          accommodationReference: "HTL-100",
        },
        {
          dayLabel: "Day 2",
          city: "Lyon",
          stayType: "hotel",
          transitMode: "TGV",
        },
      ],
    });

    expect(synced.coverLetterMarkdown).toContain("## Itinerary Matrix");
    expect(synced.transitLegRequirements).toContain("Paris: attach Eurostar ticket or reservation evidence.");
    expect(synced.accommodationGapWarnings).toContain("Missing accommodation reference for Day 2 in Lyon.");
  });
});