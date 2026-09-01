import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFinancialAuditReport, buildInsuranceVerificationSlip } from "@/lib/applications/packetArtifacts";
import { strictDocumentSequence } from "@/lib/applications/consularPolicy";
import { supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { generateConsulateReadyPacket } from "@/lib/pdf/generateConsulateReadyPacket";
import { generateFilledApplicationPdf } from "@/lib/pdf/generateFilledApplicationPdf";
import { generateChecklistPdf } from "@/lib/pdf/generateChecklistPdf";
import { generateTextPdf } from "@/lib/pdf/generateTextPdf";
import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export type PacketApplicationData = {
  id: string;
  application_data: ApplicantInfo;
  cover_letter_markdown: string;
  filled_pdf_base64: string | null;
  refusal_reason_code: RefusalReasonCode | null;
};

export async function buildConsulateReadyPacketPdf(args: {
  applicationData: PacketApplicationData;
  supabase?: SupabaseClient | null;
}): Promise<Uint8Array> {
  const { applicationData, supabase } = args;
  const pdfStrategy = await resolvePdfGenerationStrategy(
    applicationData.application_data.trip.destinationCountry,
  );
  const filledPdfBuffer = pdfStrategy.supportsNativeAutofill && applicationData.filled_pdf_base64
    ? Buffer.from(applicationData.filled_pdf_base64, "base64")
    : await generateFilledApplicationPdf(applicationData.application_data);
  const coverLetterPdf = await generateTextPdf(applicationData.cover_letter_markdown);
  const checklistPdf = await generateChecklistPdf(applicationData.application_data);
  const financialAuditPdf = await generateTextPdf(buildFinancialAuditReport(applicationData.application_data));
  const insuranceSlipPdf = await generateTextPdf(buildInsuranceVerificationSlip(applicationData.application_data));
  const packetSections: Array<{ title: string; bytes: Uint8Array | Buffer; mimeType: string }> = [
    {
      title: strictDocumentSequence[0],
      bytes: await generateTextPdf(`VisaPilot system summary and appointment slip placeholder for ${applicationData.application_data.trip.destinationCountry}.`),
      mimeType: "application/pdf",
    },
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

  return generateConsulateReadyPacket(packetSections);
}