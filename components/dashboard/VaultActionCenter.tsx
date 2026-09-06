"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Clock3, ShieldAlert, UploadCloud } from "lucide-react";
import { reuploadApplicationDocument, submitVipOtpCode } from "@/lib/actions/vip-actions";
import type { ApplicationStatus, ServiceTrack } from "@/types";

type PendingVipAction = {
  promptMessage: string;
  expiresAt: string | null;
};

function formatCountdown(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }

  const remainingMs = new Date(expiresAt).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function VaultActionCenter({
  applicationId,
  status,
  track,
  actionItems,
  pendingAction,
  submissionGuideHref,
  appointmentDate,
  vfsReferenceNumber,
  vfsCenterLocation,
}: {
  applicationId: string;
  status: ApplicationStatus;
  track: ServiceTrack;
  actionItems: string[];
  pendingAction?: PendingVipAction | null;
  submissionGuideHref: string;
  appointmentDate?: string | null;
  vfsReferenceNumber?: string | null;
  vfsCenterLocation?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [countdown, setCountdown] = useState(() => formatCountdown(pendingAction?.expiresAt ?? null));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCountdown(formatCountdown(pendingAction?.expiresAt ?? null));

    if (!pendingAction?.expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown(formatCountdown(pendingAction.expiresAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [pendingAction?.expiresAt]);

  function handleOtpSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", applicationId);
      formData.set("otpCode", otpCode);
      const result = await submitVipOtpCode(formData);
      setMessage(result.message);

      if (result.success) {
        setOtpCode("");
      }
    });
  }

  function handleReupload() {
    if (!uploadFile) {
      setMessage("Select a replacement document to continue.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", applicationId);
      formData.set("documentType", "BANK_STATEMENT");
      formData.set("file", uploadFile);
      const result = await reuploadApplicationDocument(formData);
      setMessage(result.message);

      if (result.success) {
        setUploadFile(null);
      }
    });
  }

  if (status === "action_required") {
    return (
      <div className="rounded-[1.4rem] border border-amber-300/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(56,33,8,0.22))] p-5 text-amber-50 shadow-[0_0_40px_rgba(245,158,11,0.12)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="vp-badge vp-badge-attention">
              <ShieldAlert className="h-3.5 w-3.5" />
              Action required
            </div>
            <p className="text-lg font-semibold text-white">Upload a replacement document before the case can move forward.</p>
            <p className="max-w-3xl text-sm leading-6 text-amber-50/90">This is the primary action for the case right now. Once the corrected proof is uploaded, the operator or audit lane can continue.</p>
            <ul className="space-y-2 text-sm text-amber-50/90">
              {(actionItems.length > 0 ? actionItems : ["Upload the corrected bank statement or supporting proof."]).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full max-w-md rounded-[1.1rem] border border-white/10 bg-black/20 p-4">
            <label className="text-sm font-semibold text-white">Replacement upload</label>
            <input
              type="file"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              className="mt-3 block w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleReupload}
              disabled={isPending}
              className="vp-btn vp-btn-primary mt-4 disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              {isPending ? "Uploading..." : "Upload replacement"}
            </button>
            {message ? <p className="mt-3 text-sm text-amber-50/90">{message}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (status === "otp_pending") {
    return (
      <div className="rounded-[1.4rem] border border-amber-300/30 bg-[linear-gradient(180deg,rgba(251,191,36,0.14),rgba(120,53,15,0.2))] p-5 text-amber-50 shadow-[0_0_40px_rgba(251,191,36,0.12)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
              <Clock3 className="h-3.5 w-3.5" />
              OTP pending
            </div>
            <p className="text-lg font-semibold">Your VIP filing needs a verification code to continue.</p>
            <p className="max-w-3xl text-sm leading-6 text-amber-50/90">{pendingAction?.promptMessage ?? "Enter the 6-digit OTP shared with your phone or email so the operator can resume the official portal filing."}</p>
            {countdown ? <p className="text-sm font-semibold text-amber-100">Time remaining: {countdown}</p> : null}
          </div>

          <div className="w-full max-w-md rounded-[1.1rem] border border-white/10 bg-black/20 p-4">
            <label className="text-sm font-semibold text-amber-50">OTP code</label>
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              inputMode="numeric"
              className="mt-3 block w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
              placeholder="Enter 6-digit code"
            />
            <button
              type="button"
              onClick={handleOtpSubmit}
              disabled={isPending}
              className="vp-btn vp-btn-secondary mt-4 bg-white text-slate-950 disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit OTP"}
            </button>
            {message ? <p className="mt-3 text-sm text-amber-50/90">{message}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (track === "APPLY_MYSELF" && status === "bundle_ready") {
    return (
      <div className="rounded-[1.4rem] border border-emerald-300/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(17,24,39,0.22))] p-5 text-emerald-50 shadow-[0_0_38px_rgba(16,185,129,0.12)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Smart Form Helper ready</p>
            <p className="text-lg font-semibold">Your print-ready visa packet is ready for the official embassy form.</p>
            <p className="max-w-3xl text-sm leading-6 text-emerald-50/90">Open the step-by-step helper to copy the right answers into the embassy website or worksheet without retyping everything.</p>
          </div>
          <Link
            href={submissionGuideHref}
            className="vp-btn bg-white px-5 text-slate-950 hover:bg-slate-100"
          >
            <ArrowRight className="h-4 w-4" />
            Open Smart Form Helper
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.4rem] border border-indigo-300/24 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(15,23,42,0.2))] p-5 text-indigo-50 shadow-[0_0_38px_rgba(99,102,241,0.08)] sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100/80">VIP Concierge</p>
          <p className="text-lg font-semibold text-white">Your case is in the managed operator lane.</p>
          <p className="text-sm leading-6 text-indigo-50/90">The assigned operator handles official portal filing, document verification, OTP coordination, and slot booking. Use this dashboard for updates and anything that needs your input.</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-100">
          <p className="font-semibold text-white">Current handoff</p>
          <p className="mt-2">Mock interview booking: available on request</p>
          <p className="mt-2">VFS reference: {vfsReferenceNumber ?? "Pending"}</p>
          <p className="mt-2">Center: {vfsCenterLocation ?? "Pending"}</p>
          <p className="mt-2">Appointment: {appointmentDate ? new Date(appointmentDate).toLocaleString("en-IN", { hour12: false }) : "Pending"}</p>
          <a
            href="mailto:support@visapilot.app?subject=Schedule%2015-min%20mock%20interview%20call"
            className="vp-btn mt-4 bg-white text-slate-950 hover:bg-slate-100"
          >
            Schedule 15-min mock interview call
          </a>
        </div>
      </div>
    </div>
  );
}