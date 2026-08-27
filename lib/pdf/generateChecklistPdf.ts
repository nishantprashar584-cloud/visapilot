import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { resolveConsulateChecklist } from "@/lib/applications/consulateChecklist";
import type { ApplicantInfo } from "@/types";

function wrapLine(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function generateChecklistPdf(applicant: ApplicantInfo): Promise<Uint8Array> {
  const checklist = resolveConsulateChecklist(applicant);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;

  let y = pageHeight - margin;

  const drawParagraph = (text: string, options?: { fontSize?: number; font?: typeof bodyFont; color?: ReturnType<typeof rgb>; gapAfter?: number }) => {
    const font = options?.font ?? bodyFont;
    const fontSize = options?.fontSize ?? 11;
    const color = options?.color ?? rgb(0.12, 0.16, 0.22);
    const lines = wrapLine(text, maxWidth, font, fontSize);

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color,
      });
      y -= fontSize + 5;
    }

    y -= options?.gapAfter ?? 6;
  };

  drawParagraph(`${checklist.destinationCountry} Consulate Submission Checklist`, {
    font: titleFont,
    fontSize: 18,
    color: rgb(0.07, 0.09, 0.14),
    gapAfter: 10,
  });

  drawParagraph(`Applicant: ${applicant.personal.firstName} ${applicant.personal.lastName}`.trim(), { fontSize: 11 });
  drawParagraph(`Provider: ${checklist.provider}`, { fontSize: 11, gapAfter: 2 });
  drawParagraph(`Travel window: ${applicant.trip.arrivalDate} to ${applicant.trip.departureDate}`, { fontSize: 11, gapAfter: 2 });
  drawParagraph(`Statutory funds target: EUR ${checklist.requiredFundsEur.toFixed(2)}`, { fontSize: 11, gapAfter: 12 });

  drawParagraph("Appointment-Day Checklist", {
    font: titleFont,
    fontSize: 13,
    color: rgb(0.07, 0.09, 0.14),
    gapAfter: 6,
  });

  for (const item of checklist.checklistItems) {
    drawParagraph(`[ ] ${item.label}`, { fontSize: 11, gapAfter: item.note ? 1 : 4 });

    if (item.note) {
      drawParagraph(`    ${item.note}`, {
        fontSize: 9,
        color: rgb(0.37, 0.43, 0.51),
        gapAfter: 4,
      });
    }
  }

  drawParagraph("Official Stacking Order", {
    font: titleFont,
    fontSize: 13,
    color: rgb(0.07, 0.09, 0.14),
    gapAfter: 6,
  });

  for (let index = 0; index < checklist.documentStackOrder.length; index += 1) {
    drawParagraph(`${index + 1}. ${checklist.documentStackOrder[index]}`, { fontSize: 11, gapAfter: 2 });
  }

  drawParagraph("Carry this sheet to your appointment and tick each item before handing the packet to the external service provider.", {
    fontSize: 10,
    color: rgb(0.37, 0.43, 0.51),
    gapAfter: 0,
  });

  return Uint8Array.from(await pdf.save());
}