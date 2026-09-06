import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function buildPdfFixture(pageLabels: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  pageLabels.forEach((label) => {
    const page = pdf.addPage([595.28, 841.89]);
    page.drawText(label, {
      x: 72,
      y: 760,
      size: 24,
      font,
    });
  });

  return Buffer.from(await pdf.save());
}

test.describe("Step 5 document studio", () => {
  test("switches tabs and completes core Organize PDF actions", async ({ page }) => {
    const primaryPdf = await buildPdfFixture(["Sample Page 1", "Sample Page 2", "Sample Page 3"]);
    const insertedPdf = await buildPdfFixture(["Inserted Evidence Page"]);

    await page.addInitScript(() => {
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        configurable: true,
        value: undefined,
      });
    });

    await page.goto("/apply?preview=1");

    await page.getByRole("button", { name: /save and continue/i }).click();
    await page.getByRole("button", { name: /save and continue/i }).click();
    await page.getByRole("button", { name: /save and continue/i }).click();
    await page.getByRole("button", { name: /continue to document studio/i }).click();

    await expect(page.getByRole("heading", { name: /^document studio$/i }).first()).toBeVisible();

    await page.getByRole("tab", { name: /ai cover letter studio/i }).click();
    await expect(page.getByText(/embassy-facing cover letter/i)).toBeVisible();

    await page.getByRole("tab", { name: /advanced pdf editor/i }).click();
    await expect(page.getByText(/operation-first pdf workspace/i)).toBeVisible();

    await page.getByRole("button", { name: /organize pdf/i }).click();
    await expect(page.getByText(/select a pdf to reorder/i)).toBeVisible();

    await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles({
      name: "organize-sample.pdf",
      mimeType: "application/pdf",
      buffer: primaryPdf,
    });

    await page.getByRole("button", { name: /continue to canvas/i }).click();
    await expect(page.locator("[data-reorder-item-id]")).toHaveCount(3, { timeout: 30000 });

    const boardItems = page.locator("[data-reorder-item-id]");
    await boardItems.nth(0).dragTo(boardItems.nth(2));
    await expect(page.getByText(/reordered pages for/i)).toHaveCount(0);

    await page.getByLabel(/rotate organize-sample\.pdf page 1 right/i).click();
    await page.getByLabel(/delete organize-sample\.pdf page 2/i).click();
    await expect(page.locator("[data-reorder-item-id]")).toHaveCount(2);

    await page.getByRole("button", { name: /insert files at position 2/i }).click();
    await page.locator('input[type="file"][accept="application/pdf,image/png,image/jpeg,image/webp"]').setInputFiles({
      name: "inserted-evidence.pdf",
      mimeType: "application/pdf",
      buffer: insertedPdf,
    });

    await expect(page.locator("[data-reorder-item-id]")).toHaveCount(3, { timeout: 30000 });

    await page.getByRole("button", { name: /export reordered pdf/i }).click();
    await expect(page.getByRole("button", { name: /review export/i })).toBeVisible({ timeout: 30000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: /download file/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/reordered\.pdf$/i);

    await page.getByRole("tab", { name: /vfs checklist & stacking order/i }).click();
    await expect(page.getByText(/interactive stacking visualizer/i)).toBeVisible();

    const packetResponse = await page.request.get("/dashboard/preview-france-tourism/consulate-ready-packet?preview=1");
    expect(packetResponse.ok()).toBeTruthy();
    expect(packetResponse.headers()["content-type"]).toContain("application/pdf");
  });
});