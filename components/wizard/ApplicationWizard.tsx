"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronDown, FileStack, Home, LoaderCircle, Mic, Plane, Square, UserSquare2, Wallet, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormRegister,
} from "react-hook-form";
import {
  applicantDraftSchema,
  calculateStayDurationDays,
  applicantInfoSchema,
  defaultApplicantInfo,
  mergeApplicantDraft,
} from "@/lib/applications/schema";
import { previewWizardApplicant } from "@/lib/mock/applications";
import { Step5Workspace, type CustomLetterDraft } from "@/components/wizard/Step5Workspace";
import { TintedIconBadge } from "@/components/ui/TintedIconBadge";
import type { ApplicantInfo, PassportDocumentParseResult, PricingTier, SupportingDocument } from "@/types";
import { runRiskAudit } from "@/lib/riskAudit";

const draftStorageKey = "visapilot.applicationDraft";
const customLettersStorageKey = "visapilot.customLettersDraft";

const defaultCustomLetters: CustomLetterDraft[] = [
  {
    id: "custom-letter-1",
    title: "Employer support letter",
    prompt: "",
    content: "",
    message: null,
  },
  {
    id: "custom-letter-2",
    title: "Additional explanation letter",
    prompt: "",
    content: "",
    message: null,
  },
];

const stepLabels = [
  "Identity",
  "Travel",
  "Financials",
  "Accommodations",
  "Document Studio",
] as const;

const stepAccentMap = [
  "from-brand-cyan to-sky-400",
  "from-brand-violet to-indigo-400",
  "from-brand-coral to-orange-300",
  "from-brand-lime to-emerald-300",
  "from-sky-400 to-indigo-400",
] as const;

const stepMicrocopy = [
  "Passport upload or manual identity entry",
  "Route, timing, and Schengen entry logic",
  "Proof of funds and employment posture",
  "Accommodation evidence and return anchors",
  "Supporting documents, cover letter, and final generation",
] as const;

const stepIcons = [UserSquare2, Plane, Wallet, Home, FileStack] as const;

const stepFieldGroups: FieldPath<ApplicantInfo>[][] = [
  [
    "personal.firstName",
    "personal.lastName",
    "personal.dateOfBirth",
    "personal.placeOfBirth",
    "personal.countryOfBirth",
    "personal.currentNationality",
    "contact.email",
    "contact.phone",
    "contact.addressLine1",
    "contact.city",
    "contact.postalCode",
    "contact.country",
    "passport.number",
    "passport.dateOfIssue",
    "passport.dateOfExpiry",
    "passport.issuedBy",
    "passport.issuingCountry",
  ],
  [
    "trip.destinationCountry",
    "trip.firstEntryCountry",
    "trip.portOfEntry",
    "trip.purpose",
    "trip.entriesRequested",
    "trip.arrivalDate",
    "trip.departureDate",
  ],
  [
    "employment.employmentStatus",
    "employment.occupation",
    "employment.monthlyIncomeEur",
    "employment.savingsBalanceEur",
    "sponsor.type",
  ],
  [
    "trip.hotelBookingReference",
    "trip.accommodations",
    "homeTies.propertyOwnership",
    "homeTies.dependentInformation",
    "homeTies.returnIntentEvidence",
    "application.placeOfApplication",
  ],
  [],
];

function getErrorMessage<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: FieldPath<T>,
): string | undefined {
  const segments = `${name}`.split(".");
  let currentValue: unknown = errors;

  for (const segment of segments) {
    if (!currentValue || typeof currentValue !== "object") {
      return undefined;
    }

    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  if (!currentValue || typeof currentValue !== "object") {
    return undefined;
  }

  const message = (currentValue as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

interface InputProps {
  label: string;
  name: FieldPath<ApplicantInfo>;
  register: UseFormRegister<ApplicantInfo>;
  errors: FieldErrors<ApplicantInfo>;
  type?: "text" | "email" | "date" | "number";
  placeholder?: string;
  step?: string;
  enableVoice?: boolean;
  onVoiceCapture?: (name: FieldPath<ApplicantInfo>) => void;
  voicePhase?: "listening" | "processing" | null;
}

function getVoiceButtonClass(voicePhase: "listening" | "processing" | null) {
  if (voicePhase === "listening") {
    return "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.28),0_0_24px_rgba(251,113,133,0.35)]";
  }

  if (voicePhase === "processing") {
    return "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_0_24px_rgba(16,185,129,0.32)]";
  }

  return "border-white/10 bg-black/50 text-slate-300 hover:border-white/20 hover:text-white";
}

function VoiceButtonIcon({ voicePhase }: { voicePhase: "listening" | "processing" | null }) {
  if (voicePhase === "listening") {
    return (
      <>
        <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
        <Square className="relative h-3.5 w-3.5 fill-current" />
      </>
    );
  }

  if (voicePhase === "processing") {
    return (
      <>
        <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse" />
        <span className="absolute inset-0 rounded-full border border-emerald-300/40 border-t-transparent animate-spin" />
        <Mic className="relative h-4 w-4" />
      </>
    );
  }

  return <Mic className="h-4 w-4" />;
}

function TextInput({
  label,
  name,
  register,
  errors,
  type = "text",
  placeholder,
  step,
  enableVoice = false,
  onVoiceCapture,
  voicePhase = null,
}: InputProps) {
  const errorMessage = getErrorMessage(errors, name);
  const isNumeric = type === "number";
  const isDate = type === "date";

  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="relative block">
        <input
          type={type}
          step={step}
          placeholder={placeholder}
          className={`vp-input w-full px-4 py-3 ${isDate ? "date-input pr-11" : ""} ${
            errorMessage ? "border-rose-300" : ""
          }`}
          {...register(name, isNumeric ? { valueAsNumber: true } : undefined)}
        />
        {isDate ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[color:var(--vp-text-muted)]">
            <CalendarDays className="h-4 w-4" />
          </span>
        ) : null}
        {enableVoice ? (
          <button
            type="button"
            onClick={() => onVoiceCapture?.(name)}
            className={`absolute ${isDate ? "right-12 top-1/2 -translate-y-1/2" : "right-3 top-1/2 -translate-y-1/2"} inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${getVoiceButtonClass(voicePhase)}`}
            aria-label={`Voice fill ${label}`}
          >
            <VoiceButtonIcon voicePhase={voicePhase} />
          </button>
        ) : null}
      </span>
      {errorMessage ? <span className="text-sm text-rose-600">{errorMessage}</span> : null}
    </label>
  );
}

interface SelectInputProps {
  label: string;
  name: FieldPath<ApplicantInfo>;
  register: UseFormRegister<ApplicantInfo>;
  errors: FieldErrors<ApplicantInfo>;
  options: Array<{ label: string; value: string }>;
}

function SelectInput({ label, name, register, errors, options }: SelectInputProps) {
  const errorMessage = getErrorMessage(errors, name);

  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="relative block">
        <select
          className={`vp-select ${errorMessage ? "border-rose-300" : ""}`}
          {...register(name)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[color:var(--vp-text-muted)]">
          <ChevronDown className="h-4 w-4" />
        </span>
      </span>
      {errorMessage ? <span className="text-sm text-rose-600">{errorMessage}</span> : null}
    </label>
  );
}

interface TextAreaInputProps {
  label: string;
  name: FieldPath<ApplicantInfo>;
  register: UseFormRegister<ApplicantInfo>;
  errors: FieldErrors<ApplicantInfo>;
  rows?: number;
  placeholder?: string;
  enableVoice?: boolean;
  onVoiceCapture?: (name: FieldPath<ApplicantInfo>) => void;
  voicePhase?: "listening" | "processing" | null;
}

function TextAreaInput({
  label,
  name,
  register,
  errors,
  rows = 4,
  placeholder,
  enableVoice = false,
  onVoiceCapture,
  voicePhase = null,
}: TextAreaInputProps) {
  const errorMessage = getErrorMessage(errors, name);

  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="relative block">
        <textarea
          rows={rows}
          placeholder={placeholder}
          className={`vp-input w-full px-4 py-3 pr-11 ${
            errorMessage ? "border-rose-300" : ""
          }`}
          {...register(name)}
        />
        {enableVoice ? (
          <button
            type="button"
            onClick={() => onVoiceCapture?.(name)}
            className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${getVoiceButtonClass(voicePhase)}`}
            aria-label={`Voice fill ${label}`}
          >
            <VoiceButtonIcon voicePhase={voicePhase} />
          </button>
        ) : null}
      </span>
      {errorMessage ? <span className="text-sm text-rose-600">{errorMessage}</span> : null}
    </label>
  );
}

function StepPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof UserSquare2;
  tone: "red" | "blue" | "indigo" | "emerald" | "amber" | "slate";
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel p-6 sm:p-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <TintedIconBadge icon={Icon} tone={tone} label={eyebrow} />
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        </div>
        <p className="text-sm leading-6 text-slate-300">{description}</p>
      </div>
      <div className="mt-8 space-y-6">{children}</div>
    </div>
  );
}

function ActivityBanner({
  eyebrow,
  title,
  description,
  tone = "indigo",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "indigo" | "cyan" | "emerald" | "amber";
}) {
  const toneClasses = {
    indigo: "border-indigo-300/20 bg-indigo-500/10 text-indigo-100",
    cyan: "border-cyan-300/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-500/10 text-amber-100",
  } as const;

  return (
    <div className={`rounded-[1.1rem] border px-4 py-4 ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{eyebrow}</p>
          <p className="mt-1 text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>
        </div>
      </div>
    </div>
  );
}

function splitParsedFullName(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(" ");

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

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

type VoiceCapturePhase = "listening" | "processing";

type VoiceCaptureState = {
  field: FieldPath<ApplicantInfo>;
  phase: VoiceCapturePhase;
  heardText: string;
  typedText: string;
};

type VoiceCaptureSession = {
  field: FieldPath<ApplicantInfo>;
  baselineValue: string | number;
  heardText: string;
  typedValue: string | number;
};

const dateVoiceFields = new Set<FieldPath<ApplicantInfo>>([
  "personal.dateOfBirth",
  "passport.dateOfIssue",
  "passport.dateOfExpiry",
  "trip.arrivalDate",
  "trip.departureDate",
  "application.finalDestinationPermitValidUntil",
]);

const numericVoiceFields = new Set<FieldPath<ApplicantInfo>>([
  "employment.monthlyIncomeEur",
  "employment.savingsBalanceEur",
]);

const countryVoiceFields = new Set<FieldPath<ApplicantInfo>>([
  "personal.countryOfBirth",
  "personal.currentNationality",
  "contact.country",
  "contact.residenceCountry",
  "passport.issuingCountry",
  "trip.destinationCountry",
  "trip.firstEntryCountry",
]);

const phoneVoiceFields = new Set<FieldPath<ApplicantInfo>>([
  "contact.phone",
  "employment.employerPhone",
  "trip.hostPhone",
  "sponsor.phone",
]);

const passportVoiceFields = new Set<FieldPath<ApplicantInfo>>(["passport.number"]);

const numberWordMap: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const numberScaleMap: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  million: 1000000,
};

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDateTranscript(value: string): string {
  const normalized = value.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1").replace(/\s+/g, " ").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseNumberWords(value: string): number | null {
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((token) => token !== "and" && token !== "euros" && token !== "euro");

  if (tokens.length === 0) {
    return null;
  }

  let total = 0;
  let current = 0;
  let matchedWord = false;

  for (const token of tokens) {
    if (/^\d+(\.\d+)?$/.test(token)) {
      current += Number(token);
      matchedWord = true;
      continue;
    }

    if (token in numberWordMap) {
      current += numberWordMap[token];
      matchedWord = true;
      continue;
    }

    if (token in numberScaleMap) {
      matchedWord = true;

      if (current === 0) {
        current = 1;
      }

      current *= numberScaleMap[token];

      if (numberScaleMap[token] >= 1000) {
        total += current;
        current = 0;
      }

      continue;
    }

    return null;
  }

  if (!matchedWord) {
    return null;
  }

  return total + current;
}

function normalizeNumericTranscript(value: string): string {
  const digitsOnly = value.replace(/[^\d.,-]/g, "").replace(/,/g, "").trim();

  if (digitsOnly.length > 0 && /^-?\d+(\.\d+)?$/.test(digitsOnly)) {
    return digitsOnly;
  }

  const parsedWords = parseNumberWords(value);

  if (parsedWords === null) {
    return value;
  }

  return String(parsedWords);
}

function normalizePhoneTranscript(value: string): string {
  const cleaned = value.replace(/[^\d+\s-]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || value;
}

function normalizePassportTranscript(value: string): string {
  const cleaned = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return cleaned || value;
}

function sanitizeSpeechTranscript(value: string): string {
  return value.trim().replace(/[.]+$/g, "").trim();
}

function stringifyVoiceValue(value: string | number): string {
  return typeof value === "number" ? String(value) : value;
}

function buildVoiceFieldValue(
  name: FieldPath<ApplicantInfo>,
  baselineValue: string | number,
  transcript: string,
): { normalizedTranscript: string; nextValue: string | number | null } {
  const normalizedTranscript = normalizeVoiceTranscript(name, transcript);

  if (numericVoiceFields.has(name)) {
    const normalizedNumber = Number(normalizedTranscript);
    return {
      normalizedTranscript,
      nextValue: Number.isNaN(normalizedNumber) ? null : normalizedNumber,
    };
  }

  const nextValue =
    typeof baselineValue === "string" &&
    baselineValue.trim().length > 0 &&
    !dateVoiceFields.has(name) &&
    !passportVoiceFields.has(name) &&
    !phoneVoiceFields.has(name) &&
    !countryVoiceFields.has(name)
      ? `${baselineValue.trim()} ${normalizedTranscript}`
      : normalizedTranscript;

  return {
    normalizedTranscript,
    nextValue,
  };
}

function normalizeVoiceTranscript(name: FieldPath<ApplicantInfo>, transcript: string): string {
  if (dateVoiceFields.has(name)) {
    return normalizeDateTranscript(transcript);
  }

  if (numericVoiceFields.has(name)) {
    return normalizeNumericTranscript(transcript);
  }

  if (countryVoiceFields.has(name)) {
    return titleCaseWords(transcript);
  }

  if (phoneVoiceFields.has(name)) {
    return normalizePhoneTranscript(transcript);
  }

  if (passportVoiceFields.has(name)) {
    return normalizePassportTranscript(transcript);
  }

  return transcript.trim();
}

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

export function ApplicationWizard({
  previewMode = false,
  availableCredits = 0,
}: {
  previewMode?: boolean;
  availableCredits?: number;
}) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceProcessingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceCaptureSessionRef = useRef<VoiceCaptureSession | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isParsingPassport, setIsParsingPassport] = useState(false);
  const [passportParseMessage, setPassportParseMessage] = useState<string | null>(null);
  const [identityLockMessage, setIdentityLockMessage] = useState<string | null>(null);
  const [isParsingBankStatement, setIsParsingBankStatement] = useState(false);
  const [bankStatementParseMessage, setBankStatementParseMessage] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState<PricingTier | null>(null);
  const [coverLetterDraft, setCoverLetterDraft] = useState("");
  const [documentStudioTab, setDocumentStudioTab] = useState<"cover-letter" | "toolkit">("toolkit");
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterMessage, setCoverLetterMessage] = useState<string | null>(null);
  const [customLetters, setCustomLetters] = useState<CustomLetterDraft[]>(defaultCustomLetters);
  const [activeCustomLetterId, setActiveCustomLetterId] = useState<string | null>(null);
  const [voiceCaptureState, setVoiceCaptureState] = useState<VoiceCaptureState | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [isMicrophoneHelpDismissed, setIsMicrophoneHelpDismissed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const bankStatementInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ApplicantInfo>({
    resolver: zodResolver(applicantInfoSchema),
    defaultValues: previewMode ? previewWizardApplicant : defaultApplicantInfo,
    mode: "onBlur",
  });

  const watchedValues = useWatch({ control: form.control });
  const arrivalDate = useWatch({ control: form.control, name: "trip.arrivalDate" });
  const departureDate = useWatch({ control: form.control, name: "trip.departureDate" });
  const destinationCountry = useWatch({ control: form.control, name: "trip.destinationCountry" });
  const firstEntryCountry = useWatch({ control: form.control, name: "trip.firstEntryCountry" });
  const firstName = useWatch({ control: form.control, name: "personal.firstName" });
  const lastName = useWatch({ control: form.control, name: "personal.lastName" });
  const savingsBalance = useWatch({ control: form.control, name: "employment.savingsBalanceEur" });
  const transitCountries = useWatch({ control: form.control, name: "trip.transitCountries" });

  const completionPercent = Math.round(((currentStep + 1) / stepLabels.length) * 100);
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Applicant profile";
  const destinationLabel = destinationCountry?.trim() || "Destination pending";
  const stayDuration = form.watch("trip.stayDurationDays") || 0;
  const supportingDocuments = useWatch({ control: form.control, name: "supportingDocuments" }) ?? [];
  const fundsValue = typeof savingsBalance === "number" && Number.isFinite(savingsBalance) ? savingsBalance : 0;
  const summaryItems = [
    { label: "Applicant", value: displayName },
    { label: "Destination", value: destinationLabel },
    { label: "Stay", value: stayDuration > 0 ? `${stayDuration} days` : "Pending" },
    { label: "Funds", value: fundsValue > 0 ? `EUR ${fundsValue.toFixed(0)}` : "Pending" },
  ] as const;
  const liveAudit = runRiskAudit(form.getValues());
  const consularRuleMessage =
    destinationCountry && firstEntryCountry
      ? destinationCountry === firstEntryCountry
        ? `Consular rule check passes: your first Schengen entry matches ${destinationCountry}, which supports filing with that consulate.`
        : `First entry is ${firstEntryCountry}. Apply through ${destinationCountry} only if it remains the country of longest stay under Schengen consular rules.`
      : "Enter destination and first entry to verify the consular rule path.";
  const displayedVoiceMessage =
    voiceCaptureState?.phase === "listening"
      ? "Recording live. Speak naturally and tap the glowing red stop control when you are done."
      : voiceCaptureState?.phase === "processing"
        ? "Processing your voice input."
        : voiceMessage ?? "Tap any microphone to start live dictation into a supported field.";

  useEffect(() => {
    const supported = Boolean(getSpeechRecognitionConstructor());
    setSpeechSupported(supported);

    if (!supported) {
      setMicrophonePermission("unsupported");
      setVoiceMessage("Voice assist requires Web Speech API support. Chrome or Edge on desktop/mobile are the safest options.");
      return;
    }

    setMicrophonePermission("idle");
  }, []);

  useEffect(() => {
    if (previewMode) {
      form.reset(previewWizardApplicant);
      setCustomLetters(defaultCustomLetters);
      setHasHydrated(true);
      return;
    }

    const savedDraft = window.localStorage.getItem(draftStorageKey);

    if (savedDraft) {
      const parsedDraft = applicantDraftSchema.safeParse(JSON.parse(savedDraft));

      if (parsedDraft.success) {
        form.reset(mergeApplicantDraft(parsedDraft.data));
      }
    }

    const savedCustomLetters = window.localStorage.getItem(customLettersStorageKey);

    if (savedCustomLetters) {
      try {
        const parsedCustomLetters = JSON.parse(savedCustomLetters) as CustomLetterDraft[];

        if (Array.isArray(parsedCustomLetters) && parsedCustomLetters.length === defaultCustomLetters.length) {
          setCustomLetters(
            parsedCustomLetters.map((letter, index) => ({
              ...defaultCustomLetters[index],
              ...letter,
            })),
          );
        }
      } catch {
        setCustomLetters(defaultCustomLetters);
      }
    }

    setHasHydrated(true);
  }, [form, previewMode]);

  useEffect(() => {
    const stayDurationDays = calculateStayDurationDays(arrivalDate, departureDate);
    form.setValue("trip.stayDurationDays", stayDurationDays, {
      shouldDirty: false,
      shouldValidate: hasHydrated,
    });
  }, [arrivalDate, departureDate, form, hasHydrated]);

  useEffect(() => {
    if (!destinationCountry) {
      return;
    }

    form.setValue("trip.memberStatesToVisit", [destinationCountry], {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [destinationCountry, form]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    setDraftState("saving");
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(watchedValues));
      setDraftState("saved");
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasHydrated, watchedValues]);

  useEffect(() => {
    if (!hasHydrated || previewMode) {
      return;
    }

    window.localStorage.setItem(customLettersStorageKey, JSON.stringify(customLetters));
  }, [customLetters, hasHydrated, previewMode]);

  useEffect(() => {
    return () => {
      if (voiceProcessingTimeoutRef.current) {
        clearTimeout(voiceProcessingTimeoutRef.current);
      }

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
      }
    };
  }, []);

  function clearVoiceProcessingTimeout() {
    if (voiceProcessingTimeoutRef.current) {
      clearTimeout(voiceProcessingTimeoutRef.current);
      voiceProcessingTimeoutRef.current = null;
    }
  }

  function stopActiveVoiceCapture() {
    if (!speechRecognitionRef.current || voiceCaptureState?.phase !== "listening") {
      return;
    }

    speechRecognitionRef.current.stop();
    setVoiceCaptureState((current) =>
      current
        ? {
            ...current,
            phase: "processing",
          }
        : current,
    );
    setVoiceMessage("Processing your voice input.");
  }

  function finishVoiceCapture(field: FieldPath<ApplicantInfo>, nextMessage?: string) {
    clearVoiceProcessingTimeout();
    voiceProcessingTimeoutRef.current = setTimeout(() => {
      if (nextMessage) {
        setVoiceMessage(nextMessage);
      }

      setVoiceCaptureState((current) => (current?.field === field ? null : current));
      voiceCaptureSessionRef.current = null;
      voiceProcessingTimeoutRef.current = null;
    }, 900);
  }

  function finalizeVoiceCapture(field: FieldPath<ApplicantInfo>) {
    const session = voiceCaptureSessionRef.current;

    if (!session || session.field !== field) {
      finishVoiceCapture(field);
      return;
    }

    const transcript = sanitizeSpeechTranscript(session.heardText);

    if (!transcript) {
      form.setValue(field, session.baselineValue as never, {
        shouldDirty: false,
        shouldValidate: false,
      });
      finishVoiceCapture(field, "No speech was detected. Try again and speak a little closer to the microphone.");
      return;
    }

    const { normalizedTranscript, nextValue } = buildVoiceFieldValue(field, session.baselineValue, transcript);

    if (nextValue === null) {
      form.setValue(field, session.baselineValue as never, {
        shouldDirty: false,
        shouldValidate: false,
      });
      finishVoiceCapture(field, "Voice input was heard, but the amount could not be normalized into a number.");
      return;
    }

    form.setValue(field, nextValue as never, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setVoiceCaptureState((current) =>
      current?.field === field
        ? {
            ...current,
            heardText: transcript,
            typedText: stringifyVoiceValue(nextValue),
          }
        : current,
    );

    finishVoiceCapture(
      field,
      normalizedTranscript !== transcript
        ? `Voice input inserted and normalized to ${normalizedTranscript}`
        : "Voice input inserted into the active field",
    );
  }

  async function requestMicrophoneAccess() {
    setIsMicrophoneHelpDismissed(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission("unsupported");
      setVoiceMessage("Microphone capture is unavailable in this browser. Use Chrome or Edge for voice autofill.");
      return false;
    }

    setMicrophonePermission("requesting");
    setVoiceMessage("Requesting microphone access for voice autofill.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Mic permission granted");
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");
      setVoiceMessage("Microphone access enabled. Tap any mic button to dictate directly into a field.");
      return true;
    } catch (error) {
      console.log("Mic permission denied", error);
      setMicrophonePermission("denied");
      setVoiceMessage("Microphone access was blocked. Allow microphone permissions in the browser to unlock voice autofill.");
      return false;
    }
  }

  async function handleVoiceCapture(name: FieldPath<ApplicantInfo>) {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setVoiceMessage("Speech input is not available in this browser. Use Chrome or Edge, or type the value manually.");
      return;
    }

    if (voiceCaptureState?.field === name && voiceCaptureState.phase === "listening" && speechRecognitionRef.current) {
      stopActiveVoiceCapture();
      return;
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }

    clearVoiceProcessingTimeout();

    if (microphonePermission !== "granted") {
      const accessGranted = await requestMicrophoneAccess();

      if (!accessGranted) {
        return;
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    speechRecognitionRef.current = recognition;
    const baselineValue = (form.getValues(name) as string | number | undefined) ?? "";
    voiceCaptureSessionRef.current = {
      field: name,
      baselineValue: typeof baselineValue === "number" ? baselineValue : String(baselineValue),
      heardText: "",
      typedValue: typeof baselineValue === "number" ? baselineValue : String(baselineValue),
    };
    setVoiceCaptureState({
      field: name,
      phase: "listening",
      heardText: "",
      typedText: stringifyVoiceValue(voiceCaptureSessionRef.current.typedValue),
    });
    setVoiceMessage("Recording live. Speak naturally and tap stop when you are done.");

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const session = voiceCaptureSessionRef.current;

      if (!session || session.field !== name) {
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
      session.heardText = heardText;

      if (!heardText) {
        setVoiceCaptureState({
          field: name,
          phase: "listening",
          heardText: "",
          typedText: stringifyVoiceValue(session.baselineValue),
        });
        return;
      }

      const preview = buildVoiceFieldValue(name, session.baselineValue, heardText);
      const typedValue = preview.nextValue ?? session.baselineValue;
      session.typedValue = typedValue;

      form.setValue(name, typedValue as never, {
        shouldDirty: true,
        shouldValidate: false,
      });

      setVoiceCaptureState({
        field: name,
        phase: "listening",
        heardText,
        typedText: stringifyVoiceValue(typedValue),
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const errorCode = event.error ?? "unknown_error";
      setVoiceMessage(
        errorCode === "not-allowed"
          ? "Microphone access was denied. Allow browser mic permissions and try again."
          : `Voice input could not be captured (${errorCode}). Check microphone permissions and try again.`,
      );
      if (errorCode === "not-allowed") {
        setMicrophonePermission("denied");
      }
      clearVoiceProcessingTimeout();
      setVoiceCaptureState(null);
      voiceCaptureSessionRef.current = null;
    };

    recognition.onend = () => {
      finalizeVoiceCapture(name);
    };

    recognition.start();
  }

  async function handleNextStep() {
    const isValid = await form.trigger(stepFieldGroups[currentStep], { shouldFocus: true });

    if (!isValid) {
      return;
    }

    if (currentStep === 0 && !previewMode) {
      const firstStepValues = form.getValues();
      const fullName = [firstStepValues.personal.firstName, firstStepValues.personal.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      try {
        setIdentityLockMessage("Locking this applicant identity before the next step.");
        const response = await fetch("/api/identity-lock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            passportNumber: firstStepValues.passport.number,
          }),
        });

        const payload = (await response.json()) as { message?: string; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to initialize the identity lock.");
        }

        setIdentityLockMessage(payload.message ?? "Identity lock initialized for this applicant.");
      } catch (error) {
        setIdentityLockMessage(error instanceof Error ? error.message : "Unable to initialize the identity lock.");
        return;
      }
    }

    setCurrentStep((value) => Math.min(value + 1, stepLabels.length - 1));
  }

  function handlePreviousStep() {
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  async function handleSubmit(values: ApplicantInfo) {
    setIsSubmitting(true);
    setSubmitError(null);

    if (previewMode) {
      router.push("/dashboard/preview-france-tourism?preview=1");
      return;
    }

    try {
      const requestPayload = coverLetterDraft.trim().length > 0
        ? { applicant: values, coverLetterMarkdown: coverLetterDraft.trim() }
        : values;
      const response = await fetch("/api/application-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const responsePayload = (await response.json()) as {
        applicationId?: string;
        error?: string;
      };

      if (!response.ok || !responsePayload.applicationId) {
        throw new Error(responsePayload.error ?? "Application package generation failed.");
      }

      window.localStorage.removeItem(draftStorageKey);
      router.push(`/dashboard/${responsePayload.applicationId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSupportingDocumentsChange(nextDocuments: SupportingDocument[]) {
    form.setValue("supportingDocuments", nextDocuments, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  async function handlePassportUpload(file: File) {
    setIsParsingPassport(true);
    setPassportParseMessage(`Scanning ${file.name} in secure volatile memory. Extracting identity fields now.`);

    try {
      const formData = new FormData();
      formData.append("documentType", "passport");
      formData.append("file", file);

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        result?: PassportDocumentParseResult;
        error?: string;
      };

      if (!response.ok || !payload.result || payload.result.documentType !== "passport") {
        throw new Error(payload.error ?? "Passport parsing failed.");
      }

      const parsedName = splitParsedFullName(payload.result.full_name);

      form.setValue("personal.firstName", parsedName.firstName, { shouldDirty: true, shouldValidate: true });
      form.setValue("personal.lastName", parsedName.lastName, { shouldDirty: true, shouldValidate: true });
      form.setValue("personal.dateOfBirth", payload.result.date_of_birth, { shouldDirty: true, shouldValidate: true });
      form.setValue("personal.currentNationality", payload.result.nationality, { shouldDirty: true, shouldValidate: true });
      form.setValue("passport.number", payload.result.passport_number, { shouldDirty: true, shouldValidate: true });
      form.setValue("passport.dateOfExpiry", payload.result.expiry_date, { shouldDirty: true, shouldValidate: true });

      setPassportParseMessage("Passport parsed in secure volatile memory. Review and confirm the autofilled identity fields before continuing.");
    } catch (error) {
      setPassportParseMessage(error instanceof Error ? error.message : "Unable to parse passport.");
    } finally {
      setIsParsingPassport(false);

      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  async function handleBankStatementUpload(file: File) {
    setIsParsingBankStatement(true);
    setBankStatementParseMessage(`Reading ${file.name} in secure volatile memory. Calculating the closing balance now.`);

    try {
      const formData = new FormData();
      formData.append("documentType", "bank_statement");
      formData.append("file", file);

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        result?: { documentType: "bank_statement"; closing_balance: number; currency: string };
        error?: string;
      };

      if (!response.ok || !payload.result || payload.result.documentType !== "bank_statement") {
        throw new Error(payload.error ?? "Bank statement parsing failed.");
      }

      if (payload.result.currency.toUpperCase() === "EUR") {
        form.setValue("employment.savingsBalanceEur", payload.result.closing_balance, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setBankStatementParseMessage(`Closing balance EUR ${payload.result.closing_balance.toFixed(2)} extracted in secure volatile memory and applied to the live audit.`);
      } else {
        setBankStatementParseMessage(`Detected ${payload.result.currency.toUpperCase()} ${payload.result.closing_balance.toFixed(2)}. Convert it to EUR before continuing with the compliance audit.`);
      }
    } catch (error) {
      setBankStatementParseMessage(error instanceof Error ? error.message : "Unable to parse bank statement.");
    } finally {
      setIsParsingBankStatement(false);

      if (bankStatementInputRef.current) {
        bankStatementInputRef.current.value = "";
      }
    }
  }

  async function handleCheckout(tier: PricingTier) {
    if (previewMode) {
      router.push("/dashboard?preview=1");
      return;
    }

    setIsStartingCheckout(tier);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      });

      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? "Unable to create Stripe checkout session.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setIsStartingCheckout(null);
    }
  }

  async function handleGenerateCoverLetter(applicant: ApplicantInfo) {
    setIsGeneratingCoverLetter(true);
    setCoverLetterMessage(null);

    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicant, letterKind: "cover_letter" }),
      });

      const payload = (await response.json()) as {
        coverLetterMarkdown?: string;
        source?: "openai" | "fallback";
        error?: string;
      };

      if (!response.ok || !payload.coverLetterMarkdown) {
        throw new Error(payload.error ?? "Unable to generate cover letter preview.");
      }

      setCoverLetterDraft(payload.coverLetterMarkdown);
      setCoverLetterMessage(
        payload.source === "fallback"
          ? "Cover letter draft generated with the local fallback because the AI service is currently unavailable. You can edit it before package creation."
          : "Cover letter draft generated. You can edit it before package creation.",
      );
    } catch (error) {
      setCoverLetterMessage(error instanceof Error ? error.message : "Unable to generate cover letter preview.");
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }

  function handleCustomLetterChange(letterId: string, updates: Partial<CustomLetterDraft>) {
    setCustomLetters((currentLetters) =>
      currentLetters.map((letter) =>
        letter.id === letterId
          ? {
              ...letter,
              ...updates,
            }
          : letter,
      ),
    );
  }

  async function handleGenerateCustomLetter(letterId: string, applicant: ApplicantInfo) {
    const targetLetter = customLetters.find((letter) => letter.id === letterId);

    if (!targetLetter) {
      return;
    }

    if (!targetLetter.prompt.trim()) {
      handleCustomLetterChange(letterId, {
        message: "Describe what you want this additional letter to say before generating it.",
      });
      return;
    }

    setActiveCustomLetterId(letterId);
    handleCustomLetterChange(letterId, { message: null });

    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant,
          letterKind: "custom_letter",
          customTitle: targetLetter.title,
          customInstructions: targetLetter.prompt,
        }),
      });

      const payload = (await response.json()) as {
        coverLetterMarkdown?: string;
        source?: "openai" | "fallback";
        error?: string;
      };

      if (!response.ok || !payload.coverLetterMarkdown) {
        throw new Error(payload.error ?? "Unable to generate the requested letter.");
      }

      handleCustomLetterChange(letterId, {
        content: payload.coverLetterMarkdown,
        message:
          payload.source === "fallback"
            ? "This letter used the local fallback because the AI service was unavailable. Review before downloading."
            : "Additional letter generated. Review and download it below.",
      });
    } catch (error) {
      handleCustomLetterChange(letterId, {
        message: error instanceof Error ? error.message : "Unable to generate the requested letter.",
      });
    } finally {
      setActiveCustomLetterId(null);
    }
  }

  return (
    <FormProvider {...form}>
      <div className="w-full space-y-6">
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Step {currentStep + 1} of {stepLabels.length}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{stepLabels[currentStep]}</h2>
              <p className="mt-2 text-sm text-slate-300">{stepMicrocopy[currentStep]}</p>
            </div>
            <div className="text-sm text-slate-300">
              {draftState === "saving"
                ? "Saving draft..."
                : draftState === "saved"
                  ? "Draft saved on this device"
                  : "Draft will auto-save as you go"}
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${stepAccentMap[currentStep]}`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {stepLabels.map((label, index) => {
              const Icon = stepIcons[index];
              const isActive = index === currentStep;
              const isComplete = index < currentStep;

              return (
                <div
                  key={label}
                  className={`min-h-[88px] rounded-[1rem] border px-4 py-4 ${
                    isActive
                      ? "border-white/20 bg-white/10"
                      : isComplete
                        ? "border-emerald-400/20 bg-emerald-400/10"
                        : "border-white/10 bg-[#101010]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-white text-slate-950" : isComplete ? "bg-emerald-400/20 text-emerald-100" : "bg-white/5 text-slate-400"}`}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</p>
                      <p className="text-sm font-semibold text-white sm:text-[15px]">{label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-[1rem] border border-white/10 bg-[#101010] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {isSubmitting ? (
            <div className="mt-4">
              <ActivityBanner
                eyebrow="Package Generation"
                title="Building your application package"
                description="VisaPilot is assembling the filled form, supporting documents, and dashboard record for this applicant."
                tone="emerald"
              />
            </div>
          ) : null}
        </div>

        <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
          {speechSupported ? (
            <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Voice Autofill</p>
                  <h3 className="mt-1 text-base font-semibold text-white">Hands-free form filling</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Start a recording from any supported field, watch the live transcript update as you speak, then stop it manually when the phrasing looks right.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:max-w-[28rem] xl:justify-end">
                  <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                    microphonePermission === "granted"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : microphonePermission === "requesting"
                        ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-100"
                        : microphonePermission === "denied"
                          ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                  }`}>
                    {microphonePermission === "granted"
                      ? "Microphone ready"
                      : microphonePermission === "requesting"
                        ? "Requesting access"
                        : microphonePermission === "denied"
                          ? "Permission blocked"
                          : "Awaiting access"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void requestMicrophoneAccess()}
                    disabled={microphonePermission === "requesting" || (microphonePermission === "granted" && voiceCaptureState !== null)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {microphonePermission === "requesting" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    {microphonePermission === "granted"
                      ? voiceCaptureState
                        ? "Microphone Active"
                        : "Microphone Enabled"
                      : microphonePermission === "denied"
                        ? "Retry Microphone Access"
                        : "Enable Microphone Access"}
                  </button>
                  <button
                    type="button"
                    onClick={stopActiveVoiceCapture}
                    disabled={voiceCaptureState?.phase !== "listening"}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      voiceCaptureState?.phase === "listening"
                        ? "border-rose-300/35 bg-rose-400/12 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.24),0_0_24px_rgba(251,113,133,0.28)] hover:border-rose-200/50 hover:bg-rose-400/18"
                        : "border-white/10 bg-white/5 text-slate-400 opacity-70"
                    }`}
                  >
                    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full">
                      {voiceCaptureState?.phase === "listening" ? (
                        <span className="absolute inset-0 rounded-full bg-rose-300/25 animate-ping" />
                      ) : null}
                      <Square className="relative h-3 w-3 fill-current" />
                    </span>
                    {voiceCaptureState?.phase === "listening" ? "Stop recording" : "Stop control appears here"}
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-[1.1rem] border border-white/10 bg-black/30 p-4">
                <div className={`flex min-h-[76px] items-start gap-3 rounded-[1rem] border px-4 py-3 text-sm ${
                  voiceCaptureState?.phase === "listening"
                    ? "border-rose-400/20 bg-rose-400/10 text-rose-50"
                    : voiceCaptureState?.phase === "processing"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
                      : "border-white/10 bg-black/20 text-slate-300"
                }`}>
                  <span className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${getVoiceButtonClass(voiceCaptureState?.phase ?? null)}`}>
                    <VoiceButtonIcon voicePhase={voiceCaptureState?.phase ?? null} />
                  </span>
                  <div>
                    <p className="font-semibold text-white">Live voice console</p>
                    <p className="mt-1 leading-6">{displayedVoiceMessage}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Heard You Say</p>
                    <p className="mt-2 min-h-[72px] text-sm leading-6 text-white">
                      {voiceCaptureState?.heardText || "Your live transcript appears here while you speak"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Typing Into Field</p>
                    <p className="mt-2 min-h-[72px] text-sm leading-6 text-white">
                      {voiceCaptureState?.typedText || "VisaPilot shows the shaped text here before finalizing it"}
                    </p>
                  </div>
                </div>
              </div>

              {microphonePermission === "denied" && !isMicrophoneHelpDismissed ? (
                <div className="mt-4 rounded-[1rem] border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-white">How to enable microphone access</p>
                    <button
                      type="button"
                      onClick={() => setIsMicrophoneHelpDismissed(true)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-rose-100/80 transition hover:border-white/20 hover:text-white"
                      aria-label="Dismiss microphone help"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 leading-6">1. On Windows, open Settings &gt; Privacy &amp; security &gt; Microphone and make sure both device microphone access and app microphone access are enabled.</p>
                  <p className="leading-6">2. In your browser, click the lock or site-settings icon in the address bar and set Microphone to Allow for this site.</p>
                  <p className="leading-6">3. If you are on a Mac, open Apple menu &gt; System Settings &gt; Privacy &amp; Security &gt; Microphone and allow your browser.</p>
                  <p className="leading-6">4. If you are on iPhone or iPad, open Settings &gt; Privacy &amp; Security &gt; Microphone and allow the browser app you are using.</p>
                  <p className="leading-6">5. Choose the correct input device in your browser or system audio settings, refresh this page, then use Retry Microphone Access.</p>
                  <div className="mt-3 grid gap-2 text-xs text-rose-100/80 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="font-semibold uppercase tracking-[0.18em] text-white/90">Windows 11</p>
                      <p className="mt-1">Settings &gt; Privacy &amp; security &gt; Microphone</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="font-semibold uppercase tracking-[0.18em] text-white/90">Chrome</p>
                      <p className="mt-1 break-all">chrome://settings/content/microphone</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="font-semibold uppercase tracking-[0.18em] text-white/90">Edge</p>
                      <p className="mt-1 break-all">edge://settings/content/microphone</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="font-semibold uppercase tracking-[0.18em] text-white/90">Mac / iPhone</p>
                      <p className="mt-1">Privacy &amp; Security &gt; Microphone</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-rose-100/80">
                    Browser and device privacy rules block websites from directly opening all of these settings pages, so VisaPilot can guide you to the right place but cannot switch them on automatically.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 0 ? (
            <StepPanel
              eyebrow="Identity"
              title="Step 1: Passport & personal details"
              description="Upload a passport bio page for zero-retention OCR or enter the identity manually. Full name and passport number become the application identity anchor."
              icon={UserSquare2}
              tone="blue"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.1rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Option A</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Instant auto-fill</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200">Drop a passport image or PDF. It is parsed strictly in RAM with `gpt-4o-mini` vision and the raw file buffer is scrubbed immediately after extraction.</p>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void handlePassportUpload(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isParsingPassport}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isParsingPassport ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Scanning document...
                      </span>
                    ) : "Upload passport"}
                  </button>
                </div>

                <div className="rounded-[1.1rem] border border-white/10 bg-[#101010] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Option B</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Manual input</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Enter the passport identity exactly as printed: full name, date of birth, passport number, issue date, expiry date, and nationality.</p>
                  <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-300">
                    Once the name and passport number are confirmed, this flow treats the application as one locked identity for anti-fraud protection.
                  </div>
                </div>
              </div>

              {isParsingPassport ? (
                <ActivityBanner
                  eyebrow="Passport OCR"
                  title="Scanning travel document"
                  description="Reading the passport image in secure volatile memory and mapping key identity fields into the form."
                  tone="cyan"
                />
              ) : null}

              {passportParseMessage ? (
                <div className="rounded-[1rem] border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-200">
                  {passportParseMessage}
                </div>
              ) : null}

              {identityLockMessage ? (
                <div className="rounded-[1rem] border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-200">
                  {identityLockMessage}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="First name" name="personal.firstName" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "personal.firstName" ? voiceCaptureState.phase : null} />
                <TextInput label="Last name" name="personal.lastName" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "personal.lastName" ? voiceCaptureState.phase : null} />
                <TextInput label="Date of birth" name="personal.dateOfBirth" type="date" register={form.register} errors={form.formState.errors} />
                <TextInput label="Place of birth" name="personal.placeOfBirth" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "personal.placeOfBirth" ? voiceCaptureState.phase : null} />
                <TextInput label="Country of birth" name="personal.countryOfBirth" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "personal.countryOfBirth" ? voiceCaptureState.phase : null} />
                <TextInput label="Current nationality" name="personal.currentNationality" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "personal.currentNationality" ? voiceCaptureState.phase : null} />
                <TextInput label="Email address" name="contact.email" type="email" register={form.register} errors={form.formState.errors} />
                <TextInput label="Phone number" name="contact.phone" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "contact.phone" ? voiceCaptureState.phase : null} />
                <TextInput label="Address line 1" name="contact.addressLine1" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "contact.addressLine1" ? voiceCaptureState.phase : null} />
                <TextInput label="City" name="contact.city" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "contact.city" ? voiceCaptureState.phase : null} />
                <TextInput label="Postal code" name="contact.postalCode" register={form.register} errors={form.formState.errors} />
                <TextInput label="Country of residence" name="contact.country" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "contact.country" ? voiceCaptureState.phase : null} />
                <TextInput label="Passport number" name="passport.number" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "passport.number" ? voiceCaptureState.phase : null} />
                <TextInput label="Passport issue date" name="passport.dateOfIssue" type="date" register={form.register} errors={form.formState.errors} />
                <TextInput label="Passport expiry date" name="passport.dateOfExpiry" type="date" register={form.register} errors={form.formState.errors} />
                <TextInput label="Issuing authority" name="passport.issuedBy" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "passport.issuedBy" ? voiceCaptureState.phase : null} />
                <TextInput label="Issuing country" name="passport.issuingCountry" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "passport.issuingCountry" ? voiceCaptureState.phase : null} />
                <SelectInput
                  label="Gender"
                  name="personal.gender"
                  register={form.register}
                  errors={form.formState.errors}
                  options={[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ]}
                />
                <SelectInput
                  label="Marital status"
                  name="personal.maritalStatus"
                  register={form.register}
                  errors={form.formState.errors}
                  options={[
                    { label: "Single", value: "single" },
                    { label: "Married", value: "married" },
                    { label: "Separated", value: "separated" },
                    { label: "Divorced", value: "divorced" },
                    { label: "Widowed", value: "widowed" },
                    { label: "Other", value: "other" },
                  ]}
                />
              </div>
            </StepPanel>
          ) : null}

          {currentStep === 1 ? (
            <StepPanel
              eyebrow="Travel"
              title="Travel Details"
              description="Enter the route, purpose, and dates exactly as they should appear across bookings, forms, and the final packet."
              icon={Plane}
              tone="indigo"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Destination country" name="trip.destinationCountry" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.destinationCountry" ? voiceCaptureState.phase : null} />
                <TextInput label="First Schengen entry country" name="trip.firstEntryCountry" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.firstEntryCountry" ? voiceCaptureState.phase : null} />
                <TextInput label="Port of entry" name="trip.portOfEntry" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.portOfEntry" ? voiceCaptureState.phase : null} />
                <TextInput label="Transit countries" name="trip.transitCountries" register={form.register} errors={form.formState.errors} placeholder="Optional transit countries, comma separated" enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.transitCountries" ? voiceCaptureState.phase : null} />
                <SelectInput
                  label="Purpose of visit"
                  name="trip.purpose"
                  register={form.register}
                  errors={form.formState.errors}
                  options={[
                    { label: "Tourism", value: "tourism" },
                    { label: "Business", value: "business" },
                    { label: "Family visit", value: "family_visit" },
                    { label: "Medical", value: "medical" },
                    { label: "Study", value: "study" },
                    { label: "Cultural", value: "cultural" },
                    { label: "Sports", value: "sports" },
                    { label: "Official", value: "official" },
                    { label: "Transit", value: "transit" },
                    { label: "Airport transit", value: "airport_transit" },
                    { label: "Other", value: "other" },
                  ]}
                />
                <SelectInput
                  label="Entries requested"
                  name="trip.entriesRequested"
                  register={form.register}
                  errors={form.formState.errors}
                  options={[
                    { label: "Single", value: "single" },
                    { label: "Double", value: "double" },
                    { label: "Multiple", value: "multiple" },
                  ]}
                />
                <TextInput label="Entry date" name="trip.arrivalDate" type="date" register={form.register} errors={form.formState.errors} />
                <TextInput label="Exit date" name="trip.departureDate" type="date" register={form.register} errors={form.formState.errors} />
                <TextAreaInput label="Accommodation details" name="trip.accommodations" register={form.register} errors={form.formState.errors} placeholder="Hotel name, address, or host accommodation summary" enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.accommodations" ? voiceCaptureState.phase : null} />
                <div className="rounded-[1rem] border border-white/12 bg-[#101010] px-4 py-3 text-sm font-medium text-white">
                  Trip duration is calculated automatically from the entry and exit dates to drive the destination-specific funds audit.
                </div>
                <div className="rounded-[1rem] border border-white/12 bg-[#101010] px-4 py-3 text-sm font-medium text-white">
                  VisaPilot automatically aligns the destination list and calculates stay duration from your travel dates.
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.1rem] border border-white/10 bg-[#101010] p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Duration</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stayDuration} days</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">This duration feeds the destination-specific daily funds requirement used in the live audit engine.</p>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-[#101010] p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Consular rule verification</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{consularRuleMessage}</p>
                  {transitCountries?.trim() ? (
                    <p className="mt-3 text-sm leading-6 text-slate-400">Transit countries noted: {transitCountries}</p>
                  ) : null}
                </div>
              </div>
            </StepPanel>
          ) : null}

          {currentStep === 2 ? (
            <StepPanel
              eyebrow="Financials"
              title="Finances and employment"
              description="Add only the financial and employment details needed to prove sufficient funds and strong return ties."
              icon={Wallet}
              tone="amber"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.1rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">Optional bank statement OCR</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Auto-extract closing balance</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200">Drop a bank statement to extract closing balance and currency in ephemeral RAM, then discard the raw document immediately.</p>
                  <input
                    ref={bankStatementInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void handleBankStatementUpload(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => bankStatementInputRef.current?.click()}
                    disabled={isParsingBankStatement}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isParsingBankStatement ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Reading statement...
                      </span>
                    ) : "Upload bank statement"}
                  </button>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-[#101010] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live compliance audit</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        liveAudit.status === "GREEN"
                          ? "border-emerald-400/25 bg-emerald-400/12 text-emerald-100"
                          : liveAudit.status === "YELLOW"
                            ? "border-amber-400/25 bg-amber-400/12 text-amber-100"
                            : "border-rose-400/25 bg-rose-400/12 text-rose-100"
                      }`}
                    >
                      {liveAudit.status}
                    </span>
                    <p className="text-sm text-slate-300">Required today: EUR {liveAudit.requiredLiquidBalanceEur.toFixed(2)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {destinationCountry}: EUR {liveAudit.appliedDailyFundsRuleEur.toFixed(0)} per day.
                    {destinationCountry === "Spain" ? " Spain also enforces a EUR 1,020 minimum balance." : ""}
                    {destinationCountry === "France" ? " France uses the higher no-hotel threshold until accommodation proof is in place." : ""}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Available EUR {liveAudit.availableLiquidBalanceEur.toFixed(2)}. Safer target with buffer: EUR {liveAudit.recommendedLiquidBalanceEur.toFixed(2)}.
                  </p>
                </div>
              </div>

              {isParsingBankStatement ? (
                <ActivityBanner
                  eyebrow="Financial OCR"
                  title="Analyzing bank statement"
                  description="Extracting the closing balance and currency in secure volatile memory to update the live compliance audit."
                  tone="amber"
                />
              ) : null}

              {bankStatementParseMessage ? (
                <div className="rounded-[1rem] border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-200">
                  {bankStatementParseMessage}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <SelectInput
                  label="Employment status"
                  name="employment.employmentStatus"
                  register={form.register}
                  errors={form.formState.errors}
                  options={[
                    { label: "Employed", value: "employed" },
                    { label: "Self-employed", value: "self_employed" },
                    { label: "Student", value: "student" },
                    { label: "Retired", value: "retired" },
                    { label: "Unemployed", value: "unemployed" },
                    { label: "Contractor", value: "contractor" },
                    { label: "Other", value: "other" },
                  ]}
                />
                <TextInput label="Occupation" name="employment.occupation" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "employment.occupation" ? voiceCaptureState.phase : null} />
                <TextInput label="Employer name" name="employment.employerName" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "employment.employerName" ? voiceCaptureState.phase : null} />
                <TextInput label="Employer address" name="employment.employerAddress" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "employment.employerAddress" ? voiceCaptureState.phase : null} />
                <TextInput label="Monthly income (EUR)" name="employment.monthlyIncomeEur" type="number" step="0.01" register={form.register} errors={form.formState.errors} />
                <TextInput label="Savings balance (EUR)" name="employment.savingsBalanceEur" type="number" step="0.01" register={form.register} errors={form.formState.errors} />
                <TextInput label="Employer phone" name="employment.employerPhone" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "employment.employerPhone" ? voiceCaptureState.phase : null} />
                <SelectInput
                  label="Primary trip sponsor"
                  name="sponsor.type"
                  register={form.register}
                  errors={form.formState.errors}
                  options={[
                    { label: "Self-funded", value: "self" },
                    { label: "Host-funded", value: "host" },
                    { label: "Inviting company", value: "inviting_company" },
                    { label: "Other", value: "other" },
                  ]}
                />
              </div>

              <div className="rounded-[1.1rem] border border-white/10 bg-[#101010] p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Why this status is {liveAudit.status}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  {liveAudit.fixInstructions.map((instruction) => (
                    <li key={instruction}>• {instruction}</li>
                  ))}
                </ul>
              </div>
            </StepPanel>
          ) : null}

          {currentStep === 3 ? (
            <StepPanel
              eyebrow="Accommodations"
              title="Accommodations & home ties"
              description="Finish the remaining form inputs here, then move into the document studio for file preparation and final package generation."
              icon={Home}
              tone="emerald"
            >
              <div className="rounded-[1.3rem] border border-white/10 bg-[#101010] p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
                      <Home className="h-3.5 w-3.5" />
                      Accommodations & Home Ties
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      Capture the hotel reference, filing location, accommodation details, and return anchors that strengthen the final application narrative.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <TextInput label="Hotel booking reference" name="trip.hotelBookingReference" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.hotelBookingReference" ? voiceCaptureState.phase : null} />
                  <TextInput label="Place of visa application" name="application.placeOfApplication" register={form.register} errors={form.formState.errors} enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "application.placeOfApplication" ? voiceCaptureState.phase : null} />
                  <TextAreaInput label="Accommodation details" name="trip.accommodations" register={form.register} errors={form.formState.errors} rows={4} placeholder="Hotel, host address, or full stay details" enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "trip.accommodations" ? voiceCaptureState.phase : null} />
                  <SelectInput
                    label="Property ownership selector"
                    name="homeTies.propertyOwnership"
                    register={form.register}
                    errors={form.formState.errors}
                    options={[
                      { label: "Owned", value: "owned" },
                      { label: "Family-owned", value: "family_owned" },
                      { label: "Rented", value: "rented" },
                      { label: "No property", value: "none" },
                    ]}
                  />
                  <TextAreaInput label="Dependents & family notes" name="homeTies.dependentInformation" register={form.register} errors={form.formState.errors} placeholder="Dependents, caregiving duties, or similar obligations" enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "homeTies.dependentInformation" ? voiceCaptureState.phase : null} />
                  <TextAreaInput label="Return-intent evidence notes" name="homeTies.returnIntentEvidence" register={form.register} errors={form.formState.errors} rows={5} placeholder="Employment continuity, family obligations, property, education, or other ties to return home" enableVoice={speechSupported} onVoiceCapture={handleVoiceCapture} voicePhase={voiceCaptureState?.field === "homeTies.returnIntentEvidence" ? voiceCaptureState.phase : null} />
                </div>

                <div className="mt-4 rounded-[1rem] border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {liveAudit.passportValiditySatisfied ? "Passes 3-Month Expiry Rule" : "Passport validity needs review"}
                  </div>
                  <p className="mt-2 leading-6">
                    Passport valid through {liveAudit.passportValidThrough}. Schengen processing expects at least 3 months of validity beyond the return date.
                  </p>
                </div>
              </div>
            </StepPanel>
          ) : null}

          {currentStep === 4 ? (
            <StepPanel
              eyebrow="Document Studio"
              title="Document Studio"
              description="Prepare supporting files, refine the cover letter, and create the final application package in one focused workspace."
              icon={FileStack}
              tone="indigo"
            >
              <Step5Workspace
                applicant={watchedValues as ApplicantInfo}
                coverLetterDraft={coverLetterDraft}
                onCoverLetterChange={setCoverLetterDraft}
                customLetters={customLetters}
                onCustomLetterChange={handleCustomLetterChange}
                previewMode={previewMode}
                supportingDocuments={supportingDocuments}
                onSupportingDocumentsChange={handleSupportingDocumentsChange}
                availableCredits={availableCredits}
                activeTab={documentStudioTab}
                onActiveTabChange={setDocumentStudioTab}
                onCheckout={(tier) => void handleCheckout(tier)}
                isStartingCheckout={isStartingCheckout}
                isSubmitting={isSubmitting}
                isGeneratingCoverLetter={isGeneratingCoverLetter}
                activeCustomLetterId={activeCustomLetterId}
                coverLetterMessage={coverLetterMessage}
                onGenerateCoverLetter={(applicant) => void handleGenerateCoverLetter(applicant)}
                onGenerateCustomLetter={(letterId, applicant) => void handleGenerateCustomLetter(letterId, applicant)}
                speechSupported={speechSupported}
                microphonePermission={microphonePermission}
                onRequestMicrophoneAccess={requestMicrophoneAccess}
              />
            </StepPanel>
          ) : null}

          {submitError ? (
            <div className="rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handlePreviousStep}
              disabled={currentStep === 0 || isSubmitting}
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#101010] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            {currentStep < stepLabels.length - 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {currentStep === 3 ? "Continue to Document Studio" : "Save and continue"}
              </button>
            ) : (
              <div />
            )}
          </div>
        </form>
      </div>
    </FormProvider>
  );
}