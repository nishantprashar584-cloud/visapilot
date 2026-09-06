import { buildRefusalRecoveryBrief } from "@/lib/applications/packetArtifacts";
import { getPreviewApplication } from "@/lib/mock/applications";
import { generateTextPdf } from "@/lib/pdf/generateTextPdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RefusalReasonCode } from "@/types";

const refusalReasonCodes = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

function parseRefusalReasonCode(value: string | null): RefusalReasonCode | null {
  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && refusalReasonCodes.has(numericValue)) {
    return numericValue as RefusalReasonCode;
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } },
) {
  const requestUrl = new URL(request.url);
  const previewMode = requestUrl.searchParams.get("preview") === "1";
  const requestedRefusalCode = parseRefusalReasonCode(requestUrl.searchParams.get("code"));

  if (previewMode) {
    const previewApplication = getPreviewApplication(params.applicationId);

    if (!previewApplication) {
      return new Response("Refusal decoder not found.", { status: 404 });
    }

    const previewBytes = await generateTextPdf(buildRefusalRecoveryBrief(requestedRefusalCode ?? previewApplication.refusal_reason_code));
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

  const bytes = await generateTextPdf(buildRefusalRecoveryBrief(requestedRefusalCode ?? data.refusal_reason_code));
  const responseBytes = new Uint8Array(bytes.length);
  responseBytes.set(bytes);

  return new Response(responseBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Annex_VI_Refusal_Decoder.pdf"',
    },
  });
}
