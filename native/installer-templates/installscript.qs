function Component() {
    component.loaded.connect(this, Component.prototype.loaded);
    installer.installationFinished.connect(this, Component.prototype.installationFinished);
}

Component.prototype.loaded = function() {};

Component.prototype.createOperations = function() {
    component.createOperations();
};

Component.prototype.installationFinished = function() {
    try {
        var targetDir = installer.value("TargetDir");
        var platform = systemInfo.productType;
        var isWindows = (platform === "windows");
        var exePath = isWindows
            ? targetDir + "/sse_exed_native.exe"
            : targetDir + "/SSE ExEd Studio Control Native.app/Contents/MacOS/sse_exed_native";
        var logPath = targetDir + "/install-smoke.log";

        var args = [
            exePath,
            "--smoke-test",
            "--smoke-action=startup",
            "--smoke-status-path=" + logPath
        ];

        var result = installer.execute(args[0], args.slice(1), "");

        if (result && result[1] !== 0) {
            var summary =
                "The newly installed studio-control build did not pass the first-launch smoke test. " +
                "Review the diagnostic log at:\n\n" + logPath + "\n\n" +
                "You can still launch the app from the Start Menu, but please report the failure.";
            QMessageBox.warning("smoke.warning", "First-launch check", summary, QMessageBox.Ok);
        }
    } catch (e) {
    }
};
