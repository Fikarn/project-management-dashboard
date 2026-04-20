import QtQuick
import QtQuick.Layouts

Rectangle {
    id: root
    property string tone: "default"
    property bool subtle: false
    property bool highlight: false
    property int padding: tone === "strong" ? theme.spacing9 : tone === "soft" ? theme.spacing8 : theme.spacing7
    default property alias contentData: contentItem.data

    ConsoleTheme {
        id: theme
    }

    radius: tone === "strong" ? theme.radiusSurfaceStrong
            : tone === "soft" ? theme.radiusSoft
            : tone === "modal" ? theme.radiusSurface
            : theme.radiusSurface
    border.width: 1
    border.color: highlight ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.76)
                             : tone === "strong" ? theme.surfaceBorderStrong : theme.surfaceBorder
    color: tone === "soft"
           ? Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.94)
           : tone === "modal"
             ? Qt.rgba(theme.surfaceRaised.r, theme.surfaceRaised.g, theme.surfaceRaised.b, 0.98)
             : Qt.rgba(theme.surfaceDefault.r, theme.surfaceDefault.g, theme.surfaceDefault.b, subtle ? 0.82 : 0.94)

    gradient: Gradient {
        GradientStop {
            position: 0.0
            color: root.tone === "strong" ? theme.surfaceStrongTop
                   : root.tone === "modal" ? Qt.lighter(root.color, 1.04)
                   : Qt.lighter(root.color, 1.02)
        }
        GradientStop {
            position: 0.42
            color: root.tone === "strong" ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.045)
                                          : root.color
        }
        GradientStop {
            position: 1.0
            color: root.tone === "strong" ? theme.surfaceStrongBottom
                   : root.tone === "modal" ? Qt.darker(root.color, 1.05)
                   : Qt.darker(root.color, 1.02)
        }
    }

    Rectangle {
        anchors.fill: parent
        radius: parent.radius
        color: "transparent"
        border.width: 1
        border.color: Qt.rgba(theme.studio050.r, theme.studio050.g, theme.studio050.b, root.tone === "strong" ? 0.05 : 0.03)
    }

    Item {
        id: contentItem
        anchors.fill: parent
        anchors.margins: root.padding
    }
}
