#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/5] Compilando interface frontend de produção (React 19 + TypeScript + Vite)..."
npm run build

echo "==> [2/5] Compilando motor nativo Rust (amanuensis-core + amanuensis-desktop) em modo Release..."
cargo build --release -p amanuensis-desktop

echo "==> [3/5] Montando pacote nativo macOS Amanuensis.app..."
STAGE_ROOT="$(mktemp -d /tmp/amanuensis_bundle.XXXXXX)"
STAGE_APP="$STAGE_ROOT/Amanuensis.app"
STAGE_DMG_DIR="$STAGE_ROOT/dmg_staging"
OUT_DIR="release"
APP_DIR="$OUT_DIR/Amanuensis.app"
DMG_PATH="$OUT_DIR/Amanuensis_2.0.0_macOS_Installer.dmg"

mkdir -p "$OUT_DIR"
rm -rf "$APP_DIR" "$DMG_PATH"
mkdir -p "$STAGE_APP/Contents/MacOS"
mkdir -p "$STAGE_APP/Contents/Resources"

# Copy high-res macOS .icns icon and compiled frontend bundle
cp src-tauri/icons/icon.icns "$STAGE_APP/Contents/Resources/icon.icns"
cp -R dist "$STAGE_APP/Contents/Resources/dist"

# Copy compiled Rust core daemon binary and strip local symbols for minimal disk footprint
cp target/release/amanuensis-desktop "$STAGE_APP/Contents/MacOS/amanuensis-core-daemon"
strip -x "$STAGE_APP/Contents/MacOS/amanuensis-core-daemon" 2>/dev/null || true
chmod +x "$STAGE_APP/Contents/MacOS/amanuensis-core-daemon"

# Compile native macOS Cocoa/WKWebView window shell with full optimization + strip
swiftc -O scripts/macos_window_launcher.swift \
  -framework Cocoa -framework WebKit \
  -o "$STAGE_APP/Contents/MacOS/Amanuensis"
strip -x "$STAGE_APP/Contents/MacOS/Amanuensis" 2>/dev/null || true
chmod +x "$STAGE_APP/Contents/MacOS/Amanuensis"

# Write macOS Info.plist
cat > "$STAGE_APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Amanuensis</string>
  <key>CFBundleDisplayName</key>
  <string>Amanuensis</string>
  <key>CFBundleIdentifier</key>
  <string>io.amanuensis.workbench</string>
  <key>CFBundleVersion</key>
  <string>2.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>2.0.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleExecutable</key>
  <string>Amanuensis</string>
  <key>CFBundleIconFile</key>
  <string>icon.icns</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>
</dict>
</plist>
EOF

dot_clean -m "$STAGE_APP" || true

echo "==> [4/5] Assinando pacote Amanuensis.app (ad-hoc codesign)..."
codesign --force --deep --sign - "$STAGE_APP"

echo "==> [5/5] Gerando instalador de imagem de disco (.dmg) com atalho para /Applications..."
mkdir -p "$STAGE_DMG_DIR"
cp -R "$STAGE_APP" "$STAGE_DMG_DIR/"
ln -s /Applications "$STAGE_DMG_DIR/Applications"
hdiutil create -volname "Amanuensis Installer" \
  -srcfolder "$STAGE_DMG_DIR" \
  -ov -format ULFO \
  "$DMG_PATH" >/dev/null || \
hdiutil create -volname "Amanuensis Installer" \
  -srcfolder "$STAGE_DMG_DIR" \
  -ov -format UDZO \
  "$DMG_PATH" >/dev/null

cp -R "$STAGE_APP" "$APP_DIR"
dot_clean -m "$OUT_DIR" || true
rm -rf "$STAGE_ROOT"

echo "✅ Concluído!"
echo "   • App Nativo:    $(pwd)/$APP_DIR"
echo "   • Instalador:    $(pwd)/$DMG_PATH"
