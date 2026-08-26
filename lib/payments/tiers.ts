import { z } from "zod";
import { publicEnv } from "@/lib/config";
import type { PricingTier } from "@/types";

export const pricingTierSchema = z.enum(["solo", "couple", "family"]);

export const pricingTierConfig: Record<
  PricingTier,
  {
    label: string;
    requestedCredits: number;
    maxApplicants: number;
    unitAmountUsd: number;
    priceId: string;
  }
> = {
  solo: {
    label: "Solo Pass",
    requestedCredits: 1,
    maxApplicants: 1,
    unitAmountUsd: 19,
    priceId: publicEnv.stripeSoloPriceId,
  },
  couple: {
    label: "Couple Pass",
    requestedCredits: 2,
    maxApplicants: 2,
    unitAmountUsd: 29,
    priceId: publicEnv.stripeCouplePriceId,
  },
  family: {
    label: "Family Pack",
    requestedCredits: 4,
    maxApplicants: 4,
    unitAmountUsd: 49,
    priceId: publicEnv.stripeFamilyPriceId,
  },
};

export function getTierConfig(tier: PricingTier) {
  return pricingTierConfig[tier];
}