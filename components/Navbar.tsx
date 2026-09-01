import Link from "next/link";
import { Menu } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getAuthenticatedAccount } from "@/lib/auth/session";

export async function Navbar() {
  const account = await getAuthenticatedAccount();
  const primaryLinks = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Preview", href: "/apply?preview=1" },
    { label: "Dashboard", href: "/dashboard" },
  ] as const;

  return (
    <header className="sticky top-0 z-30 w-full px-4 pt-3 sm:px-6 lg:px-8">
      <div className="editorial-panel mx-auto flex w-full max-w-none items-center justify-between rounded-full px-4 py-2.5 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-sky-300 to-indigo-300 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-400/35">
            VP
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              VisaPilot
            </p>
            <p className="truncate text-xs text-slate-300">Schengen tourist packet engine</p>
          </div>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          {primaryLinks.map((link) => (
            <Link key={link.label} href={link.href} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:text-cyan-200">
              {link.label}
            </Link>
          ))}
          {account?.email ? (
            <p className="max-w-[200px] truncate text-xs font-medium text-slate-300">
              {account.email}
            </p>
          ) : null}
          <div className="rounded-full border border-amber-300/25 bg-amber-400/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-50">
            90-day repair
          </div>
          {account ? (
            <>
              <Link
                href="/apply"
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              >
                Start Application
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/auth?next=%2Fdashboard"
              className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Sign In
            </Link>
          )}
        </div>

        <details className="md:hidden">
          <summary className="flex list-none items-center justify-center rounded-full border border-white/14 bg-white/8 p-2 text-slate-100 transition hover:bg-white/12 hover:text-white">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation menu</span>
          </summary>
          <div className="absolute right-4 top-[calc(100%+0.75rem)] w-[min(22rem,calc(100vw-2rem))] rounded-[1.25rem] border border-white/14 bg-[rgba(20,28,48,0.94)] p-4 shadow-panel backdrop-blur-xl">
            <div className="flex flex-col gap-2">
              {primaryLinks.map((link) => (
                <Link key={link.label} href={link.href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 hover:text-white">
                  {link.label}
                </Link>
              ))}
              <Link href="/apply" className="rounded-xl bg-indigo-500/16 px-3 py-2 text-sm font-semibold text-indigo-50 transition hover:bg-indigo-400/22 hover:text-white">
                Start Application
              </Link>
              {account?.email ? (
                <div className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs text-slate-300">
                  {account.email}
                </div>
              ) : (
                <Link href="/auth?next=%2Fdashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 hover:text-white">
                  Sign In
                </Link>
              )}
              {account ? <SignOutButton /> : null}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}