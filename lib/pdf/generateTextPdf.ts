import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

function wrapLine(line: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const words = line.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const wrappedLines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
}

export async function generateTextPdf(content: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const paragraphs = content.split(/\r?\n/);
  const lineHeight = 16;
  const margin = 48;
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdfDoc.addPage(pageSize);
  let cursorY = page.getHeight() - margin;

  for (const rawLine of paragraphs) {
    const lines = wrapLine(rawLine.trim().length === 0 ? " " : rawLine, page.getWidth() - margin * 2, font, 11);

    for (const line of lines) {
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
      });

      cursorY -= lineHeight;
    }
  }

  return Uint8Array.from(await pdfDoc.save());
}