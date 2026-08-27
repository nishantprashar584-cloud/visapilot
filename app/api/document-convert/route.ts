import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { convertPdfToWord, convertWordToPdf, sanitizeConvertedBaseName, validateConvertibleInputFile } from "@/lib/documents/conversion";

const requestPayloadSchema = z.object({
  mode: z.enum(["word-to-pdf", "pdf-to-word"]),
});

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

    validateConvertibleInputFile(file, parsedPayload.mode);

    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "visapilot-convert-"));
    const inputExtension = path.extname(file.name) || (parsedPayload.mode === "word-to-pdf" ? ".docx" : ".pdf");
    const outputBaseName = sanitizeConvertedBaseName(file.name);
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