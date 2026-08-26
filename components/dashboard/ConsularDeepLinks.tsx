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
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      window.open(provider.url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.open(provider.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={!hasReferenceNumber}
      className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-cyan hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied
        ? "Reference copied"
        : hasReferenceNumber
          ? `Open ${provider.label}`
          : "Save tracking reference first"}
    </button>
  );
}