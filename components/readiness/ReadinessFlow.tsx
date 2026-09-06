"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeHelp,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Compass,
  FileCheck2,
  Flag,
  House,
  MapPinned,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { ApplicationHealthCard } from "@/components/intelligence/ApplicationHealthCard";
import { ApplicationJourney } from "@/components/intelligence/ApplicationJourney";
import { CaseSnapshotCard } from "@/components/intelligence/CaseSnapshotCard";
import { NextBestActionCard } from "@/components/intelligence/NextBestActionCard";
import { allSchengenDestinationCountries, buildDestinationApplyHref, storeSelectedDestination } from "@/lib/destinationSelection";
import { applicationDraftStorageKey, readinessDraftStorageKey } from "@/lib/applications/draftStorage";
import { mergeApplicantDraft } from "@/lib/applications/schema";
import {
  analyzeReadinessCase,
  buildApplicantDraftFromReadiness,
  createPreviewReadinessDraft,
  createReadinessDraft,
} from "@/lib/case-intelligence/readiness";
import { getApplicationHealth, getApplicationJourney, getCaseSnapshot, getNextBestAction } from "@/lib/applications/uxState";
import { employmentStatusOptions } from "@/config/schengen-rules";
import type {
  CaseFinding,
  EmploymentStatus,
  HomeTieStrength,
  ReadinessAccommodationStatus,
  ReadinessDraft,
  ReadinessFundingArrangement,
  ReadinessItineraryStatus,
  ReadinessTravelerProfile,
  TravelGroup,
  TravelPurpose,
} from "@/types";

const travelGroupCards: Array<{ key: TravelGroup; label: string; description: string }> = [
  { key: "solo", label: "Solo", description: "One traveller preparing an individual Schengen case." },
  { key: "couple", label: "Couple", description: "Two adults travelling together with joint consistency checks." },
  { key: "family", label: "Family", description: "Adults and minors travelling together with family-specific review." },
];

const readinessSteps = [
  { id: "group", title: "Who is travelling?" },
  { id: "trip", title: "Trip basics" },
  { id: "profiles", title: "Traveller details" },
  { id: "result", title: "Your readiness" },
] as const;

const travelPurposeOptions: Array<{ label: string; value: TravelPurpose }> = [
  { label: "Tourism / leisure", value: "tourism" },
  { label: "Business", value: "business" },
  { label: "Family visit", value: "family_visit" },
  { label: "Study", value: "study" },
  { label: "Other", value: "other" },
];

const ageOptions = [
  { label: "Minor", value: "minor" },
  { label: "18-24", value: "18_24" },
  { label: "25-39", value: "25_39" },
  { label: "40-59", value: "40_59" },
  { label: "60+", value: "60_plus" },
] as const;

const fundingOptions: Array<{ label: string; value: ReadinessFundingArrangement }> = [
  { label: "Self-funded", value: "self_funded" },
  { label: "Primary traveller funds the group", value: "primary_sponsors_group" },
  { label: "Partner funds the group", value: "partner_sponsors_group" },
  { label: "Adults share the costs", value: "shared_between_adults" },
  { label: "Parent funds the trip", value: "parent_sponsored" },
  { label: "Other sponsor", value: "other_sponsor" },
];

const accommodationOptions: Array<{ label: string; value: ReadinessAccommodationStatus }> = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Partly planned", value: "partial" },
  { label: "Not arranged yet", value: "pending" },
];

const itineraryOptions: Array<{ label: string; value: ReadinessItineraryStatus }> = [
  { label: "Clear", value: "clear" },
  { label: "Partly planned", value: "partial" },
  { label: "Unclear", value: "unclear" },
];

const homeTieOptions: Array<{ label: string; value: HomeTieStrength }> = [
  { label: "Clear", value: "clear" },
  { label: "Partly clear", value: "partial" },
  { label: "Needs work", value: "unclear" },
];

function updateTraveler(travelers: ReadinessTravelerProfile[], travelerId: string, updates: Partial<ReadinessTravelerProfile>) {
  return travelers.map((traveler) => (traveler.id === travelerId ? { ...traveler, ...updates } : traveler));
}

function whyWeAsk(message: string) {
  return (
    <details className="mt-2 rounded-[0.95rem] border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-300">
      <summary className="cursor-pointer list-none font-medium text-cyan-100">Why do we ask this?</summary>
      <p className="mt-2 leading-5">{message}</p>
    </details>
  );
}

function dimensionClass(score: number) {
  if (score >= 85) {
    return "border-emerald-300/24 bg-emerald-400/12";
  }

  if (score >= 60) {
    return "border-cyan-300/24 bg-cyan-400/12";
  }

  return "border-amber-300/24 bg-amber-400/12";
}

function assumptionClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "border-emerald-300/24 bg-emerald-400/12 text-emerald-50";
    case "ASSUMED":
      return "border-cyan-300/24 bg-cyan-400/12 text-cyan-50";
    default:
      return "border-amber-300/24 bg-amber-400/12 text-amber-50";
  }
}

function findingTone(finding: CaseFinding) {
  if (finding.severity === "BLOCKING") {
    return {
      label: "Action required",
      className: "border-rose-300/30 bg-rose-400/12 text-rose-50",
    };
  }

  if (finding.severity === "WARNING" || finding.severity === "ATTENTION") {
    return {
      label: "Review",
      className: "border-amber-300/28 bg-amber-400/12 text-amber-50",
    };
  }

  return {
    label: "Ready",
    className: "border-emerald-300/24 bg-emerald-400/12 text-emerald-50",
  };
}

function formatRoleLabel(role: ReadinessTravelerProfile["role"]): string {
  switch (role) {
    case "PRIMARY":
      return "Primary applicant";
    case "PARTNER":
      return "Partner";
    case "ADULT":
      return "Adult";
    case "MINOR":
      return "Child";
    default:
      return role;
  }
}

function calculateTravelerReadinessScore(traveler: ReadinessTravelerProfile): number | null {
  if (traveler.role === "MINOR" && !traveler.passportAvailable) {
    return null;
  }

  let score = 100;

  if (!traveler.displayName.trim()) {
    score -= 18;
  }

  if (!traveler.passportAvailable) {
    score -= 26;
  }

  if (traveler.previousRefusal) {
    score -= 14;
  }

  return Math.max(48, score);
}

function getFindingStepIndex(finding: CaseFinding): number {
  if (finding.category === "TRAVEL" || finding.category === "ITINERARY" || finding.category === "ACCOMMODATION" || finding.category === "FINANCIAL" || finding.category === "SPONSORSHIP" || finding.category === "APPLICATION_CHANNEL") {
    return 1;
  }

  return 2;
}

function sponsorPrompt(arrangement: ReadinessFundingArrangement): string {
  switch (arrangement) {
    case "primary_sponsors_group":
      return "Have you already identified relationship proof and sponsor documents for the primary traveller?";
    case "partner_sponsors_group":
      return "Have you already identified relationship proof and sponsor documents for the partner?";
    case "parent_sponsored":
      return "Have you already identified the parent sponsorship evidence and relationship proof?";
    case "other_sponsor":
      return "Have you already identified the external sponsor documents and explanation?";
    default:
      return "Have you already identified the documents that explain who is paying for the trip?";
  }
}

function sponsorExplanation(arrangement: ReadinessFundingArrangement): string {
  switch (arrangement) {
    case "self_funded":
    case "shared_between_adults":
      return "We ask about funding because the application should show a coherent money trail for the travellers who are paying for the trip.";
    default:
      return "We ask about sponsorship because the application should make it easy to understand who is paying, how they are connected to the traveller, and which documents support that story.";
  }
}

export function ReadinessFlow({ previewMode = false, initialGroup = "solo" }: { previewMode?: boolean; initialGroup?: TravelGroup }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ReadinessDraft>(() => (
    previewMode ? createPreviewReadinessDraft(initialGroup) : createReadinessDraft(initialGroup)
  ));
  const [currentStep, setCurrentStep] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const assessment = useMemo(() => analyzeReadinessCase(draft), [draft]);
  const paidApplicantDraft = useMemo(() => mergeApplicantDraft(buildApplicantDraftFromReadiness(draft)), [draft]);
  const readinessHealth = useMemo(() => getApplicationHealth({ status: "draft", applicant: paidApplicantDraft, readinessAssessment: assessment }), [assessment, paidApplicantDraft]);
  const readinessJourney = useMemo(() => getApplicationJourney({ status: "draft", applicant: paidApplicantDraft, readinessAssessment: assessment }), [assessment, paidApplicantDraft]);
  const readinessSnapshot = useMemo(() => getCaseSnapshot(paidApplicantDraft, "draft", assessment), [assessment, paidApplicantDraft]);
  const readinessAction = useMemo(() => getNextBestAction({ status: "draft", applicant: paidApplicantDraft, readinessAssessment: assessment }), [assessment, paidApplicantDraft]);
  const primaryTraveller = draft.travelers[0];
  const canPreparePaid = draft.trip.purpose === "tourism" && draft.trip.destinationCountry.trim().length > 0;
  const familyAdults = draft.travelers.filter((traveler) => traveler.role === "PRIMARY" || traveler.role === "PARTNER" || traveler.role === "ADULT").length;
  const familyMinors = draft.travelers.filter((traveler) => traveler.role === "MINOR").length;
  const needsSponsorFollowUp = draft.sharedContext.fundingArrangement !== "self_funded" && draft.sharedContext.fundingArrangement !== "shared_between_adults";
  const headline = assessment.actionRequiredCount > 0
    ? "Your application needs attention before it looks preparation-ready"
    : "Your application looks well prepared so far";

  function replaceDraft(nextGroup: TravelGroup, familyOptions?: { adultCount?: number; minorCount?: number }) {
    setDraft(previewMode ? createPreviewReadinessDraft(nextGroup) : createReadinessDraft(nextGroup, familyOptions));
  }

  function updateTrip<Field extends keyof ReadinessDraft["trip"]>(field: Field, value: ReadinessDraft["trip"][Field]) {
    setDraft((current) => ({
      ...current,
      trip: {
        ...current.trip,
        [field]: value,
      },
    }));
  }

  function updateShared<Field extends keyof ReadinessDraft["sharedContext"]>(field: Field, value: ReadinessDraft["sharedContext"][Field]) {
    setDraft((current) => ({
      ...current,
      sharedContext: {
        ...current.sharedContext,
        [field]: value,
      },
    }));
  }

  function handleFamilyComposition(adultCount: number, minorCount: number) {
    const nextDraft = createReadinessDraft("family", { adultCount, minorCount });
    nextDraft.trip = draft.trip;
    nextDraft.sharedContext = {
      ...nextDraft.sharedContext,
      ...draft.sharedContext,
      minorConsentStatus: minorCount > 0 ? draft.sharedContext.minorConsentStatus : "not_applicable",
    };
    nextDraft.travelers = nextDraft.travelers.map((traveler, index) => {
      const existingTraveler = draft.travelers[index];
      return existingTraveler
        ? {
            ...traveler,
            ...existingTraveler,
            role: traveler.role,
          }
        : traveler;
    });
    setDraft(nextDraft);
  }

  function handlePreparePaid() {
    setIsPreparing(true);

    try {
      const applicantDraft = buildApplicantDraftFromReadiness(draft);
      window.localStorage.setItem(readinessDraftStorageKey, JSON.stringify(draft));
      window.localStorage.setItem(applicationDraftStorageKey, JSON.stringify(applicantDraft));
      storeSelectedDestination(draft.trip.destinationCountry);
      router.push(buildDestinationApplyHref(draft.trip.destinationCountry));
    } finally {
      setIsPreparing(false);
    }
  }

  function handleNextStep() {
    setCurrentStep((value) => Math.min(value + 1, readinessSteps.length - 1));
  }

  function handlePreviousStep() {
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  function jumpToStep(stepIndex: number) {
    setCurrentStep(stepIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.7rem] border border-white/12 bg-[linear-gradient(145deg,rgba(20,31,53,0.96),rgba(12,19,36,0.98)_45%,rgba(30,41,82,0.92))] p-6 shadow-[0_26px_90px_rgba(4,8,24,0.34)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="vp-badge vp-badge-travel">
              <Compass className="h-3.5 w-3.5" />
              Free readiness check
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Let&apos;s check how prepared your application looks.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
              VisaPilot guides you through one calm section at a time, then explains what looks strong, what needs review, and what should happen next.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              {readinessSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => jumpToStep(index)}
                  className={index === currentStep ? "vp-badge vp-badge-brand" : index < currentStep ? "vp-badge vp-badge-success" : "vp-badge vp-badge-neutral"}
                  aria-label={step.title}
                >
                  {step.title}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-white/12 bg-white/8 px-4 py-4 text-sm text-slate-200 lg:max-w-sm">
            <p className="font-semibold text-white">Preparation guidance</p>
            <p className="mt-2 leading-6">{assessment.disclaimer}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {currentStep === 0 ? (
            <div className="glass-panel p-5 sm:p-6">
              <p className="eyebrow">Step 1</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Who is travelling?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Start with the case shape. VisaPilot will change the rest of the questions based on whether this is a solo, couple, or family case.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {travelGroupCards.map((card) => {
                  const active = draft.travelGroup === card.key;

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => replaceDraft(card.key)}
                      className={active ? "rounded-[1.25rem] border border-blue-300/35 bg-blue-400/12 p-5 text-left text-blue-50 shadow-[0_18px_34px_rgba(37,99,235,0.16)]" : "rounded-[1.25rem] border border-white/14 bg-white/8 p-5 text-left text-slate-100 transition hover:border-cyan-300/24 hover:bg-white/10"}
                      aria-pressed={active}
                      aria-label={`${card.label} travel group`}
                    >
                      <div className="flex items-center gap-3">
                        {card.key === "solo" ? <User className="h-5 w-5 text-cyan-100" /> : <Users className="h-5 w-5 text-cyan-100" />}
                        <p className="text-base font-semibold text-white">{card.label}</p>
                      </div>
                      <p className="mt-3 text-sm leading-6">{card.description}</p>
                    </button>
                  );
                })}
              </div>

              {draft.travelGroup === "family" ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Adults travelling</span>
                    <select value={String(familyAdults)} onChange={(event) => handleFamilyComposition(Number(event.target.value), familyMinors)} className="vp-select">
                      <option value="1">1 adult</option>
                      <option value="2">2 adults</option>
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Children travelling</span>
                    <select value={String(familyMinors)} onChange={(event) => handleFamilyComposition(familyAdults, Number(event.target.value))} className="vp-select">
                      <option value="1">1 child</option>
                      <option value="2">2 children</option>
                      <option value="3">3 children</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="glass-panel p-5 sm:p-6">
              <p className="eyebrow">Step 2</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Only the trip details needed for a useful first pass</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Destination country</span>
                  <input
                    list="readiness-destinations"
                    value={draft.trip.destinationCountry}
                    onChange={(event) => updateTrip("destinationCountry", event.target.value)}
                    className="vp-input w-full px-4 py-3"
                    placeholder="France"
                  />
                  <datalist id="readiness-destinations">
                    {allSchengenDestinationCountries.map((country) => (
                      <option key={country} value={country} />
                    ))}
                  </datalist>
                  {whyWeAsk("VisaPilot uses the destination to check the consular path, accommodation expectations, and country-specific preparation rules.")}
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Travel purpose</span>
                  <select value={draft.trip.purpose} onChange={(event) => updateTrip("purpose", event.target.value as TravelPurpose)} className="vp-select">
                    {travelPurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">How will this trip be funded?</span>
                  <select value={draft.sharedContext.fundingArrangement} onChange={(event) => updateShared("fundingArrangement", event.target.value as ReadinessFundingArrangement)} className="vp-select">
                    {fundingOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {whyWeAsk(sponsorExplanation(draft.sharedContext.fundingArrangement))}
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Arrival date</span>
                  <input type="date" value={draft.trip.arrivalDate} onChange={(event) => updateTrip("arrivalDate", event.target.value)} className="vp-input w-full px-4 py-3" />
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Departure date</span>
                  <input type="date" value={draft.trip.departureDate} onChange={(event) => updateTrip("departureDate", event.target.value)} className="vp-input w-full px-4 py-3" />
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Accommodation status</span>
                  <select value={draft.sharedContext.accommodationStatus} onChange={(event) => updateShared("accommodationStatus", event.target.value as ReadinessAccommodationStatus)} className="vp-select">
                    {accommodationOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Itinerary clarity</span>
                  <select value={draft.sharedContext.itineraryStatus} onChange={(event) => updateShared("itineraryStatus", event.target.value as ReadinessItineraryStatus)} className="vp-select">
                    {itineraryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100 md:col-span-2">
                  <input type="checkbox" checked={draft.sharedContext.hasFinancialEvidence} onChange={(event) => updateShared("hasFinancialEvidence", event.target.checked)} />
                  {needsSponsorFollowUp ? "Sponsor financial evidence is already available" : "Financial evidence is already available"}
                </label>
                {needsSponsorFollowUp ? (
                  <label className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100 md:col-span-2">
                    <input type="checkbox" checked={draft.sharedContext.hasSponsorRelationshipEvidence} onChange={(event) => updateShared("hasSponsorRelationshipEvidence", event.target.checked)} />
                    {sponsorPrompt(draft.sharedContext.fundingArrangement)}
                  </label>
                ) : null}
                <label className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100 md:col-span-2">
                  <input type="checkbox" checked={draft.sharedContext.hasAccommodationEvidence} onChange={(event) => updateShared("hasAccommodationEvidence", event.target.checked)} />
                  Accommodation evidence is already available
                </label>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <>
              <div className="glass-panel p-5 sm:p-6">
                <p className="eyebrow">Step 3</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Traveller details</h2>
                <p className="mt-2 text-sm leading-6 text-slate-200">Capture only the facts that affect the case story. VisaPilot should understand the group, not force every traveller through the same generic form.</p>
                <div className="mt-5 space-y-4">
                  {draft.travelers.map((traveler) => (
                    <div key={traveler.id} className="rounded-[1.25rem] border border-white/14 bg-white/8 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-50">
                          <Users className="h-3.5 w-3.5" />
                          {formatRoleLabel(traveler.role)}
                        </span>
                        {traveler.relationshipLabel ? <span className="text-sm text-slate-300">{traveler.relationshipLabel}</span> : null}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Name</span>
                          <input
                            value={traveler.displayName}
                            onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { displayName: event.target.value }) }))}
                            className="vp-input w-full px-4 py-3"
                            placeholder={traveler.role === "MINOR" ? "Child name" : "Traveller name"}
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Nationality</span>
                          <input
                            value={traveler.nationality}
                            onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { nationality: event.target.value }) }))}
                            className="vp-input w-full px-4 py-3"
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Country of residence</span>
                          <input
                            value={traveler.residenceCountry}
                            onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { residenceCountry: event.target.value }) }))}
                            className="vp-input w-full px-4 py-3"
                          />
                        </label>
                        <label className="block space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Age group</span>
                          <select
                            value={traveler.ageGroup}
                            onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { ageGroup: event.target.value as ReadinessTravelerProfile["ageGroup"] }) }))}
                            className="vp-select"
                          >
                            {ageOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        {traveler.role !== "MINOR" ? (
                          <label className="block space-y-2 md:col-span-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Employment or status</span>
                            <select
                              value={traveler.employmentStatus}
                              onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { employmentStatus: event.target.value as EmploymentStatus }) }))}
                              className="vp-select"
                            >
                              {employmentStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            {whyWeAsk("We ask about work or personal status because employment, study, retirement, homemaker status, or other home ties can help explain the traveller's overall situation. These are not automatic red flags.")}
                          </label>
                        ) : null}
                        <label className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100">
                          <input type="checkbox" checked={traveler.passportAvailable} onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { passportAvailable: event.target.checked }) }))} />
                          Passport available
                        </label>
                        <label className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100">
                          <input type="checkbox" checked={traveler.previousSchengenVisa} onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { previousSchengenVisa: event.target.checked }) }))} />
                          Previous Schengen visa
                        </label>
                        <label className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100 md:col-span-2">
                          <input type="checkbox" checked={traveler.previousRefusal} onChange={(event) => setDraft((current) => ({ ...current, travelers: updateTraveler(current.travelers, traveler.id, { previousRefusal: event.target.checked }) }))} />
                          Previous visa refusal to review
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {draft.travelGroup !== "solo" ? (
                <div className="glass-panel p-5 sm:p-6">
                  <p className="eyebrow">Shared Story</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Make the joint case easy to understand</h2>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {[
                      { key: "sameDestination", label: "Same destination" },
                      { key: "sameDates", label: "Same dates" },
                      { key: "sameAccommodation", label: "Same accommodation" },
                      { key: "sameItinerary", label: "Same itinerary" },
                    ].map((item) => (
                      <label key={item.key} className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm text-slate-100">
                        <input
                          type="checkbox"
                          checked={draft.sharedContext[item.key as keyof Pick<ReadinessDraft["sharedContext"], "sameDestination" | "sameDates" | "sameAccommodation" | "sameItinerary">] as boolean}
                          onChange={(event) => updateShared(item.key as "sameDestination" | "sameDates" | "sameAccommodation" | "sameItinerary", event.target.checked)}
                        />
                        {item.label}
                      </label>
                    ))}
                    <label className="block space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Home ties strength</span>
                      <select value={draft.sharedContext.homeTieStrength} onChange={(event) => updateShared("homeTieStrength", event.target.value as HomeTieStrength)} className="vp-select">
                        {homeTieOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    {draft.travelGroup === "family" ? (
                      <label className="block space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Minor documentation</span>
                        <select value={draft.sharedContext.minorConsentStatus} onChange={(event) => updateShared("minorConsentStatus", event.target.value as ReadinessDraft["sharedContext"]["minorConsentStatus"])} className="vp-select">
                          <option value="available">Available</option>
                          <option value="needs_review">Needs review</option>
                          <option value="missing">Missing</option>
                        </select>
                      </label>
                    ) : null}
                    <label className="block space-y-2 md:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Anything VisaPilot should know?</span>
                      <textarea
                        rows={4}
                        value={draft.sharedContext.notes ?? ""}
                        onChange={(event) => updateShared("notes", event.target.value)}
                        className="vp-input w-full px-4 py-3"
                        placeholder="Example: one spouse is funding both travellers, or one parent is travelling with the child."
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <ApplicationHealthCard health={readinessHealth} score={assessment.score} title="Your readiness" />
                <NextBestActionCard action={readinessAction} href="#readiness-findings" secondaryHref="#continue-to-application" secondaryLabel="Continue to application" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <ApplicationJourney stages={readinessJourney} />
                <CaseSnapshotCard
                  items={readinessSnapshot}
                  title="What VisaPilot understood"
                  description={headline}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="glass-panel p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-100" />
                    <p className="text-sm font-semibold text-white">Case snapshot</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"><Flag className="h-3.5 w-3.5" /> Destination</p>
                      <p className="mt-2 text-sm font-semibold text-white">{assessment.snapshot.destinationLabel}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"><CalendarDays className="h-3.5 w-3.5" /> Dates</p>
                      <p className="mt-2 text-sm font-semibold text-white">{assessment.snapshot.travelDateLabel}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"><Users className="h-3.5 w-3.5" /> Travellers</p>
                      <p className="mt-2 text-sm font-semibold text-white">{assessment.snapshot.travelerLabel}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"><Wallet className="h-3.5 w-3.5" /> Funding</p>
                      <p className="mt-2 text-sm font-semibold text-white">{assessment.snapshot.fundingLabel}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4 sm:col-span-2">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"><House className="h-3.5 w-3.5" /> Accommodation</p>
                      <p className="mt-2 text-sm font-semibold text-white">{assessment.snapshot.accommodationLabel}</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-[1rem] border border-cyan-300/24 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-50">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">What VisaPilot understood</p>
                    <p className="mt-2">{assessment.snapshot.narrative}</p>
                  </div>
                </div>

                <div className="glass-panel p-5 sm:p-6">
                  <p className="text-sm font-semibold text-white">Based on what you have told us</p>
                  <div className="mt-4 space-y-3">
                    {assessment.assumptions.map((assumption) => (
                      <div key={assumption.id} className="flex items-start justify-between gap-3 rounded-[1rem] border border-white/12 bg-white/8 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{assumption.label}</p>
                          <p className="mt-1 text-sm text-slate-300">{assumption.value}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${assumptionClass(assumption.status)}`}>
                          {assumption.status === "CONFIRMED" ? "Ready" : assumption.status === "ASSUMED" ? "Assumed" : "Needs input"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">Some information is still missing, so this assessment may change as you provide more details.</p>
                </div>
              </div>

              {draft.travelGroup !== "solo" ? (
                <div className="glass-panel p-5 sm:p-6">
                  <p className="eyebrow">Shared Case View</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Your {draft.travelGroup === "couple" ? "Couple" : "Family"} assessment</h3>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {draft.travelers.map((traveler) => {
                      const travelerScore = calculateTravelerReadinessScore(traveler);
                      return (
                        <div key={traveler.id} className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
                          <p className="text-sm font-semibold text-white">{traveler.displayName.trim() || formatRoleLabel(traveler.role)}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{formatRoleLabel(traveler.role)}</p>
                          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{travelerScore ?? "-"}</p>
                          <p className="mt-2 text-sm text-slate-300">{traveler.passportAvailable ? "Passport confirmed" : "Passport still needs review"}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {[
                      { label: "Same destination", value: draft.sharedContext.sameDestination },
                      { label: "Same dates", value: draft.sharedContext.sameDates },
                      { label: "Same accommodation", value: draft.sharedContext.sameAccommodation },
                      { label: draft.travelGroup === "family" ? "Minor documents" : "Funding identified", value: draft.travelGroup === "family" ? draft.sharedContext.minorConsentStatus === "available" : draft.sharedContext.hasSponsorRelationshipEvidence || !needsSponsorFollowUp },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1rem] border border-white/12 bg-white/8 px-4 py-3 text-sm text-slate-100">
                        <span className={item.value ? "text-emerald-200" : "text-amber-200"}>{item.value ? "✓" : "!"}</span>
                        <span className="ml-2">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div id="readiness-findings" className="glass-panel p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  <p className="text-sm font-semibold text-white">Ready</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                  {(assessment.readyItems.length > 0 ? assessment.readyItems : ["Add a little more detail and VisaPilot will show what already looks strong."]).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-200" />
                  <p className="text-sm font-semibold text-white">Review</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                  {(assessment.areasToReview.length > 0 ? assessment.areasToReview : ["No review items yet."]).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center gap-2">
                  <CircleAlert className="h-4 w-4 text-rose-200" />
                  <p className="text-sm font-semibold text-white">Action required</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                  {(assessment.findings.filter((finding) => finding.severity === "BLOCKING").map((finding) => finding.title).length > 0
                    ? assessment.findings.filter((finding) => finding.severity === "BLOCKING").map((finding) => finding.title)
                    : ["No blocking items from this first-pass assessment."]).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="glass-panel p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <BadgeHelp className="h-4 w-4 text-cyan-100" />
                  <p className="text-sm font-semibold text-white">Show me why</p>
                </div>
                <div className="mt-4 space-y-3">
                  {assessment.findings.map((finding) => {
                    const tone = findingTone(finding);

                    return (
                      <div key={finding.id} className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.className}`}>
                              {tone.label}
                            </span>
                            <p className="mt-3 text-sm font-semibold text-white">{finding.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{finding.id}</p>
                          </div>
                          <button type="button" onClick={() => jumpToStep(getFindingStepIndex(finding))} className="vp-btn vp-btn-secondary px-3 py-1.5 text-xs uppercase tracking-[0.16em]">
                            {finding.category === "FINANCIAL" ? "Review financials" : finding.category === "ACCOMMODATION" ? "Review accommodation" : "Fix this"}
                          </button>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-200">{finding.explanation}</p>
                        {finding.whatWeKnow.length > 0 ? (
                          <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">What we know</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-200">
                              {finding.whatWeKnow.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {finding.whatWeNeed.length > 0 ? (
                          <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">What we still need</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-200">
                              {finding.whatWeNeed.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <p className="mt-3 text-sm font-medium text-cyan-100">What to do: {finding.recommendedAction}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className="sticky bottom-3 z-20 flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-[rgba(8,17,31,0.92)] px-3 py-3 shadow-[0_18px_34px_rgba(4,10,24,0.28)] backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
            <button type="button" onClick={handlePreviousStep} disabled={currentStep === 0} className="vp-btn vp-btn-secondary disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {currentStep < readinessSteps.length - 1 ? (
              <button type="button" onClick={handleNextStep} className="vp-btn vp-btn-primary px-5">
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handlePreparePaid} disabled={!canPreparePaid || isPreparing} className="vp-btn vp-btn-primary px-5 disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowRight className="h-4 w-4" />
                {isPreparing ? "Preparing your application..." : "Prepare My Application"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="glass-panel p-5 sm:p-6">
            <p className="eyebrow">Live Case Snapshot</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.04em] text-white">{assessment.snapshot.destinationLabel}</p>
                <p className="mt-2 text-sm font-semibold text-cyan-100">{assessment.snapshot.travelDateLabel}</p>
              </div>
              <div className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                {assessment.score}/100
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4 text-sm text-slate-100">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><Users className="h-3.5 w-3.5" /> Travellers</p>
                <p className="mt-2 font-semibold text-white">{assessment.snapshot.travelerLabel}</p>
              </div>
              <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4 text-sm text-slate-100">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><Wallet className="h-3.5 w-3.5" /> Funding</p>
                <p className="mt-2 font-semibold text-white">{assessment.snapshot.fundingLabel}</p>
              </div>
              <div className="rounded-[1rem] border border-white/12 bg-white/8 p-4 text-sm text-slate-100">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><MapPinned className="h-3.5 w-3.5" /> Next best action</p>
                <p className="mt-2 font-semibold text-white">{assessment.nextBestAction}</p>
              </div>
            </div>
            <p className="mt-4 rounded-[1rem] border border-white/14 bg-white/8 px-4 py-3 text-sm leading-6 text-slate-300">{assessment.snapshot.narrative}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {assessment.dimensions.map((dimension) => (
              <div key={dimension.id} className={`rounded-[1rem] border p-4 text-slate-100 ${dimensionClass(dimension.score)}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{dimension.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{dimension.score}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{dimension.summary}</p>
              </div>
            ))}
          </div>

          <div className="glass-panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-cyan-200" />
              <p className="text-sm font-semibold text-white">What changes the outcome most</p>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
              {(assessment.recommendedActions.length > 0 ? assessment.recommendedActions : ["Continue to the next step and complete the missing details."]).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div id="continue-to-application" className="rounded-[1.4rem] border border-emerald-300/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(17,24,39,0.22))] p-5 text-emerald-50 shadow-[0_0_38px_rgba(16,185,129,0.12)] sm:p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              Free to paid handoff
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">Want VisaPilot to prepare the complete application?</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-50/90">We already captured the basic case shape for {primaryTraveller?.displayName?.trim() || "your primary traveller"}. The paid flow will continue from there and focus on the missing details, supporting evidence, document analysis, checklist generation, cover letter drafting, and packet assembly.</p>
            <div className="mt-4 grid gap-2 text-sm text-emerald-50/90 sm:grid-cols-2">
              {[
                "Travel group",
                "Destination",
                "Dates",
                "Funding",
                "Basic applicant information",
                "Initial readiness context",
              ].map((item) => (
                <div key={item} className="rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3">{item}</div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-sm text-emerald-50/90 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3">Self-Guided adds AI document scanning, case checks, checklisting, packet generation, Smart Form Helper, and interview prep.</div>
              <div className="rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3">Done-For-You adds human document review, managed portal filing, secure OTP coordination, appointment workflow, and the Action Center.</div>
            </div>
            {!canPreparePaid ? (
              <p className="mt-4 text-sm leading-6 text-amber-100">The current paid flow in this repository is tourism-first. Keep this readiness result as guidance, but verify the visa route before continuing if your purpose is not tourism.</p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handlePreparePaid} disabled={!canPreparePaid || isPreparing} className="vp-btn vp-btn-primary px-5 disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowRight className="h-4 w-4" />
                {isPreparing ? "Preparing your application..." : "Prepare My Application"}
              </button>
              <Link href="/pricing" className="vp-btn vp-btn-secondary px-5 text-emerald-50">
                Compare paid plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}