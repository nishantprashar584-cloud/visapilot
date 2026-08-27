import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { ApplicationStatusBadge } from "@/components/dashboard/ApplicationStatusBadge";
import { ConsularDeepLinks } from "@/components/dashboard/ConsularDeepLinks";
import { DashboardAutoRefresh } from "@/components/dashboard/DashboardAutoRefresh";
import { PrivacyCountdownBadge } from "@/components/dashboard/PrivacyCountdownBadge";
import { ProcessingTimeline } from "@/components/dashboard/ProcessingTimeline";
import { RecoveryTriggerModal } from "@/components/dashboard/RecoveryTriggerModal";
import { RiskAuditCard } from "@/components/dashboard/RiskAuditCard";
import { TrackingReferenceManager } from "@/components/dashboard/TrackingReferenceManager";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { previewApplications } from "@/lib/mock/applications";
import { canReapplyForFree, getPrivacyCountdownDays, getProcessingProgress, runRiskAudit } from "@/lib/riskAudit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationRow, PricingTier, UserRow } from "@/types";

export const dynamic = "force-dynamic";

const previewChecklist = [
  "Fill the application step by step.",
  "Review the risk check and missing evidence.",
  "Download the packet and save the tracking reference.",
] as const;

function getDisplayStatus(application: ApplicationRow): ApplicationRow["status"] {
  if (application.recovery_status === "CLAIMED" && application.status === "rejected") {
    return "reapplied";
  }

  return application.status;
}

async function getDashboardData(userId?: string): Promise<{
  user: UserRow | null;
  applications: ApplicationRow[];
}> {
  if (!userId) {
    return {
      user: null,
      applications: [],
    };
  }

  const supabase = createSupabaseServerClient();
  const [{ data: user }, { data: applications }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, credits, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("id, status, user_id, applicant_id, vfs_reference_number, applicant_name, applicant_email, destination_country, application_data, cover_letter_markdown, filled_pdf_base64, rejected_at, refusal_reason_code, recovery_status, recovery_claimed_at, privacy_purge_at, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    user: (user as UserRow | null) ?? null,
    applications: (applications as ApplicationRow[] | null) ?? [],
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { checkout?: string; tier?: PricingTier; preview?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const account = await getAuthenticatedAccount();

  if (!account && !previewMode) {
    redirect(buildAuthRedirectPath("/dashboard"));
  }

  const { user, applications } = account
    ? await getDashboardData(account.id)
    : { user: null, applications: [] };
  const paymentSucceeded = searchParams?.checkout === "success";
  const visibleApplications = previewMode ? previewApplications : applications;
  const latestApplication = visibleApplications[0] ?? null;
  const latestAudit = latestApplication ? runRiskAudit(latestApplication.application_data) : null;
  const accountLabel = account?.email ?? "preview@visapilot.app";

  return (
    <section className="w-full space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
      <DashboardAutoRefresh />
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-black/80 p-4 sm:p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Your visa applications
          </h1>
          <p className="text-sm text-slate-300">
            {previewMode
              ? "Preview mode shows realistic sample applications so you can review the layout before signing in."
              : `Signed in as ${accountLabel}. This page keeps only the packet, tracking, and next action in view.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-full border border-white/10 bg-[#0f0f0f] px-4 py-2 text-sm text-slate-300">
            {previewMode ? "3 sample applications" : `${visibleApplications.length} application${visibleApplications.length === 1 ? "" : "s"}`}
          </div>
          <div className="rounded-full border border-white/10 bg-[#0f0f0f] px-4 py-2 text-sm text-slate-300">
            {latestAudit ? `Latest risk: ${latestAudit.status}` : `Credits: ${user?.credits ?? 0}`}
          </div>
          <Link
            href={previewMode ? "/apply?preview=1" : "/apply"}
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Start new package
          </Link>
        </div>
      </div>

      {paymentSucceeded ? (
        <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/12 px-5 py-4 text-sm font-medium text-emerald-100">
          Payment completed. Credits are applied through the Stripe webhook after signature verification.
        </div>
      ) : null}

      {previewMode ? (
        <div className="grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/70 p-5 sm:grid-cols-3">
          {previewChecklist.map((item, index) => (
            <div key={item} className="rounded-[1rem] border border-white/10 bg-[#0f0f0f] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Step 0{index + 1}</p>
              <p className="mt-2 text-sm text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Applications</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Recent application packages</h2>
            <p className="mt-2 text-sm text-slate-400">Each row shows only the status, privacy window, tracking state, and next useful action.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {visibleApplications.length === 0 ? (
            <div className="rounded-[1.2rem] border border-white/10 bg-[#0f0f0f] p-6 text-center">
              <FolderOpen className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-lg font-semibold text-white">No applications yet.</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Start your first Schengen visa. After submission, this page will show your applicant name, destination, risk check, privacy countdown, tracking reference, and downloads.
              </p>
              <Link
                href={previewMode ? "/apply?preview=1" : "/apply"}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Build first application
              </Link>
            </div>
          ) : (
            visibleApplications.map((application) => {
              const displayStatus = getDisplayStatus(application);
              const audit = runRiskAudit(application.application_data);
              const processingProgress = getProcessingProgress(application.created_at);
              const privacyCountdownDays = getPrivacyCountdownDays(application.privacy_purge_at);
              const detailsHref = previewMode
                ? `/dashboard/${application.id}?preview=1`
                : `/dashboard/${application.id}`;

              return (
                <div key={application.id} className="glass-card overflow-hidden p-5">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xl font-semibold text-white">{application.applicant_name}</p>
                          <ApplicationStatusBadge status={displayStatus} />
                          <PrivacyCountdownBadge daysRemaining={privacyCountdownDays} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            <CountryFlag country={application.destination_country} />
                            {application.destination_country}
                          </span>
                          <span>{application.application_data.trip.purpose.replace(/_/g, " ")}</span>
                          <span>submitted {new Date(application.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link href={detailsHref} className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#121212] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30">
                          View packet
                        </Link>
                        {!previewMode ? (
                          <Link href={`/dashboard/${application.id}/package`} className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                            Download ZIP
                          </Link>
                        ) : null}
                        {!previewMode ? (
                          <RecoveryTriggerModal
                            applicationId={application.id}
                            disabled={!canReapplyForFree(application)}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-[1rem] border border-white/10 bg-[#111111] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Stay</p>
                        <p className="mt-1 text-sm font-semibold text-white">{application.application_data.trip.stayDurationDays} days</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-[#111111] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Funds check</p>
                        <p className="mt-1 text-sm font-semibold text-white">EUR {audit.requiredLiquidBalanceEur.toFixed(0)} needed</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-[#111111] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Tracking</p>
                        <p className="mt-1 text-sm font-semibold text-white">{application.vfs_reference_number ?? "Not saved yet"}</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-[#111111] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Next action</p>
                        <p className="mt-1 text-sm font-semibold text-white">{application.vfs_reference_number ? "Track the case" : "Save tracking reference"}</p>
                      </div>
                    </div>

                    <ProcessingTimeline progress={processingProgress} />

                    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-[1.1rem] border border-white/10 bg-[#0f0f0f] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tracking and portal</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <ConsularDeepLinks
                            destinationCountry={application.destination_country}
                            referenceNumber={application.vfs_reference_number}
                          />
                          {!previewMode ? (
                            <Link href={`/dashboard/${application.id}/download`} className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#121212] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30">
                              Download PDF
                            </Link>
                          ) : null}
                        </div>
                        {!previewMode ? (
                          <div className="mt-4">
                            <TrackingReferenceManager
                              applicationId={application.id}
                              initialReferenceNumber={application.vfs_reference_number}
                            />
                          </div>
                        ) : (
                          <p className="mt-4 text-sm leading-6 text-slate-300">In live mode, the user saves the VFS, TLScontact, or BLS tracking reference here and opens the correct provider with one click.</p>
                        )}
                      </div>

                      <RiskAuditCard audit={audit} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}