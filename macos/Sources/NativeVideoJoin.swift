import AVFoundation
import Foundation

struct NativeJoinSource { let url: URL; let duration: Double?; var hold: Double = 0 }

enum NativeVideoJoin {
    static func join(_ sources: [NativeJoinSource], to output: URL) async throws -> (Double, [Double]) {
        let composition = AVMutableComposition()
        var instructions: [AVMutableVideoCompositionInstruction] = []
        var cursor = CMTime.zero
        var lengths: [Double] = []
        var canvas = CGSize(width: 1920, height: 1080)
        for (index, source) in sources.enumerated() {
            let asset = AVURLAsset(url: source.url)
            guard let video = try await asset.loadTracks(withMediaType: .video).first else {
                throw NSError(domain: "DemoTake.Join", code: 1, userInfo: [NSLocalizedDescriptionKey: "A clip has no readable video track."])
            }
            let assetDuration = try await asset.load(.duration)
            let length = CMTime(seconds: min(source.duration ?? assetDuration.seconds, assetDuration.seconds), preferredTimescale: 60000)
            guard length.seconds.isFinite && length.seconds > 0 else { throw NSError(domain: "DemoTake.Join", code: 2) }
            let range = CMTimeRange(start: .zero, duration: length)
            let hold = CMTime(seconds: max(0, source.hold), preferredTimescale: 60000)
            let target = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
            try target.insertTimeRange(range, of: video, at: cursor)
            if hold.seconds > 0 {
                let frame = CMTimeMinimum(length, CMTime(value: 1, timescale: 30))
                try target.insertTimeRange(CMTimeRange(start: length - frame, duration: frame), of: video, at: cursor + length)
                target.scaleTimeRange(CMTimeRange(start: cursor + length, duration: frame), toDuration: hold)
            }
            let size = try await video.load(.naturalSize)
            let transform = try await video.load(.preferredTransform)
            let oriented = CGRect(origin: .zero, size: size).applying(transform)
            if index == 0 { canvas = CGSize(width: max(2, abs(oriented.width)), height: max(2, abs(oriented.height))) }
            let scale = min(canvas.width / abs(oriented.width), canvas.height / abs(oriented.height))
            let fitted = transform.concatenating(CGAffineTransform(translationX: -oriented.minX, y: -oriented.minY))
                .concatenating(CGAffineTransform(scaleX: scale, y: scale))
                .concatenating(CGAffineTransform(translationX: (canvas.width - abs(oriented.width) * scale) / 2, y: (canvas.height - abs(oriented.height) * scale) / 2))
            let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: target)
            layer.setTransform(fitted, at: cursor)
            let instruction = AVMutableVideoCompositionInstruction()
            instruction.timeRange = CMTimeRange(start: cursor, duration: length + hold)
            instruction.layerInstructions = [layer]
            instruction.backgroundColor = CGColor(gray: 0, alpha: 1)
            instructions.append(instruction)
            for audio in try await asset.loadTracks(withMediaType: .audio) {
                let track = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
                let available = try await audio.load(.timeRange)
                let overlap = CMTimeRangeGetIntersection(range, otherRange: available)
                if overlap.duration.seconds > 0 { try track.insertTimeRange(overlap, of: audio, at: cursor + overlap.start) }
            }
            lengths.append(length.seconds)
            cursor = cursor + length + hold
        }
        let video = AVMutableVideoComposition()
        video.renderSize = canvas
        video.frameDuration = CMTime(value: 1, timescale: 30)
        video.instructions = instructions
        guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else { throw NSError(domain: "DemoTake.Join", code: 3) }
        export.videoComposition = video
        try await export.export(to: output, as: .mp4)
        return (cursor.seconds, lengths)
    }
}
