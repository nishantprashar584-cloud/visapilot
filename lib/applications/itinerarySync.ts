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

  const coverLetterMarkdown = input.coverLetterMarkdown.includes("## Itinerary Matrix")
    ? input.coverLetterMarkdown.replace(/## Itinerary Matrix[\s\S]*$/m, `## Itinerary Matrix\n${itineraryNarrative}`)
    : `${input.coverLetterMarkdown.trim()}\n\n## Itinerary Matrix\n${itineraryNarrative}`;

  return {
    coverLetterMarkdown,
    accommodationGapWarnings,
    transitLegRequirements,
  };
}