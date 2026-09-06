"use client";

import { useEffect, useState } from "react";

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (saveState !== "saved") {
      return;
    }

    const timeout = window.setTimeout(() => setSaveState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  async function handleSave() {
    setIsSaving(true);
    setSaveState("saving");
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
      setSaveState("saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reference number.");
      setSaveState("error");
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

      <div className="mt-4 flex flex-col gap-3">
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
          className="vp-btn vp-btn-primary w-fit px-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : "Save reference"}
        </button>
      </div>

      {message ? <p className={`mt-3 text-sm ${saveState === "error" ? "text-rose-200" : "text-slate-300"}`}>{message}</p> : null}
    </div>
  );
}