"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Mic, Sparkles, Square } from "lucide-react";
import type { ParsedVoiceContextResult } from "@/types";

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

type VoiceIntakePhase = "idle" | "listening" | "processing" | "success";

type VoiceIntakeSession = {
  transcript: string;
  stopRequested: boolean;
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

function sanitizeTranscript(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatPurposeLabel(purpose: ParsedVoiceContextResult["tripPurpose"]): string {
  switch (purpose) {
    case "family_visit":
      return "Family Visit";
    case "conference":
      return "Conference";
    default:
      return purpose.charAt(0).toUpperCase() + purpose.slice(1);
  }
}

function formatFundingLabel(fundingSource: ParsedVoiceContextResult["fundingSource"]): string {
  switch (fundingSource) {
    case "family_sponsored":
      return "Sponsor";
    case "company_sponsored":
      return "Company";
    default:
      return "Self-Funded";
  }
}

function formatEmploymentLabel(status: ParsedVoiceContextResult["employmentStatus"]): string {
  switch (status) {
    case "self_employed":
      return "Freelance";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  }
}

export function VoiceIntakeCard({
  onApply,
}: {
  onApply: (result: ParsedVoiceContextResult) => void;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const sessionRef = useRef<VoiceIntakeSession | null>(null);
  const [phase, setPhase] = useState<VoiceIntakePhase>("idle");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const [heardText, setHeardText] = useState("");
  const [fallbackNote, setFallbackNote] = useState("");
  const [message, setMessage] = useState("Speak naturally in any language or phrasing. Mention dates, destination, who is paying, hosts, and anything unusual about the trip.");
  const [parsedResult, setParsedResult] = useState<ParsedVoiceContextResult | null>(null);

  useEffect(() => {
    const supported = Boolean(getSpeechRecognitionConstructor());
    setSpeechSupported(supported);
    setMicrophonePermission(supported ? "idle" : "unsupported");

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  async function requestMicrophoneAccess() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission("unsupported");
      setMessage("This browser cannot access the microphone. Type a quick trip note below instead.");
      return false;
    }

    setMicrophonePermission("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");
      return true;
    } catch {
      setMicrophonePermission("denied");
      setMessage("Microphone access was blocked. You can still type a quick note and let VisaPilot parse it.");
      return false;
    }
  }

  async function parseTranscript(transcript: string) {
    const cleanedTranscript = sanitizeTranscript(transcript);

    if (!cleanedTranscript) {
      setMessage("Say a bit more about the trip or type a short note before parsing.");
      setPhase("idle");
      return;
    }

    setPhase("processing");
    setMessage("AI Analyzing Your Travel Scenario...");

    try {
      const response = await fetch("/api/parse-voice-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: cleanedTranscript }),
      });

      const payload = (await response.json()) as {
        result?: ParsedVoiceContextResult;
        error?: string;
      };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Unable to parse the voice intake.");
      }

      setParsedResult(payload.result);
      setHeardText(payload.result.transcript);
      setPhase("success");
      setMessage("Structured trip context extracted. Review the summary and apply it to the wizard.");
      onApply(payload.result);
    } catch (error) {
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "Unable to parse the voice intake.");
    }
  }

  function stopRecording() {
    if (!recognitionRef.current || phase !== "listening") {
      return;
    }

    if (sessionRef.current) {
      sessionRef.current.stopRequested = true;
    }

    recognitionRef.current.stop();
    void parseTranscript(sessionRef.current?.transcript ?? heardText);
  }

  async function startRecording() {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setMicrophonePermission("unsupported");
      setMessage("This browser does not support speech recognition. Type a quick trip note below instead.");
      return;
    }

    if (microphonePermission !== "granted") {
      const granted = await requestMicrophoneAccess();

      if (!granted) {
        return;
      }
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    sessionRef.current = { transcript: "", stopRequested: false };
    setHeardText("");
    setPhase("listening");
    setMessage("Recording live. Speak naturally, then use Stop & Parse when the scenario sounds complete.");

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const session = sessionRef.current;

      if (!session || session.stopRequested) {
        return;
      }

      const heardSegments: string[] = [];

      for (let index = 0; index < (event.results.length ?? 0); index += 1) {
        const result = event.results[index];
        const transcript = sanitizeTranscript(result?.[0]?.transcript ?? "");

        if (transcript) {
          heardSegments.push(transcript);
        }
      }

      const nextTranscript = heardSegments.join(" ").trim();
      session.transcript = nextTranscript;
      setHeardText(nextTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      setPhase("idle");
      if (event.error === "not-allowed") {
        setMicrophonePermission("denied");
      }
      setMessage(
        event.error === "not-allowed"
          ? "Microphone access was denied. Type a quick trip note below instead."
          : `Voice intake could not be captured (${event.error ?? "unknown_error"}).`,
      );
      sessionRef.current = null;
    };

    recognition.onend = () => {
      if (phase === "listening" && !(sessionRef.current?.stopRequested)) {
        setPhase("idle");
      }
    };

    recognition.start();
  }

  const showFallback = !speechSupported || microphonePermission === "denied" || microphonePermission === "unsupported";

  return (
    <div className="rounded-xl border border-indigo-400/20 bg-gradient-to-r from-indigo-950/45 to-sky-950/35 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200">Voice-First Smart Intake</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Tell VisaPilot about your trip before you type</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Speak naturally in any language or phrasing. Mention your destination, trip dates, who is paying, conference or family plans, and any host or return-tie details.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Zero-retention intake: audio and transcripts are processed in memory only and are not stored permanently.</p>
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={phase === "processing"}
            className="inline-flex items-center gap-3 rounded-full border border-indigo-300/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-indigo-200/45 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-indigo-200/35 bg-indigo-400/20 text-white shadow-[0_0_28px_rgba(99,102,241,0.35)]">
              {phase === "listening" ? <span className="absolute inset-0 rounded-full bg-rose-400/25 animate-pulse" /> : null}
              {phase === "processing" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
            </span>
            <span>TAP TO SPEAK - TELL US ABOUT YOUR TRIP</span>
          </button>

          <p className="max-w-md text-sm leading-6 text-slate-300 xl:text-right">
            Faster than typing. Mention your trip dates, who is paying, or any special circumstances and VisaPilot will pre-fill the next steps.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.1rem] border border-white/10 bg-black/25 p-4">
        <div className={`flex min-h-[82px] items-start gap-3 rounded-[1rem] border px-4 py-3 text-sm ${
          phase === "listening"
            ? "border-rose-400/20 bg-rose-400/10 text-rose-50"
            : phase === "processing"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
              : phase === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
                : "border-white/10 bg-black/20 text-slate-300"
        }`}>
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
            {phase === "listening" ? (
              <>
                <span className="absolute inset-0 rounded-full bg-rose-300/25 animate-ping" />
                <Square className="relative h-4 w-4 fill-current" />
              </>
            ) : phase === "processing" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : phase === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
            ) : (
              <Sparkles className="h-4 w-4 text-indigo-200" />
            )}
          </span>
          <div className="flex-1">
            <p className="font-semibold text-white">
              {phase === "processing" ? "AI Analyzing Your Travel Scenario..." : phase === "success" ? "Smart intake complete" : "Consultation console"}
            </p>
            <p className="mt-1 leading-6">{message}</p>
            {phase === "listening" ? (
              <div className="mt-3 flex items-end gap-1">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    className="w-1 rounded-full bg-rose-300/80 animate-pulse"
                    style={{ height: `${14 + (index % 4) * 7}px`, animationDelay: `${index * 90}ms` }}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={stopRecording}
            disabled={phase !== "listening"}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              phase === "listening"
                ? "border-rose-300/35 bg-rose-400/12 text-rose-50 hover:border-rose-200/50 hover:bg-rose-400/18"
                : "border-white/10 bg-white/5 text-slate-400 opacity-70"
            }`}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop & Parse
          </button>
        </div>

        <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Heard You Say</p>
          <p className="mt-2 min-h-[72px] text-sm leading-6 text-white">
            {heardText || "Your live trip summary will appear here while you speak."}
          </p>
        </div>
      </div>

      {showFallback ? (
        <div className="mt-5 rounded-[1.1rem] border border-white/10 bg-black/25 p-4">
          <p className="text-sm font-semibold text-white">Or type a quick note about your trip</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Example: I am going to Paris for a conference from 12 to 18 October, my company is paying for flights, and I am staying in a hotel.
          </p>
          <textarea
            value={fallbackNote}
            onChange={(event) => setFallbackNote(event.target.value)}
            rows={4}
            placeholder="Type your trip context here..."
            className="mt-3 w-full rounded-[1rem] border border-white/12 bg-black/40 px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-white/30"
          />
          <button
            type="button"
            onClick={() => void parseTranscript(fallbackNote)}
            disabled={phase === "processing"}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "processing" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Parse Note
          </button>
        </div>
      ) : null}

      {parsedResult ? (
        <div className="mt-5 rounded-[1.1rem] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
          <div className="flex items-center gap-2 font-semibold text-white">
            <CheckCircle2 className="h-4 w-4" />
            Extracted trip profile
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-300/20 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Destination: {parsedResult.destinationCountry}</span>
            <span className="rounded-full border border-emerald-300/20 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Purpose: {formatPurposeLabel(parsedResult.tripPurpose)}</span>
            <span className="rounded-full border border-emerald-300/20 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Funding: {formatFundingLabel(parsedResult.fundingSource)}</span>
            <span className="rounded-full border border-emerald-300/20 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Employment: {formatEmploymentLabel(parsedResult.employmentStatus)}</span>
          </div>
          {parsedResult.specialCircumstances ? (
            <p className="mt-3 leading-6 text-emerald-50/90">{parsedResult.specialCircumstances}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}