import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { schengenCountryRules } from "@/config/schengen-rules";
import { openai } from "@/lib/openai";
import { applyRateLimitHeaders, enforcePersistentRateLimit } from "@/lib/security/rateLimit";
import type { ParsedVoiceContextResult } from "@/types";

const jsonRequestSchema = z.object({
  transcript: z.string().trim().min(1, "A transcript or typed note is required."),
});

const parsedVoiceContextSchema = z.object({
  destinationCountry: z.string().trim().default(""),
  firstEntryCountry: z.string().trim().default(""),
  tripPurpose: z.enum(["tourism", "business", "family_visit", "conference"]),
  employmentStatus: z.enum(["employed", "self_employed", "student", "retired"]),
  fundingSource: z.enum(["self_funded", "family_sponsored", "company_sponsored"]),
  arrivalDate: z.string().trim().optional().default(""),
  departureDate: z.string().trim().optional().default(""),
  accommodationSummary: z.string().trim().optional().default(""),
  hostContext: z.string().trim().optional().default(""),
  returnTieSignal: z.string().trim().optional().default(""),
  specialCircumstances: z.string().trim().default(""),
});

function triggerGarbageCollection(): void {
  if (typeof global.gc === "function") {
    global.gc();
  }
}

function scrubBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

function normalizeIsoDate(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function sanitizeTranscript(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const cityToCountryMap: Record<string, string> = {
  paris: "France",
  lyon: "France",
  marseille: "France",
  nice: "France",
  madrid: "Spain",
  barcelona: "Spain",
  valencia: "Spain",
  seville: "Spain",
  berlin: "Germany",
  munich: "Germany",
  frankfurt: "Germany",
  hamburg: "Germany",
  rome: "Italy",
  milan: "Italy",
  venice: "Italy",
};

const fallbackCountryNames = Array.from(new Set([
  ...Object.values(schengenCountryRules).map((rule) => rule.displayName),
  "Austria",
  "Belgium",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "Greece",
  "Hungary",
  "Iceland",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Slovakia",
  "Slovenia",
  "Sweden",
  "Switzerland",
]));

function splitTranscriptSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function detectCountryMentions(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase();
  const matches = new Map<string, number>();

  for (const country of fallbackCountryNames) {
    const index = lowerTranscript.indexOf(country.toLowerCase());

    if (index >= 0) {
      matches.set(country, index);
    }
  }

  for (const [city, country] of Object.entries(cityToCountryMap)) {
    const index = lowerTranscript.indexOf(city);

    if (index >= 0 && !matches.has(country)) {
      matches.set(country, index);
    }
  }

  return Array.from(matches.entries())
    .sort((left, right) => left[1] - right[1])
    .map(([country]) => country);
}

function detectTripPurpose(transcript: string): ParsedVoiceContextResult["tripPurpose"] {
  const lowerTranscript = transcript.toLowerCase();

  if (/(conference|summit|expo|trade show)/.test(lowerTranscript)) {
    return "conference";
  }

  if (/(business|meeting|client|office|work trip|official visit)/.test(lowerTranscript)) {
    return "business";
  }

  if (/(brother|sister|mother|father|family|relative|cousin|host)/.test(lowerTranscript)) {
    return "family_visit";
  }

  return "tourism";
}

function detectEmploymentStatus(transcript: string): ParsedVoiceContextResult["employmentStatus"] {
  const lowerTranscript = transcript.toLowerCase();

  if (/(freelanc|self-employed|self employed|consultant|contractor)/.test(lowerTranscript)) {
    return "self_employed";
  }

  if (/(student|university|college|school)/.test(lowerTranscript)) {
    return "student";
  }

  if (/(retired|pension)/.test(lowerTranscript)) {
    return "retired";
  }

  return "employed";
}

function detectFundingSource(transcript: string): ParsedVoiceContextResult["fundingSource"] {
  const lowerTranscript = transcript.toLowerCase();

  if (/(company|employer|office|business is paying|work is paying)/.test(lowerTranscript)) {
    return "company_sponsored";
  }

  if (/(sponsor|sponsored|brother is paying|parents are paying|family is paying|host is paying)/.test(lowerTranscript)) {
    return "family_sponsored";
  }

  return "self_funded";
}

function parseNaturalDate(value: string): string {
  const normalized = value.trim().replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function detectTravelDates(transcript: string): { arrivalDate: string; departureDate: string } {
  const rangeMatch = transcript.match(/from\s+([\w\d\s,/-]+?)\s+(?:to|until|till|through)\s+([\w\d\s,/-]+?)(?:[.!,]|$)/i);

  if (!rangeMatch) {
    return { arrivalDate: "", departureDate: "" };
  }

  return {
    arrivalDate: parseNaturalDate(rangeMatch[1]),
    departureDate: parseNaturalDate(rangeMatch[2]),
  };
}

function pickSentence(transcript: string, matcher: RegExp): string {
  return splitTranscriptSentences(transcript).find((sentence) => matcher.test(sentence.toLowerCase())) ?? "";
}

function buildReturnTieSignal(transcript: string, employmentStatus: ParsedVoiceContextResult["employmentStatus"]): string {
  const explicitSignal = pickSentence(transcript, /(return|back at work|resume work|client|job|office|school|university|family responsibilities|dependent)/);

  if (explicitSignal) {
    return explicitSignal;
  }

  if (employmentStatus === "student") {
    return "The applicant referenced continuing academic obligations after travel.";
  }

  if (employmentStatus === "retired") {
    return "The applicant described the travel as temporary and did not indicate relocation intent.";
  }

  return "The applicant described the trip as temporary and maintains ongoing home-country obligations after travel.";
}

function buildHeuristicVoiceContext(transcript: string): ParsedVoiceContextResult {
  const normalizedTranscript = sanitizeTranscript(transcript);
  const mentionedCountries = detectCountryMentions(normalizedTranscript);
  const destinationCountry = mentionedCountries[0] ?? "";
  const { arrivalDate, departureDate } = detectTravelDates(normalizedTranscript);
  const employmentStatus = detectEmploymentStatus(normalizedTranscript);
  const fundingSource = detectFundingSource(normalizedTranscript);
  const accommodationSummary = pickSentence(normalizedTranscript, /(hotel|airbnb|accommodation|stay|staying|booking)/);
  const hostContext = pickSentence(normalizedTranscript, /(brother|sister|mother|father|family|host|invitation|invite|munich|paris)/);
  const specialCircumstances = [
    pickSentence(normalizedTranscript, /(conference|business|meeting|client|office)/),
    pickSentence(normalizedTranscript, /(brother|sister|family|host|invitation|sponsor)/),
    pickSentence(normalizedTranscript, /(company is paying|paying for flights|self-fund|hotel)/),
  ]
    .filter(Boolean)
    .filter((value, index, items) => items.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
    .join(" ");

  return {
    transcript: normalizedTranscript,
    destinationCountry,
    firstEntryCountry: destinationCountry,
    tripPurpose: detectTripPurpose(normalizedTranscript),
    employmentStatus,
    fundingSource,
    arrivalDate,
    departureDate,
    accommodationSummary,
    hostContext,
    returnTieSignal: buildReturnTieSignal(normalizedTranscript, employmentStatus),
    specialCircumstances,
  };
}

async function transcribeAudio(file: File): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  return sanitizeTranscript(transcription.text ?? "");
}

async function extractTranscript(request: Request): Promise<{ transcript: string; buffers: Buffer[] }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const transcriptValue = formData.get("transcript");
    const transcript = typeof transcriptValue === "string" ? sanitizeTranscript(transcriptValue) : "";

    if (transcript) {
      return { transcript, buffers: [] };
    }

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      throw new Error("Provide either a transcript or an audio blob.");
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const transientFile = new File([audioBuffer], audio.name || "voice-intake.webm", {
      type: audio.type || "audio/webm",
    });
    const transcribedText = await transcribeAudio(transientFile);

    return {
      transcript: transcribedText,
      buffers: [audioBuffer],
    };
  }

  const parsed = jsonRequestSchema.parse(await request.json());
  return {
    transcript: sanitizeTranscript(parsed.transcript),
    buffers: [],
  };
}

async function parseVoiceContext(transcript: string): Promise<ParsedVoiceContextResult> {
  const messages = [
    {
      role: "system" as const,
      content:
        "You are an expert Schengen visa intake specialist. Extract structured travel parameters from the user's spoken context, ignoring stutters, speech mistakes, self-corrections, filler words, and broken grammar. Normalize values into concise structured JSON. Use ISO dates when dates are clearly stated. If a field is unclear, return an empty string for text fields. Return only valid JSON.",
    },
    {
      role: "user" as const,
      content:
        `Extract and normalize these fields from the travel intake:\n- destinationCountry: string\n- firstEntryCountry: string\n- tripPurpose: 'tourism' | 'business' | 'family_visit' | 'conference'\n- employmentStatus: 'employed' | 'self_employed' | 'student' | 'retired'\n- fundingSource: 'self_funded' | 'family_sponsored' | 'company_sponsored'\n- arrivalDate: ISO string or empty\n- departureDate: ISO string or empty\n- accommodationSummary: string\n- hostContext: string\n- returnTieSignal: string\n- specialCircumstances: string\nInput transcript:\n${transcript}`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    });
    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("AI did not return parsed voice context.");
    }

    const parsed = parsedVoiceContextSchema.parse(JSON.parse(content));

    return {
      transcript,
      destinationCountry: parsed.destinationCountry,
      firstEntryCountry: parsed.firstEntryCountry || parsed.destinationCountry,
      tripPurpose: parsed.tripPurpose,
      employmentStatus: parsed.employmentStatus,
      fundingSource: parsed.fundingSource,
      arrivalDate: normalizeIsoDate(parsed.arrivalDate),
      departureDate: normalizeIsoDate(parsed.departureDate),
      accommodationSummary: parsed.accommodationSummary,
      hostContext: parsed.hostContext,
      returnTieSignal: parsed.returnTieSignal,
      specialCircumstances: parsed.specialCircumstances,
    };
  } catch {
    return buildHeuristicVoiceContext(transcript);
  }
}

export async function POST(request: Request) {
  let buffersToScrub: Buffer[] = [];

  try {
    const rateLimit = await enforcePersistentRateLimit(request, {
      scope: "api:parse-voice-context",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded. Retry later.",
        },
        { status: 429 },
      );

      applyRateLimitHeaders(response, rateLimit, 10);
      return response;
    }

    const { transcript, buffers } = await extractTranscript(request);
    buffersToScrub = buffers;

    if (!transcript) {
      throw new Error("No transcript was available to parse.");
    }

    const result = await parseVoiceContext(transcript);

    buffersToScrub.forEach(scrubBuffer);
    buffersToScrub = [];
    triggerGarbageCollection();

    const response = NextResponse.json({ result });
    applyRateLimitHeaders(response, rateLimit, 10);
    return response;
  } catch (error) {
    buffersToScrub.forEach(scrubBuffer);
    triggerGarbageCollection();

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to parse voice context.",
      },
      { status: 400 },
    );
  }
}