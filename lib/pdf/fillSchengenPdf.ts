import { Buffer } from "node:buffer";
import {
  PDFCheckBox,
  PDFDocument,
  PDFTextField,
  type PDFField,
} from "pdf-lib";
import type {
  ApplicantInfo,
  ApplicantValuePath,
  PdfFieldMapping,
  PdfFieldMappingCollection,
  PdfMapConfig,
} from "@/types";

const templateTokenPattern = /\{([a-zA-Z0-9.]+)\}/g;

type SupportedPdfField = PDFTextField | PDFCheckBox;

function assertPdfMapConfig(config: PdfMapConfig): void {
  if (config.fields.length === 0) {
    throw new Error("PDF map configuration must define at least one field.");
  }
}

function resolvePath<T>(source: T, path: ApplicantValuePath): unknown {
  return path
    .split(".")
    .reduce<unknown>((currentValue, segment) => {
      if (
        currentValue === null ||
        currentValue === undefined ||
        typeof currentValue !== "object"
      ) {
        return undefined;
      }

      return (currentValue as Record<string, unknown>)[segment];
    }, source);
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.trim().toLowerCase();
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const year = `${date.getUTCFullYear()}`;

  return `${day}/${month}/${year}`;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join(", ");
  }

  return "";
}

function formatTextValue(value: string, mapping: PdfFieldMapping): string {
  if (mapping.kind !== "text") {
    return value;
  }

  switch (mapping.format) {
    case "date-dd-mm-yyyy":
      return formatDate(value);
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    case "passport-spacing":
      return value.replace(/\s+/g, "").toUpperCase();
    default:
      return value;
  }
}

function resolveTextValue(applicant: ApplicantInfo, mapping: PdfFieldMapping): string {
  if (mapping.kind !== "text") {
    throw new Error(`Field ${mapping.key} is not a text mapping.`);
  }

  let value = "";

  if (mapping.template) {
    value = mapping.template.replace(templateTokenPattern, (_, token: string) => {
      const resolved = resolvePath(applicant, token as ApplicantValuePath);
      return stringifyValue(resolved);
    });
  } else if (mapping.source) {
    value = stringifyValue(resolvePath(applicant, mapping.source));
  }

  return formatTextValue(value.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim(), mapping);
}

function resolveCheckboxValue(
  applicant: ApplicantInfo,
  mapping: PdfFieldMapping,
): boolean {
  if (mapping.kind !== "checkbox") {
    throw new Error(`Field ${mapping.key} is not a checkbox mapping.`);
  }

  const resolved = resolvePath(applicant, mapping.source);

  if (mapping.equals !== undefined) {
    return resolved === mapping.equals;
  }

  if (mapping.includes !== undefined) {
    return Array.isArray(resolved)
      ? resolved.includes(mapping.includes)
      : stringifyValue(resolved)
          .toLowerCase()
          .includes(mapping.includes.toLowerCase());
  }

  return Boolean(resolved);
}

function findField(
  fieldsByName: Map<string, PDFField>,
  collection: PdfFieldMappingCollection,
): SupportedPdfField | undefined {
  for (const candidate of collection.candidates) {
    const field = fieldsByName.get(normalizeFieldName(candidate));

    if (field instanceof PDFTextField || field instanceof PDFCheckBox) {
      return field;
    }
  }

  return undefined;
}

function ensureSupportedFieldType(
  field: SupportedPdfField,
  mapping: PdfFieldMapping,
): void {
  if (mapping.kind === "text" && !(field instanceof PDFTextField)) {
    throw new Error(`Mapped field ${mapping.key} resolved to a non-text PDF field.`);
  }

  if (mapping.kind === "checkbox" && !(field instanceof PDFCheckBox)) {
    throw new Error(`Mapped field ${mapping.key} resolved to a non-checkbox PDF field.`);
  }
}

export async function fillSchengenPdf(
  applicant: ApplicantInfo,
  mappingConfig: PdfMapConfig,
  templateBytes: Uint8Array | ArrayBuffer,
): Promise<Buffer> {
  assertPdfMapConfig(mappingConfig);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const fieldsByName = new Map(
    form
      .getFields()
      .map((field) => [normalizeFieldName(field.getName()), field] as const),
  );

  for (const mapping of mappingConfig.fields) {
    const field = findField(fieldsByName, mapping);

    if (!field) {
      if (mapping.required === false) {
        continue;
      }

      throw new Error(
        `Unable to find PDF field for ${mapping.key}. Tried: ${mapping.candidates.join(", ")}`,
      );
    }

    ensureSupportedFieldType(field, mapping);

    if (mapping.kind === "text") {
      (field as PDFTextField).setText(resolveTextValue(applicant, mapping));
      continue;
    }

    if (resolveCheckboxValue(applicant, mapping)) {
      (field as PDFCheckBox).check();
    } else {
      (field as PDFCheckBox).uncheck();
    }
  }

  form.flatten();

  return Buffer.from(await pdfDoc.save());
}