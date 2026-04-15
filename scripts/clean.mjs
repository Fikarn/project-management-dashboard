import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  ".next",
  "coverage",
  "dist-electron",
  "native/build",
  "playwright-report",
  "release",
  "test-results",
  "tsconfig.tsbuildinfo",
];

async function removeTarget(relativePath) {
  const targetPath = path.join(rootDir, relativePath);
  await rm(targetPath, { force: true, recursive: true });
  console.log(`removed ${relativePath}`);
}

await Promise.all(targets.map(removeTarget));
