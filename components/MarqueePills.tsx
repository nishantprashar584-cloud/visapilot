import { AT, CH, DE, ES, FR, IT, NL, PT } from "country-flag-icons/react/3x2";

const countryPills = [
  { name: "France", Flag: FR },
  { name: "Spain", Flag: ES },
  { name: "Germany", Flag: DE },
  { name: "Italy", Flag: IT },
  { name: "Netherlands", Flag: NL },
  { name: "Switzerland", Flag: CH },
  { name: "Austria", Flag: AT },
  { name: "Portugal", Flag: PT },
] as const;

const repeatedCountryPills = [...countryPills, ...countryPills];

export function MarqueePills() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="group overflow-hidden rounded-[1.35rem] border border-zinc-200/10 bg-black/60 px-4 py-3 shadow-panel backdrop-blur-md">
        <div className="flex min-w-max gap-3 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
          {repeatedCountryPills.map((pill, index) => (
            <span
              key={`${pill.name}-${index}`}
              className="inline-flex shrink-0 items-center gap-3 rounded-full border border-zinc-200/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100"
            >
              <pill.Flag className="h-4 w-6 rounded-[2px] shadow-sm" title={pill.name} />
              <span className="font-semibold text-zinc-100">{pill.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}