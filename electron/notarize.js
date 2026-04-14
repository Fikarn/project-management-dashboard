// macOS notarization hook — called by electron-builder after signing.
// Skipped automatically when APPLE_ID is not set (local builds, Windows CI).
const { notarize } = require("@electron/notarize");
const LEGACY_BUNDLE_ID = "com.projectmanager.app";

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== "darwin") return;
  if (!process.env.APPLE_ID) return;

  const appName = packager.appInfo.productFilename;
  return notarize({
    // Keep the notarized bundle identifier aligned with the packaged app until a
    // dedicated installer/update migration is planned.
    appBundleId: LEGACY_BUNDLE_ID,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
