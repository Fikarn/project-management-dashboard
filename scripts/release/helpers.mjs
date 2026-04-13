import fs from "fs";
import path from "path";

function getRootPath(...segments) {
  return path.join(process.cwd(), ...segments);
}

export function readPackageJson() {
  const packageJsonPath = getRootPath("package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

export function readChangelog() {
  return fs.readFileSync(getRootPath("CHANGELOG.md"), "utf8");
}

export function isValidReleaseTag(tag) {
  return /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag);
}

export function resolveReleaseTag(args = process.argv.slice(2)) {
  const packageJson = readPackageJson();
  const defaultTag = `v${packageJson.version}`;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === "--tag") {
      return args[index + 1] ?? defaultTag;
    }
    if (!current.startsWith("--")) {
      return current;
    }
  }

  return process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || defaultTag;
}

export function resolveOutputPath(args = process.argv.slice(2)) {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === "--out") {
      return args[index + 1] ?? null;
    }
  }
  return null;
}

export function extractReleaseSection(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const headings = [];

  lines.forEach((line, index) => {
    const match = line.match(/^## \[(.+?)\](?:\s+—\s+(.+))?$/);
    if (match) {
      headings.push({
        version: match[1],
        date: match[2] ?? null,
        index,
      });
    }
  });

  const latestReleased = headings.find((heading) => heading.version !== "Unreleased") ?? null;
  const target = headings.find((heading) => heading.version === version) ?? null;

  if (!target) {
    throw new Error(`CHANGELOG.md is missing a section for ${version}.`);
  }

  const nextHeadingIndex = headings.find((heading) => heading.index > target.index)?.index ?? lines.length;
  const body = lines
    .slice(target.index + 1, nextHeadingIndex)
    .join("\n")
    .trim();

  if (!body) {
    throw new Error(`CHANGELOG.md section for ${version} is empty.`);
  }

  return {
    body,
    date: target.date,
    latestReleasedVersion: latestReleased?.version ?? null,
  };
}

export function writeOutputFile(outputPath, content) {
  const absolutePath = path.isAbsolute(outputPath) ? outputPath : getRootPath(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}
