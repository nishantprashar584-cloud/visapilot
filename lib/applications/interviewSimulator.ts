import { runRiskAudit } from "@/lib/riskAudit";
import type { ApplicantInfo, InterviewQuestion } from "@/types";

export function generateConsularInterviewQuestions(applicant: ApplicantInfo): InterviewQuestion[] {
  const audit = runRiskAudit(applicant);
  const questions: InterviewQuestion[] = [];

  if (audit.anomalyDetected) {
    questions.push({
      id: "source-of-funds",
      channel: "voice",
      severity: "high",
      rationale: "Large deposit anomalies often trigger funds-source scrutiny during Schengen adjudication.",
      prompt: "A recent deposit in your statement appears unusually high. Explain exactly where that money came from and which document in your packet proves it.",
    });
  }

  if (applicant.employment.employmentStatus === "self_employed" || applicant.employment.employmentStatus === "contractor") {
    questions.push({
      id: "freelance-income",
      channel: "voice",
      severity: "high",
      rationale: "Irregular freelance income needs a coherent institutional paper trail.",
      prompt: "How do you earn your income, which clients or platforms pay you, and which documents in your file prove that those payments are genuine and recurring?",
    });
  }

  if (applicant.trip.previousSchengenVisasIssued === false) {
    questions.push({
      id: "first-time-travel",
      channel: "text",
      severity: "medium",
      rationale: "First-time or low-travel-history applicants are often tested on return intent and planning credibility.",
      prompt: "This appears to be one of your first international trips. Why have you chosen this destination now, and what assures the consulate that you will return home on time?",
    });
  }

  if ((applicant.trip.memberStatesToVisit?.length ?? 0) > 1) {
    questions.push({
      id: "multi-country-split",
      channel: "voice",
      severity: "medium",
      rationale: "Multi-country itineraries are commonly tested for consular jurisdiction and trip coherence.",
      prompt: `You plan to visit ${applicant.trip.memberStatesToVisit.join(", ")}. Explain why ${applicant.trip.destinationCountry} is the main destination and how the day-by-day route supports that choice.`,
    });
  }

  if (!audit.checks.roundTripEvidence) {
    questions.push({
      id: "return-travel",
      channel: "text",
      severity: "high",
      rationale: "Missing onward or return travel evidence weakens intent-to-depart analysis.",
      prompt: "What is your confirmed plan to leave the Schengen Area, and where is that proof in your packet?",
    });
  }

  if (!audit.checks.accommodationEvidence) {
    questions.push({
      id: "accommodation",
      channel: "text",
      severity: "medium",
      rationale: "Gaps in stay planning invite scrutiny over itinerary credibility.",
      prompt: "Describe where you will stay each night of the trip and show how that matches the accommodation confirmations in your file.",
    });
  }

  if (questions.length === 0) {
    questions.push({
      id: "general-purpose",
      channel: "voice",
      severity: "low",
      rationale: "Low-risk cases should still rehearse a concise, consistent trip narrative.",
      prompt: "Summarize your trip purpose, travel dates, funding plan, and the reason you will return home after the visit.",
    });
  }

  return questions;
}