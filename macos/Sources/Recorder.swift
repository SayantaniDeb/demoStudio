import AppKit
import AVFoundation
import ScreenCaptureKit
import SwiftUI

@MainActor
final class Recorder: NSObject, ObservableObject, SCRecordingOutputDelegate, SCStreamDelegate, SCContentSharingPickerObserver {
    @Published var picking = false
    @Published var countdown: Int?
    @Published var lastError: String?
    @Published var startedAt: Date?
    @Published var cameraEnabled = UserDefaults.standard.bool(forKey: "captureCamera")
    @Published var preparingCamera = false
    @Published var displayCapture = false
    let camera = NativeCamera()
    @Published var microphone = UserDefaults.standard.bool(forKey: "captureMicrophone") {
        didSet { UserDefaults.standard.set(microphone, forKey: "captureMicrophone") }
    }
    @Published var systemAudio = UserDefaults.standard.object(forKey: "captureSystemAudio") as? Bool ?? true {
        didSet { UserDefaults.standard.set(systemAudio, forKey: "captureSystemAudio") }
    }
    @Published var fps = UserDefaults.standard.object(forKey: "captureFPS") as? Int ?? 30 {
        didSet { UserDefaults.standard.set(fps, forKey: "captureFPS") }
    }
    @Published var changingMicrophone = false
    private let nativeMicrophone = NativeMicrophone()
    private var captureBegan: TimeInterval = 0
    private var microphoneFile: URL?
    @Published var busy = false
    @Published var recording = false
    @Published var status = "Recordings stay in your app library until you export."
    @Published var latest: URL?
    @Published var savedRecordings: [LibraryRecording] = []
    let library = RecordingLibrary()
    private var stream: SCStream?
    private var output: SCRecordingOutput?
    private var pending: URL?
    private var countdownTask: Task<Void, Never>?
    private var studioWindows: [NSWindow] = []
    private var controlsPanel: NSPanel?
    private var stopItem: NSStatusItem?
    private var stopTimer: Timer?
    private var cameraFinishTask: Task<URL?, Never>?
    private var cameraLead: Double = 0
    private let cursorTracking = CursorTracking()
    var onFinished: ((URL) -> Void)?
    var quitAfterSaving = false

    override init() {
        super.init()
        reloadLibrary()
        SCContentSharingPicker.shared.add(self)
    }

    func deleteRecording(_ item: LibraryRecording) {
        guard !recording && !busy else { return }
        do {
            try library.trashRecording(item.url)
            reloadLibrary()
            lastError = nil
            status = "Recording moved to Trash with its linked camera and cursor files."
        } catch { lastError = "Could not move recording to Trash: \(error.localizedDescription)" }
    }

    func reloadLibrary() {
        do {
            savedRecordings = try library.list()
            latest = savedRecordings.first?.url
        } catch { status = "Could not read your library: \(error.localizedDescription)" }
    }

    func importFile(_ url: URL) -> URL? {
        do {
            let saved = try library.importFile(url)
            reloadLibrary()
            status = "Video added to your app library."
            return saved
        } catch {
            status = "Could not import video: \(error.localizedDescription)"
            return nil
        }
    }

    func chooseContent() {
        guard !busy && !recording && !picking && countdown == nil else { return }
        lastError = nil
        picking = true
        NSApp.activate(ignoringOtherApps: true)
        status = "Choose a display or window in the macOS picker."
        let picker = SCContentSharingPicker.shared
        var config = SCContentSharingPickerConfiguration()
        config.allowedPickerModes = [.singleDisplay, .singleWindow]
        config.excludedBundleIDs = [Bundle.main.bundleIdentifier!]
        config.allowsChangingSelectedContent = false
        picker.defaultConfiguration = config
        picker.maximumStreamCount = 1
        picker.isActive = true
        picker.present()
    }

    func openControls() {
        guard !busy else { return }
        if controlsPanel == nil { controlsPanel = makeRecordingPanel(recorder: self) }
        hideStudio()
        resizeControls()
        controlsPanel?.orderFrontRegardless()
        if cameraEnabled && !camera.ready { Task { await setCameraEnabled(true) } }
    }

    func closeControls() {
        guard !recording && !busy else { return }
        cancelCountdown()
        restoreStudio()
        controlsPanel?.close()
        controlsPanel = nil
        camera.shutdown()
    }

    func setCameraEnabled(_ enabled: Bool) async {
        guard !recording && !busy && !preparingCamera else { return }
        preparingCamera = true
        defer { preparingCamera = false; resizeControls() }
        if enabled {
            do {
                try await camera.prepare()
                cameraEnabled = true
                lastError = nil
            } catch { cameraEnabled = false; lastError = error.localizedDescription }
        } else { cameraEnabled = false; camera.shutdown() }
        UserDefaults.standard.set(cameraEnabled, forKey: "captureCamera")
    }

    private func resizeControls() {
        guard let panel = controlsPanel else { return }
        let height: CGFloat = cameraEnabled ? 392 : 204
        let top = panel.frame.maxY
        panel.setFrame(NSRect(x: panel.frame.minX, y: top - height, width: 414, height: height), display: true)
    }

    private func hideStudio() {
        if studioWindows.isEmpty { studioWindows = NSApp.windows.filter { $0.isVisible && $0.title == "DemoTake" } }
        studioWindows.forEach { $0.orderOut(nil) }
    }

    func cancelCountdown() {
        countdownTask?.cancel()
        countdownTask = nil
        countdown = nil
        picking = false
        SCContentSharingPicker.shared.isActive = false
        status = "Recording cancelled."
    }

    nonisolated func contentSharingPicker(_ picker: SCContentSharingPicker, didCancelFor stream: SCStream?) {
        Task { @MainActor in
            guard self.stream == nil else { return }
            self.cancelCountdown()
        }
    }

    nonisolated func contentSharingPickerStartDidFailWithError(_ error: Error) {
        Task { @MainActor in self.picking = false; self.fail(error) }
    }

    nonisolated func contentSharingPicker(_ picker: SCContentSharingPicker, didUpdateWith filter: SCContentFilter, for stream: SCStream?) {
        Task { @MainActor in
            guard self.picking && self.stream == nil else { return }
            self.picking = false
            self.displayCapture = filter.style == .display
            self.countdownTask = Task { @MainActor in
                do {
                    for number in (1...3).reversed() {
                        self.countdown = number
                        try await Task.sleep(for: .seconds(1))
                    }
                    self.countdown = nil
                    self.countdownTask = nil
                    await self.start(filter: filter)
                } catch { self.countdown = nil }
            }
        }
    }

    private func restoreStudio() {
        for window in studioWindows { window.makeKeyAndOrderFront(nil) }
        studioWindows = []
        NSApp.activate(ignoringOtherApps: true)
    }

    private func microphoneAccess() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return true
        case .denied, .restricted: return false
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                // A permission-service failure must not leave controls permanently disabled.
                var completed = false
                AVCaptureDevice.requestAccess(for: .audio) { allowed in
                    Task { @MainActor in
                        guard !completed else { return }
                        completed = true
                        continuation.resume(returning: allowed)
                    }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
                    guard !completed else { return }
                    completed = true
                    continuation.resume(returning: false)
                }
            }
        @unknown default: return false
        }
    }

    func setMicrophone(_ enabled: Bool) async {
        guard !changingMicrophone && !busy else { return }
        changingMicrophone = true
        defer { changingMicrophone = false }
        if enabled {
            guard await microphoneAccess() else {
                lastError = "Microphone access is off. Enable DemoTake in System Settings → Privacy & Security → Microphone, then try again."
                return
            }
        }
        do {
            if recording && enabled && microphoneFile == nil, let pending {
                let url = pending.deletingPathExtension().appendingPathExtension("microphone.caf")
                try await nativeMicrophone.start(to: url)
                microphoneFile = url
            }
            nativeMicrophone.setMuted(!enabled)
            microphone = enabled
            lastError = nil
        } catch { lastError = "Could not enable microphone: \(error.localizedDescription)" }
    }

    private func start(filter: SCContentFilter) async {
        guard !busy && !recording else { return }
        busy = true
        defer { if !recording { busy = false } }
        do {
            if microphone {
                let allowed = await microphoneAccess()
                if !allowed {
                    throw NSError(domain: "DemoTake", code: 1, userInfo: [NSLocalizedDescriptionKey: "Microphone access was denied. Enable it in System Settings or turn off microphone recording."])
                }
            }
            try library.prepare()
            let name = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
            let url = library.pending.appendingPathComponent("DemoTake-\(name)-\(UUID().uuidString.prefix(6)).mp4")
            var cameraStarted: Date?
            cameraLead = 0
            cameraFinishTask = nil
            if cameraEnabled {
                cameraStarted = try await camera.start(to: url.deletingPathExtension().appendingPathExtension("mov"))
            }
            microphoneFile = nil
            if microphone {
                let micURL = url.deletingPathExtension().appendingPathExtension("microphone.caf")
                try await nativeMicrophone.start(to: micURL)
                microphoneFile = micURL
            }
            let config = SCStreamConfiguration()
            let rect = filter.contentRect
            let pixelScale = Double(filter.pointPixelScale)
            let width = max(2.0, Double(rect.width) * pixelScale)
            let height = max(2.0, Double(rect.height) * pixelScale)
            let scale = min(1.0, 1920.0 / width, 1080.0 / height)
            config.width = max(2, Int(width * scale) / 2 * 2)
            config.height = max(2, Int(height * scale) / 2 * 2)
            config.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(fps))
            config.queueDepth = 5
            config.showsCursor = false
            config.capturesAudio = systemAudio
            config.excludesCurrentProcessAudio = true
            config.captureMicrophone = false // Live microphone is captured independently.
            let fileConfig = SCRecordingOutputConfiguration()
            fileConfig.outputURL = url
            fileConfig.videoCodecType = .h264
            fileConfig.outputFileType = .mp4
            let output = SCRecordingOutput(configuration: fileConfig, delegate: self)
            let stream = SCStream(filter: filter, configuration: config, delegate: self)
            try stream.addRecordingOutput(output)
            self.stream = stream
            self.output = output
            pending = url
            status = "Starting…"
            hideStudio()
            try await stream.startCapture()
            guard self.stream === stream else { return }
            recording = true
            startedAt = Date()
            captureBegan = ProcessInfo.processInfo.systemUptime
            cursorTracking.start(filter: filter)
            if let date = cameraStarted { cameraLead = max(0, startedAt!.timeIntervalSince(date)) }
            busy = false
            showStopButton()
            if controlsPanel == nil { controlsPanel = makeRecordingPanel(recorder: self) }
            resizeControls()
            controlsPanel?.orderFrontRegardless()
            status = "Recording to app library · \(config.width) × \(config.height) · \(fps) fps"
            if quitAfterSaving { await stop() }
        } catch {
            fail(error)
        }
    }

    func stop() async {
        while changingMicrophone { try? await Task.sleep(nanoseconds: 20_000_000) }
        guard let stream, recording, !busy else { return }
        busy = true
        cursorTracking.stop()
        if cameraEnabled && cameraFinishTask == nil { cameraFinishTask = Task { await camera.finish() } }
        stopItem?.button?.title = " Saving…"
        stopItem?.button?.isEnabled = false
        status = "Finishing MP4… Please keep the app open."
        do { try await stream.stopCapture() }
        catch { fail(error) }
    }

    func prepareToQuit() {
        quitAfterSaving = true
        if recording && !busy { Task { await stop() } }
    }

    private func showStopButton() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        stopItem = item
        item.button?.image = NSImage(systemSymbolName: "stop.circle.fill", accessibilityDescription: "Stop recording")
        item.button?.imagePosition = .imageLeading
        item.button?.font = .monospacedDigitSystemFont(ofSize: 12, weight: .semibold)
        item.button?.title = " Stop 00:00"
        item.button?.toolTip = "Click to stop and save your recording to the Library"
        item.button?.target = self
        item.button?.action = #selector(stopFromMenuBar)
        let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.recording, !self.busy, let date = self.startedAt else { return }
                let elapsed = Int(Date().timeIntervalSince(date))
                self.stopItem?.button?.title = String(format: " Stop %02d:%02d", elapsed / 60, elapsed % 60)
            }
        }
        stopTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    @objc private func stopFromMenuBar() { Task { await stop() } }

    private func removeStopButton() {
        stopTimer?.invalidate()
        stopTimer = nil
        if let item = stopItem { NSStatusBar.system.removeStatusItem(item) }
        stopItem = nil
    }

    private func fail(_ error: Error) {
        cursorTracking.stop()
        Task { _ = await nativeMicrophone.finish() }
        microphoneFile = nil
        let cleanup = cameraFinishTask ?? Task { await camera.finish() }
        Task { _ = await cleanup.value; camera.shutdown() }
        removeStopButton()
        controlsPanel?.close()
        controlsPanel = nil
        lastError = "\((error as NSError).domain) (\((error as NSError).code)): \(error.localizedDescription)"
        picking = false
        countdown = nil
        recording = false
        startedAt = nil
        busy = false
        SCContentSharingPicker.shared.isActive = false
        restoreStudio()
        stream = nil
        output = nil
        status = "Recording error: \(error.localizedDescription). Any unfinished file remains in the app's In Progress folder."
        pending = nil
        if quitAfterSaving {
            quitAfterSaving = false
            NSApp.reply(toApplicationShouldTerminate: false)
        }
    }

    nonisolated func recordingOutput(_ recordingOutput: SCRecordingOutput, didFailWithError error: Error) {
        Task { @MainActor in
            guard self.output === recordingOutput else { return }
            self.fail(error)
        }
    }

    nonisolated func recordingOutputDidFinishRecording(_ recordingOutput: SCRecordingOutput) {
        Task { @MainActor in
            guard self.output === recordingOutput else { return }
            guard let url = self.pending else { return }
            self.busy = true
            while self.changingMicrophone { try? await Task.sleep(nanoseconds: 20_000_000) }
            self.cursorTracking.stop()
            var finishedURL: URL?
            do {
                var finalized = url
                if let mic = await self.nativeMicrophone.finish() {
                    if let error = mic.error { self.lastError = "Microphone write failed: \(error.localizedDescription). Its file remains in In Progress." }
                    else {
                        do {
                            self.status = "Saving microphone audio…"
                            let mixed = try await NativeMicrophone.merge(screen: url, microphone: mic.url, offset: mic.began - self.captureBegan)
                            if mixed != url {
                                // Retain raw files until the merged video has safely reached the library.
                                finalized = mixed
                            }
                        } catch { self.lastError = "Screen saved, but microphone mixing failed: \(error.localizedDescription). The microphone file remains in In Progress." }
                    }
                }
                self.microphoneFile = nil
                let saved: URL
                if finalized != url {
                    let destination = self.library.recordings.appendingPathComponent(url.lastPathComponent)
                    try self.library.prepare()
                    try FileManager.default.moveItem(at: finalized, to: destination)
                    saved = destination
                    try? FileManager.default.removeItem(at: url)
                    try? FileManager.default.removeItem(at: url.deletingPathExtension().appendingPathExtension("microphone.caf"))
                } else { saved = try self.library.finalize(url) }
                finishedURL = saved
                do { try self.library.saveCursor(self.cursorTracking.samples, for: saved) }
                catch { self.lastError = "Video saved, but cursor-follow data could not be saved: \(error.localizedDescription)" }
                if self.cameraEnabled {
                    if self.cameraFinishTask == nil { self.cameraFinishTask = Task { await self.camera.finish() } }
                    let job = self.cameraFinishTask!
                    if let cameraURL = await job.value {
                        do { try await self.library.finalizeCamera(cameraURL, for: saved, lead: self.cameraLead) }
                        catch { self.lastError = "Screen saved, but camera attachment failed: \(error.localizedDescription)" }
                    } else { self.lastError = "Screen saved. Camera recording failed: \(self.camera.errorMessage ?? "No camera file was produced.")" }
                }
                self.camera.shutdown()
                self.cameraFinishTask = nil
                self.reloadLibrary()
                self.latest = saved
                self.status = "Saved in your library. Choose Edit recording, or open Library to browse saved videos."
            } catch {
                self.lastError = "Could not save recording: \(error.localizedDescription)"
                self.status = "Could not add recording to your library: \(error.localizedDescription). The original remains in the app's In Progress folder."
            }
            self.pending = nil
            self.removeStopButton()
            self.controlsPanel?.close()
            self.controlsPanel = nil
            self.recording = false
            self.startedAt = nil
            SCContentSharingPicker.shared.isActive = false
            self.busy = false
            self.stream = nil
            self.output = nil
            if self.quitAfterSaving {
                self.quitAfterSaving = false
                NSApp.reply(toApplicationShouldTerminate: finishedURL != nil)
                if finishedURL == nil { self.restoreStudio() }
            } else {
                self.restoreStudio()
                if let saved = finishedURL { self.onFinished?(saved) }
            }
        }
    }

    nonisolated func stream(_ stream: SCStream, didStopWithError error: Error) {
        Task { @MainActor in
            guard self.stream === stream else { return }
            if (error as NSError).domain == SCStreamErrorDomain && (error as NSError).code == -3817 {
                self.recording = false
                self.busy = true
                self.status = "Saving your recording…"
                self.restoreStudio()
            } else { self.fail(error) }
        }
    }
}
