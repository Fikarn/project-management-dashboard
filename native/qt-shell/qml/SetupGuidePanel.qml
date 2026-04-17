import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-guide-panel"
    property bool manualVisible: false

    readonly property var steps: [
        {
            "title": "Install Companion",
            "text": "Install Bitfocus Companion, then connect the Stream Deck+ over USB before importing anything."
        },
        {
            "title": "Import the profile",
            "text": "Use the generated profile so both button pages and dial mappings land in the right slots immediately."
        },
        {
            "title": "Verify live actions",
            "text": "Run the local probe, then use the detail pane to test mapped requests from this workstation."
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

    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label { text: "Commissioning Checklist"; color: "#8ea4c0"; font.pixelSize: 11 }
                Label {
                    text: "Import, verify, then fine-tune"
                    color: "#f5f7fb"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }
            }

            Label {
                text: "4 steps"
                color: "#8ea4c0"
                font.pixelSize: 11
            }
        }

        Repeater {
            model: root.steps

            Rectangle {
                required property var modelData
                property int itemIndex: index
                radius: 8
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: 56

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    Rectangle {
                        radius: 10
                        color: "#18304c"
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20

                        Label {
                            anchors.centerIn: parent
                            text: parent.parent.itemIndex + 1
                            color: "#8fc7ff"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2

                        Label {
                            text: modelData.title
                            color: "#f5f7fb"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                        }
                        Label {
                            text: modelData.text
                            color: "#b4c0cf"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }
            }
        }

        Button {
            objectName: "setup-manual-toggle"
            text: root.manualVisible ? "Hide manual setup fallback" : "Show manual setup fallback"
            Layout.alignment: Qt.AlignLeft
            onClicked: root.manualVisible = !root.manualVisible
        }

        ColumnLayout {
            visible: root.manualVisible
            Layout.fillWidth: true
            spacing: 8

            Repeater {
                model: root.manualSteps

                Rectangle {
                    required property var modelData
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 52

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 2

                        Label {
                            text: modelData.title
                            color: "#f5f7fb"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                        }
                        Label {
                            text: modelData.text
                            color: "#b4c0cf"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }
            }
        }
    }
}
