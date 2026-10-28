import { paintCursor } from './cursor';
import type { DemoCopy } from './websiteDemo';
export type Component = {
  kind: 'card' | 'text' | 'button' | 'input' | 'badge' | 'circle' | 'progress' | 'bars' | 'image';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  color: string;
  fontSize: number;
  radius: number;
  delay: number;
  enter: 'fade' | 'slide' | 'pop' | 'typewriter';
  values: number[];
  binding: 'none' | 'brand' | 'headline' | 'description' | 'cta';
};
export type Storyboard = {
  assets?: string[];
  referenceMode?: string;
  model: string;
  scenes: {
    title: string;
    duration: number;
    background: string;
    gradient: string;
    zoom: number;
    focusX: number;
    focusY: number;
    pointerX: number;
    pointerY: number;
    components: Component[];
  }[];
};
export const storyDuration = (s: Storyboard) => s.scenes.reduce((n, c) => n + c.duration, 0);
export function storyChapters(s: Storyboard) {
  let time = 0;
  return s.scenes.map((scene) => {
    const chapter = { time, label: scene.title };
    time += scene.duration;
    return chapter;
  });
}
const imageCache = new Map<string, HTMLImageElement>();
export function sourceImage(src: string) {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imageCache.set(src, img);
    if (imageCache.size > 8) imageCache.delete(imageCache.keys().next().value!);
  }
  return img;
}
export async function prepareStoryImages(story: Storyboard) {
  await Promise.all(
    (story.assets || []).map((src) =>
      sourceImage(src)
        .decode()
        .catch(() => {
          throw new Error('A website screenshot could not be loaded. Regenerate the demo.');
        }),
    ),
  );
}
const ease = (n: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, n)), 3);
export function renderStoryboard(
  ctx: CanvasRenderingContext2D,
  t: number,
  copy: DemoCopy,
  story: Storyboard,
  transitionPass = false,
) {
  let elapsed = 0,
    index = story.scenes.length - 1;
  for (let i = 0; i < story.scenes.length; i++) {
    if (t < elapsed + story.scenes[i].duration) {
      index = i;
      break;
    }
    elapsed += story.scenes[i].duration;
  }
  if (index === story.scenes.length - 1)
    elapsed = story.scenes.slice(0, -1).reduce((n, s) => n + s.duration, 0);
  const s = story.scenes[index],
    local = t - elapsed,
    p = ease(local / s.duration),
    z = 1 + (s.zoom - 1) * p;
  const transition = !transitionPass && index > 0 && local < 0.8;
  if (transition) renderStoryboard(ctx, elapsed - 0.8, copy, story, true);
  ctx.save();
  if (transition) ctx.globalAlpha *= ease(local / 0.8);
  else ctx.clearRect(0, 0, 1280, 720);
  const bg = ctx.createLinearGradient(0, 0, 1280, 720);
  bg.addColorStop(0, s.background);
  bg.addColorStop(1, s.gradient);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.translate(s.focusX, s.focusY);
  ctx.scale(z, z);
  ctx.translate(-s.focusX, -s.focusY);
  for (const c of s.components) {
    const a = ease((local - c.delay) / 0.9);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(c.x, c.y + (c.enter === 'slide' ? (1 - a) * 22 : 0));
    if (c.enter === 'pop') {
      ctx.translate(c.width / 2, c.height / 2);
      ctx.scale(0.96 + 0.04 * a, 0.96 + 0.04 * a);
      ctx.translate(-c.width / 2, -c.height / 2);
    }
    const box = (x: number, y: number, w: number, h: number, fill: string, r = c.radius) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
      ctx.fill();
    };
    if (c.kind === 'card') {
      ctx.shadowColor = '#0f172a18';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
    }
    if (c.kind === 'circle') {
      ctx.fillStyle = c.fill;
      ctx.beginPath();
      ctx.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.kind !== 'text') box(0, 0, c.width, c.height, c.fill);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (['card', 'input', 'badge'].includes(c.kind)) {
      ctx.strokeStyle = '#94a3b833';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(
        0.5,
        0.5,
        c.width - 1,
        c.height - 1,
        Math.min(c.radius, c.width / 2, c.height / 2),
      );
      ctx.stroke();
    }
    if (c.kind === 'image') {
      const src =
        story.assets?.[
          Math.round((c.values[0] || 0) * Math.max(0, (story.assets?.length || 1) - 1))
        ];
      if (src) {
        const img = sourceImage(src);
        if (img.complete && img.naturalWidth) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(0, 0, c.width, c.height, Math.min(c.radius, 16));
          ctx.clip();
          const scale = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight),
            w = img.naturalWidth * scale,
            h = img.naturalHeight * scale;
          ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
          ctx.restore();
        }
      }
    }
    if (c.kind === 'progress') box(0, 0, c.width * c.values[0] * a, c.height, c.color);
    if (c.kind === 'bars') {
      const gap = 8,
        bw = (c.width - gap * (c.values.length - 1)) / c.values.length;
      c.values.forEach((v, i) =>
        box(i * (bw + gap), c.height * (1 - v * a), bw, c.height * v * a, c.color, 4),
      );
    }
    ctx.beginPath();
    ctx.rect(0, 0, c.width, c.height);
    ctx.clip();
    let text =
      c.binding === 'brand'
        ? copy.brand
        : c.binding === 'headline'
          ? copy.query
          : c.binding === 'description'
            ? copy.filename
            : c.binding === 'cta'
              ? copy.headline
              : c.text;
    if (c.enter === 'typewriter')
      text = text.slice(
        0,
        Math.floor(text.length * Math.max(0, Math.min(1, (local - c.delay) / 1.5))),
      );
    if (text && !['bars', 'progress', 'image'].includes(c.kind)) {
      const padding = c.kind === 'text' ? 0 : c.kind === 'badge' ? 10 : 16,
        available = c.width - padding * 2;
      const weight =
        c.kind === 'text'
          ? c.fontSize >= 32
            ? '700'
            : '400'
          : ['button', 'badge'].includes(c.kind)
            ? '600'
            : '400';
      let size = c.fontSize;
      const lines = (font: number) => {
        ctx.font = `${weight} ${font}px Inter, system-ui, Arial`;
        const rows: string[] = [];
        let row = '';
        for (const word of text.split(/\s+/)) {
          const next = (row + ' ' + word).trim();
          if (ctx.measureText(next).width > available && row) {
            rows.push(row);
            row = word;
          } else row = next;
        }
        if (row) rows.push(row);
        return rows;
      };
      let rows = lines(size);
      while (size > 14 && rows.length * size * 1.25 > c.height - padding * 2) {
        size--;
        rows = lines(size);
      }
      ctx.fillStyle = c.color;
      ctx.textBaseline = 'top';
      const center = ['button', 'badge'].includes(c.kind);
      ctx.textAlign = center ? 'center' : 'left';
      const y = ['button', 'badge', 'input'].includes(c.kind)
        ? Math.max(0, (c.height - rows.length * size * 1.25) / 2)
        : padding;
      rows.forEach((row, i) =>
        ctx.fillText(row, center ? c.width / 2 : padding, y + i * size * 1.25, available),
      );
    }
    ctx.restore();
  }
  const previous = story.scenes[Math.max(0, index - 1)];
  paintCursor(
    ctx,
    previous.pointerX + (s.pointerX - previous.pointerX) * ease(local / 1.4),
    previous.pointerY + (s.pointerY - previous.pointerY) * ease(local / 1.4),
    copy.size,
    copy.pointer,
  );
  ctx.restore();
}
