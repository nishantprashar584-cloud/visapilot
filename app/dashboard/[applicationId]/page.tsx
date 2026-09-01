import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  ClipboardList,
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
import { SupportingDocumentsVault } from "@/components/dashboard/SupportingDocumentsVault";
import { TrackingReferenceManager } from "@/components/dashboard/TrackingReferenceManager";
import { ConsularInterviewPanel } from "@/components/insights/ConsularInterviewPanel";
import { RefusalDecoderPanel } from "@/components/insights/RefusalDecoderPanel";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { TintedIconBadge } from "@/components/ui/TintedIconBadge";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { getPreviewApplication } from "@/lib/mock/applications";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { getPrivacyCountdownDays, runRiskAudit } from "@/lib/riskAudit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationRow } from "@/types";

export const dynamic = "force-dynamic";

async function getApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<ApplicationRow | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, status, user_id, applicant_id, vfs_reference_number, applicant_name, applicant_email, destination_country, application_data, cover_letter_markdown, filled_pdf_base64, rejected_at, refusal_reason_code, recovery_status, recovery_claimed_at, privacy_purge_at, created_at, updated_at")
    .eq("id", applicationId)
    .single();

  if (error) {
    return null;
  }

  return data as ApplicationRow;
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

  const audit = runRiskAudit(application.application_data);
  const pdfStrategy = await resolvePdfGenerationStrategy(application.destination_country);
  const privacyCountdownDays = getPrivacyCountdownDays(application.privacy_purge_at);
  const fullName = `${application.application_data.personal.firstName} ${application.application_data.personal.lastName}`.trim();
  const interviewDownloadHref = previewMode
    ? `/dashboard/${application.id}/interview-simulator?preview=1`
    : `/dashboard/${application.id}/interview-simulator`;
  const refusalDecoderDownloadHref = previewMode
    ? `/dashboard/${application.id}/refusal-decoder?preview=1`
    : `/dashboard/${application.id}/refusal-decoder`;
  const packageCardItems = [
    { label: "Interview rehearsal brief", detail: "Risk-targeted voice and text prompts prepared for consular questions.", icon: Mic },
    { label: "Refusal recovery brief", detail: "Annex VI refusal-code remediation stays packaged with the file.", icon: RotateCcw },
  ] as const;
  const completionItems = [
    { label: "Application PDF ready", detail: "Form flattened and prepared for embassy submission", icon: FileText },
    { label: "AI cover letter ready", detail: "Consular narrative aligned to itinerary and ties", icon: Sparkles },
    { label: "Supporting packet saved", detail: "Uploaded evidence stays attached to this case", icon: Archive },
    { label: "Vault ready to track", detail: "Status, privacy window, and tracking live in one place", icon: BadgeCheck },
  ] as const;

  return (
    <section className="w-full space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.8rem] border border-white/10 bg-black/80 p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              </span>
              <p className="eyebrow">Document Toolkit & Download Vault</p>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              {application.applicant_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Application ID: {application.id.slice(0, 8)}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <CountryFlag country={application.destination_country} />
                Destination: {application.destination_country}
              </span>
              <PrivacyCountdownBadge daysRemaining={privacyCountdownDays} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ApplicationStatusBadge status={application.status} />
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              Audit {audit.status}
            </span>
            {previewMode ? (
              <Link
                href="/apply?preview=1"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Open builder preview
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {previewMode ? (
        <div className="space-y-4 rounded-[1.35rem] border border-emerald-400/15 bg-emerald-400/10 px-5 py-5 text-sm text-emerald-50">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Sample package walkthrough</p>
            <p className="mt-2 leading-6 text-emerald-50/90">
              Preview mode shows the same vault structure a live applicant sees after package generation, with the main outputs separated into clear actions.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            {completionItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/12 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.18),0_0_24px_rgba(16,185,129,0.2)]">
                      <span className="absolute inset-0 rounded-full bg-emerald-300/20 animate-pulse" />
                      <Icon className="relative h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Complete {index + 1}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-50/80">{item.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-4">
        {completionItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <span className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.14),0_0_20px_rgba(16,185,129,0.16)]">
                  <span className="absolute inset-0 rounded-full bg-emerald-300/20 animate-pulse" />
                  <Icon className="relative h-4 w-4" />
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <TintedIconBadge icon={FileText} tone={pdfStrategy.supportsNativeAutofill ? "red" : "amber"} label={pdfStrategy.supportsNativeAutofill ? "Official Form PDF" : "Form Draft PDF"} />
              <h2 className="mt-4 text-xl font-semibold text-white">{pdfStrategy.supportsNativeAutofill ? "Schengen Application Form" : "Schengen Form Draft"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {pdfStrategy.supportsNativeAutofill
                  ? "Native AcroForm fields are filled and flattened for embassy submission."
                  : "The current embassy template is flat, so this file is a structured overlay draft for review. Use the master VFS bundle as the primary print packet."}
              </p>
            </div>
          </div>
          <div className={`mt-5 rounded-[1rem] p-4 text-sm ${pdfStrategy.supportsNativeAutofill ? "border border-emerald-400/15 bg-emerald-400/10 text-emerald-50/90" : "border border-amber-400/20 bg-amber-400/10 text-amber-50/90"}`}>
            {pdfStrategy.supportsNativeAutofill
              ? "Generated from your locked identity, travel route, and application data."
              : pdfStrategy.guidanceMessage}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!previewMode ? (
              <Link
                href={`/dashboard/${application.id}/download`}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {pdfStrategy.supportsNativeAutofill ? "Download Filled PDF" : "Download Form Draft (.PDF)"}
              </Link>
            ) : (
              <Link
                href={`/dashboard/${application.id}/download?preview=1`}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {pdfStrategy.supportsNativeAutofill ? "Download Filled PDF" : "Download Form Draft (.PDF)"}
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={Sparkles} tone="indigo" label="AI Cover Letter" />
          <h2 className="mt-4 text-xl font-semibold text-white">Consular Cover Letter</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Embassy-addressed rationale statement aligned to your itinerary and return ties.</p>
          <div id="cover-letter-preview" className="mt-5 rounded-[1rem] border border-white/10 bg-black/20 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{application.cover_letter_markdown}</pre>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="#cover-letter-preview"
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#121212] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30"
            >
              View Letter
            </Link>
            {!previewMode ? (
              <Link
                href={`/dashboard/${application.id}/cover-letter`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Download PDF
              </Link>
            ) : (
              <Link
                href={`/dashboard/${application.id}/cover-letter?preview=1`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Download PDF
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={ClipboardList} tone="blue" label="Consulate Checklist" />
          <h2 className="mt-4 text-xl font-semibold text-white">Submission Checklist PDF</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Provider-specific appointment checklist covering photos, passport validity, document order, bank proof, and appointment sheet.</p>
          <div className="mt-5 rounded-[1rem] border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm text-emerald-50/90">
            Generated from the destination-country provider mapping and included in the full ZIP archive.
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {!previewMode ? (
              <Link
                href={`/dashboard/${application.id}/consulate-checklist`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Download PDF
              </Link>
            ) : (
              <Link
                href={`/dashboard/${application.id}/consulate-checklist?preview=1`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Download PDF
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={Archive} tone="blue" label="Master Bundle" />
          <h2 className="mt-4 text-xl font-semibold text-white">Master VFS Bundle</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Your primary print-ready packet with the normalized form, cover letter, checklist, insurance slip, interview brief, refusal decoder, and saved supporting documents.</p>
          <div className="mt-5 rounded-[1rem] border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm text-emerald-50/90">
            Packet contents stay aligned with the dashboard vault and your stored supporting files.
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {packageCardItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-slate-100">
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
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!previewMode ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/dashboard/${application.id}/consulate-ready-packet`}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Download Master VFS Bundle (.PDF)
                </Link>
                <Link
                  href={`/dashboard/${application.id}/package`}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#121212] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
                >
                  Download Full Package (.zip)
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/dashboard/${application.id}/consulate-ready-packet?preview=1`}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Download Master VFS Bundle (.PDF)
                </Link>
                <Link
                  href={`/dashboard/${application.id}/package?preview=1`}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#121212] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
                >
                  Download Full Package (.zip)
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={Link2} tone="slate" label="Tracking Reference" />
          <h2 className="mt-4 text-xl font-semibold text-white">VFS / TLS / BLS tracking</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Save the official tracking code and launch the correct portal with one click.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
              <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Preview mode keeps this box static. Live mode enables save and external tracking actions.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={Lock} tone="emerald" label="Identity Lock Vault" />
          <h2 className="mt-4 text-xl font-semibold text-white">Read-only session anchor</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Locked identity metadata stays non-editable once package generation binds the application.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Full name</p>
              <p className="mt-2 text-sm font-semibold text-white">{fullName}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Passport number</p>
              <p className="mt-2 text-sm font-semibold text-white">{application.application_data.passport.number}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={ShieldCheck} tone="amber" label="Financial Audit Rules" />
          <h2 className="mt-4 text-xl font-semibold text-white">Financial and profile audit</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">This summary now includes route-specific profile logic, anomaly screening, and the internal service-cost guardrail.</p>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              Required funds EUR {audit.requiredLiquidBalanceEur.toFixed(2)}. Available EUR {audit.availableLiquidBalanceEur.toFixed(2)}.
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              Passport valid through {audit.passportValidThrough}. Current audit status: <span className="font-semibold text-white">{audit.status}</span>.
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              Profile route: <span className="font-semibold text-white">{audit.profileRoute}</span>. Transit buffer EUR {audit.transitBufferEur.toFixed(2)}.
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              Deposit anomaly clearance: <span className="font-semibold text-white">{audit.checks.financialAnomalyClearance ? "Pass" : "Review required"}</span>. Estimated cost USD {audit.unitEconomics.maximumPotentialCostUsd.toFixed(2)} / 8.00.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConsularInterviewPanel applicant={application.application_data} downloadHref={interviewDownloadHref} />
        <RefusalDecoderPanel refusalReasonCode={application.refusal_reason_code} downloadHref={refusalDecoderDownloadHref} />
      </div>

      <SupportingDocumentsVault
        applicationId={application.id}
        documents={application.application_data.supportingDocuments ?? []}
        previewMode={previewMode}
      />
    </section>
  );
}