import { calculateStatutoryFundsRequirement, consultantDailyMinimumEur } from "@/config/schengen-rules";
import { detectFinancialAnomaly, estimateUnitEconomicCost, resolveApplicantProfileRequirements } from "@/lib/applications/consularPolicy";
import type { ApplicantInfo, ApplicationRow, RiskAuditResult } from "@/types";

function addMonths(dateValue: string, months: number): Date {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + months);
  return date;
}

export function runRiskAudit(applicant: ApplicantInfo): RiskAuditResult {
  const destinationCountry = applicant.trip.destinationCountry;
  const hasAccommodationProof =
    applicant.trip.accommodations.trim().length > 0 &&
    applicant.trip.hotelBookingReference.trim().length > 0;
  const transitBufferEur = Math.max(0, applicant.financialEvidence?.transitBufferEur ?? 0);
  const financialRule = calculateStatutoryFundsRequirement({
    destinationCountry,
    stayDurationDays: applicant.trip.stayDurationDays,
    hasAccommodationProof,
    transitBufferEur,
  });
  const countryRule = financialRule.rule;
  const profileRequirements = resolveApplicantProfileRequirements(applicant);
  const anomaly = detectFinancialAnomaly(applicant);
  const appliedDailyFundsRuleEur = financialRule.appliedDailyRateEur;
  const requiredLiquidBalanceEur = financialRule.requiredTotalEur;
  const recommendedLiquidBalanceEur = requiredLiquidBalanceEur * countryRule.recommendedBufferMultiplier;
  const availableLiquidBalanceEur = applicant.financialEvidence?.closingBalanceEur ?? applicant.employment.savingsBalanceEur;
  const dailyBudgetEur = applicant.trip.stayDurationDays > 0
    ? availableLiquidBalanceEur / applicant.trip.stayDurationDays
    : 0;
  const passportThresholdDate = addMonths(applicant.trip.departureDate, 3);
  const passportExpiryDate = new Date(applicant.passport.dateOfExpiry);
  const passportValiditySatisfied = passportExpiryDate >= passportThresholdDate;
  const statutoryFundsSatisfied = availableLiquidBalanceEur >= requiredLiquidBalanceEur;
  const financialSufficiency = statutoryFundsSatisfied;
  const financialBufferSatisfied = availableLiquidBalanceEur >= recommendedLiquidBalanceEur;
  const consultantWarning = applicant.trip.stayDurationDays > 0 && dailyBudgetEur < consultantDailyMinimumEur;
  const accommodationEvidence =
    applicant.trip.accommodations.trim().length > 0 &&
    applicant.trip.hotelBookingReference.trim().length > 0;
  const roundTripEvidence =
    applicant.trip.arrivalDate.trim().length > 0 && applicant.trip.departureDate.trim().length > 0;

  const missingDocuments: string[] = [];
  const fixInstructions: string[] = [];

  if (!statutoryFundsSatisfied) {
    missingDocuments.push("Updated bank statement showing sufficient liquid balance.");
    fixInstructions.push(
      `Increase accessible funds to at least EUR ${requiredLiquidBalanceEur.toFixed(2)} before submission.`,
    );
  } else if (!financialBufferSatisfied) {
    fixInstructions.push(
      `Funds meet the minimum but a safer target is EUR ${recommendedLiquidBalanceEur.toFixed(2)} for a stronger compliance buffer.`,
    );
  }

  if (anomaly.detected && anomaly.blockingReason) {
    missingDocuments.push("Source-of-funds explanation for large recent deposits.");
    fixInstructions.push(anomaly.blockingReason);
  }

  if (!passportValiditySatisfied) {
    missingDocuments.push("Passport renewed with at least 3 months of validity after return date.");
    fixInstructions.push(
      "Renew the passport or adjust the travel plan so passport validity extends at least 3 months beyond departure.",
    );
  }

  if (countryRule.requireAccommodationProof && !accommodationEvidence) {
    missingDocuments.push("Accommodation booking confirmation or host accommodation proof.");
    fixInstructions.push(
      "Attach a hotel confirmation or host accommodation evidence aligned with the stay dates.",
    );
  }

  if (countryRule.requireRoundTripReservation && !roundTripEvidence) {
    missingDocuments.push("Round-trip or onward travel reservation.");
    fixInstructions.push(
      "Add confirmed arrival and departure reservation details before consular submission.",
    );
  }

  if (consultantWarning) {
    fixInstructions.push(
      `Your daily budget is below the recommended EUR ${consultantDailyMinimumEur.toFixed(0)}/day. Consider adding a sponsor or attaching additional savings accounts.`,
    );
  }

  profileRequirements.notes.forEach((note) => {
    fixInstructions.push(note);
  });

  const status: RiskAuditResult["status"] =
    !statutoryFundsSatisfied || !passportValiditySatisfied || anomaly.detected
      ? "RED"
      : missingDocuments.length > 0 || !financialBufferSatisfied || consultantWarning
        ? "YELLOW"
        : "GREEN";

  const unitEconomics = estimateUnitEconomicCost({
    requiresAutomatedAnomalyResolution: status === "RED" || missingDocuments.length >= 4,
  });

  if (status === "GREEN") {
    fixInstructions.push("Core financial, itinerary, and passport checks currently align with configured Schengen rules.");
  }

  return {
    status,
    destinationCountry,
    profileRoute: profileRequirements.route,
    profileRequiredDocuments: profileRequirements.requiredDocuments,
    hasExactCountryRule: countryRule.hasExactStatutoryRule,
    appliedDailyFundsRuleEur,
    transitBufferEur,
    requiredLiquidBalanceEur,
    recommendedLiquidBalanceEur,
    availableLiquidBalanceEur,
    dailyBudgetEur,
    consultantDailyMinimumEur,
    statutoryRuleSummary: financialRule.summary,
    consultantWarning,
    consultantWarningMessage: consultantWarning
      ? `Your daily budget is below the recommended EUR ${consultantDailyMinimumEur.toFixed(0)}/day. Consulates often reject applications for insufficient funds. Consider adding a sponsor or attaching additional savings accounts.`
      : null,
    anomalyDetected: anomaly.detected,
    anomalyThresholdEur: anomaly.thresholdEur,
    anomalyBlockingReason: anomaly.blockingReason,
    passportValidThrough: applicant.passport.dateOfExpiry,
    passportValiditySatisfied,
    financialBufferSatisfied,
    statutoryFundsSatisfied,
    unitEconomics,
    missingDocuments,
    fixInstructions,
    checks: {
      financialSufficiency,
      financialAnomalyClearance: !anomaly.detected,
      passportValidity: passportValiditySatisfied,
      accommodationEvidence,
      roundTripEvidence,
    },
  };
}

export function getProcessingProgress(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const totalWindowMs = 15 * 24 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now - created);
  return Math.min(100, Math.round((elapsedMs / totalWindowMs) * 100));
}

export function getPrivacyCountdownDays(privacyPurgeAt: string): number {
  const purgeAt = new Date(privacyPurgeAt).getTime();
  const now = Date.now();
  const remainingMs = Math.max(0, purgeAt - now);
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function canReapplyForFree(application: Pick<ApplicationRow, "status" | "recovery_status" | "privacy_purge_at">): boolean {
  return (
    application.status === "rejected" &&
    application.recovery_status !== "CLAIMED" &&
    getPrivacyCountdownDays(application.privacy_purge_at) > 0
  );
}