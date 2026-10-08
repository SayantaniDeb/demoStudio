# Design System: Frame

## 1. Visual Theme & Atmosphere
Frame is a desktop-first studio for recording screens, editing footage, and making animated product demos from videos, images, or public websites. Make the work itself the focal point: an expansive preview, a precise timeline, and quiet controls. Balanced density (6/10), restrained asymmetry (5/10), fluid motion (4/10). Design a working creative tool, with no marketing hero inside the editor.

## 2. Color Palette & Roles
- Studio Canvas (#F4F4F5): application background.
- Paper Surface (#FFFFFF): inspector and input surfaces.
- Charcoal Ink (#18181B): text and preview surround.
- Muted Zinc (#71717A): supporting metadata.
- Structural Zinc (#D4D4D8): separators and control outlines.
- Muted Lime (#B8D568): the only accent, for primary actions, active selections, and focus indicators; pair with Charcoal Ink for readable text.
Use one neutral temperature throughout. No pure black, neon, or purple/blue gradients.

## 3. Typography Rules
Use Geist for headings and body, Geist Mono for timecodes and technical metadata. Page headings 28–32px, section labels 14px semibold, body 14–16px with 1.5 line height; support text 14px minimum. Tight heading tracking (-0.025em), restrained weight hierarchy. Keep explanatory prose within 65ch. No Inter or serif fonts in the application.

## 4. Component Stylings
Buttons have 10px corners, 44px minimum targets, crisp labels, and transform-based press feedback. Use one primary action per workflow step. Secondary actions use outline or quiet surfaces. Use line icons with text labels for consequential actions.
Use containers only to establish workspace regions; avoid nesting cards around every setting. Inspector groups use separators and 20px padding. Inputs have visible labels above, helper text and errors below, and a visible lime focus ring with dark outline contrast. Use layout-matched skeletons, informative empty previews, inline errors, and cancellable progress for analysis/export. Disabled actions explain missing prerequisites.

## 5. Layout Principles
Use CSS Grid. Desktop shell: compact header; narrow workflow navigation; large central preview and timeline; 300px inspector. Contain general pages at 1440px; allow the editing workspace to fill available width. An asymmetric start screen pairs a recording action with smaller import and animation paths. Do not invent a multi-project library: the prototype persists one local project.
Screen Capture includes screen/camera/microphone setup and recording states. Editor includes playback, trim, split, reorder, delete, zoom, pointer, captions, music, and camera styling. Animation includes video/image/website inputs, template selection, editable scene copy, and source analysis. Export offers the supported 1080p WebM workflow, progress, and cancel. Do not promise MP4, cloud media storage, precise cursor tracking, automatic captions, or exact website reconstruction.
Below 768px, collapse multi-column regions into one column; inspector becomes a clearly labelled disclosure beneath preview. Timeline stays within viewport with its own deliberate scrolling region; no page overflow. Use 44px touch targets, clamp-based headings and spacing, and min-height:100dvh for viewport shells. No overlapping content or percentage layout hacks.

## 6. Motion & Interaction
Use brief opacity/transform transitions, with spring stiffness 100 and damping 20 where appropriate. Introduce scene lists with subtle stagger. Recording and processing indicators may pulse or shimmer while active; idle controls remain calm. Never animate layout dimensions or positions. Respect reduced-motion preferences, keyboard navigation, visible focus, and accessible progress announcements.

## 7. Anti-Patterns (Banned)
No emojis in product UI, Inter, generic serifs, pure black, neon glows, oversaturated accents, gradient headlines, custom cursors, overlapping elements, three equal feature cards, fake metrics, generic sample names, broken image URLs, filler scroll instructions, centered marketing heroes, or copy such as “Elevate”, “Seamless”, and “Unleash”. Use source-grounded preview examples and real functional labels.

## 8. Stitch Generation Brief
Create one cohesive desktop web application design with five connected screens: (1) start/setup, (2) recording in progress, (3) screen editor with selected footage and timeline, (4) animation studio with website/video/image input, template picker and scene inspector, (5) export settings/progress. Show the same shell, typography, spacing, and tokens across all screens. Include a compact mobile adaptation. Keep capture, editing, animation, and exporting recognizable as sequential actions. Use realistic footage thumbnails and legible control labels. Deliver application screens, not a promotional landing page.

## 9. Applied Stitch project reference
Source: https://stitch.withgoogle.com/projects/15648441996604160806 — Frame Demo Studio UI.
Applied the generated studio shell's compact navigation rail, modular workbench surfaces, lime #B8D568 primary controls, Geist typography, dense timeline toolbar and restrained inspector cards in `src/stitch-theme.css`. Responsive layouts preserve 44px mobile controls. The three built-in video storyboard renderers now also adapt this project's visual direction: Paper & Stickers uses offset source-browser cards and tactile lime labels; Editorial Launch uses asymmetric typography and numbered feature chapters; Aurora Showcase uses charcoal depth, a subtle grid and restrained lime ambient light. All use Geist, source-grounded content and shared browser-frame styling. These are code adaptations of the existing Stitch project, not newly generated Stitch screens. Preview and WebM export share the same canvas renderer. Unsupported telemetry, 3D tools and performance claims in generated markup are not implemented or presented as functional controls.

## 10. Animation Studio screen implementation
Reference screen: `4473d072009b4db8bc714196ba5c187c` from the supplied Stitch HTML. The animation workspace uses a source-analysis bar, charcoal grid stage, compact preset inspector, source-rendered storyboard thumbnails, scene navigation and synchronized headline/subcopy editing. Actual chapter counts and durations replace the sample four-scene values. Rendering remains the supported Canvas/WebM pipeline; sample WebGPU telemetry, optical lens controls and 4K claims are omitted.

## 11. Timeline editor reference
Adapted the local `frame_screen_editor_1` and `frame_screen_editor_2` exports: charcoal preview, compact transport and editing toolbar, named screen/camera rows, aligned zoom/cursor and real caption/music lanes, and a right-side Properties Inspector. Pointer tools move from the timeline into that inspector. Lane labels reflect current settings; speech-caption blocks reflect their actual source timing. Original split, trim, reorder, camera editing and export handlers remain connected. No sample snapping, auto-pacing or fake waveform controls are added.

## 12. Editable component lanes
Screen, camera, zoom/cursor, captions and music have explicit empty states and add/remove actions. Removing screen or camera excludes that layer from rendering while retaining source assets for restoration. Importing screen through its lane keeps existing camera media. Removing zoom/cursor resets its render settings; caption removal disables captions; music removal clears its asset and mix selection. Music selection and volume are editable directly in its lane.

## 13. Inline lane editing
Zoom and music use the same clip pattern: an empty Add button, a selectable clip, an inline editor beneath the lane, and clip-level removal. Zoom amounts are persisted per screen segment and inherited after splitting; manual timeline zoom works in portrait as well as landscape and is used by the shared preview/export renderer. Camera Add opens a chooser for imported footage, restoring saved camera media, or an explicitly labelled Record new camera take action. Opening that chooser never requests camera access.

## Timeline focus and zoom refinement
Use the existing Stitch editor language: Geist labels, Geist Mono timing, white controls, Zinc borders (#e4e4e7), and the restrained lime accent (#b8d568). Put zoom amount, presets and Fit in one compact inline editor beneath the selected zoom lane. Follow and focus switches belong in that same editor, not in the properties inspector. Give controls their own space with a top divider and 12px gaps; collapse to a single column on narrow screens with 44px touch targets. The shared playhead lives on the ruler and repeats as short lines inside lanes. Each lane retains its own last-selected charcoal marker. Never draw a continuous playhead through expanded controls. Click positions use the bounds of the lane's time area, excluding its label.
