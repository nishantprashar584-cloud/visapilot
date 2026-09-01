export const destinationSelectionStorageKey = "visapilot.selectedDestinationCountry";

export const featuredDestinationCountries = [
  "France",
  "Switzerland",
  "Germany",
  "Italy",
  "Spain",
  "Netherlands",
] as const;

export const allSchengenDestinationCountries = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
] as const;

export const nonFeaturedDestinationCountries = allSchengenDestinationCountries.filter(
  (country) => !featuredDestinationCountries.includes(country as (typeof featuredDestinationCountries)[number]),
);

export function normalizeDestinationSelection(destinationCountry?: string | null): string | null {
  const trimmedDestination = destinationCountry?.trim();

  if (!trimmedDestination) {
    return null;
  }

  const matchedDestination = allSchengenDestinationCountries.find(
    (country) => country.toLowerCase() === trimmedDestination.toLowerCase(),
  );

  return matchedDestination ?? null;
}

export function buildDestinationApplyHref(destinationCountry: string, previewMode = false): string {
  const params = new URLSearchParams();

  if (previewMode) {
    params.set("preview", "1");
  }

  params.set("destination", destinationCountry);

  return `/apply?${params.toString()}`;
}

export function storeSelectedDestination(destinationCountry: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(destinationSelectionStorageKey, destinationCountry);
}

export function readStoredDestination(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeDestinationSelection(window.sessionStorage.getItem(destinationSelectionStorageKey));
}