import { calculateStayDurationDays } from "@/lib/applications/schema";
import { buildApplicationEvidenceGraph, evaluateVisaRequirements, type RequirementSeverity } from "@/lib/requirements/evaluator";
import type {
  ApplicantInfo,
  ApplicationRow,
  ApplicationStatus,
  AuditLogRow,
  CaseFinding,
  CaseReadinessAssessment,
  DataProvenance,
  ServiceTrack,
  SupportingDocument,
} from "@/types";

export type JourneyStageId = "readiness" | "prepare" | "review" | "submit" | "appointment" | "completed";
export type JourneyStageTone = "complete" | "current" | "attention" | "blocked" | "future";
export type ApplicationHealthState = "READY" | "NEEDS_REVIEW" | "ACTION_REQUIRED" | "BLOCKED" | "COMPLETED";

export interface ApplicationJourneyStage {
  id: JourneyStageId;
  label: string;
  description: string;
  tone: JourneyStageTone;
}

export interface NextBestActionDescriptor {
  id: string;
  title: string;
  detail: string;
  reason: string;
  destination: "identity" | "travel" | "financial" | "accommodation" | "documents" | "submission_guide" | "vault" | "appointment" | "dashboard" | "readiness" | "review" | "completed";
  priority: number;
  sourceFindingId?: string;
  requirementId?: string;
}

export interface ApplicationHealthDescriptor {
  state: ApplicationHealthState;
  label: string;
  detail: string;
  toneClassName: string;
}

export interface CaseSnapshotItem {
  label: string;
  value: string;
}

export interface CaseChangeItem {
  id: string;
  label: string;
  impact: "recalculated" | "review";
  detail: string;
}

export interface TimelineEventDescriptor {
  id: string;
  label: string;
  detail: string;
  tone: JourneyStageTone;
  createdAt?: string;
}

type DescriptorInput = {
  status: ApplicationStatus;
  applicant?: ApplicantInfo;
  track?: ServiceTrack | null;
  readinessAssessment?: CaseReadinessAssessment | null;
  findings?: CaseFinding[];
  pendingVipAction?: { promptMessage?: string | null } | null;
  appointmentDate?: string | null;
  vfsReferenceNumber?: string | null;
};

const journeyBlueprint: Array<Pick<ApplicationJourneyStage, "id" | "label" | "description">> = [
  { id: "readiness", label: "Readiness", description: "Understand your case and the current preparation level." },
  { id: "prepare", label: "Prepare", description: "Complete the application details and supporting evidence." },
  { id: "review", label: "Review", description: "Resolve inconsistencies and confirm the final packet." },
  { id: "submit", label: "Submit", description: "Transfer the prepared packet into the official submission flow." },
  { id: "appointment", label: "Appointment", description: "Track filing outcome and appointment scheduling." },
  { id: "completed", label: "Completed", description: "The active visa workflow is complete." },
] as const;

const provenanceLabels: Record<DataProvenance, string> = {
  USER_ENTERED: "Entered by you",
  USER_CONFIRMED: "Confirmed by you",
  DOCUMENT_EXTRACTED: "Extracted from document",
  AI_INFERRED: "Suggested by VisaPilot",
  OFFICIAL_POLICY: "Requirement",
  SYSTEM_CALCULATED: "Calculated automatically",
};

function titleCaseFromSnake(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getOpenFindings(input: DescriptorInput): CaseFinding[] {
  return (input.findings ?? input.readinessAssessment?.findings ?? []).filter((finding) => finding.status !== "RESOLVED");
}

function isBlockingFinding(finding: CaseFinding) {
  return finding.blocking || finding.severity === "BLOCKING";
}

function mapRequirementSeverityToPriority(severity: RequirementSeverity) {
  switch (severity) {
    case "ACTION_REQUIRED":
      return 3;
    case "BLOCKED":
      return 1;
    case "NEEDS_REVIEW":
      return 6;
    default:
      return 20;
  }
}

function getFindingPriority(finding: CaseFinding): number {
  switch (finding.category) {
    case "DOCUMENTS":
    case "MINOR":
      return 2;
    case "IDENTITY":
      return 4;
    case "TRAVEL":
    case "ITINERARY":
    case "CONSISTENCY":
      return 5;
    case "FINANCIAL":
    case "EMPLOYMENT":
    case "SPONSORSHIP":
      return 6;
    case "ACCOMMODATION":
      return 7;
    default:
      return 8;
  }
}

function getFindingDestination(finding: CaseFinding): NextBestActionDescriptor["destination"] {
  switch (finding.category) {
    case "IDENTITY":
      return "identity";
    case "TRAVEL":
    case "ITINERARY":
      return "travel";
    case "FINANCIAL":
    case "EMPLOYMENT":
    case "SPONSORSHIP":
      return "financial";
    case "ACCOMMODATION":
      return "accommodation";
    case "DOCUMENTS":
    case "MINOR":
      return "documents";
    default:
      return "review";
  }
}

function buildFindingAction(finding: CaseFinding): NextBestActionDescriptor {
  return {
    id: finding.id,
    title: finding.recommendedAction,
    detail: finding.title,
    reason: finding.explanation,
    destination: getFindingDestination(finding),
    priority: getFindingPriority(finding),
    sourceFindingId: finding.id,
  };
}

function sortActions(actions: NextBestActionDescriptor[]) {
  return [...actions].sort((left, right) => left.priority - right.priority);
}

export function getApplicationHealth(input: DescriptorInput): ApplicationHealthDescriptor {
  const openFindings = getOpenFindings(input);
  const blockingFindings = openFindings.filter(isBlockingFinding);
  const reviewFindings = openFindings.filter((finding) => !isBlockingFinding(finding) && finding.severity !== "INFO");
  const requirementIssues = input.applicant
    ? evaluateVisaRequirements(input.applicant, input.track).filter((requirement) => requirement.status !== "SATISFIED")
    : [];

  if (input.status === "bundle_ready") {
    return {
      state: "READY",
      label: "Ready",
      detail: input.track === "VIP_CONCIERGE"
        ? "Your application packet is ready and the managed filing workflow can continue."
        : "Your visa packet is ready for the next submission step.",
      toneClassName: "vp-badge-success",
    };
  }

  if (input.status === "completed") {
    return {
      state: "COMPLETED",
      label: "Completed",
      detail: "The application workflow has been completed and the final references are available.",
      toneClassName: "vp-badge-success",
    };
  }

  if (input.status === "rejected" || input.status === "expired") {
    return {
      state: "BLOCKED",
      label: "Blocked",
      detail: "This application cannot continue without recovery or a new submission path.",
      toneClassName: "vp-badge-danger",
    };
  }

  if (input.status === "otp_pending") {
    return {
      state: "ACTION_REQUIRED",
      label: "Action Required",
      detail: "A verification step is waiting for you before filing can continue.",
      toneClassName: "vp-badge-attention",
    };
  }

  if (input.status === "action_required" || blockingFindings.length > 0 || requirementIssues.some((requirement) => requirement.severity === "ACTION_REQUIRED" || requirement.severity === "BLOCKED")) {
    const issueCount = blockingFindings.length || requirementIssues.filter((requirement) => requirement.severity === "ACTION_REQUIRED" || requirement.severity === "BLOCKED").length;

    return {
      state: "ACTION_REQUIRED",
      label: "Action Required",
      detail: `${issueCount} required item${issueCount === 1 ? "" : "s"} need attention before the case can move forward.`,
      toneClassName: "vp-badge-attention",
    };
  }

  if (reviewFindings.length > 0 || requirementIssues.some((requirement) => requirement.severity === "NEEDS_REVIEW") || input.status === "appointment_pending" || input.status === "auditing") {
    const reviewCount = reviewFindings.length || requirementIssues.filter((requirement) => requirement.severity === "NEEDS_REVIEW").length;

    return {
      state: "NEEDS_REVIEW",
      label: "Needs Review",
      detail: reviewCount > 0
        ? `${reviewCount} item${reviewCount === 1 ? " should" : "s should"} be reviewed before the next workflow step.`
        : "The case is moving, but a review step is still in progress.",
      toneClassName: "vp-badge-attention",
    };
  }

  return {
    state: "READY",
    label: "Ready",
    detail: "Your application has no current blocking issues for the next workflow step.",
    toneClassName: "vp-badge-success",
  };
}

export function getJourneyCurrentStage(input: DescriptorInput): JourneyStageId {
  if (input.status === "completed") {
    return "completed";
  }

  if (input.status === "appointment_pending" || input.status === "appointment_booked" || input.status === "portal_submitted") {
    return "appointment";
  }

  if (input.status === "bundle_ready" || input.status === "portal_filing_in_progress" || input.status === "otp_pending") {
    return "submit";
  }

  if (input.status === "action_required") {
    return "review";
  }

  if (input.status === "draft" || input.status === "paid" || input.status === "auditing" || input.status === "reapplied") {
    return "prepare";
  }

  return input.readinessAssessment ? "readiness" : "prepare";
}

export function getApplicationJourney(input: DescriptorInput): ApplicationJourneyStage[] {
  const currentStage = getJourneyCurrentStage(input);
  const currentIndex = journeyBlueprint.findIndex((stage) => stage.id === currentStage);
  const health = getApplicationHealth(input);

  return journeyBlueprint.map((stage, index) => {
    let tone: JourneyStageTone = "future";

    if (index < currentIndex) {
      tone = "complete";
    } else if (index === currentIndex) {
      tone = health.state === "BLOCKED" ? "blocked" : health.state === "ACTION_REQUIRED" ? "attention" : "current";
    }

    return {
      ...stage,
      tone,
    };
  });
}

export function getNextBestAction(input: DescriptorInput): NextBestActionDescriptor {
  const openFindings = getOpenFindings(input);
  const findingAction = sortActions(openFindings.filter((finding) => finding.severity !== "INFO").map(buildFindingAction))[0];
  const requirementAction = input.applicant
    ? sortActions(
        evaluateVisaRequirements(input.applicant, input.track)
          .filter((requirement) => requirement.status !== "SATISFIED")
          .map((requirement) => ({
            id: requirement.id,
            title: requirement.nextAction,
            detail: requirement.title,
            reason: requirement.explanation,
            destination: requirement.destination,
            priority: mapRequirementSeverityToPriority(requirement.severity),
            requirementId: requirement.id,
          })),
      )[0]
    : null;

  if (input.status === "otp_pending") {
    return {
      id: "otp_pending",
      title: "Enter verification code",
      detail: "Enter the verification code to allow the filing process to continue.",
      reason: input.pendingVipAction?.promptMessage ?? "Managed filing is waiting for the OTP verification step.",
      destination: "vault",
      priority: 2,
    };
  }

  if (input.status === "bundle_ready" && input.track === "APPLY_MYSELF") {
    return {
      id: "smart_form_helper",
      title: "Open Smart Form Helper",
      detail: "Your visa packet is ready. Use Smart Form Helper to transfer prepared answers into the official submission flow.",
      reason: "The packet is ready and the next step is completing the official form or portal submission.",
      destination: "submission_guide",
      priority: 10,
    };
  }

  if (input.status === "bundle_ready" && input.track === "VIP_CONCIERGE") {
    return {
      id: "portal_filing",
      title: "Review filing progress",
      detail: "Your packet is ready and filing is the next milestone in the managed workflow.",
      reason: "The case is prepared and waiting on the DFY filing lane.",
      destination: "vault",
      priority: 11,
    };
  }

  if (findingAction && (!requirementAction || findingAction.priority <= requirementAction.priority)) {
    return findingAction;
  }

  if (requirementAction) {
    return requirementAction;
  }

  if (input.status === "appointment_pending" || input.status === "appointment_booked") {
    return {
      id: "appointment_status",
      title: "Review appointment status",
      detail: input.appointmentDate
        ? `Your appointment is scheduled for ${input.appointmentDate}. Review the latest case handoff details.`
        : "Review the latest appointment status and filing references.",
      reason: input.vfsReferenceNumber ? `Tracking reference ${input.vfsReferenceNumber} is available.` : "The case has reached the appointment stage.",
      destination: "appointment",
      priority: 12,
    };
  }

  if (input.status === "completed") {
    return {
      id: "completed",
      title: "View completed application",
      detail: "Open the vault for final packet downloads, references, and workflow history.",
      reason: "The active visa workflow is complete.",
      destination: "completed",
      priority: 13,
    };
  }

  return {
    id: "open_dashboard",
    title: "Open application vault",
    detail: "Review the latest case status, packet, readiness progression, and supporting documents in one place.",
    reason: "The dashboard is the best place to continue from the current workflow state.",
    destination: "vault",
    priority: 99,
  };
}

export function getCaseSnapshot(applicant: ApplicantInfo, status?: ApplicationStatus, readinessAssessment?: CaseReadinessAssessment | null): CaseSnapshotItem[] {
  const trip = applicant.trip;
  const travelers = applicant.caseContext?.travelers ?? [];
  const snapshot: CaseSnapshotItem[] = [];

  if (trip.destinationCountry.trim()) {
    snapshot.push({ label: "Destination", value: trip.destinationCountry });
  }

  if (trip.purpose) {
    snapshot.push({ label: "Application type", value: titleCaseFromSnake(trip.purpose) });
  }

  if (trip.arrivalDate && trip.departureDate) {
    snapshot.push({ label: "Travel dates", value: `${trip.arrivalDate} - ${trip.departureDate}` });

    const duration = calculateStayDurationDays(trip.arrivalDate, trip.departureDate);
    if (duration > 0) {
      snapshot.push({ label: "Duration", value: `${duration} ${duration === 1 ? "day" : "days"}` });
    }
  }

  if (travelers.length > 0) {
    snapshot.push({ label: "Travelers", value: `${travelers.length} ${travelers.length === 1 ? "traveler" : "travelers"}` });
  }

  if (applicant.sponsor.fundingSource) {
    snapshot.push({ label: "Funding", value: titleCaseFromSnake(applicant.sponsor.fundingSource) });
  }

  if (trip.accommodations.trim()) {
    snapshot.push({ label: "Accommodation", value: trip.accommodations });
  }

  if (status) {
    snapshot.push({ label: "Current health", value: getApplicationHealth({ applicant, status, track: null, readinessAssessment }).label });
  }

  return snapshot;
}

export function getProvenanceLabel(provenance: DataProvenance): string {
  return provenanceLabels[provenance];
}

export function getDocumentProvenanceSummary(document: SupportingDocument): string[] {
  const labels = ["Uploaded by you"];

  if (document.evidence) {
    labels.push(`Assigned as ${titleCaseFromSnake(document.evidence.evidenceType)}`);
    labels.push(`Mapped to ${titleCaseFromSnake(document.evidence.subjectRole.toLowerCase())}`);
  }

  return labels;
}

export function getFindingProvenanceSummary(finding: CaseFinding): string[] {
  return [getProvenanceLabel(finding.source.provenance), finding.source.label].filter(Boolean);
}

export function getCaseChangeImpact(previous: ApplicantInfo, current: ApplicantInfo): CaseChangeItem[] {
  const impacts: CaseChangeItem[] = [];

  if (previous.trip.arrivalDate !== current.trip.arrivalDate || previous.trip.departureDate !== current.trip.departureDate) {
    impacts.push(
      {
        id: "duration-recalculated",
        label: "Stay duration recalculated",
        impact: "recalculated",
        detail: "Travel dates changed, so trip duration should be rechecked across the application.",
      },
      {
        id: "accommodation-review",
        label: "Accommodation should be reviewed",
        impact: "review",
        detail: "Existing accommodation details may no longer align with the updated travel window.",
      },
      {
        id: "insurance-review",
        label: "Insurance dates should be reviewed",
        impact: "review",
        detail: "Travel-insurance coverage dates may need to match the new travel window.",
      },
      {
        id: "financial-window-review",
        label: "Financial assessment should be reviewed",
        impact: "review",
        detail: "The travel window changed, which can affect required trip funds and support evidence.",
      },
    );
  }

  if (previous.trip.destinationCountry !== current.trip.destinationCountry) {
    impacts.push(
      {
        id: "provider-review",
        label: "Provider checklist should be reviewed",
        impact: "review",
        detail: "Destination changes can affect the submission route and consulate-specific checklist.",
      },
      {
        id: "packet-review",
        label: "Packet should be regenerated",
        impact: "review",
        detail: "Destination changes can affect the checklist, guidance, and generated packet surfaces.",
      },
    );
  }

  if (previous.sponsor.fundingSource !== current.sponsor.fundingSource) {
    impacts.push(
      {
        id: "financial-review",
        label: "Financial evidence should be reviewed",
        impact: "review",
        detail: "Changing the funding source can affect the required sponsorship and financial evidence.",
      },
      {
        id: "cover-letter-review",
        label: "Cover letter should be reviewed",
        impact: "review",
        detail: "Funding changes can affect how the trip narrative should be explained.",
      },
    );
  }

  if (previous.trip.accommodations !== current.trip.accommodations || previous.trip.hotelBookingReference !== current.trip.hotelBookingReference) {
    impacts.push({
      id: "accommodation-consistency",
      label: "Accommodation consistency should be reviewed",
      impact: "review",
      detail: "Accommodation details changed and should still match the travel plan and supporting evidence.",
    });
  }

  const previousTravelerCount = previous.caseContext?.travelers?.length ?? 0;
  const currentTravelerCount = current.caseContext?.travelers?.length ?? 0;
  if (previousTravelerCount !== currentTravelerCount) {
    impacts.push(
      {
        id: "traveler-structure",
        label: "Traveler structure should be reviewed",
        impact: "review",
        detail: "Traveler count changed, so package structure and traveler-linked evidence may need updates.",
      },
      {
        id: "funding-narrative",
        label: "Funding narrative should be reviewed",
        impact: "review",
        detail: "Traveler-count changes can affect how funding and relationship evidence should be explained.",
      },
    );
  }

  return impacts;
}

export function getReadinessStaleness(previousAssessment: CaseReadinessAssessment | null | undefined, currentApplicant: ApplicantInfo): {
  stale: boolean;
  reason: string | null;
} {
  if (!previousAssessment) {
    return { stale: false, reason: null };
  }

  const currentTrip = currentApplicant.trip;

  if (previousAssessment.snapshot.destinationLabel && previousAssessment.snapshot.destinationLabel !== currentTrip.destinationCountry) {
    return {
      stale: true,
      reason: "Destination changed, so the earlier readiness result should be refreshed.",
    };
  }

  if (previousAssessment.snapshot.travelDateLabel && `${currentTrip.arrivalDate} - ${currentTrip.departureDate}` !== previousAssessment.snapshot.travelDateLabel) {
    return {
      stale: true,
      reason: "Travel dates changed, so the earlier readiness result should be refreshed.",
    };
  }

  return { stale: false, reason: null };
}

export function getApplicationTimelineEvents(application: ApplicationRow, auditLogs: AuditLogRow[] = [], readinessAssessment?: CaseReadinessAssessment | null): TimelineEventDescriptor[] {
  const events: TimelineEventDescriptor[] = [
    {
      id: `${application.id}-created`,
      label: "Application created",
      detail: "The paid application was created from your saved case data.",
      tone: "complete",
      createdAt: application.created_at,
    },
  ];

  if (readinessAssessment) {
    events.unshift({
      id: `${application.id}-readiness`,
      label: "Readiness completed",
      detail: `Initial readiness saved at ${readinessAssessment.score}/100.`,
      tone: "complete",
      createdAt: readinessAssessment.assessmentDate,
    });
  }

  const evidenceGraph = buildApplicationEvidenceGraph(application.application_data);
  if (evidenceGraph.requirementLinks.length > 0) {
    events.push({
      id: `${application.id}-evidence-linked`,
      label: "Evidence linked",
      detail: `${evidenceGraph.requirementLinks.length} document-to-requirement link${evidenceGraph.requirementLinks.length === 1 ? "" : "s"} are mapped in this case.`,
      tone: "complete",
    });
  }

  if (application.status === "bundle_ready") {
    events.push({
      id: `${application.id}-bundle-ready`,
      label: "Bundle ready",
      detail: "The print-ready packet is available for review and submission.",
      tone: "current",
      createdAt: application.updated_at,
    });
  }

  if (application.status === "otp_pending") {
    events.push({
      id: `${application.id}-otp`,
      label: "Verification required",
      detail: "A portal verification code is needed before filing can continue.",
      tone: "attention",
      createdAt: application.updated_at,
    });
  }

  if (application.status === "portal_submitted") {
    events.push({
      id: `${application.id}-portal-submitted`,
      label: "Portal submitted",
      detail: "The official filing step was completed and the appointment workflow is next.",
      tone: "complete",
      createdAt: application.updated_at,
    });
  }

  if (application.status === "appointment_booked") {
    events.push({
      id: `${application.id}-appointment-booked`,
      label: "Appointment booked",
      detail: application.appointment_date ? `Appointment booked for ${application.appointment_date}.` : "Appointment details are now available.",
      tone: "current",
      createdAt: application.updated_at,
    });
  }

  if (application.status === "completed") {
    events.push({
      id: `${application.id}-completed`,
      label: "Completed",
      detail: "The current application workflow is complete.",
      tone: "complete",
      createdAt: application.updated_at,
    });
  }

  for (const log of auditLogs) {
    if (log.event_type === "DOCUMENT_REPLACED") {
      events.push({
        id: log.id,
        label: "Document replaced",
        detail: "A document was replaced and the case should be rechecked where needed.",
        tone: "attention",
        createdAt: log.created_at,
      });
    }
  }

  return events.sort((left, right) => {
    if (!left.createdAt || !right.createdAt) {
      return 0;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}