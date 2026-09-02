import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripItineraryMatrixSection } from "@/lib/applications/coverLetter";
import { buildFinancialAuditReport, buildInsuranceVerificationSlip } from "@/lib/applications/packetArtifacts";
import { strictDocumentSequence } from "@/lib/applications/consularPolicy";
import { supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { generateConsulateReadyPacket } from "@/lib/pdf/generateConsulateReadyPacket";
import { generateFilledApplicationPdf } from "@/lib/pdf/generateFilledApplicationPdf";
import { generateChecklistPdf } from "@/lib/pdf/generateChecklistPdf";
import type { PacketManifestEntry } from "@/lib/pdf/generateConsulateReadyPacket";
import { generateTextPdf } from "@/lib/pdf/generateTextPdf";
import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export type PacketApplicationData = {
  id: string;
  vfs_reference_number?: string | null;
  application_data: ApplicantInfo;
  cover_letter_markdown: string;
  filled_pdf_base64: string | null;
  refusal_reason_code: RefusalReasonCode | null;
};

function formatTravelWindow(applicant: ApplicantInfo): string {
  const arrival = applicant.trip.arrivalDate || "Pending arrival";
  const departure = applicant.trip.departureDate || "Pending departure";
  return `${arrival} to ${departure}`;
}

function buildManifestEntries(args: {
  applicant: ApplicantInfo;
  packetSections: Array<{ title: string; bytes: Uint8Array | Buffer; mimeType: string }>;
}): PacketManifestEntry[] {
  const { applicant, packetSections } = args;

  return packetSections.map((section, index) => {
    if (index === 0) {
      return {
        label: section.title,
        detail: `${applicant.trip.destinationCountry} application output, passport ${applicant.passport.number}, place of application ${applicant.application.placeOfApplication || "Pending"}.`,
      };
    }

    if (section.title === strictDocumentSequence[3]) {
      return {
        label: section.title,
        detail: `Embassy-facing itinerary narrative for ${formatTravelWindow(applicant)} with booking reference ${applicant.trip.hotelBookingReference || "pending"}.`,
      };
    }

    if (section.title === strictDocumentSequence[6]) {
      return {
        label: section.title,
        detail: "Travel medical insurance confirmation aligned to the submitted trip window.",
      };
    }

    if (section.title === strictDocumentSequence[7]) {
      return {
        label: section.title,
        detail: `Declared accessible funds EUR ${applicant.employment.savingsBalanceEur.toFixed(0)} and monthly income EUR ${applicant.employment.monthlyIncomeEur.toFixed(0)}.`,
      };
    }

    if (/^Supporting Document - /.test(section.title)) {
      return {
        label: section.title,
        detail: section.mimeType === "application/pdf" ? "Uploaded supporting PDF normalized into the final packet order." : "Uploaded supporting image normalized into the final packet order.",
      };
    }

    return {
      label: section.title,
      detail: "Normalized to A4 portrait and sequenced for counter review.",
    };
  });
}

export async function buildConsulateReadyPacketPdf(args: {
  applicationData: PacketApplicationData;
  supabase?: SupabaseClient | null;
}): Promise<Uint8Array> {
  const { applicationData, supabase } = args;
  const pdfStrategy = await resolvePdfGenerationStrategy(
    applicationData.application_data.trip.destinationCountry,
  );
  const coverLetterMarkdown = stripItineraryMatrixSection(applicationData.cover_letter_markdown);
  const filledPdfBuffer = pdfStrategy.supportsNativeAutofill && applicationData.filled_pdf_base64
    ? Buffer.from(applicationData.filled_pdf_base64, "base64")
    : await generateFilledApplicationPdf(applicationData.application_data);
  const coverLetterPdf = await generateTextPdf(coverLetterMarkdown);
  const checklistPdf = await generateChecklistPdf(applicationData.application_data);
  const financialAuditPdf = await generateTextPdf(buildFinancialAuditReport(applicationData.application_data));
  const insuranceSlipPdf = await generateTextPdf(buildInsuranceVerificationSlip(applicationData.application_data));
  const packetSections: Array<{ title: string; bytes: Uint8Array | Buffer; mimeType: string }> = [
    { title: strictDocumentSequence[1], bytes: filledPdfBuffer, mimeType: "application/pdf" },
    { title: strictDocumentSequence[3], bytes: coverLetterPdf, mimeType: "application/pdf" },
    { title: strictDocumentSequence[6], bytes: insuranceSlipPdf, mimeType: "application/pdf" },
    { title: strictDocumentSequence[7], bytes: financialAuditPdf, mimeType: "application/pdf" },
    { title: strictDocumentSequence[10], bytes: checklistPdf, mimeType: "application/pdf" },
  ];

  if (supabase && Array.isArray(applicationData.application_data.supportingDocuments) && applicationData.application_data.supportingDocuments.length > 0) {
    for (const document of applicationData.application_data.supportingDocuments) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from(supportingDocumentsBucket)
        .download(document.storagePath);

      if (fileError || !fileData) {
        continue;
      }

      const bytes = await fileData.arrayBuffer();
      packetSections.push({
        title: `Supporting Document - ${document.fileName}`,
        bytes: new Uint8Array(bytes),
        mimeType: document.mimeType,
      });
    }
  }

  return generateConsulateReadyPacket(packetSections, {
    title: strictDocumentSequence[0],
    destinationCountry: applicationData.application_data.trip.destinationCountry,
    applicantName: `${applicationData.application_data.personal.firstName} ${applicationData.application_data.personal.lastName}`.trim(),
    passportNumber: applicationData.application_data.passport.number || "Pending passport number",
    travelWindow: formatTravelWindow(applicationData.application_data),
    placeOfApplication: applicationData.application_data.application.placeOfApplication || "Pending",
    vfsTrackingReference: applicationData.vfs_reference_number?.trim() || "Pending issuance",
    generatedAtLabel: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    manifestEntries: buildManifestEntries({
      applicant: applicationData.application_data,
      packetSections,
    }),
  });
}