"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clock3, Lock, ShieldCheck } from "lucide-react";
import { calculateInclusiveGstBreakdown } from "@/lib/payments/gst";
import { getDefaultServiceTrack, getPricingMatrixForTrack, serviceTrackLabel } from "@/lib/payments/tiers";
import type { PricingTier, ServiceTrack } from "@/types";

type FeatureItem = {
  highlight: string;
  detail: string;
};

const trackMarketingCopy: Record<ServiceTrack, string> = {
  APPLY_MYSELF: "We give you the smart tools and print-ready files. You fill the forms and book the slot.",
  VIP_CONCIERGE: "Our human experts verify your documents, fill the official forms, and book your VFS slot.",
};

const planAudienceCopy: Record<PricingTier, string> = {
  solo: "For 1 person traveling alone.",
  couple: "For 2 adults traveling on the same trip.",
  family: "For up to 4 family members traveling together.",
};

const planSizeCopy: Record<PricingTier, string> = {
  solo: "1 person",
  couple: "2 adults",
  family: "Up to 4 family members",
};

const vipExpertAvatars = ["AR", "NS", "KV"] as const;

const tierFeatureCopy: Record<ServiceTrack, Record<PricingTier, FeatureItem[]>> = {
  APPLY_MYSELF: {
    solo: [
      {
        highlight: "Custom AI Cover Letter:",
        detail: "Instantly generated based on your exact trip details.",
      },
      {
        highlight: "Smart Form Helper:",
        detail: "Copy-paste your data into the official government site in seconds.",
      },
      {
        highlight: "Free PDF Editor Utility:",
        detail: "Split, merge, and compress massive bank statements easily.",
      },
      {
        highlight: "Print-Ready Visa Packet:",
        detail: "An exact, step-by-step paper stacking guide for the VFS counter.",
      },
    ],
    couple: [
      {
        highlight: "Matching Cover Letters:",
        detail: "Perfectly cross-referenced narratives for both travelers.",
      },
      {
        highlight: "Auto-Generated Sponsorships:",
        detail: "Instantly create joint funding letters if one partner is paying.",
      },
      {
        highlight: "Smart Form Helper:",
        detail: "Fast-fill the official web forms for both profiles.",
      },
      {
        highlight: "Free PDF Editor Utility:",
        detail: "Split and merge shared hotel and flight bookings.",
      },
    ],
    family: [
      {
        highlight: "Required Forms for Children:",
        detail: "Automatically generates mandatory parental NOCs and minor annexures.",
      },
      {
        highlight: "Family-Linked Cover Letters:",
        detail: "Unified story and itinerary for up to 4 members.",
      },
      {
        highlight: "Smart Form Helper:",
        detail: "Copy-paste data for the whole family without typing it all out.",
      },
      {
        highlight: "Free PDF Editor Utility:",
        detail: "Organize everyone's documents in one place.",
      },
    ],
  },
  VIP_CONCIERGE: {
    solo: [
      {
        highlight: "Human Expert Document Check:",
        detail: "We verify your bank seals, photo sizes, and NOCs before you apply.",
      },
      {
        highlight: "Hands-Free Form Filling:",
        detail: "We manually type and submit your official embassy portal application.",
      },
      {
        highlight: "We Book Your VFS Appointment:",
        detail: "No refreshing the site; our team secures your slot.",
      },
      {
        highlight: "15-Minute Practice Call:",
        detail: "Rehearse common visa interview questions with our experts.",
      },
    ],
    couple: [
      {
        highlight: "Dual Profile Human Check:",
        detail: "We audit both profiles for mismatches or missing proofs.",
      },
      {
        highlight: "Hands-Free Form Filling:",
        detail: "We submit both official embassy applications for you.",
      },
      {
        highlight: "Joint VFS Slot Booking:",
        detail: "We guarantee you get appointments together at the same time.",
      },
      {
        highlight: "Joint Practice Call:",
        detail: "Prep for the interview together with our visa expert.",
      },
    ],
    family: [
      {
        highlight: "Full Family Document Check:",
        detail: "We verify tricky minor paperwork, school IDs, and joint financials.",
      },
      {
        highlight: "Hands-Free Form Filling:",
        detail: "We execute the official portal submissions for all family members.",
      },
      {
        highlight: "Group VFS Slot Booking:",
        detail: "We coordinate one seamless family appointment.",
      },
      {
        highlight: "Family Practice Call:",
        detail: "Ensure everyone is ready for the VFS counter.",
      },
    ],
  },
};

const trackBadgeCopy: Partial<Record<ServiceTrack, Partial<Record<PricingTier, string>>>> = {
  VIP_CONCIERGE: {
    couple: "Most Popular",
  },
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatInr(value: number) {
  return moneyFormatter.format(value);
}

export function PricingPlans() {
  const [activeTrack, setActiveTrack] = useState<ServiceTrack>(getDefaultServiceTrack());
  const pricing = getPricingMatrixForTrack(activeTrack);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl rounded-[1.15rem] bg-white/7 px-4 py-3 text-center text-xs font-medium text-slate-200 shadow-[0_18px_40px_rgba(8,15,31,0.16)] backdrop-blur-sm sm:text-sm">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-200" />
          Built around current Schengen tourist form structure and provider checklist guidance.
        </span>
      </div>

      <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(19,31,55,0.88),rgba(12,20,38,0.94))] p-2 shadow-[0_22px_54px_rgba(6,10,24,0.24)] backdrop-blur-sm">
        {(["APPLY_MYSELF", "VIP_CONCIERGE"] as const).map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => setActiveTrack(track)}
            aria-pressed={activeTrack === track}
            className={activeTrack === track
              ? track === "VIP_CONCIERGE"
                ? "rounded-[1rem] bg-indigo-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(99,102,241,0.34)] ring-1 ring-white/18"
                : "rounded-[1rem] bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_36px_rgba(34,211,238,0.34)] ring-1 ring-white/18"
              : "rounded-[1rem] bg-white/6 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"}
          >
            {serviceTrackLabel[track]}
          </button>
        ))}
      </div>

      <p className="mx-auto max-w-3xl text-center text-sm leading-6 text-slate-300">
        {trackMarketingCopy[activeTrack]}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Object.entries(pricing) as Array<[PricingTier, (typeof pricing)[PricingTier]]>).map(([tier, config]) => {
          const tax = calculateInclusiveGstBreakdown(config.gstInclusiveAmountInr);
          const featured = tier === "couple";
          const badge = trackBadgeCopy[activeTrack]?.[tier] ?? null;

          return (
            <article
              key={`${activeTrack}-${tier}`}
              className={featured
                ? activeTrack === "VIP_CONCIERGE"
                  ? "relative rounded-[1.7rem] border border-indigo-300/30 bg-[linear-gradient(180deg,rgba(32,38,80,0.96),rgba(19,24,54,0.98))] px-6 py-7 text-white shadow-[0_24px_60px_rgba(79,70,229,0.16)] sm:px-7"
                  : "relative rounded-[1.7rem] border border-cyan-300/30 bg-[linear-gradient(180deg,#f5fbff,#ffffff)] px-6 py-7 text-slate-950 shadow-[0_24px_60px_rgba(34,211,238,0.12)] sm:px-7"
                : "relative rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(26,38,66,0.92),rgba(14,22,42,0.96))] px-6 py-7 text-white shadow-[0_20px_50px_rgba(6,10,24,0.26)] sm:px-7"}
            >
              {badge ? (
                <span className="absolute right-5 top-5 rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.28)]">
                  {badge}
                </span>
              ) : null}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={featured ? "text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-cyan-700" : "eyebrow"}>
                    {config.label}
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.05em]">₹{config.gstInclusiveAmountInr.toLocaleString("en-IN")}</p>
                  <p className={featured ? "mt-2 text-xs italic text-slate-500" : "mt-2 text-xs italic text-slate-400"}>
                    Includes ₹{formatInr(tax.gstAmountInr)} GST on a taxable value of ₹{formatInr(tax.taxableAmountInr)}
                  </p>
                </div>
                <span className={featured
                  ? activeTrack === "VIP_CONCIERGE"
                    ? "rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                    : "rounded-full bg-cyan-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                  : "rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200"}>
                  {planSizeCopy[tier]}
                </span>
              </div>

              <p className={featured ? activeTrack === "VIP_CONCIERGE" ? "mt-4 text-sm leading-7 text-indigo-50/88" : "mt-4 text-sm leading-7 text-slate-700" : "mt-4 text-sm leading-7 text-slate-200"}>
                {planAudienceCopy[tier]}
              </p>

              <ul className={featured ? activeTrack === "VIP_CONCIERGE" ? "mt-6 space-y-3 text-sm text-indigo-50" : "mt-6 space-y-3 text-sm text-slate-800" : "mt-6 space-y-3 text-sm text-slate-100"}>
                {tierFeatureCopy[activeTrack][tier].map((feature) => (
                  <li key={feature.highlight} className="flex items-start gap-3">
                    <Check className={featured ? activeTrack === "VIP_CONCIERGE" ? "mt-0.5 h-4 w-4 text-indigo-200" : "mt-0.5 h-4 w-4 text-cyan-700" : "mt-0.5 h-4 w-4 text-emerald-300"} />
                    <span>
                      <span className={featured ? activeTrack === "VIP_CONCIERGE" ? "font-semibold text-indigo-100" : "font-semibold text-cyan-700" : "font-semibold text-cyan-200"}>{feature.highlight}</span>{" "}
                      <span>{feature.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {activeTrack === "VIP_CONCIERGE" ? (
                <div className={featured ? activeTrack === "VIP_CONCIERGE" ? "mt-6 rounded-[1rem] border border-indigo-200/20 bg-white/8 px-4 py-4 text-sm text-indigo-50" : "mt-6 rounded-[1rem] border border-cyan-200 bg-cyan-50/90 px-4 py-4 text-sm text-slate-700" : "mt-6 rounded-[1rem] border border-white/12 bg-white/8 px-4 py-4 text-sm text-slate-200"}>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {vipExpertAvatars.map((avatar) => (
                        <span
                          key={avatar}
                          className={featured
                            ? activeTrack === "VIP_CONCIERGE"
                              ? "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 bg-indigo-200 text-xs font-semibold text-slate-950"
                              : "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-semibold text-white"
                            : "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#15223b] bg-cyan-200 text-xs font-semibold text-slate-950"}
                        >
                          {avatar}
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className={featured ? activeTrack === "VIP_CONCIERGE" ? "font-semibold text-white" : "font-semibold text-slate-900" : "font-semibold text-white"}>Reviewed by our in-house visa experts.</p>
                      <p className={featured ? activeTrack === "VIP_CONCIERGE" ? "text-xs text-indigo-100/80" : "text-xs text-slate-600" : "text-xs text-slate-300"}>Final review is shared with you before submission moves forward.</p>
                    </div>
                  </div>
                  <div className={featured ? activeTrack === "VIP_CONCIERGE" ? "mt-4 flex items-start gap-2 text-xs text-indigo-100/80" : "mt-4 flex items-start gap-2 text-xs text-slate-600" : "mt-4 flex items-start gap-2 text-xs text-slate-300"}>
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Target turnaround: documents audited within 4 hours, VFS slot booking within 24 hours of your approval.</span>
                  </div>
                </div>
              ) : null}

              <Link
                href={`/apply?track=${activeTrack}&tier=${tier}`}
                className={featured
                  ? activeTrack === "VIP_CONCIERGE"
                    ? "mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/10 transition hover:bg-slate-100"
                    : "mt-8 inline-flex w-full items-center justify-center rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-500"
                  : "mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/10 transition hover:bg-slate-100"}
              >
                Choose {config.label}
              </Link>

              <p className={featured ? "mt-3 flex items-start justify-center gap-2 text-center text-xs text-slate-500" : "mt-3 flex items-start justify-center gap-2 text-center text-xs text-slate-300"}>
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Secure 256-bit encryption. 18% GST included. Zero hidden VisaPilot processing fees.</span>
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}