#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
APP="$PWD/macos/build/DemoTake.app"
STAGE="$PWD/macos/build/download-stage"
DEST="$PWD/public/downloads"
[[ -d "$APP" ]] || { echo 'Run npm run mac:build first.' >&2; exit 1; }
mkdir -p "$STAGE" "$DEST"
# Replace only the generated staging copy so old resources cannot enter a release.
rm -rf "$STAGE/DemoTake.app"
# ditto preserves the signed app bundle and its executable permissions.
ditto "$APP" "$STAGE/DemoTake.app"
ln -sfn /Applications "$STAGE/Applications"
cat > "$STAGE/Install DemoTake.txt" <<'TEXT'
Install DemoTake

1. Drag DemoTake.app into Applications.
2. Open DemoTake from Applications.
3. If macOS blocks it, click Done. Open System Settings > Privacy & Security,
   find DemoTake and choose Open Anyway. Only approve a build you trust.
   Apple instructions: https://support.apple.com/en-gb/102445
4. Allow Screen Recording, Camera and Microphone when you use those features.

Requires macOS 15 or later and an Apple silicon Mac.
Developer preview: this build is ad-hoc signed and is not Apple notarized.
Recordings stay in the app's local library until you export them.
TEXT
hdiutil create -volname DemoTake -srcfolder "$STAGE" -ov -format UDZO "$DEST/DemoTake-Mac-AppleSilicon.dmg"
node --input-type=module - "$DEST" <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const directory=process.argv[2],name='DemoTake-Mac-AppleSilicon.dmg';
const hash=createHash('sha256').update(readFileSync(join(directory,name))).digest('hex');
writeFileSync(join(directory,name+'.sha256'),hash+'  '+name+'\n');
JS
echo "Packaged: $DEST/DemoTake-Mac-AppleSilicon.dmg"
