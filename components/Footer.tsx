import Link from "next/link";

const footerLinks = [
  { label: "About", href: "/" },
  { label: "Blog", href: "/" },
  { label: "Privacy Policy", href: "/" },
  { label: "Terms of Service", href: "/" },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 w-full border-t border-zinc-200/10 bg-zinc-950/80 py-12 backdrop-blur-sm sm:mt-24">
      <div className="mx-auto flex w-full max-w-none flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">VisaPilot</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Privacy-first Schengen application workflows, cover letters, and embassy-ready PDF assembly.
            </p>
          </div>

          <nav className="flex w-full flex-wrap gap-x-5 gap-y-3 text-sm text-slate-300 md:w-auto md:justify-end">
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
            <a href="mailto:nishantprasharms@gmail.com" className="transition hover:text-white">
              Contact
            </a>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-6 text-sm text-slate-500">
          © 2026 Visapilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}