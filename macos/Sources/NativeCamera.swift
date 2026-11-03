import AVFoundation
import AppKit
import SwiftUI

@MainActor
final class NativeCamera: NSObject, ObservableObject, AVCaptureFileOutputRecordingDelegate {
    // Capture configuration and recording operations are confined to `queue`.
    // The preview layer attaches to the session on the main thread.
    nonisolated(unsafe) let session = AVCaptureSession()
    nonisolated(unsafe) private let movie = AVCaptureMovieFileOutput()
    private let queue = DispatchQueue(label: "com.demotake.camera")
    @Published var ready = false
    @Published var deviceName = "Camera"
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    private var stopping: Task<Void, Never>?
    private var startWaiter: CheckedContinuation<Date, Error>?
    private var finishWaiter: CheckedContinuation<URL?, Never>?
    private var finishedURL: URL?
    private var finished = true
    private(set) var errorMessage: String?

    func prepare() async throws {
        if let stopping { await stopping.value }
        guard !ready else { return }
        guard await AVCaptureDevice.requestAccess(for: .video) else {
            throw NSError(domain: "DemoTake.Camera", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera access is off. Enable DemoTake in System Settings → Privacy & Security → Camera."])
        }
        let name: String = try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                do {
                    if session.inputs.isEmpty {
                        guard let device = AVCaptureDevice.default(for: .video) else {
                            throw NSError(domain: "DemoTake.Camera", code: 2, userInfo: [NSLocalizedDescriptionKey: "No camera is connected."])
                        }
                        let input = try AVCaptureDeviceInput(device: device)
                        session.beginConfiguration()
                        session.sessionPreset = session.canSetSessionPreset(.hd1280x720) ? .hd1280x720 : .high
                        guard session.canAddInput(input), session.canAddOutput(movie) else {
                            session.commitConfiguration()
                            throw NSError(domain: "DemoTake.Camera", code: 3, userInfo: [NSLocalizedDescriptionKey: "The camera cannot start. Close other camera apps and try again."])
                        }
                        session.addInput(input)
                        session.addOutput(movie)
                        session.commitConfiguration()
                    }
                    session.startRunning()
                    guard session.isRunning else {
                        throw NSError(domain: "DemoTake.Camera", code: 6, userInfo: [NSLocalizedDescriptionKey: "Camera could not start. Check its connection and close other camera apps."])
                    }
                    let name = (session.inputs.first as? AVCaptureDeviceInput)?.device.localizedName ?? "Camera"
                    continuation.resume(returning: name)
                } catch { continuation.resume(throwing: error) }
            }
        }
        deviceName = name
        previewLayer = AVCaptureVideoPreviewLayer(session: session)
        ready = true
    }

    func start(to url: URL) async throws -> Date {
        try await prepare()
        finished = false
        finishedURL = nil
        errorMessage = nil
        return try await withCheckedThrowingContinuation { continuation in
            startWaiter = continuation
            queue.async { [self] in movie.startRecording(to: url, recordingDelegate: self) }
        }
    }

    func finish() async -> URL? {
        if finished { return finishedURL }
        return await withCheckedContinuation { continuation in
            finishWaiter = continuation
            queue.async { [self] in if movie.isRecording { movie.stopRecording() } }
        }
    }

    func shutdown() {
        guard stopping == nil else { return }
        ready = false
        // Keep the preview layer alive while stopRunning waits on main-thread
        // AVFoundation callbacks. Releasing it concurrently deadlocks macOS.
        let retainedPreview = previewLayer
        stopping = Task { @MainActor in
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                queue.async { [self] in
                    session.stopRunning()
                    continuation.resume()
                }
            }
            retainedPreview?.session = nil
            retainedPreview?.removeFromSuperlayer()
            previewLayer = nil
            stopping = nil
        }
    }

    nonisolated func fileOutput(_ output: AVCaptureFileOutput, didStartRecordingTo fileURL: URL, from connections: [AVCaptureConnection]) {
        let date = Date()
        Task { @MainActor in
            self.startWaiter?.resume(returning: date)
            self.startWaiter = nil
        }
    }

    nonisolated func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        Task { @MainActor in
            let valid = error == nil || (error as NSError?)?.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool == true
            self.finished = true
            self.finishedURL = valid ? outputFileURL : nil
            self.errorMessage = valid ? nil : error?.localizedDescription
            if let waiter = self.startWaiter {
                waiter.resume(throwing: error ?? NSError(domain: "DemoTake.Camera", code: 4, userInfo: [NSLocalizedDescriptionKey: "Camera recording did not start."]))
                self.startWaiter = nil
            }
            self.finishWaiter?.resume(returning: self.finishedURL)
            self.finishWaiter = nil
        }
    }
}

struct CameraPreview: NSViewRepresentable {
    let preview: AVCaptureVideoPreviewLayer
    func makeNSView(context: Context) -> CameraPreviewView { CameraPreviewView(preview: preview) }
    func updateNSView(_ nsView: CameraPreviewView, context: Context) {}
}

final class CameraPreviewView: NSView {
    let preview: AVCaptureVideoPreviewLayer
    init(preview: AVCaptureVideoPreviewLayer) {
        self.preview = preview
        super.init(frame: .zero)
        wantsLayer = true
        preview.videoGravity = .resizeAspectFill
        layer?.addSublayer(preview)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
    override func layout() { super.layout(); preview.frame = bounds }
}
