import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "setup-workspace-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    readonly property real effectiveScaleFactor: root.widescreenParityMode ? root.scaleFactor * 0.93 : root.scaleFactor
    property string activeSection: "commissioning"
    property bool wideLayout: width >= 800
    property bool widescreenParityMode: width >= 1100
    readonly property real leftRailWidth: root.widescreenParityMode ? 304 : 352
    readonly property var currentPage: root.rootWindow.controlSurfacePageById(root.rootWindow.selectedControlSurfacePageId)

    function currentPageButtonCount() {
        return root.currentPage && root.currentPage.buttons ? root.currentPage.buttons.length : 0
    }

    function currentPageDialCount() {
        if (!root.currentPage || !root.currentPage.dials) {
            return 0
        }

        const positions = {}
        for (let index = 0; index < root.currentPage.dials.length; index += 1) {
            positions[root.currentPage.dials[index].position] = true
        }
        return Object.keys(positions).length
    }

    function contentFitsViewport() {
        return setupContentLayout.implicitHeight * root.effectiveScaleFactor <= setupScrollView.height + 1
    }

    function resetVerifyState() {
        root.activeSection = "commissioning"
        setupGuidePanel.manualVisible = false
        setupInstallerHelpPanel.expanded = false
        if (setupControlSurfacePanel.showPageOverviewForVerify) {
            setupControlSurfacePanel.showPageOverviewForVerify()
        }
        Qt.callLater(function() {
            if (setupScrollView.contentItem) {
                setupScrollView.contentItem.contentY = 0
            }
        })
    }

    function openLegacySupportPanelsForVerify() {
        root.resetVerifyState()
        root.activeSection = "support"
        setupGuidePanel.manualVisible = true
        setupInstallerHelpPanel.expanded = true
        if (setupControlSurfacePanel.showPageOverviewForVerify) {
            setupControlSurfacePanel.showPageOverviewForVerify()
        }
        Qt.callLater(function() {
            if (setupScrollView.contentItem) {
                setupScrollView.contentItem.contentY = 0
            }
        })
    }

    function showSupportSectionForVerify() {
        root.activeSection = "support"
        setupGuidePanel.manualVisible = false
        setupInstallerHelpPanel.expanded = false
    }

    ConsoleTheme {
        id: theme
    }

    visible: !!engineController && engineController.workspaceMode === "setup"
    Layout.fillWidth: true
    Layout.fillHeight: true

    ScrollView {
        id: setupScrollView
        anchors.fill: parent
        clip: true
        contentWidth: availableWidth

        Item {
            width: setupScrollView.availableWidth
            implicitHeight: setupContentLayout.implicitHeight * root.effectiveScaleFactor

            Item {
                width: parent.width / root.effectiveScaleFactor
                implicitHeight: setupContentLayout.implicitHeight
                height: implicitHeight
                scale: root.effectiveScaleFactor
                transformOrigin: Item.TopLeft

                ColumnLayout {
                    id: setupContentLayout
                    width: parent.width
                    spacing: root.widescreenParityMode ? 10 : 12

                    Rectangle {
                        radius: 16
                        color: Qt.rgba(theme.surfaceDefault.r, theme.surfaceDefault.g, theme.surfaceDefault.b, 0.96)
                        border.color: theme.surfaceBorder
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: headerLayout.implicitHeight + (root.widescreenParityMode ? 24 : 30)

                        RowLayout {
                            id: headerLayout
                            anchors.fill: parent
                            anchors.margins: root.widescreenParityMode ? 9 : 12
                            spacing: root.widescreenParityMode ? 8 : 12

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Label {
                                    text: "Commissioning Workspace"
                                    color: theme.accentPrimary
                                    font.pixelSize: theme.textXxs
                                    font.weight: Font.DemiBold
                                    font.letterSpacing: 1.1
                                }

                                Label {
                                    text: "Control surface setup"
                                    color: theme.studio050
                                    font.pixelSize: root.widescreenParityMode ? theme.textLg : theme.textXl
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    text: "Commission Bitfocus Companion and Stream Deck+ as a fixed studio console. This workspace is tuned for import-first setup, fast verification, and no-scroll use at 1920x1080."
                                    color: theme.studio300
                                    font.pixelSize: root.widescreenParityMode ? theme.textXs : theme.textSm
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                }
                            }

                            ConsoleButton {
                                text: "Back to Console"
                                Layout.alignment: Qt.AlignTop
                                dense: root.widescreenParityMode
                                tone: "ghost"
                                enabled: root.engineController.startupTargetSurface === "dashboard"
                                onClicked: root.engineController.setWorkspaceMode("planning")
                            }

                            GridLayout {
                                Layout.preferredWidth: root.wideLayout ? (root.widescreenParityMode ? 394 : 432) : 180
                                columns: 3
                                columnSpacing: root.widescreenParityMode ? 7 : 10
                                rowSpacing: root.widescreenParityMode ? 7 : 10

                                Rectangle {
                                    radius: 11
                                    color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
                                    border.color: theme.surfaceBorder
                                    border.width: 1
                                    Layout.preferredWidth: root.wideLayout ? (root.widescreenParityMode ? 148 : 164) : 196
                                    implicitHeight: root.widescreenParityMode ? 80 : 92

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: root.widescreenParityMode ? 7 : 10
                                        spacing: 1

                                        Label { text: "Deck Pages"; color: theme.studio500; font.pixelSize: theme.textXxs }
                                        Label {
                                            text: engineController.controlSurfacePages.length
                                            color: theme.studio050
                                            font.pixelSize: root.widescreenParityMode ? theme.textLg : theme.textXl
                                            font.weight: Font.DemiBold
                                        }
                                        Label {
                                            text: "Projects / Tasks / Lights / Audio"
                                            color: theme.studio400
                                            font.pixelSize: theme.textXxs
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 11
                                    color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
                                    border.color: theme.surfaceBorder
                                    border.width: 1
                                    Layout.preferredWidth: root.wideLayout ? (root.widescreenParityMode ? 148 : 164) : 196
                                    implicitHeight: root.widescreenParityMode ? 80 : 92

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: root.widescreenParityMode ? 7 : 10
                                        spacing: 1

                                        Label { text: "Active Page"; color: theme.studio500; font.pixelSize: theme.textXxs }
                                        Label {
                                            text: root.currentPage ? root.currentPage.label : "None"
                                            color: theme.studio050
                                            font.pixelSize: root.widescreenParityMode ? theme.textLg : theme.textXl
                                            font.weight: Font.DemiBold
                                        }
                                        Label {
                                            text: root.currentPageButtonCount() + " buttons, "
                                                  + root.currentPageDialCount() + " dials mapped"
                                            color: theme.studio400
                                            font.pixelSize: theme.textXxs
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 11
                                    color: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.12)
                                    border.color: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.32)
                                    border.width: 1
                                    Layout.preferredWidth: root.wideLayout ? (root.widescreenParityMode ? 148 : 164) : 196
                                    implicitHeight: root.widescreenParityMode ? 80 : 92

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: root.widescreenParityMode ? 7 : 10
                                        spacing: 1

                                        Label { text: "Workflow"; color: theme.accentPrimary; font.pixelSize: theme.textXxs }
                                        Label {
                                            text: "Import first"
                                            color: theme.studio050
                                            font.pixelSize: root.widescreenParityMode ? theme.textLg : theme.textXl
                                            font.weight: Font.DemiBold
                                        }
                                        Label {
                                            text: "Profile download, action test, then manual exceptions"
                                            color: theme.studio300
                                            font.pixelSize: theme.textXxs
                                            wrapMode: Text.WordWrap
                                        }
                                    }
                                }
                            }

                        }
                    }

                    RowLayout {
                        visible: false
                        Layout.fillWidth: true
                        spacing: 8

                        ConsoleButton {
                            objectName: "setup-section-commissioning"
                            text: "Commissioning"
                            tone: "tab"
                            active: root.activeSection === "commissioning"
                            onClicked: root.activeSection = "commissioning"
                        }

                        ConsoleButton {
                            objectName: "setup-section-support"
                            text: "Support"
                            tone: "tab"
                            active: root.activeSection === "support"
                            onClicked: root.activeSection = "support"
                        }
                    }

                    Item {
                        visible: true
                        Layout.fillWidth: true
                        implicitHeight: commissioningLayout.implicitHeight

                        GridLayout {
                            id: commissioningLayout
                            width: parent.width
                            columns: root.wideLayout ? 2 : 1
                            columnSpacing: root.widescreenParityMode ? 10 : 12
                            rowSpacing: root.widescreenParityMode ? 10 : 12

                            ColumnLayout {
                                Layout.alignment: Qt.AlignTop
                                Layout.preferredWidth: root.wideLayout ? root.leftRailWidth : -1
                                Layout.fillWidth: !root.wideLayout
                                spacing: root.widescreenParityMode ? 10 : 12

                                SetupQuickSetupPanel {
                                    rootWindow: root.rootWindow
                                    engineController: root.engineController
                                    denseMode: root.widescreenParityMode
                                }

                                SetupConnectionProbePanel {
                                    rootWindow: root.rootWindow
                                    engineController: root.engineController
                                    denseMode: root.widescreenParityMode
                                }

                                SetupGuidePanel {
                                    id: setupGuidePanel
                                    denseMode: root.widescreenParityMode
                                }

                                SetupInstallerHelpPanel {
                                    id: setupInstallerHelpPanel
                                    denseMode: root.widescreenParityMode
                                }
                            }

                            SetupControlSurfacePanel {
                                id: setupControlSurfacePanel
                                rootWindow: root.rootWindow
                                engineController: root.engineController
                                Layout.alignment: Qt.AlignTop
                                Layout.fillWidth: true
                                Layout.minimumWidth: root.wideLayout ? 760 : 0
                                denseMode: root.widescreenParityMode
                            }
                        }
                    }

                    Item {
                        visible: false
                        Layout.fillWidth: true
                        implicitHeight: supportLayout.implicitHeight

                        GridLayout {
                            id: supportLayout
                            width: parent.width
                            columns: root.width >= 1520 ? 3 : 1
                            columnSpacing: 12
                            rowSpacing: 12

                            Rectangle {
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: backupArchiveLayout.implicitHeight + 24

                                ColumnLayout {
                                    id: backupArchiveLayout
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 8

                                    Label { text: "Backup Archive"; color: "#8ea4c0"; font.pixelSize: 12 }
                                    Label {
                                        text: engineController.supportSnapshotLoaded
                                              ? engineController.supportDetails
                                              : "Support snapshot is waiting for the engine."
                                        color: "#f5f7fb"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: "Backup dir: "
                                              + (engineController.supportBackupDir.length > 0
                                                 ? engineController.supportBackupDir
                                                 : "unavailable")
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: engineController.supportLatestBackupPath.length > 0
                                              ? "Latest archive: " + engineController.supportLatestBackupPath
                                              : "No backup archive has been created yet."
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    RowLayout {
                                        spacing: 8

                                        Button {
                                            text: "Export Backup"
                                            enabled: engineController.operatorUiReady
                                            onClicked: engineController.exportSupportBackup()
                                        }

                                        Button {
                                            text: "Open Backups"
                                            enabled: engineController.supportBackupDir.length > 0
                                            onClicked: engineController.openSupportBackupDirectory()
                                        }

                                        Button {
                                            text: "Refresh"
                                            enabled: engineController.operatorUiReady
                                            onClicked: engineController.requestSupportSnapshot()
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: availableBackupsLayout.implicitHeight + 24

                                ColumnLayout {
                                    id: availableBackupsLayout
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 8

                                    Label { text: "Available Backups"; color: "#8ea4c0"; font.pixelSize: 12 }

                                    Label {
                                        visible: engineController.supportBackupCount === 0
                                        text: "No JSON backup archives are present in the backup directory."
                                        color: "#b4c0cf"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    Repeater {
                                        model: Math.min(engineController.supportBackupFiles.length, 3)

                                        Rectangle {
                                            property var entry: engineController.supportBackupFiles[index]
                                            radius: 10
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: backupEntryLayout.implicitHeight + 18

                                            ColumnLayout {
                                                id: backupEntryLayout
                                                anchors.fill: parent
                                                anchors.margins: 8
                                                spacing: 2

                                                Label {
                                                    text: entry.name
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 11
                                                    font.weight: Font.DemiBold
                                                    wrapMode: Text.WrapAnywhere
                                                    Layout.fillWidth: true
                                                }

                                                Label {
                                                    text: root.rootWindow.formatFileSize(entry.sizeBytes)
                                                          + " | "
                                                          + root.rootWindow.formatUnixTimestamp(entry.modifiedAt)
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: restoreDiagnosticsLayout.implicitHeight + 24

                                ColumnLayout {
                                    id: restoreDiagnosticsLayout
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 8

                                    Label { text: "Restore And Diagnostics"; color: "#8ea4c0"; font.pixelSize: 12 }
                                    Label {
                                        text: engineController.supportSnapshotLoaded
                                              ? engineController.supportRestoreDetails
                                              : "Support restore state is waiting for the engine."
                                        color: "#f5f7fb"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                    TextField {
                                        Layout.fillWidth: true
                                        text: root.rootWindow.supportRestorePathDraft
                                        placeholderText: "Path to backup JSON"
                                        onTextChanged: root.rootWindow.supportRestorePathDraft = text
                                    }
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8

                                        Button {
                                            text: "Restore Backup"
                                            enabled: root.rootWindow.supportRestorePathDraft.trim().length > 0
                                                     && engineController.operatorUiReady
                                            onClicked: engineController.restoreSupportBackup(root.rootWindow.supportRestorePathDraft)
                                        }

                                        Button {
                                            text: "Export Shell Diagnostics"
                                            onClicked: engineController.exportShellDiagnostics()
                                        }
                                    }
                                    Label {
                                        text: engineController.shellDiagnosticsExportPath.length > 0
                                              ? "Shell diagnostics: " + engineController.shellDiagnosticsExportPath
                                              : "No shell diagnostics bundle exported yet."
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                }
                            }

                            Rectangle {
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: installUpdateLayout.implicitHeight + 24

                                ColumnLayout {
                                    id: installUpdateLayout
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 8

                                    Label { text: "Install And Update"; color: "#8ea4c0"; font.pixelSize: 12 }
                                    Label {
                                        text: "Use offline installers or the maintenance-tool update repository instead of background auto-updates."
                                        color: "#f5f7fb"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: "Preferred installer for " + root.rootWindow.hostPlatformLabel() + ": " + root.rootWindow.hostInstallerArtifact()
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: "Update repository archive: " + root.rootWindow.hostUpdateArtifact()
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: "Current engine version: " + engineController.engineVersion + " | Protocol: " + engineController.protocolVersion
                                        color: "#8ea4c0"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                }
                            }

                            Rectangle {
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: runtimePathsLayout.implicitHeight + 24

                                ColumnLayout {
                                    id: runtimePathsLayout
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 8

                                    Label { text: "Runtime Paths"; color: "#8ea4c0"; font.pixelSize: 12 }
                                    Label {
                                        text: "App data: " + engineController.appDataPath
                                        color: "#f5f7fb"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: "Database: " + engineController.databasePath
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    Label {
                                        text: "Logs: " + engineController.logsPath
                                        color: "#8ea4c0"
                                        wrapMode: Text.WrapAnywhere
                                        Layout.fillWidth: true
                                    }
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8

                                        Button {
                                            text: "Open App Data"
                                            onClicked: engineController.openAppDataDirectory()
                                        }

                                        Button {
                                            text: "Open Logs"
                                            onClicked: engineController.openLogsDirectory()
                                        }

                                        Button {
                                            text: "Open Engine Log"
                                            enabled: engineController.engineLogPath.length > 0
                                            onClicked: engineController.openEngineLogFile()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
