import { ApplicationWizard } from "@/components/wizard/ApplicationWizard";
import { redirect } from "next/navigation";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAvailableCredits(userId?: string): Promise<number> {
  if (!userId) {
    return 0;
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .maybeSingle();

  return data?.credits ?? 0;
}

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

  const availableCredits = previewMode ? 1 : await getAvailableCredits(account?.id);

  return (
    <section className="w-full space-y-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <p className="eyebrow">
          Start Application
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          Build your Schengen application packet
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
          Move through five clean stages for identity, travel, financial proof, accommodation ties, and final document packaging without losing context.
        </p>
      </div>
      {previewMode ? (
        <div className="rounded-[1.25rem] border border-white/10 bg-black/70 px-5 py-4 text-sm font-medium text-slate-200">
          Preview mode is active with realistic sample data. Review the full step-by-step packet builder without signing in.
        </div>
      ) : null}
      <ApplicationWizard previewMode={previewMode} availableCredits={availableCredits} />
    </section>
  );
}