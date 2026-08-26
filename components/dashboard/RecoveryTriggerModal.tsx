"use client";

import { useState } from "react";

const refusalCodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function RecoveryTriggerModal({
  applicationId,
  disabled,
}: {
  applicationId: string;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClaim() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/applications/claim-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalApplicationId: applicationId,
          refusalReasonCode: selectedCode ? Number(selectedCode) : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Free re-application activation failed.");
      }

      setMessage("Free re-application activated. Refreshing dashboard state shortly.");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Free re-application activation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-cyan hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-50"
      >
        Fix & Re-Apply ($0)
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="glass-panel w-full max-w-md p-6">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">Activate Free Re-Application</h3>
              <p className="text-sm leading-7 text-slate-300">
                Your application remains reusable for 90 days from creation with the same locked identity. Refusal reason selection is optional and helps tailor the re-application package.
              </p>
            </div>

            <label className="mt-6 block space-y-2">
              <span className="text-sm font-semibold text-white">Refusal reason code (optional)</span>
              <select
                value={selectedCode}
                onChange={(event) => setSelectedCode(event.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">Skip for manual retry</option>
                {refusalCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/12 px-4 py-3 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClaim}
                disabled={isSubmitting}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {isSubmitting ? "Activating..." : "Activate Re-Application"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}