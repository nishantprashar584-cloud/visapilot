import { describe, expect, it } from "vitest";
import {
  canTransitionVipApplicationStatus,
  getAllowedVipStatusTransitions,
  requiresVipAppointmentHandover,
} from "../lib/applications/workflow";

describe("VIP workflow guardrails", () => {
  it("allows only the next operator statuses from auditing", () => {
    expect(getAllowedVipStatusTransitions("auditing")).toEqual([
      "action_required",
      "bundle_ready",
      "portal_filing_in_progress",
    ]);
    expect(canTransitionVipApplicationStatus("auditing", "completed")).toBe(false);
  });

  it("allows OTP resume only back into active filing", () => {
    expect(canTransitionVipApplicationStatus("otp_pending", "portal_filing_in_progress")).toBe(true);
    expect(canTransitionVipApplicationStatus("otp_pending", "appointment_booked")).toBe(false);
  });

  it("marks appointment and completion states as requiring handoff metadata", () => {
    expect(requiresVipAppointmentHandover("appointment_booked")).toBe(true);
    expect(requiresVipAppointmentHandover("completed")).toBe(true);
    expect(requiresVipAppointmentHandover("portal_submitted")).toBe(false);
  });
});