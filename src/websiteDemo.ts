import { paintCursor } from './cursor';
import type { CursorAppearance } from './cursor';
export type UploadStoryboardPlan = {
  start: number;
  end: number;
  title: string;
  focusX: number;
  focusY: number;
  sticker: string;
  transition: string;
  caption: string;
};
export const DEMO_DURATION = 22;
export type DemoCopy = {
  brand: string;
  query: string;
  filename: string;
  headline: string;
  pointer: CursorAppearance;
  size: number;
};
export type WebsiteDemo = {
  creative?: import('./creative').CreativeAnimation;
  analysis?: {
    duration: number;
    samples: number;
    recognized: number;
    groups: { start: number; end: number; text: string }[];
    imageIndices: number[];
  };
  sourceType?: 'video' | 'image';
  motion?: import('./cinematic').MotionDemo;
  assetCatalog?: { label: string; value: number }[];
  design?: unknown;
  sourceImages?: string[];
  storyboard?: import('./storyboard').Storyboard;
  url: string;
  brand: string;
  title: string;
  description: string;
  cta: string;
  accent: string;
  sections: { title: string; body: string }[];
  capturedAt: string;
  aiPlan?: import('./websiteDemo').UploadStoryboardPlan[];
};
export const websiteChapters = [
  { time: 0, label: 'Introduction' },
  { time: 4, label: 'Discover features' },
  { time: 8, label: 'Feature spotlight' },
  { time: 12, label: 'Explore more' },
  { time: 18, label: 'Visit the website' },
];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => 1 - Math.pow(1 - clamp(n), 3);
export function renderWebsite(
  ctx: CanvasRenderingContext2D,
  t: number,
  copy: DemoCopy,
  data: WebsiteDemo,
) {
  ctx.save();
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = '#f3f5fb';
  ctx.fillRect(0, 0, 1280, 720);
  const accent = data.accent || '#526de6';
  const box = (x: number, y: number, w: number, h: number, color = '#fff', r = 24) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    color = '#202739',
    bold = false,
    max = 1000,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? '700' : '400'} ${size}px Arial`;
    ctx.fillText(s, x, y, max);
  };
  const wrap = (
    s: string,
    x: number,
    y: number,
    width: number,
    size = 24,
    color = '#202739',
    bold = false,
    maxLines = 4,
  ) => {
    ctx.font = `${bold ? '700' : '400'} ${size}px Arial`;
    const rows: string[] = [];
    let row = '';
    for (const word of s.split(' ')) {
      if (ctx.measureText((row + ' ' + word).trim()).width > width && row) {
        rows.push(row);
        row = word;
      } else row = (row + ' ' + word).trim();
    }
    if (row) rows.push(row);
    rows
      .slice(0, maxLines)
      .forEach((r, i) =>
        text(
          r + (i === maxLines - 1 && rows.length > maxLines ? '…' : ''),
          x,
          y + i * size * 1.3,
          size,
          color,
          bold,
          width,
        ),
      );
  };
  const layer = (start: number, end: number, fn: () => void) => {
    const a = ease((t - start) / 0.7),
      b = 1 - ease((t - end) / 0.55);
    if (!a || !b) return;
    ctx.save();
    ctx.globalAlpha = a * b;
    ctx.translate(640, 360);
    const z = 0.94 + 0.06 * a;
    ctx.scale(z, z);
    ctx.translate(-640, -360 + (1 - a) * 42 - (1 - b) * 35);
    fn();
    ctx.restore();
  };
  const card = (x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.shadowColor = '#34426720';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    box(x, y, w, h);
    ctx.restore();
  };
  const sections = data.sections.length
    ? data.sections
    : [{ title: data.title, body: data.description }];
  const intro = copy.query || data.title;
  layer(0, 3.8, () => {
    card(130, 100, 1020, 510);
    text(copy.brand, 175, 151, 24, accent, true);
    box(175, 190, 70, 5, accent, 2);
    wrap(intro, 175, 271, 900, 46, '#202739', true, 3);
    wrap(copy.filename || data.description, 178, 459, 790, 23, '#808a9d', false, 3);
  });
  layer(3.8, 7.8, () => {
    text('Discover ' + copy.brand, 160, 125, 35, '#202739', true);
    sections.slice(0, 4).forEach((s, i) => {
      const a = ease((t - 4.15 - i * 0.15) / 0.6);
      ctx.save();
      ctx.globalAlpha *= a;
      const x = 160 + (i % 2) * 485,
        y = 190 + Math.floor(i / 2) * 190 + (1 - a) * 30;
      card(x, y, 455, 165);
      box(x + 22, y + 23, 38, 38, accent, 11);
      text(String(i + 1), x + 34, y + 49, 20, '#fff', true);
      wrap(s.title, x + 78, y + 49, 350, 23, '#202739', true, 2);
      wrap(s.body, x + 23, y + 113, 405, 18, '#8490a1', false, 2);
      ctx.restore();
    });
  });
  layer(7.8, 11.8, () => {
    const s = sections[0];
    const z = 1 + 0.12 * ease((t - 9) / 1.7);
    ctx.translate(640, 360);
    ctx.scale(z, z);
    ctx.translate(-640, -360);
    card(250, 170, 780, 380);
    box(295, 216, 70, 70, accent, 20);
    text('01', 311, 261, 29, 'white', true);
    wrap(s.title, 295, 355, 680, 38, '#202739', true, 2);
    wrap(s.body || data.description, 295, 449, 660, 22, '#8793a5', false, 3);
  });
  layer(11.8, 17.8, () => {
    const others = sections.slice(1, 4);
    text('Explore what’s possible', 175, 144, 39, '#202739', true);
    (others.length ? others : sections.slice(0, 3)).forEach((s, i) => {
      const a = ease((t - 12.2 - i * 0.25) / 0.7);
      ctx.save();
      ctx.globalAlpha *= a;
      const y = 205 + i * 133 + (1 - a) * 30;
      card(175, y, 930, 112);
      box(195, y + 25, 55, 55, accent, 16);
      text('↗', 210, y + 61, 28, '#fff', true);
      wrap(s.title, 280, y + 44, 780, 25, '#202739', true, 1);
      wrap(s.body, 280, y + 81, 780, 18, '#8b96a7', false, 1);
      ctx.restore();
    });
  });
  layer(17.8, 22.5, () => {
    card(210, 145, 860, 425);
    text(copy.brand, 270, 220, 23, accent, true);
    wrap(copy.headline || data.cta, 270, 316, 740, 41, '#202739', true, 3);
    box(270, 451, Math.min(650, Math.max(280, data.cta.length * 13 + 55)), 65, accent, 18);
    text(data.cta + ' →', 292, 491, 25, '#fff', true, 600);
    text(new URL(data.url).hostname, 270, 545, 18, '#8995a7');
  });
  const k = ease((t % 4) / 1.3),
    x = 1080 - 190 * k,
    y = 150 + 280 * k;
  paintCursor(ctx, x, y, copy.size, copy.pointer);
  text(new URL(data.url).hostname, 70, 680, 16, '#8f99aa');
  ctx.restore();
}
