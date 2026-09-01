import { CheckSquare, ClipboardList, Download, Layers3 } from "lucide-react";
import { resolveConsulateChecklist } from "@/lib/applications/consulateChecklist";
import type { ApplicantInfo } from "@/types";

export function ConsulateChecklist({
  applicant,
  onDownloadPdf,
}: {
  applicant: ApplicantInfo;
  onDownloadPdf: () => void | Promise<void>;
}) {
  const checklist = resolveConsulateChecklist(applicant);

  return (
    <div className="rounded-[1.35rem] border border-white/14 bg-[linear-gradient(180deg,rgba(24,34,58,0.84),rgba(14,22,42,0.92))] p-5 shadow-[0_18px_44px_rgba(5,10,24,0.22)] sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
            <ClipboardList className="h-3.5 w-3.5" />
            Consulate submission checklist
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">
            {checklist.destinationCountry} appointment-ready packet guide
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
            Tailored for {checklist.provider}. Review the physical submission rules here, then include the exported PDF inside the final embassy packet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onDownloadPdf()}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <CheckSquare className="h-3.5 w-3.5" />
            Appointment-day checks
          </div>
          <div className="mt-4 space-y-3">
            {checklist.checklistItems.map((item) => (
              <div key={item.id} className="rounded-[0.95rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3">
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/20 bg-white/12 text-[10px] text-slate-300">
                    [ ]
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-6 text-slate-100">{item.label}</p>
                    {item.note ? <p className="mt-1 text-sm leading-6 text-slate-400">{item.note}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Layers3 className="h-3.5 w-3.5" />
            Official stacking order
          </div>
          <div className="mt-4 rounded-[0.95rem] border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-cyan-50">
            Provider: {checklist.provider}
          </div>
          <ol className="mt-4 space-y-3">
            {checklist.documentStackOrder.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-[0.95rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-950">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}