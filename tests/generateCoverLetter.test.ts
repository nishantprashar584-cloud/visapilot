import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/openai", () => ({
  createResponseWithFallback: vi.fn().mockRejectedValue(new Error("Force fallback")),
}));

import { generateCoverLetterResult } from "../lib/openai/generateCoverLetter";
import { previewWizardApplicant } from "../lib/mock/applications";
import type { ApplicantInfo } from "../types";

function buildApplicant(overrides: Partial<ApplicantInfo> = {}): ApplicantInfo {
  return {
    ...previewWizardApplicant,
    ...overrides,
    personal: {
      ...previewWizardApplicant.personal,
      ...overrides.personal,
    },
    contact: {
      ...previewWizardApplicant.contact,
      ...overrides.contact,
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
  };
}

describe("generateCoverLetterResult", () => {
  it("uses the applicant residence country in fallback output", async () => {
    const applicant = buildApplicant({
      contact: {
        ...previewWizardApplicant.contact,
        addressLine1: "18 Mall Road",
        city: "Lahore",
        postalCode: "54000",
        country: "Pakistan",
        residenceCountry: "Pakistan",
      },
      application: {
        ...previewWizardApplicant.application,
        placeOfApplication: "Lahore",
      },
      employment: {
        ...previewWizardApplicant.employment,
        occupation: "Architect",
        employerName: "Axis Studio",
      },
      homeTies: {
        ...previewWizardApplicant.homeTies,
        dependentInformation: "supports younger sibling's tuition",
        returnIntentEvidence: "Permanent employment contract and active client projects due after return.",
      },
    });

    const result = await generateCoverLetterResult(applicant);

    expect(result.source).toBe("fallback");
    expect(result.coverLetterMarkdown).toContain("Lahore, Pakistan");
    expect(result.coverLetterMarkdown).toContain("financial and professional roots in Pakistan");
    expect(result.coverLetterMarkdown).toContain("family responsibilities in Pakistan");
    expect(result.coverLetterMarkdown).not.toContain("**2. Employment & Professional Ties to India**");
    expect(result.coverLetterMarkdown).not.toContain(", India");
  });
});
