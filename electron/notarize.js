// macOS notarization hook — called by electron-builder after signing.
// Skipped automatically when APPLE_ID is not set (local builds, Windows CI).
const { notarize } = require("@electron/notarize");
const APP_BUNDLE_ID = "com.sse.exedstudiocontrol";

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== "darwin") return;
  if (!process.env.APPLE_ID) return;

  const appName = packager.appInfo.productFilename;
  return notarize({
    appBundleId: APP_BUNDLE_ID,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
