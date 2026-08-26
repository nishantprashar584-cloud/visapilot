import { AT, CH, DE, ES, FR, IT, NL, PT } from "country-flag-icons/react/3x2";

const countryFlagMap = {
  Austria: AT,
  France: FR,
  Germany: DE,
  Italy: IT,
  Netherlands: NL,
  Portugal: PT,
  Spain: ES,
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
