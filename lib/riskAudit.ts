import riskRules from "@/config/risk-rules.json";
import type { ApplicantInfo, ApplicationRow, CountryRiskRule, RiskAuditResult, RiskRulesConfig } from "@/types";

const typedRiskRules = riskRules as RiskRulesConfig;

function resolveCountryRule(destinationCountry: string): CountryRiskRule {
  const countryRule = typedRiskRules.countries[destinationCountry];

  if (!countryRule) {
    throw new Error(`No risk rules configured for ${destinationCountry}.`);
  }

  return countryRule;
}

function addMonths(dateValue: string, months: number): Date {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + months);
  return date;
}

export function runRiskAudit(applicant: ApplicantInfo): RiskAuditResult {
  const destinationCountry = applicant.trip.destinationCountry;
  const countryRule = resolveCountryRule(destinationCountry);
  const hasAccommodationProof =
    applicant.trip.accommodations.trim().length > 0 &&
    applicant.trip.hotelBookingReference.trim().length > 0;
  const appliedDailyFundsRuleEur =
    !hasAccommodationProof && countryRule.dailyFundsWithoutAccommodationEur
      ? countryRule.dailyFundsWithoutAccommodationEur
      : countryRule.dailyFundsEur;
  const stayBasedRequirementEur = applicant.trip.stayDurationDays * appliedDailyFundsRuleEur;
  const requiredLiquidBalanceEur = Math.max(
    stayBasedRequirementEur,
    countryRule.minimumBalanceEur ?? 0,
  );
  const recommendedLiquidBalanceEur = requiredLiquidBalanceEur * countryRule.recommendedBufferMultiplier;
  const availableLiquidBalanceEur = applicant.employment.savingsBalanceEur;
  const passportThresholdDate = addMonths(applicant.trip.departureDate, 3);
  const passportExpiryDate = new Date(applicant.passport.dateOfExpiry);
  const passportValiditySatisfied = passportExpiryDate >= passportThresholdDate;
  const financialSufficiency = availableLiquidBalanceEur >= requiredLiquidBalanceEur;
  const financialBufferSatisfied = availableLiquidBalanceEur >= recommendedLiquidBalanceEur;
  const accommodationEvidence =
    applicant.trip.accommodations.trim().length > 0 &&
    applicant.trip.hotelBookingReference.trim().length > 0;
  const roundTripEvidence =
    applicant.trip.arrivalDate.trim().length > 0 && applicant.trip.departureDate.trim().length > 0;

  const missingDocuments: string[] = [];
  const fixInstructions: string[] = [];

  if (!financialSufficiency) {
    missingDocuments.push("Updated bank statement showing sufficient liquid balance.");
    fixInstructions.push(
      `Increase accessible funds to at least EUR ${requiredLiquidBalanceEur.toFixed(2)} before submission.`,
    );
  } else if (!financialBufferSatisfied) {
    fixInstructions.push(
      `Funds meet the minimum but a safer target is EUR ${recommendedLiquidBalanceEur.toFixed(2)} for a stronger compliance buffer.`,
    );
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

  const status: RiskAuditResult["status"] =
    !financialSufficiency || !passportValiditySatisfied
      ? "RED"
      : missingDocuments.length > 0 || !financialBufferSatisfied
        ? "YELLOW"
        : "GREEN";

  if (status === "GREEN") {
    fixInstructions.push("Core financial, itinerary, and passport checks currently align with configured Schengen rules.");
  }

  return {
    status,
    destinationCountry,
    appliedDailyFundsRuleEur,
    requiredLiquidBalanceEur,
    recommendedLiquidBalanceEur,
    availableLiquidBalanceEur,
    passportValidThrough: applicant.passport.dateOfExpiry,
    passportValiditySatisfied,
    financialBufferSatisfied,
    missingDocuments,
    fixInstructions,
    checks: {
      financialSufficiency,
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