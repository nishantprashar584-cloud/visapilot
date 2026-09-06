import { expect, test } from "@playwright/test";

test.describe("UI consistency and interaction reliability", () => {
  test("keeps readiness travel-group selection visible after navigation", async ({ page }) => {
    await page.goto("/readiness");

    const soloButton = page.getByRole("button", { name: /solo travel group/i });
    const coupleButton = page.getByRole("button", { name: /couple travel group/i });

    await expect(soloButton).toHaveAttribute("aria-pressed", "true");
    await coupleButton.click();
    await expect(coupleButton).toHaveAttribute("aria-pressed", "true");
    await expect(soloButton).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("heading", { name: /only the trip details needed for a useful first pass/i })).toBeVisible();
    await page.getByRole("button", { name: /^back$/i }).click();

    await expect(coupleButton).toHaveAttribute("aria-pressed", "true");
    await expect(soloButton).toHaveAttribute("aria-pressed", "false");
  });

  test("shows per-button copy feedback in the Smart Form Helper", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => undefined,
        },
      });
    });

    await page.goto("/dashboard/preview-france-tourism/submission-guide?preview=1");

    const copyButton = page.getByRole("button", { name: /copy box 1 surname/i });
    await copyButton.click();

    await expect(copyButton).toHaveText(/copied ✓/i);
    await page.waitForTimeout(2600);
    await expect(copyButton).toHaveText(/^copy$/i);
  });

  test("shows copy failure feedback when clipboard access fails", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("clipboard blocked");
          },
        },
      });
    });

    await page.goto("/dashboard/preview-france-tourism/submission-guide?preview=1");

    const copyButton = page.getByRole("button", { name: /copy box 1 surname/i });
    await copyButton.click();

    await expect(copyButton).toHaveText(/couldn't copy/i);
  });

  test("keeps Step 5 tab state explicit and switches content reliably", async ({ page }) => {
    await page.goto("/apply?preview=1&step=5");

    const bundleTab = page.getByRole("tab", { name: /print-ready visa packet/i });
    const coverLetterTab = page.getByRole("tab", { name: /ai cover letter studio/i });

    await expect(bundleTab).toHaveAttribute("aria-selected", "true");
    await coverLetterTab.click();
    await expect(coverLetterTab).toHaveAttribute("aria-selected", "true");
    await expect(bundleTab).toHaveAttribute("aria-selected", "false");
    await expect(page.getByText(/embassy-facing cover letter/i)).toBeVisible();
  });

  test("keeps the Step 1 voice helper collapsed until the user opens it", async ({ page }) => {
    await page.addInitScript(() => {
      class MockSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = "en-US";
        maxAlternatives = 1;
        onend = null;
        onerror = null;
        onresult = null;

        start() {}

        stop() {}
      }

      Object.defineProperty(window, "webkitSpeechRecognition", {
        configurable: true,
        writable: true,
        value: MockSpeechRecognition,
      });
    });

    await page.goto("/apply?preview=1");

    await expect(page.getByRole("heading", { name: /hands-free form filling/i })).toHaveCount(0);

    const voiceToggle = page.getByRole("button", { name: /tell visapilot about your trip/i });
    await expect(voiceToggle).toHaveAttribute("aria-expanded", "false");
    await voiceToggle.click();

    await expect(voiceToggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: /enable microphone access/i })).toBeVisible();
    await expect(page.getByText(/start with microphone access, then tap any mic button beside a field/i)).toBeVisible();
  });

  test("keeps the dashboard next-best-action card aligned to real preview state", async ({ page }) => {
    await page.goto("/dashboard?preview=1");

    await expect(page.getByRole("heading", { name: /open smart form helper/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open smart form helper/i })).toHaveAttribute("href", /submission-guide\?preview=1$/);
    await expect(page.getByText(/application health/i)).toBeVisible();
    await expect(page.getByText(/application journey/i)).toBeVisible();
    await expect(page.getByText(/case snapshot/i)).toBeVisible();
  });

  test("shows provenance and intelligence surfaces in the Smart Form Helper", async ({ page }) => {
    await page.goto("/dashboard/preview-france-tourism/submission-guide?preview=1");

    await expect(page.getByText(/copy-ready values/i)).toBeVisible();
    await expect(page.getByText(/confirmed by you/i).first()).toBeVisible();
    await page.locator("details").filter({ hasText: /duration of stay/i }).locator("summary").click();
    await expect(page.locator("details[open]").getByText(/calculated automatically/i)).toBeVisible();
  });

  test("shows health, journey, case changes, and timeline in the vault", async ({ page }) => {
    await page.goto("/dashboard/preview-france-tourism/vault?preview=1");

    await expect(page.getByText(/application health/i)).toBeVisible();
    await expect(page.getByText(/next best action/i)).toBeVisible();
    await expect(page.getByText(/application journey/i)).toBeVisible();
    await expect(page.getByText(/application timeline/i)).toBeVisible();
  });
});

test.describe("Mobile overflow smoke checks", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const routes = [
    "/readiness",
    "/apply?preview=1&step=5",
    "/dashboard/preview-france-tourism/submission-guide?preview=1",
  ];

  for (const route of routes) {
    test(`avoids horizontal overflow on ${route}`, async ({ page }) => {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    });
  }
});