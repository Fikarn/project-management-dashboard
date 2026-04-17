import https from "node:https";

import { readPackageJson, resolveReleaseTag, resolveRepositoryHttpUrl } from "./helpers.mjs";

const REQUIRED_ASSETS = [
  "SSE-ExEd-Studio-Control-Native-macOS-Installer.zip",
  "SSE-ExEd-Studio-Control-Native-windows-Installer.exe",
  "SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip",
  "SSE-ExEd-Studio-Control-Native-windows-UpdateRepository.zip",
  "SSE-ExEd-Studio-Control-Native-macOS-SHA256.txt",
  "SSE-ExEd-Studio-Control-Native-windows-SHA256.txt",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveRepoSlug() {
  const repoUrl = resolveRepositoryHttpUrl(readPackageJson());
  assert(repoUrl, "Could not resolve the GitHub repository URL from package.json.");

  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:#.*)?$/);
  assert(match, `Unsupported repository URL '${repoUrl}'. Expected an https://github.com/<owner>/<repo> URL.`);

  return {
    owner: match[1],
    repo: match[2],
  };
}

function requestJson(pathname) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.github.com",
        method: "GET",
        path: pathname,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "sse-exed-release-anchor-check",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          const statusCode = response.statusCode ?? 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(
                `GitHub API request failed with status ${statusCode}: ${body.trim() || "no response body returned"}`
              )
            );
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Failed to parse GitHub API response JSON: ${error.message}`));
          }
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
}

async function main() {
  const tag = resolveReleaseTag();
  const expectedPrerelease = tag.includes("-");
  const { owner, repo } = resolveRepoSlug();
  const release = await requestJson(`/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`);

  assert(release.tag_name === tag, `GitHub release tag mismatch: expected '${tag}', found '${release.tag_name}'.`);
  assert(release.draft === false, `GitHub release ${tag} is still a draft.`);
  assert(
    release.prerelease === expectedPrerelease,
    `GitHub release ${tag} prerelease flag mismatch: expected ${expectedPrerelease}, found ${release.prerelease}.`
  );

  const publishedUrl = release.html_url;
  const assetNames = new Set((release.assets ?? []).map((asset) => asset.name));
  const missingAssets = REQUIRED_ASSETS.filter((assetName) => !assetNames.has(assetName));

  assert(
    missingAssets.length === 0,
    `GitHub release ${tag} is missing required native artifacts: ${missingAssets.join(", ")}`
  );

  console.log(`Verified GitHub release anchor for ${tag}`);
  console.log(`- release url: ${publishedUrl}`);
  console.log(`- published at: ${release.published_at ?? "unknown"}`);
  console.log(`- prerelease: ${release.prerelease}`);
  console.log("- required artifacts:");
  for (const assetName of REQUIRED_ASSETS) {
    console.log(`  - ${assetName}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
