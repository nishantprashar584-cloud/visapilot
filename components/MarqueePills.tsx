import {
  AT,
  BE,
  BG,
  CH,
  CZ,
  DE,
  DK,
  EE,
  ES,
  FI,
  FR,
  GR,
  HR,
  HU,
  IS,
  IT,
  LI,
  LT,
  LU,
  LV,
  MT,
  NL,
  NO,
  PL,
  PT,
  RO,
  SE,
  SI,
  SK,
} from "country-flag-icons/react/3x2";

const countryPills = [
  { name: "Austria", Flag: AT },
  { name: "Belgium", Flag: BE },
  { name: "Bulgaria", Flag: BG },
  { name: "Croatia", Flag: HR },
  { name: "Czechia", Flag: CZ },
  { name: "Denmark", Flag: DK },
  { name: "Estonia", Flag: EE },
  { name: "Finland", Flag: FI },
  { name: "France", Flag: FR },
  { name: "Germany", Flag: DE },
  { name: "Greece", Flag: GR },
  { name: "Hungary", Flag: HU },
  { name: "Iceland", Flag: IS },
  { name: "Italy", Flag: IT },
  { name: "Latvia", Flag: LV },
  { name: "Liechtenstein", Flag: LI },
  { name: "Lithuania", Flag: LT },
  { name: "Luxembourg", Flag: LU },
  { name: "Malta", Flag: MT },
  { name: "Netherlands", Flag: NL },
  { name: "Norway", Flag: NO },
  { name: "Poland", Flag: PL },
  { name: "Portugal", Flag: PT },
  { name: "Romania", Flag: RO },
  { name: "Slovakia", Flag: SK },
  { name: "Slovenia", Flag: SI },
  { name: "Spain", Flag: ES },
  { name: "Sweden", Flag: SE },
  { name: "Switzerland", Flag: CH },
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