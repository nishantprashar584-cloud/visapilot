import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  PDFDocument,
} from "pdf-lib";

function resolveTargetPath(): string {
  const inputPath = process.argv[2] ?? "public/templates/schengen_france.pdf";
  return path.resolve(process.cwd(), inputPath);
}

function getFieldType(field: unknown): string {
  if (field instanceof PDFTextField) {
    return "text";
  }

  if (field instanceof PDFCheckBox) {
    return "checkbox";
  }

  if (field instanceof PDFRadioGroup) {
    return "radio";
  }

  if (field instanceof PDFDropdown) {
    return "dropdown";
  }

  if (field instanceof PDFOptionList) {
    return "option-list";
  }

  return "unknown";
}

async function main(): Promise<void> {
  const targetPath = resolveTargetPath();
  const fileBytes = await readFile(targetPath);
  const pdfDoc = await PDFDocument.load(fileBytes);
  const fields = pdfDoc
    .getForm()
    .getFields()
    .map((field) => ({
      fieldName: field.getName(),
      type: getFieldType(field),
    }));

  console.log(JSON.stringify(fields, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown PDF inspection error";
  console.error(message);
  process.exitCode = 1;
});