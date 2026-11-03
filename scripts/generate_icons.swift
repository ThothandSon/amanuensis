import Cocoa
import CoreGraphics

let size = CGSize(width: 1024, height: 1024)
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
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

// 1. macOS squircle background with rich Obsidian-Indigo gradient
let rect = CGRect(x: 64, y: 64, width: 896, height: 896)
let path = NSBezierPath(roundedRect: rect, xRadius: 200, yRadius: 200)
path.addClip()

let colorSpace = CGColorSpaceCreateDeviceRGB()
let bgColors = [
    CGColor(red: 0.05, green: 0.08, blue: 0.15, alpha: 1.0),
    CGColor(red: 0.11, green: 0.16, blue: 0.28, alpha: 1.0)
] as CFArray
let bgGradient = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: [0.0, 1.0])!
ctx.drawLinearGradient(bgGradient, start: CGPoint(x: 512, y: 960), end: CGPoint(x: 512, y: 64), options: [])

// 2. Subtle glowing border
ctx.setStrokeColor(CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 0.55))
ctx.setLineWidth(14)
let borderPath = NSBezierPath(roundedRect: rect.insetBy(dx: 7, dy: 7), xRadius: 193, yRadius: 193)
borderPath.stroke()

// 3. Manuscript / OCR Bounding Box grid lines in background
ctx.setStrokeColor(CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 0.14))
ctx.setLineWidth(6)
for y in stride(from: 240.0, through: 780.0, by: 90.0) {
    ctx.move(to: CGPoint(x: 180, y: y))
    ctx.addLine(to: CGPoint(x: 844, y: y))
    ctx.strokePath()
}

// 4. Stylized Golden-Cyan Fountain Pen Nib (Symbol of Amanuensis + Local AI)
let nibPath = CGMutablePath()
nibPath.move(to: CGPoint(x: 512, y: 820)) // Tip of the nib
nibPath.addLine(to: CGPoint(x: 690, y: 470))
nibPath.addLine(to: CGPoint(x: 620, y: 210))
nibPath.addLine(to: CGPoint(x: 404, y: 210))
nibPath.addLine(to: CGPoint(x: 334, y: 470))
nibPath.closeSubpath()

ctx.saveGState()
ctx.addPath(nibPath)
ctx.clip()
let nibColors = [
    CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1.0), // Cyan top
    CGColor(red: 0.96, green: 0.62, blue: 0.04, alpha: 1.0)  // Warm Amber/Gold base
] as CFArray
let nibGrad = CGGradient(colorsSpace: colorSpace, colors: nibColors, locations: [0.0, 1.0])!
ctx.drawLinearGradient(nibGrad, start: CGPoint(x: 512, y: 820), end: CGPoint(x: 512, y: 210), options: [])
ctx.restoreGState()

// Nib outline
ctx.addPath(nibPath)
ctx.setStrokeColor(CGColor(red: 0.95, green: 0.97, blue: 1.0, alpha: 0.9))
ctx.setLineWidth(12)
ctx.strokePath()

// Nib slit & breather hole (neural node)
ctx.setStrokeColor(CGColor(red: 0.05, green: 0.08, blue: 0.15, alpha: 1.0))
ctx.setLineWidth(16)
ctx.move(to: CGPoint(x: 512, y: 815))
ctx.addLine(to: CGPoint(x: 512, y: 490))
ctx.strokePath()

let holeRect = CGRect(x: 472, y: 430, width: 80, height: 80)
ctx.setFillColor(CGColor(red: 0.05, green: 0.08, blue: 0.15, alpha: 1.0))
ctx.fillEllipse(in: holeRect)
ctx.setStrokeColor(CGColor(red: 0.95, green: 0.97, blue: 1.0, alpha: 0.95))
ctx.setLineWidth(10)
ctx.strokeEllipse(in: holeRect)

// Neural circuit nodes flanking the nib
let nodes: [CGPoint] = [
    CGPoint(x: 240, y: 620),
    CGPoint(x: 784, y: 620),
    CGPoint(x: 220, y: 390),
    CGPoint(x: 804, y: 390)
]
for pt in nodes {
    ctx.setStrokeColor(CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 0.75))
    ctx.setLineWidth(8)
    ctx.move(to: pt)
    ctx.addLine(to: CGPoint(x: 512, y: 470))
    ctx.strokePath()

    let r = CGRect(x: pt.x - 22, y: pt.y - 22, width: 44, height: 44)
    ctx.setFillColor(CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1.0))
    ctx.fillEllipse(in: r)
}

NSGraphicsContext.restoreGraphicsState()

let pngData = rep.representation(using: .png, properties: [:])!
let fm = FileManager.default
try! fm.createDirectory(atPath: "src-tauri/icons", withIntermediateDirectories: true)
try! pngData.write(to: URL(fileURLWithPath: "src-tauri/icons/icon.png"))
print("Generated 1024x1024 master icon at src-tauri/icons/icon.png")
