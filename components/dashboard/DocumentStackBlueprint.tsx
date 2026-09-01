import { buildStrictDocumentSequence } from "@/lib/applications/consularPolicy";
import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export function buildDocumentSequence(
  applicant: ApplicantInfo,
  refusalReasonCode: RefusalReasonCode | null,
): string[] {
  return buildStrictDocumentSequence(applicant, refusalReasonCode);
}

export function DocumentStackBlueprint({
  applicant,
  refusalReasonCode,
}: {
  applicant: ApplicantInfo;
  refusalReasonCode: RefusalReasonCode | null;
}) {
  const sequence = buildDocumentSequence(applicant, refusalReasonCode);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/80 p-6 shadow-panel backdrop-blur sm:p-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-cyan">
          Physical Stack Blueprint
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Recommended submission order for your document packet
        </h2>
        <p className="text-sm leading-7 text-slate-300">
          Use this checklist to arrange the printed package before your VFS, TLScontact, or BLS appointment.
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {sequence.map((item, index) => (
          <li key={item} className="flex gap-4 rounded-3xl border border-white/10 bg-[#101010] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
              {index + 1}
            </div>
            <p className="text-sm leading-7 text-slate-200">{item}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}