import { describe, expect, it } from "vitest";

describe("release note formatting", () => {
  it("adds installer and update guidance ahead of the changelog body", async () => {
    const { formatReleaseNotes } = await import("../../scripts/release/helpers.mjs");

    const output = formatReleaseNotes({
      body: "### Added\n\n- Native release artifact verification",
      repoUrl: "https://github.com/Fikarn/project-management-dashboard",
    });

    expect(output).toContain("## Install / Update");
    expect(output).toContain("SSE-ExEd-Studio-Control-Native-windows-Installer.exe");
    expect(output).toContain("SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip");
    expect(output).toContain("SSE-ExEd-Studio-Control-Native-macOS-SHA256.txt");
    expect(output).toContain("Verify downloaded artifacts against the published per-platform `SHA256` manifest");
    expect(output).toContain("## Operator Guidance");
    expect(output).toContain(
      "[Release flow and installer details](https://github.com/Fikarn/project-management-dashboard/blob/main/docs/RELEASE.md)"
    );
    expect(output).toContain("## What's Changed");
    expect(output).toContain("### Added");
    expect(output.indexOf("## Install / Update")).toBeLessThan(output.indexOf("## What's Changed"));
  });
});
