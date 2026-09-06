import { describe, expect, it } from "vitest";
import {
  analyzeReadinessCase,
  buildCurrentReadinessDraftFromApplicant,
  buildInitialReadinessDraftFromApplicant,
  buildApplicantDraftFromReadiness,
  createReadinessHandoffKey,
  createPreviewReadinessDraft,
  createReadinessDraft,
  synchronizeApplicantReadinessContext,
} from "../lib/case-intelligence/readiness";
import { mergeApplicantDraft } from "../lib/applications/schema";

describe("readiness engine", () => {
  it("builds the expected traveller structure for family drafts", () => {
    const draft = createReadinessDraft("family", { adultCount: 2, minorCount: 3 });

    expect(draft.travelGroup).toBe("family");
    expect(draft.travelers).toHaveLength(5);
    expect(draft.travelers.map((traveler) => traveler.role)).toEqual([
      "PRIMARY",
      "PARTNER",
      "MINOR",
      "MINOR",
      "MINOR",
    ]);
    expect(draft.sharedContext.minorConsentStatus).toBe("needs_review");
  });

  it("flags blocking readiness gaps when key trip details are missing", () => {
    const draft = {
      ...createReadinessDraft("solo"),
      trip: {
        destinationCountry: "",
        purpose: "tourism" as const,
        arrivalDate: "",
        departureDate: "",
      },
    };

    const assessment = analyzeReadinessCase(draft);

    expect(assessment.label).not.toBe("Strong");
    expect(assessment.findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining(["MISSING_DESTINATION", "INVALID_TRAVEL_DATES"]),
    );
    expect(assessment.findings.some((finding) => finding.blocking)).toBe(true);
    expect(assessment.snapshot.destinationLabel).toBe("Destination not confirmed");
    expect(assessment.assumptions.find((assumption) => assumption.id === "DESTINATION")?.status).toBe("INCOMPLETE");
  });

  it("does not penalize normal couple sponsorship when supporting context is already identified", () => {
    const draft = createPreviewReadinessDraft("couple");
    const assessment = analyzeReadinessCase(draft);

    expect(assessment.findings.some((finding) => finding.id === "FUNDING_SPONSOR_DETAILS_MISSING")).toBe(false);
    expect(assessment.readyItems).toContain("Sponsor relationship evidence is identified");
    expect(assessment.findings.some((finding) => finding.blocking)).toBe(false);
  });

  it("keeps sponsor findings traceable with stable ids and explicit gaps when sponsorship details are missing", () => {
    const draft = createReadinessDraft("couple");
    draft.sharedContext.fundingArrangement = "partner_sponsors_group";
    draft.sharedContext.hasFinancialEvidence = true;
    draft.sharedContext.hasSponsorRelationshipEvidence = false;
    draft.trip.arrivalDate = "2026-10-10";
    draft.trip.departureDate = "2026-10-17";
    draft.travelers[0].displayName = "Rhea Malhotra";
    draft.travelers[1].displayName = "Arjun Malhotra";

    const assessment = analyzeReadinessCase(draft);
    const sponsorFinding = assessment.findings.find((finding) => finding.id === "FUNDING_SPONSOR_DETAILS_MISSING");

    expect(sponsorFinding?.severity).toBe("ATTENTION");
    expect(sponsorFinding?.whatWeKnow).toContain("Partner funded");
    expect(sponsorFinding?.whatWeNeed).toContain("Sponsor relationship details and supporting evidence.");
  });

  it("carries readiness context into the canonical applicant draft for paid handoff", () => {
    const draft = createPreviewReadinessDraft("family");
    const applicantDraft = buildApplicantDraftFromReadiness(draft);

    expect(applicantDraft.personal?.firstName).toBe("Aditi");
    expect(applicantDraft.personal?.lastName).toBe("Sharma");
    expect(applicantDraft.personal?.maritalStatus).toBe("married");
    expect(applicantDraft.sponsor?.fundingSource).toBe("family_sponsored");
    expect(applicantDraft.trip?.destinationCountry).toBe("Spain");
    expect(applicantDraft.trip?.stayDurationDays).toBe(9);
    expect(applicantDraft.homeTies?.dependentInformation).toContain("Mira Sharma");
    expect(applicantDraft.caseContext?.travelGroup).toBe("family");
    expect(applicantDraft.caseContext?.assessmentVersion).toBe("readiness-engine-2026-09-04");
    expect(applicantDraft.caseContext?.readinessAssessment?.snapshot.destinationLabel).toBe("Spain");
    expect(applicantDraft.caseContext?.initialReadinessDraft?.trip.destinationCountry).toBe("Spain");
    expect(applicantDraft.caseContext?.readinessSource).toBe("FREE_READINESS");
    expect(applicantDraft.caseContext?.readinessAssessment?.findings.map((finding) => finding.id)).toContain("MINOR_CONSENT_REVIEW");
  });

  it("recomputes and preserves readiness context server-side with a stable handoff key", () => {
    const readinessDraft = createPreviewReadinessDraft("couple");
    const applicantDraft = buildApplicantDraftFromReadiness(readinessDraft);
    const fullApplicant = mergeApplicantDraft(applicantDraft);
    fullApplicant.personal.dateOfBirth = "1990-01-01";
    fullApplicant.personal.placeOfBirth = "Delhi";
    fullApplicant.contact.email = "rhea@example.com";
    fullApplicant.contact.phone = "+919999999999";
    fullApplicant.contact.addressLine1 = "12 Park Street";
    fullApplicant.contact.city = "Delhi";
    fullApplicant.contact.postalCode = "110001";
    fullApplicant.passport.number = "P1234567";
    fullApplicant.passport.dateOfIssue = "2022-01-01";
    fullApplicant.passport.dateOfExpiry = "2032-01-01";
    fullApplicant.passport.issuedBy = "India";
    fullApplicant.trip.portOfEntry = "Paris";
    fullApplicant.trip.accommodations = "Hotel booking confirmed";
    fullApplicant.trip.hotelBookingReference = "FR-12345";
    fullApplicant.homeTies.returnIntentEvidence = "Continuing employment and family commitments in India.";
    fullApplicant.application.placeOfApplication = "New Delhi";
    const synchronizedApplicant = synchronizeApplicantReadinessContext(
      fullApplicant,
      { track: "APPLY_MYSELF", tier: "couple" },
    );

    const initialDraft = buildInitialReadinessDraftFromApplicant(synchronizedApplicant);
    const currentDraft = buildCurrentReadinessDraftFromApplicant(synchronizedApplicant);
    const handoffKey = createReadinessHandoffKey(synchronizedApplicant, { track: "APPLY_MYSELF", tier: "couple" });

    expect(initialDraft?.trip.destinationCountry).toBe("France");
    expect(currentDraft?.travelGroup).toBe("couple");
    expect(currentDraft?.sharedContext.hasFinancialEvidence).toBe(true);
    expect(currentDraft?.sharedContext.hasAccommodationEvidence).toBe(true);
    expect(currentDraft?.sharedContext.itineraryStatus).toBe("clear");
    expect(currentDraft?.sharedContext.homeTieStrength).toBe("clear");
    expect(currentDraft?.travelers[0]?.passportAvailable).toBe(true);
    expect(synchronizedApplicant.caseContext?.handoffKey).toBe(handoffKey);
    expect(synchronizedApplicant.caseContext?.readinessAssessment?.assessmentVersion).toBe("readiness-engine-2026-09-04");
  });

  it("resolves exact traveller document ownership from uploaded supporting files", () => {
    const readinessDraft = createReadinessDraft("family", { adultCount: 2, minorCount: 2 });
    readinessDraft.travelers[0].passportAvailable = true;
    readinessDraft.travelers[1].passportAvailable = false;
    readinessDraft.travelers[2].passportAvailable = false;
    readinessDraft.travelers[3].passportAvailable = false;
    readinessDraft.sharedContext.hasFinancialEvidence = false;
    readinessDraft.sharedContext.hasAccommodationEvidence = false;
    readinessDraft.sharedContext.hasSponsorRelationshipEvidence = false;
    readinessDraft.sharedContext.itineraryStatus = "unclear";
    readinessDraft.sharedContext.homeTieStrength = "unclear";

    const applicantDraft = buildApplicantDraftFromReadiness(readinessDraft);
    const fullApplicant = mergeApplicantDraft(applicantDraft);
    fullApplicant.homeTies.returnIntentEvidence = "";
    fullApplicant.supportingDocuments = [
      {
        id: "doc-partner-passport",
        fileName: "spouse-passport.pdf",
        mimeType: "application/pdf",
        kind: "pdf",
        pageCount: 1,
        sizeBytes: 1024,
        storagePath: "applicant-documents/user/doc-partner-passport.pdf",
        uploadedAt: "2026-09-04T12:00:00.000Z",
      },
      {
        id: "doc-minor-passport",
        fileName: "child-passport.pdf",
        mimeType: "application/pdf",
        kind: "pdf",
        pageCount: 1,
        sizeBytes: 1024,
        storagePath: "applicant-documents/user/doc-minor-passport.pdf",
        uploadedAt: "2026-09-04T12:00:00.000Z",
        evidence: {
          category: "identity",
          evidenceType: "passport",
          subjectRole: "MINOR",
          subjectTravelerId: "minor-2",
          subjectLabel: "Ishaan Sharma",
          inferredFrom: "file_name",
        },
      },
      {
        id: "doc-bank",
        fileName: "bank-statement-september.pdf",
        mimeType: "application/pdf",
        kind: "pdf",
        pageCount: 2,
        sizeBytes: 2048,
        storagePath: "applicant-documents/user/doc-bank.pdf",
        uploadedAt: "2026-09-04T12:00:00.000Z",
      },
      {
        id: "doc-hotel",
        fileName: "hotel-booking-paris.pdf",
        mimeType: "application/pdf",
        kind: "pdf",
        pageCount: 2,
        sizeBytes: 2048,
        storagePath: "applicant-documents/user/doc-hotel.pdf",
        uploadedAt: "2026-09-04T12:00:00.000Z",
      },
      {
        id: "doc-employment",
        fileName: "employment-letter.pdf",
        mimeType: "application/pdf",
        kind: "pdf",
        pageCount: 1,
        sizeBytes: 1024,
        storagePath: "applicant-documents/user/doc-employment.pdf",
        uploadedAt: "2026-09-04T12:00:00.000Z",
      },
    ];

    const currentDraft = buildCurrentReadinessDraftFromApplicant(fullApplicant);

    expect(currentDraft?.travelers[1]?.passportAvailable).toBe(true);
    expect(currentDraft?.travelers[2]?.passportAvailable).toBe(false);
    expect(currentDraft?.travelers[3]?.passportAvailable).toBe(true);
    expect(currentDraft?.sharedContext.hasFinancialEvidence).toBe(true);
    expect(currentDraft?.sharedContext.hasAccommodationEvidence).toBe(true);
    expect(currentDraft?.sharedContext.itineraryStatus).toBe("partial");
    expect(currentDraft?.sharedContext.homeTieStrength).toBe("partial");
  });
});