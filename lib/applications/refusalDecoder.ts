import type { RefusalDecoderResult, RefusalReasonCode } from "@/types";

const refusalPlaybook: Record<RefusalReasonCode, Omit<RefusalDecoderResult, "refusalReasonCode">> = {
  1: {
    title: "False or unreliable travel document",
    summary: "The refusal points to document authenticity, validity, or completeness concerns.",
    remediationSteps: [
      "Replace or renew the passport or travel document if any validity or damage issue exists.",
      "Attach a clean passport bio-page copy and prior visa pages in portrait A4 format.",
      "Confirm all application fields match the passport exactly.",
    ],
  },
  2: {
    title: "Purpose and conditions of stay not justified",
    summary: "The itinerary, booking trail, or narrative did not convincingly explain the trip.",
    remediationSteps: [
      "Rebuild the cover letter with a day-by-day itinerary and explicit purpose.",
      "Add stronger accommodation and inter-city transit proof matching each travel segment.",
      "Remove itinerary inconsistencies across the form, reservations, and supporting documents.",
    ],
  },
  3: {
    title: "Insufficient means of subsistence",
    summary: "The financial file did not satisfy statutory funds or looked too weak for the stay.",
    remediationSteps: [
      "Raise available liquid funds above the destination threshold plus buffer.",
      "Attach recent bank statements, tax records, and sponsor proof where applicable.",
      "Explain any unusual recent deposits with a source-of-funds note.",
    ],
  },
  4: {
    title: "Maximum stay exceeded or prior visa misuse concern",
    summary: "The consulate may doubt compliance with prior Schengen stay limits or prior visa usage.",
    remediationSteps: [
      "Document previous travel history clearly, including valid-from and valid-to dates.",
      "Clarify the new trip duration against the 90/180-day rule.",
      "Include a concise compliance statement in the remediation cover letter.",
    ],
  },
  5: {
    title: "SIS alert or public policy concern",
    summary: "The refusal references a system alert or public policy ground that needs specialist handling.",
    remediationSteps: [
      "Obtain the refusal file and determine the exact database or policy concern.",
      "Route the case to manual review before any reapplication.",
      "Do not reapply with unchanged facts until the underlying alert is resolved.",
    ],
  },
  6: {
    title: "Threat to public health",
    summary: "The refusal relies on a public-health admissibility issue.",
    remediationSteps: [
      "Confirm whether the consulate requested additional health documentation.",
      "Attach updated medical or insurance evidence if relevant to admissibility.",
      "Escalate to manual review before rebuilding the file.",
    ],
  },
  7: {
    title: "Threat to international relations",
    summary: "The refusal sits on a diplomatic or foreign-relations ground beyond ordinary document remediation.",
    remediationSteps: [
      "Obtain the detailed refusal notice and supporting explanation from the post.",
      "Escalate to manual review rather than automated re-filing.",
      "Avoid re-submission until the governing concern is understood.",
    ],
  },
  8: {
    title: "Intention to leave not established",
    summary: "The consulate was not satisfied that the applicant would depart before visa expiry.",
    remediationSteps: [
      "Strengthen return-tie evidence such as employment, family, property, or academic commitments.",
      "Add a clearer return-travel booking and a tighter itinerary narrative.",
      "Make the home-country obligations explicit in the cover letter.",
    ],
  },
  9: {
    title: "Insurance not adequate or not valid",
    summary: "The medical insurance proof did not meet Schengen coverage or date requirements.",
    remediationSteps: [
      "Replace the policy with Schengen-wide coverage of at least EUR 30,000.",
      "Highlight the insured travel dates inside the packet.",
      "Ensure the certificate name matches the passport exactly.",
    ],
  },
  10: {
    title: "Information not reliable",
    summary: "There were inconsistencies across the form, interview, or supporting documents.",
    remediationSteps: [
      "Reconcile the passport, bookings, financial records, and application answers line by line.",
      "Use the interview simulator to rehearse explanations for any unusual facts.",
      "Add a clarification note for any detail that could appear contradictory.",
    ],
  },
  11: {
    title: "Other refusal ground",
    summary: "The refusal falls outside the standard automated remediation lanes and needs a tailored plan.",
    remediationSteps: [
      "Capture the exact refusal wording from the notice.",
      "Escalate to manual review with a targeted reapplication strategy.",
      "Attach a custom remediation note instead of a generic appeal template.",
    ],
  },
};

export function decodeRefusalReason(refusalReasonCode: RefusalReasonCode): RefusalDecoderResult {
  return {
    refusalReasonCode,
    ...refusalPlaybook[refusalReasonCode],
  };
}