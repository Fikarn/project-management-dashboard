import { cpSync, mkdirSync } from "fs";
import path from "path";
import { prepareStandaloneRuntime } from "./prepare-standalone-runtime.mjs";

const rootDir = process.cwd();
const resolveFromRoot = (...segments) => path.join(rootDir, ...segments);

function copyFile(source, destination) {
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination);
}

const splashSource = resolveFromRoot("electron", "splash.html");
const splashDestination = resolveFromRoot("dist-electron", "splash.html");

prepareStandaloneRuntime(rootDir);
copyFile(splashSource, splashDestination);

console.log("Prepared Electron runtime assets in standalone and dist-electron.");
