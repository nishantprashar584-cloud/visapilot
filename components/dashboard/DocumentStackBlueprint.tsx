import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export function buildDocumentSequence(
  applicant: ApplicantInfo,
  refusalReasonCode: RefusalReasonCode | null,
): string[] {
  const sequence = [
    "Printed Schengen application form with signature fields reviewed.",
    "Passport original plus biographical page photocopies.",
    "AI-generated cover letter addressed to the correct consulate.",
    "Round-trip flight reservation or onward itinerary.",
    "Accommodation proof covering the complete stay.",
    "Travel medical insurance certificate with Schengen coverage.",
    `Recent bank statements proving at least EUR ${applicant.employment.savingsBalanceEur.toFixed(2)} in accessible funds.`,
  ];

  if (applicant.employment.employmentStatus === "student") {
    sequence.push("Enrollment proof and student support documentation.");
  } else {
    sequence.push("Employment proof, leave approval, or self-employment evidence.");
  }

  if (applicant.sponsor.type !== "self") {
    sequence.push("Sponsor declaration letter plus sponsor identity and financial proof.");
  }

  if (applicant.homeTies.returnIntentEvidence.trim().length > 0) {
    sequence.push("Home-country ties evidence supporting return intent.");
  }

  if (refusalReasonCode) {
    sequence.push(
      `Previous refusal response note addressing Schengen refusal reason ${refusalReasonCode}.`,
    );
  }

  return sequence;
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