import "server-only";
import Stripe from "stripe";
import { getServerEnv } from "@/lib/config";

export const stripe = new Stripe(getServerEnv().stripeSecretKey, {
  appInfo: {
    name: "VisaPilot",
  },
});