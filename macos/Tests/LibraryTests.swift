import Foundation
import CryptoKit

private func check(_ condition: Bool, _ message: String = "Library check failed") {
    precondition(condition, message)
}

@main
struct LibraryTests {
    static func main() async throws {
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let library = RecordingLibrary(root: temporary.appendingPathComponent("App Data"))
        try library.prepare()
        let incomplete = library.pending.appendingPathComponent("sample.mp4")
        let original = Data("test-video-content".utf8)
        try original.write(to: incomplete)
        check(try library.list().isEmpty, "In-progress captures must not appear as finished recordings")
        let saved = try library.finalize(incomplete)
        check(try Data(contentsOf: saved) == original)
        check(!FileManager.default.fileExists(atPath: incomplete.path))
        let samples = [NativeCursorSample(time: 0, x: 0.25, y: 0.75, click: false),
                       NativeCursorSample(time: 1.5, x: 0.8, y: 0.1, click: true)]
        try library.saveCursor(samples, for: saved)
        let reopened = RecordingLibrary(root: library.root)
        let restored = try JSONDecoder().decode([NativeCursorSample].self, from: Data(contentsOf: reopened.cursorURL(for: saved)))
        check(restored.count == 2 && restored[1].time == 1.5 && restored[1].click)
        check(restored[0].x == 0.25 && restored[0].y == 0.75, "Cursor coordinates must survive reopening")
        check(try reopened.list().count == 1, "Recordings must survive library recreation")
        let imported = try reopened.importFile(saved)
        check(imported != saved, "Imports must not overwrite originals")
        check(try Data(contentsOf: saved) == original)
        check(try reopened.list().count == 2)
        check(reopened.cameraInfo(for: saved) == nil)
        let name = try library.saveTitle("  My   product demo  ", for: saved)
        check(name == "My product demo")
        let renamed = RecordingLibrary(root: library.root)
        check(try renamed.list().first(where: { $0.id == saved.lastPathComponent })?.title == name, "Saved names must appear in library after reopening")
        check(try renamed.resolveRecording(id: saved.lastPathComponent, bytes: nil, hash: nil).lastPathComponent == saved.lastPathComponent)
        check(try Data(contentsOf: saved) == original, "Saving a name must not rewrite the video")
        check(saved.lastPathComponent == "sample.mp4", "Display names must not rename linked media files")
        try Data("different fixture".utf8).write(to: imported)
        let digest = SHA256.hash(data: original).map { String(format: "%02x", $0) }.joined()
        check(try renamed.resolveRecording(id: nil, bytes: Int64(original.count), hash: digest).lastPathComponent == saved.lastPathComponent, "Older cached projects must match their exact library media")
        do { _ = try library.saveTitle("  ", for: saved); fatalError("Empty names must be rejected") } catch {}
        print("Passed: library display-name persistence, stable media identity, whitespace cleanup, and validation")
        if CommandLine.arguments.count > 1 {
            let camera = library.pending.appendingPathComponent("camera.mov")
            try FileManager.default.copyItem(at: URL(fileURLWithPath: CommandLine.arguments[1]), to: camera)
            try await library.finalizeCamera(camera, for: saved, lead: 0.2)
            let fresh = RecordingLibrary(root: library.root)
            guard let (cameraURL, info) = fresh.cameraInfo(for: saved) else { fatalError("Camera association was not restored") }
            check(info.lead == 0.2 && info.duration > 0.2)
            check(FileManager.default.fileExists(atPath: cameraURL.path))
            check(!FileManager.default.fileExists(atPath: camera.path))
            check(try fresh.list().count == 2, "Camera tracks must not appear as separate recordings")
            print("Passed: camera sidecar persistence, duration, offset, and association after reopening")
        }
        print("Passed: private library, finalized recordings, reopening, and non-destructive imports")
    }
}
