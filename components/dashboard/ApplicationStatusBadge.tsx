import type { ApplicationStatus } from "@/types";

const statusClasses: Record<ApplicationStatus, string> = {
  draft: "vp-badge-neutral",
  auditing: "vp-badge-travel",
  action_required: "vp-badge-attention",
  bundle_ready: "vp-badge-success",
  portal_filing_in_progress: "vp-badge-ai",
  otp_pending: "vp-badge-attention",
  portal_submitted: "vp-badge-brand",
  appointment_pending: "vp-badge-attention",
  appointment_booked: "vp-badge-brand",
  paid: "vp-badge-brand",
  completed: "vp-badge-success",
  expired: "vp-badge-neutral",
  rejected: "vp-badge-danger",
  reapplied: "vp-badge-ai",
};

const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Draft",
  auditing: "Auditing",
  action_required: "Action Required",
  bundle_ready: "Bundle Ready",
  portal_filing_in_progress: "Portal Filing",
  otp_pending: "OTP Pending",
  portal_submitted: "Portal Submitted",
  appointment_pending: "Appointment Pending",
  appointment_booked: "Appointment Booked",
  paid: "Paid",
  completed: "Completed",
  expired: "Expired",
  rejected: "Rejected",
  reapplied: "Reapplied",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`vp-badge ${statusClasses[status]}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-35" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      {statusLabels[status]}
    </span>
  );
}