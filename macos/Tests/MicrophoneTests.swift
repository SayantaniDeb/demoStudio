import Foundation
import AVFoundation

@main
struct MicrophoneTests {
    static func main() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let screen = folder.appendingPathComponent("screen.mp4")
        try FileManager.default.copyItem(at: URL(fileURLWithPath: CommandLine.arguments[1]), to: screen)
        let microphone = folder.appendingPathComponent("microphone.caf")
        let format = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 1)!
        do {
            let file = try AVAudioFile(forWriting: microphone, settings: format.settings)
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 48000)!
            buffer.frameLength = 48000
            // Half a second muted, then a synthetic tone: no microphone access needed.
            for i in 0..<48000 { buffer.floatChannelData![0][i] = i < 24000 ? 0 : Float(sin(Double(i) * 2 * .pi * 440 / 48000) * 0.2) }
            try file.write(from: buffer)
        }
        let result = try await NativeMicrophone.merge(screen: screen, microphone: microphone, offset: 0.25)
        let asset = AVURLAsset(url: result)
        let videos = try await asset.loadTracks(withMediaType: .video)
        let audios = try await asset.loadTracks(withMediaType: .audio)
        let duration = try await asset.load(.duration).seconds
        let originalDuration = try await AVURLAsset(url: screen).load(.duration).seconds
        precondition(videos.count == 1 && audios.count == 1)
        precondition(abs(duration - originalDuration) < 0.1, "Mixing must preserve the screen duration")
        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: audios[0], outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMIsFloatKey: true, AVLinearPCMBitDepthKey: 32])
        reader.add(output); reader.startReading()
        var quietPeak: Float = 0, tonePeak: Float = 0
        while let sample = output.copyNextSampleBuffer(), let block = CMSampleBufferGetDataBuffer(sample) {
            let time = CMSampleBufferGetPresentationTimeStamp(sample).seconds
            var length = 0, pointer: UnsafeMutablePointer<Int8>?
            CMBlockBufferGetDataPointer(block, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &length, dataPointerOut: &pointer)
            guard let pointer else { continue }
            pointer.withMemoryRebound(to: Float.self, capacity: length / 4) { values in
                for i in 0..<(length / 4) {
                    if time > 0.1 && time < 0.6 { quietPeak = max(quietPeak, abs(values[i])) }
                    if time > 0.85 && time < 1.1 { tonePeak = max(tonePeak, abs(values[i])) }
                }
            }
        }
        precondition(quietPeak < 0.005 && tonePeak > 0.05, "Mic offset and muted silence must survive export")
        let remixed = try await NativeMicrophone.merge(screen: result, microphone: microphone, offset: 0.25)
        let mixedTracks = try await AVURLAsset(url: remixed).loadTracks(withMediaType: .audio)
        precondition(mixedTracks.count == 1, "Existing system audio and mic should export as a single mixed audio track")
        print("Passed: microphone merge preserves video duration, delayed start, muted silence, and audible tone")
    }
}
