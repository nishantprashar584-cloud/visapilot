import { access } from "node:fs/promises";
import path from "node:path";

const requiredTemplatePaths = [
  "public/templates/schengen_universal.pdf",
  "public/templates/schengen_france.pdf",
  "public/templates/schengen_spain.pdf",
  "public/templates/schengen_germany.pdf",
] as const;

const requiredMapPaths = [
  "config/pdf-maps/france.json",
  "config/pdf-maps/spain.json",
  "config/pdf-maps/germany.json",
] as const;

async function exists(relativePath: string): Promise<boolean> {
  try {
    await access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function verifyPaths(pathsToCheck: readonly string[], label: string): Promise<void> {
  const missing: string[] = [];

  for (const relativePath of pathsToCheck) {
    if (!(await exists(relativePath))) {
      missing.push(relativePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required ${label}: ${missing.join(", ")}`);
  }
}

async function main() {
  await verifyPaths(requiredTemplatePaths, "PDF templates");
  await verifyPaths(requiredMapPaths, "PDF map files");
  console.log("Verified core Schengen PDF templates and map files.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "PDF asset verification failed.";
  console.error(message);
  process.exitCode = 1;
});