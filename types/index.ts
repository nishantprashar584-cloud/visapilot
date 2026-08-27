export type ApplicationStatus = "draft" | "paid" | "completed" | "expired" | "rejected" | "reapplied";

export type RecoveryStatus = "NOT_CLAIMED" | "CLAIMED";

export type PricingTier = "solo" | "couple" | "family";

export type RefusalReasonCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type AuditSeverity = "GREEN" | "YELLOW" | "RED";

export type ParsedDocumentType = "passport" | "bank_statement";

export type Gender = "male" | "female" | "other";

export type MaritalStatus =
  | "single"
  | "married"
  | "separated"
  | "divorced"
  | "widowed"
  | "other";

export type TravelPurpose =
  | "tourism"
  | "business"
  | "family_visit"
  | "medical"
  | "study"
  | "cultural"
  | "sports"
  | "official"
  | "transit"
  | "airport_transit"
  | "other";

export type EntryCount = "single" | "double" | "multiple";

export type SponsorType = "self" | "host" | "inviting_company" | "other";

export type FundingSource = "self_funded" | "family_sponsored" | "company_sponsored";

export type VoiceIntakeTripPurpose = "tourism" | "business" | "family_visit" | "conference";

export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "student"
  | "retired"
  | "unemployed"
  | "contractor"
  | "other";

export type PropertyOwnershipStatus = "owned" | "family_owned" | "rented" | "none";

export type VisFingerprintStatus = "yes" | "no" | "unknown";

export interface PreviousSchengenVisaEntry {
  validFrom: string;
  validTo: string;
  visaNumber?: string;
}

export type SupportingDocumentKind = "pdf" | "image";

export interface SupportingDocument {
  id: string;
  fileName: string;
  mimeType: string;
  kind: SupportingDocumentKind;
  pageCount: number;
  sizeBytes: number;
  storagePath: string;
  uploadedAt: string;
}

export interface ApplicantInfo {
  personal: {
    firstName: string;
    lastName: string;
    lastNameAtBirth?: string;
    dateOfBirth: string;
    placeOfBirth: string;
    countryOfBirth: string;
    currentNationality: string;
    nationalityAtBirth?: string;
    gender: Gender;
    maritalStatus: MaritalStatus;
  };
  contact: {
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
    residenceCountry?: string;
  };
  passport: {
    documentType: "ordinary_passport" | "diplomatic_passport" | "service_passport" | "travel_document";
    number: string;
    dateOfIssue: string;
    dateOfExpiry: string;
    issuedBy: string;
    issuingCountry: string;
  };
  employment: {
    employmentStatus: EmploymentStatus;
    occupation: string;
    employerName?: string;
    employerAddress?: string;
    employerPhone?: string;
    monthlyIncomeEur: number;
    savingsBalanceEur: number;
  };
  trip: {
    destinationCountry: string;
    firstEntryCountry: string;
    portOfEntry: string;
    transitCountries?: string;
    memberStatesToVisit: string[];
    purpose: TravelPurpose;
    entriesRequested: EntryCount;
    arrivalDate: string;
    departureDate: string;
    stayDurationDays: number;
    previousSchengenVisasIssued: boolean;
    previousSchengenVisas: PreviousSchengenVisaEntry[];
    hostName?: string;
    hostAddress?: string;
    hostEmail?: string;
    hostPhone?: string;
    invitingCompanyName?: string;
    invitingCompanyAddress?: string;
    accommodations: string;
    hotelBookingReference: string;
  };
  sponsor: {
    type: SponsorType;
    fundingSource: FundingSource;
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  homeTies: {
    propertyOwnership: PropertyOwnershipStatus;
    dependentInformation?: string;
    returnIntentEvidence: string;
  };
  application: {
    placeOfApplication: string;
    applicationDate: string;
    fingerprintsTakenBefore: boolean;
    previousSchengenVisasSummary?: string;
    visFingerprintStatus: VisFingerprintStatus;
    visFingerprintApproximateDate?: string;
    visFingerprintStickerNumber?: string;
    finalDestinationPermitRequired: boolean;
    finalDestinationPermitNumber?: string;
    finalDestinationPermitValidUntil?: string;
  };
  supportingDocuments?: SupportingDocument[];
}

export interface ParsedVoiceContextResult {
  transcript: string;
  destinationCountry: string;
  firstEntryCountry: string;
  tripPurpose: VoiceIntakeTripPurpose;
  employmentStatus: EmploymentStatus;
  fundingSource: FundingSource;
  arrivalDate?: string;
  departureDate?: string;
  accommodationSummary?: string;
  hostContext?: string;
  returnTieSignal?: string;
  specialCircumstances: string;
}

export interface SchengenFormFields {
  surname: string;
  surnameAtBirth: string;
  firstNames: string;
  dateOfBirth: string;
  placeOfBirth: string;
  countryOfBirth: string;
  currentNationality: string;
  nationalityAtBirth: string;
  sexMale: string;
  sexFemale: string;
  maritalStatusSingle: string;
  maritalStatusMarried: string;
  maritalStatusSeparated: string;
  maritalStatusDivorced: string;
  maritalStatusWidowed: string;
  documentTypeOrdinaryPassport: string;
  passportNumber: string;
  passportDateOfIssue: string;
  passportValidUntil: string;
  passportIssuedBy: string;
  applicantAddress: string;
  applicantEmail: string;
  applicantPhone: string;
  residenceCountry: string;
  occupation: string;
  employerNameAndAddress: string;
  destinationMemberStates: string;
  firstEntryMemberState: string;
  numberOfEntriesSingle: string;
  numberOfEntriesDouble: string;
  numberOfEntriesMultiple: string;
  durationOfStayDays: string;
  arrivalDate: string;
  departureDate: string;
  previousSchengenVisasNo: string;
  previousSchengenVisasYes: string;
  previousSchengenVisasDetails: string;
  fingerprintsTakenNo: string;
  fingerprintsTakenYes: string;
  fingerprintsTakenDate: string;
  fingerprintsTakenStickerNumber: string;
  permitForFinalDestinationNo: string;
  permitForFinalDestinationYes: string;
  travelPurposeTourism: string;
  travelPurposeBusiness: string;
  travelPurposeFamilyVisit: string;
  travelPurposeMedical: string;
  travelPurposeStudy: string;
  travelPurposeCultural: string;
  travelPurposeSports: string;
  travelPurposeOfficial: string;
  travelPurposeTransit: string;
  invitingPersonName: string;
  invitingPersonAddress: string;
  invitingCompanyName: string;
  invitingCompanyAddress: string;
  travelCostsCoveredByApplicant: string;
  travelCostsCoveredBySponsor: string;
  placeAndDate: string;
}

export type ApplicantValuePath =
  | "personal.firstName"
  | "personal.lastName"
  | "personal.lastNameAtBirth"
  | "personal.dateOfBirth"
  | "personal.placeOfBirth"
  | "personal.countryOfBirth"
  | "personal.currentNationality"
  | "personal.nationalityAtBirth"
  | "personal.gender"
  | "personal.maritalStatus"
  | "contact.email"
  | "contact.phone"
  | "contact.addressLine1"
  | "contact.addressLine2"
  | "contact.city"
  | "contact.postalCode"
  | "contact.country"
  | "contact.residenceCountry"
  | "passport.documentType"
  | "passport.number"
  | "passport.dateOfIssue"
  | "passport.dateOfExpiry"
  | "passport.issuedBy"
  | "passport.issuingCountry"
  | "employment.employmentStatus"
  | "employment.occupation"
  | "employment.employerName"
  | "employment.employerAddress"
  | "employment.employerPhone"
  | "employment.monthlyIncomeEur"
  | "employment.savingsBalanceEur"
  | "trip.destinationCountry"
  | "trip.firstEntryCountry"
  | "trip.portOfEntry"
  | "trip.memberStatesToVisit"
  | "trip.purpose"
  | "trip.entriesRequested"
  | "trip.arrivalDate"
  | "trip.departureDate"
  | "trip.stayDurationDays"
  | "trip.previousSchengenVisasIssued"
  | "trip.previousSchengenVisas"
  | `trip.previousSchengenVisas.${number}.validFrom`
  | `trip.previousSchengenVisas.${number}.validTo`
  | `trip.previousSchengenVisas.${number}.visaNumber`
  | "trip.hostName"
  | "trip.hostAddress"
  | "trip.hostEmail"
  | "trip.hostPhone"
  | "trip.invitingCompanyName"
  | "trip.invitingCompanyAddress"
  | "trip.accommodations"
  | "trip.hotelBookingReference"
  | "sponsor.type"
  | "sponsor.fundingSource"
  | "sponsor.name"
  | "sponsor.address"
  | "sponsor.phone"
  | "sponsor.email"
  | "homeTies.propertyOwnership"
  | "homeTies.dependentInformation"
  | "homeTies.returnIntentEvidence"
  | "application.placeOfApplication"
  | "application.applicationDate"
  | "application.fingerprintsTakenBefore"
  | "application.previousSchengenVisasSummary"
  | "application.visFingerprintStatus"
  | "application.visFingerprintApproximateDate"
  | "application.visFingerprintStickerNumber"
  | "application.finalDestinationPermitRequired"
  | "application.finalDestinationPermitNumber"
  | "application.finalDestinationPermitValidUntil";

export type PdfFieldMappingCollection = {
  key: keyof SchengenFormFields;
  candidates: string[];
  required?: boolean;
};

export type PdfTextFieldMapping = PdfFieldMappingCollection & {
  kind: "text";
  source?: ApplicantValuePath;
  template?: string;
  format?: "date-dd-mm-yyyy" | "uppercase" | "lowercase" | "passport-spacing";
};

export type PdfCheckboxFieldMapping = PdfFieldMappingCollection & {
  kind: "checkbox";
  source: ApplicantValuePath;
  equals?: string | boolean;
  includes?: string;
};

export type PdfFieldMapping = PdfTextFieldMapping | PdfCheckboxFieldMapping;

export interface PdfMapConfig {
  country: string;
  templatePath: string;
  fields: PdfFieldMapping[];
}

export interface CountryRiskRule {
  displayName: string;
  dailyFundsEur: number;
  dailyFundsWithoutAccommodationEur?: number;
  minimumBalanceEur?: number;
  recommendedBufferMultiplier: number;
  minimumInsuranceCoverageEur: number;
  requireRoundTripReservation: boolean;
  requireAccommodationProof: boolean;
  hasExactStatutoryRule: boolean;
  documentRules: string[];
}

export interface RiskRulesConfig {
  countries: Record<string, CountryRiskRule>;
}

export interface ApplicationRow {
  id: string;
  status: ApplicationStatus;
  user_id: string;
  applicant_id: string;
  vfs_reference_number: string | null;
  applicant_name: string;
  applicant_email: string;
  destination_country: string;
  application_data: ApplicantInfo;
  cover_letter_markdown: string;
  filled_pdf_base64: string;
  rejected_at: string | null;
  refusal_reason_code: RefusalReasonCode | null;
  recovery_status: RecoveryStatus;
  recovery_claimed_at: string | null;
  privacy_purge_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  email: string | null;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ApplicantLockRow {
  id: string;
  user_id: string;
  full_name: string;
  passport_number: string;
  created_at: string;
  updated_at: string;
}

export interface PassportDocumentParseResult {
  documentType: "passport";
  full_name: string;
  passport_number: string;
  date_of_birth: string;
  nationality: string;
  expiry_date: string;
}

export interface BankStatementDocumentParseResult {
  documentType: "bank_statement";
  closing_balance: number;
  currency: string;
}

export type ParsedDocumentResult =
  | PassportDocumentParseResult
  | BankStatementDocumentParseResult;

export interface RiskAuditResult {
  status: AuditSeverity;
  destinationCountry: string;
  hasExactCountryRule: boolean;
  appliedDailyFundsRuleEur: number;
  requiredLiquidBalanceEur: number;
  recommendedLiquidBalanceEur: number;
  availableLiquidBalanceEur: number;
  dailyBudgetEur: number;
  consultantDailyMinimumEur: number;
  statutoryRuleSummary: string;
  consultantWarning: boolean;
  consultantWarningMessage: string | null;
  passportValidThrough: string;
  passportValiditySatisfied: boolean;
  financialBufferSatisfied: boolean;
  statutoryFundsSatisfied: boolean;
  missingDocuments: string[];
  fixInstructions: string[];
  checks: {
    financialSufficiency: boolean;
    passportValidity: boolean;
    accommodationEvidence: boolean;
    roundTripEvidence: boolean;
  };
}