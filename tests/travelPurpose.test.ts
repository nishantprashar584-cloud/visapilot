import { describe, expect, it } from "vitest";
import { normalizeApplicantTourismScope, normalizeTravelPurpose } from "../lib/applications/travelPurpose";
import { previewWizardApplicant } from "../lib/mock/applications";

describe("travelPurpose normalization", () => {
  it("normalizes any incoming purpose to tourism", () => {
    expect(normalizeTravelPurpose("business")).toBe("tourism");
    expect(normalizeTravelPurpose("family_visit")).toBe("tourism");
    expect(normalizeTravelPurpose("conference")).toBe("tourism");
    expect(normalizeTravelPurpose("tourism")).toBe("tourism");
  });

  it("forces persisted applicant scope to tourism without changing other trip fields", () => {
    const normalized = normalizeApplicantTourismScope({
      ...previewWizardApplicant,
      trip: {
        ...previewWizardApplicant.trip,
        purpose: "business",
        destinationCountry: "Spain",
      },
    });

    expect(normalized.trip.purpose).toBe("tourism");
    expect(normalized.trip.destinationCountry).toBe("Spain");
    expect(normalized.trip.entriesRequested).toBe(previewWizardApplicant.trip.entriesRequested);
  });
});
