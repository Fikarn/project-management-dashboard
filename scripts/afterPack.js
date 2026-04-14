const { existsSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

exports.default = async function (context) {
  if (process.platform !== "darwin" || context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  if (!existsSync(appPath)) return;

  console.log(`  • ad-hoc signing ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, {
    stdio: "inherit",
  });
};
