import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-quick-setup-panel"
    required property var rootWindow
    required property var engineController
    property var copyDelegate: null
    property string copiedLabel: ""
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

    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true

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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Commissioning Workspace"
                    color: "#8ea4c0"
                    font.pixelSize: 12
                }

                Label {
                    text: "Control surface setup"
                    color: "#f5f7fb"
                    font.pixelSize: 18
                    font.weight: Font.DemiBold
                }

                Label {
                    text: "Import first, verify the generated actions, then touch only the exceptions."
                    color: "#d6dce5"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Label {
                text: root.copiedLabel.length > 0 ? root.copiedLabel + " copied" : ""
                visible: root.copiedLabel.length > 0
                color: "#6fd3a4"
                font.pixelSize: 11
            }
        }

        GridLayout {
            Layout.fillWidth: true
            columns: 3
            columnSpacing: 10
            rowSpacing: 10

            Rectangle {
                radius: 10
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: 82

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 3

                    Label { text: "Deck Pages"; color: "#8ea4c0"; font.pixelSize: 11 }
                    Label {
                        objectName: "setup-quick-page-count"
                        text: engineController.controlSurfacePages.length
                        color: "#f5f7fb"
                        font.pixelSize: 18
                        font.weight: Font.DemiBold
                    }
                    Label {
                        text: "Projects / Tasks / Lights / Audio"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                    }
                }
            }

            Rectangle {
                radius: 10
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: 82

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 3

                    Label { text: "Active Page"; color: "#8ea4c0"; font.pixelSize: 11 }
                    Label {
                        objectName: "setup-quick-page-label"
                        text: root.currentPage ? root.currentPage.label : "None"
                        color: "#f5f7fb"
                        font.pixelSize: 18
                        font.weight: Font.DemiBold
                    }
                    Label {
                        text: root.mappedButtonCount() + " buttons, " + root.mappedDialCount() + " dials mapped"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                    }
                }
            }

            Rectangle {
                radius: 10
                color: "#11261e"
                border.color: "#2b6c56"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: 82

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 3

                    Label { text: "Workflow"; color: "#a6e1c6"; font.pixelSize: 11 }
                    Label {
                        text: "Import first"
                        color: "#f5f7fb"
                        font.pixelSize: 18
                        font.weight: Font.DemiBold
                    }
                    Label {
                        text: "Profile export, action test, then manual exceptions"
                        color: "#bfe9d3"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                    }
                }
            }
        }

        Label {
            text: "Server Base URL"
            color: "#8ea4c0"
            font.pixelSize: 11
        }

        TextField {
            objectName: "setup-base-url-field"
            Layout.fillWidth: true
            readOnly: true
            text: engineController.controlSurfaceBaseUrl
            placeholderText: "Control-surface bridge URL unavailable"
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                objectName: "setup-export-profile"
                text: "Export Profile"
                enabled: engineController.operatorUiReady
                onClicked: engineController.exportCompanionConfig()
            }

            Button {
                objectName: "setup-copy-base-url"
                text: "Copy Base URL"
                enabled: engineController.controlSurfaceBaseUrl.length > 0
                onClicked: root.copyText(engineController.controlSurfaceBaseUrl, "Base URL")
            }

            Button {
                objectName: "setup-refresh-control-surface"
                text: "Refresh"
                enabled: engineController.operatorUiReady
                onClicked: engineController.requestControlSurfaceSnapshot()
            }
        }

        Label {
            objectName: "setup-export-path"
            text: engineController.companionExportPath.length > 0
                  ? "Latest export: " + engineController.companionExportPath
                  : "No Companion profile has been exported yet."
            color: "#8ea4c0"
            font.pixelSize: 11
            wrapMode: Text.WrapAnywhere
            Layout.fillWidth: true
        }

        Rectangle {
            radius: 10
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: 68

            Label {
                anchors.fill: parent
                anchors.margins: 10
                text: "Import the generated .companionconfig into Bitfocus Companion so the button pages and dial mappings land in the correct slots immediately."
                color: "#d6dce5"
                font.pixelSize: 11
                wrapMode: Text.WordWrap
            }
        }
    }
}
