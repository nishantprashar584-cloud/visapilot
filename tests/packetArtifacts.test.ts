import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/DocumentStackBlueprint", () => ({
  buildDocumentSequence: vi.fn().mockReturnValue([]),
}));

import { buildConsularInterviewBrief } from "../lib/applications/packetArtifacts";
import { previewWizardApplicant } from "../lib/mock/applications";
import type { ApplicantInfo } from "../types";

function buildApplicant(overrides: Partial<ApplicantInfo> = {}): ApplicantInfo {
  return {
    ...previewWizardApplicant,
    ...overrides,
    trip: {
      ...previewWizardApplicant.trip,
      ...overrides.trip,
    },
  };
}

describe("buildConsularInterviewBrief", () => {
  it("prints the supported tourism purpose even if legacy data contains another purpose", () => {
    const applicant = buildApplicant({
      trip: {
        ...previewWizardApplicant.trip,
        purpose: "business",
      },
    });

    const brief = buildConsularInterviewBrief(applicant);

    expect(brief).toContain("Trip purpose: Tourism and leisure");
    expect(brief).not.toContain("Trip purpose: business");
  });
});