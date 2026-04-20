import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ConsoleModal {
    id: root
    objectName: "lighting-delete-fixture-dialog"
    required property var rootWindow
    required property var engineController
    property var fixtureData: null
    parent: rootWindow && rootWindow.contentItem ? rootWindow.contentItem : null

    title: ""
    subtitle: ""
    dialogWidth: 392
    verticalPlacement: "center"
    showCloseButton: false

    ConsoleTheme {
        id: theme
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: theme.spacing6

        RowLayout {
            Layout.fillWidth: true
            spacing: theme.spacing5

            Rectangle {
                implicitWidth: 36
                implicitHeight: 36
                radius: 18
                color: Qt.rgba(theme.accentRed.r, theme.accentRed.g, theme.accentRed.b, 0.12)

                Label {
                    anchors.centerIn: parent
                    text: "!"
                    color: theme.accentRed
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textLg
                    font.weight: Font.Bold
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Label {
                    text: "Delete Light"
                    color: theme.studio100
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textLg
                    font.weight: Font.DemiBold
                }

                Label {
                    Layout.fillWidth: true
                    text: fixtureData
                          ? "Delete \"" + fixtureData.name + "\"? This cannot be undone."
                          : "Delete the selected fixture? This cannot be undone."
                    color: theme.studio400
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textSm
                    wrapMode: Text.WordWrap
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: theme.spacing4

            Item {
                Layout.fillWidth: true
            }

            ConsoleButton {
                objectName: "lighting-delete-cancel"
                tone: "secondary"
                text: "Cancel"
                onClicked: root.closeRequested()
            }

            ConsoleButton {
                objectName: "lighting-delete-confirm"
                tone: "danger"
                text: "Delete"
                enabled: !!fixtureData
                onClicked: {
                    if (fixtureData && fixtureData.id) {
                        engineController.deleteLightingFixture(fixtureData.id)
                    }
                    root.closeRequested()
                }
            }
        }
    }
}
