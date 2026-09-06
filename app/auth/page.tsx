import { redirect } from "next/navigation";
import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { AuthEmailForm } from "@/components/auth/AuthEmailForm";
import { getAuthenticatedAccount, normalizeNextPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const nextPath = normalizeNextPath(searchParams?.next);
  const account = await getAuthenticatedAccount();

  if (account) {
    redirect(nextPath);
  }

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-0">
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div className="glass-panel p-6 sm:p-8">
          <p className="eyebrow">Secure Sign In</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Continue into your VisaPilot workspace.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Use Google for the fastest start or request an email link when you want a separate sign-in path. Your authenticated session controls dashboard access, package ownership, downloads, and payment recovery.
          </p>
          <div className="mt-6 grid gap-3">
            <div className="vp-surface-quiet p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Protected account ownership</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Applications, supporting documents, and invoices stay tied to the authenticated account.</p>
            </div>
            <div className="vp-surface-quiet p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-indigo-300" /> Continuous product journey</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">The same case context follows you from free readiness into the paid builder and on to the vault.</p>
            </div>
            <div className="vp-surface-quiet p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><Lock className="h-4 w-4 text-sky-300" /> Secure session controls</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Authentication unlocks protected downloads, dashboard actions, and recovery workflows.</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <AuthEmailForm nextPath={nextPath} />
          {searchParams?.error ? (
            <p className="mt-4 rounded-[1rem] border border-rose-400/22 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Sign-in could not be completed. Retry Google or request a fresh email link.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}