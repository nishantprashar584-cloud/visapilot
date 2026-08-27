import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const requestPayloadSchema = z.object({
  mode: z.enum(["word-to-pdf", "pdf-to-word"]),
});

function sanitizeBaseName(fileName: string): string {
  const cleaned = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || `document-${randomUUID()}`;
}

function hasAllowedExtension(fileName: string, extensions: string[]): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return extensions.includes(extension);
}

function validateInputFile(file: File, mode: "word-to-pdf" | "pdf-to-word"): void {
  if (mode === "word-to-pdf") {
    const validWordMimeTypes = new Set([
      "application/msword",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/rtf",
    ]);

    if (!validWordMimeTypes.has(file.type) && !hasAllowedExtension(file.name, [".doc", ".docx", ".odt", ".rtf"])) {
      throw new Error("Upload a DOC, DOCX, ODT, or RTF file for Word to PDF conversion.");
    }

    return;
  }

  if (file.type !== "application/pdf" && !hasAllowedExtension(file.name, [".pdf"])) {
    throw new Error("Upload a PDF file for PDF to Word conversion.");
  }
}

async function resolveLibreOfficeBinary(): Promise<string> {
  const directCandidates = [
    process.env.LIBREOFFICE_PATH,
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of directCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  const whereCommands: Array<[string, string[]]> = process.platform === "win32"
    ? [["where.exe", ["soffice.exe"]], ["where.exe", ["soffice"]]]
    : [["which", ["soffice"]], ["which", ["libreoffice"]]];

  for (const [command, args] of whereCommands) {
    try {
      const { stdout } = await execFileAsync(command, args);
      const resolved = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

      if (resolved) {
        return resolved;
      }
    } catch {
      continue;
    }
  }

  throw new Error("LibreOffice is not available on the server. Install it or set LIBREOFFICE_PATH before using Word to PDF conversion.");
}

async function resolvePythonRuntime(): Promise<{ command: string; args: string[] }> {
  const candidates = process.platform === "win32"
    ? [
        { command: "py", args: ["-3"] },
        { command: "python", args: [] },
      ]
    : [
        { command: "python3", args: [] },
        { command: "python", args: [] },
      ];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate.command, [...candidate.args, "--version"]);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Python is not available on the server. Install Python 3 before using PDF to Word conversion.");
}

async function convertWordToPdf(inputPath: string, outputDirectory: string, outputBaseName: string): Promise<string> {
  const sofficePath = await resolveLibreOfficeBinary();

  await execFileAsync(
    sofficePath,
    [
      "--headless",
      "--nologo",
      "--nodefault",
      "--nolockcheck",
      "--convert-to",
      "pdf:writer_pdf_Export",
      "--outdir",
      outputDirectory,
      inputPath,
    ],
    { timeout: 120_000, maxBuffer: 1024 * 1024 * 8 },
  );

  const expectedOutputPath = path.join(outputDirectory, `${outputBaseName}.pdf`);

  try {
    await fs.access(expectedOutputPath);
    return expectedOutputPath;
  } catch {
    const fallbackOutput = (await fs.readdir(outputDirectory)).find((entry) => entry.toLowerCase().endsWith(".pdf"));

    if (!fallbackOutput) {
      throw new Error("LibreOffice completed without producing a PDF file.");
    }

    return path.join(outputDirectory, fallbackOutput);
  }
}

async function convertPdfToWord(inputPath: string, outputPath: string): Promise<void> {
  const pythonRuntime = await resolvePythonRuntime();
  const scriptPath = path.join(process.cwd(), "scripts", "convert-pdf-to-docx.py");

  await execFileAsync(
    pythonRuntime.command,
    [...pythonRuntime.args, scriptPath, inputPath, outputPath],
    { timeout: 120_000, maxBuffer: 1024 * 1024 * 8 },
  );

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("PDF to Word conversion finished without producing a DOCX file.");
  }
}

export async function POST(request: Request) {
  let tempDirectory = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const parsedPayload = requestPayloadSchema.parse({
      mode: formData.get("mode")?.toString(),
    });

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A source document file is required." }, { status: 400 });
    }

    validateInputFile(file, parsedPayload.mode);

    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "visapilot-convert-"));
    const inputExtension = path.extname(file.name) || (parsedPayload.mode === "word-to-pdf" ? ".docx" : ".pdf");
    const outputBaseName = sanitizeBaseName(file.name);
    const inputPath = path.join(tempDirectory, `${outputBaseName}${inputExtension}`);

    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    let outputPath = "";
    let contentType = "";
    let downloadFileName = "";

    if (parsedPayload.mode === "word-to-pdf") {
      outputPath = await convertWordToPdf(inputPath, tempDirectory, outputBaseName);
      contentType = "application/pdf";
      downloadFileName = `${outputBaseName}.pdf`;
    } else {
      outputPath = path.join(tempDirectory, `${outputBaseName}.docx`);
      await convertPdfToWord(inputPath, outputPath);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      downloadFileName = `${outputBaseName}.docx`;
    }

    const outputBuffer = await fs.readFile(outputPath);

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${downloadFileName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to convert the selected document.",
      },
      { status: 400 },
    );
  } finally {
    if (tempDirectory) {
      await fs.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}