"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, Eye, FileText, Layers3, Scissors, Tags, Upload } from "lucide-react";
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
  const [outputs, setOutputs] = useState<WorkspaceOutput[]>([]);

  const splitDocument = useMemo(
    () => documents.find((document) => document.id === splitDocumentId) ?? null,
    [documents, splitDocumentId],
  );

  const previewDocument = useMemo(
    () => documents.find((document) => document.id === previewDocumentId) ?? null,
    [documents, previewDocumentId],
  );

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

  async function handleDroppedFiles(files: FileList | null) {
    await handleDocumentUpload(files);
  }

  async function handleDocumentUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsProcessingDocuments(true);
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

      setDocuments((currentDocuments) => [...currentDocuments, ...nextDocuments]);
      setSplitDocumentId((currentId) => currentId || nextDocuments[0]?.id || "");
      setPreviewDocumentId((currentId) => currentId || nextDocuments[0]?.id || "");
      setToolkitMessage(
        previewMode
          ? `${nextDocuments.length} supporting document${nextDocuments.length === 1 ? "" : "s"} added to the packet workspace.`
          : `${nextDocuments.length} supporting document${nextDocuments.length === 1 ? "" : "s"} uploaded and saved to your packet vault.`,
      );
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to add supporting documents.");
    } finally {
      setIsProcessingDocuments(false);

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
        setSplitDocumentId(nextDocuments[0]?.id ?? "");
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

      setOutputs((currentOutputs) => {
        currentOutputs.forEach((output) => {
          if (output.fileName === "visapilot-merged-supporting-docs.pdf") {
            URL.revokeObjectURL(output.url);
          }
        });

        return [
          {
            label: "Merged supporting packet",
            url,
            fileName: "visapilot-merged-supporting-docs.pdf",
          },
          ...currentOutputs.filter((output) => output.fileName !== "visapilot-merged-supporting-docs.pdf"),
        ];
      });

      setToolkitMessage("Merged PDF is ready to preview or download.");
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to merge the selected documents.");
    } finally {
      setIsProcessingDocuments(false);
    }
  }

  async function handleSplitDocument() {
    if (!splitDocument || splitDocument.kind !== "pdf") {
      setToolkitMessage("Choose a PDF document before splitting pages.");
      return;
    }

    setIsProcessingDocuments(true);
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

      setOutputs((currentOutputs) => [
        {
          label: `Split pages from ${splitDocument.file.name}`,
          url,
          fileName,
        },
        ...currentOutputs,
      ]);

      setToolkitMessage(`Split output for pages ${splitRange} is ready.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to split the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
              <Upload className="h-3.5 w-3.5" />
              Add Supporting PDF
            </div>
            <h4 className="mt-3 text-lg font-semibold text-white">Supporting document toolkit</h4>
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
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.1rem] border border-dashed border-sky-400/25 bg-sky-400/10 px-4 py-6 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-5 w-5" />
          {isProcessingDocuments ? "Adding supporting documents..." : "Drag and drop files here or click to add supporting PDF"}
        </button>

        {toolkitMessage ? (
          <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200">
            {toolkitMessage}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-6 text-sm text-slate-400">
              No supporting PDFs uploaded yet. Add flights, hotel confirmations, insurance, employment letters, or financial statements here.
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

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Split document</span>
              <select
                value={splitDocumentId}
                onChange={(event) => setSplitDocumentId(event.target.value)}
                className="w-full rounded-[1rem] border border-white/12 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              >
                <option value="">Choose a PDF</option>
                {documents.filter((document) => document.kind === "pdf").map((document) => (
                  <option key={document.id} value={document.id}>{document.file.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Pages</span>
              <input
                value={splitRange}
                onChange={(event) => setSplitRange(event.target.value)}
                placeholder="1-2 or 1,3"
                className="w-full rounded-[1rem] border border-white/12 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleSplitDocument()}
            disabled={isProcessingDocuments || !splitDocument || splitDocument.kind !== "pdf"}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#161616] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Scissors className="h-4 w-4" />
            Split Pages
          </button>
        </div>

        {outputs.length > 0 ? (
          <div className="mt-5 space-y-3">
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

        <button
          type="button"
          onClick={() => void handleMergeDocuments()}
          disabled={isProcessingDocuments || documents.length === 0}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Layers3 className="h-4 w-4" />
          Merge All into Consular Stack
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Eye className="h-3.5 w-3.5" />
            Document Preview
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

        {!previewMode && supportingDocuments.length > 0 ? (
          <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <Tags className="h-3.5 w-3.5" />
              Saved to packet vault
            </div>
            <div className="mt-3 space-y-2">
              {supportingDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-white/10 bg-[#141414] px-3 py-2">
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