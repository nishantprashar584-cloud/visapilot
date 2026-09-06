import { describe, expect, it } from "vitest";
import { mergeApplicantDraft } from "../lib/applications/schema";
import {
  getApplicationHealth,
  getApplicationJourney,
  getCaseChangeImpact,
  getNextBestAction,
  getProvenanceLabel,
  getReadinessStaleness,
} from "../lib/applications/uxState";
import { buildApplicantDraftFromReadiness, createPreviewReadinessDraft, analyzeReadinessCase } from "../lib/case-intelligence/readiness";
import { evaluateVisaRequirements } from "../lib/requirements/evaluator";

function buildApplicant() {
  const applicant = mergeApplicantDraft(buildApplicantDraftFromReadiness(createPreviewReadinessDraft("couple")));

  applicant.personal.dateOfBirth = "1990-01-01";
  applicant.personal.placeOfBirth = "Delhi";
  applicant.contact.email = "rhea@example.com";
  applicant.contact.phone = "+919999999999";
  applicant.contact.addressLine1 = "12 Park Street";
  applicant.contact.city = "Delhi";
  applicant.contact.postalCode = "110001";
  applicant.passport.number = "P1234567";
  applicant.passport.dateOfIssue = "2022-01-01";
  applicant.passport.dateOfExpiry = "2032-01-01";
  applicant.passport.issuedBy = "India";
  applicant.passport.issuingCountry = "India";
  applicant.employment.occupation = "Product manager";
  applicant.employment.monthlyIncomeEur = 3200;
  applicant.employment.savingsBalanceEur = 8500;
  applicant.employment.employerName = "Northlane Systems";
  applicant.employment.employerAddress = "Delhi";
  applicant.sponsor.type = "self";
  applicant.sponsor.fundingSource = "self_funded";
  applicant.sponsor.name = "";
  applicant.sponsor.address = "";
  applicant.sponsor.phone = "";
  applicant.trip.portOfEntry = "Paris";
  applicant.trip.accommodations = "Hotel booking confirmed";
  applicant.trip.hotelBookingReference = "FR-12345";
  applicant.trip.memberStatesToVisit = ["France"];
  applicant.homeTies.returnIntentEvidence = "Continuing employment and family commitments in India.";
  applicant.application.placeOfApplication = "New Delhi";
  applicant.application.applicationDate = "2026-09-04";
  applicant.supportingDocuments = [
    {
      id: "passport-doc",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      kind: "pdf",
      pageCount: 1,
      sizeBytes: 1000,
      storagePath: "preview/passport.pdf",
      uploadedAt: "2026-09-04T12:00:00.000Z",
    },
    {
      id: "flight-doc",
      fileName: "flight-itinerary.pdf",
      mimeType: "application/pdf",
      kind: "pdf",
      pageCount: 2,
      sizeBytes: 1000,
      storagePath: "preview/flight-itinerary.pdf",
      uploadedAt: "2026-09-04T12:00:00.000Z",
    },
    {
      id: "hotel-doc",
      fileName: "hotel-booking.pdf",
      mimeType: "application/pdf",
      kind: "pdf",
      pageCount: 2,
      sizeBytes: 1000,
      storagePath: "preview/hotel-booking.pdf",
      uploadedAt: "2026-09-04T12:00:00.000Z",
    },
    {
      id: "insurance-doc",
      fileName: "travel-insurance.pdf",
      mimeType: "application/pdf",
      kind: "pdf",
      pageCount: 2,
      sizeBytes: 1000,
      storagePath: "preview/travel-insurance.pdf",
      uploadedAt: "2026-09-04T12:00:00.000Z",
    },
    {
      id: "bank-doc",
      fileName: "bank-statement.pdf",
      mimeType: "application/pdf",
      kind: "pdf",
      pageCount: 3,
      sizeBytes: 1000,
      storagePath: "preview/bank-statement.pdf",
      uploadedAt: "2026-09-04T12:00:00.000Z",
    },
    {
      id: "employment-doc",
      fileName: "employment-letter.pdf",
      mimeType: "application/pdf",
      kind: "pdf",
      pageCount: 1,
      sizeBytes: 1000,
      storagePath: "preview/employment-letter.pdf",
      uploadedAt: "2026-09-04T12:00:00.000Z",
    },
  ];

  return applicant;
}

describe("requirements evaluator", () => {
  it("returns stable requirement ids and satisfies the tourism bundle when evidence is present", () => {
    const applicant = buildApplicant();
    const requirements = evaluateVisaRequirements(applicant, "APPLY_MYSELF");

    expect(requirements.map((requirement) => requirement.id)).toEqual([
      "REQUIRED_PASSPORT",
      "REQUIRED_TRAVEL_INSURANCE",
      "REQUIRED_ACCOMMODATION",
      "REQUIRED_PROOF_OF_FUNDS",
      "REQUIRED_EMPLOYMENT_EVIDENCE",
      "REQUIRED_ITINERARY",
      "REQUIRED_RETURN_TIES",
    ]);
    expect(requirements.every((requirement) => requirement.status === "SATISFIED")).toBe(true);
  });

  it("marks missing insurance as action required", () => {
    const applicant = buildApplicant();
    applicant.supportingDocuments = applicant.supportingDocuments?.filter((document) => document.fileName !== "travel-insurance.pdf");

    const insuranceRequirement = evaluateVisaRequirements(applicant, "APPLY_MYSELF").find((requirement) => requirement.id === "REQUIRED_TRAVEL_INSURANCE");

    expect(insuranceRequirement?.status).toBe("MISSING");
    expect(insuranceRequirement?.severity).toBe("ACTION_REQUIRED");
  });
});

describe("application intelligence", () => {
  it("derives ready health when the bundle is complete", () => {
    const applicant = buildApplicant();
    const health = getApplicationHealth({ status: "bundle_ready", applicant, track: "APPLY_MYSELF" });

    expect(health.state).toBe("READY");
  });

  it("derives action required health for missing required evidence", () => {
    const applicant = buildApplicant();
    applicant.supportingDocuments = [];

    const health = getApplicationHealth({ status: "draft", applicant, track: "APPLY_MYSELF" });

    expect(health.state).toBe("ACTION_REQUIRED");
  });

  it("derives blocked and completed health from authoritative workflow state", () => {
    const applicant = buildApplicant();

    expect(getApplicationHealth({ status: "rejected", applicant }).state).toBe("BLOCKED");
    expect(getApplicationHealth({ status: "completed", applicant }).state).toBe("COMPLETED");
  });

  it("prioritizes missing evidence and otp over generic vault navigation", () => {
    const applicant = buildApplicant();
    applicant.supportingDocuments = applicant.supportingDocuments?.filter((document) => document.fileName !== "travel-insurance.pdf");
    const readyApplicant = buildApplicant();

    const missingEvidenceAction = getNextBestAction({ status: "draft", applicant, track: "APPLY_MYSELF" });
    const otpAction = getNextBestAction({ status: "otp_pending", applicant, track: "VIP_CONCIERGE" });
    const bundleReadyAction = getNextBestAction({ status: "bundle_ready", applicant: readyApplicant, track: "APPLY_MYSELF" });

    expect(missingEvidenceAction.requirementId).toBe("REQUIRED_TRAVEL_INSURANCE");
    expect(otpAction.id).toBe("otp_pending");
    expect(bundleReadyAction.id).toBe("smart_form_helper");
  });

  it("maps workflow states into the shared journey", () => {
    const applicant = buildApplicant();

    expect(getApplicationJourney({ status: "draft", applicant }).find((stage) => stage.tone === "current")?.id).toBe("prepare");
    expect(getApplicationJourney({ status: "bundle_ready", applicant }).find((stage) => stage.tone === "current")?.id).toBe("submit");
    expect(getApplicationJourney({ status: "appointment_booked", applicant }).find((stage) => stage.tone === "current")?.id).toBe("appointment");
    expect(getApplicationJourney({ status: "completed", applicant }).find((stage) => stage.tone === "current")?.id).toBe("completed");
  });

  it("translates provenance into user-facing labels", () => {
    expect(getProvenanceLabel("USER_ENTERED")).toBe("Entered by you");
    expect(getProvenanceLabel("DOCUMENT_EXTRACTED")).toBe("Extracted from document");
    expect(getProvenanceLabel("SYSTEM_CALCULATED")).toBe("Calculated automatically");
    expect(getProvenanceLabel("AI_INFERRED")).toBe("Suggested by VisaPilot");
  });

  it("detects deterministic change impact for travel dates, destination, funding, and travelers", () => {
    const previous = buildApplicant();
    const current = buildApplicant();

    current.trip.arrivalDate = "2026-11-01";
    current.trip.departureDate = "2026-11-10";
    current.trip.destinationCountry = "Spain";
    current.sponsor.fundingSource = "company_sponsored";
    const existingCaseContext = current.caseContext!;
    current.caseContext = {
      ...existingCaseContext,
      travelGroup: existingCaseContext.travelGroup,
      sharedContext: existingCaseContext.sharedContext,
      travelers: [...existingCaseContext.travelers, {
        id: "minor-1",
        role: "MINOR",
        displayName: "Mira Sharma",
        nationality: "Indian",
        residenceCountry: "India",
        ageGroup: "minor",
        employmentStatus: "student",
        passportAvailable: true,
        previousSchengenVisa: false,
        previousRefusal: false,
      }],
    };

    const impactIds = getCaseChangeImpact(previous, current).map((item) => item.id);

    expect(impactIds).toEqual(expect.arrayContaining([
      "duration-recalculated",
      "provider-review",
      "financial-review",
      "traveler-structure",
    ]));
  });

  it("marks readiness as stale when the current case diverges from the saved readiness assessment", () => {
    const applicant = buildApplicant();
    const readinessAssessment = analyzeReadinessCase(createPreviewReadinessDraft("couple"));

    applicant.trip.destinationCountry = "Spain";

    expect(getReadinessStaleness(readinessAssessment, applicant)).toEqual({
      stale: true,
      reason: "Destination changed, so the earlier readiness result should be refreshed.",
    });
  });
});