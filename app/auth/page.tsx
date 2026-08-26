import { redirect } from "next/navigation";
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
    <section className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-4">
        <p className="eyebrow">
          Secure Sign In
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Continue with your email to unlock your VisaPilot workspace.
        </h1>
        <p className="text-base leading-7 text-slate-300">
          Your account session now controls dashboard access, package ownership, downloads, and Stripe purchase recovery so the app matches the database security model end to end.
        </p>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        <AuthEmailForm nextPath={nextPath} />
        {searchParams?.error ? (
          <p className="mt-4 text-sm text-rose-600">
            Sign-in could not be completed. Request a fresh email link and try again.
          </p>
        ) : null}
      </div>
    </section>
  );
}