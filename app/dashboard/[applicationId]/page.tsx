import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  FileText,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationStatusBadge } from "@/components/dashboard/ApplicationStatusBadge";
import { ConsularDeepLinks } from "@/components/dashboard/ConsularDeepLinks";
import { PrivacyCountdownBadge } from "@/components/dashboard/PrivacyCountdownBadge";
import { SupportingDocumentsVault } from "@/components/dashboard/SupportingDocumentsVault";
import { TrackingReferenceManager } from "@/components/dashboard/TrackingReferenceManager";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { TintedIconBadge } from "@/components/ui/TintedIconBadge";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { getPreviewApplication } from "@/lib/mock/applications";
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
  const privacyCountdownDays = getPrivacyCountdownDays(application.privacy_purge_at);
  const fullName = `${application.application_data.personal.firstName} ${application.application_data.personal.lastName}`.trim();

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
        <div className="rounded-[1.2rem] border border-white/10 bg-black/70 px-5 py-4 text-sm text-slate-200">
          Preview mode is showing a realistic sample package layout with sample applicant data, sample cover letter text, and the same sections a live user will use.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <TintedIconBadge icon={FileText} tone="red" label="Official Form PDF" />
              <h2 className="mt-4 text-xl font-semibold text-white">Schengen Application Form</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">37 fields filled and flattened for embassy submission.</p>
            </div>
          </div>
          <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Generated from your locked identity, travel route, and application data.
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!previewMode ? (
              <Link
                href={`/dashboard/${application.id}/download`}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Download Filled PDF
              </Link>
            ) : (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                Preview-only action state
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={Sparkles} tone="indigo" label="AI Cover Letter" />
          <h2 className="mt-4 text-xl font-semibold text-white">Consular Cover Letter</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Embassy-addressed rationale statement aligned to your itinerary and return ties.</p>
          <div id="cover-letter-preview" className="mt-5 rounded-[1rem] border border-white/10 bg-white/5 p-4">
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
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.45rem] border border-white/10 bg-black/80 p-5 shadow-panel">
          <TintedIconBadge icon={Archive} tone="blue" label="Full Packet Archive" />
          <h2 className="mt-4 text-xl font-semibold text-white">Complete Embassy Submission ZIP</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Includes the PDF, cover letter, checklist, insurance slip, and saved supporting documents.</p>
          <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Packet contents stay aligned with the dashboard vault and your stored supporting files.
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!previewMode ? (
              <Link
                href={`/dashboard/${application.id}/package`}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Download Full Package (.zip)
              </Link>
            ) : (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                Preview-only action state
              </span>
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
          <h2 className="mt-4 text-xl font-semibold text-white">Static audit summary</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Status is informational only here. It does not trigger actions from the vault.</p>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              Required funds EUR {audit.requiredLiquidBalanceEur.toFixed(2)}. Available EUR {audit.availableLiquidBalanceEur.toFixed(2)}.
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
              Passport valid through {audit.passportValidThrough}. Current audit status: <span className="font-semibold text-white">{audit.status}</span>.
            </div>
          </div>
        </div>
      </div>

      <SupportingDocumentsVault
        applicationId={application.id}
        documents={application.application_data.supportingDocuments ?? []}
        previewMode={previewMode}
      />
    </section>
  );
}