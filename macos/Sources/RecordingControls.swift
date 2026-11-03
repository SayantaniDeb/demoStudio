import AppKit
import SwiftUI

@MainActor
func makeRecordingPanel(recorder: Recorder) -> NSPanel {
    let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 414, height: 204), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    panel.title = "DemoTake recording controls"
    panel.level = .floating
    panel.hidesOnDeactivate = false
    panel.isReleasedWhenClosed = false
    panel.isMovableByWindowBackground = true
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.sharingType = .none
    panel.contentView = NSHostingView(rootView: RecordingControls(recorder: recorder))
    if let screen = NSScreen.main {
        let frame = screen.visibleFrame
        panel.setFrameOrigin(NSPoint(x: frame.midX - 207, y: frame.maxY - 260))
    }
    return panel
}

struct RecordingControls: View {
    @ObservedObject var recorder: Recorder
    private var locked: Bool { recorder.recording || recorder.busy || recorder.picking || recorder.countdown != nil }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "record.circle").foregroundStyle(recorder.recording ? .red : Color.primary)
                Text(recorder.recording ? "Recording" : "Ready to record").font(.system(size: 14, weight: .semibold))
                Spacer()
                if let date = recorder.startedAt {
                    Text(date, style: .timer).font(.system(size: 12, design: .monospaced))
                }
                if !locked && !recorder.preparingCamera {
                    Button { recorder.closeControls() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Close recording controls")
                }
            }
            if recorder.cameraEnabled {
                NativeCameraPreview(camera: recorder.camera).frame(height: 176)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            HStack(spacing: 10) {
                Toggle("Camera", isOn: Binding(get: { recorder.cameraEnabled }, set: { value in Task { await recorder.setCameraEnabled(value) } }))
                    .disabled(locked || recorder.preparingCamera)
                Toggle("Mic", isOn: Binding(get: { recorder.microphone }, set: { value in Task { await recorder.setMicrophone(value) } }))
                    .disabled(recorder.busy || recorder.changingMicrophone || recorder.picking || recorder.countdown != nil)
                    .help(recorder.microphone ? "Mute microphone" : "Unmute microphone")
                Toggle("Audio", isOn: $recorder.systemAudio).disabled(locked)
                Spacer(minLength: 0)
                Picker("Frame rate", selection: $recorder.fps) {
                    Text("30 fps").tag(30)
                    Text("60 fps").tag(60)
                }.labelsHidden().frame(width: 82).disabled(locked)
            }.toggleStyle(.checkbox).font(.system(size: 11))
            if let error = recorder.lastError {
                Text(error).font(.system(size: 11)).foregroundStyle(.red).lineLimit(3)
            } else {
                Text(recorder.preparingCamera ? "Starting camera…" : recorder.displayCapture && recorder.recording ? "Whole-screen capture may include these controls. Window capture keeps them separate." : "Cursor hidden · saved in Library · camera stays editable")
                    .font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(2)
            }
            HStack {
                if let number = recorder.countdown {
                    Text("Starting in \(number)…").font(.system(size: 14, weight: .semibold))
                    Spacer()
                    Button("Cancel") { recorder.cancelCountdown() }
                } else {
                    Button {
                        if recorder.recording { Task { await recorder.stop() } }
                        else { recorder.chooseContent() }
                    } label: {
                        Label(recorder.busy ? "Saving…" : recorder.picking ? "Choose a screen or window…" : recorder.recording ? "Stop & save" : "Choose screen or window", systemImage: recorder.recording ? "stop.fill" : "rectangle.on.rectangle")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(maxWidth: .infinity).padding(.vertical, 11)
                            .background(recorder.recording ? Color(red: 0.73, green: 0.22, blue: 0.18) : Color(red: 0.72, green: 0.83, blue: 0.41), in: RoundedRectangle(cornerRadius: 9))
                            .foregroundStyle(recorder.recording ? .white : Color(red: 0.14, green: 0.18, blue: 0.13))
                    }.disabled(recorder.busy || recorder.picking || recorder.preparingCamera)
                }
            }
        }.padding(18).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
            .buttonStyle(.plain).preferredColorScheme(.light)
    }
}

struct NativeCameraPreview: View {
    @ObservedObject var camera: NativeCamera
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Color.black
            if camera.ready, let preview = camera.previewLayer { CameraPreview(preview: preview) }
            Text(camera.deviceName).font(.system(size: 10, weight: .medium)).foregroundStyle(.white)
                .padding(8).background(Color.black.opacity(0.4), in: RoundedRectangle(cornerRadius: 6)).padding(8)
        }
    }
}
