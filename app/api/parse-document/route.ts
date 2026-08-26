import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import type { ParsedDocumentResult, ParsedDocumentType } from "@/types";

const jsonPayloadSchema = z.object({
  documentType: z.enum(["passport", "bank_statement"]),
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  base64: z.string().trim().min(1),
});

function triggerGarbageCollection(): void {
  if (typeof global.gc === "function") {
    global.gc();
  }
}

function scrubBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

function stripDataUrlPrefix(base64Value: string): string {
  const match = base64Value.match(/^data:.*;base64,(.+)$/);
  return match ? match[1] : base64Value;
}

async function readRequestFile(request: Request): Promise<{
  documentType: ParsedDocumentType;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");

    if (!(file instanceof File)) {
      throw new Error("A document file is required.");
    }

    if (documentType !== "passport" && documentType !== "bank_statement") {
      throw new Error("documentType must be passport or bank_statement.");
    }

    const arrayBuffer = await file.arrayBuffer();
    return {
      documentType,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
    };
  }

  const parsedJson = jsonPayloadSchema.parse(await request.json());

  return {
    documentType: parsedJson.documentType,
    fileName: parsedJson.fileName,
    mimeType: parsedJson.mimeType,
    buffer: Buffer.from(stripDataUrlPrefix(parsedJson.base64), "base64"),
  };
}

function buildVisionContent(fileName: string, mimeType: string, buffer: Buffer) {
  const base64Content = buffer.toString("base64");

  if (mimeType.startsWith("image/")) {
    return {
      type: "input_image",
      image_url: `data:${mimeType};base64,${base64Content}`,
      detail: "high",
    } as const;
  }

  return {
    type: "input_file",
    filename: fileName,
    file_data: `data:${mimeType};base64,${base64Content}`,
  } as const;
}

function buildPrompt(documentType: ParsedDocumentType): string {
  if (documentType === "passport") {
    return "Extract passport data and return strict JSON with keys: documentType, full_name, passport_number, date_of_birth, nationality, expiry_date. Use ISO date format when visible. Set documentType to passport.";
  }

  return "Extract bank statement summary and return strict JSON with keys: documentType, closing_balance, currency. Use numeric closing_balance without symbols. Set documentType to bank_statement.";
}

function parseStructuredResult(content: string, documentType: ParsedDocumentType): ParsedDocumentResult {
  const parsed = JSON.parse(content) as ParsedDocumentResult;

  if (parsed.documentType !== documentType) {
    throw new Error("Parsed document type did not match the requested document type.");
  }

  return parsed;
}

export async function POST(request: Request) {
  let documentBuffer: Buffer | null = null;

  try {
    const { documentType, fileName, mimeType, buffer } = await readRequestFile(request);
    documentBuffer = buffer;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPrompt(documentType),
            },
            buildVisionContent(fileName, mimeType, buffer),
          ],
        },
      ],
    });

    const parsedResult = parseStructuredResult(response.output_text.trim(), documentType);

    scrubBuffer(buffer);
    documentBuffer = null;
    triggerGarbageCollection();

    return NextResponse.json({ result: parsedResult });
  } catch (error) {
    if (documentBuffer) {
      scrubBuffer(documentBuffer);
      documentBuffer = null;
    }

    triggerGarbageCollection();

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to parse document.",
      },
      { status: 400 },
    );
  }
}