import { z } from "zod";
import type { PricingTier, ServiceTrack } from "@/types";

export const pricingTierSchema = z.enum(["solo", "couple", "family"]);

export const serviceTrackSchema = z.enum(["APPLY_MYSELF", "VIP_CONCIERGE"]);

export const checkoutSelectionSchema = z.object({
  tier: pricingTierSchema,
  track: serviceTrackSchema,
});

export const serviceTrackLabel: Record<ServiceTrack, string> = {
  APPLY_MYSELF: "Self-Guided",
  VIP_CONCIERGE: "Done-For-You",
};

type PricingConfig = {
  label: string;
  checkoutLabel: string;
  requestedCredits: number;
  maxApplicants: number;
  unitAmountInr: number;
  gstInclusiveAmountInr: number;
  perApplicantInr: number;
  track: ServiceTrack;
  description: string;
};

export const pricingTierConfig: Record<ServiceTrack, Record<PricingTier, PricingConfig>> = {
  APPLY_MYSELF: {
    solo: {
      label: "Solo",
      checkoutLabel: "VisaPilot Self-Guided Solo",
      requestedCredits: 1,
      maxApplicants: 1,
      unitAmountInr: 1999,
      gstInclusiveAmountInr: 1999,
      perApplicantInr: 1999,
      track: "APPLY_MYSELF",
      description: "For 1 person traveling alone.",
    },
    couple: {
      label: "Couple",
      checkoutLabel: "VisaPilot Self-Guided Couple",
      requestedCredits: 2,
      maxApplicants: 2,
      unitAmountInr: 3299,
      gstInclusiveAmountInr: 3299,
      perApplicantInr: 1650,
      track: "APPLY_MYSELF",
      description: "For 2 adults traveling on the same trip.",
    },
    family: {
      label: "Family",
      checkoutLabel: "VisaPilot Self-Guided Family",
      requestedCredits: 4,
      maxApplicants: 4,
      unitAmountInr: 5599,
      gstInclusiveAmountInr: 5599,
      perApplicantInr: 1400,
      track: "APPLY_MYSELF",
      description: "For up to 4 family members traveling together.",
    },
  },
  VIP_CONCIERGE: {
    solo: {
      label: "Solo",
      checkoutLabel: "VisaPilot Done-For-You Solo",
      requestedCredits: 1,
      maxApplicants: 1,
      unitAmountInr: 5999,
      gstInclusiveAmountInr: 5999,
      perApplicantInr: 5999,
      track: "VIP_CONCIERGE",
      description: "For 1 person traveling alone.",
    },
    couple: {
      label: "Couple",
      checkoutLabel: "VisaPilot Done-For-You Couple",
      requestedCredits: 2,
      maxApplicants: 2,
      unitAmountInr: 9999,
      gstInclusiveAmountInr: 9999,
      perApplicantInr: 5000,
      track: "VIP_CONCIERGE",
      description: "For 2 adults traveling on the same trip.",
    },
    family: {
      label: "Family",
      checkoutLabel: "VisaPilot Done-For-You Family",
      requestedCredits: 4,
      maxApplicants: 4,
      unitAmountInr: 14999,
      gstInclusiveAmountInr: 14999,
      perApplicantInr: 3750,
      track: "VIP_CONCIERGE",
      description: "For up to 4 family members traveling together.",
    },
  },
};

export function getTierConfig(tier: PricingTier, track: ServiceTrack = "APPLY_MYSELF") {
  return pricingTierConfig[track][tier];
}

export function getDefaultServiceTrack(): ServiceTrack {
  return "APPLY_MYSELF";
}

export function getPricingMatrixForTrack(track: ServiceTrack) {
  return pricingTierConfig[track];
}