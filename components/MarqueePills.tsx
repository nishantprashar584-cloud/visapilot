const countryPills = [
  { label: "🇫🇷 France", status: "PDF Auto-Fill" },
  { label: "🇪🇸 Spain", status: "PDF Auto-Fill" },
  { label: "🇩🇪 Germany", status: "PDF Auto-Fill" },
  { label: "🇮🇹 Italy", status: "Audit & Letter" },
  { label: "🇳🇱 Netherlands", status: "Audit & Letter" },
  { label: "🇨🇭 Switzerland", status: "Audit & Letter" },
  { label: "🇦🇹 Austria", status: "Audit & Letter" },
  { label: "🇵🇹 Portugal", status: "Audit & Letter" },
] as const;

const repeatedCountryPills = [...countryPills, ...countryPills];

export function MarqueePills() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="group overflow-hidden rounded-[1.35rem] border border-zinc-200/10 bg-black/60 px-4 py-3 shadow-panel backdrop-blur-md">
        <div className="flex min-w-max gap-3 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
          {repeatedCountryPills.map((pill, index) => (
            <span
              key={`${pill.label}-${index}`}
              className="inline-flex shrink-0 items-center gap-3 rounded-full border border-zinc-200/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100"
            >
              <span>{pill.label}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                {pill.status}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}