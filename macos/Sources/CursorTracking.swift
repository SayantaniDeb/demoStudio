import AppKit
import ScreenCaptureKit

// Poll position only while capturing; no event tap, key logging, or accessibility grant.
@MainActor
final class CursorTracking {
    private var timer: Timer?
    private var began: TimeInterval = 0
    private var bounds = CGRect.zero
    private var windowID: CGWindowID?
    private var tick = 0
    private var pressed = false
    private lazy var cursorShapes: [(Data, String)] = [
        (NSCursor.iBeam, "ibeam"), (NSCursor.iBeamCursorForVerticalLayout, "ibeam"),
        (NSCursor.pointingHand, "hand"), (NSCursor.openHand, "hand"), (NSCursor.closedHand, "hand"),
        (NSCursor.arrow, "arrow")
    ].compactMap { cursor, shape in cursor.image.tiffRepresentation.map { ($0, shape) } }
    private func currentShape() -> String? {
        guard let data = NSCursor.currentSystem?.image.tiffRepresentation else { return nil }
        return cursorShapes.first(where: { $0.0 == data })?.1
    }
    private(set) var samples: [NativeCursorSample] = []

    func start(filter: SCContentFilter) {
        stop()
        samples = []
        bounds = filter.contentRect
        if #available(macOS 15.2, *) {
            if filter.style == .window, let window = filter.includedWindows.first {
                windowID = window.windowID
                bounds = window.frame
            } else if let display = filter.includedDisplays.first {
                bounds = CGDisplayBounds(display.displayID)
            }
        }
        began = ProcessInfo.processInfo.systemUptime
        tick = 0
        pressed = false
        sample()
        let timer = Timer(timeInterval: 1.0 / 30, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.sample() }
        }
        self.timer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        windowID = nil
    }

    private func sample() {
        // Refresh a moving window's global bounds without enumerating other windows.
        if tick % 3 == 0, let id = windowID,
           let info = CGWindowListCopyWindowInfo(.optionIncludingWindow, id) as? [[String: Any]],
           let value = info.first?[kCGWindowBounds as String] as? NSDictionary,
           let rect = CGRect(dictionaryRepresentation: value) {
            bounds = rect
        }
        tick += 1
        guard bounds.width > 0, bounds.height > 0, let point = CGEvent(source: nil)?.location else { return }
        let down = CGEventSource.buttonState(.combinedSessionState, button: .left)
            || CGEventSource.buttonState(.combinedSessionState, button: .right)
        let clicked = down && !pressed
        pressed = down
        let time = ProcessInfo.processInfo.systemUptime - began
        if bounds.contains(point) {
            samples.append(NativeCursorSample(time: time, x: (point.x - bounds.minX) / bounds.width,
                y: (point.y - bounds.minY) / bounds.height, click: clicked, shape: currentShape()))
        } else if let last = samples.last {
            // Leaving the captured window should let zoom settle, not chase another app.
            samples.append(NativeCursorSample(time: time, x: last.x, y: last.y, click: false, shape: last.shape))
        }
    }
}
