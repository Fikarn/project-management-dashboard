import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    property string label: ""
    property string value: ""
    property string detail: ""
    property string iconText: ""
    property bool accent: false
    property bool compact: false
    property int summaryValue: Number(root.value)

    ConsoleTheme {
        id: theme
    }

    radius: compact ? 12 : 14
    color: accent ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.08)
                  : Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.45)
    border.width: 1
    border.color: accent ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.2) : theme.surfaceStroke
    Layout.fillWidth: true
    implicitHeight: compact ? (detail.length > 0 ? 58 : 60) : detail.length > 0 ? 76 : 82

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: compact ? 8 : 12
        spacing: compact ? 2 : 4

        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            Label {
                text: root.label
                color: theme.studio500
                font.family: theme.uiFontFamily
                font.pixelSize: compact ? 10 : theme.textXxs
                font.weight: Font.DemiBold
                font.capitalization: Font.AllUppercase
                font.letterSpacing: compact ? 0.9 : 1.1
                Layout.fillWidth: true
            }

            Rectangle {
                visible: root.iconText.length > 0
                radius: theme.radiusPill
                color: Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.55)
                border.width: 1
                border.color: theme.surfaceBorder
                implicitWidth: compact ? 16 : 18
                implicitHeight: compact ? 16 : 18

                Label {
                    anchors.centerIn: parent
                    text: root.iconText
                    color: theme.studio500
                    font.family: theme.uiFontFamily
                    font.pixelSize: compact ? 10 : theme.textXxs
                    font.weight: Font.DemiBold
                }
            }
        }

        Label {
            text: root.value
            color: theme.studio050
            font.family: theme.uiFontFamily
            font.pixelSize: compact ? 16 : 20
            font.weight: Font.DemiBold
        }

        Label {
            visible: root.detail.length > 0
            text: root.detail
            color: theme.studio400
            font.family: theme.uiFontFamily
            font.pixelSize: compact ? 10 : theme.textXxs
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }
    }
}
