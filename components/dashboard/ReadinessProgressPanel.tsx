import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import type { ApplicationStatus, CaseFinding, CaseReadinessAssessment } from "@/types";

type TimelineTone = "complete" | "review" | "current" | "pending";

function toneClasses(tone: TimelineTone) {
  switch (tone) {
    case "complete":
      return "border-emerald-300/24 bg-emerald-400/12 text-emerald-50";
    case "review":
      return "border-amber-300/24 bg-amber-400/12 text-amber-50";
    case "current":
      return "border-cyan-300/24 bg-cyan-400/12 text-cyan-50";
    default:
      return "border-white/12 bg-white/6 text-slate-300";
  }
}

function dimensionScore(assessment: CaseReadinessAssessment, dimensionId: string): number {
  return assessment.dimensions.find((dimension) => dimension.id === dimensionId)?.score ?? 0;
}

function toneFromScore(score: number): TimelineTone {
  if (score >= 85) {
    return "complete";
  }

  if (score >= 60) {
    return "current";
  }

  return "review";
}

function mergeTone(tones: TimelineTone[]): TimelineTone {
  if (tones.includes("review")) {
    return "review";
  }

  if (tones.includes("current")) {
    return "current";
  }

  if (tones.every((tone) => tone === "complete")) {
    return "complete";
  }

  return "pending";
}

function statusComplete(status: ApplicationStatus): boolean {
  return ["bundle_ready", "portal_filing_in_progress", "otp_pending", "portal_submitted", "appointment_pending", "appointment_booked", "completed"].includes(status);
}

function buildFindingActionTarget(finding: CaseFinding, links: {
  identityHref?: string;
  travelHref?: string;
  financialHref?: string;
  accommodationHref?: string;
  documentsHref?: string;
  coverLetterHref?: string;
  submissionGuideHref: string;
}) {
  switch (finding.category) {
    case "IDENTITY":
      return { href: links.identityHref ?? "#identity-anchor", label: "Review identity" };
    case "TRAVEL":
    case "ITINERARY":
      return { href: links.travelHref ?? "#packet-snapshot", label: "Review travel plan" };
    case "ACCOMMODATION":
      return { href: links.accommodationHref ?? "#packet-snapshot", label: "Review accommodation" };
    case "FINANCIAL":
    case "EMPLOYMENT":
      return { href: links.financialHref ?? "#financial-audit", label: "Review funding" };
    case "SPONSORSHIP":
    case "HOME_TIES":
    case "CONSISTENCY":
    case "FAMILY":
      return { href: links.coverLetterHref ?? "#cover-letter-preview", label: "Review case narrative" };
    case "DOCUMENTS":
    case "MINOR":
      return { href: links.documentsHref ?? "#supporting-documents", label: "Review documents" };
    case "TRAVEL_HISTORY":
    case "VISA_HISTORY":
    case "DESTINATION_POLICY":
    case "APPLICATION_CHANNEL":
      return { href: links.submissionGuideHref, label: "Open Smart Form Helper" };
    default:
      return { href: links.submissionGuideHref, label: "Review next step" };
  }
}

export function ReadinessProgressPanel({
  initialAssessment,
  currentAssessment,
  applicationStatus,
  supportingDocumentCount,
  links,
}: {
  initialAssessment: CaseReadinessAssessment;
  currentAssessment: CaseReadinessAssessment;
  applicationStatus: ApplicationStatus;
  supportingDocumentCount: number;
  links: {
    identityHref?: string;
    travelHref?: string;
    financialHref?: string;
    accommodationHref?: string;
    documentsHref?: string;
    coverLetterHref?: string;
    submissionGuideHref: string;
  };
}) {
  const initialFindingIds = new Set(initialAssessment.findings.filter((finding) => finding.severity !== "INFO").map((finding) => finding.id));
  const currentFindingIds = new Set(currentAssessment.findings.filter((finding) => finding.severity !== "INFO").map((finding) => finding.id));
  const resolvedCount = Array.from(initialFindingIds).filter((findingId) => !currentFindingIds.has(findingId)).length;
  const newCount = Array.from(currentFindingIds).filter((findingId) => !initialFindingIds.has(findingId)).length;
  const identityTone = toneFromScore(dimensionScore(currentAssessment, "identity"));
  const travelTone = mergeTone([
    toneFromScore(dimensionScore(currentAssessment, "travel")),
    toneFromScore(dimensionScore(currentAssessment, "consistency")),
    toneFromScore(dimensionScore(currentAssessment, "accommodation")),
  ]);
  const financialTone = toneFromScore(dimensionScore(currentAssessment, "financial"));
  const finalReviewTone = currentAssessment.actionRequiredCount > 0 ? "review" : currentAssessment.reviewCount > 0 ? "current" : "complete";
  const currentOpenFindings = currentAssessment.findings.filter((finding) => finding.severity !== "INFO").slice(0, 4);
  const nextActionLink = currentOpenFindings[0]
    ? buildFindingActionTarget(currentOpenFindings[0], links)
    : { href: links.submissionGuideHref, label: "Open Smart Form Helper" };
  const timeline: Array<{ id: string; label: string; detail: string; tone: TimelineTone }> = [
    {
      id: "initial",
      label: "Free readiness completed",
      detail: `Initial assessment saved at ${initialAssessment.score}/100.`,
      tone: "complete" as const,
    },
    {
      id: "application",
      label: "Application started",
      detail: "Your paid application was created from the preserved readiness context.",
      tone: "complete" as const,
    },
    {
      id: "identity",
      label: "Identity verified",
      detail: currentAssessment.dimensions.find((dimension) => dimension.id === "identity")?.summary ?? "Identity review pending.",
      tone: identityTone,
    },
    {
      id: "travel",
      label: "Travel checked",
      detail: currentAssessment.dimensions.find((dimension) => dimension.id === "travel")?.summary ?? "Travel review pending.",
      tone: travelTone,
    },
    {
      id: "financial",
      label: "Financial evidence",
      detail: currentAssessment.dimensions.find((dimension) => dimension.id === "financial")?.summary ?? "Financial review pending.",
      tone: financialTone,
    },
    {
      id: "documents",
      label: "Document Studio",
      detail: supportingDocumentCount > 0 ? `${supportingDocumentCount} supporting document${supportingDocumentCount === 1 ? "" : "s"} linked to this case.` : "No supporting documents uploaded yet.",
      tone: supportingDocumentCount > 0 ? "complete" : "current",
    },
    {
      id: "final",
      label: "Final application review",
      detail: currentAssessment.actionRequiredCount > 0
        ? `${currentAssessment.actionRequiredCount} action-required item${currentAssessment.actionRequiredCount === 1 ? "" : "s"} still need attention.`
        : currentAssessment.reviewCount > 0
          ? `${currentAssessment.reviewCount} review item${currentAssessment.reviewCount === 1 ? "" : "s"} remain before finalization.`
          : "No unresolved readiness blockers remain in the current case assessment.",
      tone: finalReviewTone,
    },
    {
      id: "submission",
      label: "Ready to submit",
      detail: statusComplete(applicationStatus)
        ? "The application has moved beyond preparation into the submission workflow."
        : "Complete the next best action below before finalizing the application.",
      tone: statusComplete(applicationStatus) ? "complete" : finalReviewTone === "complete" ? "current" : "pending",
    },
  ];

  return (
    <div className="glass-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Initial Vs Current</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Track how your case improved</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">VisaPilot preserved your initial readiness assessment and compares it with the current application state so progress stays explainable.</p>
        </div>
        <div className="rounded-[1rem] border border-cyan-300/24 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Next best action</p>
          <p className="mt-2 font-semibold text-white">{currentAssessment.nextBestAction}</p>
          <Link href={nextActionLink.href} className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-50 transition hover:bg-white/14">
            <ArrowRight className="h-3.5 w-3.5" />
            {nextActionLink.label}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <div className="rounded-[1.2rem] border border-white/12 bg-white/8 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Initial readiness</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{initialAssessment.score}<span className="ml-1 text-lg text-slate-300">/100</span></p>
          <p className="mt-2 text-sm text-slate-300">{initialAssessment.summary}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/12 bg-white/8 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Current readiness</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{currentAssessment.score}<span className="ml-1 text-lg text-slate-300">/100</span></p>
          <p className="mt-2 text-sm text-slate-300">{currentAssessment.summary}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/12 bg-white/8 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-100" />
            <p className="text-sm font-semibold text-white">Case changes</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-emerald-300/24 bg-emerald-400/12 px-4 py-3 text-sm text-emerald-50">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Resolved</p>
              <p className="mt-2 text-2xl font-semibold text-white">{resolvedCount}</p>
            </div>
            <div className="rounded-[1rem] border border-amber-300/24 bg-amber-400/12 px-4 py-3 text-sm text-amber-50">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">New or still open</p>
              <p className="mt-2 text-2xl font-semibold text-white">{newCount || currentFindingIds.size}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">Current case snapshot: {currentAssessment.snapshot.narrative}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-cyan-100" />
            <p className="text-sm font-semibold text-white">Case timeline</p>
          </div>
          <div className="space-y-3">
            {timeline.map((step, index) => (
              <div key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${toneClasses(step.tone)}`}>
                    {step.tone === "complete" ? <CheckCircle2 className="h-4 w-4" /> : step.tone === "review" ? <AlertTriangle className="h-4 w-4" /> : step.tone === "current" ? <CircleAlert className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < timeline.length - 1 ? <div className="mt-2 h-8 w-px bg-white/12" /> : null}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.15rem] border border-white/12 bg-white/8 p-4">
            <p className="text-sm font-semibold text-white">What changed since the free check</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
              {(resolvedCount > 0 ? [`You resolved ${resolvedCount} item${resolvedCount === 1 ? "" : "s"} identified during your initial assessment.`] : ["No initial readiness items have been resolved yet."]).map((item) => (
                <li key={item}>• {item}</li>
              ))}
              {(currentAssessment.actionRequiredCount > 0
                ? [`${currentAssessment.actionRequiredCount} action-required item${currentAssessment.actionRequiredCount === 1 ? "" : "s"} still block final readiness.`]
                : ["No current action-required readiness blockers remain."]).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.15rem] border border-white/12 bg-white/8 p-4">
            <p className="text-sm font-semibold text-white">Current next best action</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{currentAssessment.nextBestAction}</p>
          </div>
          <div className="rounded-[1.15rem] border border-white/12 bg-white/8 p-4">
            <p className="text-sm font-semibold text-white">Recommended correction surfaces</p>
            <div className="mt-3 space-y-3">
              {currentOpenFindings.length === 0 ? (
                <p className="text-sm leading-6 text-slate-300">No open readiness findings remain.</p>
              ) : currentOpenFindings.map((finding) => {
                const target = buildFindingActionTarget(finding, links);

                return (
                  <div key={finding.id} className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-semibold text-white">{finding.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{finding.recommendedAction}</p>
                    <Link href={target.href} className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14">
                      <ArrowRight className="h-3.5 w-3.5" />
                      {target.label}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}