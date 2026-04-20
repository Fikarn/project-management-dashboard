import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-quick-setup-panel"
    required property var rootWindow
    required property var engineController
    property bool denseMode: false
    property var copyDelegate: null
    property string copiedLabel: ""
    property string exportBaseUrlDraft: ""
    property string lastEngineBaseUrl: ""
    property var currentPage: rootWindow.controlSurfacePageById(rootWindow.selectedControlSurfacePageId)

    function mappedButtonCount() {
        return root.currentPage && root.currentPage.buttons ? root.currentPage.buttons.length : 0
    }

    function mappedDialCount() {
        if (!root.currentPage || !root.currentPage.dials) {
            return 0
        }

        const positions = {}
        for (let index = 0; index < root.currentPage.dials.length; index += 1) {
            positions[root.currentPage.dials[index].position] = true
        }
        return Object.keys(positions).length
    }

    function copyText(text, label) {
        if (!text || text.length === 0) {
            return
        }

        if (typeof root.copyDelegate === "function") {
            root.copyDelegate(text, label)
        } else {
            clipboardBuffer.text = text
            clipboardBuffer.selectAll()
            clipboardBuffer.copy()
            clipboardBuffer.deselect()
        }

        root.copiedLabel = label
        copyResetTimer.restart()
    }

    function syncExportBaseUrl(force) {
        const nextBaseUrl = engineController.controlSurfaceBaseUrl || ""
        let displayBaseUrl = nextBaseUrl
        if (nextBaseUrl === "http://127.0.0.1:38201") {
            displayBaseUrl = "http://localhost:3000"
        }
        if (force || root.exportBaseUrlDraft.length === 0 || root.exportBaseUrlDraft === root.lastEngineBaseUrl) {
            root.exportBaseUrlDraft = displayBaseUrl
        }
        root.lastEngineBaseUrl = displayBaseUrl
    }

    radius: 18
    color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: quickSetupLayout.implicitHeight + 24

    ConsoleTheme {
        id: theme
    }

    TextEdit {
        id: clipboardBuffer
        visible: false
    }

    Timer {
        id: copyResetTimer
        interval: 1600
        repeat: false
        onTriggered: root.copiedLabel = ""
    }

    Component.onCompleted: root.syncExportBaseUrl(true)

    Connections {
        target: engineController
        ignoreUnknownSignals: true

        function onAppSnapshotChanged() {
            root.syncExportBaseUrl(false)
        }
    }

    ColumnLayout {
        id: quickSetupLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Quick Setup"
                    color: theme.studio500
                    font.pixelSize: 10
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.6
                }

                Label {
                    text: "Generate Companion profile"
                    color: theme.studio050
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                Label {
                    text: "Export a ready-to-import profile for this workstation before manual edits."
                    color: theme.studio500
                    font.pixelSize: 10
                    lineHeight: 1.5
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Rectangle {
                radius: 999
                color: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.1)
                implicitWidth: 104
                implicitHeight: 22

                Label {
                    anchors.centerIn: parent
                    text: "Recommended"
                    color: theme.accentPrimary
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.2
                }
            }

            Label {
                text: root.copiedLabel.length > 0 ? root.copiedLabel + " copied" : ""
                visible: root.copiedLabel.length > 0
                color: "#6fd3a4"
                font.pixelSize: 11
            }
        }

        Label {
            text: "Server Base URL"
            color: theme.studio400
            font.pixelSize: 12
        }

        ConsoleTextField {
            objectName: "setup-base-url-field"
            Layout.fillWidth: true
            dense: true
            text: root.exportBaseUrlDraft
            onTextChanged: root.exportBaseUrlDraft = text
            placeholderText: "Control-surface bridge URL unavailable"
        }

        ConsoleButton {
            objectName: "setup-export-profile"
            text: "Download Companion Profile"
            iconText: "\u2193"
            tone: "primary"
            dense: true
            enabled: engineController.operatorUiReady
            onClicked: engineController.exportCompanionConfig(root.exportBaseUrlDraft.trim())
        }

        Label {
            objectName: "setup-export-path"
            visible: engineController.companionExportPath.length > 0
            text: "Profile downloaded"
            color: "#6fd3a4"
            font.pixelSize: 12
            wrapMode: Text.WrapAnywhere
            Layout.fillWidth: true
        }

        Rectangle {
            radius: 14
            color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.45)
            border.color: theme.studio800
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: quickSetupNoteLayout.implicitHeight + 20

            ColumnLayout {
                id: quickSetupNoteLayout
                anchors.fill: parent
                anchors.margins: 12
                spacing: 4

                Label {
                    text: "Import in Companion from Import/Export -> Import. This includes both button pages and dial behavior for the local console."
                    color: theme.studio400
                    font.pixelSize: 10
                    lineHeight: 1.5
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

            }
        }
    }
}
