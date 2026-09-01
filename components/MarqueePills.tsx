"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import {
  buildDestinationApplyHref,
  nonFeaturedDestinationCountries,
  storeSelectedDestination,
} from "@/lib/destinationSelection";

const curatedDestinations = [
  {
    name: "France",
    glowClassName: "from-[#315efb]/28 via-[#1f3f95]/20 to-white/6",
  },
  {
    name: "Switzerland",
    glowClassName: "from-[#ef4444]/24 via-[#991b1b]/18 to-white/6",
  },
  {
    name: "Germany",
    glowClassName: "from-[#f59e0b]/22 via-[#111827]/18 to-white/6",
  },
  {
    name: "Italy",
    glowClassName: "from-[#f59e0b]/24 via-[#166534]/18 to-white/6",
  },
  {
    name: "Spain",
    glowClassName: "from-[#f59e0b]/26 via-[#b91c1c]/16 to-white/6",
  },
  {
    name: "Netherlands",
    glowClassName: "from-[#fb7185]/18 via-[#2563eb]/20 to-white/6",
  },
] as const;

export function MarqueePills() {
  const router = useRouter();
  const [isOtherCountriesOpen, setIsOtherCountriesOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  const filteredOtherCountries = useMemo(() => {
    const normalizedQuery = countrySearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return nonFeaturedDestinationCountries;
    }

    return nonFeaturedDestinationCountries.filter((country) => country.toLowerCase().includes(normalizedQuery));
  }, [countrySearchQuery]);

  function handleDestinationSelect(destinationCountry: string) {
    storeSelectedDestination(destinationCountry);
    setIsOtherCountriesOpen(false);
    setCountrySearchQuery("");
    router.push(buildDestinationApplyHref(destinationCountry));
  }

  return (
    <>
      <div className="mx-auto max-w-4xl">
      <div className="rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,rgba(23,34,57,0.82),rgba(13,21,39,0.9))] p-4 shadow-[0_20px_56px_rgba(4,8,24,0.22)] backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Top Schengen entry hubs</p>
          <p className="text-sm leading-6 text-slate-200">Choose a destination to pre-select it in the onboarding flow before you start building the packet.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {curatedDestinations.map((destination) => (
            <button
              key={destination.name}
              type="button"
              onClick={() => handleDestinationSelect(destination.name)}
              className={`group relative overflow-hidden rounded-[1.15rem] border border-slate-700/85 bg-slate-800/80 px-4 py-3 text-left text-slate-200 shadow-[0_16px_32px_rgba(8,15,35,0.16)] transition hover:-translate-y-0.5 hover:border-indigo-400/70 hover:text-white ${destination.glowClassName}`}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_54%)] opacity-70" />
              <span className="relative flex items-center gap-3">
                <CountryFlag country={destination.name} className="h-4 w-6 rounded-[2px] shadow-sm" />
                <span className="text-sm font-semibold tracking-[-0.01em]">{destination.name}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsOtherCountriesOpen(true)}
            className="group relative col-span-2 overflow-hidden rounded-[1.15rem] border border-white/16 bg-[linear-gradient(180deg,rgba(32,45,72,0.92),rgba(18,26,44,0.96))] px-4 py-3 text-left text-slate-100 shadow-[0_16px_32px_rgba(8,15,35,0.16)] transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:text-white sm:col-span-3"
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_56%)] opacity-80" />
            <span className="relative flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-white/10 text-cyan-100">
                  <Search className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-[-0.01em]">Other Schengen Country...</span>
                  <span className="block text-xs text-slate-300">Austria, Portugal, Sweden and the full remaining list</span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-white" />
            </span>
          </button>
        </div>
      </div>
      </div>

      {isOtherCountriesOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-sm">
          <button type="button" aria-label="Close country picker" className="absolute inset-0" onClick={() => setIsOtherCountriesOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(18,28,48,0.98),rgba(10,14,26,0.99))] p-5 shadow-[0_28px_80px_rgba(4,8,24,0.38)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Extended destination picker</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Select another Schengen destination</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">Your choice is stored for this onboarding session so the financial audit, consular wording, and downstream packet routing start from the correct country profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOtherCountriesOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/10 text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[1rem] border border-white/14 bg-white/10 p-3 backdrop-blur-sm">
              <label className="flex items-center gap-3 rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 text-sm text-slate-100 focus-within:border-cyan-300/35">
                <Search className="h-4 w-4 text-cyan-100" />
                <input
                  value={countrySearchQuery}
                  onChange={(event) => setCountrySearchQuery(event.target.value)}
                  placeholder="Search Austria, Greece, Portugal, Sweden..."
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mt-4 grid max-h-[52vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredOtherCountries.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => handleDestinationSelect(country)}
                  className="flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3 text-left text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
                >
                  <CountryFlag country={country} className="h-4 w-6 rounded-[2px] shadow-sm" />
                  <span className="text-sm font-semibold tracking-[-0.01em]">{country}</span>
                </button>
              ))}
            </div>

            {filteredOtherCountries.length === 0 ? (
              <div className="mt-4 rounded-[1rem] border border-dashed border-white/14 bg-white/8 px-4 py-5 text-center text-sm text-slate-300">
                No matching country found. Try a broader search term.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}