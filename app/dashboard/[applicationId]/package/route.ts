import JSZip from "jszip";
import { Buffer } from "node:buffer";
import { buildConsulateReadyPacketPdf, type PacketApplicationData } from "@/lib/applications/consulateReadyPacket";
import {
  buildChecklistMarkdown,
  buildConsularInterviewBrief,
  buildFinancialAuditReport,
  buildInsuranceVerificationSlip,
  buildRefusalRecoveryBrief,
  buildRegionalFormGuidance,
} from "@/lib/applications/packetArtifacts";
import { getPreviewApplication } from "@/lib/mock/applications";
import { generateFilledApplicationPdf } from "@/lib/pdf/generateFilledApplicationPdf";
import { generateChecklistPdf } from "@/lib/pdf/generateChecklistPdf";
import { generateTextPdf } from "@/lib/pdf/generateTextPdf";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function buildApplicationPdfFileName(destinationCountry: string, supportsNativeAutofill: boolean): string {
  const slug = destinationCountry.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return supportsNativeAutofill
    ? `schengen_application_${slug}.pdf`
    : `schengen_application_worksheet_${slug}.pdf`;
}

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } },
) {
  const previewMode = new URL(request.url).searchParams.get("preview") === "1";
  const previewApplication = previewMode ? getPreviewApplication(params.applicationId) : null;

  if (previewMode && !previewApplication) {
    return new Response("Application package not found.", { status: 404 });
  }

  const supabase = createSupabaseServerClient();
  let applicationData: PacketApplicationData | null = null;

  if (previewApplication) {
    applicationData = {
      id: previewApplication.id,
      application_data: previewApplication.application_data,
      cover_letter_markdown: previewApplication.cover_letter_markdown,
      filled_pdf_base64: previewApplication.filled_pdf_base64,
      refusal_reason_code: previewApplication.refusal_reason_code,
    };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Authentication required.", { status: 401 });
    }

    const { data, error } = await supabase
      .from("applications")
      .select("id, user_id, applicant_name, application_data, cover_letter_markdown, filled_pdf_base64, refusal_reason_code")
      .eq("id", params.applicationId)
      .single();

    if (error || !data || data.user_id !== user.id) {
      return new Response("Application package not found.", { status: 404 });
    }

    applicationData = data;
  }

  const pdfStrategy = await resolvePdfGenerationStrategy(
    applicationData.application_data.trip.destinationCountry,
  );
  const filledPdfBuffer = pdfStrategy.supportsNativeAutofill && applicationData.filled_pdf_base64
    ? Buffer.from(applicationData.filled_pdf_base64, "base64")
    : await generateFilledApplicationPdf(applicationData.application_data);
  const coverLetterPdf = await generateTextPdf(applicationData.cover_letter_markdown);
  const interviewBriefMarkdown = buildConsularInterviewBrief(applicationData.application_data);
  const interviewBriefPdf = await generateTextPdf(interviewBriefMarkdown);
  const refusalRecoveryMarkdown = buildRefusalRecoveryBrief(applicationData.refusal_reason_code);
  const refusalRecoveryPdf = await generateTextPdf(refusalRecoveryMarkdown);
  const checklistPdf = await generateChecklistPdf(applicationData.application_data);
  const financialAuditMarkdown = buildFinancialAuditReport(applicationData.application_data);
  const financialAuditPdf = await generateTextPdf(financialAuditMarkdown);
  const applicationPdfFileName = buildApplicationPdfFileName(
    applicationData.application_data.trip.destinationCountry,
    pdfStrategy.supportsNativeAutofill,
  );
  const zip = new JSZip();
  zip.file("cover-letter.md", applicationData.cover_letter_markdown);
  zip.file("Schengen_Cover_Letter.pdf", coverLetterPdf);
  zip.file("application.pdf", filledPdfBuffer);
  zip.file(applicationPdfFileName, filledPdfBuffer);
  zip.file("document-checklist.md", buildChecklistMarkdown(applicationData.application_data, applicationData.refusal_reason_code));
  zip.file("Consulate_Submission_Checklist.pdf", checklistPdf);
  zip.file("financial-audit-report.md", financialAuditMarkdown);
  zip.file("financial-audit-report.pdf", financialAuditPdf);
  zip.file("insurance-verification-slip.txt", buildInsuranceVerificationSlip(applicationData.application_data));
  zip.file("consular-interview-simulator.md", interviewBriefMarkdown);
  zip.file("consular-interview-simulator.pdf", interviewBriefPdf);
  zip.file("annex-vi-refusal-decoder.md", refusalRecoveryMarkdown);
  zip.file("annex-vi-refusal-decoder.pdf", refusalRecoveryPdf);

  if (!pdfStrategy.supportsNativeAutofill && pdfStrategy.guidanceMessage) {
    zip.file(
      "regional-form-guidance.md",
      buildRegionalFormGuidance({
        applicant: applicationData.application_data,
        templateLabel: pdfStrategy.templateLabel,
        portalUrl: pdfStrategy.portalUrl,
        guidanceMessage: pdfStrategy.guidanceMessage,
      }),
    );
  }

  if (!previewApplication && Array.isArray(applicationData.application_data.supportingDocuments) && applicationData.application_data.supportingDocuments.length > 0) {
    for (const document of applicationData.application_data.supportingDocuments) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from(supportingDocumentsBucket)
        .download(document.storagePath);

      if (fileError || !fileData) {
        continue;
      }

      const bytes = await fileData.arrayBuffer();
      zip.file(`supporting-documents/${document.fileName}`, new Uint8Array(bytes));
    }
  }

  zip.file(
    "Consulate_Ready_Packet.pdf",
    await buildConsulateReadyPacketPdf({
      applicationData,
      supabase: previewApplication ? null : supabase,
    }),
  );

  const archive = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="visapilot-package-${applicationData.id}.zip"`,
    },
  });
}