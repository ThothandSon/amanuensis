import Cocoa
import CoreGraphics

let inputPath = "/Users/outis/.gemini/antigravity/brain/c176b17c-77e2-499e-b03d-f5cabb966576/amanuensis_illuminated_initial_a_1793731472591.jpg"
guard let srcImage = NSImage(contentsOfFile: inputPath) else {
    fatalError("Could not load Gemini generated image at \(inputPath)")
}

let targetSize = CGSize(width: 1024, height: 1024)
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(targetSize.width),
    pixelsHigh: Int(targetSize.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext

// Clear with transparent alpha
ctx.clear(CGRect(origin: .zero, size: targetSize))

// Inset slightly (44px) for standard macOS Dock icon padding and clip with smooth squircle
let iconRect = CGRect(x: 44, y: 44, width: 936, height: 936)
let clipPath = NSBezierPath(roundedRect: iconRect, xRadius: 210, yRadius: 210)
clipPath.addClip()

// Draw slightly zoomed in (crop 24px from source edges so no white JPEG corner bleed remains)
let srcRect = NSRect(x: 28, y: 28, width: srcImage.size.width - 56, height: srcImage.size.height - 56)
srcImage.draw(in: iconRect, from: srcRect, operation: .sourceOver, fraction: 1.0)

// Subtle antique gold/parchment inner rim for crispness in Dock
ctx.setStrokeColor(CGColor(red: 0.55, green: 0.40, blue: 0.15, alpha: 0.65))
ctx.setLineWidth(8)
let borderPath = NSBezierPath(roundedRect: iconRect.insetBy(dx: 4, dy: 4), xRadius: 206, yRadius: 206)
borderPath.stroke()

NSGraphicsContext.restoreGraphicsState()

let pngData = rep.representation(using: .png, properties: [:])!
let fm = FileManager.default
try! fm.createDirectory(atPath: "src-tauri/icons", withIntermediateDirectories: true)
try! fm.createDirectory(atPath: "public", withIntermediateDirectories: true)
try! pngData.write(to: URL(fileURLWithPath: "src-tauri/icons/icon.png"))
try! pngData.write(to: URL(fileURLWithPath: "public/logo.png"))
print("Processed Gemini Renaissance drop-cap 'A' logo into transparent 1024x1024 PNG")
