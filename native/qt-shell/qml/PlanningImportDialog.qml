import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ConsoleModal {
    id: root
    objectName: "planning-import-dialog"
    required property var rootWindow
    required property var engineController
    parent: rootWindow && rootWindow.contentItem ? rootWindow.contentItem : null

    title: "Import Planning Data"
    subtitle: "Supports native support backups and legacy db.json exports."
    dialogWidth: 720
    verticalPlacement: "top"
    topMargin: 116

    function submit() {
        const restorePath = importPathField.text.trim()
        if (restorePath.length === 0 || !engineController) {
            return
        }

        engineController.restoreSupportBackup(restorePath)
        rootWindow.supportRestorePathDraft = restorePath
        root.closeRequested()
    }

    ConsoleTheme {
        id: theme
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: theme.spacing6

        Label {
            text: "Archive or db.json path"
            color: theme.studio300
            font.family: theme.uiFontFamily
            font.pixelSize: theme.textXs
            font.weight: Font.DemiBold
        }

        ConsoleTextField {
            id: importPathField
            objectName: "planning-import-path-field"
            Layout.fillWidth: true
            placeholderText: "/path/to/support-backup.json"
            text: rootWindow.supportRestorePathDraft
            onTextChanged: rootWindow.supportRestorePathDraft = text
            onAccepted: root.submit()
        }

        Label {
            text: engineController ? engineController.supportRestoreDetails : "Restore details are loading."
            color: theme.studio400
            font.family: theme.uiFontFamily
            font.pixelSize: theme.textSm
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Label {
            visible: !!engineController && engineController.supportLatestBackupPath.length > 0
            text: "Latest backup: " + engineController.supportLatestBackupPath
            color: theme.studio300
            font.family: theme.monoFontFamily
            font.pixelSize: theme.textXs
            wrapMode: Text.WrapAnywhere
            Layout.fillWidth: true
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: theme.spacing4

            Item {
                Layout.fillWidth: true
            }

            ConsoleButton {
                tone: "secondary"
                text: "Open Backups"
                onClicked: engineController.openSupportBackupDirectory()
            }

            ConsoleButton {
                tone: "primary"
                text: "Import"
                enabled: importPathField.text.trim().length > 0
                onClicked: root.submit()
            }
        }
    }
}
