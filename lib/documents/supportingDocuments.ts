export const supportingDocumentsBucket = "visapilot-supporting-documents";

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function buildSupportingDocumentStoragePath(userId: string, documentId: string, fileName: string): string {
  const safeName = sanitizeSegment(fileName) || "document";
  return `${userId}/${documentId}-${safeName}`;
}

export function buildSupportingDocumentDownloadPath(applicationId: string, documentId: string): string {
  return `/api/applications/${applicationId}/supporting-documents/${documentId}`;
}