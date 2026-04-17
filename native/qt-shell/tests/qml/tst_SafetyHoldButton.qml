import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "SafetyHoldButton"
    when: windowShown
    width: 220
    height: 120

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: buttonComponent

        SafetyHoldButton {
            width: 160
            height: 40
            text: "Hold"
            delay: 60
        }
    }

    function createButton() {
        const button = createTemporaryObject(buttonComponent, container)
        verify(button !== null)
        waitForRendering(button)
        return button
    }

    function test_buttonUsesSharedSizingAndTypography() {
        const button = createButton()
        compare(button.implicitHeight, 34)
        compare(button.font.pixelSize, 12)
        compare(button.font.weight, Font.DemiBold)
        compare(button.delay, 60)
    }

    function test_buttonStartsIdle() {
        const button = createButton()
        compare(button.down, false)
        compare(button.progress, 0)
    }
}
