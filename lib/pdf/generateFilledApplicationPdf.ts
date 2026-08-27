import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { calculateStayDurationDays } from "@/lib/applications/schema";
import { fillSchengenForm } from "@/lib/pdf/fillSchengenForm";
import { resolvePdfGenerationStrategy } from "@/lib/pdf/formStrategy";
import type { ApplicantInfo } from "@/types";

function normalizeApplicantInfo(applicant: ApplicantInfo): ApplicantInfo {
  const stayDurationDays = calculateStayDurationDays(
    applicant.trip.arrivalDate,
    applicant.trip.departureDate,
  );

  return {
    ...applicant,
    trip: {
      ...applicant.trip,
      memberStatesToVisit:
        applicant.trip.memberStatesToVisit.length > 0
          ? applicant.trip.memberStatesToVisit
          : [applicant.trip.destinationCountry],
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
  const templateBytes = await readPdfTemplate(pdfStrategy.templatePath);

  return fillSchengenForm(normalizedApplicant, pdfStrategy.pdfMap, templateBytes);
}