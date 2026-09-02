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
  stackingBlueprints: Array<{
    hub: string;
    provider: ConsulateServiceProvider;
    appointmentDocumentLabel: string;
    documentStackOrder: string[];
  }>;
};

function buildCommonStack(args: {
  appointmentLabel: string;
  includeLocalConsent: string;
  includeEmploymentLabel?: string;
}) {
  return [
    args.appointmentLabel,
    "Signed Schengen visa application form with photo attached",
    "Current passport plus prior Schengen visa copies",
    "Embassy cover letter and document manifest",
    "Round-trip flight reservation and inter-city travel confirmations",
    "Accommodation confirmations arranged chronologically",
    "Travel medical insurance certificate",
    "Recent stamped bank statements and liquid-funds evidence",
    args.includeEmploymentLabel ?? "Employment, business, or home-ties evidence",
    args.includeLocalConsent,
  ];
}

const franceVfsStack = buildCommonStack({
  appointmentLabel: "VFS France appointment confirmation",
  includeEmploymentLabel: "Employment leave approval, salary slips, ITR or freelancer tax trail",
  includeLocalConsent: "VFS courier / SMS / consent forms",
});

const franceTlsStack = buildCommonStack({
  appointmentLabel: "TLScontact France appointment confirmation",
  includeEmploymentLabel: "Employment leave approval, salary slips, ITR or freelancer tax trail",
  includeLocalConsent: "TLScontact value-added service receipts and consent forms",
});

const germanyVfsStack = buildCommonStack({
  appointmentLabel: "VFS Germany appointment confirmation",
  includeEmploymentLabel: "Employment leave approval, payroll trail, tax filings, and return-tie proofs",
  includeLocalConsent: "VFS declaration sheets, courier, and SMS add-ons",
});

const italyVfsStack = buildCommonStack({
  appointmentLabel: "VFS Italy appointment confirmation",
  includeEmploymentLabel: "Employer NOC or self-employed registration, tax proofs, and return-tie evidence",
  includeLocalConsent: "VFS Italy consent, courier, and premium-lounge forms",
});

const italyTlsStack = buildCommonStack({
  appointmentLabel: "TLScontact Italy appointment confirmation",
  includeEmploymentLabel: "Employer NOC or self-employed registration, tax proofs, and return-tie evidence",
  includeLocalConsent: "TLScontact consent forms and optional service receipts",
});

const spainBlsStack = [
  "BLS Spain appointment confirmation",
  "Signed Schengen visa application form with photograph affixed",
  "Current passport plus prior visas and passport copies",
  "Embassy cover letter and master manifest",
  "BLS Spain checklist sheet",
  "Round-trip reservations and intra-Schengen transport proof",
  "Hotel vouchers or host invitation proof",
  "Travel insurance certificate meeting EUR 30,000 coverage",
  "Recent bank statements, ITR / Form 16, and source-of-funds explanations",
  "Employment proof or business registration plus return-tie evidence",
  "BLS courier / SMS / consent forms",
];

const switzerlandVfsStack = buildCommonStack({
  appointmentLabel: "VFS Switzerland appointment confirmation",
  includeEmploymentLabel: "Employment or business proofs, tax records, and return-tie documents",
  includeLocalConsent: "VFS Switzerland declaration and courier forms",
});

const netherlandsVfsStack = buildCommonStack({
  appointmentLabel: "VFS Netherlands appointment confirmation",
  includeEmploymentLabel: "Employment leave approval or self-employed records with tax proofs",
  includeLocalConsent: "VFS Netherlands courier / SMS / consent forms",
});

const netherlandsTlsStack = buildCommonStack({
  appointmentLabel: "TLScontact Netherlands appointment confirmation",
  includeEmploymentLabel: "Employment leave approval or self-employed records with tax proofs",
  includeLocalConsent: "TLScontact Netherlands consent and service receipts",
});

const defaultPassportValidityRule = "Must be valid for at least 3 months beyond intended departure date.";

const consulateDetailsByCountry: Record<string, ConsulateCountryDetails> = {
  spain: {
    provider: "BLS International",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original BLS appointment confirmation sheet",
    documentStackOrder: spainBlsStack,
    stackingBlueprints: [
      {
        hub: "Spain via BLS International intake hubs",
        provider: "BLS International",
        appointmentDocumentLabel: "Original BLS appointment confirmation sheet",
        documentStackOrder: spainBlsStack,
      },
    ],
  },
  france: {
    provider: "VFS Global",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original VFS or TLScontact appointment confirmation sheet",
    documentStackOrder: franceVfsStack,
    stackingBlueprints: [
      {
        hub: "France via VFS Global Mumbai / Delhi",
        provider: "VFS Global",
        appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
        documentStackOrder: franceVfsStack,
      },
      {
        hub: "France via TLScontact intake hubs",
        provider: "TLScontact",
        appointmentDocumentLabel: "Original TLScontact appointment confirmation sheet",
        documentStackOrder: franceTlsStack,
      },
    ],
  },
  germany: {
    provider: "VFS Global",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
    documentStackOrder: germanyVfsStack,
    stackingBlueprints: [
      {
        hub: "Germany via VFS Global intake hubs",
        provider: "VFS Global",
        appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
        documentStackOrder: germanyVfsStack,
      },
    ],
  },
  italy: {
    provider: "VFS Global",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original VFS or TLScontact appointment confirmation sheet",
    documentStackOrder: italyVfsStack,
    stackingBlueprints: [
      {
        hub: "Italy via VFS Global intake hubs",
        provider: "VFS Global",
        appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
        documentStackOrder: italyVfsStack,
      },
      {
        hub: "Italy via TLScontact intake hubs",
        provider: "TLScontact",
        appointmentDocumentLabel: "Original TLScontact appointment confirmation sheet",
        documentStackOrder: italyTlsStack,
      },
    ],
  },
  switzerland: {
    provider: "VFS Global",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, white or light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
    documentStackOrder: switzerlandVfsStack,
    stackingBlueprints: [
      {
        hub: "Switzerland via VFS Global intake hubs",
        provider: "VFS Global",
        appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
        documentStackOrder: switzerlandVfsStack,
      },
    ],
  },
  netherlands: {
    provider: "VFS Global",
    passportPhotoCount: 2,
    passportPhotoSpec: "35x45mm, light gray background",
    passportValidityRule: defaultPassportValidityRule,
    appointmentDocumentLabel: "Original VFS or TLScontact appointment confirmation sheet",
    documentStackOrder: netherlandsVfsStack,
    stackingBlueprints: [
      {
        hub: "Netherlands via VFS Global intake hubs",
        provider: "VFS Global",
        appointmentDocumentLabel: "Original VFS appointment confirmation sheet",
        documentStackOrder: netherlandsVfsStack,
      },
      {
        hub: "Netherlands via TLScontact intake hubs",
        provider: "TLScontact",
        appointmentDocumentLabel: "Original TLScontact appointment confirmation sheet",
        documentStackOrder: netherlandsTlsStack,
      },
    ],
  },
};

const defaultConsulateCountryDetails: ConsulateCountryDetails = {
  provider: "VFS Global",
  passportPhotoCount: 2,
  passportPhotoSpec: "35x45mm, light gray background",
  passportValidityRule: defaultPassportValidityRule,
  appointmentDocumentLabel: "Original appointment confirmation sheet",
  documentStackOrder: buildCommonStack({
    appointmentLabel: "Appointment confirmation sheet",
    includeEmploymentLabel: "Employment, business, or home-ties evidence",
    includeLocalConsent: "Provider-specific courier, SMS, and consent forms",
  }),
  stackingBlueprints: [
    {
      hub: "Default Schengen intake workflow",
      provider: "VFS Global",
      appointmentDocumentLabel: "Original appointment confirmation sheet",
      documentStackOrder: buildCommonStack({
        appointmentLabel: "Appointment confirmation sheet",
        includeEmploymentLabel: "Employment, business, or home-ties evidence",
        includeLocalConsent: "Provider-specific courier, SMS, and consent forms",
      }),
    },
  ],
};

export function resolveConsulateCountryDetails(destinationCountry: string): ConsulateCountryDetails {
  return consulateDetailsByCountry[normalizeCountryKey(destinationCountry)] ?? defaultConsulateCountryDetails;
}