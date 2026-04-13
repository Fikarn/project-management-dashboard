import {
  extractReleaseSection,
  isValidReleaseTag,
  readChangelog,
  readPackageJson,
  resolveReleaseTag,
} from "./helpers.mjs";

const tag = resolveReleaseTag();

if (!isValidReleaseTag(tag)) {
  console.error(`Invalid release tag "${tag}". Expected format vX.Y.Z or vX.Y.Z-prerelease.`);
  process.exit(1);
}

const packageJson = readPackageJson();
const version = tag.slice(1);
const changelog = readChangelog();

if (packageJson.version !== version) {
  console.error(`package.json version mismatch: expected ${version}, found ${packageJson.version}.`);
  process.exit(1);
}

let releaseSection;

try {
  releaseSection = extractReleaseSection(changelog, version);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (releaseSection.latestReleasedVersion !== version) {
  console.error(
    `CHANGELOG.md latest released version is ${releaseSection.latestReleasedVersion ?? "missing"}, expected ${version}.`
  );
  process.exit(1);
}

console.log(`Release metadata validated for ${tag}`);
console.log(`- package.json version: ${packageJson.version}`);
console.log(`- changelog section: ${version}`);
console.log(`- changelog date: ${releaseSection.date ?? "not set"}`);
