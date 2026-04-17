import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "setup-workspace-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    property string activeSection: "commissioning"
    property bool wideLayout: width >= 1660

    function contentFitsViewport() {
        return setupContentLayout.implicitHeight * scaleFactor <= setupScrollView.height + 1
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
            implicitHeight: setupContentLayout.implicitHeight * root.scaleFactor

            Item {
                width: parent.width / root.scaleFactor
                implicitHeight: setupContentLayout.implicitHeight
                height: implicitHeight
                scale: root.scaleFactor
                transformOrigin: Item.TopLeft

                ColumnLayout {
                    id: setupContentLayout
                    width: parent.width
                    spacing: 12

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Button {
                            objectName: "setup-section-commissioning"
                            text: "Commissioning"
                            highlighted: root.activeSection === "commissioning"
                            onClicked: root.activeSection = "commissioning"
                        }

                        Button {
                            objectName: "setup-section-support"
                            text: "Support & Recovery"
                            highlighted: root.activeSection === "support"
                            onClicked: root.activeSection = "support"
                        }
                    }

                    Item {
                        visible: root.activeSection === "commissioning"
                        Layout.fillWidth: true
                        implicitHeight: commissioningLayout.implicitHeight

                        GridLayout {
                            id: commissioningLayout
                            width: parent.width
                            columns: root.wideLayout ? 2 : 1
                            columnSpacing: 12
                            rowSpacing: 12

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 12

                                SetupQuickSetupPanel {
                                    rootWindow: root.rootWindow
                                    engineController: root.engineController
                                }

                                SetupConnectionProbePanel {
                                    rootWindow: root.rootWindow
                                    engineController: root.engineController
                                }

                                SetupGuidePanel {}

                                SetupInstallerHelpPanel {}
                            }

                            SetupControlSurfacePanel {
                                rootWindow: root.rootWindow
                                engineController: root.engineController
                                Layout.fillWidth: true
                            }
                        }
                    }

                    Item {
                        visible: root.activeSection === "support"
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
                                Layout.preferredHeight: 196

                                ColumnLayout {
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
                                Layout.preferredHeight: 196

                                ColumnLayout {
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
                                            implicitHeight: 42

                                            ColumnLayout {
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
                                Layout.preferredHeight: 196

                                ColumnLayout {
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
                                Layout.preferredHeight: 196

                                ColumnLayout {
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
                                Layout.preferredHeight: 196

                                ColumnLayout {
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
