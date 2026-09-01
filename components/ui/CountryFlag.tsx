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

const countryFlagMap = {
  Austria: AT,
  Belgium: BE,
  Bulgaria: BG,
  Croatia: HR,
  Czechia: CZ,
  Denmark: DK,
  Estonia: EE,
  Finland: FI,
  France: FR,
  Germany: DE,
  Greece: GR,
  Hungary: HU,
  Iceland: IS,
  Italy: IT,
  Latvia: LV,
  Liechtenstein: LI,
  Lithuania: LT,
  Luxembourg: LU,
  Malta: MT,
  Netherlands: NL,
  Norway: NO,
  Poland: PL,
  Portugal: PT,
  Romania: RO,
  Slovakia: SK,
  Slovenia: SI,
  Spain: ES,
  Sweden: SE,
  Switzerland: CH,
} as const;

export function CountryFlag({ country, className = "h-4 w-6 rounded-[2px] shadow-sm" }: { country: string; className?: string }) {
  const Flag = countryFlagMap[country as keyof typeof countryFlagMap];

  if (!Flag) {
    return (
      <span className="inline-flex h-5 min-w-8 items-center justify-center rounded-[4px] border border-white/10 bg-white/5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
        {country.slice(0, 2)}
      </span>
    );
  }

  return <Flag className={className} />;
}
