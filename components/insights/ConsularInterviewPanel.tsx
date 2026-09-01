import Link from "next/link";
import { Mic, MessageSquareText } from "lucide-react";
import { generateConsularInterviewQuestions } from "@/lib/applications/interviewSimulator";
import type { ApplicantInfo } from "@/types";

export function ConsularInterviewPanel({
  applicant,
  downloadHref,
}: {
  applicant: ApplicantInfo;
  downloadHref?: string;
}) {
  const questions = generateConsularInterviewQuestions(applicant);

  return (
    <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100">
            <Mic className="h-3.5 w-3.5" />
            Interview simulator
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">Consular interview rehearsal</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Risk-targeted voice and text questions generated from the applicant profile, itinerary, and financial audit.
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

      <div className="mt-5 space-y-3">
        {questions.slice(0, 3).map((question, index) => (
          <div key={question.id} className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <MessageSquareText className="h-3.5 w-3.5" />
              Prompt {index + 1} · {question.channel} · {question.severity}
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white">{question.prompt}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{question.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}