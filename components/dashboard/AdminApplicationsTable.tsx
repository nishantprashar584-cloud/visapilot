"use client";

import { useState, useTransition } from "react";
import { getAllowedVipStatusTransitions } from "@/lib/applications/workflow";
import { triggerVipOtpRequest, updateVipApplicationStatus } from "@/lib/actions/vip-actions";
import type { ApplicationStatus } from "@/types";

type Row = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  destinationCountry: string;
  status: ApplicationStatus;
  updatedAt: string;
  appointmentDate: string | null;
  vfsReferenceNumber: string | null;
  vfsCenterLocation: string | null;
};

function AdminRow({ row }: { row: Row }) {
  const [status, setStatus] = useState<ApplicationStatus>(row.status);
  const [appointmentDate, setAppointmentDate] = useState(row.appointmentDate ? row.appointmentDate.slice(0, 16) : "");
  const [referenceNumber, setReferenceNumber] = useState(row.vfsReferenceNumber ?? "");
  const [centerLocation, setCenterLocation] = useState(row.vfsCenterLocation ?? "");
  const [otpPrompt, setOtpPrompt] = useState("Your portal filing requires a 6-digit verification code. Enter it in the vault within 05:00.");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusOptions: ApplicationStatus[] = [status, ...getAllowedVipStatusTransitions(status).filter((option) => option !== status)];

  function handleStatusUpdate() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", row.id);
      formData.set("status", status);
      if (appointmentDate) {
        formData.set("appointmentDate", new Date(appointmentDate).toISOString());
      }
      if (referenceNumber) {
        formData.set("vfsReferenceNumber", referenceNumber);
      }
      if (centerLocation) {
        formData.set("vfsCenterLocation", centerLocation);
      }
      const result = await updateVipApplicationStatus(formData);
      setMessage(result.message);
    });
  }

  function handleTriggerOtp() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", row.id);
      formData.set("promptMessage", otpPrompt);
      formData.set("expiresInMinutes", "5");
      const result = await triggerVipOtpRequest(formData);
      setMessage(result.message);
    });
  }

  return (
    <div className="rounded-[1.2rem] border border-white/12 bg-white/5 p-5">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <p className="text-lg font-semibold text-white">{row.applicantName}</p>
          <p className="mt-1 text-sm text-slate-300">{row.applicantEmail}</p>
          <p className="mt-1 text-sm text-slate-400">{row.destinationCountry} · Updated {new Date(row.updatedAt).toLocaleString("en-IN", { hour12: false })}</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">Status override</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            type="datetime-local"
            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
          />
          <input
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            placeholder="VFS reference"
            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
          />
          <input
            value={centerLocation}
            onChange={(event) => setCenterLocation(event.target.value)}
            placeholder="VFS center"
            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={handleStatusUpdate}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Apply status"}
          </button>
          {(status === "appointment_booked" || status === "completed") ? (
            <p className="text-xs leading-5 text-slate-400">Appointment date, VFS reference, and center are required before this handoff can be saved.</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">Trigger OTP request</label>
          <textarea
            value={otpPrompt}
            onChange={(event) => setOtpPrompt(event.target.value)}
            className="min-h-[120px] w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={handleTriggerOtp}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/18 disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Trigger OTP request"}
          </button>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AdminApplicationsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <AdminRow key={row.id} row={row} />
      ))}
    </div>
  );
}