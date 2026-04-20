import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "dashboard-about-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open
    readonly property bool controllerReady: !!engineController
    readonly property bool packagedRuntime: Qt.application.arguments.length > 0
                                           && Qt.application.arguments[0].indexOf(".app/Contents/MacOS/") !== -1

    ConsoleTheme {
        id: theme
    }

    function closeDialog() {
        rootWindow.aboutDialogVisible = false
    }

    function versionValue() {
        if (Qt.application.version && Qt.application.version.length > 0) {
            return Qt.application.version
        }

        if (root.controllerReady && engineController.engineVersion.length > 0) {
            return engineController.engineVersion
        }

        return "Development mode"
    }

    function platformValue() {
        switch (Qt.platform.os) {
        case "osx":
            return "macOS"
        case "windows":
            return "Windows"
        case "linux":
            return "Linux"
        default:
            return Qt.platform.os
        }
    }

    function buildValue() {
        return root.packagedRuntime ? "Packaged desktop app" : "Development runtime"
    }

    function openAtLoginValue() {
        return "Disabled"
    }

    function updatesMessage() {
        if (!root.packagedRuntime) {
            return "Desktop update controls are available only in the packaged app."
        }

        return "Update status is not yet available in the current native shell."
    }

    function quitBehaviorValue() {
        return "Closing the main window quits the app."
    }

    anchors.fill: parent
    visible: open
    z: 60

    Rectangle {
        objectName: "dashboard-about-backdrop"
        anchors.fill: parent
        color: theme.overlayScrim
        opacity: 0.82

        MouseArea {
            objectName: "dashboard-about-backdrop-hit"
            anchors.fill: parent
            onClicked: root.closeDialog()
        }
    }

    ConsoleSurface {
        objectName: "dashboard-about-surface"
        anchors.centerIn: parent
        width: Math.min(452, parent ? parent.width - 56 : 452)
        height: aboutColumn.implicitHeight + theme.spacing7 * 2
        tone: "modal"
        padding: theme.spacing7

        ColumnLayout {
            id: aboutColumn
            anchors.fill: parent
            spacing: theme.spacing6

            ColumnLayout {
                width: parent.width
                spacing: 4

                Label {
                    text: "About"
                    color: Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.82)
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    font.weight: Font.DemiBold
                    font.letterSpacing: 1.6
                }

                Label {
                    text: "SSE ExEd Studio Control"
                    color: theme.studio050
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textMd
                    font.weight: Font.DemiBold
                }

                Label {
                    Layout.fillWidth: true
                    text: "Version and update status for the installed desktop app."
                    color: theme.studio400
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXs
                    wrapMode: Text.WordWrap
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: theme.spacing3

                Repeater {
                    model: [
                        { "label": "Version", "value": root.versionValue() },
                        { "label": "Platform", "value": root.platformValue() },
                        { "label": "Build", "value": root.buildValue() },
                        { "label": "Open at login", "value": root.openAtLoginValue() }
                    ]

                    Rectangle {
                        required property var modelData

                        Layout.fillWidth: true
                        implicitHeight: 38
                        radius: theme.radiusCard
                        color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.72)
                        border.width: 1
                        border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.92)

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: theme.spacing6
                            anchors.rightMargin: theme.spacing6
                            spacing: theme.spacing5

                            Label {
                                text: modelData.label
                                color: theme.studio400
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXs
                                Layout.fillWidth: true
                            }

                            Label {
                                text: modelData.value
                                color: theme.studio200
                                font.family: modelData.label === "Version" ? theme.monoFontFamily : theme.uiFontFamily
                                font.pixelSize: theme.textXs
                                font.weight: Font.Medium
                            }
                        }
                    }
                }
            }

            ConsoleButton {
                objectName: "dashboard-about-open-at-login"
                text: "Enable open at login"
                tone: "secondary"
                dense: true
                enabled: false
            }

            Rectangle {
                Layout.fillWidth: true
                radius: theme.radiusCard
                color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.48)
                border.width: 1
                border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.82)
                implicitHeight: updatesColumn.implicitHeight + theme.spacing6 * 2

                ColumnLayout {
                    id: updatesColumn
                    anchors.fill: parent
                    anchors.margins: theme.spacing6
                    spacing: theme.spacing4

                    Label {
                        text: "UPDATES"
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXxs
                        font.weight: Font.DemiBold
                        font.letterSpacing: 1.2
                    }

                    Label {
                        Layout.fillWidth: true
                        text: root.updatesMessage()
                        color: theme.studio400
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXs
                        wrapMode: Text.WordWrap
                    }

                    ConsoleButton {
                        objectName: "dashboard-about-check-updates"
                        text: "Check for updates"
                        tone: "primary"
                        dense: true
                        enabled: false
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                radius: theme.radiusCard
                color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.48)
                border.width: 1
                border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.82)
                implicitHeight: quitColumn.implicitHeight + theme.spacing6 * 2

                ColumnLayout {
                    id: quitColumn
                    anchors.fill: parent
                    anchors.margins: theme.spacing6
                    spacing: theme.spacing4

                    Label {
                        text: "QUIT BEHAVIOR"
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXxs
                        font.weight: Font.DemiBold
                        font.letterSpacing: 1.2
                    }

                    Label {
                        Layout.fillWidth: true
                        text: root.quitBehaviorValue()
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXxs
                        wrapMode: Text.WordWrap
                    }
                }
            }
        }
    }
}
