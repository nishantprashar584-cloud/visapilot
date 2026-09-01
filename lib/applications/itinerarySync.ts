import type { ItinerarySyncInput, ItinerarySyncResult } from "@/types";

export function syncItineraryArtifacts(input: ItinerarySyncInput): ItinerarySyncResult {
  const itineraryNarrative = input.itineraryEntries
    .map((entry, index) => `${index + 1}. ${entry.dayLabel}: ${entry.city} via ${entry.transitMode ?? "local transit"} staying at ${entry.stayType}${entry.accommodationReference ? ` (${entry.accommodationReference})` : ""}.`)
    .join("\n");

  const accommodationGapWarnings = input.itineraryEntries
    .filter((entry) => !entry.accommodationReference?.trim())
    .map((entry) => `Missing accommodation reference for ${entry.dayLabel} in ${entry.city}.`);

  const transitLegRequirements = input.itineraryEntries
    .filter((entry) => Boolean(entry.transitMode?.trim()))
    .map((entry) => `${entry.city}: attach ${entry.transitMode} ticket or reservation evidence.`);

  return {
    coverLetterMarkdown: input.coverLetterMarkdown,
    itineraryNarrative,
    accommodationGapWarnings,
    transitLegRequirements,
  };
}