"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Hotel, Info, Plane, TrainFront } from "lucide-react";
import { publishItinerarySync } from "@/lib/applications/moduleSyncBus";
import { syncItineraryArtifacts } from "@/lib/applications/itinerarySync";
import type { ApplicantInfo, ItinerarySyncInput } from "@/types";

type TravelStudioTab = "timeline" | "flight" | "stay";

type TravelIntentEntry = ItinerarySyncInput["itineraryEntries"][number] & {
  id: string;
};

function createIsoDateSeries(arrivalDate: string, departureDate: string, stayDurationDays: number): string[] {
  const totalDays = Math.max(stayDurationDays, 1);
  const arrival = new Date(arrivalDate);

  if (Number.isNaN(arrival.getTime())) {
    return Array.from({ length: totalDays }, (_, index) => `Day ${index + 1}`);
  }

  const series: string[] = [];

  for (let index = 0; index < totalDays; index += 1) {
    const nextDate = new Date(arrival);
    nextDate.setDate(arrival.getDate() + index);
    series.push(nextDate.toISOString().slice(0, 10));
  }

  if (series.length === 0 && departureDate) {
    series.push(arrivalDate);
  }

  return series;
}

function buildDefaultEntries(applicant: ApplicantInfo): TravelIntentEntry[] {
  const itineraryDates = createIsoDateSeries(
    applicant.trip.arrivalDate,
    applicant.trip.departureDate,
    applicant.trip.stayDurationDays,
  );
  const cityPool = [
    applicant.trip.portOfEntry.trim(),
    applicant.trip.destinationCountry.trim(),
    ...(applicant.trip.transitCountries ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ].filter(Boolean);
  const primaryCity = cityPool[0] || applicant.trip.destinationCountry || "Destination";

  return itineraryDates.map((dateLabel, index) => ({
    id: `itinerary-${index + 1}`,
    dayLabel: `Day ${index + 1} · ${dateLabel}`,
    city: cityPool[Math.min(index, cityPool.length - 1)] || primaryCity,
    stayType: index === 0 ? "arrival stay" : "hotel stay",
    transitMode: index === 0
      ? `Flight arrival via ${applicant.trip.portOfEntry || applicant.trip.firstEntryCountry || applicant.trip.destinationCountry}`
      : "",
    accommodationReference: applicant.trip.hotelBookingReference || "",
  }));
}

function buildTransferLabel(currentCity: string, previousCity: string | null): string {
  if (!previousCity) {
    return "";
  }

  if (currentCity.trim().toLowerCase() === previousCity.trim().toLowerCase()) {
    return `Local stay in ${currentCity}`;
  }

  return `Inter-city rail transfer from ${previousCity} to ${currentCity}`;
}

function reorderEntries(entries: TravelIntentEntry[], fromIndex: number, toIndex: number): TravelIntentEntry[] {
  const nextEntries = [...entries];
  const [movedEntry] = nextEntries.splice(fromIndex, 1);
  nextEntries.splice(toIndex, 0, movedEntry);
  return nextEntries;
}

export function TravelIntentStudio({
  applicant,
  coverLetterDraft,
  supportingDocumentCount,
}: {
  applicant: ApplicantInfo;
  coverLetterDraft: string;
  supportingDocumentCount: number;
}) {
  const [activeTab, setActiveTab] = useState<TravelStudioTab>("timeline");
  const [isGuidanceDrawerOpen, setIsGuidanceDrawerOpen] = useState(false);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TravelIntentEntry[]>(() => buildDefaultEntries(applicant));

  useEffect(() => {
    setEntries((currentEntries) =>
      currentEntries.length > 0
        ? currentEntries
        : buildDefaultEntries(applicant),
    );
  }, [applicant]);

  const syncedResult = useMemo(() => {
    const normalizedEntries = entries.map((entry, index) => ({
      ...entry,
      stayType: entry.stayType.trim() || "hotel stay",
      city: entry.city.trim() || applicant.trip.destinationCountry || "Destination",
      transitMode: index === 0
        ? entry.transitMode?.trim() || `Flight arrival via ${applicant.trip.portOfEntry || applicant.trip.firstEntryCountry || applicant.trip.destinationCountry}`
        : buildTransferLabel(entry.city.trim() || applicant.trip.destinationCountry || "Destination", entries[index - 1]?.city ?? null),
    }));

    return syncItineraryArtifacts({
      coverLetterMarkdown: coverLetterDraft,
      itineraryEntries: normalizedEntries,
    });
  }, [applicant.trip.destinationCountry, applicant.trip.firstEntryCountry, applicant.trip.portOfEntry, coverLetterDraft, entries]);

  useEffect(() => {
    publishItinerarySync({
      itineraryEntries: entries,
      result: syncedResult,
    });
  }, [entries, syncedResult]);

  function updateEntry(entryId: string, updates: Partial<TravelIntentEntry>) {
    setEntries((currentEntries) => currentEntries.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry)));
  }

  function moveEntry(entryId: string, direction: -1 | 1) {
    setEntries((currentEntries) => {
      const currentIndex = currentEntries.findIndex((entry) => entry.id === entryId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentEntries.length) {
        return currentEntries;
      }

      return reorderEntries(currentEntries, currentIndex, nextIndex);
    });
  }

  return (
    <div className="rounded-[1.35rem] border border-white/14 bg-[linear-gradient(180deg,rgba(24,34,58,0.84),rgba(14,22,42,0.92))] p-5 shadow-[0_18px_44px_rgba(5,10,24,0.22)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
            <TrainFront className="h-3.5 w-3.5" />
            Module 3 of 6 · Tourist Route Studio
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">Day-by-day itinerary without booking noise</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
            Arrange the tourist trip timeline here. VisaPilot converts city changes into standard inter-city transfer text and silently updates the narrative engine in the next module.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGuidanceDrawerOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
        >
          <Info className="h-4 w-4" />
          Open travel guidance
        </button>
      </div>

      <div className="mt-5 flex flex-wrap rounded-[1rem] border border-white/14 bg-white/10 p-1 backdrop-blur-sm">
        {[
          { key: "timeline", label: "Timeline Studio", icon: TrainFront },
          { key: "flight", label: "Flight Route", icon: Plane },
          { key: "stay", label: "Hotel Stay Proof", icon: Hotel },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TravelStudioTab)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "timeline" ? (
        <div className="mt-5 space-y-3">
          {entries.map((entry, index) => {
            const transferLabel = index === 0
              ? entry.transitMode || `Flight arrival via ${applicant.trip.portOfEntry || applicant.trip.firstEntryCountry || applicant.trip.destinationCountry}`
              : buildTransferLabel(entry.city || applicant.trip.destinationCountry || "Destination", entries[index - 1]?.city ?? null);

            return (
              <div
                key={entry.id}
                draggable
                onDragStart={() => setDraggedEntryId(entry.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggedEntryId || draggedEntryId === entry.id) {
                    return;
                  }

                  setEntries((currentEntries) => {
                    const fromIndex = currentEntries.findIndex((item) => item.id === draggedEntryId);
                    const toIndex = currentEntries.findIndex((item) => item.id === entry.id);

                    if (fromIndex < 0 || toIndex < 0) {
                      return currentEntries;
                    }

                    return reorderEntries(currentEntries, fromIndex, toIndex);
                  });
                  setDraggedEntryId(null);
                }}
                className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/12 text-slate-100">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{entry.dayLabel}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-200">{transferLabel}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveEntry(entry.id, -1)}
                      disabled={index === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/10 text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Move ${entry.dayLabel} earlier`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEntry(entry.id, 1)}
                      disabled={index === entries.length - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/10 text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Move ${entry.dayLabel} later`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.8fr] xl:grid-cols-[1fr_0.8fr_1.1fr]">
                  <label className="block space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">City</span>
                    <input
                      value={entry.city}
                      onChange={(event) => updateEntry(entry.id, { city: event.target.value })}
                      className="w-full rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35"
                      placeholder="Paris"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Stay Type</span>
                    <select
                      value={entry.stayType}
                      onChange={(event) => updateEntry(entry.id, { stayType: event.target.value })}
                      className="w-full rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35"
                    >
                      <option value="arrival stay">Arrival stay</option>
                      <option value="hotel stay">Hotel stay</option>
                      <option value="host stay">Host stay</option>
                      <option value="day transfer">Day transfer</option>
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Accommodation Reference</span>
                    <input
                      value={entry.accommodationReference ?? ""}
                      onChange={(event) => updateEntry(entry.id, { accommodationReference: event.target.value })}
                      className="w-full rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35"
                      placeholder="Hotel voucher, Airbnb code, or host note"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {activeTab === "flight" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Flight intent anchor</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Route the cover letter around verifiable air travel only. No rail booking integration is required here, keeping the per-application cost ceiling intact.
            </p>
            <div className="mt-4 rounded-[0.9rem] border border-white/14 bg-white/10 p-4 text-sm leading-6 text-slate-200">
              Arrival: {applicant.trip.arrivalDate || "Pending"} via {applicant.trip.portOfEntry || applicant.trip.firstEntryCountry || "Pending entry point"}
              <br />
              Departure: {applicant.trip.departureDate || "Pending"}
            </div>
          </div>

          <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Transfer proof handling</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              City changes now become text-only transfer statements in the narrative. Optional train, bus, or car-rental proof can still be uploaded in the vault and will be appended to the travel section of the compiled packet.
            </p>
            <div className="mt-4 rounded-[0.9rem] border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50/90">
              Supporting travel proofs already queued: {supportingDocumentCount}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "stay" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Accommodation baseline</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">Current application stay note:</p>
            <div className="mt-3 rounded-[0.9rem] border border-white/14 bg-white/10 p-4 text-sm leading-6 text-slate-200">
              {applicant.trip.accommodations || "Add hotel or host stay details earlier in the wizard."}
            </div>
          </div>

          <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live gap check</p>
            <div className="mt-3 space-y-3">
              {syncedResult.accommodationGapWarnings.length > 0 ? syncedResult.accommodationGapWarnings.map((warning) => (
                <div key={warning} className="rounded-[0.9rem] border border-amber-300/15 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50/90">
                  {warning}
                </div>
              )) : (
                <div className="rounded-[0.9rem] border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50/90">
                  Each day currently carries an accommodation reference.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isGuidanceDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <button type="button" aria-label="Close travel guidance" className="flex-1" onClick={() => setIsGuidanceDrawerOpen(false)} />
          <div className="relative h-full w-full max-w-[420px] overflow-y-auto border-l border-white/10 bg-[#0b0d11] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Travel guidance</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Narrative sync output</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Review the transfer statements and accommodation gaps that are being pushed quietly into the cover-letter engine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuidanceDrawerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/10 text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[1rem] border border-sky-300/15 bg-sky-500/10 p-4 text-sm text-sky-50">
              <p className="font-semibold">Transfer statements</p>
              <div className="mt-3 space-y-2 text-sky-50/90">
                {syncedResult.transitLegRequirements.length > 0 ? syncedResult.transitLegRequirements.map((item) => (
                  <p key={item}>{item}</p>
                )) : <p>No inter-city proof items are currently required.</p>}
              </div>
            </div>

            <div className="mt-5 rounded-[1rem] border border-white/14 bg-white/10 p-4 text-sm text-slate-100 backdrop-blur-sm">
              <p className="font-semibold text-white">Accommodation gaps</p>
              <div className="mt-3 space-y-2 leading-6 text-slate-200">
                {syncedResult.accommodationGapWarnings.length > 0 ? syncedResult.accommodationGapWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                )) : <p>No missing accommodation references detected.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}