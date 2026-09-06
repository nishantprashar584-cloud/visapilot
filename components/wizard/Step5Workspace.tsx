"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileImage, Layers3, LoaderCircle, Mic, Sparkles, Square } from "lucide-react";
import { A4TextPreview } from "@/components/wizard/step5/A4TextPreview";
import { BundleTabPanel } from "@/components/wizard/step5/BundleTabPanel";
import { ChecklistTabPanel } from "@/components/wizard/step5/ChecklistTabPanel";
import { PrepTabPanel } from "@/components/wizard/step5/PrepTabPanel";
import { Step5TabBar, type WorkspaceTab } from "@/components/wizard/step5/Step5TabBar";
import { TravelIntentStudio } from "@/components/wizard/TravelIntentStudio";
import { PacketWorkspace } from "@/components/wizard/PacketWorkspace";
import { stripItineraryMatrixSection } from "@/lib/applications/coverLetter";
import { subscribeToItinerarySync } from "@/lib/applications/moduleSyncBus";
import { getPreviewApplicationForDestination } from "@/lib/mock/applications";
import { buildA4TextLayout, generateA4TextPdf, type A4TextLayout } from "@/lib/pdf/a4TextLayout";
import { generateChecklistPdf } from "@/lib/pdf/generateChecklistPdf";
import type { ApplicantInfo, SupportingDocument, SupportingDocumentSubjectRole } from "@/types";

const step5WorkspaceTabs = ["bundle", "cover-letter", "pdf-editor", "checklist", "prep"] as const;

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
  targetKey: string;
  phase: PromptDictationPhase;
  heardText: string;
  typedText: string;
};

type PromptDictationSession = {
  targetKey: string;
  baselineText: string;
  heardText: string;
  typedText: string;
  stopRequested: boolean;
  onPreviewChange: (value: string) => void;
  onFinalize: (value: string) => void;
  successMessage: string;
};

type BundlePreviewPage = {
  id: string;
  label: string;
  sectionLabel: string;
  accentNote: string;
  render: () => JSX.Element;
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

function buildDictatedText(baselineText: string, transcript: string): string {
  return baselineText.trim() ? `${baselineText.trim()} ${transcript}` : transcript;
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
  isSubmitting,
  isGeneratingCoverLetter,
  activeCustomLetterId,
  coverLetterMessage,
  onGenerateCoverLetter,
  onGenerateCustomLetter,
  initialTab = "bundle",
  speechSupported,
  microphonePermission,
  onRequestMicrophoneAccess,
  onFinalizeAndGoToVault,
}: {
  applicant: ApplicantInfo;
  coverLetterDraft: string;
  onCoverLetterChange: (value: string) => void;
  customLetters: CustomLetterDraft[];
  onCustomLetterChange: (letterId: string, updates: Partial<CustomLetterDraft>) => void;
  previewMode: boolean;
  supportingDocuments: SupportingDocument[];
  onSupportingDocumentsChange: (documents: SupportingDocument[]) => void;
  isSubmitting: boolean;
  isGeneratingCoverLetter: boolean;
  activeCustomLetterId: string | null;
  coverLetterMessage: string | null;
  onGenerateCoverLetter: (applicant: ApplicantInfo) => void;
  onGenerateCustomLetter: (letterId: string, applicant: ApplicantInfo) => void;
  initialTab?: WorkspaceTab;
  speechSupported: boolean;
  microphonePermission: "idle" | "requesting" | "granted" | "denied" | "unsupported";
  onRequestMicrophoneAccess: () => Promise<boolean>;
  onFinalizeAndGoToVault: () => void;
}) {
  const customRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptDictationSessionRef = useRef<PromptDictationSession | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(step5WorkspaceTabs.includes(initialTab) ? initialTab : "bundle");
  const [previewScale, setPreviewScale] = useState(1);
  const [activeBundlePreviewPage, setActiveBundlePreviewPage] = useState(0);
  const [promptDictationState, setPromptDictationState] = useState<PromptDictationState | null>(null);
  const [customVoiceMessage, setCustomVoiceMessage] = useState<string | null>(null);
  const [coverLetterPreviewLayout, setCoverLetterPreviewLayout] = useState<A4TextLayout | null>(null);
  const [itinerarySyncSummary, setItinerarySyncSummary] = useState<{
    transitLegRequirements: string[];
    accommodationGapWarnings: string[];
  }>({
    transitLegRequirements: [],
    accommodationGapWarnings: [],
  });

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

  useEffect(() => subscribeToItinerarySync((detail) => {
    setItinerarySyncSummary({
      transitLegRequirements: detail.result.transitLegRequirements,
      accommodationGapWarnings: detail.result.accommodationGapWarnings,
    });
    onCoverLetterChange(detail.result.coverLetterMarkdown);
  }), [onCoverLetterChange]);

  useEffect(() => {
    let cancelled = false;
    const previewContent = stripItineraryMatrixSection(coverLetterDraft).trim()
      || `${applicant.trip.destinationCountry || "Schengen"} tourist packet\n\nCover letter and supporting documents will preview here before final export.`;

    void buildA4TextLayout(previewContent).then((layout) => {
      if (!cancelled) {
        setCoverLetterPreviewLayout(layout);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applicant.trip.destinationCountry, coverLetterDraft]);

  const documentTravelerTargets = (() => {
    const caseTravelers = applicant.caseContext?.travelers;

    if (caseTravelers && caseTravelers.length > 0) {
      return caseTravelers.map((traveler) => ({
        id: traveler.id,
        label: traveler.displayName || traveler.relationshipLabel || traveler.role,
        role: traveler.role as Exclude<SupportingDocumentSubjectRole, "GROUP" | "UNKNOWN">,
      }));
    }

    const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.trim();

    return [{
      id: "primary",
      label: fullName || "Primary traveller",
      role: "PRIMARY" as const,
    }];
  })();

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

      setPromptDictationState((current) => (current?.targetKey === letterId ? null : current));
      promptDictationSessionRef.current = null;
      processingTimeoutRef.current = null;
    }, 900);
  }

  function stopPromptDictation() {
    if (!customRecognitionRef.current || promptDictationState?.phase !== "listening") {
      return;
    }

    if (promptDictationSessionRef.current) {
      promptDictationSessionRef.current.stopRequested = true;
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

    if (!session || session.targetKey !== letterId) {
      finishPromptDictation(letterId);
      return;
    }

    const transcript = sanitizeSpeechTranscript(session.heardText);

    if (!transcript) {
      session.onFinalize(session.baselineText);
      finishPromptDictation(letterId, "No speech was detected. Try again and speak a little closer to the microphone.");
      return;
    }

    const nextPrompt = buildDictatedText(session.baselineText, transcript);
    session.onFinalize(nextPrompt);

    setPromptDictationState((current) =>
      current?.targetKey === letterId
        ? {
            ...current,
            heardText: transcript,
            typedText: nextPrompt,
          }
        : current,
    );

    finishPromptDictation(letterId, session.successMessage);
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

  function triggerBrowserDownload(downloadPath: string) {
    const link = document.createElement("a");
    link.href = downloadPath;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleDownloadChecklistPdf() {
    const bytes = await generateChecklistPdf(applicant);
    const browserBytes = new Uint8Array(bytes.length);
    browserBytes.set(bytes);
    const blob = new Blob([browserBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Consulate_Submission_Checklist.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleOpenConsulateReadyPacket() {
    if (previewMode) {
      const previewApplicationId = getPreviewApplicationForDestination(applicant.trip.destinationCountry)?.id ?? "preview-france-tourism";
      window.open(`/dashboard/${previewApplicationId}/consulate-ready-packet?preview=1`, "_blank", "noopener,noreferrer");
      return;
    }
  }

  function handleDownloadMasterBundle() {
    if (!previewMode) {
      return;
    }

    const previewApplicationId = getPreviewApplicationForDestination(applicant.trip.destinationCountry)?.id ?? "preview-france-tourism";
    triggerBrowserDownload(`/dashboard/${previewApplicationId}/consulate-ready-packet?preview=1`);
  }

  async function handleDownloadPdf(content: string, label: string) {
    if (!content.trim()) {
      return;
    }

    const bytes = await generateA4TextPdf(content);
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

  async function handlePromptDictation(options: {
    targetKey: string;
    baselineText: string;
    onPreviewChange: (value: string) => void;
    onFinalize: (value: string) => void;
    startMessage: string;
    permissionMessage: string;
    successMessage: string;
  }) {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setCustomVoiceMessage("Voice dictation for editor fields requires Chrome or Edge.");
      return;
    }

    if (microphonePermission !== "granted") {
      const accessGranted = await onRequestMicrophoneAccess();

      if (!accessGranted) {
        setCustomVoiceMessage("Microphone access is required before dictating into this field.");
        return;
      }

      setCustomVoiceMessage(options.permissionMessage);
    }

    if (promptDictationState?.targetKey === options.targetKey && promptDictationState.phase === "listening" && customRecognitionRef.current) {
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
    promptDictationSessionRef.current = {
      targetKey: options.targetKey,
      baselineText: options.baselineText,
      heardText: "",
      typedText: options.baselineText,
      stopRequested: false,
      onPreviewChange: options.onPreviewChange,
      onFinalize: options.onFinalize,
      successMessage: options.successMessage,
    };
    setPromptDictationState({
      targetKey: options.targetKey,
      phase: "listening",
      heardText: "",
      typedText: options.baselineText,
    });
    setCustomVoiceMessage(options.startMessage);

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const session = promptDictationSessionRef.current;

      if (!session || session.targetKey !== options.targetKey || session.stopRequested) {
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
      const typedText = heardText ? buildDictatedText(session.baselineText, heardText) : session.baselineText;

      session.heardText = heardText;
      session.typedText = typedText;

      session.onPreviewChange(typedText);
      setPromptDictationState({
        targetKey: options.targetKey,
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
      finalizePromptDictation(options.targetKey);
    };

    recognition.start();
  }

  const visibleCoverLetterDraft = stripItineraryMatrixSection(coverLetterDraft);
  const previewPacketTitle = `${applicant.trip.destinationCountry || "Schengen"} tourist packet`;

  function renderBundlePreviewSheet({
    sheetKey,
    counterLabel,
    accentNote,
    density,
    children,
  }: {
    sheetKey?: string;
    counterLabel: string;
    accentNote: string;
    density: "comfortable" | "compact";
    children: JSX.Element;
  }) {
    return (
      <div key={sheetKey} className="aspect-[1/1.414] w-full rounded-[1rem] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Preview pane</p>
              <p className="mt-2 text-base font-semibold text-[#1b2430]">{previewPacketTitle}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {counterLabel}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {accentNote}
              </span>
            </div>
          </div>

          <div className={density === "compact"
            ? "mt-5 flex-1 overflow-hidden rounded-[0.9rem] bg-[linear-gradient(180deg,#fffdf8,#fff7ea)] px-5 py-5 text-[0.82rem] leading-tight shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
            : "mt-5 flex-1 overflow-hidden rounded-[0.9rem] bg-[linear-gradient(180deg,#fffdf8,#fff7ea)] px-6 py-7 text-[0.92rem] leading-normal shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  const bundlePreviewSections = [
    "Application form or worksheet",
    "Consular cover letter",
    "Flight and stay evidence",
    `Financial audit and supporting proofs${supportingDocuments.length > 0 ? ` + ${supportingDocuments.length === 1 ? "1 uploaded file" : `${supportingDocuments.length} uploaded files`}` : ""}`,
  ];

  const bundleMetricItems = [
    { label: "Core sections assembled", value: String(bundlePreviewSections.length) },
    { label: "Pages total", value: String(Math.max(14, 9 + supportingDocuments.length)) },
    { label: "VFS compliance score", value: "96%" },
  ];

  const queuedTransferNotesCount = itinerarySyncSummary.transitLegRequirements.filter(
    (requirement) => !/flight arrival via|local stay in/i.test(requirement),
  ).length;
  const bundlePreviewPages: BundlePreviewPage[] = [
    {
      id: "overview",
      label: "Overview",
      sectionLabel: "Page 1 of 4",
      accentNote: "Packet cover and manifest",
      render: () => (
        renderBundlePreviewSheet({
          sheetKey: "overview",
          counterLabel: "Page 1 of 4",
          accentNote: "Packet cover and manifest",
          density: "comfortable",
          children: (
            <div className="space-y-4 text-[#1b2430]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Applicant</p>
                <p className="mt-1 text-sm font-semibold">{applicant.personal.firstName || "Applicant"} {applicant.personal.lastName || "Profile"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Destination profile loaded</p>
                <p className="mt-1 text-sm font-semibold">{applicant.trip.destinationCountry || "Schengen"} consular rules active</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bundle manifest</p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  {bundlePreviewSections.map((section) => (
                    <p key={section}>{section}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-[0.85rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                Use the page chips above to move through the main packet sections from this landing preview, or open the full interactive viewer for the full stitched PDF.
              </div>
            </div>
          ),
        })
      ),
    },
    {
      id: "letter",
      label: "Cover letter",
      sectionLabel: "Page 2 of 4",
      accentNote: "Embassy-facing narrative",
      render: () => (
        coverLetterPreviewLayout
          ? <A4TextPreview layout={coverLetterPreviewLayout} title={previewPacketTitle} />
          : renderBundlePreviewSheet({
              sheetKey: "cover-letter-loading",
              counterLabel: "Preparing",
              accentNote: "Rendering A4 preview",
              density: "comfortable",
              children: <div className="flex h-full items-center justify-center text-sm text-slate-500">Preparing exact A4 preview...</div>,
            })
      ),
    },
    {
      id: "travel",
      label: "Travel evidence",
      sectionLabel: "Page 3 of 4",
      accentNote: "Flight and stay anchors",
      render: () => (
        renderBundlePreviewSheet({
          sheetKey: "travel",
          counterLabel: "Page 3 of 4",
          accentNote: "Flight and stay anchors",
          density: "comfortable",
          children: (
            <div className="space-y-4 text-[#1b2430]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Entry and stay</p>
                <p className="mt-1 text-sm font-semibold">Arrival via {applicant.trip.portOfEntry || applicant.trip.firstEntryCountry || applicant.trip.destinationCountry || "Pending entry point"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">Travel dates: {applicant.trip.arrivalDate || "Pending"} to {applicant.trip.departureDate || "Pending"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Accommodation reference</p>
                <p className="mt-1 text-sm font-semibold">{applicant.trip.hotelBookingReference || "Booking reference pending"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{applicant.trip.accommodations || "Hotel or host stay details will appear here once entered earlier in the wizard."}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Transfer notes queued</p>
                <p className="mt-1 text-sm font-semibold">{queuedTransferNotesCount === 0 ? "No exceptional transfer notes currently required" : `${queuedTransferNotesCount} transfer note${queuedTransferNotesCount === 1 ? "" : "s"} linked to the narrative sync`}</p>
              </div>
            </div>
          ),
        })
      ),
    },
    {
      id: "audit",
      label: "Financial audit",
      sectionLabel: "Page 4 of 4",
      accentNote: "Liquidity and readiness summary",
      render: () => (
        renderBundlePreviewSheet({
          sheetKey: "audit",
          counterLabel: "Page 4 of 4",
          accentNote: "Liquidity and readiness summary",
          density: "comfortable",
          children: (
            <div className="space-y-4 text-[#1b2430]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Accessible funds</p>
                <p className="mt-1 text-sm font-semibold">EUR {applicant.employment.savingsBalanceEur.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Monthly income profile</p>
                <p className="mt-1 text-sm font-semibold">EUR {applicant.employment.monthlyIncomeEur.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Supporting proof loaded</p>
                <p className="mt-1 text-sm font-semibold">{supportingDocuments.length} uploaded file{supportingDocuments.length === 1 ? "" : "s"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">Bank statements, employment proofs, and other packet evidence stay connected to the final bundle export from this workspace.</p>
              </div>
            </div>
          ),
        })
      ),
    },
  ];
  const advancedPdfEditorTools = [
    "merge",
    "split",
    "compress",
    "reorder",
    "rotate",
    "sanitize",
    "wordToPdf",
  ] as const;

  const advancedPdfEditorCards = [
    {
      key: "merge-pdf",
      targetId: "merge",
      label: "Merge PDF",
      description: "Upload multiple files, arrange them, then create one embassy-ready PDF.",
    },
    {
      key: "jpg-to-pdf",
      targetId: "merge",
      label: "JPG to PDF",
      description: "Instantly compile scattered passport scans, physical receipts, and stamp photos into a unified, high-resolution document ready for embassy submission.",
      icon: FileImage,
      accentClass: "border-sky-300/20 bg-sky-500/10 text-sky-100",
      iconClass: "bg-sky-100 text-sky-700",
    },
    {
      key: "split-pdf",
      targetId: "split",
      label: "Split PDF",
      description: "Upload one PDF, preview it, then extract the exact page range you need.",
    },
    {
      key: "compress-pdf",
      targetId: "compress",
      label: "Compress PDF",
      description: "Upload one PDF, preview it, then generate a lighter portal-friendly copy.",
    },
    {
      key: "organize-pdf",
      targetId: "reorder",
      label: "Organize PDF",
      description: "Visually inspect your print-ready visa packet, extract irrelevant sheets, and drag supporting evidence into the exact physical order required by VFS Global.",
      icon: Layers3,
      accentClass: "border-violet-300/20 bg-violet-500/10 text-violet-100",
      iconClass: "bg-violet-100 text-violet-600",
    },
    {
      key: "rotate-pdf",
      targetId: "rotate",
      label: "Rotate PDF",
      description: "Upload one PDF, choose the angle, then export a corrected orientation.",
    },
    {
      key: "sanitize-pdf",
      targetId: "sanitize",
      label: "Sanitize PDF",
      description: "Upload one PDF, review it, then strip metadata before submission.",
    },
    {
      key: "word-to-pdf",
      targetId: "wordToPdf",
      label: "Word to PDF",
      description: "Upload a DOC, DOCX, RTF, or ODT file and convert it on the server into a real PDF.",
    },
  ] as const;

  const workspaceTabs: Array<{
    id: WorkspaceTab;
    label: string;
    eyebrow: string;
  }> = [
    { id: "bundle", label: "Print-Ready Visa Packet", eyebrow: "Default landing" },
    { id: "cover-letter", label: "AI Cover Letter Studio", eyebrow: "Narrative editing" },
    { id: "pdf-editor", label: "Advanced PDF Editor", eyebrow: "Operational toolkit" },
    { id: "checklist", label: "VFS Checklist & Stacking Order", eyebrow: "Appointment prep" },
    { id: "prep", label: "Interview Prep & Recovery", eyebrow: "Optional preparation" },
  ];

  function adjustPreviewScale(direction: "in" | "out" | "reset") {
    if (direction === "reset") {
      setPreviewScale(1);
      return;
    }

    setPreviewScale((currentScale) => {
      const nextScale = direction === "in" ? currentScale + 0.1 : currentScale - 0.1;
      return Number(Math.min(1.3, Math.max(0.8, nextScale)).toFixed(2));
    });
  }

  function setBundlePreviewPage(direction: "previous" | "next") {
    setActiveBundlePreviewPage((currentPage) => {
      if (direction === "previous") {
        return currentPage === 0 ? bundlePreviewPages.length - 1 : currentPage - 1;
      }

      return currentPage === bundlePreviewPages.length - 1 ? 0 : currentPage + 1;
    });
  }

  function renderCoverLetterStudio() {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[1rem] border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Live sync</p>
            <p className="mt-2 font-semibold text-white">Transit sync: {queuedTransferNotesCount} transfer note{queuedTransferNotesCount === 1 ? "" : "s"} queued</p>
          </div>
          <div className="rounded-[1rem] border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">Live sync</p>
            <p className="mt-2 font-semibold text-white">Accommodation sync: {itinerarySyncSummary.accommodationGapWarnings.length === 0 ? "No stay gaps detected" : `${itinerarySyncSummary.accommodationGapWarnings.length} gap${itinerarySyncSummary.accommodationGapWarnings.length === 1 ? "" : "s"} flagged`}</p>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                Embassy-facing cover letter
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Adjust phrasing here without competing PDF tools on screen. This tab stays focused on the consular narrative only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleCoverLetterDraft.trim() ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(visibleCoverLetterDraft, "cover-letter")}
                    className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/14"
                  >
                    <Download className="h-4 w-4" />
                    Download .doc
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadPdf(visibleCoverLetterDraft, "cover-letter")}
                    className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/14"
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
                className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingCoverLetter ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGeneratingCoverLetter ? "Generating..." : visibleCoverLetterDraft.trim() ? "Regenerate" : "Generate"}
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
            <div className="mt-4 rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
              {coverLetterMessage}
            </div>
          ) : null}

          <div className="relative mt-4">
            <textarea
              value={visibleCoverLetterDraft}
              onChange={(event) => onCoverLetterChange(event.target.value)}
              disabled={isGeneratingCoverLetter}
              rows={16}
              placeholder="Generate or edit the final cover letter here before saving the application package."
              className="w-full rounded-[1rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 pr-12 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-70"
            />
            {speechSupported ? (
              <button
                type="button"
                onClick={() => void handlePromptDictation({
                  targetKey: "cover-letter-draft",
                  baselineText: visibleCoverLetterDraft,
                  onPreviewChange: onCoverLetterChange,
                  onFinalize: onCoverLetterChange,
                  startMessage: "Recording live. Speak naturally and tap the mic again when the cover letter phrasing looks right.",
                  permissionMessage: "Microphone access enabled. Speak your cover letter edits now.",
                  successMessage: "Voice dictation inserted into the cover letter draft.",
                })}
                className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                  promptDictationState?.targetKey === "cover-letter-draft" && promptDictationState.phase === "listening"
                    ? "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.28),0_0_24px_rgba(251,113,133,0.35)]"
                    : promptDictationState?.targetKey === "cover-letter-draft" && promptDictationState.phase === "processing"
                      ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_24px_rgba(16,185,129,0.32)]"
                      : "border-white/14 bg-white/10 text-slate-100 hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
                }`}
                aria-label="Dictate cover letter"
              >
                {promptDictationState?.targetKey === "cover-letter-draft" && promptDictationState.phase === "listening" ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                    <Square className="relative h-3.5 w-3.5 fill-current" />
                  </>
                ) : promptDictationState?.targetKey === "cover-letter-draft" && promptDictationState.phase === "processing" ? (
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
        </div>

        <div className="rounded-[1.1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(26,38,66,0.84),rgba(14,22,42,0.92))] p-4 shadow-[0_16px_40px_rgba(5,10,24,0.18)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Additional AI Letters
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Generate employer or explanation letters only when you need extra narrative support beyond the main cover letter.
              </p>
            </div>
            {speechSupported ? (
              <span className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                {microphonePermission === "granted" ? "Voice briefs ready" : "Voice briefs available"}
              </span>
            ) : null}
          </div>

          {customVoiceMessage ? (
            <div className="mt-4 rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
              {customVoiceMessage}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {customLetters.map((letter) => {
              const promptPhase = promptDictationState?.targetKey === `prompt:${letter.id}` ? promptDictationState.phase : null;
              const titlePhase = promptDictationState?.targetKey === `title:${letter.id}` ? promptDictationState.phase : null;
              const contentPhase = promptDictationState?.targetKey === `content:${letter.id}` ? promptDictationState.phase : null;

              return (
                <div key={letter.id} className="rounded-[1rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <input
                        value={letter.title}
                        onChange={(event) => onCustomLetterChange(letter.id, { title: event.target.value })}
                        placeholder="Letter title"
                        className="w-full rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35"
                      />
                      {speechSupported ? (
                        <button
                          type="button"
                          onClick={() => void handlePromptDictation({
                            targetKey: `title:${letter.id}`,
                            baselineText: letter.title,
                            onPreviewChange: (value) => onCustomLetterChange(letter.id, { title: value }),
                            onFinalize: (value) => onCustomLetterChange(letter.id, { title: value }),
                            startMessage: "Recording live. Speak the letter title, then tap the mic again when it looks right.",
                            permissionMessage: "Microphone access enabled. Speak the title now.",
                            successMessage: "Voice dictation inserted into the letter title.",
                          })}
                          className={`absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                            titlePhase === "listening"
                              ? "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.28),0_0_24px_rgba(251,113,133,0.35)]"
                              : titlePhase === "processing"
                                ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_24px_rgba(16,185,129,0.32)]"
                                : "border-white/14 bg-white/10 text-slate-100 hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
                          }`}
                          aria-label={`Dictate title for ${letter.title || letter.id}`}
                        >
                          {titlePhase === "listening" ? (
                            <>
                              <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                              <Square className="relative h-3.5 w-3.5 fill-current" />
                            </>
                          ) : titlePhase === "processing" ? (
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

                    <div className="relative">
                      <textarea
                        value={letter.prompt}
                        onChange={(event) => onCustomLetterChange(letter.id, { prompt: event.target.value })}
                        rows={5}
                        placeholder="Describe what this extra letter should explain."
                        className="w-full rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 pr-12 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35"
                      />
                      {speechSupported ? (
                        <button
                          type="button"
                          onClick={() => void handlePromptDictation({
                            targetKey: `prompt:${letter.id}`,
                            baselineText: letter.prompt,
                            onPreviewChange: (value) => onCustomLetterChange(letter.id, { prompt: value }),
                            onFinalize: (value) => onCustomLetterChange(letter.id, { prompt: value, message: "Voice brief inserted. Review it, then generate the letter." }),
                            startMessage: "Recording live. Speak naturally and tap the mic again when your brief looks right.",
                            permissionMessage: "Microphone access enabled. Speak your custom letter brief now.",
                            successMessage: "Voice brief inserted into the selected custom letter.",
                          })}
                          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                            promptPhase === "listening"
                              ? "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.28),0_0_24px_rgba(251,113,133,0.35)]"
                              : promptPhase === "processing"
                                ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_24px_rgba(16,185,129,0.32)]"
                                : "border-white/14 bg-white/10 text-slate-100 hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
                          }`}
                          aria-label={`Dictate ${letter.title}`}
                        >
                          {promptPhase === "listening" ? (
                            <>
                              <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                              <Square className="relative h-3.5 w-3.5 fill-current" />
                            </>
                          ) : promptPhase === "processing" ? (
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

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onGenerateCustomLetter(letter.id, applicant)}
                        disabled={activeCustomLetterId === letter.id}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeCustomLetterId === letter.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {activeCustomLetterId === letter.id ? "Generating..." : "Generate Letter"}
                      </button>
                      {letter.content.trim() ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(letter.content, letter.title || `letter-${letter.id}`)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/14"
                          >
                            <Download className="h-4 w-4" />
                            Download .doc
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownloadPdf(letter.content, letter.title || `letter-${letter.id}`)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/14"
                          >
                            <Download className="h-4 w-4" />
                            Download PDF
                          </button>
                        </>
                      ) : null}
                    </div>

                    {letter.message ? (
                      <div className="rounded-[0.9rem] border border-white/14 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
                        {letter.message}
                      </div>
                    ) : null}

                    <div className="relative">
                      <textarea
                        value={letter.content}
                        onChange={(event) => onCustomLetterChange(letter.id, { content: event.target.value })}
                        rows={8}
                        placeholder="The generated additional letter will appear here."
                        className="w-full rounded-[0.9rem] border border-white/14 bg-[rgba(10,18,34,0.56)] px-4 py-3 pr-12 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35"
                      />
                      {speechSupported ? (
                        <button
                          type="button"
                          onClick={() => void handlePromptDictation({
                            targetKey: `content:${letter.id}`,
                            baselineText: letter.content,
                            onPreviewChange: (value) => onCustomLetterChange(letter.id, { content: value }),
                            onFinalize: (value) => onCustomLetterChange(letter.id, { content: value }),
                            startMessage: "Recording live. Speak naturally and tap the mic again when the additional letter text looks right.",
                            permissionMessage: "Microphone access enabled. Speak the additional letter text now.",
                            successMessage: "Voice dictation inserted into the additional letter draft.",
                          })}
                          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                            contentPhase === "listening"
                              ? "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.28),0_0_24px_rgba(251,113,133,0.35)]"
                              : contentPhase === "processing"
                                ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_24px_rgba(16,185,129,0.32)]"
                                : "border-white/14 bg-white/10 text-slate-100 hover:border-cyan-300/35 hover:bg-white/14 hover:text-white"
                          }`}
                          aria-label={`Dictate content for ${letter.title || letter.id}`}
                        >
                          {contentPhase === "listening" ? (
                            <>
                              <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                              <Square className="relative h-3.5 w-3.5 fill-current" />
                            </>
                          ) : contentPhase === "processing" ? (
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TravelIntentStudio
          applicant={applicant}
          coverLetterDraft={coverLetterDraft}
          supportingDocumentCount={supportingDocuments.length}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(24,34,58,0.84),rgba(14,22,42,0.92))] p-4 shadow-[0_20px_48px_rgba(5,10,24,0.24)] sm:p-6">
        <div className="rounded-[1.4rem] bg-[linear-gradient(160deg,rgba(27,42,74,0.92),rgba(12,19,36,0.98))] p-4 shadow-[0_24px_64px_rgba(5,10,24,0.28)] sm:p-6">
          <Step5TabBar tabs={workspaceTabs} activeTab={activeTab} onSelect={setActiveTab} />

          <div className="mt-5">
            {activeTab === "bundle" ? (
              <BundleTabPanel
                previewMode={previewMode}
                isSubmitting={isSubmitting}
                previewPacketTitle={previewPacketTitle}
                bundleMetricItems={bundleMetricItems}
                bundlePreviewPages={bundlePreviewPages}
                activeBundlePreviewPage={activeBundlePreviewPage}
                previewScale={previewScale}
                onPreviousPage={() => setBundlePreviewPage("previous")}
                onNextPage={() => setBundlePreviewPage("next")}
                onZoomOut={() => adjustPreviewScale("out")}
                onZoomReset={() => adjustPreviewScale("reset")}
                onZoomIn={() => adjustPreviewScale("in")}
                onSelectPage={setActiveBundlePreviewPage}
                onDownloadMasterBundle={handleDownloadMasterBundle}
                onFinalizeAndGoToVault={onFinalizeAndGoToVault}
                onOpenConsulateReadyPacket={handleOpenConsulateReadyPacket}
              />
            ) : null}

            {activeTab === "cover-letter" ? renderCoverLetterStudio() : null}

            {activeTab === "pdf-editor" ? (
              <div className="space-y-4">
                <PacketWorkspace
                  previewMode={previewMode}
                  supportingDocuments={supportingDocuments}
                  onSupportingDocumentsChange={onSupportingDocumentsChange}
                  travelerTargets={documentTravelerTargets}
                  allowedTools={[...advancedPdfEditorTools]}
                  toolCards={[...advancedPdfEditorCards]}
                />
              </div>
            ) : null}

            {activeTab === "checklist" ? (
              <ChecklistTabPanel applicant={applicant} onDownloadPdf={handleDownloadChecklistPdf} />
            ) : null}

            {activeTab === "prep" ? (
              <PrepTabPanel
                applicant={applicant}
                refusalReasonCode={null}
                interviewDownloadHref={previewMode
                  ? `/dashboard/${getPreviewApplicationForDestination(applicant.trip.destinationCountry)?.id ?? "preview-france-tourism"}/interview-simulator?preview=1`
                  : undefined}
                refusalDownloadHref={previewMode
                  ? `/dashboard/${getPreviewApplicationForDestination(applicant.trip.destinationCountry)?.id ?? "preview-france-tourism"}/refusal-decoder?preview=1`
                  : undefined}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}