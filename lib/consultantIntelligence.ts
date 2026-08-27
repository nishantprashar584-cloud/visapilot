import { calculateStatutoryFundsRequirement } from "@/config/schengen-rules";
import type { ApplicantInfo, EmploymentStatus, FundingSource } from "@/types";

const baseRequiredDocuments = [
  "Passport",
  "Flight Itinerary",
  "Hotel Booking",
  "Travel Insurance",
];

export function formatEmploymentStatusLabel(status: EmploymentStatus): string {
  switch (status) {
    case "self_employed":
      return "Freelancer / Self-Employed";
    case "student":
      return "Student";
    case "retired":
      return "Retired";
    case "unemployed":
      return "Unemployed";
    case "contractor":
      return "Contractor";
    case "other":
      return "Other";
    default:
      return "Employed";
  }
}

export function formatFundingSourceLabel(fundingSource: FundingSource): string {
  switch (fundingSource) {
    case "family_sponsored":
      return "Sponsored by Family";
    case "company_sponsored":
      return "Sponsored by Company";
    default:
      return "Self-Funded";
  }
}

export function isSponsoredFundingSource(fundingSource: FundingSource): boolean {
  return fundingSource !== "self_funded";
}

export function generateRequiredDocuments(employment: EmploymentStatus, funding: FundingSource): string[] {
  const requiredDocuments = [...baseRequiredDocuments];

  if (employment === "employed") {
    requiredDocuments.push("NOC from Employer", "3 Months Payslips");
  }

  if (employment === "self_employed") {
    requiredDocuments.push("Business Registration/Tax Returns", "Recent Client Invoices");
  }

  if (employment === "student") {
    requiredDocuments.push("University Enrollment Letter", "NOC from School");
  }

  if (isSponsoredFundingSource(funding)) {
    requiredDocuments.push("Sponsorship Letter", "Sponsor's Bank Statements");
  }

  return requiredDocuments;
}

export function buildConsultantContext(applicant: ApplicantInfo) {
  const hasAccommodationProof = Boolean(
    applicant.trip.accommodations.trim() && applicant.trip.hotelBookingReference.trim(),
  );
  const financialRule = calculateStatutoryFundsRequirement({
    destinationCountry: applicant.trip.destinationCountry,
    stayDurationDays: applicant.trip.stayDurationDays,
    hasAccommodationProof,
  });

  return {
    employmentStatusLabel: formatEmploymentStatusLabel(applicant.employment.employmentStatus),
    fundingSourceLabel: formatFundingSourceLabel(applicant.sponsor.fundingSource),
    requiredDocuments: generateRequiredDocuments(applicant.employment.employmentStatus, applicant.sponsor.fundingSource),
    financialRule,
  };
}