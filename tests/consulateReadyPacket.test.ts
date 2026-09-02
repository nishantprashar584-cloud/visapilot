import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { buildConsulateReadyPacketPdf } from "@/lib/applications/consulateReadyPacket";
import { generateConsulateReadyPacket } from "@/lib/pdf/generateConsulateReadyPacket";
import { previewApplications } from "@/lib/mock/applications";

async function buildOnePagePdf(label: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595.28, 841.89]);

  page.drawText(label, {
    x: 72,
    y: 760,
    size: 24,
    font,
  });

  return Buffer.from(await pdf.save());
}

describe("buildConsulateReadyPacketPdf", () => {
  it("renders an embassy cover sheet manifest instead of the placeholder page", async () => {
    const application = previewApplications[0];
    const bytes = await buildConsulateReadyPacketPdf({
      applicationData: {
        id: application.id,
        vfs_reference_number: application.vfs_reference_number,
        application_data: application.application_data,
        cover_letter_markdown: application.cover_letter_markdown,
        filled_pdf_base64: application.filled_pdf_base64,
        refusal_reason_code: application.refusal_reason_code,
      },
      supabase: null,
    });

    const parser = new PDFParse({ data: Buffer.from(bytes) });

    try {
      const result = await parser.getText();
      expect(result.text).toContain("VFS Cover & Appointment Slip");
      expect(result.text).toContain(application.application_data.passport.number);
      expect(result.text).toContain(application.vfs_reference_number ?? "");
      expect(result.text).not.toContain("placeholder");
    } finally {
      await parser.destroy();
    }
  });

  it("paginates long manifest indexes onto continuation pages", async () => {
    const sections = await Promise.all(
      Array.from({ length: 18 }, (_, index) => buildOnePagePdf(`Packet Section ${index + 1}`)),
    );
    const bytes = await generateConsulateReadyPacket(
      sections.map((section, index) => ({
        title: `Packet Section ${index + 1}`,
        bytes: section,
        mimeType: "application/pdf",
      })),
      {
        title: "VFS Cover & Appointment Slip",
        destinationCountry: "Spain",
        applicantName: "Test Applicant",
        passportNumber: "P1234567",
        travelWindow: "2026-09-15 to 2026-09-25",
        placeOfApplication: "Mumbai",
        vfsTrackingReference: "VP-TRACK-001",
        generatedAtLabel: "01 Sep 2026",
        manifestEntries: Array.from({ length: 18 }, (_, index) => ({
          label: `Manifest Entry ${index + 1}`,
          detail: `Supporting detail ${index + 1}`,
        })),
      },
    );

    const parser = new PDFParse({ data: Buffer.from(bytes) });

    try {
      const result = await parser.getText();
      expect(result.text).toContain("Document index (continued)");
      expect(result.text).toContain("Manifest Entry 18");
      expect(result.text).toContain("Supporting detail 18");
    } finally {
      await parser.destroy();
    }
  });
});