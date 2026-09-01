import Link from "next/link";

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 w-full border-t border-[color:var(--vp-border)] bg-[linear-gradient(180deg,rgba(22,32,56,0.88),rgba(10,14,26,0.98))] py-12 backdrop-blur-sm sm:mt-24">
      <div className="mx-auto flex w-full max-w-none flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">VisaPilot</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--vp-text-secondary)]">
              Privacy-first Schengen tourist visa workflows, cover letters, and embassy-ready packet assembly.
            </p>
            <p className="mt-3 max-w-xl text-xs leading-6 text-[color:var(--vp-text-muted)]">
              Currently optimized exclusively for short-stay tourism and leisure travel.
            </p>
          </div>

          <nav className="flex w-full flex-wrap gap-x-5 gap-y-3 text-sm text-[color:var(--vp-text-secondary)] md:w-auto md:justify-end">
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href} className="transition hover:text-[color:var(--vp-text-primary)]">
                {link.label}
              </Link>
            ))}
            <Link href="/contact" className="transition hover:text-[color:var(--vp-text-primary)]">
              Contact
            </Link>
          </nav>
        </div>

        <div className="border-t border-[color:var(--vp-border)] pt-6 text-sm text-[color:var(--vp-text-muted)]">
          © 2026 Visapilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}