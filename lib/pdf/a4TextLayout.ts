import { PDFDocument, type PDFFont, StandardFonts, rgb } from "pdf-lib";

export const a4TextPageWidth = 595.28;
export const a4TextPageHeight = 841.89;
export const a4TextMargin = 48;
export const a4TextFontSize = 11;
export const a4TextLineHeight = 16;

export type A4TextLayoutLine = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

export type A4TextLayoutPage = {
  lines: A4TextLayoutLine[];
};

export type A4TextLayout = {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  lineHeight: number;
  pages: A4TextLayoutPage[];
};

function normalizePrintableLine(line: string): string {
  return line
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\*\s+/, "- ")
    .replace(/^\*\s{2,}/, "- ")
    .replace(/^[-]\s+\*\*(.*?)\*\*:\s*/g, "- $1: ")
    .replace(/[–—]/g, "-")
    .trimEnd();
}

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

function buildA4TextLayoutWithFont(content: string, font: PDFFont): A4TextLayout {
  const paragraphs = content.split(/\r?\n/);
  const maxWidth = a4TextPageWidth - a4TextMargin * 2;
  const pages: A4TextLayoutPage[] = [{ lines: [] }];
  let pageIndex = 0;
  let cursorY = a4TextPageHeight - a4TextMargin;

  for (const rawLine of paragraphs) {
    const printableLine = normalizePrintableLine(rawLine);
    const lines = wrapLine(printableLine.trim().length === 0 ? " " : printableLine, maxWidth, font, a4TextFontSize);

    for (const line of lines) {
      if (cursorY <= a4TextMargin) {
        pages.push({ lines: [] });
        pageIndex += 1;
        cursorY = a4TextPageHeight - a4TextMargin;
      }

      pages[pageIndex].lines.push({
        text: line,
        x: a4TextMargin,
        y: cursorY,
        fontSize: a4TextFontSize,
      });
      cursorY -= a4TextLineHeight;
    }
  }

  return {
    pageWidth: a4TextPageWidth,
    pageHeight: a4TextPageHeight,
    margin: a4TextMargin,
    lineHeight: a4TextLineHeight,
    pages,
  };
}

export async function buildA4TextLayout(content: string): Promise<A4TextLayout> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return buildA4TextLayoutWithFont(content, font);
}

export async function generateA4TextPdf(content: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const layout = buildA4TextLayoutWithFont(content, font);

  layout.pages.forEach((layoutPage) => {
    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);

    layoutPage.lines.forEach((line) => {
      page.drawText(line.text, {
        x: line.x,
        y: line.y,
        size: line.fontSize,
        font,
        color: rgb(0.08, 0.1, 0.16),
      });
    });
  });

  return Uint8Array.from(await pdfDoc.save());
}