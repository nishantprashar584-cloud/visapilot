import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import { PDFDocument, PDFTextField } from "pdf-lib";

type ProbeResult = {
  source: string;
  extractedTextPreview: string;
  matchedVisaNumberInText: boolean;
  matchedFingerprintDateInText: boolean;
  matchedVisaNumberInFields: boolean;
  matchedFingerprintDateInFields: boolean;
  fieldNames: string[];
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function usage(): void {
  console.error("Usage: npm run test:pdf -- <zip-or-pdf-path> [visaNumber] [fingerprintDate]");
}

async function extractPdfBuffer(targetPath: string): Promise<{ source: string; buffer: Buffer }> {
  const bytes = await readFile(targetPath);

  if (path.extname(targetPath).toLowerCase() !== ".zip") {
    return { source: path.basename(targetPath), buffer: bytes };
  }

  const archive = await JSZip.loadAsync(bytes);
  const pdfEntry = archive.file(/(^|\/)(application|schengen_application).*\.pdf$/i).at(0) ?? archive.file(/\.pdf$/i).at(0);

  if (!pdfEntry) {
    throw new Error(`No PDF file found inside ${targetPath}.`);
  }

  return {
    source: pdfEntry.name,
    buffer: await pdfEntry.async("nodebuffer"),
  };
}

async function extractTextViaPdftotext(pdfBuffer: Buffer): Promise<string | null> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "visapilot-pdf-probe-"));
  const tempPdfPath = path.join(tempDir, "probe.pdf");

  try {
    await writeFile(tempPdfPath, pdfBuffer);
    const probe = spawnSync("pdftotext", ["-layout", tempPdfPath, "-"], {
      encoding: "utf8",
      windowsHide: true,
    });

    if (probe.error || probe.status !== 0) {
      return null;
    }

    return probe.stdout;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function extractTextViaPdfParse(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function inspectFormFields(pdfBuffer: Buffer): Promise<{ fieldNames: string[]; normalizedFieldText: string }> {
  const document = await PDFDocument.load(pdfBuffer);
  const form = document.getForm();
  const fields = form.getFields();
  const fieldNames = fields.map((field) => field.getName());
  const textValues = fields.flatMap((field) => (field instanceof PDFTextField ? [field.getText() ?? ""] : []));

  return {
    fieldNames,
    normalizedFieldText: normalizeText(textValues.join(" ")),
  };
}

async function probe(targetPath: string, expectedVisaNumber: string, expectedFingerprintDate: string): Promise<ProbeResult> {
  const { source, buffer } = await extractPdfBuffer(targetPath);
  const rawText = (await extractTextViaPdftotext(buffer)) ?? (await extractTextViaPdfParse(buffer));
  const normalizedText = normalizeText(rawText);
  const formattedFingerprintDate = /^\d{4}-\d{2}-\d{2}$/.test(expectedFingerprintDate)
    ? `${expectedFingerprintDate.slice(8, 10)}/${expectedFingerprintDate.slice(5, 7)}/${expectedFingerprintDate.slice(0, 4)}`
    : expectedFingerprintDate;
  const { fieldNames, normalizedFieldText } = await inspectFormFields(buffer);

  return {
    source,
    extractedTextPreview: normalizedText.slice(0, 600),
    matchedVisaNumberInText: normalizedText.includes(expectedVisaNumber),
    matchedFingerprintDateInText: normalizedText.includes(expectedFingerprintDate) || normalizedText.includes(formattedFingerprintDate),
    matchedVisaNumberInFields: normalizedFieldText.includes(expectedVisaNumber),
    matchedFingerprintDateInFields: normalizedFieldText.includes(expectedFingerprintDate) || normalizedFieldText.includes(formattedFingerprintDate),
    fieldNames,
  };
}

async function main() {
  const targetPath = process.argv[2];
  const expectedVisaNumber = process.argv[3] ?? "FRA987654321";
  const expectedFingerprintDate = process.argv[4] ?? "2024-05-01";

  if (!targetPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const result = await probe(targetPath, expectedVisaNumber, expectedFingerprintDate);
  const visaMatched = result.matchedVisaNumberInText || result.matchedVisaNumberInFields;
  const fingerprintMatched = result.matchedFingerprintDateInText || result.matchedFingerprintDateInFields;

  console.log(JSON.stringify(result, null, 2));

  if (!visaMatched || !fingerprintMatched) {
    throw new Error(
      `Verification failed for ${result.source}: visaMatch=${visaMatched}, fingerprintDateMatch=${fingerprintMatched}.`,
    );
  }
}

void main();