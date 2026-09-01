import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { consularSourceManifest } from "../config/consular-source-manifest";

type ScrapedSnapshot = {
  scrapedAt: string;
  sources: Array<{
    id: string;
    label: string;
    url: string;
    parserHint: string;
    title: string;
    bodyPreview: string;
  }>;
};

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const sources: ScrapedSnapshot["sources"] = [];

    for (const source of consularSourceManifest) {
      const page = await browser.newPage();

      try {
        await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45000 });
        const title = await page.title();
        const bodyPreview = await page.locator("body").innerText();

        sources.push({
          ...source,
          title,
          bodyPreview: bodyPreview.replace(/\s+/g, " ").trim().slice(0, 2500),
        });
      } finally {
        await page.close();
      }
    }

    const snapshot: ScrapedSnapshot = {
      scrapedAt: new Date().toISOString(),
      sources,
    };

    const outputDirectory = path.resolve(process.cwd(), "data", "consular-rules");
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, "latest.json"),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8",
    );

    console.log(`Saved ${sources.length} consular source snapshots to data/consular-rules/latest.json`);
  } finally {
    await browser.close();
  }
}

void main();