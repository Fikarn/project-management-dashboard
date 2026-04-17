import QtQuick
import QtQuick.Controls

DelayButton {
    id: control
    property color accentColor: "#d59354"
    property color fillColor: "#101826"
    property color borderColor: "#24344a"
    property color textColor: "#f5f7fb"

    implicitHeight: 34
    padding: 12

    contentItem: Label {
        text: control.text
        color: control.enabled ? control.textColor : "#70859f"
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        font.pixelSize: 12
        font.weight: Font.DemiBold
    }

    background: Rectangle {
        radius: 8
        color: control.down ? Qt.darker(control.fillColor, 1.12) : control.fillColor
        border.color: control.enabled ? control.borderColor : "#1a2533"
        border.width: 1

        Rectangle {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            width: Math.max(0, parent.width * control.progress)
            radius: parent.radius
            color: control.enabled ? control.accentColor : "#24344a"
            opacity: control.progress > 0 ? 0.22 : 0
        }
    }
}
