import type { CountryRiskRule } from "@/types";

export const consultantDailyMinimumEur = 100;

export const fundingSourceOptions = [
  { label: "Self-Funded", value: "self_funded" },
  { label: "Sponsored by Family", value: "family_sponsored" },
  { label: "Sponsored by Company", value: "company_sponsored" },
] as const;

export const employmentStatusOptions = [
  { label: "Employed", value: "employed" },
  { label: "Freelancer / Self-Employed", value: "self_employed" },
  { label: "Student", value: "student" },
  { label: "Retired", value: "retired" },
  { label: "Unemployed", value: "unemployed" },
  { label: "Contractor", value: "contractor" },
  { label: "Other", value: "other" },
] as const;

export const visaKnowledgeBaseSections = [
  {
    id: "rule-90-180",
    title: "The 90/180 Day Rule",
    icon: "clock",
    body: "Short-stay Schengen visas usually permit a maximum of 90 days in any rolling 180-day window across the full Schengen area. Consulates expect your itinerary and previous travel to stay within that rolling cap, not just within one calendar year.",
  },
  {
    id: "photo-requirements",
    title: "Photo Requirements",
    icon: "camera",
    body: "Use a 35x45mm photo taken within the last 6 months. The face should measure 32-36mm from chin to crown, with a light grey, light blue, or off-white background, neutral expression, no dark glasses, and no heavy retouching.",
  },
  {
    id: "biometrics",
    title: "Biometrics (Fingerprints)",
    icon: "fingerprint",
    body: "Schengen fingerprints are stored in the VIS system for 59 months. If your last Schengen biometrics were captured within that window, many consulates can usually reuse them unless identity verification is needed again.",
  },
  {
    id: "multiple-entry",
    title: "Multiple vs. Single Entry",
    icon: "repeat",
    body: "Multiple-entry visas are usually easier to justify when you can show repeated legitimate travel, prior visa compliance, and a continuing need to enter and leave the Schengen area during the visa validity period.",
  },
  {
    id: "sponsorship-rules",
    title: "Sponsorship Rules",
    icon: "handshake",
    body: "Sponsored applications usually need a sponsorship letter, the sponsor's bank statements, identity documents, and country-specific host evidence such as an attestation d'accueil for France where applicable.",
  },
] as const;

export const schengenCountryRules: Record<string, CountryRiskRule> = {
  france: {
    displayName: "France",
    dailyFundsEur: 65,
    dailyFundsWithoutAccommodationEur: 120,
    recommendedBufferMultiplier: 1.2,
    minimumInsuranceCoverageEur: 30000,
    requireRoundTripReservation: true,
    requireAccommodationProof: true,
    hasExactStatutoryRule: true,
    documentRules: [
      "Hotel bookings or compliant host accommodation evidence should cover the full stay.",
      "Travel medical insurance must cover all Schengen states with at least EUR 30,000 coverage.",
      "Sponsored stays may need host-specific invitation evidence such as an attestation d'accueil.",
    ],
  },
  spain: {
    displayName: "Spain",
    dailyFundsEur: 113.4,
    minimumBalanceEur: 1020,
    recommendedBufferMultiplier: 1.25,
    minimumInsuranceCoverageEur: 30000,
    requireRoundTripReservation: true,
    requireAccommodationProof: true,
    hasExactStatutoryRule: true,
    documentRules: [
      "Spain expects maintenance funds for the full stay and also applies a hard total minimum.",
      "Hotel or host accommodation proof should align with the stated itinerary.",
      "Proof of onward or return travel is commonly reviewed with the funds test.",
    ],
  },
  germany: {
    displayName: "Germany",
    dailyFundsEur: 45,
    recommendedBufferMultiplier: 1.15,
    minimumInsuranceCoverageEur: 30000,
    requireRoundTripReservation: true,
    requireAccommodationProof: true,
    hasExactStatutoryRule: true,
    documentRules: [
      "Applicants should show clear subsistence funds for the full itinerary.",
      "Business travel should be backed by employer or inviting-company documentation.",
      "Hosted stays should include a host letter and address details consistent with the form.",
    ],
  },
  italy: {
    displayName: "Italy",
    dailyFundsEur: 27,
    minimumBalanceEur: 270,
    recommendedBufferMultiplier: 1.15,
    minimumInsuranceCoverageEur: 30000,
    requireRoundTripReservation: true,
    requireAccommodationProof: true,
    hasExactStatutoryRule: true,
    documentRules: [
      "Italy commonly expects proof of accommodation, travel insurance, and return travel reservations.",
      "For longer trips, applicants should evidence daily maintenance funds across the full stay.",
      "Shorter trips should still clear the fixed minimum before submission.",
    ],
  },
};

export const defaultSchengenCountryRule: CountryRiskRule = {
  displayName: "Schengen Area",
  dailyFundsEur: consultantDailyMinimumEur,
  recommendedBufferMultiplier: 1.15,
  minimumInsuranceCoverageEur: 30000,
  requireRoundTripReservation: true,
  requireAccommodationProof: true,
  hasExactStatutoryRule: false,
  documentRules: [
    "Country-specific statutory funds are not configured yet for this destination.",
    "Use the consultant baseline of EUR 100 per day until the official local rule is added.",
  ],
};

export function normalizeCountryKey(country: string): string {
  return country.trim().toLowerCase();
}

export function resolveSchengenCountryRule(destinationCountry: string): CountryRiskRule {
  return schengenCountryRules[normalizeCountryKey(destinationCountry)] ?? defaultSchengenCountryRule;
}

export function calculateStatutoryFundsRequirement(input: {
  destinationCountry: string;
  stayDurationDays: number;
  hasAccommodationProof: boolean;
}) {
  const rule = resolveSchengenCountryRule(input.destinationCountry);
  const countryKey = normalizeCountryKey(input.destinationCountry);
  const tripDays = Math.max(0, input.stayDurationDays);

  if (countryKey === "italy") {
    const dailyComponent = tripDays > 20 ? tripDays * rule.dailyFundsEur : 0;
    const requiredTotalEur = Math.max(dailyComponent, rule.minimumBalanceEur ?? 0);

    return {
      rule,
      appliedDailyRateEur: tripDays > 20 ? rule.dailyFundsEur : 0,
      requiredTotalEur,
      summary: tripDays > 20
        ? `Italy expects about EUR ${rule.dailyFundsEur.toFixed(2)} per day for longer stays, which makes your statutory target EUR ${requiredTotalEur.toFixed(2)}.`
        : `Italy applies a fixed minimum of EUR ${(rule.minimumBalanceEur ?? 0).toFixed(2)} for shorter stays in this rules engine.`,
    };
  }

  const appliedDailyRateEur = !input.hasAccommodationProof && rule.dailyFundsWithoutAccommodationEur
    ? rule.dailyFundsWithoutAccommodationEur
    : rule.dailyFundsEur;
  const stayBasedRequirementEur = tripDays * appliedDailyRateEur;
  const requiredTotalEur = Math.max(stayBasedRequirementEur, rule.minimumBalanceEur ?? 0);
  const dailyLabel = `EUR ${appliedDailyRateEur.toFixed(2)} per day`;
  const minimumLabel = rule.minimumBalanceEur ? ` with a hard minimum of EUR ${rule.minimumBalanceEur.toFixed(2)}` : "";

  return {
    rule,
    appliedDailyRateEur,
    requiredTotalEur,
    summary: `${rule.displayName} requires ${dailyLabel}${minimumLabel}. For ${tripDays} day${tripDays === 1 ? "" : "s"}, the current statutory target is EUR ${requiredTotalEur.toFixed(2)}.`,
  };
}