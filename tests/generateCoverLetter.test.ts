import { describe, expect, it, vi } from "vitest";

const { createResponseWithFallbackMock } = vi.hoisted(() => ({
  createResponseWithFallbackMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/openai", () => ({
  createResponseWithFallback: createResponseWithFallbackMock,
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
    createResponseWithFallbackMock.mockRejectedValueOnce(new Error("Force fallback"));

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
    expect(result.coverLetterMarkdown).toContain("Dear Visa Officer,");
    expect(result.coverLetterMarkdown).toContain("2. Employment and Professional Commitments in Pakistan");
    expect(result.coverLetterMarkdown).toContain("4. Return Assurances and Ties to Pakistan");
    expect(result.coverLetterMarkdown).not.toContain("**2. Employment & Professional Ties to India**");
    expect(result.coverLetterMarkdown).not.toContain(", India");
    expect(result.coverLetterMarkdown).not.toContain("## Itinerary Matrix");
  });

  it("normalizes occupation casing in fallback output", async () => {
    createResponseWithFallbackMock.mockRejectedValueOnce(new Error("Force fallback"));

    const applicant = buildApplicant({
      employment: {
        ...previewWizardApplicant.employment,
        occupation: "product manager",
        employerName: "Northlane Systems",
      },
    });

    const result = await generateCoverLetterResult(applicant);

    expect(result.source).toBe("fallback");
    expect(result.coverLetterMarkdown).toContain("as Product Manager with Northlane Systems");
  });

  it("forces tourism-only framing in the AI prompt even when legacy purpose data differs", async () => {
    createResponseWithFallbackMock.mockResolvedValueOnce({
      output_text: "Tourism-only cover letter",
    });

    const applicant = buildApplicant({
      trip: {
        ...previewWizardApplicant.trip,
        purpose: "business",
      },
    });

    const result = await generateCoverLetterResult(applicant);
    const requestPayload = createResponseWithFallbackMock.mock.calls[0][0];
    const inputText = requestPayload.input
      .flatMap((message: { content: Array<{ text?: string }> }) => message.content)
      .map((part: { text?: string }) => part.text ?? "")
      .join("\n");

    expect(result.source).toBe("openai");
    expect(inputText).toContain("supports short-stay tourism and leisure travel only");
    expect(inputText).toContain('"purposeOfVisit": "tourism"');
    expect(inputText).not.toContain('"purposeOfVisit": "business"');
    expect(inputText).toContain("supported trip purpose is tourism and leisure");
  });
});
