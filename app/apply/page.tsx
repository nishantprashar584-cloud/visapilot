import { ApplicationWizard } from "@/components/wizard/ApplicationWizard";
import { redirect } from "next/navigation";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: { preview?: string; destination?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const account = await getAuthenticatedAccount();
  const requestedDestination = searchParams?.destination?.trim() || undefined;

  if (!account && !previewMode) {
    const nextPath = requestedDestination
      ? `/apply?destination=${encodeURIComponent(requestedDestination)}`
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
      <ApplicationWizard previewMode={previewMode} initialDestinationCountry={requestedDestination} />
    </section>
  );
}