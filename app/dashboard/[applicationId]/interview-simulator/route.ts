import { buildConsularInterviewBrief } from "@/lib/applications/packetArtifacts";
import { getPreviewApplication } from "@/lib/mock/applications";
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
      return new Response("Interview simulator not found.", { status: 404 });
    }

    const previewBytes = await generateTextPdf(buildConsularInterviewBrief(previewApplication.application_data));
    const responseBytes = new Uint8Array(previewBytes.length);
    responseBytes.set(previewBytes);

    return new Response(responseBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Consular_Interview_Simulator.pdf"',
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
    return new Response("Interview simulator not found.", { status: 404 });
  }

  const bytes = await generateTextPdf(buildConsularInterviewBrief(data.application_data));
  const responseBytes = new Uint8Array(bytes.length);
  responseBytes.set(bytes);

  return new Response(responseBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Consular_Interview_Simulator.pdf"',
    },
  });
}
