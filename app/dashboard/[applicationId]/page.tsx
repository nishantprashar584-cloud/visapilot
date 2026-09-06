import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Archive,
  BadgeCheck,
  ClipboardList,
  Download,
  FileText,
  Link2,
  Lock,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationStatusBadge } from "@/components/dashboard/ApplicationStatusBadge";
import { ConsularDeepLinks } from "@/components/dashboard/ConsularDeepLinks";
import { PrivacyCountdownBadge } from "@/components/dashboard/PrivacyCountdownBadge";
import { ReadinessProgressPanel } from "@/components/dashboard/ReadinessProgressPanel";
import { StatusPipeline } from "@/components/dashboard/StatusPipeline";
import { SupportingDocumentsVault } from "@/components/dashboard/SupportingDocumentsVault";
import { TrackingReferenceManager } from "@/components/dashboard/TrackingReferenceManager";
import { VaultActionCenter } from "@/components/dashboard/VaultActionCenter";
import { ApplicationHealthCard } from "@/components/intelligence/ApplicationHealthCard";
import { ApplicationJourney } from "@/components/intelligence/ApplicationJourney";
import { ApplicationTimeline } from "@/components/intelligence/ApplicationTimeline";
import { CaseChangePanel } from "@/components/intelligence/CaseChangePanel";
import { CaseSnapshotCard } from "@/components/intelligence/CaseSnapshotCard";
import { NextBestActionCard } from "@/components/intelligence/NextBestActionCard";
import { ConsularInterviewPanel } from "@/components/insights/ConsularInterviewPanel";
import { RefusalDecoderPanel } from "@/components/insights/RefusalDecoderPanel";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { TintedIconBadge } from "@/components/ui/TintedIconBadge";
import { buildProfessionalCoverLetterFallback, stripItineraryMatrixSection } from "@/lib/applications/coverLetter";
import { mergeApplicantDraft } from "@/lib/applications/schema";
import { getServiceTrackLabel } from "@/lib/applications/workflow";
import {
  getApplicationHealth,
  getApplicationJourney,
  getApplicationTimelineEvents,
  getCaseChangeImpact,
  getCaseSnapshot,
  getNextBestAction,
} from "@/lib/applications/uxState";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { analyzeReadinessCase, buildApplicantDraftFromReadiness, buildCurrentReadinessDraftFromApplicant } from "@/lib/case-intelligence/readiness";
import { buildDestinationApplyHref } from "@/lib/destinationSelection";
import { getPreviewApplication } from "@/lib/mock/applications";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { getPrivacyCountdownDays, runRiskAudit } from "@/lib/riskAudit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationRow, PricingTier, VipActionRequestRow } from "@/types";

export const dynamic = "force-dynamic";

async function getApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<ApplicationRow | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, status, user_id, applicant_id, submission_type, track, tier, vfs_reference_number, vfs_center_location, appointment_date, applicant_name, applicant_email, destination_country, application_data, cover_letter_markdown, filled_pdf_base64, rejected_at, refusal_reason_code, recovery_status, recovery_claimed_at, privacy_purge_at, created_at, updated_at")
    .eq("id", applicationId)
    .single();

  if (error) {
    return null;
  }

  return data as ApplicationRow;
}

async function getPendingVipAction(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<VipActionRequestRow | null> {
  const { data, error } = await supabase
    .from("vip_action_requests")
    .select("id, application_id, action_type, prompt_message, status, expires_at, created_at")
    .eq("application_id", applicationId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as VipActionRequestRow | null;
}

async function getLatestSuccessfulPricingTier(
  supabase: SupabaseClient,
  userId: string,
  applicationId: string,
): Promise<PricingTier | null> {
  const { data: linkedPayment } = await supabase
    .from("payments")
    .select("pricing_tier, updated_at")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .in("status", ["verified", "captured"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkedPayment?.pricing_tier) {
    return linkedPayment.pricing_tier as PricingTier;
  }

  const { data: fallbackPayment } = await supabase
    .from("payments")
    .select("pricing_tier, updated_at")
    .eq("user_id", userId)
    .in("status", ["verified", "captured"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallbackPayment?.pricing_tier as PricingTier | undefined) ?? null;
}

const rejectionInsuranceEligibleTiers = new Set<PricingTier>(["couple", "family"]);

function getPreviewInsuranceTier(applicationId: string): PricingTier {
  if (applicationId === "preview-germany-tourism") {
    return "solo";
  }

  return applicationId === "preview-spain-repair" ? "couple" : "family";
}

function getPreviewPendingVipAction(applicationId: string): VipActionRequestRow | null {
  if (applicationId !== "preview-germany-tourism") {
    return null;
  }

  return {
    id: "preview-otp-request",
    application_id: applicationId,
    action_type: "OTP_REQUIRED",
    prompt_message: "Action Required: Your Germany portal filing needs the 6-digit verification code sent to your device. Enter it within 05:00.",
    status: "PENDING",
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };
}

export default async function ApplicationDashboardPage({
  params,
  searchParams,
}: {
  params: { applicationId: string };
  searchParams?: { preview?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const account = await getAuthenticatedAccount();

  if (!account && !previewMode) {
    redirect(buildAuthRedirectPath(`/dashboard/${params.applicationId}`));
  }

  const supabase = previewMode ? null : createSupabaseServerClient();
  const application = previewMode
    ? getPreviewApplication(params.applicationId)
    : await getApplication(supabase as SupabaseClient, params.applicationId);

  if (!application) {
    notFound();
  }

  const rejectionInsuranceTier = previewMode
    ? getPreviewInsuranceTier(application.id)
    : await getLatestSuccessfulPricingTier(supabase as SupabaseClient, application.user_id, application.id);
  const pendingVipAction = previewMode
    ? getPreviewPendingVipAction(application.id)
    : await getPendingVipAction(supabase as SupabaseClient, application.id);
  const rejectionInsuranceActive = rejectionInsuranceTier ? rejectionInsuranceEligibleTiers.has(rejectionInsuranceTier) : false;
  const audit = runRiskAudit(application.application_data);
  const pdfStrategy = await resolvePdfGenerationStrategy(application.destination_country);
  const privacyCountdownDays = getPrivacyCountdownDays(application.privacy_purge_at);
  const fullName = `${application.application_data.personal.firstName} ${application.application_data.personal.lastName}`.trim();
  const visibleCoverLetterMarkdown = previewMode
    ? buildProfessionalCoverLetterFallback(application.application_data)
    : stripItineraryMatrixSection(application.cover_letter_markdown);
  const interviewDownloadHref = previewMode
    ? `/dashboard/${application.id}/interview-simulator?preview=1`
    : `/dashboard/${application.id}/interview-simulator`;
  const refusalDecoderDownloadHref = previewMode
    ? `/dashboard/${application.id}/refusal-decoder?preview=1`
    : `/dashboard/${application.id}/refusal-decoder`;
  const previewDocumentStudioHref = `${buildDestinationApplyHref(application.destination_country, true)}&step=5&tab=bundle`;
  const previewIdentityHref = `${buildDestinationApplyHref(application.destination_country, true)}&step=1`;
  const previewTravelHref = `${buildDestinationApplyHref(application.destination_country, true)}&step=2`;
  const previewFinancialHref = `${buildDestinationApplyHref(application.destination_country, true)}&step=3`;
  const previewAccommodationHref = `${buildDestinationApplyHref(application.destination_country, true)}&step=4`;
  const previewCoverLetterHref = `${buildDestinationApplyHref(application.destination_country, true)}&step=5&tab=cover-letter`;
  const submissionGuideHref = previewMode
    ? `/dashboard/${application.id}/submission-guide?preview=1`
    : `/dashboard/${application.id}/submission-guide`;
  const actionButtonClass = "inline-flex w-fit items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition";
  const statusPillClass = "inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]";
  const packageCardItems = [
    { label: "Interview rehearsal brief", detail: "Risk-targeted voice and text prompts prepared for consular questions.", icon: Mic },
    { label: "Refusal recovery brief", detail: "Annex VI refusal-code remediation stays packaged with the file.", icon: RotateCcw },
  ] as const;
  const initialReadinessAssessment = application.application_data.caseContext?.readinessAssessment;
  const currentReadinessDraft = buildCurrentReadinessDraftFromApplicant(application.application_data);
  const currentReadinessAssessment = currentReadinessDraft ? analyzeReadinessCase(currentReadinessDraft) : null;
  const supportingDocumentCount = application.application_data.supportingDocuments?.length ?? 0;
  const currentHealth = getApplicationHealth({
    status: application.status,
    applicant: application.application_data,
    track: application.track,
    readinessAssessment: currentReadinessAssessment,
  });
  const currentJourney = getApplicationJourney({
    status: application.status,
    applicant: application.application_data,
    track: application.track,
    readinessAssessment: currentReadinessAssessment,
  });
  const snapshotItems = getCaseSnapshot(application.application_data, application.status, currentReadinessAssessment);
  const nextAction = getNextBestAction({
    status: application.status,
    applicant: application.application_data,
    track: application.track,
    readinessAssessment: currentReadinessAssessment,
    pendingVipAction: pendingVipAction ? { promptMessage: pendingVipAction.prompt_message } : null,
    appointmentDate: application.appointment_date,
    vfsReferenceNumber: application.vfs_reference_number,
  });
  const nextActionHref = nextAction.destination === "submission_guide"
    ? submissionGuideHref
    : nextAction.destination === "identity"
      ? previewMode ? previewIdentityHref : "#identity-anchor"
      : nextAction.destination === "travel"
        ? previewMode ? previewTravelHref : "#packet-snapshot"
        : nextAction.destination === "financial"
          ? previewMode ? previewFinancialHref : "#financial-audit"
          : nextAction.destination === "accommodation"
            ? previewMode ? previewAccommodationHref : "#packet-snapshot"
            : nextAction.destination === "documents"
              ? previewMode ? previewDocumentStudioHref : "#supporting-documents"
              : previewMode ? `/dashboard/${application.id}/vault?preview=1` : `/dashboard/${application.id}/vault`;
  const changeImpactItems = application.application_data.caseContext?.initialReadinessDraft
    ? getCaseChangeImpact(
        mergeApplicantDraft(buildApplicantDraftFromReadiness(application.application_data.caseContext.initialReadinessDraft)),
        application.application_data,
      )
    : [];
  const timelineEvents = getApplicationTimelineEvents(application, [], initialReadinessAssessment ?? currentReadinessAssessment);

  return (
    <section className="w-full space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.8rem] border border-white/14 bg-[linear-gradient(180deg,rgba(24,34,58,0.92),rgba(14,22,42,0.96))] p-5 shadow-[0_22px_60px_rgba(5,10,24,0.28)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              </span>
              <p className="eyebrow">My Visa Dashboard</p>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              {application.applicant_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-100">
              <span className="inline-flex w-fit items-center rounded-full border border-white/14 bg-white/10 px-3 py-1.5">Application ID: {application.id.slice(0, 8)}</span>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1.5">
                <CountryFlag country={application.destination_country} />
                Destination: {application.destination_country}
              </span>
              <span className="inline-flex w-fit items-center rounded-full border border-white/14 bg-white/10 px-3 py-1.5">{getServiceTrackLabel(application.track)}</span>
              <PrivacyCountdownBadge daysRemaining={privacyCountdownDays} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ApplicationStatusBadge status={application.status} />
            <span className={`${statusPillClass} border border-amber-300/30 bg-amber-400/16 text-amber-50`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              Audit {audit.status}
            </span>
            <Link
              href={previewMode ? previewDocumentStudioHref : "/dashboard"}
              className={`${actionButtonClass} bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400`}
            >
              {previewMode ? "← Back to Document Studio" : "← Back to Applications"}
            </Link>
          </div>
        </div>
      </div>

      {previewMode ? (
        <div className="rounded-[1.35rem] border border-emerald-300/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(17,24,39,0.28))] px-5 py-5 text-sm text-emerald-50 shadow-[0_0_38px_rgba(16,185,129,0.12)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Sample package walkthrough</p>
          <p className="mt-2 max-w-4xl leading-6 text-emerald-50/90">
            Preview mode keeps downloads and the dashboard as separate actions. Use the Step 5 finalize action to enter this dashboard, then take the packet, ZIP, interview rehearsal, refusal recovery, and supporting-document downloads from here.
          </p>
        </div>
      ) : null}

      <StatusPipeline status={application.status} />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <ApplicationHealthCard health={currentHealth} score={currentReadinessAssessment?.score ?? null} />
        <NextBestActionCard
          action={nextAction}
          href={nextActionHref}
          secondaryHref={submissionGuideHref}
          secondaryLabel="Open Smart Form Helper"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ApplicationJourney stages={currentJourney} />
        <CaseSnapshotCard
          items={snapshotItems}
          description="VisaPilot uses this snapshot to keep readiness, packet generation, Smart Form Helper, and vault actions aligned to the same case facts."
        />
      </div>

      <CaseChangePanel changes={changeImpactItems} />

      <ApplicationTimeline events={timelineEvents} />

      <VaultActionCenter
        applicationId={application.id}
        status={application.status}
        track={application.track ?? "APPLY_MYSELF"}
        actionItems={audit.fixInstructions}
        pendingAction={pendingVipAction ? { promptMessage: pendingVipAction.prompt_message, expiresAt: pendingVipAction.expires_at } : null}
        submissionGuideHref={submissionGuideHref}
        appointmentDate={application.appointment_date}
        vfsReferenceNumber={application.vfs_reference_number}
        vfsCenterLocation={application.vfs_center_location}
      />

      {initialReadinessAssessment && currentReadinessAssessment ? (
        <ReadinessProgressPanel
          initialAssessment={initialReadinessAssessment}
          currentAssessment={currentReadinessAssessment}
          applicationStatus={application.status}
          supportingDocumentCount={supportingDocumentCount}
          links={{
            identityHref: previewMode ? previewIdentityHref : "#identity-anchor",
            travelHref: previewMode ? previewTravelHref : "#packet-snapshot",
            financialHref: previewMode ? previewFinancialHref : "#financial-audit",
            accommodationHref: previewMode ? previewAccommodationHref : "#packet-snapshot",
            documentsHref: previewMode ? previewDocumentStudioHref : "#supporting-documents",
            coverLetterHref: previewMode ? previewCoverLetterHref : "#cover-letter-preview",
            submissionGuideHref,
          }}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div id="smart-form-helper" className="glass-panel p-5 sm:p-6">
          <p className="eyebrow">Print-Ready Visa Packet</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Your main packet for printing and submission</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Keep the official form, cover letter, ZIP package, and supporting documents aligned in one packet before submission.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={previewMode ? `/dashboard/${application.id}/consulate-ready-packet?preview=1` : `/dashboard/${application.id}/consulate-ready-packet`}
              className={`${actionButtonClass} bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400`}
            >
              <Download className="h-4 w-4" />
              Download Print-Ready Visa Packet (.PDF)
            </a>
            <a
              href={previewMode ? `/dashboard/${application.id}/package?preview=1` : `/dashboard/${application.id}/package`}
              className={`${actionButtonClass} border border-white/18 bg-white/10 font-semibold text-slate-50 hover:border-cyan-300/35 hover:bg-white/14`}
            >
              <Archive className="h-4 w-4" />
              Download Full Package (.zip)
            </a>
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-6">
          <p className="eyebrow">Smart Form Helper</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Fast help for the official form</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Open the field-by-field helper when you need ready-to-paste answers for the embassy portal or worksheet.
          </p>
          <Link
            href={submissionGuideHref}
            className={`${actionButtonClass} mt-5 bg-white font-semibold text-slate-950 hover:bg-slate-100`}
          >
            <ArrowRight className="h-4 w-4" />
            Open Smart Form Helper
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <div id="packet-snapshot" className="glass-panel flex flex-col p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <TintedIconBadge icon={FileText} tone={pdfStrategy.supportsNativeAutofill ? "red" : "amber"} label={pdfStrategy.supportsNativeAutofill ? "Official Form PDF" : "Application Worksheet PDF"} />
                  <h2 className="mt-4 text-xl font-semibold text-white">{pdfStrategy.supportsNativeAutofill ? "Official Visa Application Form" : "Tourist Application Worksheet"}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {pdfStrategy.supportsNativeAutofill
                      ? "Native AcroForm fields are filled and flattened for embassy submission."
                      : "The current embassy template is flat, so VisaPilot generates a clean worksheet PDF instead of a misaligned overlay. Use the print-ready visa packet as your primary print packet."}
                  </p>
                </div>
              </div>
              <div className={`mt-5 rounded-[1rem] p-4 text-sm ${pdfStrategy.supportsNativeAutofill ? "border border-emerald-400/15 bg-emerald-400/10 text-emerald-50/90" : "border border-amber-400/20 bg-amber-400/10 text-amber-50/90"}`}>
                {pdfStrategy.supportsNativeAutofill
                  ? "Generated from your locked identity, travel route, and application data."
                  : pdfStrategy.guidanceMessage}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                <a
                  href={previewMode ? `/dashboard/${application.id}/download?preview=1` : `/dashboard/${application.id}/download`}
                  className={`${actionButtonClass} bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400`}
                >
                  <Download className="h-4 w-4" />
                  {pdfStrategy.supportsNativeAutofill ? "Download Filled PDF" : "Download Application Worksheet (.PDF)"}
                </a>
                {!pdfStrategy.supportsNativeAutofill ? (
                  <a
                    href={pdfStrategy.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${actionButtonClass} border border-white/18 bg-white/10 font-semibold text-slate-50 hover:border-cyan-300/35 hover:bg-white/14`}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Open Official Form Guidance
                  </a>
                ) : null}
              </div>
            </div>

            <div className="glass-panel flex flex-col p-5">
              <TintedIconBadge icon={Sparkles} tone="indigo" label="AI Cover Letter" />
              <h2 className="mt-4 text-xl font-semibold text-white">Consular Cover Letter</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Embassy-addressed rationale statement aligned to your itinerary and return ties.</p>
              <div id="cover-letter-preview" className="mt-5 rounded-[1rem] border border-amber-200/70 bg-[#fffaf0] p-5 text-[#1b2430] shadow-[0_18px_40px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.55)]">
                <pre className="whitespace-pre-wrap font-serif text-[13px] leading-7 text-[#1b2430]">{visibleCoverLetterMarkdown}</pre>
              </div>
              <div className="mt-auto flex flex-wrap gap-3 pt-5">
                <Link
                  href="#cover-letter-preview"
                  className={`${actionButtonClass} border border-white/18 bg-white/10 font-semibold text-slate-50 hover:border-cyan-300/35 hover:bg-white/14`}
                >
                  <ArrowRight className="h-4 w-4" />
                  View Letter
                </Link>
                <a
                  href={previewMode ? `/dashboard/${application.id}/cover-letter?preview=1` : `/dashboard/${application.id}/cover-letter`}
                  className={`${actionButtonClass} bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400`}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </div>

            <div className="glass-panel flex flex-col p-5">
              <TintedIconBadge icon={ClipboardList} tone="blue" label="Consulate Checklist" />
              <h2 className="mt-4 text-xl font-semibold text-white">Submission Checklist PDF</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Provider-specific appointment checklist covering photos, passport validity, document order, bank proof, and appointment sheet.</p>
              <div className="mt-5 rounded-[1rem] border border-emerald-300/24 bg-emerald-400/16 p-4 text-sm text-emerald-50/90">
                Generated from the destination-country provider mapping and included in the full ZIP archive.
              </div>
              <div className="mt-auto flex flex-wrap gap-3 pt-5">
                <a
                  href={previewMode ? `/dashboard/${application.id}/consulate-checklist?preview=1` : `/dashboard/${application.id}/consulate-checklist`}
                  className={`${actionButtonClass} bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400`}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </div>

            <div className="glass-panel flex flex-col p-5">
              <TintedIconBadge icon={ShieldCheck} tone="emerald" label="Packet Snapshot" />
              <h2 className="mt-4 text-xl font-semibold text-white">Tourist case summary</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">A compact view of the itinerary, funding posture, and submission anchors that feed the exported packet.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 text-sm text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Travel window</p>
                  <p className="mt-2 font-semibold text-white">{application.application_data.trip.arrivalDate} to {application.application_data.trip.departureDate}</p>
                  <p className="mt-2">Entry via {application.application_data.trip.portOfEntry}</p>
                </div>
                <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 text-sm text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Funding</p>
                  <p className="mt-2 font-semibold text-white">{application.application_data.sponsor.fundingSource.replace(/_/g, " ")}</p>
                  <p className="mt-2">Available EUR {audit.availableLiquidBalanceEur.toFixed(2)}</p>
                </div>
                <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 text-sm text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Accommodation</p>
                  <p className="mt-2 font-semibold text-white">{application.application_data.trip.hotelBookingReference}</p>
                  <p className="mt-2">{application.application_data.trip.accommodations}</p>
                </div>
                <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4 text-sm text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Identity anchor</p>
                  <p className="mt-2 font-semibold text-white">{application.application_data.passport.number}</p>
                  <p className="mt-2">Application filed from {application.application_data.application.placeOfApplication}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel flex flex-col p-5">
            <TintedIconBadge icon={Archive} tone="blue" label="Print-Ready Visa Packet" />
            <h2 className="mt-4 text-xl font-semibold text-white">Print-Ready Visa Packet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Your primary print-ready packet with the normalized form, cover letter, checklist, insurance slip, interview brief, refusal decoder, and saved supporting documents.</p>
            <div className="mt-5 rounded-[1rem] border border-emerald-300/24 bg-emerald-400/16 p-4 text-sm text-emerald-50/90">
              Packet contents stay aligned with your visa dashboard and your stored supporting files.
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {packageCardItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/12 text-slate-50">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
              <a
                href={previewMode ? `/dashboard/${application.id}/consulate-ready-packet?preview=1` : `/dashboard/${application.id}/consulate-ready-packet`}
                className={`${actionButtonClass} bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400`}
              >
                <Download className="h-4 w-4" />
                Download Print-Ready Visa Packet (.PDF)
              </a>
              <a
                href={previewMode ? `/dashboard/${application.id}/package?preview=1` : `/dashboard/${application.id}/package`}
                className={`${actionButtonClass} border border-white/18 bg-white/10 font-semibold text-slate-50 hover:border-cyan-300/35 hover:bg-white/14`}
              >
                <Archive className="h-4 w-4" />
                Download Full Package (.zip)
              </a>
            </div>
          </div>

          <SupportingDocumentsVault
            applicationId={application.id}
            documents={application.application_data.supportingDocuments ?? []}
            previewMode={previewMode}
            sectionId="supporting-documents"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ConsularInterviewPanel applicant={application.application_data} downloadHref={interviewDownloadHref} />
            <RefusalDecoderPanel refusalReasonCode={application.refusal_reason_code} downloadHref={refusalDecoderDownloadHref} />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <div id="tracking-reference" className="glass-panel flex flex-col p-5">
            <TintedIconBadge icon={Link2} tone="slate" label="Tracking Reference" />
            <h2 className="mt-4 text-xl font-semibold text-white">VFS / TLS / BLS tracking</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Save the official tracking code and launch the correct portal with one click.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ConsularDeepLinks
                destinationCountry={application.destination_country}
                referenceNumber={application.vfs_reference_number}
              />
            </div>
            <div className="mt-5">
              {!previewMode ? (
                <TrackingReferenceManager
                  applicationId={application.id}
                  initialReferenceNumber={application.vfs_reference_number}
                />
              ) : (
                <div className="rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3 text-sm text-slate-200">
                  Preview mode keeps this box static. Live mode enables save and external tracking actions.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel flex flex-col p-5">
            <TintedIconBadge icon={BadgeCheck} tone={rejectionInsuranceActive ? "emerald" : "amber"} label="Rejection Insurance" />
            <h2 className="mt-4 text-xl font-semibold text-white">Premium rejection protection</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Premium tiers protect the VisaPilot fee if the checklist was followed and the consulate still returns an Annex VI refusal code, or they unlock equivalent remediation support.
            </p>
            <div className={`mt-5 rounded-[1rem] border p-4 text-sm ${rejectionInsuranceActive ? "border-emerald-300/24 bg-emerald-400/16 text-emerald-50/90" : "border-amber-300/24 bg-amber-400/12 text-amber-50/90"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`${statusPillClass} ${rejectionInsuranceActive ? "border border-emerald-300/30 bg-emerald-400/14 text-emerald-50" : "border border-amber-300/30 bg-amber-400/14 text-amber-50"}`}>
                  {rejectionInsuranceActive ? "Active" : "Not Included"}
                </span>
                <span className="text-sm font-semibold text-white">
                  {rejectionInsuranceTier ? `${rejectionInsuranceTier[0].toUpperCase()}${rejectionInsuranceTier.slice(1)} tier` : "Tier not linked yet"}
                </span>
              </div>
              <p className="mt-3 leading-6">
                {rejectionInsuranceActive
                  ? "This application is covered for refund-or-remediation support if an eligible Annex VI refusal code is issued after the checklist was followed in full."
                  : "No eligible premium tier is currently linked to this application record, so the vault shows the recovery tools without the protected-fee guarantee."}
              </p>
            </div>
          </div>

          <div id="identity-anchor" className="glass-panel p-5">
            <TintedIconBadge icon={Lock} tone="emerald" label="Identity Lock Vault" />
            <h2 className="mt-4 text-xl font-semibold text-white">Read-only session anchor</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Locked identity metadata stays non-editable once package generation binds the application.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Full name</p>
                <p className="mt-2 text-sm font-semibold text-white">{fullName}</p>
              </div>
              <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Passport number</p>
                <p className="mt-2 text-sm font-semibold text-white">{application.application_data.passport.number}</p>
              </div>
            </div>
          </div>

          <div id="financial-audit" className="glass-panel p-5">
            <TintedIconBadge icon={ShieldCheck} tone="amber" label="Financial Audit Rules" />
            <h2 className="mt-4 text-xl font-semibold text-white">Financial and profile audit</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">This summary now includes route-specific profile logic, anomaly screening, and the internal service-cost guardrail.</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4">
                Required funds EUR {audit.requiredLiquidBalanceEur.toFixed(2)}. Available EUR {audit.availableLiquidBalanceEur.toFixed(2)}.
              </div>
              <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4">
                Passport valid through {audit.passportValidThrough}. Current audit status: <span className="font-semibold text-white">{audit.status}</span>.
              </div>
              <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4">
                Profile route: <span className="font-semibold text-white">{audit.profileRoute}</span>. Transit buffer EUR {audit.transitBufferEur.toFixed(2)}.
              </div>
              <div className="rounded-[1rem] border border-white/14 bg-white/10 p-4">
                Deposit anomaly clearance: <span className="font-semibold text-white">{audit.checks.financialAnomalyClearance ? "Pass" : "Review required"}</span>. Estimated cost USD {audit.unitEconomics.maximumPotentialCostUsd.toFixed(2)} / 8.00.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}