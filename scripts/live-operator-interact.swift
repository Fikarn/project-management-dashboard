import AppKit
import CoreGraphics
import Foundation

enum LiveOperatorInteractError: Error, CustomStringConvertible {
    case usage(String)
    case invalidNumber(String)
    case unsupportedAction(String)
    case targetAppNotRunning(String)
    case targetWindowNotFound(String)
    case captureFailed(String)
    case writeFailed(String)
    case commandFailed(String)

    var description: String {
        switch self {
        case .usage(let message):
            return message
        case .invalidNumber(let value):
            return "Invalid numeric value: \(value)"
        case .unsupportedAction(let action):
            return "Unsupported action: \(action)"
        case .targetAppNotRunning(let appName):
            return "Target app is not running: \(appName)"
        case .targetWindowNotFound(let appName):
            return "Target app does not expose a visible window: \(appName)"
        case .captureFailed(let appName):
            return "Failed to capture target window for app: \(appName)"
        case .writeFailed(let path):
            return "Failed to write image data to: \(path)"
        case .commandFailed(let command):
            return "Command failed: \(command)"
        }
    }
}

struct WindowTarget {
    let id: CGWindowID
    let bounds: CGRect
}

let requiredOperatorCaptureSize = CGSize(width: 2560, height: 1440)

func fallbackFrame() -> CGRect {
    NSScreen.main?.frame ?? CGRect(x: 0, y: 0, width: 1440, height: 900)
}

func resolveTargetApplication(named appName: String) -> NSRunningApplication? {
    let normalizedAppName = appName.replacingOccurrences(of: ".app", with: "")
    let matches = NSWorkspace.shared.runningApplications.filter { application in
        let localizedName = application.localizedName?.lowercased()
        let bundleName = application.bundleURL?.deletingPathExtension().lastPathComponent.lowercased()
        let executableName = application.executableURL?.deletingPathExtension().lastPathComponent.lowercased()
        return localizedName == normalizedAppName.lowercased()
            || bundleName == normalizedAppName.lowercased()
            || executableName == normalizedAppName.lowercased()
    }

    if let active = matches.first(where: \.isActive) {
        return active
    }

    return matches.sorted(by: { lhs, rhs in
        if lhs.processIdentifier != rhs.processIdentifier {
            return lhs.processIdentifier > rhs.processIdentifier
        }
        return false
    }).first
}

func activateTargetApplication(named appName: String) throws -> NSRunningApplication {
    guard let application = resolveTargetApplication(named: appName) else {
        throw LiveOperatorInteractError.targetAppNotRunning(appName)
    }

    application.activate(options: [.activateAllWindows])
    usleep(300_000)
    return application
}

func postEvent(_ event: CGEvent?, targetPid: pid_t?) {
    guard let event else {
        return
    }

    if let targetPid {
        event.postToPid(targetPid)
    } else {
        event.post(tap: .cgAnnotatedSessionEventTap)
    }
}

func resolveTargetWindow(for application: NSRunningApplication) -> WindowTarget? {
    guard let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
        as? [[String: Any]]
    else {
        return nil
    }

    let targetPid = Int(application.processIdentifier)
    var bestWindow: WindowTarget?
    var bestArea: CGFloat = 0

    for windowInfo in windowList {
        let ownerPid = (windowInfo[kCGWindowOwnerPID as String] as? NSNumber)?.intValue ?? -1
        let layer = (windowInfo[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
        let alpha = (windowInfo[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1.0
        guard ownerPid == targetPid, layer == 0, alpha > 0 else {
            continue
        }

        guard let windowNumber = (windowInfo[kCGWindowNumber as String] as? NSNumber)?.uint32Value,
              let boundsDictionary = windowInfo[kCGWindowBounds as String] as? NSDictionary,
              let bounds = CGRect(dictionaryRepresentation: boundsDictionary)
        else {
            continue
        }

        guard bounds.width > 0, bounds.height > 0 else {
            continue
        }

        let area = bounds.width * bounds.height
        if area > bestArea {
            bestArea = area
            bestWindow = WindowTarget(id: windowNumber, bounds: bounds)
        }
    }

    return bestWindow
}

func targetFrame(for application: NSRunningApplication) -> CGRect {
    resolveTargetWindow(for: application)?.bounds ?? fallbackFrame()
}

func screenContainingWindow(_ bounds: CGRect) -> NSScreen? {
    NSScreen.screens.first(where: { screen in
        screen.frame.intersects(bounds)
    })
}

func cgPointFromNormalized(x: Double, y: Double, application: NSRunningApplication) -> CGPoint {
    let frame = targetFrame(for: application)
    return CGPoint(
        x: frame.origin.x + frame.size.width * x,
        y: frame.origin.y + frame.size.height * (1.0 - y)
    )
}

func postMouseClick(at point: CGPoint, targetPid: pid_t?) {
    let source = CGEventSource(stateID: .combinedSessionState)
    CGWarpMouseCursorPosition(point)
    usleep(60_000)

    let move = CGEvent(
        mouseEventSource: source,
        mouseType: .mouseMoved,
        mouseCursorPosition: point,
        mouseButton: .left
    )
    postEvent(move, targetPid: targetPid)
    usleep(40_000)

    guard let down = CGEvent(
        mouseEventSource: source,
        mouseType: .leftMouseDown,
        mouseCursorPosition: point,
        mouseButton: .left
    ), let up = CGEvent(
        mouseEventSource: source,
        mouseType: .leftMouseUp,
        mouseCursorPosition: point,
        mouseButton: .left
    ) else {
        return
    }

    postEvent(down, targetPid: targetPid)
    usleep(40_000)
    postEvent(up, targetPid: targetPid)
}

func keyDefinition(for value: String) -> (keyCode: CGKeyCode, flags: CGEventFlags)? {
    switch value.lowercased() {
    case "enter", "return":
        return (36, [])
    case "escape", "esc":
        return (53, [])
    case "tab":
        return (48, [])
    case "space":
        return (49, [])
    case "left", "arrowleft":
        return (123, [])
    case "right", "arrowright":
        return (124, [])
    case "down", "arrowdown":
        return (125, [])
    case "up", "arrowup":
        return (126, [])
    default:
        break
    }

    guard value.count == 1, let scalar = value.unicodeScalars.first else {
        return nil
    }

    let keyCode: CGKeyCode?
    switch scalar {
    case "a", "A": keyCode = 0
    case "s", "S": keyCode = 1
    case "d", "D": keyCode = 2
    case "f", "F": keyCode = 3
    case "h", "H": keyCode = 4
    case "g", "G": keyCode = 5
    case "z", "Z": keyCode = 6
    case "x", "X": keyCode = 7
    case "c", "C": keyCode = 8
    case "v", "V": keyCode = 9
    case "b", "B": keyCode = 11
    case "q", "Q": keyCode = 12
    case "w", "W": keyCode = 13
    case "e", "E": keyCode = 14
    case "r", "R": keyCode = 15
    case "y", "Y": keyCode = 16
    case "t", "T": keyCode = 17
    case "1": keyCode = 18
    case "2": keyCode = 19
    case "3": keyCode = 20
    case "4": keyCode = 21
    case "6": keyCode = 22
    case "5": keyCode = 23
    case "=": keyCode = 24
    case "9": keyCode = 25
    case "7": keyCode = 26
    case "-": keyCode = 27
    case "8": keyCode = 28
    case "0": keyCode = 29
    case "]": keyCode = 30
    case "o", "O": keyCode = 31
    case "u", "U": keyCode = 32
    case "[": keyCode = 33
    case "i", "I": keyCode = 34
    case "p", "P": keyCode = 35
    case "l", "L": keyCode = 37
    case "j", "J": keyCode = 38
    case "'": keyCode = 39
    case "k", "K": keyCode = 40
    case ";": keyCode = 41
    case "\\": keyCode = 42
    case ",": keyCode = 43
    case "/": keyCode = 44
    case "n", "N": keyCode = 45
    case "m", "M": keyCode = 46
    case ".": keyCode = 47
    case "`": keyCode = 50
    case " ": keyCode = 49
    default: keyCode = nil
    }

    guard let keyCode else {
        return nil
    }

    let needsShift = scalar == "?"
    return (keyCode, needsShift ? .maskShift : [])
}

func postKey(_ value: String, targetPid: pid_t?) {
    guard let definition = keyDefinition(for: value) else {
        return
    }

    let source = CGEventSource(stateID: .combinedSessionState)
    let down = CGEvent(keyboardEventSource: source, virtualKey: definition.keyCode, keyDown: true)
    down?.flags = definition.flags
    let up = CGEvent(keyboardEventSource: source, virtualKey: definition.keyCode, keyDown: false)
    up?.flags = definition.flags

    postEvent(down, targetPid: targetPid)
    usleep(40_000)
    postEvent(up, targetPid: targetPid)
}

func printWindowInfo(_ targetWindow: WindowTarget) throws {
    let payload: [String: Any] = [
        "windowId": targetWindow.id,
        "bounds": [
            "x": targetWindow.bounds.origin.x,
            "y": targetWindow.bounds.origin.y,
            "width": targetWindow.bounds.size.width,
            "height": targetWindow.bounds.size.height,
        ],
    ]
    let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
    guard let output = String(data: data, encoding: .utf8) else {
        return
    }
    print(output)
}

func captureWindow(_ targetWindow: WindowTarget, to outputPath: String, appName: String) throws {
    guard let targetScreen = screenContainingWindow(targetWindow.bounds) else {
        throw LiveOperatorInteractError.captureFailed(appName)
    }

    guard Int(targetScreen.frame.width.rounded()) == Int(requiredOperatorCaptureSize.width),
          Int(targetScreen.frame.height.rounded()) == Int(requiredOperatorCaptureSize.height) else {
        throw LiveOperatorInteractError.captureFailed(
            "\(appName) (operator parity requires fullscreen capture on the 2560x1440 monitor)"
        )
    }

    let captureProcess = Process()
    captureProcess.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    captureProcess.arguments = [
        "-x",
        "-R",
        "\(Int(targetScreen.frame.origin.x.rounded())),\(Int(targetScreen.frame.origin.y.rounded())),\(Int(targetScreen.frame.width.rounded())),\(Int(targetScreen.frame.height.rounded()))",
        outputPath,
    ]

    do {
        try captureProcess.run()
    } catch {
        throw LiveOperatorInteractError.commandFailed("/usr/sbin/screencapture")
    }
    captureProcess.waitUntilExit()

    guard captureProcess.terminationStatus == 0 else {
        throw LiveOperatorInteractError.captureFailed(appName)
    }
}

do {
    let arguments = Array(CommandLine.arguments.dropFirst())
    let targetAppName = ProcessInfo.processInfo.environment["SSE_LIVE_APP_NAME"] ?? "sse_exed_native"
    guard let action = arguments.first else {
        throw LiveOperatorInteractError.usage(
            "Usage: swift scripts/live-operator-interact.swift click-normalized <x> <y> | key <value> | window-info | capture-window <path>"
        )
    }

    let targetApplication = try activateTargetApplication(named: targetAppName)
    let targetWindow = resolveTargetWindow(for: targetApplication)

    switch action {
    case "click-normalized":
        guard arguments.count == 3 else {
            throw LiveOperatorInteractError.usage(
                "Usage: swift scripts/live-operator-interact.swift click-normalized <x> <y>"
            )
        }

        guard let x = Double(arguments[1]) else {
            throw LiveOperatorInteractError.invalidNumber(arguments[1])
        }
        guard let y = Double(arguments[2]) else {
            throw LiveOperatorInteractError.invalidNumber(arguments[2])
        }

        let point = cgPointFromNormalized(x: x, y: y, application: targetApplication)
        postMouseClick(at: point, targetPid: targetApplication.processIdentifier)
    case "key":
        guard arguments.count == 2 else {
            throw LiveOperatorInteractError.usage(
                "Usage: swift scripts/live-operator-interact.swift key <value>"
            )
        }

        postKey(arguments[1], targetPid: targetApplication.processIdentifier)
    case "window-info":
        guard let targetWindow else {
            throw LiveOperatorInteractError.targetWindowNotFound(targetAppName)
        }

        try printWindowInfo(targetWindow)
    case "capture-window":
        guard arguments.count == 2 else {
            throw LiveOperatorInteractError.usage(
                "Usage: swift scripts/live-operator-interact.swift capture-window <path>"
            )
        }

        guard let targetWindow else {
            throw LiveOperatorInteractError.targetWindowNotFound(targetAppName)
        }

        try captureWindow(targetWindow, to: arguments[1], appName: targetAppName)
    default:
        throw LiveOperatorInteractError.unsupportedAction(action)
    }
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
