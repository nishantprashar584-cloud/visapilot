import { calculateStayDurationDays } from "@/lib/applications/schema";
import { resolveSchengenCountryRule } from "@/config/schengen-rules";
import { inferSupportingDocumentEvidence } from "@/lib/documents/supportingDocuments";
import type {
  ApplicantInfo,
  CaseAssumption,
  CaseFinding,
  CaseFindingCategory,
  CaseFindingSeverity,
  CaseReadinessAssessment,
  CaseSnapshot,
  CaseContext,
  EmploymentStatus,
  FundingSource,
  ReadinessDraft,
  ReadinessSharedContext,
  ReadinessTravelerProfile,
  SupportingDocument,
  TravelGroup,
} from "@/types";

const readinessDisclaimer = "VisaPilot provides a preliminary preparation and readiness assessment based on the information you provide. It does not make the visa decision and cannot guarantee visa issuance.";
const readinessPolicyVersion = "readiness-policy-2026-09-04";
const readinessAssessmentVersion = "readiness-engine-2026-09-04";

const dimensionOrder = [
  { id: "identity", label: "Identity" },
  { id: "travel", label: "Travel Plan" },
  { id: "financial", label: "Financial Evidence" },
  { id: "accommodation", label: "Accommodation" },
  { id: "employment", label: "Employment/Home Ties" },
  { id: "history", label: "Visa/Travel History" },
  { id: "consistency", label: "Consistency" },
] as const;

const severityPenalty: Record<CaseFindingSeverity, number> = {
  INFO: 5,
  ATTENTION: 14,
  WARNING: 24,
  BLOCKING: 40,
};

function employmentLabel(value: EmploymentStatus): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTraveler(id: string, role: ReadinessTravelerProfile["role"], overrides?: Partial<ReadinessTravelerProfile>): ReadinessTravelerProfile {
  return {
    id,
    role,
    displayName: overrides?.displayName ?? "",
    relationshipLabel: overrides?.relationshipLabel ?? (role === "PARTNER" ? "Spouse or partner" : role === "MINOR" ? "Child or minor" : role === "ADULT" ? "Adult family member" : "Primary traveller"),
    nationality: overrides?.nationality ?? "Indian",
    residenceCountry: overrides?.residenceCountry ?? "India",
    ageGroup: overrides?.ageGroup ?? (role === "MINOR" ? "minor" : "25_39"),
    employmentStatus: overrides?.employmentStatus ?? (role === "MINOR" ? "student" : "employed"),
    passportAvailable: overrides?.passportAvailable ?? true,
    previousSchengenVisa: overrides?.previousSchengenVisa ?? false,
    previousRefusal: overrides?.previousRefusal ?? false,
  };
}

export function createReadinessDraft(travelGroup: TravelGroup, options?: { adultCount?: number; minorCount?: number }): ReadinessDraft {
  if (travelGroup === "couple") {
    return {
      travelGroup,
      trip: {
        destinationCountry: "France",
        purpose: "tourism",
        arrivalDate: "",
        departureDate: "",
      },
      travelers: [
        buildTraveler("primary", "PRIMARY"),
        buildTraveler("partner", "PARTNER"),
      ],
      sharedContext: {
        travelingTogether: true,
        sameDestination: true,
        sameDates: true,
        sameAccommodation: true,
        sameItinerary: true,
        fundingArrangement: "shared_between_adults",
        accommodationStatus: "partial",
        itineraryStatus: "partial",
        homeTieStrength: "partial",
        hasFinancialEvidence: false,
        hasAccommodationEvidence: false,
        hasSponsorRelationshipEvidence: false,
        minorConsentStatus: "not_applicable",
        notes: "",
      },
    };
  }

  if (travelGroup === "family") {
    const adultCount = Math.min(Math.max(options?.adultCount ?? 2, 1), 2);
    const minorCount = Math.min(Math.max(options?.minorCount ?? 1, 1), 3);
    const travelers = [buildTraveler("primary", "PRIMARY")];

    if (adultCount === 2) {
      travelers.push(buildTraveler("adult-2", "PARTNER"));
    }

    for (let index = 0; index < minorCount; index += 1) {
      travelers.push(buildTraveler(`minor-${index + 1}`, "MINOR"));
    }

    return {
      travelGroup,
      trip: {
        destinationCountry: "France",
        purpose: "tourism",
        arrivalDate: "",
        departureDate: "",
      },
      travelers,
      sharedContext: {
        travelingTogether: true,
        sameDestination: true,
        sameDates: true,
        sameAccommodation: true,
        sameItinerary: true,
        fundingArrangement: "primary_sponsors_group",
        accommodationStatus: "partial",
        itineraryStatus: "partial",
        homeTieStrength: "partial",
        hasFinancialEvidence: false,
        hasAccommodationEvidence: false,
        hasSponsorRelationshipEvidence: false,
        minorConsentStatus: "needs_review",
        notes: "",
      },
    };
  }

  return {
    travelGroup: "solo",
    trip: {
      destinationCountry: "France",
      purpose: "tourism",
      arrivalDate: "",
      departureDate: "",
    },
    travelers: [buildTraveler("primary", "PRIMARY")],
    sharedContext: {
      travelingTogether: true,
      sameDestination: true,
      sameDates: true,
      sameAccommodation: true,
      sameItinerary: true,
      fundingArrangement: "self_funded",
      accommodationStatus: "partial",
      itineraryStatus: "partial",
      homeTieStrength: "partial",
      hasFinancialEvidence: false,
      hasAccommodationEvidence: false,
      hasSponsorRelationshipEvidence: false,
      minorConsentStatus: "not_applicable",
      notes: "",
    },
  };
}

export function createPreviewReadinessDraft(travelGroup: TravelGroup = "couple"): ReadinessDraft {
  if (travelGroup === "family") {
    return {
      ...createReadinessDraft("family", { adultCount: 2, minorCount: 2 }),
      trip: {
        destinationCountry: "Spain",
        purpose: "tourism",
        arrivalDate: "2026-10-10",
        departureDate: "2026-10-19",
      },
      travelers: [
        buildTraveler("primary", "PRIMARY", { displayName: "Aditi Sharma", employmentStatus: "employed", previousSchengenVisa: true }),
        buildTraveler("adult-2", "PARTNER", { displayName: "Karan Sharma", employmentStatus: "homemaker" }),
        buildTraveler("minor-1", "MINOR", { displayName: "Mira Sharma", passportAvailable: true }),
        buildTraveler("minor-2", "MINOR", { displayName: "Ishaan Sharma", passportAvailable: false }),
      ],
      sharedContext: {
        travelingTogether: true,
        sameDestination: true,
        sameDates: true,
        sameAccommodation: true,
        sameItinerary: true,
        fundingArrangement: "primary_sponsors_group",
        accommodationStatus: "confirmed",
        itineraryStatus: "clear",
        homeTieStrength: "clear",
        hasFinancialEvidence: true,
        hasAccommodationEvidence: true,
        hasSponsorRelationshipEvidence: true,
        minorConsentStatus: "needs_review",
        notes: "Primary applicant funds the family trip.",
      },
    };
  }

  return {
    ...createReadinessDraft("couple"),
    trip: {
      destinationCountry: "France",
      purpose: "tourism",
      arrivalDate: "2026-10-10",
      departureDate: "2026-10-17",
    },
    travelers: [
      buildTraveler("primary", "PRIMARY", { displayName: "Rhea Malhotra", employmentStatus: "employed", previousSchengenVisa: true }),
      buildTraveler("partner", "PARTNER", { displayName: "Arjun Malhotra", employmentStatus: "homemaker" }),
    ],
    sharedContext: {
      travelingTogether: true,
      sameDestination: true,
      sameDates: true,
      sameAccommodation: true,
      sameItinerary: true,
      fundingArrangement: "primary_sponsors_group",
      accommodationStatus: "confirmed",
      itineraryStatus: "clear",
      homeTieStrength: "clear",
      hasFinancialEvidence: true,
      hasAccommodationEvidence: true,
      hasSponsorRelationshipEvidence: true,
      minorConsentStatus: "not_applicable",
      notes: "Primary applicant is funding both travellers and will document the relationship.",
    },
  };
}

export function isReadinessDraft(value: unknown): value is ReadinessDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<ReadinessDraft>;
  return (
    typeof draft.travelGroup === "string"
    && Array.isArray(draft.travelers)
    && !!draft.trip
    && typeof draft.trip === "object"
    && !!draft.sharedContext
    && typeof draft.sharedContext === "object"
  );
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function sanitizeCaseContextForHandoff(caseContext: CaseContext | undefined) {
  if (!caseContext) {
    return null;
  }

  return {
    travelGroup: caseContext.travelGroup,
    travelers: caseContext.travelers,
    sharedContext: caseContext.sharedContext,
    initialReadinessDraft: caseContext.initialReadinessDraft,
    readinessSource: caseContext.readinessSource,
  };
}

function buildHandoffComparableValue(applicant: ApplicantInfo, selection?: { track?: string; tier?: string }) {
  return {
    personal: applicant.personal,
    contact: applicant.contact,
    passport: applicant.passport,
    employment: applicant.employment,
    trip: applicant.trip,
    sponsor: applicant.sponsor,
    homeTies: applicant.homeTies,
    financialEvidence: applicant.financialEvidence,
    supportingDocuments: applicant.supportingDocuments,
    caseContext: sanitizeCaseContextForHandoff(applicant.caseContext),
    selection: selection ?? null,
  };
}

export function createReadinessHandoffKey(applicant: ApplicantInfo, selection?: { track?: string; tier?: string }): string | null {
  if (!applicant.caseContext) {
    return null;
  }

  return JSON.stringify(sortValue(buildHandoffComparableValue(applicant, selection)));
}

export function buildInitialReadinessDraftFromApplicant(applicant: ApplicantInfo): ReadinessDraft | null {
  const embeddedDraft = applicant.caseContext?.initialReadinessDraft;

  if (isReadinessDraft(embeddedDraft)) {
    return embeddedDraft;
  }

  const caseContext = applicant.caseContext;

  if (!caseContext || !Array.isArray(caseContext.travelers) || !caseContext.sharedContext) {
    return null;
  }

  return {
    travelGroup: caseContext.travelGroup,
    trip: {
      destinationCountry: applicant.trip.destinationCountry,
      purpose: applicant.trip.purpose,
      arrivalDate: applicant.trip.arrivalDate,
      departureDate: applicant.trip.departureDate,
    },
    travelers: caseContext.travelers,
    sharedContext: caseContext.sharedContext,
  };
}

function hasPrimaryPassportEvidence(applicant: ApplicantInfo): boolean {
  return applicant.passport.number.trim().length >= 6 && applicant.passport.dateOfExpiry.trim().length > 0;
}

function getSupportingDocumentEvidence(document: SupportingDocument) {
  return document.evidence ?? inferSupportingDocumentEvidence(document.fileName);
}

function hasSupportingEvidence(applicant: ApplicantInfo, predicate: (document: SupportingDocument) => boolean): boolean {
  return (applicant.supportingDocuments ?? []).some((document) => predicate(document));
}

function hasTravelerPassportSupportingEvidence(applicant: ApplicantInfo, traveler: ReadinessTravelerProfile): boolean {
  return hasSupportingEvidence(applicant, (document) => {
    const evidence = getSupportingDocumentEvidence(document);

    if (evidence.evidenceType !== "passport" || evidence.category !== "identity") {
      return false;
    }

    if (evidence.subjectTravelerId) {
      return evidence.subjectTravelerId === traveler.id;
    }

    if (traveler.role === "PRIMARY") {
      return evidence.subjectRole === "PRIMARY" || evidence.subjectRole === "GROUP" || evidence.subjectRole === "UNKNOWN";
    }

    if (traveler.role === "PARTNER") {
      return evidence.subjectRole === "PARTNER" || evidence.subjectRole === "GROUP";
    }

    if (traveler.role === "MINOR") {
      return evidence.subjectRole === "MINOR" || evidence.subjectRole === "GROUP";
    }

    return evidence.subjectRole === traveler.role || evidence.subjectRole === "GROUP";
  });
}

function hasFinancialEvidenceFromApplicant(applicant: ApplicantInfo): boolean {
  return applicant.employment.savingsBalanceEur > 0
    || (applicant.financialEvidence?.closingBalanceEur ?? 0) > 0
    || (applicant.financialEvidence?.incomeProofSources?.length ?? 0) > 0
    || hasSupportingEvidence(applicant, (document) => {
      const evidence = getSupportingDocumentEvidence(document);
      return evidence.category === "financial" || evidence.evidenceType === "employment_letter" || evidence.evidenceType === "sponsor_letter";
    });
}

function hasAccommodationEvidenceFromApplicant(applicant: ApplicantInfo): boolean {
  return applicant.trip.accommodations.trim().length >= 5
    || applicant.trip.hotelBookingReference.trim().length >= 3
    || hasSupportingEvidence(applicant, (document) => {
      const evidence = getSupportingDocumentEvidence(document);
      return evidence.evidenceType === "hotel_booking" || evidence.evidenceType === "flight_itinerary";
    });
}

function hasSponsorRelationshipEvidenceFromApplicant(applicant: ApplicantInfo): boolean {
  return applicant.sponsor.name?.trim().length !== 0
    || applicant.sponsor.email?.trim().length !== 0
    || applicant.sponsor.address?.trim().length !== 0
    || applicant.homeTies.dependentInformation?.trim().length !== 0
    || hasSupportingEvidence(applicant, (document) => {
      const evidence = getSupportingDocumentEvidence(document);
      return evidence.evidenceType === "sponsor_letter" || evidence.evidenceType === "relationship_proof" || evidence.evidenceType === "minor_consent";
    });
}

function deriveAccommodationStatusFromApplicant(applicant: ApplicantInfo, source: ReadinessSharedContext): ReadinessSharedContext["accommodationStatus"] {
  if (applicant.trip.accommodations.trim().length >= 5 && applicant.trip.hotelBookingReference.trim().length >= 3) {
    return "confirmed";
  }

  if (applicant.trip.accommodations.trim().length >= 5 || applicant.trip.hotelBookingReference.trim().length >= 3) {
    return "partial";
  }

  return source.accommodationStatus;
}

function deriveItineraryStatusFromApplicant(applicant: ApplicantInfo, source: ReadinessSharedContext): ReadinessSharedContext["itineraryStatus"] {
  const hasValidDates = calculateStayDurationDays(applicant.trip.arrivalDate, applicant.trip.departureDate) > 0;
  const hasRoute = applicant.trip.portOfEntry.trim().length > 0 || applicant.trip.memberStatesToVisit.length > 0;
  const hasUploadedTravelEvidence = hasSupportingEvidence(applicant, (document) => {
    const evidence = getSupportingDocumentEvidence(document);
    return evidence.evidenceType === "flight_itinerary" || evidence.evidenceType === "hotel_booking";
  });

  if (hasValidDates && hasRoute && applicant.trip.destinationCountry.trim().length > 0) {
    return "clear";
  }

  if (hasValidDates || hasRoute || hasUploadedTravelEvidence) {
    return "partial";
  }

  return source.itineraryStatus;
}

function deriveHomeTieStrengthFromApplicant(applicant: ApplicantInfo, source: ReadinessSharedContext): ReadinessSharedContext["homeTieStrength"] {
  const returnEvidenceLength = applicant.homeTies.returnIntentEvidence.trim().length;
  const hasUploadedReturnTieEvidence = hasSupportingEvidence(applicant, (document) => {
    const evidence = getSupportingDocumentEvidence(document);
    return evidence.evidenceType === "employment_letter" || evidence.evidenceType === "relationship_proof";
  });

  if (returnEvidenceLength >= 24) {
    return "clear";
  }

  if (returnEvidenceLength >= 12) {
    return "partial";
  }

  if (hasUploadedReturnTieEvidence) {
    return "partial";
  }

  return source.homeTieStrength;
}

function deriveCurrentTravelersFromApplicant(applicant: ApplicantInfo, travelers: ReadinessTravelerProfile[]): ReadinessTravelerProfile[] {
  return travelers.map((traveler) => {
    if (traveler.role !== "PRIMARY") {
      return {
        ...traveler,
        passportAvailable: traveler.passportAvailable || hasTravelerPassportSupportingEvidence(applicant, traveler),
      };
    }

    const fullName = [applicant.personal.firstName, applicant.personal.lastName].filter(Boolean).join(" ").trim();

    return {
      ...traveler,
      displayName: fullName || traveler.displayName,
      nationality: applicant.personal.currentNationality || traveler.nationality,
      residenceCountry: applicant.contact.country || traveler.residenceCountry,
      employmentStatus: applicant.employment.employmentStatus,
      passportAvailable: traveler.passportAvailable || hasPrimaryPassportEvidence(applicant) || hasTravelerPassportSupportingEvidence(applicant, traveler),
      previousSchengenVisa: applicant.trip.previousSchengenVisasIssued || traveler.previousSchengenVisa,
    };
  });
}

function deriveCurrentSharedContextFromApplicant(applicant: ApplicantInfo, source: ReadinessSharedContext): ReadinessSharedContext {
  const derivedAccommodationStatus = deriveAccommodationStatusFromApplicant(applicant, source);
  const derivedHasAccommodationEvidence = source.hasAccommodationEvidence || hasAccommodationEvidenceFromApplicant(applicant);
  const derivedHasFinancialEvidence = source.hasFinancialEvidence || hasFinancialEvidenceFromApplicant(applicant);
  const derivedHasSponsorRelationshipEvidence = source.hasSponsorRelationshipEvidence || hasSponsorRelationshipEvidenceFromApplicant(applicant);

  return {
    ...source,
    accommodationStatus: derivedAccommodationStatus,
    itineraryStatus: deriveItineraryStatusFromApplicant(applicant, source),
    homeTieStrength: deriveHomeTieStrengthFromApplicant(applicant, source),
    hasFinancialEvidence: derivedHasFinancialEvidence,
    hasAccommodationEvidence: derivedHasAccommodationEvidence,
    hasSponsorRelationshipEvidence: derivedHasSponsorRelationshipEvidence,
  };
}

export function buildCurrentReadinessDraftFromApplicant(applicant: ApplicantInfo): ReadinessDraft | null {
  const caseContext = applicant.caseContext;
  const fallbackDraft = buildInitialReadinessDraftFromApplicant(applicant);

  if (!caseContext && !fallbackDraft) {
    return null;
  }

  const sourceTravelGroup = caseContext?.travelGroup ?? fallbackDraft?.travelGroup;
  const sourceTravelers = caseContext?.travelers ?? fallbackDraft?.travelers;
  const sourceSharedContext = caseContext?.sharedContext ?? fallbackDraft?.sharedContext;

  if (!sourceTravelGroup || !sourceTravelers || !sourceSharedContext) {
    return null;
  }

  const derivedTravelers = deriveCurrentTravelersFromApplicant(applicant, sourceTravelers);
  const derivedSharedContext = deriveCurrentSharedContextFromApplicant(applicant, sourceSharedContext);

  return {
    travelGroup: sourceTravelGroup,
    trip: {
      destinationCountry: applicant.trip.destinationCountry,
      purpose: applicant.trip.purpose,
      arrivalDate: applicant.trip.arrivalDate,
      departureDate: applicant.trip.departureDate,
    },
    travelers: derivedTravelers,
    sharedContext: derivedSharedContext,
  };
}

export function synchronizeApplicantReadinessContext(applicant: ApplicantInfo, selection?: { track?: string; tier?: string }): ApplicantInfo {
  const currentDraft = buildCurrentReadinessDraftFromApplicant(applicant);

  if (!currentDraft) {
    return applicant;
  }

  const initialDraft = buildInitialReadinessDraftFromApplicant(applicant) ?? currentDraft;
  const initialAssessment = analyzeReadinessCase(initialDraft);
  const handoffKey = createReadinessHandoffKey(
    {
      ...applicant,
      caseContext: {
        ...applicant.caseContext,
        travelGroup: currentDraft.travelGroup,
        travelers: currentDraft.travelers,
        sharedContext: currentDraft.sharedContext,
        initialReadinessDraft: initialDraft,
        readinessAssessment: initialAssessment,
        assessmentVersion: initialAssessment.assessmentVersion,
        policyVersion: initialAssessment.policyVersion,
        assessmentDate: initialAssessment.assessmentDate,
        readinessSource: "FREE_READINESS",
      },
    },
    selection,
  );

  return {
    ...applicant,
    caseContext: {
      ...applicant.caseContext,
      travelGroup: currentDraft.travelGroup,
      travelers: currentDraft.travelers,
      sharedContext: currentDraft.sharedContext,
      initialReadinessDraft: initialDraft,
      readinessAssessment: initialAssessment,
      assessmentVersion: initialAssessment.assessmentVersion,
      policyVersion: initialAssessment.policyVersion,
      assessmentDate: initialAssessment.assessmentDate,
      handoffKey: handoffKey ?? undefined,
      readinessSource: "FREE_READINESS",
    },
  };
}

function createFinding(input: {
  id: string;
  severity: CaseFindingSeverity;
  category: CaseFindingCategory;
  title: string;
  explanation: string;
  whatWeKnow?: string[];
  whatWeNeed?: string[];
  affectedTravelers?: string[];
  affectedFields?: string[];
  recommendedAction: string;
  evidenceNeeded?: string[];
  sourceLabel?: string;
  provenance?: CaseFinding["source"]["provenance"];
}): CaseFinding {
  return {
    id: input.id,
    severity: input.severity,
    category: input.category,
    title: input.title,
    explanation: input.explanation,
    whatWeKnow: input.whatWeKnow ?? [],
    whatWeNeed: input.whatWeNeed ?? [],
    affectedTravelers: input.affectedTravelers ?? [],
    affectedFields: input.affectedFields ?? [],
    recommendedAction: input.recommendedAction,
    evidenceNeeded: input.evidenceNeeded ?? [],
    source: {
      provenance: input.provenance ?? "USER_ENTERED",
      label: input.sourceLabel ?? "Free readiness intake",
      policyVersion: readinessPolicyVersion,
      lastVerifiedDate: new Date().toISOString().slice(0, 10),
      authoritative: false,
    },
    confidence: "high",
    blocking: input.severity === "BLOCKING",
    status: "OPEN",
  };
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildDimensionSummary(label: string, score: number, findingTitles: string[]): string {
  if (score >= 85) {
    return `${label} currently looks coherent based on the information provided.`;
  }

  if (findingTitles.length === 0) {
    return `${label} needs a little more detail before the case can be assessed confidently.`;
  }

  return `${label} needs attention around ${findingTitles.slice(0, 2).join(" and ")}.`;
}

function getPrimaryTraveler(draft: ReadinessDraft): ReadinessTravelerProfile {
  return draft.travelers.find((traveler) => traveler.role === "PRIMARY") ?? draft.travelers[0];
}

function toFundingSource(arrangement: ReadinessSharedContext["fundingArrangement"]): FundingSource {
  switch (arrangement) {
    case "self_funded":
    case "shared_between_adults":
      return "self_funded";
    case "other_sponsor":
    case "parent_sponsored":
    case "primary_sponsors_group":
    case "partner_sponsors_group":
      return "family_sponsored";
    default:
      return "self_funded";
  }
}

function summarizeDependents(travelers: ReadinessTravelerProfile[]): string {
  const secondaryTravelers = travelers.filter((traveler) => traveler.role !== "PRIMARY");
  if (secondaryTravelers.length === 0) {
    return "";
  }

  return secondaryTravelers
    .map((traveler) => `${traveler.displayName || traveler.relationshipLabel || traveler.role.toLowerCase()} (${traveler.role.toLowerCase()})`)
    .join(", ");
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTravelDateLabel(arrivalDate: string, departureDate: string): string {
  const durationDays = calculateStayDurationDays(arrivalDate, departureDate);

  if (durationDays <= 0) {
    return "Dates not confirmed";
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(new Date(arrivalDate))} - ${formatter.format(new Date(departureDate))}`;
}

function summarizeTravelers(draft: ReadinessDraft): string {
  if (draft.travelGroup === "solo") {
    return "1 adult";
  }

  const adults = draft.travelers.filter((traveler) => traveler.role !== "MINOR").length;
  const minors = draft.travelers.filter((traveler) => traveler.role === "MINOR").length;

  if (minors === 0) {
    return `${adults} adults`;
  }

  return `${adults} adults + ${minors} ${minors === 1 ? "child" : "children"}`;
}

function summarizeFunding(arrangement: ReadinessSharedContext["fundingArrangement"]): string {
  switch (arrangement) {
    case "self_funded":
      return "Self-funded";
    case "primary_sponsors_group":
      return "Primary traveller funded";
    case "partner_sponsors_group":
      return "Partner funded";
    case "shared_between_adults":
      return "Shared between adults";
    case "parent_sponsored":
      return "Parent funded";
    case "other_sponsor":
      return "External sponsor";
    default:
      return "Funding to be confirmed";
  }
}

function summarizeAccommodation(sharedContext: ReadinessSharedContext): string {
  if (sharedContext.accommodationStatus === "confirmed") {
    return sharedContext.hasAccommodationEvidence ? "Accommodation confirmed" : "Accommodation confirmed, evidence pending";
  }

  if (sharedContext.accommodationStatus === "partial") {
    return "Accommodation partly planned";
  }

  return "Accommodation not yet arranged";
}

function buildCaseSnapshot(draft: ReadinessDraft): CaseSnapshot {
  const destinationLabel = draft.trip.destinationCountry.trim() || "Destination not confirmed";
  const purposeLabel = titleCase(draft.trip.purpose);
  const travelerLabel = summarizeTravelers(draft);
  const fundingLabel = summarizeFunding(draft.sharedContext.fundingArrangement);
  const accommodationLabel = summarizeAccommodation(draft.sharedContext);
  const travelDateLabel = formatTravelDateLabel(draft.trip.arrivalDate, draft.trip.departureDate);

  return {
    destinationLabel,
    travelDateLabel,
    travelerLabel,
    fundingLabel,
    accommodationLabel,
    purposeLabel,
    narrative:
      draft.travelGroup === "solo"
        ? `You are currently planning a ${purposeLabel.toLowerCase()} trip to ${destinationLabel}. VisaPilot understands this as a solo case with ${fundingLabel.toLowerCase()} travel and ${accommodationLabel.toLowerCase()}.`
        : `You are currently planning a ${purposeLabel.toLowerCase()} trip to ${destinationLabel} for ${travelerLabel}. VisaPilot understands this as a shared case with ${fundingLabel.toLowerCase()} travel and ${accommodationLabel.toLowerCase()}.`,
  };
}

function buildAssumptions(draft: ReadinessDraft): CaseAssumption[] {
  const anyPreviousRefusal = draft.travelers.some((traveler) => traveler.previousRefusal);
  const allPassportsAvailable = draft.travelers.every((traveler) => traveler.passportAvailable);
  const primaryTraveler = getPrimaryTraveler(draft);

  return [
    {
      id: "DESTINATION",
      label: "Destination",
      value: draft.trip.destinationCountry.trim() || "Still missing",
      status: draft.trip.destinationCountry.trim() ? "CONFIRMED" : "INCOMPLETE",
    },
    {
      id: "FUNDING",
      label: "Funding",
      value: summarizeFunding(draft.sharedContext.fundingArrangement),
      status: draft.sharedContext.hasFinancialEvidence ? "CONFIRMED" : "ASSUMED",
    },
    {
      id: "ACCOMMODATION",
      label: "Accommodation",
      value: summarizeAccommodation(draft.sharedContext),
      status: draft.sharedContext.hasAccommodationEvidence ? "CONFIRMED" : draft.sharedContext.accommodationStatus === "pending" ? "INCOMPLETE" : "ASSUMED",
    },
    {
      id: "EMPLOYMENT",
      label: "Employment",
      value: primaryTraveler.employmentStatus ? titleCase(primaryTraveler.employmentStatus) : "Still missing",
      status: primaryTraveler.employmentStatus ? "CONFIRMED" : "INCOMPLETE",
    },
    {
      id: "PASSPORTS",
      label: "Passports",
      value: allPassportsAvailable ? "All passports reported available" : "One or more passports still need review",
      status: allPassportsAvailable ? "CONFIRMED" : "INCOMPLETE",
    },
    {
      id: "PREVIOUS_REFUSAL",
      label: "Previous refusal",
      value: anyPreviousRefusal ? "One or more previous refusals reported" : "None reported",
      status: "CONFIRMED",
    },
  ];
}

function buildReadyItems(draft: ReadinessDraft): string[] {
  const readyItems: string[] = [];

  if (draft.trip.destinationCountry.trim()) {
    readyItems.push("Destination identified");
  }

  if (calculateStayDurationDays(draft.trip.arrivalDate, draft.trip.departureDate) > 0) {
    readyItems.push("Travel dates are coherent");
  }

  if (draft.sharedContext.hasFinancialEvidence) {
    readyItems.push("Funding evidence is available");
  }

  if (draft.sharedContext.hasAccommodationEvidence || draft.sharedContext.accommodationStatus === "confirmed") {
    readyItems.push("Accommodation details are identified");
  }

  if (draft.travelGroup !== "solo" && draft.sharedContext.sameDestination && draft.sharedContext.sameDates) {
    readyItems.push("Group travel story is aligned on destination and dates");
  }

  if (draft.sharedContext.homeTieStrength === "clear") {
    readyItems.push("Return ties were described clearly");
  }

  if (draft.sharedContext.hasSponsorRelationshipEvidence) {
    readyItems.push("Sponsor relationship evidence is identified");
  }

  if (draft.travelers.every((traveler) => traveler.passportAvailable)) {
    readyItems.push("All travellers have passport access confirmed");
  }

  return dedupeStrings(readyItems);
}

export function analyzeReadinessCase(draft: ReadinessDraft): CaseReadinessAssessment {
  const findings: CaseFinding[] = [];
  const durationDays = calculateStayDurationDays(draft.trip.arrivalDate, draft.trip.departureDate);
  const destinationRule = resolveSchengenCountryRule(draft.trip.destinationCountry || "Schengen Area");
  const assessmentDate = new Date().toISOString();
  const minorTravelers = draft.travelers.filter((traveler) => traveler.role === "MINOR");

  if (!draft.trip.destinationCountry.trim()) {
    findings.push(createFinding({
      id: "MISSING_DESTINATION",
      severity: "BLOCKING",
      category: "TRAVEL",
      title: "Destination is still missing",
      explanation: "VisaPilot cannot assess provider guidance, itinerary coherence, or destination-specific preparation without the intended Schengen destination.",
      whatWeKnow: ["No destination country has been confirmed yet."],
      whatWeNeed: ["The main Schengen destination or country of longest stay."],
      affectedFields: ["trip.destinationCountry"],
      recommendedAction: "Choose the main destination country.",
      evidenceNeeded: ["Planned destination or main country of stay."],
    }));
  }

  if (!draft.trip.arrivalDate || !draft.trip.departureDate || durationDays <= 0) {
    findings.push(createFinding({
      id: "INVALID_TRAVEL_DATES",
      severity: "BLOCKING",
      category: "ITINERARY",
      title: "Travel dates need review",
      explanation: "The preliminary assessment needs a valid arrival and departure window. Departure dates must be later than arrival dates.",
      whatWeKnow: ["The current travel window is incomplete or invalid."],
      whatWeNeed: ["A coherent arrival and departure date range."],
      affectedFields: ["trip.arrivalDate", "trip.departureDate"],
      recommendedAction: "Confirm the intended arrival and departure dates.",
      evidenceNeeded: ["Approximate trip dates."],
      provenance: "SYSTEM_CALCULATED",
    }));
  }

  if (draft.trip.purpose !== "tourism") {
    findings.push(createFinding({
      id: "NON_TOURISM_PURPOSE",
      severity: "ATTENTION",
      category: "APPLICATION_CHANNEL",
      title: "Paid workflow support is currently tourism-first",
      explanation: `This repository's current full application flow is optimized for tourist/leisure packets. A ${draft.trip.purpose.replaceAll("_", " ")} case may need additional destination-specific review before continuing into the paid workflow.`,
      whatWeKnow: [`The trip purpose is currently marked as ${titleCase(draft.trip.purpose)}.`],
      whatWeNeed: ["Confirmation that the current paid flow matches the intended visa route."],
      affectedFields: ["trip.purpose"],
      recommendedAction: "Verify that your intended visa route matches the current VisaPilot product flow.",
      evidenceNeeded: ["Correct visa purpose and official provider guidance."],
    }));
  }

  if (draft.sharedContext.accommodationStatus !== "confirmed") {
    findings.push(createFinding({
      id: "ACCOMMODATION_NOT_CONFIRMED",
      severity: draft.sharedContext.accommodationStatus === "pending" ? "WARNING" : "ATTENTION",
      category: "ACCOMMODATION",
      title: "Accommodation coverage needs review",
      explanation: destinationRule.requireAccommodationProof
        ? "The current destination rules in VisaPilot expect accommodation coverage or host proof aligned with the stated stay, and that information is still incomplete in this readiness check."
        : "Accommodation details are still incomplete, which can make the itinerary harder to explain clearly.",
      whatWeKnow: [summarizeAccommodation(draft.sharedContext)],
      whatWeNeed: ["Accommodation coverage aligned to the full trip dates."],
      affectedFields: ["sharedContext.accommodationStatus"],
      recommendedAction: "Confirm where the travellers will stay for the full trip.",
      evidenceNeeded: ["Hotel booking or host accommodation details."],
      provenance: "SYSTEM_CALCULATED",
    }));
  }

  if (draft.sharedContext.itineraryStatus !== "clear") {
    findings.push(createFinding({
      id: "ITINERARY_NEEDS_CLARITY",
      severity: draft.sharedContext.itineraryStatus === "unclear" ? "WARNING" : "ATTENTION",
      category: "ITINERARY",
      title: "Trip narrative needs more detail",
      explanation: "The basic itinerary is not yet clear enough to explain how the route, dates, and accommodation connect. That is usually fixable with a cleaner city-by-city plan.",
      whatWeKnow: [titleCase(draft.sharedContext.itineraryStatus)],
      whatWeNeed: ["A clearer route or day-by-day trip narrative."],
      affectedFields: ["sharedContext.itineraryStatus"],
      recommendedAction: "Clarify the day-by-day route and how each stay segment fits the travel dates.",
      evidenceNeeded: ["Basic itinerary outline."],
    }));
  }

  if (!draft.sharedContext.hasFinancialEvidence) {
    findings.push(createFinding({
      id: "FINANCIAL_EVIDENCE_MISSING",
      severity: "WARNING",
      category: "FINANCIAL",
      title: "Financial evidence is not yet ready",
      explanation: "A funding source is identified, but the current readiness answers do not yet confirm that supporting financial evidence is available.",
      whatWeKnow: [summarizeFunding(draft.sharedContext.fundingArrangement)],
      whatWeNeed: ["Bank evidence or sponsor financial documents."],
      affectedFields: ["sharedContext.hasFinancialEvidence"],
      recommendedAction: "Prepare bank evidence or sponsor funding documents before finalizing the application.",
      evidenceNeeded: ["Bank statements, sponsor evidence, or equivalent financial proof."],
    }));
  }

  if (destinationRule.hasExactStatutoryRule === false) {
    findings.push(createFinding({
      id: "DESTINATION_POLICY_UNVERIFIED",
      severity: "INFO",
      category: "DESTINATION_POLICY",
      title: "Destination rule needs manual confirmation",
      explanation: "VisaPilot cannot confidently verify a destination-specific statutory funds threshold from the current policy pack for this country. Use the readiness output as preparation guidance and confirm the official source before submission.",
      whatWeKnow: [draft.trip.destinationCountry || "Destination still pending"],
      whatWeNeed: ["Official consular or provider confirmation for current country rules."],
      affectedFields: ["trip.destinationCountry"],
      recommendedAction: "Check the official consular or provider guidance for the latest country-specific requirements.",
      evidenceNeeded: ["Official consular guidance or provider checklist."],
      provenance: "SYSTEM_CALCULATED",
      sourceLabel: "Configured policy pack",
    }));
  }

  if (draft.sharedContext.homeTieStrength !== "clear") {
    findings.push(createFinding({
      id: "HOME_TIES_NEED_STRENGTHENING",
      severity: draft.sharedContext.homeTieStrength === "unclear" ? "WARNING" : "ATTENTION",
      category: "HOME_TIES",
      title: "Return-tie explanation needs work",
      explanation: "The current answers do not yet clearly explain the applicant's employment, family, property, or other reasons to return after the trip.",
      whatWeKnow: [titleCase(draft.sharedContext.homeTieStrength)],
      whatWeNeed: ["A clearer explanation of employment, family, property, or other return anchors."],
      affectedFields: ["sharedContext.homeTieStrength"],
      recommendedAction: "Prepare a clearer explanation of employment, family, property, or other return anchors.",
      evidenceNeeded: ["Employment continuity, family obligations, or property evidence."],
    }));
  }

  if (!draft.sharedContext.sameDestination) {
    findings.push(createFinding({
      id: "GROUP_DESTINATION_MISMATCH",
      severity: "WARNING",
      category: "CONSISTENCY",
      title: "Travellers do not share the same destination story",
      explanation: "The group answers suggest a destination mismatch. That is a material consistency issue unless each traveller is intentionally applying with a clearly documented separate itinerary.",
      whatWeKnow: ["The group answers indicate different destinations."],
      whatWeNeed: ["One shared destination story or a clear explanation for the difference."],
      recommendedAction: "Align the group destination or prepare a clear explanation for the difference.",
      evidenceNeeded: ["Consistent itinerary and destination plan."],
    }));
  }

  if (!draft.sharedContext.sameDates) {
    findings.push(createFinding({
      id: "GROUP_DATE_MISMATCH",
      severity: "WARNING",
      category: "CONSISTENCY",
      title: "Travel dates do not currently align",
      explanation: "The group answers suggest different travel dates. That can be legitimate, but it usually needs a very clear narrative if the travellers are presenting a joint trip.",
      whatWeKnow: ["The group answers indicate different date ranges."],
      whatWeNeed: ["A shared trip window or a documented reason for different dates."],
      recommendedAction: "Align the group date range or explain why the dates differ.",
      evidenceNeeded: ["Consistent date plan across the group."],
    }));
  }

  if (!draft.sharedContext.sameAccommodation) {
    findings.push(createFinding({
      id: "GROUP_ACCOMMODATION_MISMATCH",
      severity: "ATTENTION",
      category: "ACCOMMODATION",
      title: "Accommodation story is not fully aligned",
      explanation: "Different accommodation details do not automatically make the case weak, but the applications should explain who stays where and why.",
      whatWeKnow: ["The group answers indicate different accommodation plans."],
      whatWeNeed: ["A clear explanation of who stays where and why."],
      recommendedAction: "Document how the accommodation plan differs across travellers.",
      evidenceNeeded: ["Booking coverage or host details for each traveller."],
    }));
  }

  if (!draft.sharedContext.sameItinerary) {
    findings.push(createFinding({
      id: "GROUP_ITINERARY_MISMATCH",
      severity: "ATTENTION",
      category: "CONSISTENCY",
      title: "The group itinerary needs a clearer explanation",
      explanation: "Different route details are not automatically a problem, but the case should make it easy to understand who is travelling together and where the plans differ.",
      whatWeKnow: ["The group answers indicate different route details."],
      whatWeNeed: ["A clearer explanation of the shared and separate travel plans."],
      recommendedAction: "Clarify the shared and separate parts of the itinerary.",
      evidenceNeeded: ["Clear day-by-day route plan."],
    }));
  }

  const sponsorNeedsExplanation =
    draft.sharedContext.fundingArrangement === "primary_sponsors_group"
    || draft.sharedContext.fundingArrangement === "partner_sponsors_group"
    || draft.sharedContext.fundingArrangement === "parent_sponsored"
    || draft.sharedContext.fundingArrangement === "other_sponsor";

  if (sponsorNeedsExplanation && !draft.sharedContext.hasSponsorRelationshipEvidence) {
    findings.push(createFinding({
      id: "FUNDING_SPONSOR_DETAILS_MISSING",
      severity: "ATTENTION",
      category: "SPONSORSHIP",
      title: "Funding evidence needs clarification",
      explanation: "The funding structure itself is normal, but the current readiness answers do not yet confirm the relationship or sponsor evidence needed to explain who is paying for the trip.",
      whatWeKnow: [summarizeFunding(draft.sharedContext.fundingArrangement)],
      whatWeNeed: ["Sponsor relationship details and supporting evidence."],
      recommendedAction: "Document the sponsor relationship and who is covering each traveller's costs.",
      evidenceNeeded: ["Sponsor letter, bank evidence, and relationship proof where relevant."],
    }));
  }

  for (const traveler of draft.travelers) {
    if (!traveler.displayName.trim()) {
      findings.push(createFinding({
        id: `TRAVELER_NAME_MISSING_${traveler.id.toUpperCase()}`,
        severity: "ATTENTION",
        category: traveler.role === "MINOR" ? "MINOR" : "IDENTITY",
        title: `${traveler.role === "MINOR" ? "Minor" : "Traveller"} details are incomplete`,
        explanation: "The readiness result is more useful when each traveller can be identified clearly in the shared story.",
        whatWeKnow: ["This traveller does not yet have a clear name or label."],
        whatWeNeed: ["A name or distinct traveller label."],
        affectedTravelers: [traveler.id],
        affectedFields: [`traveler.${traveler.id}.displayName`],
        recommendedAction: "Add the traveller's name or a clear placeholder label.",
        evidenceNeeded: ["Traveller identity details."],
      }));
    }

    if (!traveler.passportAvailable) {
      findings.push(createFinding({
        id: `PASSPORT_REVIEW_REQUIRED_${traveler.id.toUpperCase()}`,
        severity: traveler.role === "MINOR" ? "WARNING" : "ATTENTION",
        category: traveler.role === "MINOR" ? "MINOR" : "DOCUMENTS",
        title: `${traveler.displayName || traveler.relationshipLabel || "Traveller"} needs passport review`,
        explanation: "Passport availability was not confirmed for this traveller. That usually blocks a complete application package until the travel document is available and reviewed.",
        whatWeKnow: ["Passport availability is not yet confirmed for this traveller."],
        whatWeNeed: ["A valid passport or travel document for this traveller."],
        affectedTravelers: [traveler.id],
        recommendedAction: "Confirm passport availability for this traveller.",
        evidenceNeeded: ["Valid passport or travel document."],
      }));
    }

    if (traveler.previousRefusal) {
      findings.push(createFinding({
        id: `PREVIOUS_REFUSAL_REVIEW_${traveler.id.toUpperCase()}`,
        severity: "ATTENTION",
        category: "VISA_HISTORY",
        title: `${traveler.displayName || traveler.relationshipLabel || "Traveller"} has a previous refusal to review`,
        explanation: "A previous refusal does not decide the outcome of a new application, but the new case should show what has changed and what evidence now addresses the earlier concern.",
        whatWeKnow: ["A previous refusal was reported for this traveller."],
        whatWeNeed: ["A short explanation of what changed and what evidence now supports the case."],
        affectedTravelers: [traveler.id],
        recommendedAction: "Prepare a short explanation of the previous refusal and what is different now.",
        evidenceNeeded: ["Previous refusal reason and updated supporting evidence."],
      }));
    }
  }

  if (draft.travelGroup === "couple") {
    const partner = draft.travelers.find((traveler) => traveler.role === "PARTNER");
    if (partner && ["unemployed", "homemaker", "student"].includes(partner.employmentStatus) && sponsorNeedsExplanation) {
      findings.push(createFinding({
        id: "COUPLE_SPONSORSHIP_CONTEXT",
        severity: "INFO",
        category: "FAMILY",
        title: "The couple funding story is understandable but should be explicit",
        explanation: "One traveller funding the other is not automatically a problem. The application should simply make the relationship and financial arrangement easy to understand.",
        whatWeKnow: ["One adult appears to be funding the shared trip."],
        whatWeNeed: ["A clear explanation of the relationship and sponsorship arrangement."],
        affectedTravelers: [partner.id],
        recommendedAction: "Explain the relationship and who is funding the shared trip.",
        evidenceNeeded: ["Relationship proof and sponsor financial evidence where relevant."],
      }));
    }
  }

  if (draft.travelGroup === "family" && minorTravelers.length > 0 && draft.sharedContext.minorConsentStatus !== "available") {
    findings.push(createFinding({
      id: "MINOR_CONSENT_REVIEW",
      severity: draft.sharedContext.minorConsentStatus === "missing" ? "WARNING" : "ATTENTION",
      category: "MINOR",
      title: "Minor travel documentation needs review",
      explanation: "Family travel can remain coherent even when one adult funds the trip or one parent is not employed, but minors often need relationship and consent documents that should be checked early.",
      whatWeKnow: ["One or more minors are travelling in the case."],
      whatWeNeed: ["Relationship and consent documents for the travelling minor structure."],
      affectedTravelers: minorTravelers.map((traveler) => traveler.id),
      recommendedAction: "Review the minor relationship and consent documents for the travelling family structure.",
      evidenceNeeded: ["Birth certificate, parental consent, or custody evidence where applicable."],
    }));
  }

  const dimensionFindings = {
    identity: findings.filter((finding) => ["IDENTITY", "DOCUMENTS", "MINOR"].includes(finding.category)),
    travel: findings.filter((finding) => ["TRAVEL", "APPLICATION_CHANNEL"].includes(finding.category)),
    financial: findings.filter((finding) => ["FINANCIAL", "SPONSORSHIP", "DESTINATION_POLICY"].includes(finding.category)),
    accommodation: findings.filter((finding) => finding.category === "ACCOMMODATION"),
    employment: findings.filter((finding) => ["EMPLOYMENT", "HOME_TIES", "FAMILY"].includes(finding.category)),
    history: findings.filter((finding) => ["TRAVEL_HISTORY", "VISA_HISTORY"].includes(finding.category)),
    consistency: findings.filter((finding) => finding.category === "CONSISTENCY" || finding.category === "ITINERARY"),
  };

  const dimensions = dimensionOrder.map((dimension) => {
    const relatedFindings = dimensionFindings[dimension.id as keyof typeof dimensionFindings] ?? [];
    const score = clampScore(100 - relatedFindings.reduce((total, finding) => total + severityPenalty[finding.severity], 0));

    return {
      id: dimension.id,
      label: dimension.label,
      score,
      summary: buildDimensionSummary(dimension.label, score, relatedFindings.map((finding) => finding.title)),
    };
  });

  const score = clampScore(dimensions.reduce((total, dimension) => total + dimension.score, 0) / dimensions.length);
  const label = score >= 80 ? "Strong" : score >= 60 ? "Fair" : "Needs Review";
  const snapshot = buildCaseSnapshot(draft);
  const assumptions = buildAssumptions(draft);
  const readyItems = buildReadyItems(draft);
  const actionRequiredCount = findings.filter((finding) => finding.severity === "BLOCKING").length;
  const reviewCount = findings.filter((finding) => finding.severity === "ATTENTION" || finding.severity === "WARNING").length;
  const strongAreas = dedupeStrings(dimensions.filter((dimension) => dimension.score >= 85).map((dimension) => dimension.summary));
  const areasToReview = dedupeStrings(findings.filter((finding) => finding.severity !== "INFO").map((finding) => finding.title)).slice(0, 5);
  const missingInformation = dedupeStrings(findings.flatMap((finding) => finding.evidenceNeeded)).slice(0, 5);
  const recommendedActions = dedupeStrings(findings.map((finding) => finding.recommendedAction)).slice(0, 5);
  const nextBestAction = recommendedActions[0] ?? "Continue to the full application and complete the missing details.";

  return {
    score,
    label,
    summary:
      label === "Strong"
        ? "Your core travel story looks reasonably coherent so far, but the final application still depends on reviewed details and supporting evidence."
        : label === "Fair"
          ? "Your case has a workable foundation, but some important details still need clarification before the application will feel submission-ready."
          : "Important details are still missing or inconsistent, so VisaPilot would focus first on clarifying the travel story, evidence, and supporting explanations.",
    assessmentVersion: readinessAssessmentVersion,
    dimensions,
    snapshot,
    assumptions,
    readyItems,
    reviewCount,
    actionRequiredCount,
    strongAreas,
    areasToReview,
    missingInformation,
    recommendedActions,
    nextBestAction,
    findings,
    disclaimer: readinessDisclaimer,
    assessmentDate,
    policyVersion: readinessPolicyVersion,
  };
}

export function buildApplicantDraftFromReadiness(draft: ReadinessDraft): Partial<ApplicantInfo> {
  const primaryTraveler = getPrimaryTraveler(draft);
  const assessment = analyzeReadinessCase(draft);
  const fundingSource = toFundingSource(draft.sharedContext.fundingArrangement);

  return {
    personal: {
      firstName: primaryTraveler.displayName.trim().split(/\s+/)[0] ?? "",
      lastName: primaryTraveler.displayName.trim().split(/\s+/).slice(1).join(" "),
      dateOfBirth: "",
      placeOfBirth: "",
      countryOfBirth: primaryTraveler.nationality,
      currentNationality: primaryTraveler.nationality,
      gender: "male",
      maritalStatus: draft.travelGroup === "solo" ? "single" : "married",
    },
    contact: {
      email: "",
      phone: "",
      addressLine1: "",
      city: "",
      postalCode: "",
      country: primaryTraveler.residenceCountry,
      residenceCountry: primaryTraveler.residenceCountry,
    },
    passport: {
      documentType: "ordinary_passport",
      number: "",
      dateOfIssue: "",
      dateOfExpiry: "",
      issuedBy: "",
      issuingCountry: primaryTraveler.nationality,
    },
    employment: {
      employmentStatus: primaryTraveler.employmentStatus,
      occupation: employmentLabel(primaryTraveler.employmentStatus),
      monthlyIncomeEur: 0,
      savingsBalanceEur: 0,
    },
    trip: {
      destinationCountry: draft.trip.destinationCountry,
      firstEntryCountry: draft.trip.destinationCountry,
      portOfEntry: "",
      transitCountries: "",
      memberStatesToVisit: draft.trip.destinationCountry ? [draft.trip.destinationCountry] : [],
      purpose: draft.trip.purpose,
      entriesRequested: "single",
      arrivalDate: draft.trip.arrivalDate,
      departureDate: draft.trip.departureDate,
      stayDurationDays: calculateStayDurationDays(draft.trip.arrivalDate, draft.trip.departureDate),
      previousSchengenVisasIssued: draft.travelers.some((traveler) => traveler.previousSchengenVisa),
      previousSchengenVisas: [],
      accommodations: "",
      hotelBookingReference: "",
    },
    sponsor: {
      type: fundingSource === "self_funded" ? "self" : "host",
      fundingSource,
      name: "",
      address: "",
      phone: "",
      email: "",
    },
    homeTies: {
      propertyOwnership: "none",
      dependentInformation: summarizeDependents(draft.travelers),
      returnIntentEvidence:
        draft.sharedContext.homeTieStrength === "clear"
          ? "Basic return ties were marked as clear during the free readiness assessment."
          : draft.sharedContext.homeTieStrength === "partial"
            ? "Free readiness noted that return ties need more supporting detail."
            : "Return ties need stronger explanation before final submission.",
    },
    application: {
      placeOfApplication: "",
      applicationDate: new Date().toISOString().slice(0, 10),
      fingerprintsTakenBefore: false,
      previousSchengenVisasSummary: "",
      visFingerprintStatus: "unknown",
      visFingerprintApproximateDate: "",
      visFingerprintStickerNumber: "",
      finalDestinationPermitRequired: false,
      finalDestinationPermitNumber: "",
      finalDestinationPermitValidUntil: "",
    },
    caseContext: {
      travelGroup: draft.travelGroup,
      travelers: draft.travelers,
      sharedContext: draft.sharedContext,
      initialReadinessDraft: draft,
      readinessAssessment: assessment,
      assessmentVersion: assessment.assessmentVersion,
      policyVersion: assessment.policyVersion,
      assessmentDate: assessment.assessmentDate,
      readinessSource: "FREE_READINESS",
    },
  };
}