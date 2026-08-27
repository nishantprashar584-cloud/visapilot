import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function sanitizeConvertedBaseName(fileName: string): string {
  const cleaned = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || `document-${randomUUID()}`;
}

export function hasAllowedExtension(fileName: string, extensions: string[]): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return extensions.includes(extension);
}

export function validateConvertibleInputFile(file: File, mode: "word-to-pdf" | "pdf-to-word"): void {
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

export async function resolveLibreOfficeBinary(): Promise<string> {
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

export async function resolvePythonRuntime(): Promise<{ command: string; args: string[] }> {
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

export async function convertWordToPdf(inputPath: string, outputDirectory: string, outputBaseName: string): Promise<string> {
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

export async function convertPdfToWord(inputPath: string, outputPath: string): Promise<void> {
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

export async function getDocumentConversionHealth() {
  const libreOffice = await resolveLibreOfficeBinary()
    .then((binaryPath) => ({ ok: true, binaryPath }))
    .catch((error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : "LibreOffice unavailable." }));
  const python = await resolvePythonRuntime()
    .then((runtime) => ({ ok: true, command: [runtime.command, ...runtime.args].join(" ") }))
    .catch((error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : "Python unavailable." }));

  return {
    libreOffice,
    python,
  };
}