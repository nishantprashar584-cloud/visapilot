import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripItineraryMatrixSection } from "@/lib/applications/coverLetter";
import { getInitialApplicationStatus, getSubmissionTypeForDestination } from "@/lib/applications/workflow";
import { calculateStayDurationDays } from "@/lib/applications/schema";
import {
  buildCurrentReadinessDraftFromApplicant,
  createReadinessHandoffKey,
  synchronizeApplicantReadinessContext,
} from "@/lib/case-intelligence/readiness";
import { normalizeApplicantTourismScope } from "@/lib/applications/travelPurpose";
import { generateCoverLetterMarkdown } from "@/lib/openai/generateCoverLetter";
import { calculateInclusiveGstBreakdown } from "@/lib/payments/gst";
import { getTierConfig } from "@/lib/payments/tiers";
import { generateFilledApplicationPdf } from "@/lib/pdf/generateFilledApplicationPdf";
import { lockApplicantIdentity } from "@/lib/security/identityLock";
import type { ApplicantInfo, ApplicationRow, PricingTier, ServiceTrack } from "@/types";

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

const applicationSelectColumns = "id, status, user_id, applicant_id, submission_type, track, tier, vfs_reference_number, vfs_center_location, appointment_date, applicant_name, applicant_email, destination_country, application_data, cover_letter_markdown, filled_pdf_base64, rejected_at, refusal_reason_code, recovery_status, recovery_claimed_at, privacy_purge_at, created_at, updated_at";

function mapApplicationInsertPayload(
  userId: string,
  applicant: ApplicantInfo,
  coverLetterMarkdown: string,
  filledPdfBase64: string,
  selection: {
    track: ServiceTrack;
    tier: PricingTier;
  },
) {
  const pricing = getTierConfig(selection.tier, selection.track);
  const tax = calculateInclusiveGstBreakdown(pricing.gstInclusiveAmountInr);

  return {
    status: getInitialApplicationStatus(selection.track),
    user_id: userId,
    applicant_id: "",
    submission_type: getSubmissionTypeForDestination(applicant.trip.destinationCountry),
    track: selection.track,
    tier: selection.tier.toUpperCase(),
    total_amount_inr: pricing.gstInclusiveAmountInr,
    gst_amount_inr: tax.gstAmountInr,
    applicant_name: `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim(),
    applicant_email: applicant.contact.email,
    destination_country: applicant.trip.destinationCountry,
    application_data: applicant,
    cover_letter_markdown: coverLetterMarkdown,
    filled_pdf_base64: filledPdfBase64,
  };
}

async function findExistingApplicationForHandoff(
  supabase: SupabaseClient,
  userId: string,
  applicant: ApplicantInfo,
  selection: {
    track: ServiceTrack;
    tier: PricingTier;
  },
): Promise<ApplicationRow | null> {
  const handoffKey = createReadinessHandoffKey(applicant, selection);

  if (!handoffKey) {
    return null;
  }

  const { data, error } = await supabase
    .from("applications")
    .select(applicationSelectColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error || !Array.isArray(data)) {
    return null;
  }

  const existingApplication = (data as ApplicationRow[]).find((row) => {
    const existingHandoffKey = row.application_data.caseContext?.handoffKey;
    return existingHandoffKey === handoffKey;
  });

  return existingApplication ?? null;
}

export async function generateApplicationPackage(
  supabase: SupabaseClient,
  applicant: ApplicantInfo,
  owner: {
    userId: string;
    userEmail: string;
    coverLetterMarkdown?: string;
    track: ServiceTrack;
    tier: PricingTier;
  },
): Promise<{
  application: ApplicationRow;
  filledPdfBuffer: Buffer;
  coverLetterMarkdown: string;
}> {
  if (applicant.caseContext && !buildCurrentReadinessDraftFromApplicant(applicant)) {
    throw new Error("Invalid readiness handoff payload.");
  }

  const normalizedApplicant = synchronizeApplicantReadinessContext(
    normalizeApplicantInfo(applicant),
    {
      track: owner.track,
      tier: owner.tier,
    },
  );

  const existingApplication = await findExistingApplicationForHandoff(
    supabase,
    owner.userId,
    normalizedApplicant,
    {
      track: owner.track,
      tier: owner.tier,
    },
  );

  if (existingApplication) {
    return {
      application: existingApplication,
      filledPdfBuffer: Buffer.from(existingApplication.filled_pdf_base64, "base64"),
      coverLetterMarkdown: existingApplication.cover_letter_markdown,
    };
  }

  const coverLetterMarkdown = owner.coverLetterMarkdown?.trim().length
    ? stripItineraryMatrixSection(owner.coverLetterMarkdown.trim())
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
          {
            track: owner.track,
            tier: owner.tier,
          },
        ),
        applicant_id: applicantId,
      },
    )
    .select(applicationSelectColumns)
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