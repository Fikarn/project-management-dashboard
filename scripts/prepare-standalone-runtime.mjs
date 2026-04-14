import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

function resolveFromRoot(rootDir, ...segments) {
  return path.join(rootDir, ...segments);
}

function copyDirectory(source, destination) {
  if (!existsSync(source)) {
    return false;
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  return true;
}

export function prepareStandaloneRuntime(rootDir = process.cwd()) {
  const standaloneServerPath = resolveFromRoot(rootDir, ".next", "standalone", "server.js");
  const staticDir = resolveFromRoot(rootDir, ".next", "static");
  const standaloneStaticDir = resolveFromRoot(rootDir, ".next", "standalone", ".next", "static");
  const publicDir = resolveFromRoot(rootDir, "public");
  const standalonePublicDir = resolveFromRoot(rootDir, ".next", "standalone", "public");

  if (!existsSync(standaloneServerPath)) {
    throw new Error("Missing .next/standalone/server.js. Run `npm run build` first.");
  }

  if (!copyDirectory(staticDir, standaloneStaticDir)) {
    throw new Error("Missing .next/static. Run `npm run build` first.");
  }

  copyDirectory(publicDir, standalonePublicDir);
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  prepareStandaloneRuntime();
  console.log("Prepared standalone runtime assets.");
}
