import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ColumnLayout {
    id: root
    objectName: "planning-toolbar-panel"
    required property var rootWindow
    required property var engineController
    readonly property bool fullscreenOperatorSurface: rootWindow && rootWindow.visibility === Window.FullScreen
    readonly property bool widescreenRail: fullscreenOperatorSurface || width >= 1450

    ConsoleTheme {
        id: theme
    }

    Layout.fillWidth: true
    spacing: theme.spacing3

    function focusSearch() {
        planningSearchField.forceActiveFocus()
        Qt.callLater(function() {
            planningSearchField.selectAll()
        })
    }

    ConsoleSurface {
        Layout.fillWidth: true
        tone: "soft"
        padding: 6
        implicitHeight: planningToolbarLayout.implicitHeight + 14

        ColumnLayout {
            id: planningToolbarLayout
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            spacing: root.widescreenRail ? theme.spacing2 : theme.spacing4

            RowLayout {
                Layout.fillWidth: true
                spacing: theme.spacing4

                ConsoleTextField {
                    id: planningSearchField
                    objectName: "planning-search-field"
                    dense: root.widescreenRail
                    Layout.fillWidth: !root.widescreenRail
                    Layout.preferredWidth: root.widescreenRail ? 396 : -1
                    placeholderText: "Search projects, tasks, labels..."
                    text: rootWindow.planningSearchQuery
                    onTextEdited: rootWindow.planningSearchQuery = text

                    Binding {
                        target: planningSearchField
                        property: "text"
                        value: rootWindow.planningSearchQuery
                        when: !planningSearchField.activeFocus
                    }
                }

                Label {
                    visible: rootWindow.planningSearchQuery.trim().length > 0
                    text: rootWindow.planningResultCount() + " results"
                    color: theme.studio500
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    font.capitalization: root.widescreenRail ? Font.AllUppercase : Font.MixedCase
                    font.letterSpacing: root.widescreenRail ? 0.8 : 0
                }

                RowLayout {
                    visible: root.widescreenRail
                    spacing: 6

                    Repeater {
                        model: [
                            { "id": "all", "name": "All", "shortcut": "0" },
                            { "id": "todo", "name": "To Do", "shortcut": "1" },
                            { "id": "in-progress", "name": "In Progress", "shortcut": "2" },
                            { "id": "blocked", "name": "Blocked", "shortcut": "3" },
                            { "id": "done", "name": "Done", "shortcut": "4" }
                        ]

                        ConsoleButton {
                            required property var modelData
                            objectName: "planning-inline-filter-" + modelData.id
                            tone: "chip"
                            compact: true
                            dense: true
                            text: modelData.name
                            active: !!engineController && engineController.planningViewFilter === modelData.id
                            onClicked: engineController.updatePlanningSettings({ "viewFilter": modelData.id })
                        }
                    }
                }

                Item {
                    Layout.fillWidth: true
                }

                RowLayout {
                    spacing: 6

                    Label {
                        text: "SORT:"
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXxs
                        font.weight: Font.DemiBold
                        font.capitalization: Font.AllUppercase
                        font.letterSpacing: 0.9
                    }

                    ConsoleComboBox {
                        id: planningSortComboBox
                        objectName: "planning-sort-combo"
                        dense: root.widescreenRail
                        Layout.preferredWidth: root.widescreenRail ? 122 : 152
                        model: [
                            { "id": "manual", "name": "Manual" },
                            { "id": "priority", "name": "Priority" },
                            { "id": "date", "name": "Last Updated" },
                            { "id": "name", "name": "Name" }
                        ]
                        textRole: "name"
                        currentIndex: {
                            for (let index = 0; index < model.length; index += 1) {
                                if (engineController && model[index].id === engineController.planningSortBy) {
                                    return index
                                }
                            }
                            return 0
                        }
                        onActivated: engineController.updatePlanningSettings({ "sortBy": model[currentIndex].id })
                    }
                }

            }

            RowLayout {
                Layout.fillWidth: true
                spacing: theme.spacing4
                visible: !root.widescreenRail

                Repeater {
                    model: [
                        { "id": "all", "name": "All", "shortcut": "0" },
                        { "id": "todo", "name": "To Do", "shortcut": "1" },
                        { "id": "in-progress", "name": "In Progress", "shortcut": "2" },
                        { "id": "blocked", "name": "Blocked", "shortcut": "3" },
                        { "id": "done", "name": "Done", "shortcut": "4" }
                    ]

                    ConsoleButton {
                        required property var modelData
                        objectName: "planning-filter-" + modelData.id
                        tone: "chip"
                        compact: true
                        dense: true
                        text: modelData.name
                        active: !!engineController && engineController.planningViewFilter === modelData.id
                        onClicked: engineController.updatePlanningSettings({ "viewFilter": modelData.id })
                    }
                }
            }
        }
    }
}
