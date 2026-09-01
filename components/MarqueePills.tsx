import Link from "next/link";
import { CH, DE, ES, FR, IT, NL } from "country-flag-icons/react/3x2";

const curatedDestinations = [
  {
    name: "France",
    Flag: FR,
    href: "/apply?destination=France",
    glowClassName: "from-[#315efb]/28 via-[#1f3f95]/20 to-white/6",
  },
  {
    name: "Switzerland",
    Flag: CH,
    href: "/apply?destination=Switzerland",
    glowClassName: "from-[#ef4444]/24 via-[#991b1b]/18 to-white/6",
  },
  {
    name: "Germany",
    Flag: DE,
    href: "/apply?destination=Germany",
    glowClassName: "from-[#f59e0b]/22 via-[#111827]/18 to-white/6",
  },
  {
    name: "Italy",
    Flag: IT,
    href: "/apply?destination=Italy",
    glowClassName: "from-[#f59e0b]/24 via-[#166534]/18 to-white/6",
  },
  {
    name: "Spain",
    Flag: ES,
    href: "/apply?destination=Spain",
    glowClassName: "from-[#f59e0b]/26 via-[#b91c1c]/16 to-white/6",
  },
  {
    name: "Netherlands",
    Flag: NL,
    href: "/apply?destination=Netherlands",
    glowClassName: "from-[#fb7185]/18 via-[#2563eb]/20 to-white/6",
  },
] as const;

export function MarqueePills() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,rgba(23,34,57,0.82),rgba(13,21,39,0.9))] p-4 shadow-[0_20px_56px_rgba(4,8,24,0.22)] backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Top Schengen entry hubs</p>
          <p className="text-sm leading-6 text-slate-200">Choose a destination to pre-select it in the onboarding flow before you start building the packet.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {curatedDestinations.map((destination) => (
            <Link
              key={destination.name}
              href={destination.href}
              className={`group relative overflow-hidden rounded-[1.15rem] border border-slate-700/85 bg-slate-800/80 px-4 py-3 text-left text-slate-200 shadow-[0_16px_32px_rgba(8,15,35,0.16)] transition hover:-translate-y-0.5 hover:border-indigo-400/70 hover:text-white ${destination.glowClassName}`}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_54%)] opacity-70" />
              <span className="relative flex items-center gap-3">
                <destination.Flag className="h-4 w-6 rounded-[2px] shadow-sm" title={destination.name} />
                <span className="text-sm font-semibold tracking-[-0.01em]">{destination.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}