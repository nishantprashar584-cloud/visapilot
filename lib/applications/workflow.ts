import type { ApplicationStatus, CountrySubmissionType, ServiceTrack } from "@/types";

const portalDestinations = new Set(["france", "germany", "switzerland"]);
const vipStatusTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ["auditing"],
  auditing: ["action_required", "bundle_ready", "portal_filing_in_progress"],
  action_required: ["auditing", "bundle_ready", "portal_filing_in_progress"],
  bundle_ready: ["portal_filing_in_progress", "portal_submitted", "appointment_pending"],
  portal_filing_in_progress: ["action_required", "otp_pending", "portal_submitted", "appointment_pending"],
  otp_pending: ["portal_filing_in_progress"],
  portal_submitted: ["appointment_pending", "appointment_booked", "completed"],
  appointment_pending: ["appointment_booked", "completed"],
  appointment_booked: ["completed"],
  completed: [],
  paid: ["auditing"],
  expired: [],
  rejected: ["reapplied"],
  reapplied: ["auditing"],
};

export const vaultPipelineSteps = [
  {
    id: "audit",
    label: "Audit Complete",
    description: "AI document scan, financial checks, and document review are finished.",
  },
  {
    id: "submission",
    label: "Official Submission",
    description: "Portal filing or worksheet transcription is underway.",
  },
  {
    id: "appointment",
    label: "Appointment Booking",
    description: "VFS, BLS, or TLS slot scheduling is in progress.",
  },
  {
    id: "ready",
    label: "Ready for VFS",
    description: "The case is filed and the appointment details are visible.",
  },
] as const;

export function getSubmissionTypeForDestination(destinationCountry: string): CountrySubmissionType {
  return portalDestinations.has(destinationCountry.trim().toLowerCase()) ? "PORTAL_ONLINE" : "PAPER_PDF";
}

export function getInitialApplicationStatus(track: ServiceTrack): ApplicationStatus {
  return track === "VIP_CONCIERGE" ? "auditing" : "bundle_ready";
}

export function getServiceTrackLabel(track: ServiceTrack | null | undefined): string {
  return track === "VIP_CONCIERGE" ? "Done-For-You" : "Self-Guided";
}

export function getAllowedVipStatusTransitions(status: ApplicationStatus): readonly ApplicationStatus[] {
  return vipStatusTransitions[status] ?? [];
}

export function canTransitionVipApplicationStatus(currentStatus: ApplicationStatus, nextStatus: ApplicationStatus): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  return getAllowedVipStatusTransitions(currentStatus).includes(nextStatus);
}

export function requiresVipAppointmentHandover(status: ApplicationStatus): boolean {
  return status === "appointment_booked" || status === "completed";
}

export function getVaultPipelineStepIndex(status: ApplicationStatus): number {
  switch (status) {
    case "draft":
    case "auditing":
    case "action_required":
    case "bundle_ready":
    case "paid":
      return 0;
    case "portal_filing_in_progress":
    case "otp_pending":
    case "portal_submitted":
      return 1;
    case "appointment_pending":
      return 2;
    case "appointment_booked":
    case "completed":
      return 3;
    case "expired":
    case "rejected":
    case "reapplied":
      return 0;
    default:
      return 0;
  }
}

export function getStatusNextAction(status: ApplicationStatus, track: ServiceTrack | null | undefined): string {
  if (status === "action_required") {
    return "Resolve the flagged document issue";
  }

  if (status === "otp_pending") {
    return "Submit the OTP to resume filing";
  }

  if (status === "appointment_booked") {
    return "Review the appointment handoff";
  }

  if (track === "VIP_CONCIERGE") {
    if (status === "bundle_ready" || status === "auditing") {
      return "Wait for operator assignment and filing";
    }

    if (status === "portal_submitted" || status === "appointment_pending") {
      return "Monitor operator updates in the vault";
    }
  }

  if (status === "bundle_ready") {
    return "Open the Smart Form Helper";
  }

  return "Review your visa dashboard";
}