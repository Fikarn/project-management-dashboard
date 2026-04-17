import { assert } from "./native-runtime-harness.mjs";

function parseSqliteVersion(value) {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+)\.(\d+)\.(\d+)$/);
  assert(match, `Unsupported SQLite version '${value}'.`);
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

export function isSafeBundledSqliteVersion(value) {
  const version = parseSqliteVersion(value);

  if (version.major > 3) {
    return true;
  }

  if (version.major < 3) {
    return false;
  }

  if (version.minor > 51) {
    return true;
  }

  if (version.minor === 51) {
    return version.patch >= 3;
  }

  if (version.minor === 50) {
    return version.patch >= 7;
  }

  if (version.minor === 44) {
    return version.patch >= 6;
  }

  return false;
}

export async function assertSafeBundledSqlite(harness, requestIdPrefix, runtimeLabel) {
  const healthSnapshot = await harness.request(`${requestIdPrefix}-health`, "health.snapshot");
  const sqliteVersion =
    healthSnapshot?.checks?.storage?.sqliteVersion ?? healthSnapshot?.details?.storage?.sqliteVersion ?? null;

  assert(sqliteVersion, `${runtimeLabel} did not expose checks.storage.sqliteVersion in health.snapshot.`);
  assert(
    isSafeBundledSqliteVersion(sqliteVersion),
    `${runtimeLabel} bundles SQLite ${sqliteVersion}. Native release qualification requires SQLite 3.51.3+ or the documented backports 3.50.7 / 3.44.6 because the WAL-reset bug affects versions 3.7.0 through 3.51.2.`
  );

  return sqliteVersion;
}
