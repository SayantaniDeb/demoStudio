import AppKit
import WebKit
import UniformTypeIdentifiers

@MainActor
final class Editor: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    @Published var darkTheme = false
    @Published var previewFullscreen = false
    private var enteredPreviewFullscreen = false
    @Published var status = "Loading editor…"
    let server: LocalServer
    let webView: WKWebView
    var record: (() -> Void)?
    var libraryChanged: (() -> Void)?
    private var uploads: [String: URL] = [:]

    override init() {
        server = LocalServer(root: Bundle.main.resourceURL!.appendingPathComponent("web"))
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        NotificationCenter.default.addObserver(forName: NSWindow.didExitFullScreenNotification, object: nil, queue: .main) { [weak self] note in
            Task { @MainActor in
                guard let self, let window = note.object as? NSWindow, window === self.webView.window else { return }
                self.previewFullscreen = false
                self.enteredPreviewFullscreen = false
                self.webView.evaluateJavaScript("window.dispatchEvent(new Event('demotake-exit-fullscreen'))")
            }
        }
        config.userContentController.add(self, name: "nativeRecorder")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        server.start { [weak self] error in
            Task { @MainActor in
                guard let self else { return }
                if let error { self.status = "Editor server failed: \(error.localizedDescription)" }
                else { self.webView.load(URLRequest(url: URL(string: LocalServer.origin + "/")!)) }
            }
        }
    }

    func exportVideo() {
        webView.evaluateJavaScript("document.querySelector('button.header-export:not(:disabled)')?.click()")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "http",
              message.frameInfo.securityOrigin.host == "127.0.0.1", message.frameInfo.securityOrigin.port == 19743,
              let text = message.body as? String else { return }
        if text == "record" { record?(); return }
        guard let data = text.data(using: .utf8), let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let id = request["request"] as? String, UUID(uuidString: id) != nil else { return }
        Task { @MainActor in
            do {
                let folder = RecordingLibrary().root.appendingPathComponent("Editor Media", isDirectory: true)
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                var result: [String: Any] = [:]
                switch request["command"] as? String {
                case "theme":
                    darkTheme = request["dark"] as? Bool ?? false
                case "preview-fullscreen":
                    let enabled = request["enabled"] as? Bool ?? false
                    previewFullscreen = enabled
                    if let window = webView.window {
                        if enabled && !window.styleMask.contains(.fullScreen) {
                            enteredPreviewFullscreen = true
                            window.toggleFullScreen(nil)
                        } else if !enabled && enteredPreviewFullscreen && window.styleMask.contains(.fullScreen) {
                            enteredPreviewFullscreen = false
                            window.toggleFullScreen(nil)
                        }
                    }
                case "save-title":
                    guard let title = request["title"] as? String else { throw NSError(domain: "DemoTake.Library", code: 3) }
                    let library = RecordingLibrary()
                    let recordingID = request["recordingID"] as? String
                    let bytes = request["bytes"] as? Int64
                    let hash = request["hash"] as? String
                    let url: URL
                    if let key = request["uploadKey"] as? String, let uploaded = uploads[key] {
                        url = try library.importFile(uploaded)
                        uploads.removeValue(forKey: key)
                        try? FileManager.default.removeItem(at: uploaded)
                    } else {
                        url = try await Task.detached { try library.resolveRecording(id: recordingID, bytes: bytes, hash: hash) }.value
                    }
                    let name = try library.saveTitle(title, for: url)
                    result = ["name": name, "recordingID": url.lastPathComponent]
                    libraryChanged?()
                case "upload":
                    let key = UUID().uuidString
                    let mime = request["mime"] as? String ?? "video/mp4"
                    let ext = mime.contains("quicktime") ? "mov" : mime.contains("webm") ? "webm" : "mp4"
                    let url = folder.appendingPathComponent(key + "." + ext)
                    try Data().write(to: url)
                    uploads[key] = url
                    result["key"] = key
                case "chunk":
                    guard let key = request["key"] as? String, let url = uploads[key],
                          let encoded = request["data"] as? String, encoded.count <= 1_500_000,
                          let bytes = Data(base64Encoded: encoded) else { throw NSError(domain: "DemoTake.Join", code: 4) }
                    let handle = try FileHandle(forWritingTo: url)
                    defer { try? handle.close() }
                    try handle.seekToEnd(); try handle.write(contentsOf: bytes)
                case "join":
                    guard let items = request["sources"] as? [[String: Any]], !items.isEmpty, items.count <= 16 else { throw NSError(domain: "DemoTake.Join", code: 5) }
                    let sources = try items.map { item -> NativeJoinSource in
                        guard let key = item["key"] as? String, let url = uploads[key] else { throw NSError(domain: "DemoTake.Join", code: 6) }
                        return NativeJoinSource(url: url, duration: item["duration"] as? Double, hold: item["hold"] as? Double ?? 0)
                    }
                    defer { for item in items { if let key = item["key"] as? String, let url = uploads.removeValue(forKey: key) { try? FileManager.default.removeItem(at: url) } } }
                    let output = folder.appendingPathComponent(UUID().uuidString + ".mp4")
                    let (duration, lengths) = try await NativeVideoJoin.join(sources, to: output)
                    result = ["url": server.register(output), "duration": duration, "lengths": lengths]
                default: throw NSError(domain: "DemoTake.Join", code: 7)
                }
                reply(id, result: result)
            } catch { reply(id, result: ["error": error.localizedDescription]) }
        }
    }

    private func reply(_ id: String, result: [String: Any]) {
        var payload = result; payload["request"] = id
        guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('demotake-native-result', {detail: \(json)}))")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        status = "Editor ready"
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        status = "Editor could not load: \(error.localizedDescription)"
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        status = "Editor error: \(error.localizedDescription)"
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        status = "Editor process stopped. Quit and reopen DemoTake."
    }

    func importRecording(_ url: URL, append: Bool = false) {
        var payload: [String: Any] = ["url": server.register(url, reset: !append), "name": url.lastPathComponent, "append": append, "recordingID": url.lastPathComponent, "title": RecordingLibrary().title(for: url) ?? url.deletingPathExtension().lastPathComponent]
        let cursorURL = RecordingLibrary().cursorURL(for: url)
        if FileManager.default.fileExists(atPath: cursorURL.path) {
            payload["cursorURL"] = server.register(cursorURL)
        }
        if let (cameraURL, info) = RecordingLibrary().cameraInfo(for: url) {
            payload["cameraURL"] = server.register(cameraURL)
            payload["cameraLead"] = info.lead
            payload["cameraDuration"] = info.duration
        }
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('demotake-native-import', {detail: \(json)}))")
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        webView.evaluateJavaScript("document.documentElement.dataset.fileAccept || ''") { value, _ in
            let accept = value as? String ?? ""
            if accept.contains("audio/") && accept.contains("video/") { panel.allowedContentTypes = [.audio, .movie] }
            else if accept.contains("audio/") { panel.allowedContentTypes = [.audio] }
            else if accept.contains("video/") { panel.allowedContentTypes = [.movie] }
            panel.begin { response in completionHandler(response == .OK ? panel.urls : nil) }
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.shouldPerformDownload { decisionHandler(.download) }
        else if (url.scheme == "http" && url.host == "127.0.0.1" && url.port == 19743) || url.scheme == "blob" || url.scheme == "about" { decisionHandler(.allow) }
        else { NSWorkspace.shared.open(url); decisionHandler(.cancel) }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.begin { result in completionHandler(result == .OK ? panel.url : nil) }
    }
}
