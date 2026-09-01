import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { decodeRefusalReason } from "@/lib/applications/refusalDecoder";
import type { RefusalReasonCode } from "@/types";

export function RefusalDecoderPanel({
  refusalReasonCode,
  downloadHref,
}: {
  refusalReasonCode: RefusalReasonCode | null;
  downloadHref?: string;
}) {
  const decoded = refusalReasonCode ? decodeRefusalReason(refusalReasonCode) : null;

  return (
    <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
            <RotateCcw className="h-3.5 w-3.5" />
            Annex VI refusal decoder
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">Refusal recovery path</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Structured remediation for rejection codes so the next submission fixes the actual refusal ground.
          </p>
        </div>

        {downloadHref ? (
          <Link
            href={downloadHref}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Download PDF
          </Link>
        ) : null}
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
          No refusal code is attached to this file yet. Once a rejection code is recorded, VisaPilot will map it into a targeted remediation track here.
        </div>
      )}
    </div>
  );
}