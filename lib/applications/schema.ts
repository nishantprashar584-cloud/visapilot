import { z } from "zod";
import type { ApplicantInfo } from "@/types";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

const supportingDocumentSchema = z.object({
  id: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  kind: z.enum(["pdf", "image"]),
  pageCount: z.number().int().min(1),
  sizeBytes: z.number().int().min(1),
  storagePath: z.string().trim().min(1),
  uploadedAt: z.string().trim().min(1),
});

export const applicantInfoSchema = z
  .object({
    personal: z.object({
      firstName: z.string().trim().min(2, "First name is required."),
      lastName: z.string().trim().min(2, "Last name is required."),
      lastNameAtBirth: z.string().trim().optional().or(z.literal("")),
      dateOfBirth: isoDateSchema,
      placeOfBirth: z.string().trim().min(2, "Place of birth is required."),
      countryOfBirth: z.string().trim().min(2, "Country of birth is required."),
      currentNationality: z.string().trim().min(2, "Current nationality is required."),
      nationalityAtBirth: z.string().trim().optional().or(z.literal("")),
      gender: z.enum(["male", "female", "other"]),
      maritalStatus: z.enum(["single", "married", "separated", "divorced", "widowed", "other"]),
    }),
    contact: z.object({
      email: z.string().trim().email("Enter a valid email address."),
      phone: z.string().trim().min(8, "Phone number is required."),
      addressLine1: z.string().trim().min(5, "Address is required."),
      addressLine2: z.string().trim().optional().or(z.literal("")),
      city: z.string().trim().min(2, "City is required."),
      postalCode: z.string().trim().min(3, "Postal code is required."),
      country: z.string().trim().min(2, "Country is required."),
      residenceCountry: z.string().trim().optional().or(z.literal("")),
    }),
    passport: z.object({
      documentType: z.enum([
        "ordinary_passport",
        "diplomatic_passport",
        "service_passport",
        "travel_document",
      ]),
      number: z.string().trim().min(6, "Passport number is required."),
      dateOfIssue: isoDateSchema,
      dateOfExpiry: isoDateSchema,
      issuedBy: z.string().trim().min(2, "Issuing authority is required."),
      issuingCountry: z.string().trim().min(2, "Issuing country is required."),
    }),
    employment: z.object({
      employmentStatus: z.enum([
        "employed",
        "self_employed",
        "student",
        "retired",
        "unemployed",
        "contractor",
        "other",
      ]),
      occupation: z.string().trim().min(2, "Occupation is required."),
      employerName: z.string().trim().optional().or(z.literal("")),
      employerAddress: z.string().trim().optional().or(z.literal("")),
      employerPhone: z.string().trim().optional().or(z.literal("")),
      monthlyIncomeEur: z.number().min(0, "Monthly income must be zero or greater."),
      savingsBalanceEur: z.number().min(0, "Savings balance must be zero or greater."),
    }),
    trip: z.object({
      destinationCountry: z.string().trim().min(2, "Destination country is required."),
      firstEntryCountry: z.string().trim().min(2, "First entry country is required."),
      portOfEntry: z.string().trim().min(2, "Port of entry is required."),
      transitCountries: z.string().trim().optional().or(z.literal("")),
      memberStatesToVisit: z.array(z.string().trim().min(2)).min(1),
      purpose: z.enum([
        "tourism",
        "business",
        "family_visit",
        "medical",
        "study",
        "cultural",
        "sports",
        "official",
        "transit",
        "airport_transit",
        "other",
      ]),
      entriesRequested: z.enum(["single", "double", "multiple"]),
      arrivalDate: isoDateSchema,
      departureDate: isoDateSchema,
      stayDurationDays: z.number().int().min(1, "Stay duration must be at least one day."),
      hostName: z.string().trim().optional().or(z.literal("")),
      hostAddress: z.string().trim().optional().or(z.literal("")),
      hostEmail: z.string().trim().email().optional().or(z.literal("")),
      hostPhone: z.string().trim().optional().or(z.literal("")),
      invitingCompanyName: z.string().trim().optional().or(z.literal("")),
      invitingCompanyAddress: z.string().trim().optional().or(z.literal("")),
      accommodations: z.string().trim().min(5, "Accommodation details are required."),
      hotelBookingReference: z.string().trim().min(3, "Hotel booking reference is required."),
    }),
    sponsor: z.object({
      type: z.enum(["self", "host", "inviting_company", "other"]),
      name: z.string().trim().optional().or(z.literal("")),
      address: z.string().trim().optional().or(z.literal("")),
      phone: z.string().trim().optional().or(z.literal("")),
      email: z.string().trim().email().optional().or(z.literal("")),
    }),
    homeTies: z.object({
      propertyOwnership: z.enum(["owned", "family_owned", "rented", "none"]),
      dependentInformation: z.string().trim().optional().or(z.literal("")),
      returnIntentEvidence: z.string().trim().min(12, "Describe clear ties to your home country."),
    }),
    application: z.object({
      placeOfApplication: z.string().trim().min(2, "Place of application is required."),
      applicationDate: isoDateSchema,
      fingerprintsTakenBefore: z.boolean(),
      finalDestinationPermitRequired: z.boolean(),
      finalDestinationPermitNumber: z.string().trim().optional().or(z.literal("")),
      finalDestinationPermitValidUntil: z.string().trim().optional().or(z.literal("")),
    }),
    supportingDocuments: z.array(supportingDocumentSchema).optional().default([]),
  })
  .superRefine((value, context) => {
    const issueDate = new Date(value.passport.dateOfIssue);
    const expiryDate = new Date(value.passport.dateOfExpiry);
    const arrivalDate = new Date(value.trip.arrivalDate);
    const departureDate = new Date(value.trip.departureDate);

    if (expiryDate <= arrivalDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passport expiry must be after the planned arrival date.",
        path: ["passport", "dateOfExpiry"],
      });
    }

    if (expiryDate <= issueDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passport expiry must be later than the issue date.",
        path: ["passport", "dateOfExpiry"],
      });
    }

    if (departureDate <= arrivalDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure must be later than arrival.",
        path: ["trip", "departureDate"],
      });
    }
  });

export const applicantDraftSchema = z.custom<Partial<ApplicantInfo>>(
  (value) => typeof value === "object" && value !== null,
);

export const defaultApplicantInfo: ApplicantInfo = {
  personal: {
    firstName: "",
    lastName: "",
    lastNameAtBirth: "",
    dateOfBirth: "",
    placeOfBirth: "",
    countryOfBirth: "",
    currentNationality: "",
    nationalityAtBirth: "",
    gender: "male",
    maritalStatus: "single",
  },
  contact: {
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    country: "",
    residenceCountry: "",
  },
  passport: {
    documentType: "ordinary_passport",
    number: "",
    dateOfIssue: "",
    dateOfExpiry: "",
    issuedBy: "",
    issuingCountry: "",
  },
  employment: {
    employmentStatus: "employed",
    occupation: "",
    employerName: "",
    employerAddress: "",
    employerPhone: "",
    monthlyIncomeEur: 0,
    savingsBalanceEur: 0,
  },
  trip: {
    destinationCountry: "France",
    firstEntryCountry: "France",
    portOfEntry: "",
    transitCountries: "",
    memberStatesToVisit: ["France"],
    purpose: "tourism",
    entriesRequested: "single",
    arrivalDate: "",
    departureDate: "",
    stayDurationDays: 0,
    hostName: "",
    hostAddress: "",
    hostEmail: "",
    hostPhone: "",
    invitingCompanyName: "",
    invitingCompanyAddress: "",
    accommodations: "",
    hotelBookingReference: "",
  },
  sponsor: {
    type: "self",
    name: "",
    address: "",
    phone: "",
    email: "",
  },
  homeTies: {
    propertyOwnership: "none",
    dependentInformation: "",
    returnIntentEvidence: "",
  },
  application: {
    placeOfApplication: "",
    applicationDate: new Date().toISOString().slice(0, 10),
    fingerprintsTakenBefore: false,
    finalDestinationPermitRequired: false,
    finalDestinationPermitNumber: "",
    finalDestinationPermitValidUntil: "",
  },
  supportingDocuments: [],
};

function mergeObjects<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T>,
): T {
  const mergedEntries = Object.entries(defaults).map(([key, defaultValue]) => {
    const overrideValue = overrides[key as keyof T];

    if (
      defaultValue !== null &&
      typeof defaultValue === "object" &&
      !Array.isArray(defaultValue) &&
      overrideValue !== null &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue)
    ) {
      return [key, mergeObjects(defaultValue as Record<string, unknown>, overrideValue as Record<string, unknown>)];
    }

    return [key, overrideValue === undefined ? defaultValue : overrideValue];
  });

  return Object.fromEntries(mergedEntries) as T;
}

export function mergeApplicantDraft(draft: Partial<ApplicantInfo>): ApplicantInfo {
  return mergeObjects(
    defaultApplicantInfo as unknown as Record<string, unknown>,
    draft as unknown as Record<string, unknown>,
  ) as unknown as ApplicantInfo;
}

export function calculateStayDurationDays(arrivalDate: string, departureDate: string): number {
  if (!arrivalDate || !departureDate) {
    return 0;
  }

  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);

  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime()) || departure <= arrival) {
    return 0;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((departure.getTime() - arrival.getTime()) / millisecondsPerDay);
}