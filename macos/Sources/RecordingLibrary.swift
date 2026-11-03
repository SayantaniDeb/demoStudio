import Foundation
import AVFoundation
import CryptoKit

struct NativeCursorSample: Codable {
    let time: Double
    let x: Double
    let y: Double
    let click: Bool
    var shape: String? = nil
}

struct LibraryCamera: Codable {
    let fileName: String
    let lead: Double
    let duration: Double
}

struct LibraryRecording: Identifiable {
    let url: URL
    let date: Date
    let bytes: Int64
    var id: String { url.lastPathComponent }
    var savedTitle: String? = nil
    var title: String { savedTitle ?? url.deletingPathExtension().lastPathComponent }
}

struct RecordingLibrary {
    let root: URL
    var recordings: URL { root.appendingPathComponent("Recordings", isDirectory: true) }
    var pending: URL { root.appendingPathComponent("In Progress", isDirectory: true) }
    var cameras: URL { root.appendingPathComponent("Camera", isDirectory: true) }

    init(root: URL? = nil) {
        self.root = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("com.demotake.studio.local", isDirectory: true)
    }

    func prepare() throws {
        for folder in [recordings, pending, cameras] {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
    }

    func list() throws -> [LibraryRecording] {
        guard FileManager.default.fileExists(atPath: recordings.path) else { return [] }
        return try FileManager.default.contentsOfDirectory(at: recordings, includingPropertiesForKeys: [.creationDateKey, .fileSizeKey], options: .skipsHiddenFiles)
            .filter { $0.pathExtension.lowercased() == "mp4" }
            .map { url in
                let values = try url.resourceValues(forKeys: [.creationDateKey, .fileSizeKey])
                return LibraryRecording(url: url, date: values.creationDate ?? .distantPast, bytes: Int64(values.fileSize ?? 0), savedTitle: title(for: url))
            }.sorted { $0.date > $1.date }
    }

    func titleURL(for recording: URL) -> URL {
        root.appendingPathComponent("Titles", isDirectory: true)
            .appendingPathComponent(recording.deletingPathExtension().lastPathComponent + ".json")
    }

    func title(for recording: URL) -> String? {
        guard let data = try? Data(contentsOf: titleURL(for: recording)) else { return nil }
        return try? JSONDecoder().decode(String.self, from: data)
    }

    func saveTitle(_ name: String, for recording: URL) throws -> String {
        guard recording.standardizedFileURL.deletingLastPathComponent() == recordings.standardizedFileURL,
              FileManager.default.fileExists(atPath: recording.path) else {
            throw NSError(domain: "DemoTake.Library", code: 2, userInfo: [NSLocalizedDescriptionKey: "Open this recording from Library before saving its name."])
        }
        let cleaned = name.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ")
        guard !cleaned.isEmpty && cleaned.count <= 120 else {
            throw NSError(domain: "DemoTake.Library", code: 3, userInfo: [NSLocalizedDescriptionKey: "Use a name between 1 and 120 characters."])
        }
        let url = titleURL(for: recording)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(cleaned).write(to: url, options: .atomic)
        return cleaned
    }

    func resolveRecording(id: String?, bytes: Int64?, hash: String?) throws -> URL {
        let items = try list()
        if let id, let item = items.first(where: { $0.id == id }) { return item.url }
        if id == nil, let bytes, let hash {
            let matches = items.filter { item in
                guard item.bytes == bytes, let data = try? Data(contentsOf: item.url, options: .mappedIfSafe) else { return false }
                return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() == hash
            }
            if matches.count == 1 { return matches[0].url }
        }
        throw NSError(domain: "DemoTake.Library", code: 4, userInfo: [NSLocalizedDescriptionKey: "Open the original recording from Library, then save its name. This cached project is not linked to a unique library recording."])
    }

    func finalize(_ url: URL) throws -> URL {
        try prepare()
        let saved = recordings.appendingPathComponent(url.lastPathComponent)
        try FileManager.default.moveItem(at: url, to: saved)
        return saved
    }

    func trashRecording(_ recording: URL) throws {
        let manager = FileManager.default
        guard recording.standardizedFileURL.deletingLastPathComponent() == recordings.standardizedFileURL,
              recording.pathExtension.lowercased() == "mp4" else {
            throw NSError(domain: "DemoTake.Library", code: 1, userInfo: [NSLocalizedDescriptionKey: "Only library recordings can be deleted here."])
        }
        let stem = recording.deletingPathExtension().lastPathComponent
        let files = [recording, cameras.appendingPathComponent(stem + ".mov"),
            cameras.appendingPathComponent(stem + ".json"), cursorURL(for: recording), titleURL(for: recording)]
            .filter { manager.fileExists(atPath: $0.path) }
        guard files.contains(recording) else { return }
        // Trash one folder so the video and its linked tracks can be restored together.
        let staging = root.appendingPathComponent("Trash Staging", isDirectory: true)
            .appendingPathComponent(stem + "-" + UUID().uuidString.prefix(6), isDirectory: true)
        try manager.createDirectory(at: staging, withIntermediateDirectories: true)
        var moved: [(URL, URL)] = []
        do {
            for source in files {
                let subfolder = staging.appendingPathComponent(source.deletingLastPathComponent().lastPathComponent, isDirectory: true)
                try manager.createDirectory(at: subfolder, withIntermediateDirectories: true)
                let destination = subfolder.appendingPathComponent(source.lastPathComponent)
                try manager.moveItem(at: source, to: destination)
                moved.append((source, destination))
            }
            try manager.trashItem(at: staging, resultingItemURL: nil)
        } catch {
            for (source, destination) in moved.reversed() { try? manager.moveItem(at: destination, to: source) }
            throw error
        }
    }

    func importFile(_ url: URL) throws -> URL {
        try prepare()
        let name = url.deletingPathExtension().lastPathComponent
        let saved = recordings.appendingPathComponent("\(name)-\(UUID().uuidString.prefix(6)).mp4")
        try FileManager.default.copyItem(at: url, to: saved)
        return saved
    }

    func cursorURL(for recording: URL) -> URL {
        root.appendingPathComponent("Cursor", isDirectory: true)
            .appendingPathComponent(recording.deletingPathExtension().lastPathComponent + ".json")
    }

    func saveCursor(_ samples: [NativeCursorSample], for recording: URL) throws {
        let url = cursorURL(for: recording)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(samples).write(to: url, options: .atomic)
    }

    func cameraInfo(for recording: URL) -> (URL, LibraryCamera)? {
        let metadata = cameras.appendingPathComponent(recording.deletingPathExtension().lastPathComponent + ".json")
        guard let data = try? Data(contentsOf: metadata), let info = try? JSONDecoder().decode(LibraryCamera.self, from: data) else { return nil }
        let url = cameras.appendingPathComponent(info.fileName).standardizedFileURL
        guard url.path.hasPrefix(cameras.path + "/"), FileManager.default.fileExists(atPath: url.path) else { return nil }
        return (url, info)
    }

    func finalizeCamera(_ url: URL, for recording: URL, lead: Double) async throws {
        try prepare()
        let duration = try await AVURLAsset(url: url).load(.duration).seconds
        guard duration.isFinite && duration > lead else {
            throw NSError(domain: "DemoTake.Camera", code: 5, userInfo: [NSLocalizedDescriptionKey: "The camera track was too short to attach."])
        }
        let name = recording.deletingPathExtension().lastPathComponent
        let fileName = name + ".mov"
        try FileManager.default.moveItem(at: url, to: cameras.appendingPathComponent(fileName))
        let info = LibraryCamera(fileName: fileName, lead: max(0, lead), duration: duration)
        try JSONEncoder().encode(info).write(to: cameras.appendingPathComponent(name + ".json"), options: .atomic)
    }
}
