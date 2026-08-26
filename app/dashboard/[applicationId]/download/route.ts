import { Buffer } from "node:buffer";
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
    .select("id, user_id, filled_pdf_base64")
    .eq("id", params.applicationId)
    .single();

  if (error || !data?.filled_pdf_base64 || data.user_id !== user.id) {
    return new Response("Application PDF not found.", { status: 404 });
  }

  const pdfBuffer = Buffer.from(data.filled_pdf_base64, "base64");

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="visapilot-${params.applicationId}.pdf"`,
    },
  });
}