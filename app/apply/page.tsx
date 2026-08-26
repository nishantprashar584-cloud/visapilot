import { ApplicationWizard } from "@/components/wizard/ApplicationWizard";
import { redirect } from "next/navigation";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: { preview?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const account = await getAuthenticatedAccount();

  if (!account && !previewMode) {
    redirect(buildAuthRedirectPath("/apply"));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-4">
        <p className="eyebrow">
          Start Application
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          Build your Schengen application packet
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
          Move through the guided steps for identity, travel, finances, and final packet review without losing context as you progress.
        </p>
      </div>
      {previewMode ? (
        <div className="rounded-[1.25rem] border border-white/10 bg-black/70 px-5 py-4 text-sm font-medium text-slate-200">
          Preview mode is active with realistic sample data. Review the full step-by-step packet builder without signing in.
        </div>
      ) : null}
      <ApplicationWizard previewMode={previewMode} />
    </section>
  );
}