import AppKit
import SwiftUI
import WebKit

@main
struct DemoTakeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var recorder = Recorder()
    @StateObject private var editor = Editor()

    var body: some Scene {
        Window("DemoTake", id: "studio") {
            StudioWindow(recorder: recorder, editor: editor)
                .frame(minWidth: 800, minHeight: 560)
                .onAppear { delegate.recorder = recorder }
        }
        .defaultSize(width: 1360, height: 900)
        .defaultLaunchBehavior(.presented)
        .restorationBehavior(.disabled)
        .commands {
            CommandGroup(replacing: .newItem) {}
            CommandGroup(after: .appInfo) {
                Button("Stop & save recording") { Task { await recorder.stop() } }
                    .keyboardShortcut("2", modifiers: [.command, .shift])
                    .disabled(!recorder.recording || recorder.busy)
            }
        }

    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    weak var recorder: Recorder?
    func applicationDidFinishLaunching(_ notification: Notification) {
        DispatchQueue.main.async { self.showEditor() }
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { showEditor() }
        return true
    }
    private func showEditor() {
        guard recorder?.recording != true && recorder?.busy != true else { return }
        if let window = NSApp.windows.first(where: { $0.title == "DemoTake" }) {
            window.deminiaturize(nil)
            window.makeKeyAndOrderFront(nil)
        }
        NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if recorder?.recording == true || recorder?.busy == true {
            recorder?.prepareToQuit()
            return .terminateLater
        }
        recorder?.cancelCountdown()
        return .terminateNow
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }
}

struct StudioWindow: View {
    @ObservedObject var recorder: Recorder
    @ObservedObject var editor: Editor
    @State private var controls = false
    @State private var showLibrary = false
    @State private var newVideo = false
    @State private var recordingToDelete: LibraryRecording?
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                HStack(spacing: 9) {
                    Image(systemName: "film.stack").font(.system(size: 22, weight: .medium))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("DemoTake").font(.system(size: 16, weight: .bold))
                        Text(recorder.recording ? "Recording to your library" : "Cursor hidden · Saved locally")
                            .font(.system(size: 11)).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 12)
                Button { recorder.reloadLibrary(); showLibrary = true } label: {
                    Label("Library", systemImage: "square.stack")
                }.disabled(recorder.recording || recorder.busy)
                Button {
                    let panel = NSOpenPanel()
                    panel.allowedContentTypes = [.mpeg4Movie]
                    if panel.runModal() == .OK, let url = panel.url,
                       let saved = recorder.importFile(url) { editor.importRecording(saved) }
                } label: { Label("Import", systemImage: "plus") }
                    .disabled(recorder.recording || recorder.busy)
                Rectangle().fill(Color.black.opacity(0.10)).frame(width: 1, height: 24).padding(.horizontal, 4)
                Button { controls.toggle() } label: {
                    Label("Capture settings", systemImage: "slider.horizontal.3")
                }
                .popover(isPresented: $controls, arrowEdge: .bottom) { captureSettings }
                Button {
                    recorder.openControls()
                    Task { await recorder.setCameraEnabled(true) }
                } label: { Label("Camera", systemImage: recorder.cameraEnabled ? "video" : "video.slash") }
                    .disabled(recorder.recording || recorder.busy)
                Button { recorder.systemAudio.toggle() } label: {
                    Image(systemName: recorder.systemAudio ? "speaker.wave.2" : "speaker.slash")
                        .frame(width: 16)
                }
                .accessibilityLabel(recorder.systemAudio ? "System audio on" : "System audio off")
                .help("Include system audio")
                .disabled(recorder.recording || recorder.busy)
                Button { Task { await recorder.setMicrophone(!recorder.microphone) } } label: {
                    Image(systemName: recorder.microphone ? "mic" : "mic.slash").frame(width: 16)
                }
                .accessibilityLabel(recorder.microphone ? "Microphone on" : "Microphone off")
                .help(recorder.microphone ? "Mute microphone" : "Unmute microphone")
                .disabled(recorder.busy || recorder.changingMicrophone)
                Button("Record new video") {
                    let alert = NSAlert()
                    alert.messageText = "Record a new video?"
                    alert.informativeText = "The next recording opens on a fresh canvas. Your original recordings remain in the library. Save or export edits you want to keep first."
                    alert.addButton(withTitle: "Record new video")
                    alert.addButton(withTitle: "Cancel")
                    if alert.runModal() == .alertFirstButtonReturn {
                        newVideo = true
                        controls = false
                        recorder.openControls()
                    }
                }
                .disabled(recorder.recording || recorder.busy || recorder.picking || recorder.countdown != nil)
                Button {
                    controls = false
                    if recorder.recording { Task { await recorder.stop() } }
                    else { newVideo = false; recorder.openControls() }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: recorder.recording ? "stop.fill" : "record.circle")
                        Text(recorder.busy ? "Saving…" : recorder.recording ? "Stop recording" : "Record screen")
                    }.frame(minWidth: 120)
                }
                .buttonStyle(MacActionStyle(primary: true, recording: recorder.recording))
                .disabled(recorder.busy || recorder.picking || recorder.countdown != nil)
            }
            .padding(.horizontal, 22).padding(.vertical, 14)
            .background(.ultraThinMaterial)
            .frame(height: editor.previewFullscreen ? 0 : nil).clipped().opacity(editor.previewFullscreen ? 0 : 1)
            if recorder.lastError != nil || recorder.busy || recorder.picking || editor.status != "Editor ready" {
                HStack(spacing: 8) {
                    Image(systemName: recorder.lastError != nil ? "exclamationmark.triangle" : "info.circle")
                    Text(recorder.lastError ?? ((recorder.busy || recorder.picking) ? recorder.status : editor.status))
                        .font(.system(size: 12))
                    Spacer()
                    if recorder.lastError != nil {
                        Button("Try again") { recorder.chooseContent() }
                    }
                }.foregroundStyle(Color(red: 0.35, green: 0.40, blue: 0.31))
                    .padding(.horizontal, 22).padding(.vertical, 8)
                    .background(Color(red: 0.93, green: 0.95, blue: 0.89))
            }
            Rectangle().fill(Color.black.opacity(0.10)).frame(height: 1)
            EditorView(editor: editor)
        }
        .preferredColorScheme(editor.darkTheme ? .dark : .light)
        .buttonStyle(MacActionStyle())
        .tint(Color(red: 0.34, green: 0.43, blue: 0.23))
        .task {
            editor.libraryChanged = { recorder.reloadLibrary() }
            editor.record = { newVideo = false; controls = false; recorder.openControls() }
            recorder.onFinished = { url in editor.importRecording(url, append: !newVideo); newVideo = false }
        }
        .overlay {
            if let number = recorder.countdown {
                ZStack {
                    Color.black.opacity(0.45).ignoresSafeArea()
                    VStack(spacing: 18) {
                        Text("Ready when you are").font(.system(size: 20, weight: .semibold))
                        Text("\(number)").font(.system(size: 86, weight: .light, design: .rounded)).monospacedDigit()
                        Text("To finish, use Stop & save or Stop in the top menu bar.").font(.system(size: 13))
                        Button("Cancel recording") { recorder.cancelCountdown() }
                    }.padding(36).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24))
                }
            }
        }
        .sheet(isPresented: $showLibrary) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Your recordings").font(.title2.bold())
                    Spacer()
                    Button("Done") { showLibrary = false }
                }
                Text("Saved on this Mac. Your recordings stay here until you choose to export.")
                    .foregroundStyle(.secondary)
                if recorder.savedRecordings.isEmpty {
                    ContentUnavailableView("No recordings yet", systemImage: "video", description: Text("Record your screen or import a video to add it to your library."))
                } else {
                    List(recorder.savedRecordings) { item in
                        HStack {
                            Image(systemName: "film").font(.title2)
                            VStack(alignment: .leading) {
                                Text(item.title).lineLimit(1)
                                Text("\(item.date.formatted(date: .abbreviated, time: .shortened)) · \(ByteCountFormatter.string(fromByteCount: item.bytes, countStyle: .file))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Edit") {
                                showLibrary = false
                                editor.importRecording(item.url)
                            }.buttonStyle(.borderless)
                            Button(role: .destructive) { recordingToDelete = item } label: {
                                Label("Delete", systemImage: "trash")
                            }
                            .buttonStyle(.borderless)
                            .help("Move recording and linked camera/cursor files to Trash")
                            .accessibilityLabel("Delete \(item.title)")
                        }.padding(.vertical, 6)
                    }
                }
            }.padding(24).frame(width: 760, height: 460)
            .alert("Delete recording?", isPresented: Binding(
                get: { recordingToDelete != nil },
                set: { if !$0 { recordingToDelete = nil } }
            ), presenting: recordingToDelete) { item in
                Button("Cancel", role: .cancel) { recordingToDelete = nil }
                Button("Move to Trash", role: .destructive) {
                    recorder.deleteRecording(item)
                    recordingToDelete = nil
                }
            } message: { item in
                Text("Are you sure you want to delete ‘\(item.title)’? The recording and its linked camera and cursor files will move to Trash.")
            }
        }
    }

    private var captureSettings: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("Capture settings").font(.system(size: 17, weight: .semibold))
                Spacer()
                Button { controls = false } label: { Image(systemName: "xmark") }
                    .buttonStyle(.plain).accessibilityLabel("Close capture settings")
            }
            Text("Choose a display or window when you press Record.")
                .font(.system(size: 12)).foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 10) {
                Picker("Frame rate", selection: $recorder.fps) {
                    Text("30 fps").tag(30)
                    Text("60 fps").tag(60)
                }.pickerStyle(.segmented)
                Toggle("System audio", isOn: $recorder.systemAudio)
                Toggle("Microphone", isOn: Binding(get: { recorder.microphone }, set: { value in Task { await recorder.setMicrophone(value) } }))
            }.disabled(recorder.recording || recorder.busy)
            Divider()
            Label("Cursor hidden in every new recording", systemImage: "cursorarrow.slash")
                .font(.system(size: 12))
            Text("Up to 1080p. Camera, microphone and audio controls are available in the floating recording window. Recordings stay in your library until you export.")
                .font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            Text(recorder.status).font(.system(size: 11)).foregroundStyle(.secondary)
                .textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
        }.padding(22).frame(width: 340)
    }

}

struct EditorView: NSViewRepresentable {
    let editor: Editor
    func makeNSView(context: Context) -> WKWebView { editor.webView }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}


struct MacActionStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme
    var primary = false
    var recording = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(recording ? Color.white : primary ? Color(red: 0.14, green: 0.18, blue: 0.13) : Color.primary)
            .padding(.horizontal, 12).frame(height: 36)
            .background(recording ? Color(red: 0.73, green: 0.22, blue: 0.18) : primary ? Color(red: 0.72, green: 0.83, blue: 0.41) : (colorScheme == .dark ? Color.white.opacity(0.08) : Color.white.opacity(0.72)))
            .clipShape(RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Color.black.opacity(primary ? 0.05 : 0.10), lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
