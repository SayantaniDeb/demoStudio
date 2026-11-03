import Foundation
import Network
import UniformTypeIdentifiers

final class LocalServer {
    private let root: URL
    private let queue = DispatchQueue(label: "com.demotake.assets")
    private let lock = NSLock()
    private var recordings: [String: URL] = [:]
    private var listener: NWListener?
    static let origin = "http://127.0.0.1:19743"

    init(root: URL) { self.root = root }

    func register(_ url: URL, reset: Bool = false) -> String {
        let path = "/recordings/\(UUID().uuidString).\(url.pathExtension)"
        lock.lock()
        if reset { recordings.removeAll() }
        recordings[path] = url
        lock.unlock()
        return Self.origin + path
    }

    func start(ready: @escaping (Error?) -> Void) {
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: 19743)
            let listener = try NWListener(using: parameters)
            self.listener = listener
            listener.stateUpdateHandler = { state in
                switch state {
                case .ready: ready(nil)
                case .failed(let error): ready(error)
                default: break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                connection.start(queue: self?.queue ?? .global())
                self?.receive(connection, buffered: Data())
            }
            listener.start(queue: queue)
        } catch { ready(error) }
    }

    private func receive(_ connection: NWConnection, buffered: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, complete, error in
            guard let self else { connection.cancel(); return }
            var request = buffered
            if let data { request.append(data) }
            if request.count > 65536 { connection.cancel(); return }
            if let text = String(data: request, encoding: .utf8), text.contains("\r\n\r\n") {
                self.respond(connection, request: text)
            } else if complete || error != nil { connection.cancel() }
            else { self.receive(connection, buffered: request) }
        }
    }

    private func respond(_ connection: NWConnection, request: String) {
        let lines = request.components(separatedBy: "\r\n")
        let parts = (lines.first ?? "").split(separator: " ")
        guard parts.count >= 2, parts[0] == "GET" || parts[0] == "HEAD",
              lines.contains(where: { $0.lowercased() == "host: 127.0.0.1:19743" }),
              let url = URL(string: Self.origin + String(parts[1])),
              let path = url.path.removingPercentEncoding else {
            send(connection, code: "400 Bad Request", mime: "text/plain", data: Data()); return
        }
        if let origin = lines.first(where: { $0.lowercased().hasPrefix("origin:") }),
           origin.dropFirst(7).trimmingCharacters(in: .whitespaces) != Self.origin {
            send(connection, code: "403 Forbidden", mime: "text/plain", data: Data()); return
        }
        let file: URL
        lock.lock()
        let recording = recordings[path]
        lock.unlock()
        if path.hasPrefix("/recordings/") {
            guard let recording else { send(connection, code: "404 Not Found", mime: "text/plain", data: Data()); return }
            file = recording
        } else {
            file = root.appendingPathComponent(path == "/" ? "index.html" : String(path.dropFirst())).standardizedFileURL
            guard file.path.hasPrefix(root.path + "/") else {
                send(connection, code: "403 Forbidden", mime: "text/plain", data: Data()); return
            }
        }
        do {
            let data = try Data(contentsOf: file, options: .mappedIfSafe)
            let mime: String
            switch file.pathExtension {
            case "js", "mjs": mime = "application/javascript"
            case "css": mime = "text/css"
            case "html": mime = "text/html"
            default: mime = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            }
            send(connection, code: "200 OK", mime: mime, data: data, head: parts[0] == "HEAD")
        } catch { send(connection, code: "404 Not Found", mime: "text/plain", data: Data()) }
    }

    private func send(_ connection: NWConnection, code: String, mime: String, data: Data, head: Bool = false) {
        let headers = Data("HTTP/1.1 \(code)\r\nContent-Type: \(mime)\r\nContent-Length: \(data.count)\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n".utf8)
        connection.send(content: headers, completion: .contentProcessed { error in
            if error != nil || head { connection.cancel(); return }
            connection.send(content: data, completion: .contentProcessed { _ in connection.cancel() })
        })
    }
}
