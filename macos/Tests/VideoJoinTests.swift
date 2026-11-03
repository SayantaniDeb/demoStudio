import AVFoundation
import Foundation
@main
struct VideoJoinTests {
    static func main() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let first = folder.appendingPathComponent("first.mp4")
        try FileManager.default.copyItem(at: URL(fileURLWithPath: CommandLine.arguments[1]), to: first)
        let mic = folder.appendingPathComponent("tone.caf")
        let format = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 1)!
        do {
            let file = try AVAudioFile(forWriting: mic, settings: format.settings)
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 96000)!
            buffer.frameLength = 96000
            for i in 0..<96000 { buffer.floatChannelData![0][i] = Float(sin(Double(i) * 2 * .pi * 440 / 48000) * 0.2) }
            try file.write(from: buffer)
        }
        let second = try await NativeMicrophone.merge(screen: first, microphone: mic, offset: 0)
        let output = folder.appendingPathComponent("joined.mp4")
        let (duration, lengths) = try await NativeVideoJoin.join([NativeJoinSource(url: first, duration: 1.5), NativeJoinSource(url: second, duration: nil)], to: output)
        let asset = AVURLAsset(url: output)
        let actual = try await asset.load(.duration).seconds
        precondition(abs(actual - duration) < 0.1 && lengths.count == 2 && lengths[0] == 1.5 && actual > 3.4)
        let tracks = try await asset.loadTracks(withMediaType: .audio)
        precondition(!tracks.isEmpty, "Appending must retain new clip audio even if the first clip is silent")
        let reader = try AVAssetReader(asset: asset)
        let audio = AVAssetReaderTrackOutput(track: tracks[0], outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMIsFloatKey: true, AVLinearPCMBitDepthKey: 32])
        reader.add(audio); reader.startReading()
        var audibleAfterBoundary = false
        while let sample = audio.copyNextSampleBuffer(), let block = CMSampleBufferGetDataBuffer(sample) {
            var count = 0, pointer: UnsafeMutablePointer<Int8>?
            CMBlockBufferGetDataPointer(block, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &count, dataPointerOut: &pointer)
            if CMSampleBufferGetPresentationTimeStamp(sample).seconds > 1.6, let pointer {
                pointer.withMemoryRebound(to: Float.self, capacity: count / 4) { values in
                    if (0..<(count / 4)).contains(where: { abs(values[$0]) > 0.05 }) { audibleAfterBoundary = true }
                }
            }
        }
        precondition(audibleAfterBoundary, "Second clip audio must remain audible after the append boundary")
        print("Passed: native append reads uploaded media, preserves both clip durations, and retains second-clip audio after a silent first clip")
    }
}
