import AVFoundation
import Foundation

// A separate audio engine allows live mute without reconfiguring SCRecordingOutput.
// Muted buffers are replaced with silence before anything is written to disk.
final class NativeMicrophone: @unchecked Sendable {
    private let queue = DispatchQueue(label: "com.demotake.microphone")
    private let lock = NSLock()
    private var engine: AVAudioEngine?
    private var file: AVAudioFile?
    private var muted = false
    private var writeError: Error?
    private var url: URL?
    private var began: TimeInterval = 0

    func setMuted(_ value: Bool) {
        lock.lock(); muted = value; lock.unlock()
    }

    func start(to url: URL) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async { [self] in
                do {
                    let engine = AVAudioEngine()
                    let input = engine.inputNode
                    let format = input.outputFormat(forBus: 0)
                    guard format.sampleRate > 0 && format.channelCount > 0 else {
                        throw NSError(domain: "DemoTake.Microphone", code: 1, userInfo: [NSLocalizedDescriptionKey: "No microphone input is available."])
                    }
                    let file = try AVAudioFile(forWriting: url, settings: format.settings,
                        commonFormat: format.commonFormat, interleaved: format.isInterleaved)
                    lock.lock()
                    self.file = file; self.url = url; writeError = nil; muted = false
                    lock.unlock()
                    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                        guard let self else { return }
                        self.lock.lock()
                        defer { self.lock.unlock() }
                        if self.muted {
                            for entry in UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList) {
                                if let data = entry.mData { memset(data, 0, Int(entry.mDataByteSize)) }
                            }
                        }
                        do { try self.file?.write(from: buffer) }
                        catch { self.writeError = error }
                    }
                    self.engine = engine
                    engine.prepare()
                    try engine.start()
                    self.began = ProcessInfo.processInfo.systemUptime
                    continuation.resume()
                } catch {
                    engine?.inputNode.removeTap(onBus: 0)
                    engine?.stop()
                    engine = nil
                    lock.lock(); file = nil; lock.unlock()
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    func finish() async -> (url: URL, began: TimeInterval, error: Error?)? {
        await withCheckedContinuation { continuation in
            queue.async { [self] in
                guard let engine, let url else { continuation.resume(returning: nil); return }
                engine.inputNode.removeTap(onBus: 0)
                engine.stop()
                self.engine = nil
                lock.lock()
                file = nil
                let error = writeError
                lock.unlock()
                self.url = nil
                continuation.resume(returning: (url, began, error))
            }
        }
    }

    static func merge(screen: URL, microphone: URL, offset: Double) async throws -> URL {
        let screenAsset = AVURLAsset(url: screen), micAsset = AVURLAsset(url: microphone)
        let composition = AVMutableComposition()
        let duration = try await screenAsset.load(.duration)
        for track in try await screenAsset.loadTracks(withMediaType: .video) {
            let target = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
            try target.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: track, at: .zero)
            target.preferredTransform = try await track.load(.preferredTransform)
        }
        var audioParameters: [AVAudioMixInputParameters] = []
        for track in try await screenAsset.loadTracks(withMediaType: .audio) {
            let target = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
            try target.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: track, at: .zero)
            let parameter = AVMutableAudioMixInputParameters(track: target)
            parameter.setVolume(1, at: .zero)
            audioParameters.append(parameter)
        }
        guard let track = try await micAsset.loadTracks(withMediaType: .audio).first else {
            throw NSError(domain: "DemoTake.Microphone", code: 2, userInfo: [NSLocalizedDescriptionKey: "The microphone file has no audio track."])
        }
        let sourceStart = CMTime(seconds: max(0, -offset), preferredTimescale: 48000)
        let destination = CMTime(seconds: max(0, offset), preferredTimescale: 48000)
        let micDuration = try await micAsset.load(.duration)
        let length = CMTimeMinimum(micDuration - sourceStart, duration - destination)
        guard length.seconds > 0 else { return screen }
        let target = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
        try target.insertTimeRange(CMTimeRange(start: sourceStart, duration: length), of: track, at: destination)
        let parameter = AVMutableAudioMixInputParameters(track: target)
        parameter.setVolume(1, at: .zero)
        audioParameters.append(parameter)
        let mix = AVMutableAudioMix(); mix.inputParameters = audioParameters
        let output = screen.deletingPathExtension().appendingPathExtension("mixed.mp4")
        guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw NSError(domain: "DemoTake.Microphone", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not prepare microphone audio for saving."])
        }
        export.audioMix = mix
        try await export.export(to: output, as: .mp4)
        return output
    }
}
