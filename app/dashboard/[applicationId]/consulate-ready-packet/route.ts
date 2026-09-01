import { buildConsulateReadyPacketPdf, type PacketApplicationData } from "@/lib/applications/consulateReadyPacket";
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
      return new Response("Consulate-ready packet not found.", { status: 404 });
    }

    const bytes = await buildConsulateReadyPacketPdf({
      applicationData: {
        id: previewApplication.id,
        application_data: previewApplication.application_data,
        cover_letter_markdown: previewApplication.cover_letter_markdown,
        filled_pdf_base64: previewApplication.filled_pdf_base64,
        refusal_reason_code: previewApplication.refusal_reason_code,
      },
      supabase: null,
    });

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Consulate_Ready_Packet.pdf"',
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
    .select("id, user_id, application_data, cover_letter_markdown, filled_pdf_base64, refusal_reason_code")
    .eq("id", params.applicationId)
    .single();

  if (error || !data || data.user_id !== user.id) {
    return new Response("Consulate-ready packet not found.", { status: 404 });
  }

  const bytes = await buildConsulateReadyPacketPdf({
    applicationData: data as PacketApplicationData,
    supabase,
  });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Consulate_Ready_Packet.pdf"',
    },
  });
}
