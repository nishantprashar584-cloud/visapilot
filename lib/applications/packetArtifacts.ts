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

export function buildFinancialAuditReport(applicant: ApplicantInfo): string {
  const audit = runRiskAudit(applicant);

  return [
    `# ${applicant.personal.firstName} ${applicant.personal.lastName} Financial Audit Report`,
    "",
    `Destination: ${applicant.trip.destinationCountry}`,
    `Travel window: ${applicant.trip.arrivalDate} to ${applicant.trip.departureDate}`,
    `Audit status: ${audit.status}`,
    `Required funds (EUR): ${audit.requiredLiquidBalanceEur.toFixed(2)}`,
    `Recommended buffer (EUR): ${audit.recommendedLiquidBalanceEur.toFixed(2)}`,
    `Available liquid balance (EUR): ${audit.availableLiquidBalanceEur.toFixed(2)}`,
    `Passport valid through: ${audit.passportValidThrough}`,
    "",
    "## Checks",
    `- Financial sufficiency: ${audit.checks.financialSufficiency ? "Pass" : "Review required"}`,
    `- Passport validity: ${audit.checks.passportValidity ? "Pass" : "Review required"}`,
    `- Accommodation evidence: ${audit.checks.accommodationEvidence ? "Pass" : "Missing or weak"}`,
    `- Round-trip evidence: ${audit.checks.roundTripEvidence ? "Pass" : "Missing or weak"}`,
    "",
    "## Recommended Fixes",
    ...audit.fixInstructions.map((instruction) => `- ${instruction}`),
  ].join("\n");
}

export function buildRegionalFormGuidance(args: {
  applicant: ApplicantInfo;
  templateLabel: string;
  portalUrl: string;
  guidanceMessage: string;
}): string {
  return [
    "# Regional Form Guidance",
    "",
    `Destination: ${args.applicant.trip.destinationCountry}`,
    `Fallback form included: ${args.templateLabel}`,
    `Official visa guidance: ${args.portalUrl}`,
    "",
    args.guidanceMessage,
    "",
    '"Form auto-fill pending for this region. Your AI Cover Letter, Checklist, Financial Audit, and Insurance Slip are ready in your ZIP packet."',
    "",
    "Use the included harmonized Schengen template alongside the rest of the packet if your jurisdiction requires a country-specific blank form.",
  ].join("\n");
}