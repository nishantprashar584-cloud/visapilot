import { getPreviewApplication } from "@/lib/mock/applications";
import { buildProfessionalCoverLetterFallback, stripItineraryMatrixSection } from "@/lib/applications/coverLetter";
import { generateTextPdf } from "@/lib/pdf/generateTextPdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } },
) {
  const previewMode = new URL(request.url).searchParams.get("preview") === "1";

  if (previewMode) {
    const previewApplication = getPreviewApplication(params.applicationId);

    if (!previewApplication) {
      return new Response("Cover letter not found.", { status: 404 });
    }

    const previewBytes = await generateTextPdf(buildProfessionalCoverLetterFallback(previewApplication.application_data));
    const responseBytes = new Uint8Array(previewBytes.length);
    responseBytes.set(previewBytes);

    return new Response(responseBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Schengen_Cover_Letter.pdf"',
      },
    });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Authentication required.", { status: 401 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("id, user_id, applicant_name, cover_letter_markdown")
    .eq("id", params.applicationId)
    .single();

  if (error || !data || data.user_id !== user.id) {
    return new Response("Cover letter not found.", { status: 404 });
  }

  const bytes = await generateTextPdf(stripItineraryMatrixSection(data.cover_letter_markdown));
  const responseBytes = new Uint8Array(bytes.length);
  responseBytes.set(bytes);

  return new Response(responseBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Schengen_Cover_Letter.pdf"',
    },
  });
}