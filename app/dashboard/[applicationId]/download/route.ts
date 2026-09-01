import { Buffer } from "node:buffer";
import { getPreviewApplication } from "@/lib/mock/applications";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { generateFilledApplicationPdf } from "@/lib/pdf/generateFilledApplicationPdf";
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

  if (previewMode) {
    const previewApplication = getPreviewApplication(params.applicationId);

    if (!previewApplication) {
      return new Response("Application PDF not found.", { status: 404 });
    }

    const pdfStrategy = await resolvePdfGenerationStrategy(previewApplication.destination_country);
    const pdfBuffer = await generateFilledApplicationPdf(previewApplication.application_data);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildApplicationPdfFileName(previewApplication.destination_country, pdfStrategy.supportsNativeAutofill)}"`,
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
    .select("id, user_id, filled_pdf_base64, destination_country, application_data")
    .eq("id", params.applicationId)
    .single();

  if (error || !data || data.user_id !== user.id) {
    return new Response("Application PDF not found.", { status: 404 });
  }

  if (!data.filled_pdf_base64 && !data.application_data) {
    return new Response("Application PDF not found.", { status: 404 });
  }

  const pdfStrategy = await resolvePdfGenerationStrategy(data.destination_country);
  const pdfBuffer = pdfStrategy.supportsNativeAutofill && data.filled_pdf_base64
    ? Buffer.from(data.filled_pdf_base64, "base64")
    : await generateFilledApplicationPdf(data.application_data);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildApplicationPdfFileName(data.destination_country, pdfStrategy.supportsNativeAutofill)}"`,
    },
  });
}