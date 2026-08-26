import { buildDocumentSequence } from "@/components/dashboard/DocumentStackBlueprint";
import { runRiskAudit } from "@/lib/riskAudit";
import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export function buildChecklistMarkdown(
  applicant: ApplicantInfo,
  refusalReasonCode: RefusalReasonCode | null,
): string {
  const items = buildDocumentSequence(applicant, refusalReasonCode);

  return [
    `# ${applicant.personal.firstName} ${applicant.personal.lastName} Submission Checklist`,
    "",
    `Destination: ${applicant.trip.destinationCountry}`,
    `Travel dates: ${applicant.trip.arrivalDate} to ${applicant.trip.departureDate}`,
    "",
    ...items.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Review each item before your appointment and print the packet in this order.",
  ].join("\n");
}

export function buildInsuranceVerificationSlip(applicant: ApplicantInfo): string {
  const audit = runRiskAudit(applicant);

  return [
    "VisaPilot Insurance Verification Slip",
    "",
    `Applicant: ${applicant.personal.firstName} ${applicant.personal.lastName}`,
    `Destination: ${applicant.trip.destinationCountry}`,
    `Stay window: ${applicant.trip.arrivalDate} to ${applicant.trip.departureDate}`,
    `Required minimum coverage: EUR 30000`,
    `Accommodation recorded: ${applicant.trip.accommodations || "Pending"}`,
    `Audit status: ${audit.status}`,
    `Supporting note: Carry a travel medical insurance certificate valid across Schengen states for the full travel period.`,
  ].join("\n");
}