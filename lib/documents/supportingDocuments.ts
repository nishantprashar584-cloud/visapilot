import type { SupportingDocumentCategory, SupportingDocumentEvidence, SupportingDocumentEvidenceType, SupportingDocumentSubjectRole } from "@/types";

export const supportingDocumentsBucket = "visapilot-supporting-documents";

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function buildSupportingDocumentStoragePath(userId: string, documentId: string, fileName: string): string {
  const safeName = sanitizeSegment(fileName) || "document";
  return `applicant-documents/${userId}/${documentId}-${safeName}`;
}

export function buildSupportingDocumentDownloadPath(applicationId: string, documentId: string): string {
  return `/api/applications/${applicationId}/supporting-documents/${documentId}`;
}

function inferSupportingDocumentSubjectRole(normalizedName: string, category: SupportingDocumentCategory): SupportingDocumentSubjectRole {
  if (/(minor|child|kid|son|daughter)/.test(normalizedName)) {
    return "MINOR";
  }

  if (/(spouse|partner|wife|husband)/.test(normalizedName)) {
    return "PARTNER";
  }

  if (/(family|group|shared|joint|together)/.test(normalizedName)) {
    return "GROUP";
  }

  if (category === "travel") {
    return "GROUP";
  }

  return "PRIMARY";
}

function inferSupportingDocumentCategory(normalizedName: string): SupportingDocumentCategory {
  if (/(flight|ticket|hotel|booking|itinerary|reservation|stay)/.test(normalizedName)) {
    return "travel";
  }

  if (/(bank|statement|salary|payslip|payroll|tax)/.test(normalizedName)) {
    return "financial";
  }

  if (/(employment|offer|contract|employer|leave)/.test(normalizedName)) {
    return "employment";
  }

  if (/(insurance|policy|medical)/.test(normalizedName)) {
    return "insurance";
  }

  if (/(passport|travel-document|travel_document|id|identity|aadhaar|visa)/.test(normalizedName)) {
    return "identity";
  }

  return "general";
}

function inferSupportingDocumentEvidenceType(normalizedName: string, category: SupportingDocumentCategory): SupportingDocumentEvidenceType {
  if (/(passport|travel-document|travel_document|aadhaar|identity)/.test(normalizedName)) {
    return "passport";
  }

  if (/(bank|statement)/.test(normalizedName)) {
    return "bank_statement";
  }

  if (/(hotel|booking|reservation|accommodation|stay)/.test(normalizedName)) {
    return "hotel_booking";
  }

  if (/(flight|ticket|itinerary|pnr)/.test(normalizedName)) {
    return "flight_itinerary";
  }

  if (/(employment|offer|contract|employer|leave)/.test(normalizedName)) {
    return "employment_letter";
  }

  if (/(insurance|policy|medical)/.test(normalizedName)) {
    return "travel_insurance";
  }

  if (/(sponsor|invitation|affidavit)/.test(normalizedName)) {
    return "sponsor_letter";
  }

  if (/(marriage|birth-certificate|birth_certificate|relationship|family-proof|family_proof)/.test(normalizedName)) {
    return "relationship_proof";
  }

  if (/(consent|noc|authorization|authorisation)/.test(normalizedName)) {
    return "minor_consent";
  }

  if (category === "identity") {
    return "passport";
  }

  if (category === "financial") {
    return "bank_statement";
  }

  if (category === "travel") {
    return "flight_itinerary";
  }

  if (category === "employment") {
    return "employment_letter";
  }

  if (category === "insurance") {
    return "travel_insurance";
  }

  return "general_support";
}

export function getSupportingDocumentCategoryForEvidenceType(evidenceType: SupportingDocumentEvidenceType): SupportingDocumentCategory {
  switch (evidenceType) {
    case "passport":
      return "identity";
    case "bank_statement":
      return "financial";
    case "hotel_booking":
    case "flight_itinerary":
      return "travel";
    case "employment_letter":
      return "employment";
    case "travel_insurance":
      return "insurance";
    case "sponsor_letter":
    case "relationship_proof":
    case "minor_consent":
    case "general_support":
      return "general";
    default:
      return "general";
  }
}

export function inferSupportingDocumentEvidence(fileName: string): SupportingDocumentEvidence {
  const normalizedName = fileName.toLowerCase();
  const category = inferSupportingDocumentCategory(normalizedName);

  return {
    category,
    evidenceType: inferSupportingDocumentEvidenceType(normalizedName, category),
    subjectRole: inferSupportingDocumentSubjectRole(normalizedName, category),
    inferredFrom: "file_name",
  };
}

export function mergeSupportingDocumentEvidence(
  fileName: string,
  overrides?: Partial<Pick<SupportingDocumentEvidence, "evidenceType" | "subjectRole" | "subjectTravelerId" | "subjectLabel">>,
): SupportingDocumentEvidence {
  const inferred = inferSupportingDocumentEvidence(fileName);
  const evidenceType = overrides?.evidenceType ?? inferred.evidenceType;

  return {
    ...inferred,
    category: getSupportingDocumentCategoryForEvidenceType(evidenceType),
    evidenceType,
    subjectRole: overrides?.subjectRole ?? inferred.subjectRole,
    subjectTravelerId: overrides?.subjectTravelerId,
    subjectLabel: overrides?.subjectLabel,
  };
}