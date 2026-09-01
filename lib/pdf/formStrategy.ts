import "server-only";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import francePdfMap from "@/config/pdf-maps/france.json";
import germanyPdfMap from "@/config/pdf-maps/germany.json";
import spainPdfMap from "@/config/pdf-maps/spain.json";
import { PDFDocument } from "pdf-lib";
import type { PdfMapConfig } from "@/types";

const nativePdfMapsByCountry: Record<string, PdfMapConfig> = {
  france: francePdfMap as PdfMapConfig,
  spain: spainPdfMap as PdfMapConfig,
  germany: germanyPdfMap as PdfMapConfig,
};

const defaultVisaGuidanceUrl =
  "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy/how-apply-schengen-visa_en";

const visaGuidanceUrls: Record<string, string> = {
  france: "https://france-visas.gouv.fr/",
  spain: "https://www.exteriores.gob.es/Consulados/londres/en/ServiciosConsulares/Paginas/Consular/Visado-de-corta-duracion-Schengen.aspx",
  germany: "https://digital.diplo.de/visa",
  italy: "https://vistoperitalia.esteri.it/home/en",
  netherlands: "https://www.netherlandsworldwide.nl/visa-the-netherlands/schengen-visa",
  switzerland: "https://www.sem.admin.ch/sem/en/home/themen/einreise/visum/visumantragsformular.html",
  austria: "https://www.bmeia.gv.at/en/austrian-embassy-new-delhi/travelling-to-austria/visa",
  portugal: "https://vistos.mne.gov.pt/en/short-stay-visas-schengen",
};

export type PdfGenerationStrategy = {
  pdfMap: PdfMapConfig;
  templatePath: string;
  templateLabel: string;
  destinationCountry: string;
  supportsNativeAutofill: boolean;
  portalUrl: string;
  guidanceMessage: string | null;
};

export type TemplateAuditStatus = {
  key: string;
  destinationCountry: string;
  templatePath: string;
  templateLabel: string;
  portalUrl: string;
  templateExists: boolean;
  supportsNativeAutofill: boolean;
};

export function normalizeCountryKey(country: string): string {
  return country.trim().toLowerCase();
}

export function getVisaGuidanceUrl(destinationCountry: string): string {
  return visaGuidanceUrls[normalizeCountryKey(destinationCountry)] ?? defaultVisaGuidanceUrl;
}

async function templateExists(templatePath: string): Promise<boolean> {
  try {
    await access(templatePath);
    return true;
  } catch {
    return false;
  }
}

async function templateHasAcroFormFields(templatePath: string): Promise<boolean> {
  try {
    const fileBytes = await readFile(path.resolve(process.cwd(), templatePath));
    const pdfDoc = await PDFDocument.load(fileBytes);
    return pdfDoc.getForm().getFields().length > 0;
  } catch {
    return false;
  }
}

export async function getTemplateAuditStatuses(): Promise<TemplateAuditStatus[]> {
  const configuredStatuses = await Promise.all(
    Object.entries(nativePdfMapsByCountry).map(async ([key, pdfMap]) => {
      const hasTemplateFile = await templateExists(pdfMap.templatePath);
      const supportsNativeAutofill = hasTemplateFile
        ? await templateHasAcroFormFields(pdfMap.templatePath)
        : false;

      return {
        key,
        destinationCountry: pdfMap.country,
        templatePath: pdfMap.templatePath,
        templateLabel: `${pdfMap.country} official Schengen form`,
        portalUrl: getVisaGuidanceUrl(pdfMap.country),
        templateExists: hasTemplateFile,
        supportsNativeAutofill,
      };
    }),
  );

  const universalTemplatePath = "public/templates/schengen_universal.pdf";
  const universalTemplateExists = await templateExists(universalTemplatePath);
  const universalSupportsNativeAutofill = universalTemplateExists
    ? await templateHasAcroFormFields(universalTemplatePath)
    : false;

  configuredStatuses.push({
    key: "universal",
    destinationCountry: "Universal",
    templatePath: universalTemplatePath,
    templateLabel: "Universal harmonized Schengen form",
    portalUrl: defaultVisaGuidanceUrl,
    templateExists: universalTemplateExists,
    supportsNativeAutofill: universalSupportsNativeAutofill,
  });

  return configuredStatuses;
}

export async function resolvePdfGenerationStrategy(
  destinationCountry: string,
): Promise<PdfGenerationStrategy> {
  const normalizedCountry = normalizeCountryKey(destinationCountry);
  const mappedPdf = nativePdfMapsByCountry[normalizedCountry];

  if (mappedPdf && (await templateExists(mappedPdf.templatePath))) {
    const hasNativeFields = await templateHasAcroFormFields(mappedPdf.templatePath);

    return {
      pdfMap: mappedPdf,
      templatePath: mappedPdf.templatePath,
      templateLabel: `${destinationCountry} official Schengen form`,
      destinationCountry,
      supportsNativeAutofill: hasNativeFields,
      portalUrl: getVisaGuidanceUrl(destinationCountry),
      guidanceMessage: hasNativeFields
        ? null
        : `The available ${destinationCountry} official template is a flat PDF without interactive AcroForm fields, so VisaPilot generated a structured overlay draft and prioritizes the master VFS bundle for printing.`,
    };
  }

  const universalTemplatePath = "public/templates/schengen_universal.pdf";
  const fallbackTemplatePath = (await templateExists(universalTemplatePath))
    ? universalTemplatePath
    : (await templateExists(spainPdfMap.templatePath))
      ? spainPdfMap.templatePath
      : null;

  if (!fallbackTemplatePath) {
    throw new Error(
      "No compatible Schengen form template is available. Add public/templates/schengen_universal.pdf or keep public/templates/schengen_spain.pdf in place before generating this packet.",
    );
  }

  const guidanceMessage = mappedPdf
    ? `The official ${destinationCountry} template is not present locally, so VisaPilot used the harmonized fallback form while still generating the full embassy packet.`
    : `Form auto-fill is not yet mapped natively for ${destinationCountry}. VisaPilot used the harmonized fallback form and still generated the full packet.`;

  return {
    pdfMap: spainPdfMap as PdfMapConfig,
    templatePath: fallbackTemplatePath,
    templateLabel:
      fallbackTemplatePath === universalTemplatePath
        ? "Universal harmonized Schengen form"
        : "Spain harmonized Schengen form",
    destinationCountry,
    supportsNativeAutofill: false,
    portalUrl: getVisaGuidanceUrl(destinationCountry),
    guidanceMessage,
  };
}