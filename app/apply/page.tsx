import { ApplicationWizard } from "@/components/wizard/ApplicationWizard";
import { redirect } from "next/navigation";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { buildDestinationApplyHref, normalizeDestinationSelection } from "@/lib/destinationSelection";
import { getDefaultServiceTrack } from "@/lib/payments/tiers";
import type { PricingTier, ServiceTrack } from "@/types";

const allowedStep5Tabs = new Set(["bundle", "cover-letter", "pdf-editor", "checklist", "prep"]);

function parseInitialStep(value?: string): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 5) {
    return 0;
  }

  return parsedValue - 1;
}

function parseInitialStep5Tab(value?: string): "bundle" | "cover-letter" | "pdf-editor" | "checklist" | "prep" {
  return allowedStep5Tabs.has(value ?? "")
    ? value as "bundle" | "cover-letter" | "pdf-editor" | "checklist" | "prep"
    : "bundle";
}

function parseInitialTrack(value?: string): ServiceTrack {
  return value === "VIP_CONCIERGE" ? "VIP_CONCIERGE" : getDefaultServiceTrack();
}

function parseInitialTier(value?: string): PricingTier {
  return value === "couple" || value === "family" ? value : "solo";
}

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: { preview?: string; destination?: string; step?: string; tab?: string; track?: string; tier?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const account = await getAuthenticatedAccount();
  const requestedDestination = normalizeDestinationSelection(searchParams?.destination);
  const initialStep = parseInitialStep(searchParams?.step);
  const initialStep5Tab = parseInitialStep5Tab(searchParams?.tab);
  const initialTrack = parseInitialTrack(searchParams?.track);
  const initialTier = parseInitialTier(searchParams?.tier);

  if (!account && !previewMode) {
    const nextPath = requestedDestination
      ? buildDestinationApplyHref(requestedDestination)
      : "/apply";
    redirect(buildAuthRedirectPath(nextPath));
  }

  return (
    <section className="w-full space-y-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <p className="eyebrow">
          Start Application
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-4xl">
          Build your Schengen tourist packet
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
          Move through five clean stages for identity, leisure travel, financial proof, accommodation ties, and final packet assembly without losing context.
        </p>
      </div>
      {previewMode ? (
        <div className="rounded-[1.25rem] border border-cyan-300/20 bg-cyan-400/12 px-5 py-4 text-sm font-medium text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
          Preview mode is active with realistic sample data. Review the full step-by-step packet builder without signing in.
        </div>
      ) : null}
      <ApplicationWizard
        previewMode={previewMode}
        initialDestinationCountry={requestedDestination ?? undefined}
        initialStep={initialStep}
        initialStep5Tab={initialStep5Tab}
        initialTrack={initialTrack}
        initialTier={initialTier}
      />
    </section>
  );
}