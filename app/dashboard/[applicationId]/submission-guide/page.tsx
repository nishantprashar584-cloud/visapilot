import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SubmissionGuideDrawer } from "@/components/dashboard/SubmissionGuideDrawer";
import { buildSubmissionGuideFields, buildSubmissionGuideInstructions } from "@/lib/applications/submissionGuide";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { getPreviewApplication } from "@/lib/mock/applications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationRow } from "@/types";

export const dynamic = "force-dynamic";

async function getApplication(supabase: SupabaseClient, applicationId: string): Promise<ApplicationRow | null> {
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

export default async function SubmissionGuidePage({
  params,
  searchParams,
}: {
  params: { applicationId: string };
  searchParams?: { preview?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const account = await getAuthenticatedAccount();

  if (!account && !previewMode) {
    redirect(buildAuthRedirectPath(`/dashboard/${params.applicationId}/submission-guide`));
  }

  const application = previewMode
    ? getPreviewApplication(params.applicationId)
    : await getApplication(createSupabaseServerClient(), params.applicationId);

  if (!application) {
    notFound();
  }

  const fields = buildSubmissionGuideFields(application.application_data);
  const instructions = buildSubmissionGuideInstructions(application.destination_country, application.submission_type ?? "PAPER_PDF");

  return (
    <section className="w-full px-4 py-4 sm:px-6 lg:px-8">
      <SubmissionGuideDrawer
        title={`${application.applicant_name} Smart Form Helper`}
        destinationCountry={application.destination_country}
        submissionType={application.submission_type ?? "PAPER_PDF"}
        instructions={instructions}
        fields={fields}
      />
    </section>
  );
}