import { FileImage, FileText } from "lucide-react";
import { buildSupportingDocumentDownloadPath } from "@/lib/documents/supportingDocuments";
import type { SupportingDocument } from "@/types";

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportingDocumentsVault({
  applicationId,
  documents,
  previewMode,
}: {
  applicationId: string;
  documents: SupportingDocument[];
  previewMode: boolean;
}) {
  return (
    <div className="glass-panel p-6 shadow-panel sm:p-8">
      <div className="space-y-2">
        <p className="eyebrow">Supporting documents</p>
        <h2 className="text-2xl font-semibold text-white">Saved packet attachments</h2>
        <p className="text-sm leading-6 text-slate-300">
          These are the uploaded documents tied to this application packet and kept in the same order you prepared in the builder.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {documents.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/30 px-4 py-5 text-sm text-slate-400">
            No supporting documents were saved with this packet.
          </div>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="flex flex-col gap-3 rounded-[1rem] border border-white/10 bg-[#101010] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white/10 p-2 text-white">
                  {document.kind === "pdf" ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{document.fileName}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {document.pageCount} {document.pageCount === 1 ? "page" : "pages"} · {formatBytes(document.sizeBytes)}
                  </p>
                </div>
              </div>
              {previewMode ? (
                <span className="inline-flex items-center justify-center rounded-full border border-white/12 bg-[#151515] px-3 py-2 text-xs font-semibold text-slate-300">
                  Preview sample
                </span>
              ) : (
                <a
                  href={buildSupportingDocumentDownloadPath(applicationId, document.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Open document
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}