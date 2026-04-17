import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "dashboard-about-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open
    readonly property bool controllerReady: !!engineController

    anchors.fill: parent
    visible: open
    z: 46

    Rectangle {
        anchors.fill: parent
        color: "#050913"
        opacity: 0.78

        TapHandler {
            onTapped: rootWindow.aboutDialogVisible = false
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 56, 640)
        height: Math.min(parent.height - 72, 560)
        radius: 18
        color: "#101826"
        border.color: "#35506b"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 14

            RowLayout {
                Layout.fillWidth: true

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Label {
                        text: "About"
                        color: "#9bc4ff"
                        font.pixelSize: 11
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: "SSE ExEd Studio Control"
                        color: "#f5f7fb"
                        font.pixelSize: 22
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: "Version, storage, and recovery details for the installed operator shell."
                        color: "#b4c0cf"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }

                Button {
                    objectName: "dashboard-about-close"
                    text: "Close"
                    onClicked: rootWindow.aboutDialogVisible = false
                }
            }

            GridLayout {
                Layout.fillWidth: true
                columns: width >= 480 ? 2 : 1
                columnSpacing: 10
                rowSpacing: 10

                Repeater {
                    model: [
                        { "label": "Engine Version", "value": controllerReady ? engineController.engineVersion : "loading" },
                        { "label": "Protocol", "value": controllerReady ? engineController.protocolVersion : "loading" },
                        { "label": "Health", "value": controllerReady ? rootWindow.formatEnumLabel(engineController.healthStatus) : "Loading" },
                        { "label": "SQLite", "value": controllerReady ? engineController.storageSqliteVersion : "loading" }
                    ]

                    Rectangle {
                        required property var modelData
                        radius: 12
                        color: "#0c1320"
                        border.color: "#24344a"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 74

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label {
                                text: modelData.label
                                color: "#8ea4c0"
                                font.pixelSize: 11
                            }

                            Label {
                                text: modelData.value
                                color: "#f5f7fb"
                                font.pixelSize: 14
                                font.weight: Font.DemiBold
                                wrapMode: Text.WrapAnywhere
                                Layout.fillWidth: true
                            }
                        }
                    }
                }
            }

            Rectangle {
                radius: 12
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: detailsLayout.implicitHeight + 24

                ColumnLayout {
                    id: detailsLayout
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 10

                    Label {
                        text: "Recovery"
                        color: "#f5f7fb"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: controllerReady && engineController.supportLatestBackupPath.length > 0
                              ? "Latest backup: " + engineController.supportLatestBackupPath
                              : "No support backup has been exported yet."
                        color: "#b4c0cf"
                        font.pixelSize: 12
                        wrapMode: Text.WrapAnywhere
                        Layout.fillWidth: true
                    }

                    Label {
                        text: controllerReady ? engineController.storageDetails : "Storage details are loading."
                        color: "#8ea4c0"
                        font.pixelSize: 11
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Button {
                            text: "Open App Data"
                            enabled: controllerReady
                            onClicked: engineController.openAppDataDirectory()
                        }

                        Button {
                            text: "Open Logs"
                            enabled: controllerReady
                            onClicked: engineController.openLogsDirectory()
                        }

                        Button {
                            text: "Open Diagnostics"
                            enabled: controllerReady
                            onClicked: engineController.openDiagnosticsDirectory()
                        }
                    }
                }
            }
        }
    }
}
