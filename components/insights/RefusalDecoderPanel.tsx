"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { decodeRefusalReason } from "@/lib/applications/refusalDecoder";
import type { RefusalReasonCode } from "@/types";

const refusalReasonCodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

function parseRefusalReasonCode(value: string): RefusalReasonCode | null {
  const numericValue = Number(value);

  if (refusalReasonCodes.includes(numericValue as (typeof refusalReasonCodes)[number])) {
    return numericValue as RefusalReasonCode;
  }

  return null;
}

function buildDownloadHref(downloadHref: string, refusalReasonCode: RefusalReasonCode | null): string {
  if (!refusalReasonCode) {
    return downloadHref;
  }

  const url = new URL(downloadHref, "http://localhost");
  url.searchParams.set("code", String(refusalReasonCode));

  return `${url.pathname}${url.search}`;
}

export function RefusalDecoderPanel({
  refusalReasonCode,
  downloadHref,
}: {
  refusalReasonCode: RefusalReasonCode | null;
  downloadHref?: string;
}) {
  const [selectedReasonCode, setSelectedReasonCode] = useState<RefusalReasonCode | null>(refusalReasonCode);
  const effectiveReasonCode = selectedReasonCode ?? refusalReasonCode;
  const decoded = effectiveReasonCode ? decodeRefusalReason(effectiveReasonCode) : null;
  const resolvedDownloadHref = useMemo(
    () => (downloadHref ? buildDownloadHref(downloadHref, effectiveReasonCode) : undefined),
    [downloadHref, effectiveReasonCode],
  );

  return (
    <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
            <RotateCcw className="h-3.5 w-3.5" />
            Annex VI refusal decoder
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">Refusal recovery path</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Premium-tier recovery support maps Annex VI refusal codes into concrete remediation steps so the next filing fixes the evidence gap instead of repeating the rejection.
          </p>
        </div>

        {resolvedDownloadHref ? (
          <a
            href={resolvedDownloadHref}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Download Refusal Remediation Plan (.PDF)
          </a>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Select refusal code
        </label>
        <select
          value={effectiveReasonCode == null ? "" : String(effectiveReasonCode)}
          onChange={(event) => setSelectedReasonCode(parseRefusalReasonCode(event.target.value))}
          className="vp-select h-10"
        >
          <option value="">Choose Annex VI refusal code</option>
          {refusalReasonCodes.map((code) => {
            const decodedOption = decodeRefusalReason(code);

            return (
              <option key={code} value={code}>
                Code {code}: {decodedOption.title}
              </option>
            );
          })}
        </select>
      </div>

      {decoded ? (
        <div className="mt-5 space-y-3">
          <div className="rounded-[1rem] border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50/90">
            Reason {decoded.refusalReasonCode}: {decoded.title}
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
            <p className="text-sm leading-6 text-slate-200">{decoded.summary}</p>
          </div>
          {decoded.remediationSteps.map((step) => (
            <div key={step} className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
              <div className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm leading-6 text-slate-200">{step}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
          Choose a refusal code to preview the remediation track and unlock the refusal recovery PDF.
        </div>
      )}
    </div>
  );
}