import QtQuick
import QtQuick.Controls
import QtTest
import "../../qml"

TestCase {
    name: "LightingWorkspacePanel"
    when: windowShown
    width: 1920
    height: 1080

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: workspaceHostComponent

        Item {
            id: host
            width: 1920
            height: 1080
            property bool persistState: false
            property string settingsScope: "testLightingWorkspace"

            property alias panel: lightingPanel
            property alias engine: engineControllerStub
            property real dashboardUiScale: 1.0
            property bool lightingEnabledDraft: true
            property string lightingBridgeIpDraft: "127.0.0.1"
            property int lightingUniverseDraft: 1
            property int lightingGrandMasterDraft: 100
            property string lightingNewFixtureNameDraft: "Add Key"
            property string lightingNewFixtureTypeDraft: "astra-bicolor"
            property int lightingNewFixtureDmxDraft: 97
            property string lightingNewFixtureGroupDraft: "group-key"
            property string lightingNewGroupNameDraft: ""
            property string lightingNewSceneNameDraft: ""

            function lightingGroupOptions() {
                return [{ "id": "", "name": "Ungrouped" }].concat(engineControllerStub.lightingGroups)
            }

            function lightingGroupIndex(groupId, options) {
                const target = groupId || ""
                for (let index = 0; index < options.length; index += 1) {
                    if (options[index].id === target) {
                        return index
                    }
                }
                return 0
            }

            function lightingGroupName(groupId) {
                if (!groupId) {
                    return "Ungrouped"
                }
                return groupId === "group-key" ? "Key" : groupId
            }

            function lightingFixtureTypeOptions() {
                return [
                    { "id": "astra-bicolor", "name": "Litepanels Astra", "channels": 2, "minCct": 3200, "maxCct": 5600 },
                    { "id": "infinibar-pb12", "name": "Aputure Infinibar PB12", "channels": 8, "minCct": 2000, "maxCct": 10000 }
                ]
            }

            function lightingFixtureTypeIndex(fixtureType, options) {
                for (let index = 0; index < options.length; index += 1) {
                    if (options[index].id === fixtureType) {
                        return index
                    }
                }
                return 0
            }

            function lightingFixtureTypeName(fixtureType) {
                return fixtureType === "infinibar-pb12" ? "Aputure Infinibar PB12" : "Litepanels Astra"
            }

            function lightingFixtureMaxStartAddress(fixtureType) {
                return fixtureType === "infinibar-pb12" ? 505 : 511
            }

            function lightingFixtureMinCct(fixtureType) {
                return fixtureType === "infinibar-pb12" ? 2000 : 3200
            }

            function lightingFixtureMaxCct(fixtureType) {
                return fixtureType === "infinibar-pb12" ? 10000 : 5600
            }

            function lightingEffectOptions() {
                return [
                    { "id": "pulse", "name": "Pulse" },
                    { "id": "strobe", "name": "Strobe" }
                ]
            }

            function lightingEffectName(effect) {
                if (!effect || !effect.type) {
                    return "No FX"
                }
                return effect.type === "pulse" ? "Pulse" : "Strobe"
            }

            function lightingSceneOptions() {
                return [{ "id": "", "name": "No scene focus" }].concat(engineControllerStub.lightingScenes)
            }

            function lightingSceneIndex(sceneId, options) {
                const target = sceneId || ""
                for (let index = 0; index < options.length; index += 1) {
                    if (options[index].id === target) {
                        return index
                    }
                }
                return 0
            }

            function lightingFixtureOptions() {
                return [{ "id": "", "name": "No selection" }].concat(engineControllerStub.lightingFixtures)
            }

            function lightingFixtureIndex(fixtureId, options) {
                const target = fixtureId || ""
                for (let index = 0; index < options.length; index += 1) {
                    if (options[index].id === target) {
                        return index
                    }
                }
                return 0
            }

            function lightingFixtureById(fixtureId) {
                for (let index = 0; index < engineControllerStub.lightingFixtures.length; index += 1) {
                    if (engineControllerStub.lightingFixtures[index].id === fixtureId) {
                        return engineControllerStub.lightingFixtures[index]
                    }
                }
                return null
            }

            function lightingSpatialPercent(value, fallbackPercent) {
                return value === undefined || value === null ? fallbackPercent : value * 100
            }

            function lightingSpatialRotation(value) {
                return value === undefined || value === null ? 0 : value
            }

            function lightingHasMarker(marker) {
                return !!marker && marker.x !== undefined && marker.x !== null && marker.y !== undefined && marker.y !== null
            }

            function lightingMarkerPercent(marker, axis, fallbackPercent) {
                return lightingHasMarker(marker) ? marker[axis] * 100 : fallbackPercent
            }

            function lightingMarkerRotation(marker) {
                return lightingHasMarker(marker) ? marker.rotation : 0
            }

            function lightingMarkerPayload(markerKey, markerValue) {
                if (markerKey === "cameraMarker") {
                    return { "cameraMarker": markerValue }
                }
                return { "subjectMarker": markerValue }
            }

            function formatEnumLabel(value) {
                return value === "infinibar-pb12"
                       ? "Infinibar PB12"
                       : value.charAt(0).toUpperCase() + value.slice(1)
            }

            function formatTimestamp(value) {
                return value
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "lighting"
                property bool lightingSnapshotLoaded: true
                property int lightingFixtureCount: 3
                property int lightingGroupCount: 1
                property int lightingSceneCount: 1
                property bool lightingReachable: true
                property bool lightingEnabled: true
                property string lightingBridgeIp: "127.0.0.1"
                property int lightingUniverse: 1
                property int lightingGrandMaster: 100
                property string lightingSelectedFixtureId: "fixture-1"
                property string lightingSelectedSceneId: "scene-1"
                property var lightingCameraMarker: { "x": 0.5, "y": 0.84, "rotation": 0 }
                property var lightingSubjectMarker: { "x": 0.5, "y": 0.46, "rotation": 0 }
                property var lightingGroups: [
                    { "id": "group-key", "name": "Key", "fixtureCount": 2 }
                ]
                property var lightingScenes: [
                    { "id": "scene-1", "name": "Interview", "lastRecalled": false, "lastRecalledAt": "" }
                ]
                property var lightingFixtures: [
                    {
                        "id": "fixture-1",
                        "name": "Key Left",
                        "groupId": "group-key",
                        "dmxStartAddress": 1,
                        "type": "astra-bicolor",
                        "on": true,
                        "intensity": 72,
                        "cct": 5600,
                        "spatialX": 0.24,
                        "spatialY": 0.32,
                        "spatialRotation": 0,
                        "effect": null
                    },
                    {
                        "id": "fixture-2",
                        "name": "Key Right",
                        "groupId": "group-key",
                        "dmxStartAddress": 17,
                        "type": "astra-bicolor",
                        "on": false,
                        "intensity": 46,
                        "cct": 4300,
                        "spatialX": 0.72,
                        "spatialY": 0.33,
                        "spatialRotation": 0,
                        "effect": { "type": "pulse", "speed": 5 }
                    },
                    {
                        "id": "fixture-3",
                        "name": "Back Light",
                        "groupId": "",
                        "dmxStartAddress": 33,
                        "type": "infinibar-pb12",
                        "on": true,
                        "intensity": 100,
                        "cct": 3200,
                        "spatialX": null,
                        "spatialY": null,
                        "spatialRotation": 0,
                        "effect": null
                    }
                ]
                property bool lightingDmxMonitorLoaded: true
                property var lightingDmxChannels: [
                    { "channel": 1, "value": 255, "lightName": "Key Left", "label": "Intensity" },
                    { "channel": 2, "value": 128, "lightName": "Key Left", "label": "CCT" }
                ]
                property int lightingDmxRequests: 0

                function requestLightingSnapshot() {}
                function requestLightingDmxMonitorSnapshot() { lightingDmxRequests += 1 }
                function setLightingAllPower(on) {}
                function updateLightingSettings(changes) {
                    if (changes.selectedFixtureId !== undefined) {
                        lightingSelectedFixtureId = changes.selectedFixtureId ? changes.selectedFixtureId : ""
                    }
                }
                function runLightingProbe(bridgeIp, universe) {}
                function createLightingFixture(fixture) {}
                function setLightingFixturePower(fixtureId, on) {}
                function updateLightingFixture(fixtureId, changes) {}
                function createLightingScene(name) {}
                function updateLightingScene(sceneId, changes) {}
                function deleteLightingScene(sceneId) {}
                function createLightingGroup(name) {}
                function updateLightingGroup(groupId, changes) {}
                function deleteLightingGroup(groupId) {}
                function setLightingGroupPower(groupId, on) {}
                function recallLightingScene(sceneId) {}
            }

            LightingWorkspacePanel {
                id: lightingPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                persistState: host.persistState
                settingsScope: host.settingsScope
                scaleFactor: host.dashboardUiScale
            }
        }
    }

    function createHost(properties) {
        const host = createTemporaryObject(workspaceHostComponent, container, properties || {})
        verify(host !== null)
        waitForRendering(host)
        wait(0)
        return host
    }

    function findByObjectName(item, objectName) {
        if (!item) {
            return null
        }

        if (item.objectName === objectName) {
            return item
        }

        const childItems = item.children || []
        for (let index = 0; index < childItems.length; index += 1) {
            const match = findByObjectName(childItems[index], objectName)
            if (match) {
                return match
            }
        }

        return null
    }

    function pressButton(button) {
        verify(button !== null)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_workspaceFitsOperatorViewport() {
        const host = createHost()
        compare(host.panel.contentFitsViewport(), true)
    }

    function test_viewModeAndDmxToggle_are_shellLocal() {
        const host = createHost()
        const listButton = findByObjectName(host.panel, "lighting-view-compact")
        const dmxToggle = findByObjectName(host.panel, "lighting-monitor-toggle")

        compare(host.panel.viewMode, "expanded")
        pressButton(listButton)
        compare(host.panel.viewMode, "compact")

        compare(host.panel.showDmxMonitor, false)
        pressButton(dmxToggle)
        compare(host.panel.showDmxMonitor, true)
        compare(host.engine.lightingDmxRequests, 1)
    }

    function test_workspaceState_persists_when_enabled() {
        const scope = "testLightingWorkspace-" + Date.now() + "-" + Math.round(Math.random() * 100000)
        const firstHost = createHost({
            "persistState": true,
            "settingsScope": scope
        })

        firstHost.panel.viewMode = "spatial"
        firstHost.panel.showDmxMonitor = true
        firstHost.panel.sidebarPreferredWidth = 418
        wait(0)
        firstHost.destroy()
        wait(0)

        const restoredHost = createHost({
            "persistState": true,
            "settingsScope": scope
        })
        compare(restoredHost.panel.viewMode, "spatial")
        compare(restoredHost.panel.showDmxMonitor, true)
        compare(restoredHost.panel.sidebarPreferredWidth, 418)
    }
}
