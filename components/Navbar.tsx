import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getAuthenticatedAccount } from "@/lib/auth/session";

export async function Navbar() {
  const account = await getAuthenticatedAccount();

  return (
    <header className="sticky top-0 z-30 pt-3">
      <div className="editorial-panel flex items-center justify-between rounded-full px-4 py-2.5 sm:px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan via-brand-blue to-brand-violet text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">
            VP
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-cyan">
              VisaPilot
            </p>
            <p className="text-xs text-slate-500">Schengen application intelligence</p>
          </div>
        </Link>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:text-white">
            Home
          </Link>
          <Link href="/#pricing" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:text-brand-cyan">
            Pricing
          </Link>
          <Link href="/apply?preview=1" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:text-brand-cyan">
            Preview
          </Link>
          <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:text-brand-cyan">
            Dashboard
          </Link>
          {account?.email ? (
            <p className="max-w-[200px] truncate text-xs font-medium text-slate-500">
              {account.email}
            </p>
          ) : null}
          <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            90-day repair
          </div>
          {account ? (
            <>
              <Link
                href="/apply"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:bg-slate-100"
              >
                Start Application
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/auth?next=%2Fdashboard"
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:bg-slate-100"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}