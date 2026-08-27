"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CheckCircle2,
  CloudUpload,
  Download,
  Eye,
  FileText,
  GripVertical,
  Layers3,
  LoaderCircle,
  Minimize,
  RotateCw,
  Scissors,
  Shield,
  Tags,
  Upload,
  Zap,
  type LucideIcon,
} from "lucide-react";
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
  id: string;
  label: string;
  url: string;
  fileName: string;
  createdAtLabel: string;
  sizeLabel: string;
};

type WorkspacePagePreview = {
  pageNumber: number;
  url: string;
};

type RotationPreset = "90" | "180" | "270";
type ToolkitMode = "merge" | "split" | "compress" | "reorder" | "rotate" | "sanitize";

type ToolDefinition = {
  id: ToolkitMode;
  label: string;
  shortLabel: string;
  description: string;
  uploadTitle: string;
  uploadDescription: string;
  accept: string;
  multiple: boolean;
  requiresPdf: boolean;
  icon: LucideIcon;
  accentClass: string;
  iconClass: string;
};

const toolDefinitions: ToolDefinition[] = [
  {
    id: "merge",
    label: "Merge PDF",
    shortLabel: "Merge",
    description: "Upload multiple files, arrange them, then create one embassy-ready PDF.",
    uploadTitle: "Select files to merge",
    uploadDescription: "Add two or more PDFs or images. Drag to change the merge order before exporting.",
    accept: "application/pdf,image/png,image/jpeg,image/webp",
    multiple: true,
    requiresPdf: false,
    icon: Layers3,
    accentClass: "border-blue-300/20 bg-blue-500/10 text-blue-100",
    iconClass: "bg-blue-100 text-blue-600",
  },
  {
    id: "split",
    label: "Split PDF",
    shortLabel: "Split",
    description: "Upload one PDF, preview it, then extract the exact page range you need.",
    uploadTitle: "Select a PDF to split",
    uploadDescription: "Choose a PDF, preview it, then enter page ranges like 1-3 or 2,5.",
    accept: "application/pdf",
    multiple: false,
    requiresPdf: true,
    icon: Scissors,
    accentClass: "border-rose-300/20 bg-rose-500/10 text-rose-100",
    iconClass: "bg-rose-100 text-rose-600",
  },
  {
    id: "compress",
    label: "Compress PDF",
    shortLabel: "Compress",
    description: "Upload one PDF, preview it, then generate a lighter portal-friendly copy.",
    uploadTitle: "Select a PDF to compress",
    uploadDescription: "Use this for VFS, TLS, or BLS upload limits when a file needs cleanup and compaction.",
    accept: "application/pdf",
    multiple: false,
    requiresPdf: true,
    icon: Minimize,
    accentClass: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
    iconClass: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "reorder",
    label: "Reorder Pages",
    shortLabel: "Reorder",
    description: "Upload one PDF, inspect its page tiles, then drag pages into the final sequence.",
    uploadTitle: "Select a PDF to reorder",
    uploadDescription: "Drag the page cards into the exact embassy order before exporting the rebuilt PDF.",
    accept: "application/pdf",
    multiple: false,
    requiresPdf: true,
    icon: ArrowDownUp,
    accentClass: "border-violet-300/20 bg-violet-500/10 text-violet-100",
    iconClass: "bg-violet-100 text-violet-600",
  },
  {
    id: "rotate",
    label: "Rotate PDF",
    shortLabel: "Rotate",
    description: "Upload one PDF, choose the angle, then export a corrected orientation.",
    uploadTitle: "Select a PDF to rotate",
    uploadDescription: "Preview the current scan, set the rotation angle, and create a corrected copy.",
    accept: "application/pdf",
    multiple: false,
    requiresPdf: true,
    icon: RotateCw,
    accentClass: "border-amber-300/20 bg-amber-500/10 text-amber-100",
    iconClass: "bg-amber-100 text-amber-600",
  },
  {
    id: "sanitize",
    label: "Sanitize PDF",
    shortLabel: "Sanitize",
    description: "Upload one PDF, review it, then strip metadata before submission.",
    uploadTitle: "Select a PDF to sanitize",
    uploadDescription: "Use this when you want a cleaner export without author, subject, or editing metadata.",
    accept: "application/pdf",
    multiple: false,
    requiresPdf: true,
    icon: Shield,
    accentClass: "border-slate-300/20 bg-slate-500/10 text-slate-100",
    iconClass: "bg-slate-100 text-slate-700",
  },
];

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

function buildPageSequence(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
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
  const pagePreviewsRef = useRef<WorkspacePagePreview[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolkitMode>("merge");
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [toolkitMessage, setToolkitMessage] = useState<string | null>(null);
  const [isProcessingDocuments, setIsProcessingDocuments] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string>("");
  const [activePdfId, setActivePdfId] = useState<string>("");
  const [splitRange, setSplitRange] = useState("1");
  const [pageSequence, setPageSequence] = useState<number[]>([]);
  const [rotationPreset, setRotationPreset] = useState<RotationPreset>("90");
  const [outputs, setOutputs] = useState<WorkspaceOutput[]>([]);
  const [processingLabel, setProcessingLabel] = useState<string | null>(null);
  const [previewOutputId, setPreviewOutputId] = useState<string>("");
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);
  const [draggedPageNumber, setDraggedPageNumber] = useState<number | null>(null);
  const [pagePreviews, setPagePreviews] = useState<WorkspacePagePreview[]>([]);
  const [isPreparingPageBoard, setIsPreparingPageBoard] = useState(false);

  const selectedToolDefinition = useMemo(
    () => toolDefinitions.find((tool) => tool.id === selectedTool) ?? toolDefinitions[0],
    [selectedTool],
  );

  const pdfDocuments = useMemo(
    () => documents.filter((document) => document.kind === "pdf"),
    [documents],
  );

  const activePdf = useMemo(
    () => documents.find((document) => document.id === activePdfId && document.kind === "pdf") ?? null,
    [activePdfId, documents],
  );

  const previewDocument = useMemo(
    () => documents.find((document) => document.id === previewDocumentId) ?? null,
    [documents, previewDocumentId],
  );

  const previewOutput = useMemo(
    () => outputs.find((output) => output.id === previewOutputId) ?? null,
    [outputs, previewOutputId],
  );

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    outputsRef.current = outputs;
  }, [outputs]);

  useEffect(() => {
    pagePreviewsRef.current = pagePreviews;
  }, [pagePreviews]);

  useEffect(() => {
    return () => {
      documentsRef.current.forEach((document) => URL.revokeObjectURL(document.previewUrl));
      outputsRef.current.forEach((output) => URL.revokeObjectURL(output.url));
      pagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  useEffect(() => {
    if (documents.length === 0) {
      setPreviewDocumentId("");
      setActivePdfId("");
      return;
    }

    if (!documents.some((document) => document.id === previewDocumentId)) {
      setPreviewDocumentId(documents[0]?.id ?? "");
    }

    if (!pdfDocuments.some((document) => document.id === activePdfId)) {
      setActivePdfId(pdfDocuments[0]?.id ?? "");
    }
  }, [activePdfId, documents, pdfDocuments, previewDocumentId]);

  useEffect(() => {
    if (!activePdf) {
      setPageSequence([]);
      return;
    }

    setPageSequence(buildPageSequence(activePdf.pageCount));
  }, [activePdf]);

  useEffect(() => {
    if (selectedTool !== "merge" && activePdf) {
      setPreviewDocumentId(activePdf.id);
    }
  }, [activePdf, selectedTool]);

  useEffect(() => {
    let isCancelled = false;

    async function buildPagePreviews() {
      if (selectedTool !== "reorder" || !activePdf) {
        pagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        pagePreviewsRef.current = [];
        setPagePreviews([]);
        setIsPreparingPageBoard(false);
        return;
      }

      setIsPreparingPageBoard(true);

      try {
        const { PDFDocument } = await import("pdf-lib");
        const source = await PDFDocument.load(await activePdf.file.arrayBuffer());
        const nextPreviews: WorkspacePagePreview[] = [];

        for (let index = 0; index < source.getPageCount(); index += 1) {
          const singlePagePdf = await PDFDocument.create();
          const [page] = await singlePagePdf.copyPages(source, [index]);
          singlePagePdf.addPage(page);
          const bytes = await singlePagePdf.save({ useObjectStreams: true, addDefaultPage: false });
          const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }));
          nextPreviews.push({ pageNumber: index + 1, url });
        }

        if (isCancelled) {
          nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
          return;
        }

        pagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        pagePreviewsRef.current = nextPreviews;
        setPagePreviews(nextPreviews);
      } catch (error) {
        if (!isCancelled) {
          setToolkitMessage(error instanceof Error ? error.message : "Unable to prepare page previews for reordering.");
        }
      } finally {
        if (!isCancelled) {
          setIsPreparingPageBoard(false);
        }
      }
    }

    void buildPagePreviews();

    return () => {
      isCancelled = true;
    };
  }, [activePdf, selectedTool]);

  function syncSavedSupportingOrder(nextDocuments: WorkspaceDocument[]) {
    if (previewMode || supportingDocuments.length === 0) {
      return;
    }

    const savedById = new Map(supportingDocuments.map((document) => [document.id, document]));
    const reorderedSaved = nextDocuments
      .map((document) => savedById.get(document.id))
      .filter((document): document is SupportingDocument => Boolean(document));

    if (reorderedSaved.length === supportingDocuments.length) {
      onSupportingDocumentsChange(reorderedSaved);
    }
  }

  function commitDocuments(nextDocuments: WorkspaceDocument[]) {
    documentsRef.current = nextDocuments;
    setDocuments(nextDocuments);
    syncSavedSupportingOrder(nextDocuments);
  }

  function syncDocumentSelection(documentId: string) {
    const nextDocument = documents.find((document) => document.id === documentId) ?? null;

    setPreviewOutputId("");
    setPreviewDocumentId(documentId);

    if (nextDocument?.kind === "pdf") {
      setActivePdfId(nextDocument.id);
    }
  }

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
    setPreviewOutputId(nextOutput.id);
  }

  function removeOutput(outputId: string) {
    setOutputs((currentOutputs) => {
      const target = currentOutputs.find((output) => output.id === outputId);

      if (target) {
        URL.revokeObjectURL(target.url);
      }

      return currentOutputs.filter((output) => output.id !== outputId);
    });

    setPreviewOutputId((currentId) => (currentId === outputId ? "" : currentId));
    setToolkitMessage("Generated PDF removed from the workspace outputs.");
  }

  function moveDocument(documentId: string, direction: -1 | 1) {
    const currentDocuments = documentsRef.current;
    const index = currentDocuments.findIndex((document) => document.id === documentId);

    if (index < 0) {
      return;
    }

    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= currentDocuments.length) {
      return;
    }

    const nextDocuments = reorderItems(currentDocuments, index, targetIndex);
    commitDocuments(nextDocuments);
    setToolkitMessage("Document order updated for the merge export.");
  }

  function movePage(pageNumber: number, direction: -1 | 1) {
    setPageSequence((currentSequence) => {
      const index = currentSequence.findIndex((value) => value === pageNumber);

      if (index < 0) {
        return currentSequence;
      }

      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= currentSequence.length) {
        return currentSequence;
      }

      return reorderItems(currentSequence, index, targetIndex);
    });
  }

  async function handleDroppedFiles(files: FileList | null) {
    await handleDocumentUpload(files);
  }

  async function handleDocumentUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const nextFiles = Array.from(files).slice(0, selectedToolDefinition.multiple ? undefined : 1);

    if (selectedToolDefinition.requiresPdf && nextFiles.some((file) => file.type !== "application/pdf")) {
      setToolkitMessage(`${selectedToolDefinition.label} accepts PDF files only.`);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Uploading files");
    setToolkitMessage(null);

    try {
      const uploadedWorkspaceDocuments = await Promise.all(nextFiles.map(readDocumentMetadata));

      if (!previewMode) {
        const uploadedDocuments: SupportingDocument[] = [];

        for (const document of uploadedWorkspaceDocuments) {
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

      const nextAllDocuments = [...documentsRef.current, ...uploadedWorkspaceDocuments];
      commitDocuments(nextAllDocuments);

      const newestPdf = uploadedWorkspaceDocuments.find((document) => document.kind === "pdf")
        ?? nextAllDocuments.find((document) => document.kind === "pdf")
        ?? null;

      setPreviewOutputId("");
      setPreviewDocumentId(uploadedWorkspaceDocuments[0]?.id ?? nextAllDocuments[0]?.id ?? "");

      if (newestPdf) {
        setActivePdfId(newestPdf.id);
        setPageSequence(buildPageSequence(newestPdf.pageCount));
      }

      setToolkitMessage(
        previewMode
          ? `${uploadedWorkspaceDocuments.length} file${uploadedWorkspaceDocuments.length === 1 ? "" : "s"} added for ${selectedToolDefinition.shortLabel.toLowerCase()}.`
          : `${uploadedWorkspaceDocuments.length} file${uploadedWorkspaceDocuments.length === 1 ? "" : "s"} uploaded, saved, and ready for ${selectedToolDefinition.shortLabel.toLowerCase()}.`,
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

    const currentDocuments = documentsRef.current;
    const documentToRemove = currentDocuments.find((document) => document.id === documentId);

    if (documentToRemove) {
      URL.revokeObjectURL(documentToRemove.previewUrl);
    }

    const nextDocuments = currentDocuments.filter((document) => document.id !== documentId);
    commitDocuments(nextDocuments);

    if (previewDocumentId === documentId) {
      setPreviewDocumentId(nextDocuments[0]?.id ?? "");
    }

    if (activePdfId === documentId) {
      const nextPdf = nextDocuments.find((document) => document.kind === "pdf") ?? null;
      setActivePdfId(nextPdf?.id ?? "");
      setPageSequence(nextPdf ? buildPageSequence(nextPdf.pageCount) : []);
    }

    setToolkitMessage(`${documentToRemove?.file.name ?? storedDocument?.fileName ?? "Document"} removed from the workspace.`);
  }

  async function handleMergeDocuments() {
    if (documents.length < 2) {
      setToolkitMessage("Add at least two files before creating a merged PDF.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Creating merged PDF");
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
        id: crypto.randomUUID(),
        label: "Merged supporting packet",
        url,
        fileName: "visapilot-merged-supporting-docs.pdf",
        createdAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sizeLabel: formatBytes(mergedBytes.length),
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
    if (!activePdf) {
      setToolkitMessage("Choose a PDF document before splitting pages.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Extracting pages");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await activePdf.file.arrayBuffer());
      const selectedPages = parsePageRange(splitRange, source.getPageCount());
      const splitPdf = await PDFDocument.create();
      const copiedPages = await splitPdf.copyPages(source, selectedPages);
      copiedPages.forEach((page) => splitPdf.addPage(page));

      const splitBytes = await splitPdf.save();
      const url = URL.createObjectURL(new Blob([Uint8Array.from(splitBytes)], { type: "application/pdf" }));
      const fileName = `${activePdf.file.name.replace(/\.pdf$/i, "")}-pages-${splitRange.replace(/\s+/g, "")}.pdf`;

      upsertOutput({
        id: crypto.randomUUID(),
        label: `Split pages from ${activePdf.file.name}`,
        url,
        fileName,
        createdAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sizeLabel: formatBytes(splitBytes.length),
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
    if (!activePdf) {
      setToolkitMessage("Choose a PDF document before compressing it.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Compressing PDF");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await activePdf.file.arrayBuffer());
      const compressedPdf = await PDFDocument.create();
      const copiedPages = await compressedPdf.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => compressedPdf.addPage(page));
      compressedPdf.setTitle(activePdf.file.name.replace(/\.pdf$/i, ""));
      compressedPdf.setAuthor("");
      compressedPdf.setSubject("");
      compressedPdf.setKeywords([]);
      compressedPdf.setProducer("VisaPilot");
      compressedPdf.setCreator("VisaPilot");

      const compressedBytes = await compressedPdf.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(compressedBytes)], { type: "application/pdf" }));
      const fileName = `${activePdf.file.name.replace(/\.pdf$/i, "")}-compressed.pdf`;
      const sizeDelta = activePdf.file.size - compressedBytes.length;

      upsertOutput({
        id: crypto.randomUUID(),
        label: `Compressed PDF for ${activePdf.file.name}`,
        url,
        fileName,
        createdAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sizeLabel: formatBytes(compressedBytes.length),
      });

      setToolkitMessage(
        sizeDelta > 0
          ? `Compressed output for ${activePdf.file.name} is ready. Saved ${formatBytes(sizeDelta)}.`
          : `Optimized output for ${activePdf.file.name} is ready. The original file was already compact, so size savings were limited.`,
      );
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to compress the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleRotateDocument() {
    if (!activePdf) {
      setToolkitMessage("Choose a PDF document before rotating pages.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Rotating PDF pages");
    setToolkitMessage(null);

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const rotatedPdf = await PDFDocument.load(await activePdf.file.arrayBuffer());
      const rotation = Number(rotationPreset);
      rotatedPdf.getPages().forEach((page) => page.setRotation(degrees(rotation)));

      const rotatedBytes = await rotatedPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(rotatedBytes)], { type: "application/pdf" }));
      const fileName = `${activePdf.file.name.replace(/\.pdf$/i, "")}-rotated-${rotation}.pdf`;

      upsertOutput({
        id: crypto.randomUUID(),
        label: `Rotated pages for ${activePdf.file.name}`,
        url,
        fileName,
        createdAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sizeLabel: formatBytes(rotatedBytes.length),
      });

      setToolkitMessage(`Rotated all pages in ${activePdf.file.name} by ${rotation} degrees.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to rotate the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleReorderDocument() {
    if (!activePdf) {
      setToolkitMessage("Choose a PDF document before reordering its pages.");
      return;
    }

    if (pageSequence.length !== activePdf.pageCount) {
      setToolkitMessage(`Provide every page exactly once to reorder this ${activePdf.pageCount}-page PDF.`);
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Rebuilding page order");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await activePdf.file.arrayBuffer());
      const reorderedPdf = await PDFDocument.create();
      const copiedPages = await reorderedPdf.copyPages(source, pageSequence.map((pageNumber) => pageNumber - 1));
      copiedPages.forEach((page) => reorderedPdf.addPage(page));

      const reorderedBytes = await reorderedPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(reorderedBytes)], { type: "application/pdf" }));
      const fileName = `${activePdf.file.name.replace(/\.pdf$/i, "")}-reordered.pdf`;

      upsertOutput({
        id: crypto.randomUUID(),
        label: `Reordered pages for ${activePdf.file.name}`,
        url,
        fileName,
        createdAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sizeLabel: formatBytes(reorderedBytes.length),
      });

      setToolkitMessage(`Page order for ${activePdf.file.name} has been rebuilt as ${pageSequence.join(", ")}.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to reorder the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  async function handleSanitizeDocument() {
    if (!activePdf) {
      setToolkitMessage("Choose a PDF document before sanitizing it.");
      return;
    }

    setIsProcessingDocuments(true);
    setProcessingLabel("Sanitizing PDF metadata");
    setToolkitMessage(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(await activePdf.file.arrayBuffer());
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
      const fileName = `${activePdf.file.name.replace(/\.pdf$/i, "")}-sanitized.pdf`;

      upsertOutput({
        id: crypto.randomUUID(),
        label: `Sanitized PDF for ${activePdf.file.name}`,
        url,
        fileName,
        createdAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sizeLabel: formatBytes(sanitizedBytes.length),
      });

      setToolkitMessage(`Sanitized output for ${activePdf.file.name} is ready.`);
    } catch (error) {
      setToolkitMessage(error instanceof Error ? error.message : "Unable to sanitize the selected PDF.");
    } finally {
      setIsProcessingDocuments(false);
      setProcessingLabel(null);
    }
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleDocumentDropReorder(targetDocumentId: string) {
    if (!draggedDocumentId || draggedDocumentId === targetDocumentId) {
      return;
    }

    const currentDocuments = documentsRef.current;
    const fromIndex = currentDocuments.findIndex((document) => document.id === draggedDocumentId);
    const targetIndex = currentDocuments.findIndex((document) => document.id === targetDocumentId);

    if (fromIndex < 0 || targetIndex < 0) {
      return;
    }

    commitDocuments(reorderItems(currentDocuments, fromIndex, targetIndex));
    setToolkitMessage("Document order updated for the merge export.");
  }

  function handlePageDropReorder(targetPageNumber: number) {
    if (!draggedPageNumber || draggedPageNumber === targetPageNumber) {
      return;
    }

    setPageSequence((currentSequence) => {
      const fromIndex = currentSequence.findIndex((pageNumber) => pageNumber === draggedPageNumber);
      const targetIndex = currentSequence.findIndex((pageNumber) => pageNumber === targetPageNumber);

      if (fromIndex < 0 || targetIndex < 0) {
        return currentSequence;
      }

      return reorderItems(currentSequence, fromIndex, targetIndex);
    });
  }

  function renderMergeWorkbench() {
    if (documents.length === 0) {
      return (
        <div className="rounded-[1.1rem] border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-slate-400">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[1rem] bg-white/5 text-slate-300">
            <Layers3 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-semibold text-white">Add the files you want to merge</p>
          <p className="mx-auto mt-2 max-w-lg leading-6 text-slate-400">
            Start with passports, bookings, insurance, bank statements, or employer letters. After upload, drag them into the final consular order.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Merge order</p>
            <p className="mt-1 text-sm text-slate-400">Drag cards up or down to control the exported stack.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleMergeDocuments()}
            disabled={isProcessingDocuments || documents.length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Layers3 className="h-4 w-4" />
            Create merged PDF
          </button>
        </div>

        <div className="space-y-3">
          {documents.map((document, index) => (
            <div
              key={document.id}
              draggable
              onDragStart={() => setDraggedDocumentId(document.id)}
              onDragEnd={() => setDraggedDocumentId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDocumentDropReorder(document.id)}
              className="rounded-[1rem] border border-white/10 bg-black/40 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{index + 1}. {document.file.name}</p>
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
                    onClick={() => syncDocumentSelection(document.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
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
                  <button
                    type="button"
                    onClick={() => void removeDocument(document.id)}
                    className="inline-flex items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSinglePdfSelector() {
    return (
      <div className="space-y-3 rounded-[1rem] border border-white/10 bg-black/30 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Working PDF</p>
            <p className="mt-1 text-sm text-slate-400">Pick the PDF you want to edit for this operation.</p>
          </div>
          <select
            value={activePdfId}
            onChange={(event) => syncDocumentSelection(event.target.value)}
            className="min-w-[240px] rounded-full border border-white/12 bg-[#161616] px-4 py-2 text-sm text-white outline-none transition focus:border-white/30"
          >
            <option value="">Choose a PDF</option>
            {pdfDocuments.map((document) => (
              <option key={document.id} value={document.id}>{document.file.name}</option>
            ))}
          </select>
        </div>

        {!activePdf ? (
          <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-slate-400">
            Upload a PDF for {selectedToolDefinition.shortLabel.toLowerCase()} to unlock this workspace.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-[0.9rem] border border-white/10 bg-[#141414] px-4 py-3 text-sm text-slate-300">
            <span className="font-semibold text-white">{activePdf.file.name}</span>
            <span>{activePdf.pageCount} {activePdf.pageCount === 1 ? "page" : "pages"}</span>
            <span>{formatBytes(activePdf.file.size)}</span>
          </div>
        )}
      </div>
    );
  }

  function renderSplitWorkbench() {
    return (
      <div className="space-y-4">
        {renderSinglePdfSelector()}
        <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-white">
            <Scissors className="h-4 w-4 text-rose-400" />
            Extract page range
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use ranges like 1-3, 5 or 2,4,8. The result opens in preview and lands in Generated Files for download.
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="flex-1">
              <span className="text-sm font-medium text-slate-200">Page range</span>
              <input
                value={splitRange}
                onChange={(event) => setSplitRange(event.target.value)}
                placeholder="1-3"
                className="mt-2 w-full rounded-xl border border-white/12 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSplitDocument()}
              disabled={isProcessingDocuments || !activePdf}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Extract pages
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCompressWorkbench() {
    return (
      <div className="space-y-4">
        {renderSinglePdfSelector()}
        <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-white">
            <Minimize className="h-4 w-4 text-emerald-400" />
            Create lighter PDF
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            VisaPilot rebuilds the uploaded PDF into a cleaner export suited for portal limits while keeping the pages intact.
          </p>
          {activePdf ? (
            <div className="mt-4 rounded-[0.9rem] border border-white/10 bg-[#141414] px-4 py-3 text-sm text-slate-300">
              Current file size: <span className="font-semibold text-white">{formatBytes(activePdf.file.size)}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCompressDocument()}
            disabled={isProcessingDocuments || !activePdf}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create compressed PDF
          </button>
        </div>
      </div>
    );
  }

  function renderRotateWorkbench() {
    return (
      <div className="space-y-4">
        {renderSinglePdfSelector()}
        <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-white">
            <RotateCw className="h-4 w-4 text-amber-400" />
            Choose rotation angle
          </h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["90", "180", "270"] as RotationPreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRotationPreset(preset)}
                className={rotationPreset === preset
                  ? "rounded-[1rem] border border-amber-300/40 bg-amber-500/15 px-4 py-4 text-sm font-semibold text-white"
                  : "rounded-[1rem] border border-white/10 bg-[#141414] px-4 py-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"}
              >
                Rotate {preset}°
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleRotateDocument()}
            disabled={isProcessingDocuments || !activePdf}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply rotation
          </button>
        </div>
      </div>
    );
  }

  function renderReorderWorkbench() {
    const previewMap = new Map(pagePreviews.map((preview) => [preview.pageNumber, preview.url]));

    return (
      <div className="space-y-4">
        {renderSinglePdfSelector()}
        <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                <ArrowDownUp className="h-4 w-4 text-violet-400" />
                Drag pages into final order
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Rearrange page tiles to match the final embassy packet. Use Reset if you want to restore the original order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => activePdf ? setPageSequence(buildPageSequence(activePdf.pageCount)) : undefined}
              disabled={!activePdf}
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#161616] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 disabled:opacity-50"
            >
              Reset order
            </button>
          </div>

          {isPreparingPageBoard ? (
            <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-indigo-300/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Preparing page previews...
            </div>
          ) : !activePdf ? (
            <div className="mt-4 rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-slate-400">
              Upload and choose a PDF to build the reorder board.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageSequence.map((pageNumber, index) => (
                <div
                  key={`${pageNumber}-${index}`}
                  draggable
                  onDragStart={() => setDraggedPageNumber(pageNumber)}
                  onDragEnd={() => setDraggedPageNumber(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handlePageDropReorder(pageNumber)}
                  className="rounded-[1rem] border border-white/10 bg-[#141414] p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Position {index + 1}</p>
                      <p className="text-sm font-semibold text-white">Page {pageNumber}</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="overflow-hidden rounded-[0.8rem] border border-white/10 bg-white">
                    {previewMap.get(pageNumber) ? (
                      <iframe
                        src={previewMap.get(pageNumber)}
                        title={`Page ${pageNumber}`}
                        className="h-[220px] w-full bg-white"
                      />
                    ) : (
                      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">Page preview unavailable</div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => movePage(pageNumber, -1)}
                      disabled={index === 0}
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-white/12 bg-[#101010] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30 disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePage(pageNumber, 1)}
                      disabled={index === pageSequence.length - 1}
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-white/12 bg-[#101010] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30 disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleReorderDocument()}
            disabled={isProcessingDocuments || !activePdf || pageSequence.length === 0}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create reordered PDF
          </button>
        </div>
      </div>
    );
  }

  function renderSanitizeWorkbench() {
    return (
      <div className="space-y-4">
        {renderSinglePdfSelector()}
        <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-white">
            <Shield className="h-4 w-4 text-slate-300" />
            Remove metadata before submission
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            This export strips metadata such as author, subject, language, and other editing traces while preserving the page content.
          </p>
          <button
            type="button"
            onClick={() => void handleSanitizeDocument()}
            disabled={isProcessingDocuments || !activePdf}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create sanitized PDF
          </button>
        </div>
      </div>
    );
  }

  function renderActiveToolWorkbench() {
    switch (selectedTool) {
      case "merge":
        return renderMergeWorkbench();
      case "split":
        return renderSplitWorkbench();
      case "compress":
        return renderCompressWorkbench();
      case "reorder":
        return renderReorderWorkbench();
      case "rotate":
        return renderRotateWorkbench();
      case "sanitize":
        return renderSanitizeWorkbench();
      default:
        return null;
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
                <Upload className="h-3.5 w-3.5" />
                PDF Editor
              </div>
              <h4 className="mt-3 text-lg font-semibold text-white">Operation-first PDF workspace</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Start by choosing what you want to do. VisaPilot then narrows the upload, preview, and export flow around that single job.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Choose tool, upload, configure, export
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {toolDefinitions.map((tool) => {
              const Icon = tool.icon;

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedTool(tool.id)}
                  className={selectedTool === tool.id
                    ? `rounded-[1.1rem] border p-4 text-left transition ${tool.accentClass}`
                    : "rounded-[1.1rem] border border-white/10 bg-black/30 p-4 text-left text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03]"}
                >
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tool.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-white">{tool.label}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{tool.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Step 2</p>
              <h4 className="mt-2 text-lg font-semibold text-white">{selectedToolDefinition.uploadTitle}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selectedToolDefinition.uploadDescription}</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple={selectedToolDefinition.multiple}
              accept={selectedToolDefinition.accept}
              className="hidden"
              onChange={(event) => void handleDocumentUpload(event.target.files)}
            />
          </div>

          <button
            type="button"
            onClick={openFilePicker}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleDroppedFiles(event.dataTransfer.files);
            }}
            disabled={isProcessingDocuments}
            className={`mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-[1.3rem] border-2 border-dashed px-4 py-8 text-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${selectedTool === "merge" ? "border-blue-300/35 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15" : "border-indigo-300/35 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"}`}
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white text-slate-900 shadow-sm shadow-black/20">
              <CloudUpload className="h-8 w-8" />
            </span>
            <span className="text-base font-semibold text-white">
              {selectedTool === "merge" ? "Drop files here or choose files" : "Drop a PDF here or choose a PDF"}
            </span>
            <span className="max-w-xl text-sm font-medium leading-6">
              {isProcessingDocuments
                ? "Preparing your files..."
                : selectedToolDefinition.multiple
                  ? "PDF, PNG, JPEG, and WEBP files are supported for merge mode."
                  : "Only PDF files are accepted for this operation."}
            </span>
          </button>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Zap className="h-3.5 w-3.5" />
            Step 3 Workspace
          </div>

          {processingLabel ? (
            <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-indigo-300/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {processingLabel}...
            </div>
          ) : null}

          {toolkitMessage ? (
            <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200">
              {toolkitMessage}
            </div>
          ) : null}

          <div className="mt-4">
            {renderActiveToolWorkbench()}
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

      <div className="space-y-4">
        {outputs.length > 0 ? (
          <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">Step 4 Generated Files</div>
                <p className="mt-2 text-sm leading-6 text-emerald-100/90">
                  Every export lands here with preview and download actions. The newest result is selected automatically.
                </p>
              </div>
              <span className="inline-flex rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {outputs.length} Export{outputs.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {outputs.map((output) => (
                <div key={output.id} className={`flex flex-col gap-3 rounded-[1rem] border p-4 sm:flex-row sm:items-center sm:justify-between ${previewOutputId === output.id ? "border-white/30 bg-black/40" : "border-white/10 bg-black/25"}`}>
                  <div>
                    <p className="text-sm font-semibold text-white">{output.label}</p>
                    <p className="mt-1 text-sm text-emerald-50/85">{output.fileName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-100/75">{output.sizeLabel} · generated {output.createdAtLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewOutputId(output.id)}
                      className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#161616] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30"
                    >
                      Preview result
                    </button>
                    <a href={output.url} download={output.fileName} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100">
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => removeOutput(output.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              <Download className="h-3.5 w-3.5" />
              Step 4 Generated Files
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Your processed PDFs will appear here after each operation, with the newest result opened automatically in preview.
            </p>
          </div>
        )}

        <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Eye className="h-3.5 w-3.5" />
                Live preview
              </div>
              <select
                value={previewOutputId ? "" : previewDocumentId}
                onChange={(event) => syncDocumentSelection(event.target.value)}
                className="min-w-[220px] rounded-full border border-white/12 bg-[#161616] px-4 py-2 text-sm text-white outline-none transition focus:border-white/30"
              >
                <option value="">Choose uploaded file</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>{document.file.name}</option>
                ))}
              </select>
            </div>

            <div className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
              {previewOutput
                ? `Previewing generated file: ${previewOutput.fileName}.`
                : previewDocument
                  ? `Previewing uploaded file: ${previewDocument.file.name}.`
                  : selectedTool === "merge"
                    ? "Choose Merge PDF first, upload at least two files, and the preview will track your selected item."
                    : `Choose ${selectedToolDefinition.label}, upload one PDF, and the preview will open it here.`}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-black/50">
            {previewOutput ? (
              <iframe
                src={previewOutput.url}
                title={previewOutput.fileName}
                className="h-[520px] w-full bg-white"
              />
            ) : previewDocument ? (
              previewDocument.kind === "pdf" ? (
                <iframe
                  src={previewDocument.previewUrl}
                  title={previewDocument.file.name}
                  className="h-[520px] w-full bg-white"
                />
              ) : (
                <div className="flex min-h-[520px] items-center justify-center bg-black/70 p-4">
                  <Image
                    src={previewDocument.previewUrl}
                    alt={previewDocument.file.name}
                    width={900}
                    height={1200}
                    unoptimized
                    className="max-h-[490px] w-auto rounded-[0.8rem] object-contain"
                  />
                </div>
              )
            ) : (
              <div className="flex min-h-[520px] items-center justify-center px-4 text-center text-sm text-slate-400">
                The preview opens here after you choose a tool and upload a file.
              </div>
            )}
          </div>
        </div>

        {selectedTool !== "merge" && activePdf ? (
          <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              Active PDF snapshot
            </div>
            <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/30 px-4 py-4 text-sm text-slate-300">
              <p><span className="font-semibold text-white">File:</span> {activePdf.file.name}</p>
              <p className="mt-2"><span className="font-semibold text-white">Pages:</span> {activePdf.pageCount}</p>
              <p className="mt-2"><span className="font-semibold text-white">Size:</span> {formatBytes(activePdf.file.size)}</p>
              {selectedTool === "rotate" ? <p className="mt-2"><span className="font-semibold text-white">Angle:</span> {rotationPreset}°</p> : null}
              {selectedTool === "split" ? <p className="mt-2"><span className="font-semibold text-white">Range:</span> {splitRange}</p> : null}
              {selectedTool === "reorder" ? <p className="mt-2"><span className="font-semibold text-white">Current order:</span> {pageSequence.join(", ")}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
