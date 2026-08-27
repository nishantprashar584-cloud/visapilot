"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, CloudUpload, Download, Eye, FileText, Layers3, LoaderCircle, Minimize, RotateCw, Scissors, Shield, Tags, Upload, Zap } from "lucide-react";
import type { PDFDocument as PdfDocument, PDFPage } from "pdf-lib";
import type { SupportingDocument } from "@/types";

type WorkspaceDocument = {
  id: string;
  file: File;
  kind: "pdf" | "image";
  category: "travel" | "financial" | "employment" | "insurance" | "identity" | "general";
  pageCount: number;
  previewUrl: string;
};

type WorkspaceOutput = {
  label: string;
  url: string;
  fileName: string;
};

type RotationPreset = "90" | "180" | "270";

function classifyDocumentCategory(file: File): WorkspaceDocument["category"] {
  const normalizedName = file.name.toLowerCase();

  if (/(flight|ticket|hotel|booking|itinerary|reservation)/.test(normalizedName)) {
    return "travel";
  }

  if (/(bank|statement|salary|payslip|payroll|tax)/.test(normalizedName)) {
    return "financial";
  }

  if (/(employment|offer|contract|employer|leave)/.test(normalizedName)) {
    return "employment";
  }

  if (/(insurance|policy|medical)/.test(normalizedName)) {
    return "insurance";
  }

  if (/(passport|id|identity|aadhaar)/.test(normalizedName)) {
    return "identity";
  }

  return "general";
}

function formatCategoryLabel(category: WorkspaceDocument["category"]): string {
  switch (category) {
    case "travel":
      return "Flight / Hotel";
    case "financial":
      return "Financial";
    case "employment":
      return "Employment";
    case "insurance":
      return "Insurance";
    case "identity":
      return "Identity";
    default:
      return "General";
  }
}

function categoryBadgeClasses(category: WorkspaceDocument["category"]): string {
  switch (category) {
    case "travel":
      return "border-sky-400/20 bg-sky-400/10 text-sky-100";
    case "financial":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "employment":
      return "border-indigo-400/20 bg-indigo-400/10 text-indigo-100";
    case "insurance":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    case "identity":
      return "border-rose-400/20 bg-rose-400/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-slate-200";
  }
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function parsePageRange(rangeInput: string, pageCount: number): number[] {
  const trimmed = rangeInput.trim();

  if (!trimmed) {
    throw new Error("Enter page numbers like 1-2 or 1,3.");
  }

  const pages = new Set<number>();

  for (const segment of trimmed.split(",")) {
    const part = segment.trim();

    if (!part) {
      continue;
    }

    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);

      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > pageCount) {
        throw new Error(`Page range ${part} is outside the document bounds.`);
      }

      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page) || page < 1 || page > pageCount) {
        throw new Error(`Page ${part} is outside the document bounds.`);
      }

      pages.add(page - 1);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

function parsePageOrder(orderInput: string, pageCount: number): number[] {
  const pages = parsePageRange(orderInput, pageCount);

  if (pages.length !== pageCount) {
    throw new Error(`Provide every page exactly once to reorder this ${pageCount}-page PDF.`);
  }

  return pages;
}

async function readDocumentMetadata(file: File): Promise<WorkspaceDocument> {
  const previewUrl = URL.createObjectURL(file);

  if (file.type === "application/pdf") {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(await file.arrayBuffer());

    return {
      id: crypto.randomUUID(),
      file,
      kind: "pdf",
      category: classifyDocumentCategory(file),
      pageCount: pdf.getPageCount(),
      previewUrl,
    };
  }

  if (file.type.startsWith("image/")) {
    return {
      id: crypto.randomUUID(),
      file,
      kind: "image",
      category: classifyDocumentCategory(file),
      pageCount: 1,
      previewUrl,
    };
  }

  URL.revokeObjectURL(previewUrl);
  throw new Error(`${file.name} is not a supported PDF or image file.`);
}

async function appendFileToPdf(targetBytesOwner: PdfDocument, document: WorkspaceDocument) {
  const { PDFDocument } = await import("pdf-lib");

  if (document.kind === "pdf") {
    const source = await PDFDocument.load(await document.file.arrayBuffer());
    const pages = await targetBytesOwner.copyPages(source, source.getPageIndices());
    pages.forEach((page: PDFPage) => targetBytesOwner.addPage(page));
    return;
  }

  const bytes = await document.file.arrayBuffer();
  const image = document.file.type.includes("png")
    ? await targetBytesOwner.embedPng(bytes)
    : await targetBytesOwner.embedJpg(bytes);
  const page = targetBytesOwner.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });
}

export function PacketWorkspace({
  previewMode,
  supportingDocuments,
  onSupportingDocumentsChange,
}: {
  previewMode: boolean;
  supportingDocuments: SupportingDocument[];
  onSupportingDocumentsChange: (documents: SupportingDocument[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const documentsRef = useRef<WorkspaceDocument[]>([]);
  const outputsRef = useRef<WorkspaceOutput[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [toolkitMessage, setToolkitMessage] = useState<string | null>(null);
  const [isProcessingDocuments, setIsProcessingDocuments] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string>("");
  const [splitDocumentId, setSplitDocumentId] = useState<string>("");
  const [splitRange, setSplitRange] = useState("1");
  const [pageOrder, setPageOrder] = useState("1");
  const [rotationPreset, setRotationPreset] = useState<RotationPreset>("90");
  const [outputs, setOutputs] = useState<WorkspaceOutput[]>([]);
  const [processingLabel, setProcessingLabel] = useState<string | null>(null);

  const pdfDocuments = useMemo(
    () => documents.filter((document) => document.kind === "pdf"),
    [documents],
  );

  const splitDocument = useMemo(
    () => documents.find((document) => document.id === splitDocumentId) ?? null,
    [documents, splitDocumentId],
  );

  const previewDocument = useMemo(
    () => documents.find((document) => document.id === previewDocumentId) ?? null,
    [documents, previewDocumentId],
  );

  function syncDocumentSelection(documentId: string) {
    const nextDocument = documents.find((document) => document.id === documentId) ?? null;
    setPreviewDocumentId(documentId);
    setSplitDocumentId(nextDocument?.kind === "pdf" ? documentId : "");

    if (nextDocument?.kind === "pdf") {
      setPageOrder(Array.from({ length: nextDocument.pageCount }, (_, index) => String(index + 1)).join(","));
    }
  }

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    outputsRef.current = outputs;
  }, [outputs]);

  useEffect(() => {
    return () => {
      documentsRef.current.forEach((document) => URL.revokeObjectURL(document.previewUrl));
      outputsRef.current.forEach((output) => URL.revokeObjectURL(output.url));
    };
  }, []);

  function upsertOutput(nextOutput: WorkspaceOutput) {
    setOutputs((currentOutputs) => {
      currentOutputs.forEach((output) => {
        if (output.fileName === nextOutput.fileName) {
          URL.revokeObjectURL(output.url);
        }
      });

      return [
        nextOutput,
        ...currentOutputs.filter((output) => output.fileName !== nextOutput.fileName),
      ];
    });
  }

  async function handleDroppedFiles(files: FileList | null) {
    await handleDocumentUpload(files);
  }

  async function handleDocumentUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Uploading documents");
    setToolkitMessage(null);

    try {
      const nextDocuments = await Promise.all(Array.from(files).map(readDocumentMetadata));

      if (!previewMode) {
        const uploadedDocuments: SupportingDocument[] = [];

        for (const document of nextDocuments) {
          const formData = new FormData();
          formData.append("documentId", document.id);
          formData.append("file", document.file);
          formData.append("pageCount", String(document.pageCount));

          const response = await fetch("/api/supporting-documents", {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json()) as { document?: SupportingDocument; error?: string };

          if (!response.ok || !payload.document) {
            throw new Error(payload.error ?? `Unable to save ${document.file.name}.`);
          }

          uploadedDocuments.push(payload.document);
        }

        onSupportingDocumentsChange([...supportingDocuments, ...uploadedDocuments]);
      }

      const nextAllDocuments = [...documentsRef.current, ...nextDocuments];
      const firstPdfDocument = nextAllDocuments.find((document) => document.kind === "pdf") ?? null;

      setDocuments((currentDocuments) => [...currentDocuments, ...nextDocuments]);
      setSplitDocumentId((currentId) => {
        const currentSelection = nextAllDocuments.find((document) => document.id === currentId && document.kind === "pdf");
        return currentSelection?.id ?? firstPdfDocument?.id ?? "";
      });
      setPreviewDocumentId((currentId) => currentId || nextDocuments[0]?.id || "");
      setPageOrder((currentValue) => currentValue === "1" && firstPdfDocument ? Array.from({ length: firstPdfDocument.pageCount }, (_, index) => String(index + 1)).join(",") : currentValue);
      setToolkitMessage(
        previewMode
          ? `${nextDocuments.length} supporting document${nextDocuments.length === 1 ? "" : "s"} added to the packet workspace.`
          : `${nextDocuments.length} supporting document${nextDocuments.length === 1 ? "" : "s"} uploaded and saved to your packet vault.`,
      );
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to add supporting documents.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function moveDocument(documentId: string, direction: -1 | 1) {
    setDocuments((currentDocuments) => {
      const index = currentDocuments.findIndex((document) => document.id === documentId);

      if (index < 0) {
        return currentDocuments;
      }

      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= currentDocuments.length) {
        return currentDocuments;
      }

      const nextDocuments = [...currentDocuments];
      const [document] = nextDocuments.splice(index, 1);
      nextDocuments.splice(targetIndex, 0, document);

      if (!previewMode) {
        const supportingIndex = supportingDocuments.findIndex((item) => item.id === documentId);

        if (supportingIndex >= 0) {
          const nextSupportingDocuments = [...supportingDocuments];
          const [supportingDocument] = nextSupportingDocuments.splice(supportingIndex, 1);
          nextSupportingDocuments.splice(targetIndex, 0, supportingDocument);
          onSupportingDocumentsChange(nextSupportingDocuments);
        }
      }

      return nextDocuments;
    });
  }

  async function removeDocument(documentId: string) {
    const storedDocument = supportingDocuments.find((document) => document.id === documentId);

    if (storedDocument && !previewMode) {
      try {
        const response = await fetch("/api/supporting-documents", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ storagePath: storedDocument.storagePath }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to remove supporting document.");
        }
      } catch (error) {
        setToolkitMessage(error instanceof Error ? error.message : "Unable to remove supporting document.");
        return;
      }

      onSupportingDocumentsChange(supportingDocuments.filter((document) => document.id !== documentId));
    }

    setDocuments((currentDocuments) => {
      const documentToRemove = currentDocuments.find((document) => document.id === documentId);

      if (documentToRemove) {
        URL.revokeObjectURL(documentToRemove.previewUrl);
      }

      const nextDocuments = currentDocuments.filter((document) => document.id !== documentId);
      if (splitDocumentId === documentId) {
        const nextPdfDocument = nextDocuments.find((document) => document.kind === "pdf");
        setSplitDocumentId(nextPdfDocument?.id ?? "");
        if (nextPdfDocument) {
          setPageOrder(Array.from({ length: nextPdfDocument.pageCount }, (_, index) => String(index + 1)).join(","));
        }
      }
      if (previewDocumentId === documentId) {
        setPreviewDocumentId(nextDocuments[0]?.id ?? "");
      }
      return nextDocuments;
    });

    if (storedDocument) {
      setToolkitMessage(`${storedDocument.fileName} removed from the packet vault.`);
    }
  }

  async function handleMergeDocuments() {
    if (documents.length === 0) {
      setToolkitMessage("Add at least one PDF or image before merging a packet bundle.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Merging document stack");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();
      mergedPdf.setTitle("VisaPilot Supporting Document Stack");
      mergedPdf.setProducer("VisaPilot");
      mergedPdf.setCreator("VisaPilot");

      for (const document of documents) {
        await appendFileToPdf(mergedPdf, document);
      }

      const mergedBytes = await mergedPdf.save();
      const url = URL.createObjectURL(new Blob([Uint8Array.from(mergedBytes)], { type: "application/pdf" }));

      upsertOutput({
        label: "Merged supporting packet",
        url,
        fileName: "visapilot-merged-supporting-docs.pdf",
      });

      setToolkitMessage("Merged PDF is ready to preview or download.");
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to merge the selected documents.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleSplitDocument() {
    if (!splitDocument || splitDocument.kind !== "pdf") {
      setToolkitMessage("Choose a PDF document before splitting pages.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Splitting PDF pages");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await splitDocument.file.arrayBuffer());
      const selectedPages = parsePageRange(splitRange, source.getPageCount());
      const splitPdf = await PDFDocument.create();
      const copiedPages = await splitPdf.copyPages(source, selectedPages);
      copiedPages.forEach((page) => splitPdf.addPage(page));

      const splitBytes = await splitPdf.save();
        const url = URL.createObjectURL(new Blob([Uint8Array.from(splitBytes)], { type: "application/pdf" }));
      const fileName = `${splitDocument.file.name.replace(/\.pdf$/i, "")}-pages-${splitRange.replace(/\s+/g, "")}.pdf`;

      upsertOutput({
        label: `Split pages from ${splitDocument.file.name}`,
        url,
        fileName,
      });

      setToolkitMessage(`Split output for pages ${splitRange} is ready.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to split the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleCompressDocument() {
    if (!splitDocument || splitDocument.kind !== "pdf") {
      setToolkitMessage("Choose a PDF document before compressing it.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Compressing PDF");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await splitDocument.file.arrayBuffer());
      const compressedPdf = await PDFDocument.create();
      const copiedPages = await compressedPdf.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => compressedPdf.addPage(page));
      compressedPdf.setTitle(splitDocument.file.name.replace(/\.pdf$/i, ""));
      compressedPdf.setAuthor("");
      compressedPdf.setSubject("");
      compressedPdf.setKeywords([]);
      compressedPdf.setProducer("VisaPilot");
      compressedPdf.setCreator("VisaPilot");

      const compressedBytes = await compressedPdf.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(compressedBytes)], { type: "application/pdf" }));
      const fileName = `${splitDocument.file.name.replace(/\.pdf$/i, "")}-compressed.pdf`;

      upsertOutput({
        label: `Compressed PDF for ${splitDocument.file.name}`,
        url,
        fileName,
      });

      setToolkitMessage(`Compressed output for ${splitDocument.file.name} is ready to preview or download.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to compress the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleRotateDocument() {
    if (!splitDocument || splitDocument.kind !== "pdf") {
      setToolkitMessage("Choose a PDF document before rotating pages.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Rotating PDF pages");
    setToolkitMessage(null);

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const rotatedPdf = await PDFDocument.load(await splitDocument.file.arrayBuffer());
      const rotation = Number(rotationPreset);
      rotatedPdf.getPages().forEach((page) => page.setRotation(degrees(rotation)));

      const rotatedBytes = await rotatedPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(rotatedBytes)], { type: "application/pdf" }));
      const fileName = `${splitDocument.file.name.replace(/\.pdf$/i, "")}-rotated-${rotation}.pdf`;

      upsertOutput({
        label: `Rotated pages for ${splitDocument.file.name}`,
        url,
        fileName,
      });

      setToolkitMessage(`Rotated all pages in ${splitDocument.file.name} by ${rotation} degrees.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to rotate the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleReorderDocument() {
    if (!splitDocument || splitDocument.kind !== "pdf") {
      setToolkitMessage("Choose a PDF document before reordering its pages.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Reordering PDF pages");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await splitDocument.file.arrayBuffer());
      const orderedPages = parsePageOrder(pageOrder, source.getPageCount());
      const reorderedPdf = await PDFDocument.create();
      const copiedPages = await reorderedPdf.copyPages(source, orderedPages);
      copiedPages.forEach((page) => reorderedPdf.addPage(page));

      const reorderedBytes = await reorderedPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(reorderedBytes)], { type: "application/pdf" }));
      const fileName = `${splitDocument.file.name.replace(/\.pdf$/i, "")}-reordered.pdf`;

      upsertOutput({
        label: `Reordered pages for ${splitDocument.file.name}`,
        url,
        fileName,
      });

      setToolkitMessage(`Page order for ${splitDocument.file.name} has been rebuilt as ${pageOrder}.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to reorder the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleSanitizeDocument() {
    if (!splitDocument || splitDocument.kind !== "pdf") {
      setToolkitMessage("Choose a PDF document before sanitizing it.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Sanitizing PDF metadata");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await splitDocument.file.arrayBuffer());
      const sanitizedPdf = await PDFDocument.create();
      const copiedPages = await sanitizedPdf.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => sanitizedPdf.addPage(page));
      sanitizedPdf.setTitle("");
      sanitizedPdf.setAuthor("");
      sanitizedPdf.setSubject("");
      sanitizedPdf.setKeywords([]);
      sanitizedPdf.setProducer("VisaPilot");
      sanitizedPdf.setCreator("VisaPilot");
      sanitizedPdf.setLanguage("");

      const sanitizedBytes = await sanitizedPdf.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(sanitizedBytes)], { type: "application/pdf" }));
      const fileName = `${splitDocument.file.name.replace(/\.pdf$/i, "")}-sanitized.pdf`;

      upsertOutput({
        label: `Sanitized PDF for ${splitDocument.file.name}`,
        url,
        fileName,
      });

      setToolkitMessage(`Sanitized output for ${splitDocument.file.name} is ready.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to sanitize the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
                <Upload className="h-3.5 w-3.5" />
                PDF Editor
              </div>
              <h4 className="text-lg font-semibold text-white">Supporting document PDF editor</h4>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Upload supporting files, classify them automatically, preview them, and merge them into a cleaner consular stack.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void handleDocumentUpload(event.target.files)}
          />
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleDroppedFiles(event.dataTransfer.files);
          }}
          disabled={isProcessingDocuments}
          className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-[1.3rem] border-2 border-dashed border-indigo-300/40 bg-indigo-500/10 px-4 py-8 text-center text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-indigo-100 text-indigo-600 shadow-sm shadow-indigo-950/20">
            <CloudUpload className="h-8 w-8" />
          </span>
          <span className="text-base font-semibold text-white">Drag & Drop Consular Documents Here</span>
          <span className="max-w-xl text-sm font-medium leading-6 text-indigo-100/85">
            {isProcessingDocuments ? "Adding supporting documents..." : "PDF, PNG, JPEG, and WEBP files are supported. Current server upload limits still apply."}
          </span>
        </button>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => void handleMergeDocuments()}
            disabled={isProcessingDocuments || documents.length === 0}
            className="rounded-[1.1rem] border border-blue-200/10 bg-blue-500/10 p-4 text-left transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Layers3 className="mb-3 h-10 w-10 rounded-lg bg-blue-100 p-2 text-blue-600" />
            <p className="text-sm font-semibold text-white">Merge Stack</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Combine the current PDFs and scans into one embassy-ready file.</p>
          </button>
          <button
            type="button"
            onClick={() => void handleSplitDocument()}
            disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
            className="rounded-[1.1rem] border border-red-200/10 bg-red-500/10 p-4 text-left transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Scissors className="mb-3 h-10 w-10 rounded-lg bg-red-100 p-2 text-red-600" />
            <p className="text-sm font-semibold text-white">Split & Extract</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Pull specific pages from a longer PDF like a bank statement or booking packet.</p>
          </button>
          <button
            type="button"
            onClick={() => void handleCompressDocument()}
            disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
            className="rounded-[1.1rem] border border-emerald-200/10 bg-emerald-500/10 p-4 text-left transition hover:bg-emerald-500/15"
          >
            <Minimize className="mb-3 h-10 w-10 rounded-lg bg-emerald-100 p-2 text-emerald-600" />
            <p className="text-sm font-semibold text-white">Compress Size</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Prepare smaller files for VFS, TLS, or BLS portal upload limits.</p>
          </button>
          <button
            type="button"
            onClick={() => void handleReorderDocument()}
            disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
            className="rounded-[1.1rem] border border-violet-200/10 bg-violet-500/10 p-4 text-left transition hover:bg-violet-500/15"
          >
            <ArrowDownUp className="mb-3 h-10 w-10 rounded-lg bg-violet-100 p-2 text-violet-600" />
            <p className="text-sm font-semibold text-white">Reorder Pages</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Use the list controls below to move files into the checklist order.</p>
          </button>
          <button
            type="button"
            onClick={() => void handleRotateDocument()}
            disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
            className="rounded-[1.1rem] border border-amber-200/10 bg-amber-500/10 p-4 text-left transition hover:bg-amber-500/15"
          >
            <RotateCw className="mb-3 h-10 w-10 rounded-lg bg-amber-100 p-2 text-amber-600" />
            <p className="text-sm font-semibold text-white">Rotate Scans</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Fix upside-down passport scans and rotated evidence before export.</p>
          </button>
          <button
            type="button"
            onClick={() => void handleSanitizeDocument()}
            disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
            className="rounded-[1.1rem] border border-slate-200/10 bg-slate-500/10 p-4 text-left transition hover:bg-slate-500/15"
          >
            <Shield className="mb-3 h-10 w-10 rounded-lg bg-slate-100 p-2 text-slate-600" />
            <p className="text-sm font-semibold text-white">Flatten & Sanitize</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Strip editing metadata before the final embassy submission package is created.</p>
          </button>
        </div>

        {toolkitMessage ? (
          <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200">
            {toolkitMessage}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-[1.1rem] border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-slate-400">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[1rem] bg-white/5 text-slate-300">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-semibold text-white">No supporting documents yet</p>
              <p className="mx-auto mt-2 max-w-lg leading-6 text-slate-400">
                Add flights, hotel confirmations, insurance, employment letters, or financial statements to build the final consular stack.
              </p>
            </div>
          ) : (
            documents.map((document, index) => (
              <div key={document.id} className="rounded-[1rem] border border-white/10 bg-black/40 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{document.file.name}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${categoryBadgeClasses(document.category)}`}>
                          {formatCategoryLabel(document.category)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {document.pageCount} {document.pageCount === 1 ? "page" : "pages"} · {formatBytes(document.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSplitDocumentId(document.id);
                        setPreviewDocumentId(document.id);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30"
                    >
                      <Scissors className="h-4 w-4" />
                      Split Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDocumentId(document.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDocument(document.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDocument(document.id, -1)}
                      disabled={index === 0}
                      className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30 disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDocument(document.id, 1)}
                      disabled={index === documents.length - 1}
                      className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30 disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleMergeDocuments()}
          disabled={isProcessingDocuments || documents.length === 0}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Layers3 className="h-4 w-4" />
          Merge All Documents Into Consular Stack
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Eye className="h-3.5 w-3.5" />
                Document Preview
              </div>
              <select
                value={previewDocumentId}
                onChange={(event) => syncDocumentSelection(event.target.value)}
                className="min-w-[220px] rounded-full border border-white/12 bg-[#161616] px-4 py-2 text-sm text-white outline-none transition focus:border-white/30"
              >
                <option value="">Choose a document</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>{document.file.name}</option>
                ))}
              </select>
            </div>

            <div className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
              {splitDocument && splitDocument.kind === "pdf"
                ? `Active PDF: ${splitDocument.file.name} · ${splitDocument.pageCount} ${splitDocument.pageCount === 1 ? "page" : "pages"}`
                : pdfDocuments.length > 0
                  ? "Select a PDF in the preview header to use Split, Rotate, Reorder, and Sanitize."
                  : "Upload a PDF to unlock page editing actions."}
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-black/50">
            {previewDocument ? (
              previewDocument.kind === "pdf" ? (
                <iframe
                  src={previewDocument.previewUrl}
                  title={previewDocument.file.name}
                  className="h-[420px] w-full bg-white"
                />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center bg-black/70 p-4">
                  <Image
                    src={previewDocument.previewUrl}
                    alt={previewDocument.file.name}
                    width={800}
                    height={1100}
                    unoptimized
                    className="max-h-[390px] w-auto rounded-[0.8rem] object-contain"
                  />
                </div>
              )
            ) : (
              <div className="flex min-h-[420px] items-center justify-center px-4 text-center text-sm text-slate-400">
                Choose a supporting document to inspect it before packet generation.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Zap className="h-3.5 w-3.5" />
            Active PDF Tools
          </div>

          {processingLabel ? (
            <div className="flex items-center gap-2 rounded-[1rem] border border-indigo-300/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {processingLabel}...
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-[#111111] p-5">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Scissors className="h-[18px] w-[18px] text-red-500" />
              Split PDF
            </h3>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Page Range (e.g. 1-3)</span>
                <input
                  value={splitRange}
                  onChange={(event) => setSplitRange(event.target.value)}
                  placeholder="1-3"
                  className="w-full rounded-lg border border-white/12 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSplitDocument()}
                disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
                className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Extract Pages
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111111] p-5">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <RotateCw className="h-[18px] w-[18px] text-amber-500" />
              Rotate Pages
            </h3>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Degrees</span>
                <select
                  value={rotationPreset}
                  onChange={(event) => setRotationPreset(event.target.value as RotationPreset)}
                  className="w-full rounded-lg border border-white/12 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                >
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleRotateDocument()}
                disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
                className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Apply Rotation
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111111] p-5">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <ArrowDownUp className="h-[18px] w-[18px] text-violet-400" />
              Quick Actions
            </h3>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Page Order</span>
                <input
                  value={pageOrder}
                  onChange={(event) => setPageOrder(event.target.value)}
                  placeholder="1,2,3"
                  className="w-full rounded-lg border border-white/12 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleReorderDocument()}
                  disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowDownUp className="h-4 w-4" />
                  Reorder Pages
                </button>
                <button
                  type="button"
                  onClick={() => void handleSanitizeDocument()}
                  disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Shield className="h-4 w-4" />
                  Sanitize Metadata
                </button>
              </div>
            </div>
          </div>

          {outputs.length > 0 ? (
            <div className="space-y-3">
              {outputs.map((output) => (
                <div key={`${output.fileName}-${output.url}`} className="flex flex-col gap-3 rounded-[1rem] border border-white/10 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{output.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{output.fileName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={output.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30">
                      Preview
                    </a>
                    <a href={output.url} download={output.fileName} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100">
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {!previewMode && supportingDocuments.length > 0 ? (
          <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <Tags className="h-3.5 w-3.5" />
              Saved to packet vault
            </div>
            <div className="mt-3 space-y-2">
              {supportingDocuments.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 rounded-[0.9rem] border border-white/10 bg-[#141414] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{document.fileName}</p>
                    <p className="text-xs text-slate-400">{document.pageCount} {document.pageCount === 1 ? "page" : "pages"} saved for dashboard access</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    Saved
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}