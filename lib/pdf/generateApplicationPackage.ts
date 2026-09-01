import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateStayDurationDays } from "@/lib/applications/schema";
import { normalizeApplicantTourismScope } from "@/lib/applications/travelPurpose";
import { generateCoverLetterMarkdown } from "@/lib/openai/generateCoverLetter";
import { generateFilledApplicationPdf } from "@/lib/pdf/generateFilledApplicationPdf";
import { lockApplicantIdentity } from "@/lib/security/identityLock";
import type { ApplicantInfo, ApplicationRow } from "@/types";

function normalizeApplicantInfo(applicant: ApplicantInfo): ApplicantInfo {
  const stayDurationDays = calculateStayDurationDays(
    applicant.trip.arrivalDate,
    applicant.trip.departureDate,
  );

  const tourismScopedApplicant = normalizeApplicantTourismScope(applicant);

  return {
    ...tourismScopedApplicant,
    trip: {
      ...tourismScopedApplicant.trip,
      memberStatesToVisit:
        tourismScopedApplicant.trip.memberStatesToVisit.length > 0
          ? tourismScopedApplicant.trip.memberStatesToVisit
          : [tourismScopedApplicant.trip.destinationCountry],
      stayDurationDays,
    },
  };
}

function mapApplicationInsertPayload(
  userId: string,
  applicant: ApplicantInfo,
  coverLetterMarkdown: string,
  filledPdfBase64: string,
) {
  return {
    status: "draft",
    user_id: userId,
    applicant_id: "",
    applicant_name: `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim(),
    applicant_email: applicant.contact.email,
    destination_country: applicant.trip.destinationCountry,
    application_data: applicant,
    cover_letter_markdown: coverLetterMarkdown,
    filled_pdf_base64: filledPdfBase64,
  };
}

export async function generateApplicationPackage(
  supabase: SupabaseClient,
  applicant: ApplicantInfo,
  owner: {
    userId: string;
    userEmail: string;
    coverLetterMarkdown?: string;
  },
): Promise<{
  application: ApplicationRow;
  filledPdfBuffer: Buffer;
  coverLetterMarkdown: string;
}> {
  const normalizedApplicant = normalizeApplicantInfo(applicant);
  const coverLetterMarkdown = owner.coverLetterMarkdown?.trim().length
    ? owner.coverLetterMarkdown.trim()
    : await generateCoverLetterMarkdown(normalizedApplicant);
  const filledPdfBuffer = await generateFilledApplicationPdf(normalizedApplicant);

  const { error: userUpsertError } = await supabase.from("users").upsert(
    {
      id: owner.userId,
      email: owner.userEmail,
    },
    { onConflict: "id" },
  );

  if (userUpsertError) {
    throw new Error(userUpsertError.message);
  }

  const applicantId = await lockApplicantIdentity(
    supabase,
    owner.userId,
    normalizedApplicant,
  );

  const { data, error } = await supabase
    .from("applications")
    .insert(
      {
        ...mapApplicationInsertPayload(
          owner.userId,
          normalizedApplicant,
          coverLetterMarkdown,
          filledPdfBuffer.toString("base64"),
        ),
        applicant_id: applicantId,
      },
    )
    .select("id, status, user_id, applicant_id, vfs_reference_number, applicant_name, applicant_email, destination_country, application_data, cover_letter_markdown, filled_pdf_base64, rejected_at, refusal_reason_code, recovery_status, recovery_claimed_at, privacy_purge_at, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save application package.");
  }

  return {
    application: data as ApplicationRow,
    filledPdfBuffer,
    coverLetterMarkdown,
  };
}