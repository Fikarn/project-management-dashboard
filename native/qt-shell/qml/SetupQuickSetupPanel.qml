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
        if (force || root.exportBaseUrlDraft.length === 0 || root.exportBaseUrlDraft === root.lastEngineBaseUrl) {
            root.exportBaseUrlDraft = nextBaseUrl
        }
        root.lastEngineBaseUrl = nextBaseUrl
    }

    radius: 11
    color: "#0f151e"
    border.color: "#253244"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: quickSetupLayout.implicitHeight + 20

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
        anchors.margins: root.denseMode ? 9 : 11
        spacing: root.denseMode ? 9 : 11

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Quick Setup"
                    color: "#8894a7"
                    font.pixelSize: 10
                }

                Label {
                    text: "Generate Companion profile"
                    color: "#f5f7fb"
                    font.pixelSize: root.denseMode ? 14 : 15
                    font.weight: Font.DemiBold
                }

                Label {
                    text: "Export a ready-to-import profile for this workstation before manual edits."
                    color: "#bac4d0"
                    font.pixelSize: root.denseMode ? 9 : 10
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Rectangle {
                radius: 9
                color: "#152018"
                border.color: "#355242"
                border.width: 1
                implicitWidth: 92
                implicitHeight: 22

                Label {
                    anchors.centerIn: parent
                    text: "Recommended"
                    color: "#b0d9bf"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
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
            color: "#8894a7"
            font.pixelSize: 10
        }

        ConsoleTextField {
            objectName: "setup-base-url-field"
            Layout.fillWidth: true
            dense: root.denseMode
            text: root.exportBaseUrlDraft
            onTextChanged: root.exportBaseUrlDraft = text
            placeholderText: "Control-surface bridge URL unavailable"
        }

        ConsoleButton {
            objectName: "setup-export-profile"
            text: "Download Companion Profile"
            tone: "primary"
            dense: root.denseMode
            enabled: engineController.operatorUiReady
            onClicked: engineController.exportCompanionConfig(root.exportBaseUrlDraft.trim())
        }

        Label {
            objectName: "setup-export-path"
            visible: engineController.companionExportPath.length > 0
            text: "Profile downloaded"
            color: "#6fd3a4"
            font.pixelSize: root.denseMode ? 9 : 10
            wrapMode: Text.WrapAnywhere
            Layout.fillWidth: true
        }

        Rectangle {
            radius: 9
            color: "#0b1118"
            border.color: "#202c3b"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: root.denseMode ? 68 : 76

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: root.denseMode ? 7 : 9
                spacing: root.denseMode ? 3 : 5

                Label {
                    text: "Import in Companion from Import/Export -> Import. This includes both button pages and dial behavior for the local console."
                    color: "#bcc5d0"
                    font.pixelSize: 9
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

            }
        }
    }
}
