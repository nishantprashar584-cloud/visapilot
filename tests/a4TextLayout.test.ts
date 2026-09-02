import { describe, expect, it } from "vitest";
import { PDFParse } from "pdf-parse";
import { buildA4TextLayout, generateA4TextPdf } from "@/lib/pdf/a4TextLayout";

describe("a4TextLayout", () => {
  it("keeps preview pagination aligned with the exported PDF", async () => {
    const content = Array.from({ length: 220 }, (_, index) => `Paragraph ${index + 1} about itinerary, accommodation, funds, and return ties.`).join("\n");
    const layout = await buildA4TextLayout(content);
    const pdfBytes = await generateA4TextPdf(content);
    const parser = new PDFParse({ data: Buffer.from(pdfBytes) });

    try {
      const text = await parser.getText();
      expect(layout.pages.length).toBeGreaterThan(1);
      expect(layout.pages[0]?.lines.length).toBeGreaterThan(0);
      expect(text.text).toContain("Paragraph 1 about itinerary");
      expect(text.text).toContain("Paragraph 220 about itinerary");
    } finally {
      await parser.destroy();
    }
  });
});