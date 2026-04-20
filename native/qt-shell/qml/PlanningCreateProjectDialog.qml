import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ConsoleModal {
    id: root
    objectName: "planning-create-project-dialog"
    required property var rootWindow
    required property var engineController
    property alias titleField: projectTitleField
    property string statusDraft: "todo"
    property string priorityDraft: "p2"
    parent: rootWindow && rootWindow.contentItem ? rootWindow.contentItem : null

    title: "New Project"
    subtitle: "Create a planning project without leaving the board. Status and priority stay engine-owned."
    dialogWidth: 720
    verticalPlacement: "top"
    topMargin: 116

    function resetDrafts() {
        projectTitleField.text = ""
        projectDescriptionField.text = ""
        root.statusDraft = "todo"
        root.priorityDraft = "p2"
    }

    function submit() {
        const title = projectTitleField.text.trim()
        if (title.length === 0 || !engineController) {
            return
        }

        if (typeof engineController.createPlanningProjectWithDetails === "function") {
            engineController.createPlanningProjectWithDetails(
                title,
                projectDescriptionField.text,
                root.statusDraft,
                root.priorityDraft
            )
        } else {
            engineController.createPlanningProject(title)
        }

        root.resetDrafts()
        root.closeRequested()
    }

    onOpenChanged: {
        if (open) {
            Qt.callLater(function() {
                projectTitleField.forceActiveFocus()
                projectTitleField.selectAll()
            })
        } else {
            root.resetDrafts()
        }
    }

    ConsoleTheme {
        id: theme
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: theme.spacing6

        Label {
            text: "Title"
            color: theme.studio300
            font.family: theme.uiFontFamily
            font.pixelSize: theme.textXs
            font.weight: Font.DemiBold
        }

        ConsoleTextField {
            id: projectTitleField
            objectName: "planning-new-project-field"
            Layout.fillWidth: true
            placeholderText: "Restore native planning parity"
            onAccepted: root.submit()
        }

        Label {
            text: "Description"
            color: theme.studio300
            font.family: theme.uiFontFamily
            font.pixelSize: theme.textXs
            font.weight: Font.DemiBold
        }

        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 108
            radius: theme.radiusBadge
            color: theme.studio900
            border.width: 1
            border.color: projectDescriptionField.activeFocus ? theme.accentBlue : theme.surfaceBorder

            TextArea {
                id: projectDescriptionField
                anchors.fill: parent
                anchors.margins: 10
                wrapMode: TextEdit.Wrap
                color: theme.studio050
                placeholderText: "Keep the operator workflow aligned with the legacy board."
                placeholderTextColor: theme.studio500
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textSm
                background: null
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: theme.spacing6

            ColumnLayout {
                Layout.fillWidth: true
                spacing: theme.spacing4

                Label {
                    text: "Status"
                    color: theme.studio300
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXs
                    font.weight: Font.DemiBold
                }

                RowLayout {
                    spacing: theme.spacing4

                    Repeater {
                        model: [
                            { "id": "todo", "label": "To Do" },
                            { "id": "in-progress", "label": "In Progress" },
                            { "id": "blocked", "label": "Blocked" },
                            { "id": "done", "label": "Done" }
                        ]

                        ConsoleButton {
                            required property var modelData
                            tone: "chip"
                            text: modelData.label
                            active: root.statusDraft === modelData.id
                            onClicked: root.statusDraft = modelData.id
                        }
                    }
                }
            }

            ColumnLayout {
                spacing: theme.spacing4

                Label {
                    text: "Priority"
                    color: theme.studio300
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXs
                    font.weight: Font.DemiBold
                }

                RowLayout {
                    spacing: theme.spacing4

                    Repeater {
                        model: ["p0", "p1", "p2", "p3"]

                        ConsoleButton {
                            required property string modelData
                            tone: "chip"
                            text: modelData.toUpperCase()
                            active: root.priorityDraft === modelData
                            onClicked: root.priorityDraft = modelData
                        }
                    }
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
                tone: "secondary"
                text: "Cancel"
                onClicked: root.closeRequested()
            }

            ConsoleButton {
                objectName: "planning-new-project-add"
                tone: "primary"
                text: "Create Project"
                enabled: projectTitleField.text.trim().length > 0
                onClicked: root.submit()
            }
        }
    }
}
