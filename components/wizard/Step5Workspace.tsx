"use client";

import { Download, FileText, FileStack, LoaderCircle, PackageCheck, Sparkles, WandSparkles } from "lucide-react";
import { PacketWorkspace } from "@/components/wizard/PacketWorkspace";
import type { ApplicantInfo, PricingTier, SupportingDocument } from "@/types";

export function Step5Workspace({
  applicant,
  coverLetterDraft,
  onCoverLetterChange,
  previewMode,
  supportingDocuments,
  onSupportingDocumentsChange,
  availableCredits,
  activeTab,
  onActiveTabChange,
  onCheckout,
  isStartingCheckout,
  isSubmitting,
  isGeneratingCoverLetter,
  coverLetterMessage,
  onGenerateCoverLetter,
}: {
  applicant: ApplicantInfo;
  coverLetterDraft: string;
  onCoverLetterChange: (value: string) => void;
  previewMode: boolean;
  supportingDocuments: SupportingDocument[];
  onSupportingDocumentsChange: (documents: SupportingDocument[]) => void;
  availableCredits: number;
  activeTab: "cover-letter" | "toolkit";
  onActiveTabChange: (tab: "cover-letter" | "toolkit") => void;
  onCheckout: (tier: PricingTier) => void;
  isStartingCheckout: PricingTier | null;
  isSubmitting: boolean;
  isGeneratingCoverLetter: boolean;
  coverLetterMessage: string | null;
  onGenerateCoverLetter: (applicant: ApplicantInfo) => void;
}) {
  const hasCredits = availableCredits > 0;

  function getCoverLetterBaseName() {
    return `${applicant.personal.firstName || "applicant"}-${applicant.trip.destinationCountry || "schengen"}-cover-letter`
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function handleDownloadPdf() {
    if (!coverLetterDraft.trim()) {
      return;
    }

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 18;
    const paragraphs = coverLetterDraft.replace(/\r/g, "").split("\n");

    function wrapLine(line: string) {
      const words = line.split(/\s+/).filter(Boolean);

      if (words.length === 0) {
        return [""];
      }

      const wrappedLines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
          currentLine = nextLine;
          continue;
        }

        if (currentLine) {
          wrappedLines.push(currentLine);
        }

        currentLine = word;
      }

      if (currentLine) {
        wrappedLines.push(currentLine);
      }

      return wrappedLines;
    }

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const paragraph of paragraphs) {
      const lines = wrapLine(paragraph);

      for (const line of lines) {
        if (y <= margin) {
          page = pdf.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }

        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.08, 0.09, 0.12),
        });

        y -= lineHeight;
      }

      y -= 8;
    }

    const bytes = await pdf.save();
    const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getCoverLetterBaseName()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadDoc() {
    if (!coverLetterDraft.trim()) {
      return;
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>VisaPilot Cover Letter</title></head><body style="font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#111827;">${coverLetterDraft
      .replace(/\r/g, "")
      .split(/\n\n+/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("")}</body></html>`;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getCoverLetterBaseName()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Step 5 Workspace</p>
              <h3 className="text-xl font-semibold text-white">Document Studio</h3>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Finalize the AI cover letter, prepare supporting PDFs, and hand off the finished application package without any pricing-grid clutter.
            </p>
          </div>

          <div className="flex flex-wrap rounded-[1rem] border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => onActiveTabChange("toolkit")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "toolkit" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              <FileStack className="h-4 w-4" />
              PDF Editor
            </button>
            <button
              type="button"
              onClick={() => onActiveTabChange("cover-letter")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "cover-letter" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Cover Letter
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          {activeTab === "cover-letter" ? (
            <>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/30 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      GPT-4o Cover Letter Studio
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Generate and refine the embassy-facing narrative before package creation.
                    </p>
                    <div className="mt-4 rounded-[1rem] border border-indigo-300/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                          <WandSparkles className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-white">Consular-grade structure</p>
                          <p className="mt-1 leading-6 text-indigo-100/90">
                            VisaPilot now targets a real Schengen-style letter structure: purpose, travel plan, accommodation, finances, home ties, and a formal approval request.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coverLetterDraft.trim() ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDownloadDoc}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                        >
                          <Download className="h-4 w-4" />
                          Download .doc
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadPdf()}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onGenerateCoverLetter(applicant)}
                      disabled={isGeneratingCoverLetter}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGeneratingCoverLetter ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isGeneratingCoverLetter ? "Generating..." : coverLetterDraft.trim() ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                </div>

                {isGeneratingCoverLetter ? (
                  <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-indigo-300/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Generating your cover letter draft. This can take a few seconds.
                  </div>
                ) : null}

                {coverLetterMessage ? (
                  <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200">
                    {coverLetterMessage}
                  </div>
                ) : null}

                <textarea
                  value={coverLetterDraft}
                  onChange={(event) => onCoverLetterChange(event.target.value)}
                  disabled={isGeneratingCoverLetter}
                  rows={16}
                  placeholder="Generate or edit the final cover letter here before saving the application package."
                  className="mt-4 w-full rounded-[1rem] border border-white/12 bg-black/40 px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="rounded-[1.2rem] border border-white/10 bg-black/30 p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                  Live Preview
                </div>
                <div className="mt-4 min-h-[420px] rounded-[1rem] border border-white/10 bg-black/50 p-4">
                  {coverLetterDraft.trim() ? (
                    <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{coverLetterDraft}</pre>
                  ) : (
                    <div className="flex min-h-[388px] items-center justify-center text-center text-sm text-slate-400">
                      Generate or paste the final letter to preview the consular narrative before package creation.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="xl:col-span-2">
              <PacketWorkspace
                previewMode={previewMode}
                supportingDocuments={supportingDocuments}
                onSupportingDocumentsChange={onSupportingDocumentsChange}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Final Handoff</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Package generation and dashboard save</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {previewMode
                ? "Preview mode opens a sample package vault instead of creating a live application."
                : hasCredits
                  ? "A saved application credit is available, so the package can be generated directly."
                  : "Your application package is ready."}
            </p>
          </div>

          {previewMode ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <PackageCheck className="h-4 w-4" />
              Sample package ready
            </span>
          ) : hasCredits ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <PackageCheck className="h-4 w-4" />
              {availableCredits} Credit{availableCredits === 1 ? "" : "s"} Available
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
              Application Ready for Package Generation
            </span>
          )}
        </div>

        <div className="mt-5">
          {previewMode || hasCredits ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <PackageCheck className="h-4 w-4" />
              {previewMode
                ? "Open Sample Package"
                : isSubmitting
                  ? "Generating package..."
                  : "Generate & Save to Dashboard Vault"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCheckout("solo")}
              disabled={isStartingCheckout !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <PackageCheck className="h-4 w-4" />
              {isStartingCheckout === "solo" ? "Starting checkout..." : "Proceed to Secure Checkout ($19)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}