import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
    .select("id, user_id, applicant_name, cover_letter_markdown")
    .eq("id", params.applicationId)
    .single();

  if (error || !data || data.user_id !== user.id) {
    return new Response("Cover letter not found.", { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const lines = data.cover_letter_markdown.split(/\r?\n/);
  const lineHeight = 16;
  const margin = 48;
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdfDoc.addPage(pageSize);
  let cursorY = page.getHeight() - margin;

  for (const rawLine of lines) {
    const line = rawLine.trim().length === 0 ? " " : rawLine;

    if (cursorY <= margin) {
      page = pdfDoc.addPage(pageSize);
      cursorY = page.getHeight() - margin;
    }

    page.drawText(line, {
      x: margin,
      y: cursorY,
      size: 11,
      font,
      color: rgb(0.08, 0.1, 0.16),
      maxWidth: page.getWidth() - margin * 2,
      lineHeight,
    });

    cursorY -= lineHeight;
  }

  const bytes = await pdfDoc.save();

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="visapilot-cover-letter-${params.applicationId}.pdf"`,
    },
  });
}