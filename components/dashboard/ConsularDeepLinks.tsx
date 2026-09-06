"use client";

import { useState } from "react";

const trackingProviders: Record<string, { label: string; url: string }> = {
  France: { label: "VFS Global", url: "https://visa.vfsglobal.com" },
  Spain: { label: "BLS International", url: "https://www.blsinternational.com" },
  Germany: { label: "TLScontact", url: "https://www.tlscontact.com" },
};

export function ConsularDeepLinks({
  destinationCountry,
  referenceNumber,
}: {
  destinationCountry: string;
  referenceNumber: string | null;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const provider = trackingProviders[destinationCountry] ?? {
    label: "VFS Global",
    url: "https://visa.vfsglobal.com",
  };
  const hasReferenceNumber = Boolean(referenceNumber && referenceNumber.trim().length > 0);

  async function handleOpen() {
    if (!referenceNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referenceNumber);
      setState("copied");
      window.open(provider.url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      window.open(provider.url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={!hasReferenceNumber}
      className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-cyan hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-50"
      aria-live="polite"
    >
        {state === "copied"
          ? "Copied ✓ Opening portal"
          : state === "error"
            ? "Couldn't copy. Opening portal"
        : hasReferenceNumber
          ? `Open ${provider.label}`
          : "Save tracking reference first"}
    </button>
  );
}