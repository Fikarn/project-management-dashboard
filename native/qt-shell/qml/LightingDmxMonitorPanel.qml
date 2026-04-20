import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "lighting-dmx-monitor-panel"
    required property var engineController

    ConsoleTheme {
        id: theme
    }

    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: dmxMonitorLayout.implicitHeight + 24

    ColumnLayout {
        id: dmxMonitorLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true

            Label {
                text: "DMX Monitor"
                color: "#f5f7fb"
                font.pixelSize: 13
                font.weight: Font.DemiBold
            }

            Item { Layout.fillWidth: true }

            Label {
                text: (engineController ? engineController.lightingDmxChannels.length : 0) + " channels"
                color: "#8ea4c0"
                font.pixelSize: 11
            }
        }

        Label {
            visible: !engineController || !engineController.lightingDmxChannels.length
            text: "No DMX channel output is available yet. Turn fixtures on or verify bridge settings."
            color: "#8ea4c0"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Repeater {
            model: engineController ? engineController.lightingDmxChannels.slice(0, 32) : []

            RowLayout {
                required property var modelData
                Layout.fillWidth: true
                spacing: 8

                Label {
                    text: modelData.channel
                    color: "#8ea4c0"
                    font.family: theme.monoFontFamily
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignRight
                    Layout.preferredWidth: 32
                }

                Rectangle {
                    radius: 4
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 12

                    Rectangle {
                        anchors.left: parent.left
                        anchors.top: parent.top
                        anchors.bottom: parent.bottom
                        width: parent.width * (Number(modelData.value || 0) / 255)
                        radius: parent.radius
                        color: Number(modelData.value || 0) > 0 ? "#6aa9ff" : "#24344a"
                    }
                }

                Label {
                    text: modelData.value
                    color: "#d6dce5"
                    font.family: theme.monoFontFamily
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignRight
                    Layout.preferredWidth: 40
                }

                Label {
                    text: modelData.lightName + "  " + modelData.label
                    color: "#b9c6d8"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                    Layout.preferredWidth: 170
                }
            }
        }
    }
}
