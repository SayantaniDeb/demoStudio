# AI-created components

Select **AI-created components** in Animation, enter an optional creative direction, and choose **Generate custom components** (or **Create a new variation**). Existing AI-directed projects need a new generation; old sticker plans are not converted into custom vectors.

The separate `/api/creative-animation` endpoint asks Groq for scene durations, custom component groups, primitive geometry including arbitrary SVG path data, and transform keyframes. Uploads provide their OCR observations and extracted source assets; website imports provide inspected page content/design. Groq receives source descriptions, not the uploaded video itself. The response is validated, repaired once if invalid, and then rendered from declarative data. Model-created code is never executed.

`shared/creative.mjs` bounds scene/element counts, coordinates, timing, colors and SVG path strings. `src/creative.ts` renders those definitions with Canvas/Path2D for preview and video export. SVG frame download serializes the same groups and transforms. Scenes use their actual generated durations in the timeline. `CreativeEditor` changes group names/positions, text, fill colors, and SVG path data.

The AI template no longer calls the Paper & stickers renderer or silently substitutes that template. Generation failures preserve the previous project and display an error. Existing other templates remain available.

Validation:

- `node tests/creative-pipeline.mjs`: geometry preservation, rejected markup, ordered keyframes and mocked Groq integration.
- `/tests/creative-renderer.html`: synthetic-fixture rendering at three timestamps and SVG parsing.
- `/tests/creative-editor.html`: synthetic-fixture editing and underlying state update.
- `npm run build`.

Live integration testing reached Groq, but a successful final generated result was not obtained: the initial response failed validation and the subsequent request reached the API rate limit. Visual quality of live generations still needs review when allowance becomes available. Synthetic fixtures are development tests only, not application templates.
