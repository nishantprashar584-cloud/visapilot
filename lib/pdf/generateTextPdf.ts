import { generateA4TextPdf } from "@/lib/pdf/a4TextLayout";

export async function generateTextPdf(content: string): Promise<Uint8Array> {
  return generateA4TextPdf(content);
}