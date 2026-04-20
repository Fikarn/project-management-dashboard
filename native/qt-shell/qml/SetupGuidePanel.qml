import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-guide-panel"
    property bool denseMode: false
    property bool manualVisible: false

    readonly property var steps: [
        {
            "title": "Install Companion",
            "text": "Install Bitfocus Companion, then connect the Stream Deck+ over USB before importing anything."
        },
        {
            "title": "Import the profile",
            "text": "Use the generated .companionconfig file so both button pages and dial mappings land in the right slots immediately."
        },
        {
            "title": "Verify live actions",
            "text": "Probe the server connection, then use the control detail pane to test each mapped request against the studio console."
        },
        {
            "title": "Adjust only exceptions",
            "text": "Use manual setup only for slots that need a custom URL, payload, or page-jump behavior beyond the generated profile."
        }
    ]

    readonly property var manualSteps: [
        {
            "title": "Add Generic HTTP",
            "text": "In Companion Connections, add Generic HTTP and point it at this workstation base URL."
        },
        {
            "title": "Copy request details",
            "text": "Select the matching slot in the replica, then copy the exact URL, JSON body, or curl reference from the detail pane."
        }
    ]

    radius: 18
    color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: guideLayout.implicitHeight + 24

    ConsoleTheme {
        id: theme
    }

    ColumnLayout {
        id: guideLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Commissioning Checklist"
                    color: theme.studio500
                    font.pixelSize: 10
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.6
                }
                Label {
                    text: "Import, verify, then fine-tune"
                    color: theme.studio050
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                radius: 999
                color: theme.studio800
                implicitWidth: 74
                implicitHeight: 22

                Label {
                    anchors.centerIn: parent
                    text: "4 steps"
                    color: theme.studio400
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.2
                }
            }
        }

        Repeater {
            model: root.steps

            Rectangle {
                required property var modelData
                required property int index
                radius: 14
                color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.45)
                border.color: theme.studio800
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: stepRow.implicitHeight + 20

                RowLayout {
                    id: stepRow
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 10

                    Rectangle {
                        radius: 999
                        color: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.12)
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20

                        Label {
                            anchors.centerIn: parent
                            text: parent.parent.parent.index + 1
                            color: theme.accentPrimary
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Label {
                            text: modelData.title
                            color: theme.studio200
                            font.pixelSize: 14
                            font.weight: Font.Medium
                        }
                        Label {
                            text: modelData.text
                            color: theme.studio400
                            font.pixelSize: 12
                            lineHeight: 1.45
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: theme.studio800
        }

        ConsoleButton {
            objectName: "setup-manual-toggle"
            text: root.manualVisible ? "Hide manual setup fallback" : "Show manual setup fallback"
            tone: "ghost"
            dense: true
            Layout.alignment: Qt.AlignLeft
            onClicked: root.manualVisible = !root.manualVisible
        }

        ColumnLayout {
            visible: root.manualVisible
            Layout.fillWidth: true
            spacing: root.denseMode ? 6 : 8

            Repeater {
                model: root.manualSteps

                Rectangle {
                    required property var modelData
                    radius: 14
                    color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.35)
                    border.color: theme.studio800
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: manualLayout.implicitHeight + 20

                    ColumnLayout {
                        id: manualLayout
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 4

                        Label {
                            text: modelData.title
                            color: theme.studio200
                            font.pixelSize: 14
                            font.weight: Font.Medium
                        }
                        Label {
                            text: modelData.text
                            color: theme.studio400
                            font.pixelSize: 12
                            lineHeight: 1.45
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }
            }
        }
    }
}
