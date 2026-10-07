# Design System: Frame motion studio

## 1. Visual Theme & Atmosphere
A focused creative workbench: neutral surfaces, a charcoal navigation rail, and one restrained moss accent. Density 5, variance 5, motion 4. The preview occupies the dominant left column; editing tools occupy a quieter right column. Use real media and direct manipulation as the visual center. The studio heading is left aligned, with a small film-strip illustration as visual punctuation, not a marketing hero.

## 2. Color Palette & Roles
- **Studio Canvas** (#F4F4F5): page background.
- **Paper Surface** (#FFFFFF): preview and input surfaces.
- **Quiet Surface** (#FAFAFA): inspector and timeline backgrounds.
- **Charcoal Ink** (#27272A): primary text and navigation depth. Never pure black.
- **Secondary Ink** (#52525B): body and helper text.
- **Structural Line** (#E4E4E7): dividers and neutral outlines.
- **Moss Accent** (#667E42): selected states, primary actions, focus, and trim handles. One accent family, low saturation; its pale tint (#E8EEDC) marks selection. No neon gradients or purple UI glows. Generated video artwork retains its own chosen design palette.

## 3. Typography Rules
- Display and body: Geist, sans-serif; headings weight 600, tracking -0.035em, clamp(1.5rem, 2.5vw, 2rem).
- Body and helper copy: 14px minimum, line-height 1.55; readable measure at most 65ch.
- Timestamps: Geist Mono, monospace; tabular numbers, 12px compact metadata.
- Do not use Inter or generic serif typography in the studio. User media and video templates are separate from the software UI.

## 4. Component Stylings
- Buttons: minimum 44px tap target, 10px corners, one filled primary action per functional group. Neutral secondary controls. Active press translates down 1px; no outer glows.
- Storyboard options: vertical list, thumbnail on the left and name/helper on the right. Selection uses a moss outline and subtle pale tint; no equal three-card promotional row.
- Inputs: visible label above, 14px text, 44px height, neutral border; moss focus ring. Errors below the relevant control.
- Timeline: compact strip with source-dependent clip names. No numeric trim forms. Drag handles trim; clips reorder; the toolbar splits and deletes. Handles have a visible grip and an enlarged touch hit area. Keyboard arrow adjustments remain available.
- Preview: rounded 14px, neutral surround, strong separation from tools. Paused previews must show meaningful content rather than disappearing entrance states.
- Elevation: only the main workbench and selected media frame use a faint neutral shadow. Use dividers in the inspector rather than a pile of elevated cards.
- Loading: progress text and a matching skeleton; no decorative circular spinner. Empty states explain upload, link, or capture actions with a composed film-strip visual.

## 5. Layout Principles
Use CSS Grid. Max studio width 1400px. Preview and inspector form an asymmetric split. No overlapping content or percentage-width hacks. Main spacing uses 8, 12, 16, 24, and 32px steps. Below 768px, every multi-column layout collapses to one column. Storyboard thumbnails remain a vertical list. No horizontal page overflow. Navigation reduces to the existing compact mobile navigation; animation source options stack when space is insufficient. Use min-height:100dvh rather than fixed viewport height.

## 6. Motion & Interaction
Motion supports orientation, not decoration. Use a soft 200ms easing approximation to spring stiffness 100/damping 20. Stagger storyboard entrance by 45ms. Animate only transform and opacity. An active selection marker has a subtle opacity breathing loop. Respect prefers-reduced-motion by disabling all loops and entrance motion. Keep CPU-heavy video rendering in its existing canvas engine; software UI transitions do not alter the exported animation. Native editing drag affordances remain because the user explicitly requested timeline manipulation; generated cursor styles remain within the video artwork.

## 7. Anti-Patterns (Banned)
No emojis, Inter, generic serif dashboard fonts, pure black, neon outer glows, oversaturated accents, gradient headline text, centered marketing heroes, filler scroll arrows, invented metrics, fake placeholder people, equal three-column feature cards, overlapping content, or broken remote imagery. Avoid “Elevate,” “Seamless,” “Unleash,” and similar generic marketing copy. Do not replace real media with fabricated product screenshots. Do not change the user's mouse cursor decoratively; functional trim/reorder cursors and exported video pointers are intentional editing affordances.
