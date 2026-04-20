import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ConsoleModal {
    id: root
    objectName: "lighting-fixture-dialog"
    required property var rootWindow
    required property var engineController
    property var fixtureData: null
    property string nameDraft: ""
    property string typeDraft: "astra-bicolor"
    property string groupIdDraft: ""
    property int dmxStartDraft: 1
    property bool nameError: false
    property bool discardConfirmVisible: false
    parent: rootWindow && rootWindow.contentItem ? rootWindow.contentItem : null

    title: ""
    subtitle: ""
    dialogWidth: 448
    verticalPlacement: "center"
    showCloseButton: false

    function fixtureTypeOptionsModel() {
        return rootWindow ? rootWindow.lightingFixtureTypeOptions() : []
    }

    function fixtureGroupOptionsModel() {
        const options = [{ "id": "", "name": "No group" }]
        if (!rootWindow) {
            return options
        }

        const groups = rootWindow.lightingGroupOptions()
        for (let index = 0; index < groups.length; index += 1) {
            options.push(groups[index])
        }
        return options
    }

    function maxStartAddress() {
        if (rootWindow && typeof rootWindow.lightingFixtureMaxStartAddress === "function") {
            return rootWindow.lightingFixtureMaxStartAddress(root.typeDraft)
        }

        return 512 - root.fixtureTypeChannels(root.typeDraft) + 1
    }

    function fixtureTypeChannels(fixtureType) {
        if (rootWindow && typeof rootWindow.lightingFixtureTypeChannels === "function") {
            return rootWindow.lightingFixtureTypeChannels(fixtureType)
        }

        return 2
    }

    function channelSummary() {
        const channelCount = root.fixtureTypeChannels(root.typeDraft)
        return channelCount === 2
               ? "Uses 2 channels: intensity + CCT"
               : "Uses " + channelCount + " channels: intensity + CCT + RGB + effects"
    }

    function isDirty() {
        return root.nameDraft !== (fixtureData && fixtureData.name ? fixtureData.name : "")
                || root.typeDraft !== (fixtureData && fixtureData.type ? fixtureData.type : "astra-bicolor")
                || root.dmxStartDraft !== (fixtureData && fixtureData.dmxStartAddress ? Number(fixtureData.dmxStartAddress) : 1)
                || root.groupIdDraft !== (fixtureData && fixtureData.groupId ? fixtureData.groupId : "")
    }

    function requestClose() {
        if (root.isDirty()) {
            root.discardConfirmVisible = true
            return
        }

        root.closeRequested()
    }

    function syncDrafts() {
        const item = fixtureData || {}
        root.nameDraft = item.name ? item.name : ""
        root.typeDraft = item.type ? item.type : "astra-bicolor"
        root.groupIdDraft = item.groupId ? item.groupId : ""
        root.dmxStartDraft = item.dmxStartAddress ? Number(item.dmxStartAddress) : 1
        root.nameError = false
        root.discardConfirmVisible = false
        nameField.text = root.nameDraft
        dmxField.text = String(root.dmxStartDraft)
    }

    function submit() {
        const trimmedName = root.nameDraft.trim()
        if (!trimmedName.length) {
            root.nameError = true
            nameField.forceActiveFocus()
            return
        }

        if (!engineController) {
            return
        }

        const payload = {
            "name": trimmedName,
            "type": root.typeDraft,
            "dmxStartAddress": Math.max(1, Math.min(root.maxStartAddress(), Math.round(root.dmxStartDraft))),
            "groupId": root.groupIdDraft.length ? root.groupIdDraft : null
        }

        if (fixtureData && fixtureData.id) {
            engineController.updateLightingFixture(fixtureData.id, payload)
        } else {
            engineController.createLightingFixture(payload)
        }

        root.discardConfirmVisible = false
        root.closeRequested()
    }

    onOpenChanged: {
        if (open) {
            root.syncDrafts()
            Qt.callLater(function() {
                nameField.forceActiveFocus()
                nameField.selectAll()
            })
        }
    }
    onFixtureDataChanged: {
        if (open) {
            root.syncDrafts()
        }
    }

    ConsoleTheme {
        id: theme
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: theme.spacing5

        Label {
            text: fixtureData ? "Edit Light" : "Add Light"
            color: theme.studio100
            font.family: theme.uiFontFamily
            font.pixelSize: theme.textLg
            font.weight: Font.DemiBold
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: theme.spacing3

            Label {
                text: "Name"
                color: theme.studio300
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textXs
                font.weight: Font.DemiBold
            }

            ConsoleTextField {
                id: nameField
                Layout.fillWidth: true
                placeholderText: "e.g., \"Key Left\""
                maximumLength: 50
                onTextChanged: {
                    root.nameDraft = text
                    if (root.nameError && text.trim().length > 0) {
                        root.nameError = false
                    }
                }
                onAccepted: root.submit()
            }

            Label {
                visible: root.nameError
                text: "Name is required"
                color: theme.accentRed
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textXs
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: theme.spacing3

            Label {
                text: "Type"
                color: theme.studio300
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textXs
                font.weight: Font.DemiBold
            }

            ConsoleComboBox {
                Layout.fillWidth: true
                model: root.fixtureTypeOptionsModel()
                textRole: "name"
                currentIndex: rootWindow ? rootWindow.lightingFixtureTypeIndex(root.typeDraft, model) : 0
                onActivated: {
                    root.typeDraft = model[currentIndex].id
                    root.dmxStartDraft = Math.min(root.dmxStartDraft, root.maxStartAddress())
                    dmxField.text = String(root.dmxStartDraft)
                }
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: theme.spacing3

            Label {
                text: "DMX Start Address"
                color: theme.studio300
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textXs
                font.weight: Font.DemiBold
            }

            ConsoleTextField {
                id: dmxField
                Layout.fillWidth: true
                placeholderText: "1"
                inputMethodHints: Qt.ImhDigitsOnly
                onTextChanged: {
                    const nextValue = Number(text)
                    if (!isNaN(nextValue) && nextValue >= 1) {
                        root.dmxStartDraft = Math.min(root.maxStartAddress(), Math.round(nextValue))
                    }
                }
                onAccepted: root.submit()
            }

            Label {
                text: root.channelSummary()
                color: theme.studio500
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textXs
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
        }

        ColumnLayout {
            visible: root.fixtureGroupOptionsModel().length > 1
            Layout.fillWidth: true
            spacing: theme.spacing3

            Label {
                text: "Group"
                color: theme.studio300
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textXs
                font.weight: Font.DemiBold
            }

            ConsoleComboBox {
                Layout.fillWidth: true
                model: root.fixtureGroupOptionsModel()
                textRole: "name"
                currentIndex: rootWindow ? rootWindow.lightingGroupIndex(root.groupIdDraft, model) : 0
                onActivated: root.groupIdDraft = model[currentIndex].id
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: theme.spacing4

            Item {
                Layout.fillWidth: true
            }

            ConsoleButton {
                objectName: "lighting-fixture-cancel"
                tone: "secondary"
                text: "Cancel"
                onClicked: root.requestClose()
            }

            ConsoleButton {
                objectName: "lighting-fixture-save"
                tone: "primary"
                text: fixtureData ? "Save" : "Add Light"
                enabled: root.nameDraft.trim().length > 0
                onClicked: root.submit()
            }
        }
    }

    ConsoleModal {
        open: root.discardConfirmVisible
        title: "Discard Changes"
        subtitle: ""
        dialogWidth: 360
        verticalPlacement: "center"
        showCloseButton: false
        parent: root.parent
        onCloseRequested: root.discardConfirmVisible = false

        ColumnLayout {
            Layout.fillWidth: true
            spacing: theme.spacing5

            Label {
                Layout.fillWidth: true
                text: "You have unsaved changes. Discard them?"
                color: theme.studio300
                font.family: theme.uiFontFamily
                font.pixelSize: theme.textSm
                wrapMode: Text.WordWrap
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: theme.spacing4

                Item { Layout.fillWidth: true }

                ConsoleButton {
                    tone: "secondary"
                    text: "Cancel"
                    onClicked: root.discardConfirmVisible = false
                }

                ConsoleButton {
                    tone: "danger"
                    text: "Discard"
                    onClicked: {
                        root.discardConfirmVisible = false
                        root.closeRequested()
                    }
                }
            }
        }
    }
}
