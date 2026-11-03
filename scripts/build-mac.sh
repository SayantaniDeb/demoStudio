#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
DEMOTAKE_NATIVE=1 npm run build
APP="$PWD/macos/build/DemoTake.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
# Some upgraded Command Line Tools installations leave two SwiftBridging maps.
# Mask only the obsolete duplicate for this build; never alter system files.
SWIFT_BIN="$(xcrun --find swiftc)"
SWIFT_HEADERS="$(dirname "$SWIFT_BIN")/../include/swift"
OVERLAY_FLAGS=()
if [[ -f "$SWIFT_HEADERS/module.modulemap" && -f "$SWIFT_HEADERS/bridging.modulemap" ]] && \
   grep -q 'module SwiftBridging' "$SWIFT_HEADERS/module.modulemap" && \
   grep -q 'module SwiftBridging' "$SWIFT_HEADERS/bridging.modulemap"; then
  node --input-type=module - "$SWIFT_HEADERS/module.modulemap" "$PWD/macos/build" <<'JS'
import {writeFileSync, realpathSync} from 'node:fs';
import {join} from 'node:path';
const [moduleMap, buildDir] = process.argv.slice(2);
const empty = join(buildDir, 'empty.modulemap');
writeFileSync(empty, '');
writeFileSync(join(buildDir, 'toolchain-overlay.json'), JSON.stringify({
  version: 0,
  roots: [{type: 'file', name: realpathSync(moduleMap), 'external-contents': empty}],
}));
JS
  OVERLAY_FLAGS=(-vfsoverlay "$PWD/macos/build/toolchain-overlay.json")
fi
cp macos/Resources/DemoTake.icns "$APP/Contents/Resources/DemoTake.icns"
cp macos/Info.plist "$APP/Contents/Info.plist"
rm -rf "$APP/Contents/Resources/web"
# Downloads belong to the website; never embed a previous installer inside the app.
mkdir -p "$APP/Contents/Resources/web"
rsync -a --exclude downloads/ dist/ "$APP/Contents/Resources/web/"
xcrun swiftc "${OVERLAY_FLAGS[@]}" -swift-version 5 -parse-as-library -target "$(uname -m)-apple-macosx15.0" \
  -module-cache-path "$PWD/macos/build/module-cache" \
  macos/Sources/*.swift -o "$APP/Contents/MacOS/DemoTake" \
  -framework SwiftUI -framework AppKit -framework WebKit -framework ScreenCaptureKit -framework AVFoundation
codesign --force --deep --sign "${MAC_SIGN_IDENTITY:--}" "$APP"
echo "Built: $APP"
