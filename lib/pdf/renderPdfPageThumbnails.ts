export type RenderedPdfPageThumbnail = {
  pageNumber: number;
  url: string;
};

export async function renderPdfPageThumbnails(file: File): Promise<RenderedPdfPageThumbnail[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  } as never);
  const pdf = await loadingTask.promise;
  const thumbnails: RenderedPdfPageThumbnail[] = [];

  try {
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.2, 220 / viewport.width);
      const scaledViewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas 2D context is unavailable for PDF thumbnail rendering.");
      }

      canvas.width = Math.ceil(scaledViewport.width);
      canvas.height = Math.ceil(scaledViewport.height);
      await page.render({ canvas, canvasContext: context, viewport: scaledViewport } as never).promise;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.92);
      });

      if (!blob) {
        throw new Error("Unable to build a PDF thumbnail blob.");
      }

      thumbnails.push({
        pageNumber: index,
        url: URL.createObjectURL(blob),
      });
    }
  } finally {
    await pdf.cleanup();
    await loadingTask.destroy();
  }

  return thumbnails;
}