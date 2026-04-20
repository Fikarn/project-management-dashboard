import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeBuildScript = path.join(rootDir, "scripts", "native-build.mjs");
const outputRoot = path.join(rootDir, "artifacts", "parity", "native");

const sceneArg = process.argv.find((value) => value.startsWith("--scene="));
const resolutionArg = process.argv.find((value) => value.startsWith("--resolution="));

const sceneFilter = sceneArg ? sceneArg.slice("--scene=".length) : null;
const resolutionFilter = resolutionArg ? resolutionArg.slice("--resolution=".length) : null;

const scenes = [
    "dashboard-idle",
    "planning-populated",
    "planning-empty",
    "project-detail-open",
    "time-report-open",
    "shortcuts-open",
    "about-open",
    "setup-control-selected",
    "setup-control-page-nav",
    "setup-control-dial-selected",
];

const resolutions = [
    { name: "workstation", width: 2560, height: 1440 },
    { name: "minimum", width: 1280, height: 800 },
];

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        stdio: "inherit",
        env: {
            ...process.env,
            ...options.env,
        },
    });

    if (result.error) {
        throw result.error;
    }

    if ((result.status ?? 1) !== 0) {
        process.exit(result.status ?? 1);
    }
}

function resolveShellExecutable() {
    const candidates =
        process.platform === "darwin"
            ? [
                  path.join(
                      rootDir,
                      "native",
                      "build",
                      "qt-shell",
                      "sse_exed_native.app",
                      "Contents",
                      "MacOS",
                      "sse_exed_native"
                  ),
              ]
            : process.platform === "win32"
              ? [
                    path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native.exe"),
                    path.join(rootDir, "native", "build", "qt-shell", "Debug", "sse_exed_native.exe"),
                    path.join(rootDir, "native", "build", "qt-shell", "Release", "sse_exed_native.exe"),
                    path.join(rootDir, "native", "build", "sse_exed_native.exe"),
                ]
              : [
                    path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native"),
                    path.join(rootDir, "native", "build", "sse_exed_native"),
                ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

run("node", [nativeBuildScript]);

const shellExecutable = resolveShellExecutable();
if (!shellExecutable) {
    console.error("Native shell executable not found after build.");
    process.exit(1);
}

const selectedScenes = sceneFilter ? scenes.filter((scene) => scene === sceneFilter) : scenes;
const selectedResolutions = resolutionFilter ? resolutions.filter((entry) => entry.name === resolutionFilter) : resolutions;

if (selectedScenes.length === 0) {
    console.error(`Unknown scene '${sceneFilter}'.`);
    process.exit(1);
}

if (selectedResolutions.length === 0) {
    console.error(`Unknown resolution '${resolutionFilter}'.`);
    process.exit(1);
}

for (const resolution of selectedResolutions) {
    const resolutionDir = path.join(outputRoot, resolution.name);
    mkdirSync(resolutionDir, { recursive: true });

    for (const scene of selectedScenes) {
        const outputPath = path.join(resolutionDir, `${scene}.png`);
        console.log(`[native-parity] Capturing ${scene} at ${resolution.name} -> ${outputPath}`);

        run(
            shellExecutable,
            [
                "--parity-capture-scene",
                scene,
                "--parity-capture-output",
                outputPath,
                "--parity-capture-width",
                String(resolution.width),
                "--parity-capture-height",
                String(resolution.height),
            ],
            {
                env: {
                    QT_QPA_PLATFORM: process.env.QT_QPA_PLATFORM ?? "offscreen",
                    QML_DISABLE_DISK_CACHE: "1",
                    QT_QUICK_CONTROLS_STYLE: "Basic",
                },
            }
        );
    }
}

console.log(`[native-parity] Wrote captures to ${outputRoot}`);
