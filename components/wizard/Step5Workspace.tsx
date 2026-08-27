"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileStack, LoaderCircle, Mic, PackageCheck, Sparkles, Square, WandSparkles } from "lucide-react";
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
  isFinal?: boolean;
  length?: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: {
    length?: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type PromptDictationPhase = "listening" | "processing";

type PromptDictationState = {
  letterId: string;
  phase: PromptDictationPhase;
  heardText: string;
  typedText: string;
};

type PromptDictationSession = {
  letterId: string;
  baselinePrompt: string;
  heardText: string;
  typedText: string;
};

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

function sanitizeSpeechTranscript(value: string): string {
  return value.trim().replace(/[.]+$/g, "").trim();
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
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptDictationSessionRef = useRef<PromptDictationSession | null>(null);
  const [promptDictationState, setPromptDictationState] = useState<PromptDictationState | null>(null);
  const [customVoiceMessage, setCustomVoiceMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

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

  function clearPromptProcessingTimeout() {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }

  function finishPromptDictation(letterId: string, nextMessage?: string) {
    clearPromptProcessingTimeout();
    processingTimeoutRef.current = setTimeout(() => {
      if (nextMessage) {
        setCustomVoiceMessage(nextMessage);
      }

      setPromptDictationState((current) => (current?.letterId === letterId ? null : current));
      promptDictationSessionRef.current = null;
      processingTimeoutRef.current = null;
    }, 900);
  }

  function stopPromptDictation() {
    if (!customRecognitionRef.current || promptDictationState?.phase !== "listening") {
      return;
    }

    customRecognitionRef.current.stop();
    setPromptDictationState((current) =>
      current
        ? {
            ...current,
            phase: "processing",
          }
        : current,
    );
    setCustomVoiceMessage("Processing your voice brief.");
  }

  function finalizePromptDictation(letterId: string) {
    const session = promptDictationSessionRef.current;

    if (!session || session.letterId !== letterId) {
      finishPromptDictation(letterId);
      return;
    }

    const transcript = sanitizeSpeechTranscript(session.heardText);

    if (!transcript) {
      onCustomLetterChange(letterId, { prompt: session.baselinePrompt });
      finishPromptDictation(letterId, "No speech was detected. Try again and speak a little closer to the microphone.");
      return;
    }

    const nextPrompt = session.baselinePrompt.trim() ? `${session.baselinePrompt.trim()} ${transcript}` : transcript;

    onCustomLetterChange(letterId, {
      prompt: nextPrompt,
      message: "Voice brief inserted. Review it, then generate the letter.",
    });

    setPromptDictationState((current) =>
      current?.letterId === letterId
        ? {
            ...current,
            heardText: transcript,
            typedText: nextPrompt,
          }
        : current,
    );

    finishPromptDictation(letterId, "Voice brief inserted into the selected custom letter.");
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

    if (promptDictationState?.letterId === letterId && promptDictationState.phase === "listening" && customRecognitionRef.current) {
      stopPromptDictation();
      return;
    }

    if (customRecognitionRef.current) {
      customRecognitionRef.current.stop();
    }

    clearPromptProcessingTimeout();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    customRecognitionRef.current = recognition;
    const letter = customLetters.find((item) => item.id === letterId);
    const baselinePrompt = letter?.prompt ?? "";
    promptDictationSessionRef.current = {
      letterId,
      baselinePrompt,
      heardText: "",
      typedText: baselinePrompt,
    };
    setPromptDictationState({
      letterId,
      phase: "listening",
      heardText: "",
      typedText: baselinePrompt,
    });
    setCustomVoiceMessage("Recording live. Speak naturally and tap the glowing red stop control when your brief looks right.");

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const session = promptDictationSessionRef.current;

      if (!session || session.letterId !== letterId) {
        return;
      }

      const heardSegments: string[] = [];

      for (let index = 0; index < (event.results.length ?? 0); index += 1) {
        const result = event.results[index];
        const transcript = sanitizeSpeechTranscript(result?.[0]?.transcript ?? "");

        if (transcript) {
          heardSegments.push(transcript);
        }
      }

      const heardText = heardSegments.join(" ").trim();
      const typedText = heardText ? (session.baselinePrompt.trim() ? `${session.baselinePrompt.trim()} ${heardText}` : heardText) : session.baselinePrompt;

      session.heardText = heardText;
      session.typedText = typedText;

      onCustomLetterChange(letterId, { prompt: typedText });
      setPromptDictationState({
        letterId,
        phase: "listening",
        heardText,
        typedText,
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      setCustomVoiceMessage(`Voice dictation could not be captured (${event.error ?? "unknown_error"}).`);
      clearPromptProcessingTimeout();
      setPromptDictationState(null);
      promptDictationSessionRef.current = null;
    };

    recognition.onend = () => {
      finalizePromptDictation(letterId);
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
                        Generate up to two extra visa-supporting letters. Start recording, watch the brief appear live as you speak, then stop when the wording feels right.
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
                        {(() => {
                          const dictationPhase = promptDictationState?.letterId === letter.id ? promptDictationState.phase : null;

                          return (
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
                                className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                                  dictationPhase === "listening"
                                    ? "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.28),0_0_24px_rgba(251,113,133,0.35)]"
                                    : dictationPhase === "processing"
                                      ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_24px_rgba(16,185,129,0.32)]"
                                      : "border-white/10 bg-black/50 text-slate-300 hover:border-white/20 hover:text-white"
                                }`}
                                aria-label={`Dictate ${letter.title}`}
                              >
                                {dictationPhase === "listening" ? (
                                  <>
                                    <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                                    <Square className="relative h-3.5 w-3.5 fill-current" />
                                  </>
                                ) : dictationPhase === "processing" ? (
                                  <>
                                    <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse" />
                                    <span className="absolute inset-0 rounded-full border border-emerald-300/40 border-t-transparent animate-spin" />
                                    <Mic className="relative h-4 w-4" />
                                  </>
                                ) : (
                                  <Mic className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </div>

                          <div className="rounded-[0.95rem] border border-white/10 bg-black/20 p-3">
                            <div
                              className={`flex min-h-[72px] items-start gap-2 rounded-[0.9rem] border px-3 py-3 text-sm ${
                                dictationPhase === "listening"
                                  ? "border-rose-300/20 bg-rose-400/10 text-rose-50"
                                  : dictationPhase === "processing"
                                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50"
                                    : "border-white/10 bg-black/20 text-slate-300"
                              }`}
                            >
                              {dictationPhase === "listening" ? (
                                <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-300/30 bg-rose-400/12 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.22),0_0_18px_rgba(251,113,133,0.22)]">
                                  <span className="absolute inset-0 rounded-full bg-rose-300/20 animate-ping" />
                                  <Square className="relative h-3 w-3 fill-current" />
                                </span>
                              ) : dictationPhase === "processing" ? (
                                <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/12 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_18px_rgba(16,185,129,0.22)]">
                                  <span className="absolute inset-0 rounded-full bg-emerald-300/20 animate-pulse" />
                                  <Mic className="relative h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-400">
                                  <Mic className="h-3.5 w-3.5" />
                                </span>
                              )}
                              <div>
                                <p className="font-semibold text-white">Live brief console</p>
                                <p className="mt-1 leading-6">
                                  {dictationPhase === "listening"
                                    ? "Recording live. Speak naturally and tap the glowing red stop control when your brief looks right."
                                    : dictationPhase === "processing"
                                      ? "Processing your brief and updating the draft"
                                      : customVoiceMessage ?? "Tap the mic to start live dictation for this brief"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <div className="rounded-[0.9rem] border border-white/10 bg-black/30 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Heard You Say</p>
                                <p className="mt-2 min-h-[56px] text-sm leading-6 text-white">
                                  {promptDictationState?.letterId === letter.id && promptDictationState.heardText
                                    ? promptDictationState.heardText
                                    : "Your live transcript appears here while you speak"}
                                </p>
                              </div>
                              <div className="rounded-[0.9rem] border border-white/10 bg-black/30 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Typing Into Brief</p>
                                <p className="mt-2 min-h-[56px] text-sm leading-6 text-white">
                                  {promptDictationState?.letterId === letter.id && promptDictationState.typedText
                                    ? promptDictationState.typedText
                                    : "VisaPilot shows the shaped brief here before finalizing it"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={stopPromptDictation}
                              disabled={dictationPhase !== "listening"}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                dictationPhase === "listening"
                                  ? "border-rose-300/35 bg-rose-400/12 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.24),0_0_24px_rgba(251,113,133,0.28)] hover:border-rose-200/50 hover:bg-rose-400/18"
                                  : "border-white/10 bg-white/5 text-slate-400 opacity-70"
                              }`}
                            >
                              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full">
                                {dictationPhase === "listening" ? (
                                  <span className="absolute inset-0 rounded-full bg-rose-300/25 animate-ping" />
                                ) : null}
                                <Square className="relative h-3 w-3 fill-current" />
                              </span>
                              {dictationPhase === "listening" ? "Stop recording" : "Stop control appears here"}
                            </button>
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
                          );
                        })()}
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