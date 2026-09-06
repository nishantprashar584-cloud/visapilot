"use client";

import { useState } from "react";
import { Clipboard, Globe2 } from "lucide-react";
import { DataProvenanceBadge } from "@/components/intelligence/DataProvenanceBadge";
import type { CountrySubmissionType } from "@/types";
import type { SubmissionGuideField } from "@/lib/applications/submissionGuide";

export function SubmissionGuideDrawer({
  title,
  destinationCountry,
  submissionType,
  instructions,
  fields,
}: {
  title: string;
  destinationCountry: string;
  submissionType: CountrySubmissionType;
  instructions: string[];
  fields: SubmissionGuideField[];
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [activeCopyField, setActiveCopyField] = useState<number | null>(null);
  const [copyErrorField, setCopyErrorField] = useState<number | null>(null);

  async function handleCopy(field: SubmissionGuideField) {
    try {
      await navigator.clipboard.writeText(field.value);
      setActiveCopyField(field.box);
      setCopyErrorField((current) => (current === field.box ? null : current));
      setToast(`Copied Box ${field.box}`);
      window.setTimeout(() => {
        setActiveCopyField((current) => (current === field.box ? null : current));
        setToast((current) => (current === `Copied Box ${field.box}` ? null : current));
      }, 1800);
    } catch {
      setCopyErrorField(field.box);
      setToast(`Couldn't copy Box ${field.box}`);
      window.setTimeout(() => {
        setCopyErrorField((current) => (current === field.box ? null : current));
        setToast((current) => (current === `Couldn't copy Box ${field.box}` ? null : current));
      }, 2200);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(24,34,58,0.92),rgba(14,22,42,0.96))] p-6 shadow-[0_22px_60px_rgba(5,10,24,0.28)]">
        <p className="eyebrow">Smart Form Helper</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {destinationCountry} · {submissionType === "PORTAL_ONLINE" ? "Online portal workflow" : "Paper or worksheet workflow"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="vp-badge vp-badge-brand">Copy-ready values</span>
          <span className="vp-badge vp-badge-neutral">Live application data</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 p-2 text-cyan-100">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Portal steps</p>
              <p className="text-lg font-semibold text-white">Use the official form side by side with this helper.</p>
            </div>
          </div>

          <ol className="mt-6 space-y-3 text-sm text-slate-200">
            {instructions.map((instruction, index) => (
              <li key={instruction} className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-4 leading-6">
                <span className="mr-2 font-semibold text-cyan-200">{index + 1}.</span>
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Application answers</p>
                <p className="mt-1 text-lg font-semibold text-white">Quick-paste helper</p>
              </div>
              {toast ? <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">{toast}</span> : null}
            </div>

            <div className="mt-5 max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {fields.map((field) => (
                <details key={field.box} className="rounded-[1rem] border border-white/10 bg-white/5 p-4" open={field.box <= 3}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Box {field.box}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{field.label}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          void handleCopy(field);
                        }}
                        className="vp-btn vp-btn-secondary px-3 py-1.5 text-xs uppercase tracking-[0.16em]"
                        aria-label={`Copy Box ${field.box} ${field.label}`}
                      >
                        <Clipboard className="h-3.5 w-3.5" />
                        {copyErrorField === field.box ? "Couldn't copy" : activeCopyField === field.box ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                  </summary>
                  <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-sm leading-6 text-slate-200">
                    {field.value}
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">Live application value</p>
                  <DataProvenanceBadge labels={field.provenanceLabels ?? []} />
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}