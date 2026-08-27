import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";

function resolveTargetPath(): string {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error("Provide a PDF path, for example: npm run extract:pdf-fields -- public/templates/schengen_france.pdf");
  }

  return path.resolve(process.cwd(), inputPath);
}

function getFieldType(field: unknown): string {
  if (field instanceof PDFTextField) {
    return "Text";
  }

  if (field instanceof PDFCheckBox) {
    return "Checkbox";
  }

  if (field instanceof PDFRadioGroup) {
    return "RadioGroup";
  }

  if (field instanceof PDFDropdown) {
    return "Dropdown";
  }

  if (field instanceof PDFOptionList) {
    return "OptionList";
  }

  return "Unknown";
}

async function main(): Promise<void> {
  const targetPath = resolveTargetPath();
  const fileBytes = await readFile(targetPath);
  const pdfDoc = await PDFDocument.load(fileBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`PDF: ${targetPath}`);
  console.log(`Interactive fields: ${fields.length}`);

  if (fields.length === 0) {
    console.log("This template does not expose interactive AcroForm fields.");
    return;
  }

  for (const field of fields) {
    console.log(`${getFieldType(field)}\t${field.getName()}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown PDF inspection error";
  console.error(message);
  process.exitCode = 1;
});