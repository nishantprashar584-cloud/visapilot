import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateStayDurationDays } from "@/lib/applications/schema";
import { generateCoverLetterMarkdown } from "@/lib/openai/generateCoverLetter";
import { fillSchengenForm } from "@/lib/pdf/fillSchengenForm";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { lockApplicantIdentity } from "@/lib/security/identityLock";
import type { ApplicantInfo, ApplicationRow } from "@/types";

async function readPdfTemplate(templatePath: string): Promise<Buffer> {
  const resolvedPath = path.resolve(process.cwd(), templatePath);

  try {
    return await readFile(resolvedPath);
  } catch {
    throw new Error(
      `Official template missing at ${templatePath}. Add the embassy PDF under public/templates before generating this packet.`,
    );
  }
}

function normalizeApplicantInfo(applicant: ApplicantInfo): ApplicantInfo {
  const stayDurationDays = calculateStayDurationDays(
    applicant.trip.arrivalDate,
    applicant.trip.departureDate,
  );

  return {
    ...applicant,
    trip: {
      ...applicant.trip,
      memberStatesToVisit:
        applicant.trip.memberStatesToVisit.length > 0
          ? applicant.trip.memberStatesToVisit
          : [applicant.trip.destinationCountry],
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
  const pdfStrategy = await resolvePdfGenerationStrategy(
    normalizedApplicant.trip.destinationCountry,
  );
  const templateBytes = await readPdfTemplate(pdfStrategy.templatePath);
  const filledPdfBuffer = await fillSchengenForm(
    normalizedApplicant,
    pdfStrategy.pdfMap,
    templateBytes,
  );

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