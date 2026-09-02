import "server-only";
import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from "pdf-lib";

export type PacketManifestEntry = {
  label: string;
  detail?: string;
};

export type PacketCoverSheet = {
  title: string;
  destinationCountry: string;
  applicantName: string;
  passportNumber: string;
  travelWindow: string;
  placeOfApplication: string;
  vfsTrackingReference: string;
  generatedAtLabel: string;
  manifestEntries: PacketManifestEntry[];
};

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

async function appendCoverSheet(pdf: PDFDocument, coverSheet: PacketCoverSheet): Promise<void> {
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdf.embedFont(StandardFonts.Courier);

  function startManifestPage(isContinuation: boolean) {
    const page = pdf.addPage([a4Width, a4Height]);

    if (isContinuation) {
      page.drawRectangle({ x: 0, y: a4Height - 96, width: a4Width, height: 96, color: rgb(0.07, 0.1, 0.16) });
      page.drawText("Document index (continued)", {
        x: 40,
        y: a4Height - 58,
        size: 18,
        font: titleFont,
        color: rgb(0.97, 0.98, 1),
      });
      page.drawText(`Generated ${coverSheet.generatedAtLabel}`, {
        x: 40,
        y: a4Height - 78,
        size: 10,
        font: bodyFont,
        color: rgb(0.74, 0.83, 0.95),
      });

      return {
        page,
        y: a4Height - 132,
      };
    }

    page.drawRectangle({ x: 0, y: a4Height - 190, width: a4Width, height: 190, color: rgb(0.07, 0.1, 0.16) });
    page.drawText(coverSheet.title, {
      x: 40,
      y: a4Height - 84,
      size: 22,
      font: titleFont,
      color: rgb(0.97, 0.98, 1),
    });
    page.drawText(`${coverSheet.destinationCountry} tourist packet`, {
      x: 40,
      y: a4Height - 116,
      size: 12,
      font: bodyFont,
      color: rgb(0.74, 0.83, 0.95),
    });
    page.drawText(`Generated ${coverSheet.generatedAtLabel}`, {
      x: 40,
      y: a4Height - 140,
      size: 10,
      font: bodyFont,
      color: rgb(0.74, 0.83, 0.95),
    });

    const summaryCards = [
      { label: "Applicant", value: coverSheet.applicantName },
      { label: "Passport", value: coverSheet.passportNumber },
      { label: "Travel Window", value: coverSheet.travelWindow },
      { label: "Tracking Ref", value: coverSheet.vfsTrackingReference },
    ];

    summaryCards.forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const width = 246;
      const height = 76;
      const x = 40 + column * (width + 24);
      const y = a4Height - 234 - row * (height + 18);

      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0.95, 0.97, 1),
        borderColor: rgb(0.84, 0.88, 0.95),
        borderWidth: 1,
      });
      page.drawText(card.label.toUpperCase(), {
        x: x + 14,
        y: y + 54,
        size: 9,
        font: titleFont,
        color: rgb(0.36, 0.43, 0.52),
      });
      const lines = wrapLine(card.value, width - 28, bodyFont, 12);
      lines.slice(0, 2).forEach((line, lineIndex) => {
        page.drawText(line, {
          x: x + 14,
          y: y + 34 - lineIndex * 15,
          size: 12,
          font: bodyFont,
          color: rgb(0.11, 0.14, 0.19),
        });
      });
    });

    page.drawText("Document index", {
      x: 40,
      y: a4Height - 446,
      size: 15,
      font: titleFont,
      color: rgb(0.12, 0.16, 0.22),
    });
    page.drawText(`Place of application: ${coverSheet.placeOfApplication}`, {
      x: 40,
      y: a4Height - 466,
      size: 10,
      font: bodyFont,
      color: rgb(0.38, 0.44, 0.52),
    });

    return {
      page,
      y: a4Height - 500,
    };
  }

  let manifestPage = startManifestPage(false);
  coverSheet.manifestEntries.forEach((entry, index) => {
    if (manifestPage.y < 86) {
      manifestPage = startManifestPage(true);
    }

    manifestPage.page.drawText(`${String(index + 1).padStart(2, "0")}.`, {
      x: 42,
      y: manifestPage.y,
      size: 10,
      font: monoFont,
      color: rgb(0.33, 0.39, 0.46),
    });

    const labelLines = wrapLine(entry.label, 210, titleFont, 10);
    labelLines.slice(0, 2).forEach((line, lineIndex) => {
      manifestPage.page.drawText(line, {
        x: 72,
        y: manifestPage.y - lineIndex * 13,
        size: 10,
        font: titleFont,
        color: rgb(0.12, 0.16, 0.22),
      });
    });

    const detailLines = wrapLine(entry.detail ?? "Ready for consular review.", 250, bodyFont, 9);
    detailLines.slice(0, 3).forEach((line, lineIndex) => {
      manifestPage.page.drawText(line, {
        x: 292,
        y: manifestPage.y - lineIndex * 12,
        size: 9,
        font: bodyFont,
        color: rgb(0.33, 0.39, 0.46),
      });
    });

    manifestPage.page.drawLine({
      start: { x: 40, y: manifestPage.y - 22 },
      end: { x: a4Width - 40, y: manifestPage.y - 22 },
      thickness: 0.6,
      color: rgb(0.87, 0.9, 0.95),
    });

    manifestPage.y -= 40;
  });
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

export async function generateConsulateReadyPacket(sections: PacketSection[], coverSheet?: PacketCoverSheet): Promise<Uint8Array> {
  const packet = await PDFDocument.create();

  if (coverSheet) {
    await appendCoverSheet(packet, coverSheet);
  }

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