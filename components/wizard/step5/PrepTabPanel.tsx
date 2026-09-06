import { MessageSquareText, RotateCcw } from "lucide-react";
import { ConsularInterviewPanel } from "@/components/insights/ConsularInterviewPanel";
import { RefusalDecoderPanel } from "@/components/insights/RefusalDecoderPanel";
import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export function PrepTabPanel({
  applicant,
  refusalReasonCode,
  interviewDownloadHref,
  refusalDownloadHref,
}: {
  applicant: ApplicantInfo;
  refusalReasonCode: RefusalReasonCode | null;
  interviewDownloadHref?: string;
  refusalDownloadHref?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.15rem] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100">
            <MessageSquareText className="h-3.5 w-3.5" />
            Simulation workspace
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">Interview Prep</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Practice risk-targeted voice and text questions derived from this applicant&apos;s itinerary and financial story without cluttering the main delivery tabs.
          </p>
        </div>
        <div className="rounded-[1.15rem] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
            <RotateCcw className="h-3.5 w-3.5" />
            Remediation tracker
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">Recovery Path</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Annex VI refusal guidance remains available here for remediation planning if a rejection code ever needs to be decoded.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ConsularInterviewPanel applicant={applicant} downloadHref={interviewDownloadHref} />
        <RefusalDecoderPanel refusalReasonCode={refusalReasonCode} downloadHref={refusalDownloadHref} />
      </div>
    </div>
  );
}