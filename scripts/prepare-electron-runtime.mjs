import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";

const rootDir = process.cwd();

function resolveFromRoot(...segments) {
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

function copyFile(source, destination) {
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination);
}

const standaloneDir = resolveFromRoot(".next", "standalone");
const staticDir = resolveFromRoot(".next", "static");
const standaloneStaticDir = resolveFromRoot(".next", "standalone", ".next", "static");
const publicDir = resolveFromRoot("public");
const standalonePublicDir = resolveFromRoot(".next", "standalone", "public");
const splashSource = resolveFromRoot("electron", "splash.html");
const splashDestination = resolveFromRoot("dist-electron", "splash.html");

if (!existsSync(resolveFromRoot(".next", "standalone", "server.js"))) {
  throw new Error("Missing .next/standalone/server.js. Run `npm run build` first.");
}

if (!copyDirectory(staticDir, standaloneStaticDir)) {
  throw new Error("Missing .next/static. Run `npm run build` first.");
}

copyDirectory(publicDir, standalonePublicDir);
copyFile(splashSource, splashDestination);

console.log("Prepared Electron runtime assets in standalone and dist-electron.");
