import "server-only";
import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from "pdf-lib";

type PacketSection = {
  title: string;
  bytes: Uint8Array | Buffer;
  mimeType: string;
};

const a4Width = 595.28;
const a4Height = 841.89;

function wrapLine(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
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

async function appendDividerPage(pdf: PDFDocument, title: string, index: number): Promise<void> {
  const page = pdf.addPage([a4Width, a4Height]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 0, y: a4Height - 180, width: a4Width, height: 180, color: rgb(0.06, 0.07, 0.09) });
  page.drawText(`${index}. ${title}`, {
    x: 46,
    y: a4Height - 100,
    size: 24,
    font: titleFont,
    color: rgb(0.98, 0.99, 1),
  });
  const note = "Normalized to A4 portrait, flattened where applicable, and bundled in consular review order.";
  const lines = wrapLine(note, a4Width - 92, bodyFont, 11);
  let y = a4Height - 140;
  for (const line of lines) {
    page.drawText(line, {
      x: 46,
      y,
      size: 11,
      font: bodyFont,
      color: rgb(0.79, 0.83, 0.9),
    });
    y -= 16;
  }
}

async function appendPdfSection(target: PDFDocument, section: PacketSection, index: number): Promise<void> {
  await appendDividerPage(target, section.title, index);
  const source = await PDFDocument.load(section.bytes);
  for (const sourcePage of source.getPages()) {
    const normalizedPage = target.addPage([a4Width, a4Height]);
    const sourceWidth = sourcePage.getWidth();
    const sourceHeight = sourcePage.getHeight();
    const rotateLandscape = sourceWidth > sourceHeight;
    const embeddedPage = await target.embedPage(sourcePage);
    const effectiveWidth = rotateLandscape ? sourceHeight : sourceWidth;
    const effectiveHeight = rotateLandscape ? sourceWidth : sourceHeight;
    const scale = Math.min((a4Width - 48) / effectiveWidth, (a4Height - 48) / effectiveHeight);
    const drawWidth = effectiveWidth * scale;
    const drawHeight = effectiveHeight * scale;
    if (rotateLandscape) {
      normalizedPage.drawPage(embeddedPage, {
        x: (a4Width + drawWidth) / 2,
        y: (a4Height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
        rotate: degrees(90),
      });
      continue;
    }

    normalizedPage.drawPage(embeddedPage, {
      x: (a4Width - drawWidth) / 2,
      y: (a4Height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }
}

async function appendImageSection(target: PDFDocument, section: PacketSection, index: number): Promise<void> {
  await appendDividerPage(target, section.title, index);
  const page = target.addPage([a4Width, a4Height]);
  const image = section.mimeType === "image/png"
    ? await target.embedPng(section.bytes)
    : await target.embedJpg(section.bytes);
  const scale = Math.min((a4Width - 48) / image.width, (a4Height - 48) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: (a4Width - width) / 2,
    y: (a4Height - height) / 2,
    width,
    height,
  });
}

export async function generateConsulateReadyPacket(sections: PacketSection[]): Promise<Uint8Array> {
  const packet = await PDFDocument.create();

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];

    if (section.mimeType === "application/pdf") {
      await appendPdfSection(packet, section, index + 1);
      continue;
    }

    if (section.mimeType === "image/png" || section.mimeType === "image/jpeg") {
      await appendImageSection(packet, section, index + 1);
    }
  }

  return Uint8Array.from(await packet.save());
}