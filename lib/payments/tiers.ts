import { z } from "zod";
import { publicEnv } from "@/lib/config";
import type { PricingTier } from "@/types";

export const pricingTierSchema = z.enum(["solo", "couple", "family"]);

export const pricingTierConfig: Record<
  PricingTier,
  {
    label: string;
    checkoutLabel: string;
    requestedCredits: number;
    maxApplicants: number;
    unitAmountInr: number;
    gstInclusiveAmountInr: number;
    perApplicantInr: number;
    priceId: string;
  }
> = {
  solo: {
    label: "Solo",
    checkoutLabel: "VisaPilot Solo Tier",
    requestedCredits: 1,
    maxApplicants: 1,
    unitAmountInr: 1999,
    gstInclusiveAmountInr: 1999,
    perApplicantInr: 1999,
    priceId: publicEnv.stripeSoloPriceId,
  },
  couple: {
    label: "Couple",
    checkoutLabel: "VisaPilot Couple Tier",
    requestedCredits: 2,
    maxApplicants: 2,
    unitAmountInr: 3299,
    gstInclusiveAmountInr: 3299,
    perApplicantInr: 1650,
    priceId: publicEnv.stripeCouplePriceId,
  },
  family: {
    label: "Family",
    checkoutLabel: "VisaPilot Family Tier",
    requestedCredits: 4,
    maxApplicants: 4,
    unitAmountInr: 5599,
    gstInclusiveAmountInr: 5599,
    perApplicantInr: 1400,
    priceId: publicEnv.stripeFamilyPriceId,
  },
};

export function getTierConfig(tier: PricingTier) {
  return pricingTierConfig[tier];
}