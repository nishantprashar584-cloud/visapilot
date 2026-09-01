import { buildRefusalRecoveryBrief } from "@/lib/applications/packetArtifacts";
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
      return new Response("Refusal decoder not found.", { status: 404 });
    }

    const previewBytes = await generateTextPdf(buildRefusalRecoveryBrief(previewApplication.refusal_reason_code));
    const responseBytes = new Uint8Array(previewBytes.length);
    responseBytes.set(previewBytes);

    return new Response(responseBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Annex_VI_Refusal_Decoder.pdf"',
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
    .select("id, user_id, refusal_reason_code")
    .eq("id", params.applicationId)
    .single();

  if (error || !data || data.user_id !== user.id) {
    return new Response("Refusal decoder not found.", { status: 404 });
  }

  const bytes = await generateTextPdf(buildRefusalRecoveryBrief(data.refusal_reason_code));
  const responseBytes = new Uint8Array(bytes.length);
  responseBytes.set(bytes);

  return new Response(responseBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Annex_VI_Refusal_Decoder.pdf"',
    },
  });
}
