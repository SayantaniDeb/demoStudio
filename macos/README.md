# DemoTake for Mac (local development build)

Requires macOS 15 or later, Apple Command Line Tools, Node and the project's npm dependencies **to build**. The built app bundles the editor and does not need Vite or Node to record or edit basic videos.

```sh
npm run mac:build
npm run mac:open
```

The app is created at `macos/build/DemoTake.app`. This is an ad-hoc signed local build, not a notarized distribution release.

1. Click Record screen. A separate floating recording window opens outside the editor.
2. Enable Camera to preview your webcam, and choose microphone, system audio and frame rate. macOS asks for Camera permission the first time you enable it. Camera configuration runs off the UI thread.
3. Click Choose screen or window. Select content in the macOS picker; the floating window shows a three-second countdown.
4. Use Stop & save in the floating window when finished. It remains visible for both window and entire-display recording; whole-display capture may include the controls and preview, so window capture is recommended when you want to keep them separate. The menu-bar Stop button and Command-Shift-2 (while DemoTake is active) are also available.
5. After screen and camera files finish saving, the editor reopens with the webcam as an editable layer. Library reopens earlier recordings and their associated camera tracks. Export video saves a finished copy outside the app.

Capture no longer enumerates all screens on launch or treats an empty screen list as a permission failure. Each recording starts through the system picker. Locally ad-hoc signed rebuilds have version-specific code identities; `MAC_SIGN_IDENTITY` can select an installed Apple signing identity for builds when one is available. The system picker avoids relying on the old global enumeration/permission gate.

Native capture uses ScreenCaptureKit and SCRecordingOutput with H.264 MP4 output, up to 1920×1080 while preserving display aspect ratio. It excludes this app from source-window selection, hides the editor during capture, excludes its audio, and hides the system cursor in new recordings. The cursor remains visible on your screen while you work; existing recordings and imported videos are unchanged. It writes during capture rather than accumulating browser recording chunks. Encoding, disk speed and system load still affect achievable frame rate; 60 fps is a request, not a guarantee.

Recordings live under `~/Library/Application Support/com.demotake.studio.local/Recordings`, separate from the `.app` bundle so app rebuilds do not remove them. Unfinished captures stay in the sibling `In Progress` folder until finalized. The library lists completed recordings across app restarts. Previous files saved to Movies or a custom folder are left in place; use Import video to copy them into the library.

The editor still uses its existing browser project cache, which is separate from the permanent library recordings. If its cache fills up, recordings remain in the library and can be reopened. The native app has a separate cache from Chrome, so existing browser projects are not automatically migrated.

The bundled editor runs on a loopback-only asset server at `127.0.0.1:19743` while the app is open. It serves bundled assets and explicitly selected recordings, without exposing the recording folder. Only one app instance can use this port. Exports fall back to MP4 on WebKit, with the native Save dialog.

Current limits: native capture supports a display or single window, without pause, cursor telemetry or area selection. Use the native recorder controls for screen/audio settings. The embedded editor retains its web editing/export implementation, which needs testing on WebKit for each advanced workflow. AI/website endpoints and Chrome-specific extension/Remotion functionality are not bundled into this offline app; use the existing web app/backend for those workflows. This first build focuses on local native recording and the existing basic editor.

Validation: run `npm run mac:build` to typecheck/build the web editor and compile/sign the native app. On a permission-enabled Mac, test 30/60 fps capture, microphone and system audio separately/together, stop/finalize, Finder playback, Edit recording, trim/export, and reopening after quitting. Review actual playback and CPU before claiming an improvement over browser capture.

Verified locally: successful web/native build and signature verification; native app/editor launch; importing a synthetic two-second H.264 MP4; playback; restoring the cached project after app restart; 1080p rendering and saving an MP4 through the native Save dialog. The saved MP4 was checked for H.264 and 1920×1080 resolution. The existing real-time exporter produced a 2.92-second output from this short source; frame-accurate export timing still needs work. Native capture, finalization, internal library storage, and automatic editor reopening have since been verified with real captures. One completed MP4 was read through AVFoundation: 10.72 seconds, 1726×1080, one video track. Subjective smoothness and separate microphone/system-audio quality still need review.

On upgraded Command Line Tools installations with duplicate `SwiftBridging` module maps, the build script creates a local VFS overlay to hide the obsolete duplicate for compilation. It does not modify the installed developer tools.

Quitting during an active capture requests stop and waits for MP4 finalization before exiting. Closing/hiding the editor during capture keeps the app running. Two real captures successfully finalized into the internal library after switching to the native picker, and the latest reopened automatically in the editor. The partial file from the earlier stuck build is retained in In Progress.

Camera tracks are captured through AVFoundation to local MOV files under the app’s Camera folder, with a JSON association and estimated start offset. They are kept separately from the cursor-free screen MP4 so the editor can reposition/style the webcam. Synchronization uses recording-start callbacks and is approximate, not sample-accurate. Microphone/system audio remain in the screen recording. Camera persistence and metadata were tested with a synthetic video fixture. Live webcam preview, paired screen/camera recording, saving, and editor handoff were verified on-device. Camera shutdown retains the preview layer until the session stops to avoid an AVFoundation teardown deadlock. Hardware audio quality still needs a listening check.

New native recordings also save a private Cursor JSON sidecar: normalized mouse positions and button-down transitions sampled at 30 Hz while recording. No keyboard events or accessibility event tap are used. The editor automatically follows this path with eased 1.7× activity zoom and returns to full framing after idle periods; the cursor remains hidden. Window bounds refresh while recording to account for window movement. Earlier recordings without cursor metadata cannot recover the original mouse path. On macOS before 15.2, capture uses the filter content rectangle as a fallback; multi-display/window mapping needs hardware validation.

Microphone mute/unmute remains available during native recording. AVAudioEngine writes a separate temporary audio track; muted buffers are zeroed before writing, and the track is mixed into the final MP4 with its start offset when saving. Starting with Mic off does not open the microphone until Unmute is pressed. Saving with microphone audio includes an export step and may take longer. Original screen/mic files are retained in In Progress if mixing fails. Synthetic export validation checked video duration, delayed audio start, muted silence, and an audible test tone; live device behavior still needs a recording/listening check.

The earlier native joining fallback remains available as a legacy helper, but the editor’s append path no longer calls it. Layout presets anchor the camera to transformed screen bounds; desktop scaling is no longer capped at 100%, and Fill canvas supplies an explicit full-frame layout.

Screen clips now remain independent in the editor. Each added recording is stored under its own asset key with source offset/duration metadata; append does not rewrite the original screen file or run the native joiner. Playback and final export switch source files at clip boundaries. Trims, reordering, removal, and Undo edit the timeline while retaining source assets. Existing merged footage is kept as an original asset for compatibility. Extra canvas time for camera clips uses a virtual blank slot without combining media files.
