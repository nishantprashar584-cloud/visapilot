import { ClipboardList, Layers3 } from "lucide-react";
import { ConsulateChecklist } from "@/components/wizard/ConsulateChecklist";
import { resolveConsulateChecklist } from "@/lib/applications/consulateChecklist";
import type { ApplicantInfo } from "@/types";

export function ChecklistTabPanel({
  applicant,
  onDownloadPdf,
}: {
  applicant: ApplicantInfo;
  onDownloadPdf: () => void | Promise<void>;
}) {
  const checklist = resolveConsulateChecklist(applicant);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.2rem] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
          <ClipboardList className="h-3.5 w-3.5" />
          Physical appointment guide
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">VFS Checklist & Stacking Order</h3>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Review the physical packet sequence below so there is zero ambiguity when the applicant reaches the submission counter.
        </p>
      </div>

      <div className="rounded-[1.2rem] border border-white/14 bg-[rgba(9,16,31,0.72)] p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          <Layers3 className="h-3.5 w-3.5" />
          Interactive stacking visualizer
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {checklist.documentStackOrder.map((item, index) => (
            <div key={item} className="rounded-[1rem] border border-white/14 bg-white/10 px-4 py-4 text-slate-100">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-white">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <ConsulateChecklist applicant={applicant} onDownloadPdf={onDownloadPdf} />
    </div>
  );
}