import Link from "next/link";
import { AlertTriangle, BadgeCheck, FileWarning, ShieldCheck } from "lucide-react";
import { getTemplateAuditStatuses } from "@/lib/pdf/formStrategy";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templateStatuses = await getTemplateAuditStatuses();
  const nativeTemplateCount = templateStatuses.filter((status) => status.supportsNativeAutofill).length;

  return (
    <section className="w-full space-y-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <p className="eyebrow">
          Template Workflow
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          Schengen form template status
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          This page shows whether each stored PDF is a true interactive AcroForm or only a flat visual template. Native autofill is only production-grade when the PDF exposes real fields.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/70 p-6 shadow-panel xl:col-span-2">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Audit summary</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {nativeTemplateCount === 0
                  ? "No stored template currently exposes native AcroForm fields. Standalone form downloads remain draft overlays until interactive PDFs are sourced."
                  : `${nativeTemplateCount} template${nativeTemplateCount === 1 ? "" : "s"} currently support native AcroForm autofill.`}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {templateStatuses.map((status) => (
              <div key={status.key} className="rounded-[1rem] border border-white/10 bg-[#0f0f0f] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{status.destinationCountry}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{status.templateLabel}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.supportsNativeAutofill ? "border border-emerald-400/25 bg-emerald-400/12 text-emerald-100" : "border border-amber-400/25 bg-amber-400/12 text-amber-100"}`}>
                    {status.supportsNativeAutofill ? <BadgeCheck className="h-3.5 w-3.5" /> : <FileWarning className="h-3.5 w-3.5" />}
                    {status.supportsNativeAutofill ? "Native fields" : "Flat template"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {status.templateExists
                    ? status.supportsNativeAutofill
                      ? "This file can be filled through real PDF form fields."
                      : "This file has no interactive fields and should only be treated as a visual draft layer."
                    : "Template file is missing from the repository."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={status.portalUrl}
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                  >
                    Open official guidance
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/70 p-6 shadow-panel">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Operator flow</h2>
              <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <li>1. Add the embassy or VFS PDF under public/templates.</li>
                <li>2. Run npm run inspect:pdf -- public/templates/&lt;file&gt;.pdf.</li>
                <li>3. If the result is empty, do not ship it as a premium filled form.</li>
                <li>4. Only map the template for native autofill when real AcroForm fields exist.</li>
                <li>5. Keep the master VFS bundle as the primary user-facing artifact until then.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}