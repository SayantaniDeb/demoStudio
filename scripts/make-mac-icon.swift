import AppKit
let output = CommandLine.arguments[1]
try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
for size in [16, 32, 64, 128, 256, 512, 1024] {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    let s = CGFloat(size) / 1024
    NSAffineTransform().withScale(s)
    NSColor(calibratedRed: 0.09, green: 0.12, blue: 0.10, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 40, y: 40, width: 944, height: 944), xRadius: 210, yRadius: 210).fill()
    NSColor(calibratedRed: 0.73, green: 0.85, blue: 0.36, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 218, y: 230, width: 588, height: 564), xRadius: 62, yRadius: 62).fill()
    NSColor(calibratedRed: 0.09, green: 0.12, blue: 0.10, alpha: 1).setFill()
    for x in [CGFloat(242), CGFloat(720)] {
        for y in [CGFloat(280), 410, 540, 670] {
            NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 62, height: 74), xRadius: 12, yRadius: 12).fill()
        }
    }
    let play = NSBezierPath()
    play.move(to: NSPoint(x: 428, y: 365)); play.line(to: NSPoint(x: 428, y: 659)); play.line(to: NSPoint(x: 644, y: 512)); play.close(); play.fill()
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    let data = bitmap.representation(using: .png, properties: [:])!
    let names: [Int: [String]] = [16:["icon_16x16"],32:["icon_16x16@2x","icon_32x32"],64:["icon_32x32@2x"],128:["icon_128x128"],256:["icon_128x128@2x","icon_256x256"],512:["icon_256x256@2x","icon_512x512"],1024:["icon_512x512@2x"]]
    for name in names[size]! { try data.write(to: URL(fileURLWithPath: output).appendingPathComponent(name + ".png")) }
}
extension NSAffineTransform {
    func withScale(_ scale: CGFloat) { self.scale(by: scale); self.concat() }
}
