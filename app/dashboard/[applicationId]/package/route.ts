import JSZip from "jszip";
import { buildChecklistMarkdown, buildInsuranceVerificationSlip } from "@/lib/applications/packetArtifacts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { applicationId: string } },
) {
  const supabase = createSupabaseServerClient();
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

  const zip = new JSZip();
  zip.file("cover-letter.md", data.cover_letter_markdown);
  zip.file("application.pdf", Buffer.from(data.filled_pdf_base64, "base64"));
  zip.file("document-checklist.md", buildChecklistMarkdown(data.application_data, data.refusal_reason_code));
  zip.file("insurance-verification-slip.txt", buildInsuranceVerificationSlip(data.application_data));

  if (Array.isArray(data.application_data.supportingDocuments) && data.application_data.supportingDocuments.length > 0) {
    const admin = createSupabaseAdminClient();

    for (const document of data.application_data.supportingDocuments) {
      const { data: fileData, error: fileError } = await admin.storage
        .from("visapilot-supporting-documents")
        .download(document.storagePath);

      if (fileError || !fileData) {
        continue;
      }

      const bytes = await fileData.arrayBuffer();
      zip.file(`supporting-documents/${document.fileName}`, new Uint8Array(bytes));
    }
  }

  const archive = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="visapilot-package-${params.applicationId}.zip"`,
    },
  });
}