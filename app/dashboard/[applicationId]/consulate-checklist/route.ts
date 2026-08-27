import { generateChecklistPdf } from "@/lib/pdf/generateChecklistPdf";
import { getPreviewApplication } from "@/lib/mock/applications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } },
) {
  const previewMode = new URL(request.url).searchParams.get("preview") === "1";

  if (previewMode) {
    const previewApplication = getPreviewApplication(params.applicationId);

    if (!previewApplication) {
      return new Response("Consulate checklist not found.", { status: 404 });
    }

    const previewBytes = await generateChecklistPdf(previewApplication.application_data);
    const responseBytes = new Uint8Array(previewBytes.length);
    responseBytes.set(previewBytes);

    return new Response(responseBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Consulate_Submission_Checklist.pdf"',
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
    .select("id, user_id, application_data")
    .eq("id", params.applicationId)
    .single();

  if (error || !data || data.user_id !== user.id) {
    return new Response("Consulate checklist not found.", { status: 404 });
  }

  const bytes = await generateChecklistPdf(data.application_data);
  const responseBytes = new Uint8Array(bytes.length);
  responseBytes.set(bytes);

  return new Response(responseBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Consulate_Submission_Checklist.pdf"',
    },
  });
}