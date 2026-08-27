"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileStack, LoaderCircle, Mic, MicOff, PackageCheck, Sparkles, WandSparkles } from "lucide-react";
import { PacketWorkspace } from "@/components/wizard/PacketWorkspace";
import type { ApplicantInfo, PricingTier, SupportingDocument } from "@/types";

export type CustomLetterDraft = {
  id: string;
  title: string;
  prompt: string;
  content: string;
  message: string | null;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  results: {
    0: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function Step5Workspace({
  applicant,
  coverLetterDraft,
  onCoverLetterChange,
  customLetters,
  onCustomLetterChange,
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
  activeCustomLetterId,
  coverLetterMessage,
  onGenerateCoverLetter,
  onGenerateCustomLetter,
  speechSupported,
  microphonePermission,
  onRequestMicrophoneAccess,
}: {
  applicant: ApplicantInfo;
  coverLetterDraft: string;
  onCoverLetterChange: (value: string) => void;
  customLetters: CustomLetterDraft[];
  onCustomLetterChange: (letterId: string, updates: Partial<CustomLetterDraft>) => void;
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
  activeCustomLetterId: string | null;
  coverLetterMessage: string | null;
  onGenerateCoverLetter: (applicant: ApplicantInfo) => void;
  onGenerateCustomLetter: (letterId: string, applicant: ApplicantInfo) => void;
  speechSupported: boolean;
  microphonePermission: "idle" | "requesting" | "granted" | "denied" | "unsupported";
  onRequestMicrophoneAccess: () => Promise<boolean>;
}) {
  const hasCredits = availableCredits > 0;
  const customRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [customVoiceMessage, setCustomVoiceMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (customRecognitionRef.current) {
        customRecognitionRef.current.onend = null;
        customRecognitionRef.current.stop();
      }
    };
  }, []);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  function getLetterBaseName(label: string) {
    return `${applicant.personal.firstName || "applicant"}-${applicant.trip.destinationCountry || "schengen"}-${slugify(label)}`;
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function handleDownloadPdf(content: string, label: string) {
    if (!content.trim()) {
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
    const paragraphs = content.replace(/\r/g, "").split("\n");

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
    link.download = `${getLetterBaseName(label)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadDoc(content: string, label: string) {
    if (!content.trim()) {
      return;
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>VisaPilot Cover Letter</title></head><body style="font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#111827;">${content
      .replace(/\r/g, "")
      .split(/\n\n+/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("")}</body></html>`;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getLetterBaseName(label)}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handlePromptDictation(letterId: string) {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setCustomVoiceMessage("Voice dictation for custom letters requires Chrome or Edge.");
      return;
    }

    if (microphonePermission !== "granted") {
      const accessGranted = await onRequestMicrophoneAccess();

      if (!accessGranted) {
        setCustomVoiceMessage("Microphone access is required before dictating an additional letter brief.");
        return;
      }

      setCustomVoiceMessage("Microphone access enabled. Speak your custom letter brief now.");
    }

    if (activePromptId === letterId && customRecognitionRef.current) {
      customRecognitionRef.current.stop();
      setActivePromptId(null);
      setCustomVoiceMessage("Dictation stopped.");
      return;
    }

    if (customRecognitionRef.current) {
      customRecognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    customRecognitionRef.current = recognition;
    setActivePromptId(letterId);
    setCustomVoiceMessage("Listening for your custom letter brief.");

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();

      if (!transcript) {
        return;
      }

      const letter = customLetters.find((item) => item.id === letterId);
      const nextPrompt = letter?.prompt?.trim()
        ? `${letter.prompt.trim()} ${transcript}`
        : transcript;

      onCustomLetterChange(letterId, { prompt: nextPrompt, message: "Voice brief inserted. Review it, then generate the letter." });
      setCustomVoiceMessage("Voice brief inserted into the selected custom letter.");
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      setCustomVoiceMessage(`Voice dictation could not be captured (${event.error ?? "unknown_error"}).`);
      setActivePromptId(null);
    };

    recognition.onend = () => {
      setActivePromptId(null);
    };

    recognition.start();
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

        <div className={activeTab === "cover-letter" ? "mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]" : "hidden"}>
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
                          onClick={() => handleDownloadDoc(coverLetterDraft, "cover-letter")}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                        >
                          <Download className="h-4 w-4" />
                          Download .doc
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadPdf(coverLetterDraft, "cover-letter")}
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

                <div className="mt-5 rounded-[1.1rem] border border-white/10 bg-[#101010] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                        <WandSparkles className="h-3.5 w-3.5" />
                        Additional AI Letters
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Generate up to two extra visa-supporting letters. You can type or dictate what should be mentioned, and VisaPilot will draft them using the same applicant context.
                      </p>
                    </div>
                    {speechSupported ? (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        {microphonePermission === "granted" ? "Voice briefs ready" : "Voice briefs available"}
                      </span>
                    ) : null}
                  </div>

                  {customVoiceMessage ? (
                    <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200">
                      {customVoiceMessage}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {customLetters.map((letter) => (
                      <div key={letter.id} className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex flex-col gap-3">
                          <input
                            value={letter.title}
                            onChange={(event) => onCustomLetterChange(letter.id, { title: event.target.value })}
                            placeholder="Letter title"
                            className="w-full rounded-[0.9rem] border border-white/12 bg-black/40 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-white/30"
                          />
                          <div className="relative">
                            <textarea
                              value={letter.prompt}
                              onChange={(event) => onCustomLetterChange(letter.id, { prompt: event.target.value })}
                              rows={6}
                              placeholder="Describe what this extra letter should explain. Example: write a leave approval support letter mentioning my approved dates, role, employer, and that I am expected back after the trip."
                              className="w-full rounded-[0.9rem] border border-white/12 bg-black/40 px-4 py-3 pr-12 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-white/30"
                            />
                            {speechSupported ? (
                              <button
                                type="button"
                                onClick={() => void handlePromptDictation(letter.id)}
                                className="absolute right-3 top-3 text-slate-300 transition hover:text-white"
                                aria-label={`Dictate ${letter.title}`}
                              >
                                {activePromptId === letter.id ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                              </button>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => onGenerateCustomLetter(letter.id, applicant)}
                              disabled={activeCustomLetterId === letter.id}
                              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {activeCustomLetterId === letter.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              {activeCustomLetterId === letter.id ? "Generating..." : "Generate Letter"}
                            </button>
                            {letter.content.trim() ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDoc(letter.content, letter.title || `letter-${letter.id}`)}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                                >
                                  <Download className="h-4 w-4" />
                                  Download .doc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadPdf(letter.content, letter.title || `letter-${letter.id}`)}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                                >
                                  <Download className="h-4 w-4" />
                                  Download PDF
                                </button>
                              </>
                            ) : null}
                          </div>

                          {letter.message ? (
                            <div className="rounded-[0.9rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200">
                              {letter.message}
                            </div>
                          ) : null}

                          <textarea
                            value={letter.content}
                            onChange={(event) => onCustomLetterChange(letter.id, { content: event.target.value })}
                            rows={10}
                            placeholder="The generated additional letter will appear here."
                            className="w-full rounded-[0.9rem] border border-white/12 bg-black/40 px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-white/30"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
        </div>

        <div className={activeTab === "toolkit" ? "mt-6 xl:col-span-2" : "mt-6 hidden"}>
          <PacketWorkspace
            previewMode={previewMode}
            supportingDocuments={supportingDocuments}
            onSupportingDocumentsChange={onSupportingDocumentsChange}
          />
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