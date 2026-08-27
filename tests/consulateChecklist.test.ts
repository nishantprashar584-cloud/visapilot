import { describe, expect, it } from "vitest";
import { calculateChecklistRequiredFunds, resolveConsulateChecklist } from "../lib/applications/consulateChecklist";
import { previewWizardApplicant } from "../lib/mock/applications";
import type { ApplicantInfo } from "../types";

function buildApplicant(overrides: Partial<ApplicantInfo["trip"]>): ApplicantInfo {
  return {
    ...previewWizardApplicant,
    trip: {
      ...previewWizardApplicant.trip,
      ...overrides,
    },
  };
}

describe("resolveConsulateChecklist", () => {
  it("resolves Spain to BLS International with daily-minimum funds logic", () => {
    const applicant = buildApplicant({
      destinationCountry: "Spain",
      stayDurationDays: 10,
    });

    const checklist = resolveConsulateChecklist(applicant);

    expect(checklist.provider).toBe("BLS International");
    expect(checklist.passportPhotoCount).toBe(2);
    expect(calculateChecklistRequiredFunds(applicant)).toBeCloseTo(1134, 2);
    expect(checklist.requiredFundsEur).toBeCloseTo(1134, 2);
    expect(checklist.checklistItems.find((item) => item.id === "bank")?.note).toContain("EUR 1134.00");
  });

  it("resolves France to VFS Global / TLScontact with the expected stacking order", () => {
    const checklist = resolveConsulateChecklist(
      buildApplicant({
        destinationCountry: "France",
        stayDurationDays: 8,
      }),
    );

    expect(checklist.provider).toBe("VFS Global / TLScontact");
    expect(checklist.documentStackOrder).toEqual([
      "Cover Letter",
      "Application Form",
      "Flight Itinerary",
      "Hotel Voucher",
      "Bank Statements",
    ]);
  });

  it("returns a valid Germany checklist output", () => {
    const checklist = resolveConsulateChecklist(
      buildApplicant({
        destinationCountry: "Germany",
        stayDurationDays: 5,
      }),
    );

    expect(checklist.provider).toBe("VFS Global / TLScontact");
    expect(checklist.checklistItems).toHaveLength(5);
    expect(checklist.requiredFundsEur).toBeCloseTo(225, 2);
  });

  it("returns a valid Italy checklist output and applies the country floor", () => {
    const checklist = resolveConsulateChecklist(
      buildApplicant({
        destinationCountry: "Italy",
        stayDurationDays: 5,
      }),
    );

    expect(checklist.provider).toBe("VFS Global / TLScontact");
    expect(checklist.requiredFundsEur).toBeCloseTo(270, 2);
    expect(checklist.checklistItems.find((item) => item.id === "appointment")?.label).toContain("appointment");
  });
});