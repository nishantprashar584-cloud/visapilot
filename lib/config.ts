import { assertServerEnv } from "@/lib/config/envCheck";

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublishableKey: string;
  stripeSoloPriceId: string;
  stripeCouplePriceId: string;
  stripeFamilyPriceId: string;
  appUrl: string;
};

type ServerEnv = PublicEnv & {
  supabaseServiceRoleKey: string;
  openAiApiKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
};

function readRequiredEnv(name: string, value: string | undefined): string {
  const resolvedValue = value;

  if (!resolvedValue || resolvedValue.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return resolvedValue;
}

export const publicEnv: PublicEnv = {
  supabaseUrl: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  stripePublishableKey: readRequiredEnv(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  ),
  stripeSoloPriceId: readRequiredEnv("NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID", process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID),
  stripeCouplePriceId: readRequiredEnv(
    "NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID",
    process.env.NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID,
  ),
  stripeFamilyPriceId: readRequiredEnv(
    "NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID",
    process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID,
  ),
  appUrl: readRequiredEnv("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL),
};

let cachedServerEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables are only available on the server.");
  }

  assertServerEnv();

  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = {
    ...publicEnv,
    supabaseServiceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    openAiApiKey: readRequiredEnv("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    stripeSecretKey: readRequiredEnv("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: readRequiredEnv("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET),
  };

  return cachedServerEnv;
}