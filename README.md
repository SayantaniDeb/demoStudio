# DemoTake — local demo studio

A desktop-first PWA prototype for screen + camera recording, local video editing, and editable animated demo scenes.

## Run

```sh
npm install
npm run dev
```

Open the localhost URL in desktop Chrome. Capture requires localhost or HTTPS and explicit browser permission. Production builds register the offline service worker (`npm run build`, then `npm run preview`).

### Mac app with direct-to-disk recording

On macOS 15+, run `npm run mac:build`, then `npm run mac:open`. The local app bundles the existing editor and records screens through ScreenCaptureKit directly to its private local recording library. Use **Stop & save to library**, then **Edit recording**, or reopen recordings from **Library**. Choose **Export video** to save a finished copy outside the app. Original recordings remain in the app library even if the editor's browser cache is full. This is an initial local Mac build: bundled AI/server features are not included. Native Camera controls record a separate local webcam track and attach it to the editor; see the Mac notes for current capture and sync limits. See [Mac build instructions and limitations](macos/README.md).

## Implemented

- Screen recording with optional camera and microphone, stored as separate video tracks.
- Muted, mirrored live camera preview while recording; optional Picture-in-Picture keeps it visible over other apps where supported. The original camera track is not mirrored.
- Video import, playback, trim range, focal point selection, zoom, background colors, camera overlay, and manual captions.
- Three-phase animated demo (intro, product showcase, closing card), using the same Canvas renderer for preview and export.
- Local screen-activity analysis with eased auto zoom and pan. Generate auto zoom once after import; enable or disable it independently.
- Real-time 1920 × 1080 WebM export (18 Mbps target). Keep the tab foreground during export.
- IndexedDB media storage and local settings persistence.
- Optional authenticated Firestore metadata saving.

## Firebase

Copy `.env.example` to `.env.local` and populate the Firebase web app configuration. Enable Anonymous authentication in Firebase Console. Add owner-only Firestore security rules, for example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Cloud saving stores settings only. Recordings remain local; cloud media storage is not implemented. Anonymous users are device-specific. A future account sign-in flow is required for cross-device projects.

## Current limits / next stages

This is an initial working prototype, not the complete planned app. AI storyboard generation, automatic UI recreation, automatic captions, cursor tracking, multi-scene timeline, camera-only recording, MP4/WebCodecs export, and cloud media uploads remain to be built. Manual zoom is a fixed crop; generated auto zoom follows frame differences, not precise cursor coordinates. One local project is persisted. Microphone audio takes priority over system audio when both are available; audio mixing is a future improvement. WebM export audio uses a Web Audio capture graph. Camera tracks have approximate synchronized starts rather than timestamp correction. Animation plays on the selected trim range; click Preview animation to restart it.

## Recent behavior changes

Auto zoom analysis starts when a recording loads and uses the editor duration for browser recordings with missing duration metadata. Activity focus persists rather than instantly returning to wide. Cursor icon and size controls add an activity pointer, not a replacement for the original recorded OS cursor.

The Break down recording action detects foreground image regions from sampled frames and creates animated crop compositions. These are pixel-based components, not semantically reconstructed UI or editable extracted text.

Floating webcam preview is blocked for full-monitor or unknown capture surfaces because it can be recorded. Choose an app window or browser tab, excluding this studio, to keep the webcam preview separate.

Component generation now includes local Tesseract text recognition. Recognized lines become editable text cards with staggered entrance animations; visual regions remain image crops. The initial run downloads worker/model files. This does not upload footage. OCR may misread text and cannot infer the meaning of a workflow.

Generated pointer replacement: select a pointer before recording. Capture requests cursor: never and verifies the returned track settings. The overlay is enabled only when cursor-free capture is confirmed, preventing duplicate pointers. Imported/existing videos require manual cursor calibration for best-effort replacement. Browsers can ignore the capture cursor constraint.

## Recorded cursor replacement

Pause where the original cursor is visible, choose its original width, then use **Pick recorded cursor** and click its top-left tip. A calibrated pixel template tracks the cursor; matching pixels are filled from a previous clear frame where available, otherwise neighboring background pixels. The selected icon is drawn at the tracked position before zoom/composition, so preview and export use identical replacement logic.

Only matches at or above 94% similarity are changed. Other frames retain their original pixels. This is best-effort template tracking: it can lose the cursor over changed backgrounds, different cursor shapes, or occlusion; filling can blur underlying details. Calibration is saved and restored when reopening the project. Selecting None with replacement enabled removes confident matches without drawing an icon.

Open `/tests/cursor.html` on the dev server and run the checks for moving-cursor tracking, original-pixel removal, and blank-frame rejection. These tests use synthetic frames; they do not establish reliability across arbitrary real recordings.

Quality: new screen recordings request 20 Mbps video and 192 kbps audio. The cursor matcher uses a reduced analysis image, but composition retains the native source resolution outside the cursor patch. Existing compressed recordings cannot regain lost detail. The editor preview is 1280×720; export is 1920×1080. Browser encoders may choose a different effective bitrate.

## Website link import

Demo Studio → Website Link to Video reads a public URL with a fresh, unauthenticated headless Chrome session. It extracts visible headings, descriptions, feature copy, a CTA and an accent color, then sends that public text to Groq to plan editable UI layers, colours, scene timing and camera movement. The browser draws and exports the storyboard locally. Basic mode retains the 22-second preset renderer when explicitly selected. Source data and edits persist with the project; export uses the same canvas renderer. This is content-based scene generation, not exact reconstruction of arbitrary page layouts or private workflows. Sites that require sign-in or block automation return an error rather than invented content.

The `/api/website-demo` endpoint is installed in Vite dev/preview. For a built local app, run `npm run build` then `npm run serve` (port 8787). Chrome must be installed; set `DEMO_CHROME_PATH` if it is in a different location. A static-only production host must also host this endpoint or configure `VITE_WEBSITE_DEMO_ENDPOINT` to an equivalent service with appropriate CORS. Firestore does not fetch webpages. The server reads public website content; it does not receive screen recordings or render exports. Do not expose the endpoint publicly without authentication and deployment-specific rate limits. Private network URLs/subrequests, credentials in URLs and nonstandard ports are rejected. Browser sessions close after extraction.

Demo Studio navigation has three sections: Screen Capture (recording and editing), Animation (recording component extraction and scene animation), and Website Link to Video (public URL import, website scene editing and export). Smaller screens show the same sections above the editor. Switching sections pauses playback and preserves the project.

## Groq AI website demos

Add `GROQ_API_KEY=your_key` to `.env.local` and restart `npm run dev`. Do not use a `VITE_` prefix for this secret. Optional `GROQ_MODEL` defaults to `openai/gpt-oss-120b`, using Groq strict structured outputs. Schema-related provider failures retry with JSON mode and the same local validation; other configured models use JSON mode without GPT-OSS-specific reasoning options. For production use `npm run build` then `npm run serve`; the Node server loads `.env.local` and needs installed Chrome (`DEMO_CHROME_PATH` can override its location). A static-only deployment needs the server endpoint configured through `VITE_WEBSITE_DEMO_ENDPOINT`.

Choose Website Link to Video, leave Use Groq AI checked, enter a public URL and Generate AI demo. Page text and its public URL are sent to Groq. Recordings and webcam footage are not sent. Generated scenes use independent cards, text, buttons, inputs, badges, circles, progress indicators and bar visuals with staggered entrances, gradients, camera movement and a pointer. Scene chapters and export duration follow the AI plan. Edit primary copy or expand Edit AI scene components to change individual labels.

The importer reads computed UI styles and geometry and captures two actual page screenshots. Groq receives a compact DOM/style description; screenshots remain renderer assets rather than image inputs to Groq. Scenes can include real screen images and matching animated layers. This is not pixel-perfect reconstruction or automatic exploration of private workflows. The Canvas component style is inspired by shadcn (borders, shadows, rounded controls and type hierarchy); it does not execute React/shadcn code generated by the model. Mock interfaces are illustrative; review generated copy before exporting. Missing keys, provider failures and invalid plans show errors and preserve the previous demo; there is no silent preset fallback. Invalid plans receive up to two repair attempts; provider usage limits stop generation with a clear error. Schema validation bounds scene lengths, component counts, colours and geometry. Generated JavaScript is never executed.

Validation: `node --test tests/storyboard.test.mjs`; with the dev server running, `/tests/renderer.html` exercises animation pixels, scene transitions, component types and dynamic timeline. Live generation requires a configured Groq key.

### Timeline editing and audio

Screen Capture and Animation share a non-destructive recording timeline. Website Link to Video has its own timeline. Scrub to a position and choose Split at playhead; click segment blocks to seek, drag them to reorder, or drag a clip edge to trim its source range. Delete selected removes the selected clip from the sequence and Reset restores the full sequence. Camera footage follows the same cuts. Preview and 1080p WebM export use the edited sequence.

Music & sound supports local audio uploads, looping background music, volume controls, and synthesized transition effects at segment boundaries. Uploaded music stays in IndexedDB. Website demos default to AI-free page captures with UI stickers and cinematic transitions; Groq planning remains optional.

Browser checks: `/tests/timeline.html` checks splitting, reordered source mapping, and audible/silent transition mixes.

### Storyboard styles and Stitch screens

Website Link to Video offers Paper & Stickers, Editorial Launch, and Aurora Showcase. Each has six different scene treatments and uses the same timeline and export path. Select a style before importing a website, or switch an existing demo without another AI request.

The Google Stitch workflow is manual: open Stitch, design screens, export PNG/JPEG images, then choose Use a Google Stitch design → Upload design screens. Editorial and Aurora animate those screens in browser/gallery scenes. Screens are resized locally; they remain flattened image layers, not reconstructed controls. There is no automatic Stitch account/API connection.

`/tests/templates.html` verifies that all three storyboard styles render distinct layouts and expose six chapters.

### Animation inputs

Animation contains Upload Video, Upload Image, and Website Link to Video. Upload an image to create a six-second clip with a gentle zoom, or upload a video. Choose Generate storyboard from upload to sample real frames and detect visual regions locally; then select any of the three storyboard styles, edit copy and timeline segments, add music, and export. Visual regions are image crops rather than editable semantic UI controls. The generated storyboard is a 30-second reinterpretation of the selected source ranges, not a frame-for-frame replay of the uploaded footage. Website and media storyboards are retained separately when switching input modes.

`/tests/uploads.html` checks the video-backed extraction path for both input kinds and renders all styles from the captured assets.

Uploaded-media analysis now scans the full source at approximately one-second intervals (not just the selected timeline ranges). Tesseract recognizes changed screens and four-second checkpoints, adjacent observations are grouped by text overlap and visual similarity, and spatially related regions become source-backed stickers in downloadable PNG compositions. Source analysis and image downloads appear in the animation inspector after generating a new storyboard. Recognition runs locally; its first run downloads the English OCR model. This is heuristic grouping, not semantic LLM understanding; very brief events between samples and low-confidence text may be missed. Long uploads take proportionally longer to analyze. Up to 36 representative groups are retained, with three image compositions selected for the demo.

## Deploy through GitHub to Vercel

1. Push this project to a private GitHub repository. `.env.local`, build output, and dependencies are excluded from Git.
2. In Vercel, choose **Add New → Project**, then import that repository. Use the Vite preset, `npm run build`, `dist`, and Node.js 22.
3. Add `GROQ_API_KEY` in Vercel's environment settings to enable AI generation and captions. Optionally add `GROQ_API_KEY_1` and `GROQ_MODEL`. Keep these server secrets free of the `VITE_` prefix.
4. If using Firebase, add the four `VITE_FIREBASE_*` values from `.env.example` before building, and add the deployed domain to Firebase Authentication's authorized domains. Cloud storage requires appropriate Firestore rules.
5. Deploy. Future pushes trigger deployments through the GitHub integration.

`vercel.json` packages `/api/*` as a Node function. The website importer uses bundled serverless Chromium on Vercel and installed Chrome during local development. No `DEMO_CHROME_PATH` is needed on Vercel. Keep `VITE_WEBSITE_DEMO_ENDPOINT` unset to use the same-origin API.

Verify screen recording in desktop Chrome over HTTPS, `/api/ai-status`, captions, and website import after deployment. Website capture responses must fit Vercel's function payload limit; image-heavy pages can exceed it. The existing 60-second mono WAV caption chunks are approximately 1.9 MB each. Browser extension installation remains a separate step; see `extension/README.md`.

The AI and website-import endpoints currently have no application authentication or distributed rate limiting. Keep the deployment protected for private testing until those controls are added for a public launch. A private GitHub repository does not make the deployed website private.

### Search metadata

The homepage includes descriptive search/social metadata, SoftwareApplication structured data, and visible product questions. Set `SITE_URL=https://your-production-domain` in the build environment to generate a matching canonical URL, Open Graph URL and sitemap. Without this value no production domain is guessed. After deployment, submit `/sitemap.xml` in Google Search Console. The production build prerenders the homepage product copy, features and FAQs into HTML. JavaScript activates the interactive studio.
