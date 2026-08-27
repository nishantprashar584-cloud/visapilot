import { Buffer } from "node:buffer";
import {
  PDFCheckBox,
  PDFDocument,
  PDFPage,
  PDFTextField,
  StandardFonts,
  rgb,
  type PDFField,
} from "pdf-lib";
import type {
  ApplicantInfo,
  ApplicantValuePath,
  PdfFieldMapping,
  PdfFieldMappingCollection,
  PdfMapConfig,
  SchengenFormFields,
} from "@/types";

const templateTokenPattern = /\{([a-zA-Z0-9.]+)\}/g;

type SupportedPdfField = PDFTextField | PDFCheckBox;
type CoordinateFallback = {
  pageIndex: number;
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
};

const coordinateFallbackByKey: Partial<Record<keyof SchengenFormFields, CoordinateFallback>> = {
  surname: { pageIndex: 0, x: 205, y: 736, maxWidth: 320 },
  surnameAtBirth: { pageIndex: 0, x: 205, y: 714, maxWidth: 320 },
  firstNames: { pageIndex: 0, x: 205, y: 692, maxWidth: 320 },
  dateOfBirth: { pageIndex: 0, x: 110, y: 656, maxWidth: 100 },
  placeOfBirth: { pageIndex: 0, x: 245, y: 656, maxWidth: 150 },
  countryOfBirth: { pageIndex: 0, x: 420, y: 656, maxWidth: 115, size: 8 },
  currentNationality: { pageIndex: 0, x: 145, y: 622, maxWidth: 160 },
  nationalityAtBirth: { pageIndex: 0, x: 355, y: 622, maxWidth: 180 },
  sexMale: { pageIndex: 0, x: 123, y: 596 },
  sexFemale: { pageIndex: 0, x: 189, y: 596 },
  maritalStatusSingle: { pageIndex: 0, x: 123, y: 572 },
  maritalStatusMarried: { pageIndex: 0, x: 189, y: 572 },
  maritalStatusSeparated: { pageIndex: 0, x: 276, y: 572 },
  maritalStatusDivorced: { pageIndex: 0, x: 387, y: 572 },
  maritalStatusWidowed: { pageIndex: 0, x: 490, y: 572 },
  documentTypeOrdinaryPassport: { pageIndex: 0, x: 122, y: 508 },
  passportNumber: { pageIndex: 0, x: 210, y: 508, maxWidth: 180 },
  passportDateOfIssue: { pageIndex: 0, x: 108, y: 484, maxWidth: 100 },
  passportValidUntil: { pageIndex: 0, x: 250, y: 484, maxWidth: 100 },
  passportIssuedBy: { pageIndex: 0, x: 405, y: 484, maxWidth: 125, size: 8 },
  applicantAddress: { pageIndex: 0, x: 108, y: 427, maxWidth: 420, size: 8 },
  applicantEmail: { pageIndex: 0, x: 108, y: 362, maxWidth: 230, size: 8 },
  applicantPhone: { pageIndex: 0, x: 355, y: 362, maxWidth: 170, size: 8 },
  residenceCountry: { pageIndex: 0, x: 108, y: 338, maxWidth: 200 },
  occupation: { pageIndex: 0, x: 108, y: 297, maxWidth: 220 },
  employerNameAndAddress: { pageIndex: 0, x: 108, y: 275, maxWidth: 420, size: 8 },
  destinationMemberStates: { pageIndex: 1, x: 110, y: 742, maxWidth: 210 },
  firstEntryMemberState: { pageIndex: 1, x: 360, y: 742, maxWidth: 170 },
  numberOfEntriesSingle: { pageIndex: 1, x: 111, y: 707 },
  numberOfEntriesDouble: { pageIndex: 1, x: 158, y: 707 },
  numberOfEntriesMultiple: { pageIndex: 1, x: 212, y: 707 },
  durationOfStayDays: { pageIndex: 1, x: 357, y: 707, maxWidth: 60 },
  arrivalDate: { pageIndex: 1, x: 110, y: 682, maxWidth: 95 },
  departureDate: { pageIndex: 1, x: 250, y: 682, maxWidth: 95 },
  travelPurposeTourism: { pageIndex: 1, x: 112, y: 633 },
  travelPurposeBusiness: { pageIndex: 1, x: 180, y: 633 },
  travelPurposeFamilyVisit: { pageIndex: 1, x: 253, y: 633 },
  travelPurposeMedical: { pageIndex: 1, x: 348, y: 633 },
  travelPurposeStudy: { pageIndex: 1, x: 430, y: 633 },
  travelPurposeCultural: { pageIndex: 1, x: 112, y: 610 },
  travelPurposeSports: { pageIndex: 1, x: 205, y: 610 },
  travelPurposeOfficial: { pageIndex: 1, x: 280, y: 610 },
  travelPurposeTransit: { pageIndex: 1, x: 360, y: 610 },
  fingerprintsTakenNo: { pageIndex: 1, x: 111, y: 534 },
  fingerprintsTakenYes: { pageIndex: 1, x: 160, y: 534 },
  permitForFinalDestinationNo: { pageIndex: 1, x: 111, y: 474 },
  permitForFinalDestinationYes: { pageIndex: 1, x: 160, y: 474 },
  invitingPersonName: { pageIndex: 1, x: 110, y: 392, maxWidth: 420, size: 8 },
  invitingPersonAddress: { pageIndex: 1, x: 110, y: 370, maxWidth: 420, size: 8 },
  invitingCompanyName: { pageIndex: 1, x: 110, y: 322, maxWidth: 420, size: 8 },
  invitingCompanyAddress: { pageIndex: 1, x: 110, y: 300, maxWidth: 420, size: 8 },
  travelCostsCoveredByApplicant: { pageIndex: 1, x: 111, y: 214 },
  travelCostsCoveredBySponsor: { pageIndex: 1, x: 298, y: 214 },
  placeAndDate: { pageIndex: 2, x: 110, y: 162, maxWidth: 240 },
};

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

function ensurePage(pdfDoc: PDFDocument, pageIndex: number): PDFPage {
  while (pdfDoc.getPageCount() <= pageIndex) {
    pdfDoc.addPage();
  }

  return pdfDoc.getPages()[pageIndex];
}

function wrapLines(page: PDFPage, value: string, maxWidth: number, fontSize: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (page.getWidth() && nextLine.length > 0) {
      const estimatedWidth = nextLine.length * fontSize * 0.52;

      if (estimatedWidth <= maxWidth) {
        currentLine = nextLine;
        continue;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

async function drawCoordinateFallback(
  pdfDoc: PDFDocument,
  applicant: ApplicantInfo,
  mappingConfig: PdfMapConfig,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const mapping of mappingConfig.fields) {
    const coordinates = coordinateFallbackByKey[mapping.key];

    if (!coordinates) {
      if (mapping.required === false) {
        continue;
      }

      throw new Error(`No coordinate fallback is configured for PDF field ${mapping.key}.`);
    }

    const page = ensurePage(pdfDoc, coordinates.pageIndex);
    const fontSize = coordinates.size ?? 9;

    if (mapping.kind === "text") {
      const textValue = resolveTextValue(applicant, mapping);

      if (!textValue) {
        continue;
      }

      const lines = wrapLines(page, textValue, coordinates.maxWidth ?? 220, fontSize);
      lines.slice(0, 3).forEach((line, index) => {
        page.drawText(line, {
          x: coordinates.x,
          y: coordinates.y - index * (fontSize + 2),
          size: fontSize,
          font,
          color: rgb(0.08, 0.09, 0.12),
        });
      });
      continue;
    }

    if (resolveCheckboxValue(applicant, mapping)) {
      page.drawText("X", {
        x: coordinates.x,
        y: coordinates.y,
        size: coordinates.size ?? 10,
        font,
        color: rgb(0.08, 0.09, 0.12),
      });
    }
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
  const formFields = form.getFields();

  if (formFields.length === 0) {
    await drawCoordinateFallback(pdfDoc, applicant, mappingConfig);
    return Buffer.from(await pdfDoc.save());
  }

  const fieldsByName = new Map(
    formFields.map((field) => [normalizeFieldName(field.getName()), field] as const),
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