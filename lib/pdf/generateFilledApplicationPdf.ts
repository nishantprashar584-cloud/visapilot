import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildApplicationWorksheet } from "@/lib/applications/applicationWorksheet";
import { calculateStayDurationDays } from "@/lib/applications/schema";
import { normalizeApplicantTourismScope } from "@/lib/applications/travelPurpose";
import { fillSchengenForm } from "@/lib/pdf/fillSchengenForm";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import { generateTextPdf } from "@/lib/pdf/generateTextPdf";
import type { ApplicantInfo } from "@/types";

function normalizeApplicantInfo(applicant: ApplicantInfo): ApplicantInfo {
  const stayDurationDays = calculateStayDurationDays(
    applicant.trip.arrivalDate,
    applicant.trip.departureDate,
  );

  const tourismScopedApplicant = normalizeApplicantTourismScope(applicant);

  return {
    ...tourismScopedApplicant,
    trip: {
      ...tourismScopedApplicant.trip,
      memberStatesToVisit:
        tourismScopedApplicant.trip.memberStatesToVisit.length > 0
          ? tourismScopedApplicant.trip.memberStatesToVisit
          : [tourismScopedApplicant.trip.destinationCountry],
      stayDurationDays,
    },
  };
}

async function readPdfTemplate(templatePath: string): Promise<Buffer> {
  return readFile(path.resolve(process.cwd(), templatePath));
}

export async function generateFilledApplicationPdf(applicant: ApplicantInfo): Promise<Buffer> {
  const normalizedApplicant = normalizeApplicantInfo(applicant);
  const pdfStrategy = await resolvePdfGenerationStrategy(normalizedApplicant.trip.destinationCountry);

  if (!pdfStrategy.supportsNativeAutofill) {
    const worksheetBytes = await generateTextPdf(
      buildApplicationWorksheet({
        applicant: normalizedApplicant,
        templateLabel: pdfStrategy.templateLabel,
        portalUrl: pdfStrategy.portalUrl,
        guidanceMessage: pdfStrategy.guidanceMessage,
      }),
    );

    return Buffer.from(worksheetBytes);
  }

  const templateBytes = await readPdfTemplate(pdfStrategy.templatePath);

  return fillSchengenForm(normalizedApplicant, pdfStrategy.pdfMap, templateBytes);
}