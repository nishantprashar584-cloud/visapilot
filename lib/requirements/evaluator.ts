import type {
  ApplicantInfo,
  ServiceTrack,
  SupportingDocument,
  SupportingDocumentEvidenceType,
} from "@/types";
import { inferSupportingDocumentEvidence } from "@/lib/documents/supportingDocuments";

export type RequirementSeverity = "INFO" | "NEEDS_REVIEW" | "ACTION_REQUIRED" | "BLOCKED";
export type RequirementStatus = "SATISFIED" | "MISSING" | "REVIEW";

export type RequirementId =
  | "REQUIRED_PASSPORT"
  | "REQUIRED_TRAVEL_INSURANCE"
  | "REQUIRED_ACCOMMODATION"
  | "REQUIRED_PROOF_OF_FUNDS"
  | "REQUIRED_EMPLOYMENT_EVIDENCE"
  | "REQUIRED_ITINERARY"
  | "REQUIRED_RETURN_TIES";

export interface VisaRequirement {
  id: RequirementId;
  title: string;
  description: string;
  required: boolean;
  evidenceTypes: SupportingDocumentEvidenceType[];
  status: RequirementStatus;
  severity: RequirementSeverity;
  explanation: string;
  nextAction: string;
  destination: "identity" | "travel" | "financial" | "accommodation" | "documents" | "review";
}

export interface RequirementEvidenceLink {
  requirementId: RequirementId;
  documentId: string;
  evidenceType: SupportingDocumentEvidenceType;
  fileName: string;
}

export interface ApplicationEvidenceFact {
  id: string;
  label: string;
  value: string;
  source: "application_field" | "document" | "system_calculated";
  documentId?: string;
}

export interface ApplicationEvidenceGraph {
  facts: ApplicationEvidenceFact[];
  requirementLinks: RequirementEvidenceLink[];
}

function hasDocumentEvidence(documents: SupportingDocument[], evidenceTypes: SupportingDocumentEvidenceType[]): boolean {
  return documents.some((document) => {
    const evidence = document.evidence ?? inferSupportingDocumentEvidence(document.fileName);
    return evidenceTypes.includes(evidence.evidenceType);
  });
}

function getRequirementLinks(documents: SupportingDocument[], requirementId: RequirementId, evidenceTypes: SupportingDocumentEvidenceType[]): RequirementEvidenceLink[] {
  return documents
    .filter((document) => {
      const evidence = document.evidence ?? inferSupportingDocumentEvidence(document.fileName);
      return evidenceTypes.includes(evidence.evidenceType);
    })
    .map((document) => {
      const evidence = document.evidence ?? inferSupportingDocumentEvidence(document.fileName);
      return {
        requirementId,
        documentId: document.id,
        evidenceType: evidence.evidenceType,
        fileName: document.fileName,
      };
    });
}

function buildRequirement(
  requirement: Omit<VisaRequirement, "status" | "severity" | "explanation">,
  options: { satisfied: boolean; review?: boolean; missingExplanation: string; reviewExplanation?: string },
): VisaRequirement {
  if (options.satisfied) {
    return {
      ...requirement,
      status: "SATISFIED",
      severity: "INFO",
      explanation: `${requirement.title} is present in the current case data.`,
    };
  }

  if (options.review) {
    return {
      ...requirement,
      status: "REVIEW",
      severity: "NEEDS_REVIEW",
      explanation: options.reviewExplanation ?? options.missingExplanation,
    };
  }

  return {
    ...requirement,
    status: "MISSING",
    severity: requirement.required ? "ACTION_REQUIRED" : "NEEDS_REVIEW",
    explanation: options.missingExplanation,
  };
}

export function evaluateVisaRequirements(applicant: ApplicantInfo, track?: ServiceTrack | null): VisaRequirement[] {
  const documents = applicant.supportingDocuments ?? [];
  const hasPassportDocument = hasDocumentEvidence(documents, ["passport"]);
  const hasInsuranceDocument = hasDocumentEvidence(documents, ["travel_insurance"]);
  const hasAccommodationDocument = hasDocumentEvidence(documents, ["hotel_booking"]);
  const hasFinancialDocument = hasDocumentEvidence(documents, ["bank_statement", "sponsor_letter"]);
  const hasEmploymentDocument = hasDocumentEvidence(documents, ["employment_letter"]);
  const hasItineraryDocument = hasDocumentEvidence(documents, ["flight_itinerary"]);
  const hasRelationshipDocument = hasDocumentEvidence(documents, ["relationship_proof", "minor_consent"]);

  const passportSatisfied = Boolean(applicant.passport.number && applicant.passport.dateOfExpiry && applicant.passport.issuedBy);
  const accommodationSatisfied = Boolean(applicant.trip.accommodations.trim() && applicant.trip.hotelBookingReference.trim());
  const itinerarySatisfied = Boolean(applicant.trip.destinationCountry.trim() && applicant.trip.arrivalDate && applicant.trip.departureDate && applicant.trip.portOfEntry.trim());
  const fundingSatisfied = applicant.sponsor.fundingSource === "self_funded"
    ? Boolean((applicant.financialEvidence?.closingBalanceEur ?? applicant.employment.savingsBalanceEur ?? 0) > 0)
    : Boolean(applicant.sponsor.name?.trim() || applicant.sponsor.address?.trim() || applicant.sponsor.phone?.trim());
  const employmentRequired = ["employed", "self_employed", "student", "retired", "contractor"].includes(applicant.employment.employmentStatus);
  const employmentSatisfied = !employmentRequired || Boolean(applicant.employment.occupation.trim());
  const returnTiesSatisfied = Boolean(applicant.homeTies.returnIntentEvidence.trim() || applicant.homeTies.propertyOwnership !== "none" || applicant.homeTies.dependentInformation?.trim());

  return [
    buildRequirement(
      {
        id: "REQUIRED_PASSPORT",
        title: "Passport details",
        description: "The current case needs a valid passport identity anchor.",
        required: true,
        evidenceTypes: ["passport"],
        nextAction: "Complete identity verification",
        destination: "identity",
      },
      {
        satisfied: passportSatisfied,
        review: !passportSatisfied && hasPassportDocument,
        missingExplanation: "Passport details are incomplete in the current case data.",
        reviewExplanation: "A passport document exists, but the case data should be reviewed for completeness.",
      },
    ),
    buildRequirement(
      {
        id: "REQUIRED_TRAVEL_INSURANCE",
        title: "Travel insurance",
        description: "Tourist Schengen applications should include travel medical insurance.",
        required: true,
        evidenceTypes: ["travel_insurance"],
        nextAction: "Review travel insurance",
        destination: "documents",
      },
      {
        satisfied: hasInsuranceDocument,
        missingExplanation: track === "VIP_CONCIERGE"
          ? "Travel insurance is not yet attached to the managed filing packet."
          : "Travel insurance is not yet attached to the self-guided packet.",
      },
    ),
    buildRequirement(
      {
        id: "REQUIRED_ACCOMMODATION",
        title: "Accommodation evidence",
        description: "The case should show where the traveler plans to stay.",
        required: true,
        evidenceTypes: ["hotel_booking"],
        nextAction: "Review accommodation",
        destination: "accommodation",
      },
      {
        satisfied: accommodationSatisfied && hasAccommodationDocument,
        review: accommodationSatisfied || hasAccommodationDocument,
        missingExplanation: "Accommodation details or evidence are still incomplete.",
        reviewExplanation: "Accommodation exists in one source, but the case should still be checked for full consistency.",
      },
    ),
    buildRequirement(
      {
        id: "REQUIRED_PROOF_OF_FUNDS",
        title: "Proof of funds",
        description: "The case should show who is funding the trip and the supporting financial evidence.",
        required: true,
        evidenceTypes: ["bank_statement", "sponsor_letter"],
        nextAction: "Review financial evidence",
        destination: "financial",
      },
      {
        satisfied: fundingSatisfied && hasFinancialDocument,
        review: fundingSatisfied || hasFinancialDocument,
        missingExplanation: "Financial evidence is incomplete for the current funding arrangement.",
        reviewExplanation: "Funding details exist, but the case should be reviewed for matching evidence.",
      },
    ),
    buildRequirement(
      {
        id: "REQUIRED_EMPLOYMENT_EVIDENCE",
        title: "Employment or profile evidence",
        description: "The application should explain the applicant profile and supporting employment or status context.",
        required: employmentRequired,
        evidenceTypes: ["employment_letter"],
        nextAction: "Review employment evidence",
        destination: "financial",
      },
      {
        satisfied: employmentSatisfied && (!employmentRequired || hasEmploymentDocument),
        review: employmentSatisfied || hasEmploymentDocument,
        missingExplanation: "Employment or profile evidence is still incomplete for this case.",
        reviewExplanation: "Profile details exist, but the employment evidence should still be checked.",
      },
    ),
    buildRequirement(
      {
        id: "REQUIRED_ITINERARY",
        title: "Travel itinerary",
        description: "Travel dates, entry details, and itinerary evidence should tell one coherent trip story.",
        required: true,
        evidenceTypes: ["flight_itinerary"],
        nextAction: "Review travel plan",
        destination: "travel",
      },
      {
        satisfied: itinerarySatisfied && hasItineraryDocument,
        review: itinerarySatisfied || hasItineraryDocument,
        missingExplanation: "Travel itinerary details or evidence are still incomplete.",
        reviewExplanation: "Travel details exist, but the itinerary evidence should still be reviewed.",
      },
    ),
    buildRequirement(
      {
        id: "REQUIRED_RETURN_TIES",
        title: "Return-tie explanation",
        description: "The case should explain the applicant's ties back to their home context.",
        required: true,
        evidenceTypes: ["employment_letter", "relationship_proof", "minor_consent"],
        nextAction: "Review return-tie evidence",
        destination: "review",
      },
      {
        satisfied: returnTiesSatisfied && (hasEmploymentDocument || hasRelationshipDocument || applicant.homeTies.propertyOwnership !== "none"),
        review: returnTiesSatisfied,
        missingExplanation: "Return-tie evidence is still incomplete for the current case.",
        reviewExplanation: "Return intent is described, but supporting evidence should still be checked.",
      },
    ),
  ];
}

export function buildApplicationEvidenceGraph(applicant: ApplicantInfo): ApplicationEvidenceGraph {
  const documents = applicant.supportingDocuments ?? [];
  const facts: ApplicationEvidenceFact[] = [
    { id: "destination", label: "Destination", value: applicant.trip.destinationCountry || "Pending", source: "application_field" },
    { id: "travel-dates", label: "Travel dates", value: `${applicant.trip.arrivalDate || "Pending"} - ${applicant.trip.departureDate || "Pending"}`, source: "application_field" },
    { id: "funding", label: "Funding source", value: applicant.sponsor.fundingSource.replaceAll("_", " "), source: "application_field" },
    { id: "duration", label: "Stay duration", value: `${applicant.trip.stayDurationDays || 0} days`, source: "system_calculated" },
  ];

  for (const document of documents) {
    const evidence = document.evidence ?? inferSupportingDocumentEvidence(document.fileName);

    if (evidence) {
      facts.push({
        id: `document-${document.id}`,
        label: evidence.evidenceType.replaceAll("_", " "),
        value: document.fileName,
        source: "document",
        documentId: document.id,
      });
    }
  }

  const requirements = evaluateVisaRequirements(applicant);
  const requirementLinks = requirements.flatMap((requirement) => getRequirementLinks(documents, requirement.id, requirement.evidenceTypes));

  return { facts, requirementLinks };
}