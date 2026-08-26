const requiredPublicEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID",
  "NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID",
  "NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID",
  "NEXT_PUBLIC_APP_URL",
] as const;

const requiredCriticalServerEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const requiredServerEnvVars = [
  ...requiredCriticalServerEnvVars,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID",
  "NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID",
  "NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type EnvHealthReport = {
  ok: boolean;
  missing: string[];
};

const publicEnvValues: Record<(typeof requiredPublicEnvVars)[number], string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID,
  NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID,
  NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

function readEnvValue(name: string): string | undefined {
  if (name in publicEnvValues) {
    return publicEnvValues[name as keyof typeof publicEnvValues];
  }

  return process.env[name];
}

function findMissingEnv(names: readonly string[]): string[] {
  return names.filter((name) => {
    const value = readEnvValue(name);
    return !value || value.trim().length === 0;
  });
}

export function getPublicEnvHealth(): EnvHealthReport {
  const missing = findMissingEnv(requiredPublicEnvVars);

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function getServerEnvHealth(): EnvHealthReport {
  const missing = findMissingEnv(requiredServerEnvVars);

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function getCriticalEnvHealth(): EnvHealthReport {
  const missing = findMissingEnv(requiredCriticalServerEnvVars);

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function assertPublicEnv(): void {
  const report = getPublicEnvHealth();

  if (!report.ok) {
    throw new Error(
      `Missing required public environment variables: ${report.missing.join(", ")}`,
    );
  }
}

export function assertServerEnv(): void {
  const report = getServerEnvHealth();

  if (!report.ok) {
    throw new Error(
      `Missing required server environment variables: ${report.missing.join(", ")}`,
    );
  }
}

export function assertCriticalServerEnv(): void {
  const report = getCriticalEnvHealth();

  if (!report.ok) {
    throw new Error(
      `Missing critical production environment variables: ${report.missing.join(", ")}`,
    );
  }
}