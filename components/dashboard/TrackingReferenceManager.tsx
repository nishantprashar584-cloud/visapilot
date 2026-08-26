"use client";

import { useState } from "react";

export function TrackingReferenceManager({
  applicationId,
  initialReferenceNumber,
}: {
  applicationId: string;
  initialReferenceNumber: string | null;
}) {
  const [referenceNumber, setReferenceNumber] = useState(initialReferenceNumber ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/tracking-reference`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ referenceNumber }),
      });

      const payload = (await response.json()) as { error?: string; referenceNumber?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save reference number.");
      }

      setReferenceNumber(payload.referenceNumber ?? referenceNumber);
      setMessage("Tracking reference saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reference number.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan">
          Consular tracking reference
        </p>
        <p className="text-sm leading-7 text-slate-300">
          Save your VFS, TLScontact, or BLS reference number here so the deep-link action copies the correct identifier before opening the tracking portal.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={referenceNumber}
          onChange={(event) => setReferenceNumber(event.target.value)}
          placeholder="Enter your consular reference number"
          className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || referenceNumber.trim().length < 4}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save reference"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}