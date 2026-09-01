import { resolveConsulateCountryDetails } from "@/config/consulate-details";
import { calculateStatutoryFundsRequirement } from "@/config/schengen-rules";
import type { ApplicantInfo } from "@/types";

export type ConsulateChecklistItem = {
  id: string;
  label: string;
  note?: string;
};

export type ResolvedConsulateChecklist = {
  destinationCountry: string;
  provider: string;
  passportPhotoCount: number;
  passportPhotoSpec: string;
  passportValidityRule: string;
  appointmentDocumentLabel: string;
  documentStackOrder: string[];
  requiredFundsEur: number;
  checklistItems: ConsulateChecklistItem[];
};

export function calculateChecklistRequiredFunds(applicant: ApplicantInfo): number {
  return calculateStatutoryFundsRequirement({
    destinationCountry: applicant.trip.destinationCountry,
    stayDurationDays: applicant.trip.stayDurationDays,
    hasAccommodationProof: applicant.trip.accommodations.trim().length > 0 && applicant.trip.hotelBookingReference.trim().length > 0,
    transitBufferEur: applicant.financialEvidence?.transitBufferEur ?? 0,
  }).requiredTotalEur;
}

export function resolveConsulateChecklist(applicant: ApplicantInfo): ResolvedConsulateChecklist {
  const details = resolveConsulateCountryDetails(applicant.trip.destinationCountry);
  const requiredFundsEur = calculateChecklistRequiredFunds(applicant);

  return {
    destinationCountry: applicant.trip.destinationCountry || "Schengen Area",
    provider: details.provider,
    passportPhotoCount: details.passportPhotoCount,
    passportPhotoSpec: details.passportPhotoSpec,
    passportValidityRule: details.passportValidityRule,
    appointmentDocumentLabel: details.appointmentDocumentLabel,
    documentStackOrder: details.documentStackOrder,
    requiredFundsEur,
    checklistItems: [
      {
        id: "photos",
        label: `${details.passportPhotoCount}x ICAO photos (${details.passportPhotoSpec})`,
      },
      {
        id: "passport",
        label: "Passport with at least 2 blank pages & 3+ months validity post-exit",
        note: details.passportValidityRule,
      },
      {
        id: "stack",
        label: `Stacked document package in official ${details.provider} order`,
        note: details.documentStackOrder.map((item, index) => `${index + 1}. ${item}`).join("  "),
      },
      {
        id: "bank",
        label: "Bank statements stamped/certified by bank branch",
        note: `Accessible liquid funds should clear the statutory baseline of EUR ${requiredFundsEur.toFixed(2)}.`,
      },
      {
        id: "appointment",
        label: details.appointmentDocumentLabel,
      },
    ],
  };
}