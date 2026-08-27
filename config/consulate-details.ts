import { normalizeCountryKey } from "@/config/schengen-rules";

export type ConsulateServiceProvider =
  | "BLS International"
  | "VFS Global"
  | "TLScontact"
  | "VFS Global / TLScontact";

export type ConsulateCountryDetails = {
  provider: ConsulateServiceProvider;
  passportPhotoCount: number;
  passportPhotoSpec: string;
  passportValidityRule: string;
  appointmentDocumentLabel: string;
  documentStackOrder: string[];
};

const defaultDocumentStackOrder = [
  "Cover Letter",
  "Application Form",
  "Flight Itinerary",
  "Hotel Voucher",
  "Bank Statements",
];

const defaultPassportValidityRule = "Must be valid for at least 3 months beyond intended departure date.";

const consulateDetailsByCountry: Record<string, ConsulateCountryDetails> = {
  spain: {
    provider: "BLS International",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original BLS appointment confirmation sheet",
    documentStackOrder: defaultDocumentStackOrder,
  },
  france: {
    provider: "VFS Global / TLScontact",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original appointment confirmation sheet",
    documentStackOrder: defaultDocumentStackOrder,
  },
  germany: {
    provider: "VFS Global / TLScontact",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original appointment confirmation sheet",
    documentStackOrder: defaultDocumentStackOrder,
  },
  italy: {
    provider: "VFS Global / TLScontact",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original appointment confirmation sheet",
    documentStackOrder: defaultDocumentStackOrder,
  },
};

const defaultConsulateCountryDetails: ConsulateCountryDetails = {
  provider: "VFS Global / TLScontact",
  passportPhotoCount: 2,
  passportPhotoSpec: "35x45mm, light gray background",
  passportValidityRule: defaultPassportValidityRule,
  appointmentDocumentLabel: "Original appointment confirmation sheet",
  documentStackOrder: defaultDocumentStackOrder,
};

export function resolveConsulateCountryDetails(destinationCountry: string): ConsulateCountryDetails {
  return consulateDetailsByCountry[normalizeCountryKey(destinationCountry)] ?? defaultConsulateCountryDetails;
}