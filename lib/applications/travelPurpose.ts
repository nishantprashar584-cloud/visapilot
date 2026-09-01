import type { ApplicantInfo, TravelPurpose, VoiceIntakeTripPurpose } from "@/types";

export function getSupportedTravelPurposeValue(): "tourism" {
  return "tourism";
}

export function getSupportedTravelPurposeLabel(): string {
  return "Tourism and leisure";
}

export function getSupportedTravelPurposeVisaLabel(): string {
  return "tourism";
}

export function normalizeTravelPurpose(purpose?: TravelPurpose | VoiceIntakeTripPurpose | string): "tourism" {
  void purpose;
  return getSupportedTravelPurposeValue();
}

export function normalizeApplicantTourismScope(applicant: ApplicantInfo): ApplicantInfo {
  return {
    ...applicant,
    trip: {
      ...applicant.trip,
      purpose: normalizeTravelPurpose(applicant.trip.purpose),
    },
  };
}