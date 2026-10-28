import { sourceImage, prepareStoryImages } from './storyboard';
import { paintCursor } from './cursor';
import type { WebsiteDemo, DemoCopy } from './websiteDemo';
export type MotionDemo = {
  template?: import('./demoTemplates').TemplateId;
  designScreens?: string[];
  assets: string[];
  catalog: { label: string; value: number }[];
  segments?: import('./demoTimeline').DemoSegment[];
  cardAdjustments?: { x: number; y: number; scale: number }[];
};
export const MOTION_DURATION = 30;
export const motionChapters = [
  { time: 0, label: 'Search reveal' },
  { time: 4.5, label: 'Website overview' },
  { time: 10, label: 'Floating UI stickers' },
  { time: 16, label: 'Feature close-up' },
  { time: 21, label: 'Moving feature ribbons' },
  { time: 25.5, label: 'Shutter & end card' },
];
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (n: number) => {
  const p = clamp(n);
  return p * p * p * (p * (p * 6 - 15) + 10);
};
export function motionPointerAt(t: number, data: WebsiteDemo) {
  const count = Math.min(3, Math.max(1, data.sections.length)),
    w = count === 1 ? 390 : 320,
    gap = 32,
    start = (1280 - (w * count + gap * (count - 1))) / 2;
  const center = (i: number) =>
    (data.motion?.cardAdjustments?.[Math.min(i, count - 1)]?.x || 0) +
    start +
    Math.min(i, count - 1) * (w + gap) +
    w / 2;
  const cy = (i: number, y: number) =>
    y + (data.motion?.cardAdjustments?.[Math.min(i, count - 1)]?.y || 0);
  const keys = [
    [0, 1060, 470],
    [1.3, 930, 320],
    [3.3, 990, 335],
    [5, 970, 130],
    [6.8, 720, 248],
    [9, 840, 460],
    [10.7, center(0), cy(0, 410)],
    [12.5, center(1), cy(1, 430)],
    [14.7, center(2), cy(2, 430)],
    [17, 835, 435],
    [18.7, 680, 350],
    [20.4, 850, 470],
    [22, 500, 330],
    [24, 925, 485],
    [26.5, 670, 475],
    [30, 670, 475],
  ];
  let i = keys.findIndex((k, j) => j < keys.length - 1 && t >= k[0] && t < keys[j + 1][0]);
  if (i < 0) i = t < 0 ? 0 : keys.length - 2;
  const from = keys[i],
    to = keys[i + 1],
    p = smooth((t - from[0]) / (to[0] - from[0]));
  return {
    x: from[1] + (to[1] - from[1]) * p,
    y: from[2] + (to[2] - from[2]) * p - Math.sin(p * Math.PI) * 18,
    click: Math.max(0, 1 - Math.abs(t - to[0]) / 0.35),
  };
}
export async function prepareMotion(data: WebsiteDemo) {
  if (data.motion)
    await prepareStoryImages({
      assets: [...data.motion.assets, ...(data.motion.designScreens || [])],
      model: 'local',
      scenes: [],
    });
}
export function renderCinematic(
  ctx: CanvasRenderingContext2D,
  time: number,
  copy: DemoCopy,
  data: WebsiteDemo,
) {
  const t = Math.max(0, Math.min(MOTION_DURATION, time)),
    paper = '#f4f3ec',
    ink = '#17201c',
    accent = /^#[0-9a-f]{6}$/i.test(data.accent) ? data.accent : '#426b57';
  const features = data.sections.length
    ? data.sections
    : [{ title: data.title, body: data.description }];
  const assets = data.motion?.assets || [];
  const domain = data.sourceType ? copy.brand || data.brand : new URL(data.url).hostname;
  ctx.save();
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 1280, 720);
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    r = 22,
    shadow = false,
  ) => {
    ctx.save();
    if (shadow) {
      ctx.shadowColor = '#14271f24';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 16;
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  };
  const words = (
    value: string,
    x: number,
    y: number,
    width: number,
    size: number,
    color = ink,
    weight = 600,
    maxLines = 3,
    align: CanvasTextAlign = 'left',
  ) => {
    ctx.font = `${weight} ${size}px Inter, system-ui, Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    let row = '',
      rows: string[] = [];
    for (const word of value.split(/\s+/)) {
      const next = (row + ' ' + word).trim();
      if (ctx.measureText(next).width > width && row) {
        rows.push(row);
        row = word;
      } else row = next;
    }
    if (row) rows.push(row);
    rows.slice(0, maxLines).forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.2, width));
    ctx.textAlign = 'left';
  };
  const label = (value: string, y = 660) =>
    words(value, 640, y, 1050, 17, '#727a70', 400, 1, 'center');
  const drawImage = (
    src: string | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    r = 20,
  ) => {
    if (!src) return false;
    const image = sourceImage(src);
    if (!image.complete || !image.naturalWidth) return false;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();
    const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight),
      dw = image.naturalWidth * scale,
      dh = image.naturalHeight * scale;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
    return true;
  };
  const sticker = (
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
    rotation = 0,
    alpha = 1,
  ) => {
    const feature = features[index % features.length];
    const adjustment = data.motion?.cardAdjustments?.[index];
    if (adjustment) {
      x += adjustment.x;
      y += adjustment.y;
      const scale = adjustment.scale;
      x -= (w * (scale - 1)) / 2;
      y -= (h * (scale - 1)) / 2;
      w *= scale;
      h *= scale;
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotation);
    ctx.translate(-w / 2, -h / 2);
    box(0, 0, w, h, '#ffffff', 24, true);
    const asset = data.motion?.catalog.find((a) => a.label === feature.title);
    const src = asset ? assets[Math.round(asset.value * (assets.length - 1))] : undefined;
    if (!drawImage(src, 0, 0, w, h, 24)) {
      box(26, 28, 54, 54, accent, 16);
      words(String(index + 1).padStart(2, '0'), 38, 43, 36, 23, '#fff');
      words(feature.title, 28, 112, w - 56, 29, ink, 650, 2);
      words(feature.body || data.description, 28, 198, w - 56, 20, '#657168', 400, 4);
    }
    ctx.restore();
  };
  const scene = (index: number, local: number) => {
    if (index === 0) {
      const p = smooth(local / 0.9),
        scale = 0.92 + 0.08 * p;
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.translate(640, 330);
      ctx.scale(scale, scale);
      ctx.translate(-640, -330);
      box(270, 278, 740, 90, '#fff', 45, true);
      ctx.strokeStyle = '#859187';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(313, 320, 9, 0, Math.PI * 2);
      ctx.moveTo(319, 327);
      ctx.lineTo(326, 334);
      ctx.stroke();
      const text = domain.slice(0, Math.ceil(domain.length * smooth((local - 0.5) / 1.5)));
      words(text, 350, 309, 595, 29, ink, 500, 1);
      ctx.restore();
      label(copy.brand || data.brand, 411);
    }
    if (index === 1) {
      const p = smooth(local / 1),
        z = 0.94 + 0.06 * p + 0.025 * smooth((local - 1) / 3);
      ctx.save();
      ctx.translate(640, 348 + (1 - p) * 50);
      ctx.scale(z, z);
      ctx.rotate((1 - p) * -0.018);
      ctx.translate(-640, -348);
      box(215, 48, 850, 590, '#fff', 22, true);
      box(215, 48, 850, 34, '#ffffff', 22);
      ['#e9aca2', '#e8d6a0', '#bdd1b0'].forEach((c, i) => box(235 + i * 19, 61, 9, 9, c, 5));
      words(domain, 640, 60, 500, 12, '#8a9289', 400, 1, 'center');
      drawImage(assets[0], 225, 84, 830, 544, 10);
      ctx.restore();
      label('A closer look at ' + (copy.brand || data.brand), 672);
    }
    if (index === 2) {
      words(copy.brand || data.brand, 640, 61, 1000, 20, accent, 600, 1, 'center');
      words('Explore what’s inside', 640, 101, 1100, 44, ink, 650, 1, 'center');
      const count = Math.min(3, features.length),
        w = count === 1 ? 390 : 320,
        gap = 32,
        start = (1280 - (w * count + gap * (count - 1))) / 2;
      for (let i = 0; i < count; i++) {
        const p = smooth((local - i * 0.22) / 1.05),
          float = Math.sin((local + i) * 1.3) * 4;
        sticker(
          i,
          start + i * (w + gap),
          220 + (1 - p) * 100 + float,
          w,
          320,
          (i - (count - 1) / 2) * 0.035 * p,
          p,
        );
      }
      label(
        features
          .slice(0, count)
          .map((f) => f.title)
          .join('  ·  '),
        622,
      );
    }
    if (index === 3) {
      const p = smooth(local / 1.1),
        z = 0.9 + 0.1 * p + 0.06 * smooth((local - 1.1) / 3);
      const f = features[0];
      ctx.save();
      ctx.translate(640, 348);
      ctx.scale(z, z);
      ctx.translate(-640, -348);
      sticker(0, 380, 135, 520, 410, -0.012 * (1 - p), p);
      ctx.restore();
      label(f.title + ' · ' + domain, 608);
    }
    if (index === 4) {
      words(copy.brand || data.brand, 640, 106, 1000, 36, ink, 650, 1, 'center');
      const titles = features.map((f) => f.title);
      const ribbon = (
        y: number,
        rotation: number,
        fill: string,
        color: string,
        direction: number,
      ) => {
        ctx.save();
        ctx.translate(640, y);
        ctx.rotate(rotation);
        box(-850, -33, 1700, 66, fill, 0, true);
        ctx.beginPath();
        ctx.rect(-850, -33, 1700, 66);
        ctx.clip();
        const text = titles.join('   ✦   ') + '   ✦   ';
        ctx.font = '600 24px Inter, system-ui, Arial';
        const width = Math.max(600, ctx.measureText(text).width),
          offset = (local * 55 * direction) % width;
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        for (let i = -2; i < 3; i++) ctx.fillText(text, i * width + offset, 0);
        ctx.restore();
      };
      ribbon(330, -0.075, ink, '#fff', -1);
      ribbon(485, 0.05, '#fff', ink, 1);
      label(domain, 635);
    }
    if (index === 5) {
      const p = smooth(local / 1),
        headline = copy.brand || data.brand;
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.translate(0, (1 - p) * 28);
      words(
        headline,
        640,
        205,
        1080,
        Math.min(78, Math.max(42, 950 / (headline.length * 0.57))),
        ink,
        700,
        2,
        'center',
      );
      words(copy.query || data.title, 640, 320, 950, 27, '#727a70', 400, 2, 'center');
      const cta = copy.headline || data.cta;
      box(440, 435, 400, 70, ink, 35, true);
      words(cta, 640, 455, 352, 24, '#fff', 600, 1, 'center');
      words(domain, 640, 565, 950, 19, '#727a70', 400, 1, 'center');
      ctx.restore();
    }
  };
  let index = motionChapters.findIndex(
    (chapter, i) =>
      t >= chapter.time && (i === motionChapters.length - 1 || t < motionChapters[i + 1].time),
  );
  if (index < 0) index = 5;
  const local = t - motionChapters[index].time;
  if (index > 0 && local < 0.75) {
    ctx.save();
    ctx.globalAlpha = 1 - smooth(local / 0.75);
    scene(index - 1, motionChapters[index].time - motionChapters[index - 1].time - 0.2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = smooth(local / 0.75);
    scene(index, local);
    ctx.restore();
  } else scene(index, local);
  // Groq's plan supplies contextual annotations; these are generated overlays,
  // while the cards underneath remain the real source imagery.
  const plan =
    (
      data as WebsiteDemo & {
        aiPlan?: {
          start: number;
          end: number;
          focusX: number;
          focusY: number;
          sticker: string;
          caption: string;
        }[];
      }
    ).aiPlan || [];
  for (const item of plan) {
    if (t < item.start || t > item.end || item.sticker === 'none') continue;
    const p =
      smooth(Math.min(1, (t - item.start) / 0.35)) * smooth(Math.min(1, (item.end - t) / 0.35));
    const x = Math.max(60, Math.min(1220, item.focusX * 12.8)),
      y = Math.max(70, Math.min(650, item.focusY * 7.2));
    ctx.save();
    ctx.globalAlpha *= p;
    ctx.strokeStyle = '#667e42';
    ctx.fillStyle = '#667e42';
    ctx.lineWidth = 5;
    ctx.setLineDash(item.sticker === 'highlight-ring' ? [12, 8] : []);
    if (item.sticker === 'highlight-ring' || item.sticker === 'click-ripple') {
      ctx.beginPath();
      ctx.arc(x, y, 48 + (1 - p) * 22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.sticker === 'ping-pong-ball') {
      ctx.fillStyle = '#fffaf0';
      ctx.shadowColor = '#263b3540';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, 34 + 10 * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ef765d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 34 + 10 * p, Math.PI * 0.15, Math.PI * 1.1);
      ctx.stroke();
    } else if (item.sticker === 'sparkle') {
      ctx.fillStyle = '#f0b84c';
      ctx.beginPath();
      ctx.moveTo(x, y - 34);
      ctx.lineTo(x + 10, y - 10);
      ctx.lineTo(x + 34, y);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x, y + 34);
      ctx.lineTo(x - 10, y + 10);
      ctx.lineTo(x - 34, y);
      ctx.lineTo(x - 10, y - 10);
      ctx.closePath();
      ctx.fill();
    } else if (item.sticker === 'ribbon') {
      ctx.fillStyle = '#a56de2';
      ctx.beginPath();
      ctx.roundRect(x - 100, y - 20, 200, 40, 20);
      ctx.fill();
    } else if (item.sticker === 'badge') {
      ctx.fillStyle = '#5b8def';
      ctx.beginPath();
      ctx.roundRect(x - 70, y - 24, 140, 48, 24);
      ctx.fill();
    } else if (item.sticker === 'starburst') {
      ctx.fillStyle = '#f0b84c';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          r = i % 2 ? 28 : 58;
        const px = x + Math.cos(a) * r,
          py = y + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (item.sticker === 'orbit') {
      ctx.strokeStyle = '#8b73d6';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(x, y, 76, 28, 0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ef765d';
      ctx.beginPath();
      ctx.arc(x + 60, y - 15, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.sticker === 'confetti') {
      ctx.fillStyle = '#ef765d';
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7;
        ctx.save();
        ctx.translate(x + Math.cos(a) * 45, y + Math.sin(a) * 45);
        ctx.rotate(a);
        ctx.fillRect(-4, -14, 8, 28);
        ctx.restore();
      }
    } else if (item.sticker === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(x - 80, y - 65);
      ctx.lineTo(x - 10, y - 10);
      ctx.lineTo(x - 34, y - 16);
      ctx.moveTo(x - 10, y - 10);
      ctx.lineTo(x - 19, y - 34);
      ctx.stroke();
    }
    if (item.sticker.endsWith('callout') || item.sticker === 'feature-badge' || item.caption) {
      const label = item.caption || item.sticker.replaceAll('-', ' ');
      ctx.setLineDash([]);
      ctx.font = '600 18px Inter, system-ui, sans-serif';
      const w = Math.min(330, ctx.measureText(label).width + 34);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#17201c30';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(Math.min(1280 - w - 24, Math.max(24, x + 34)), Math.max(24, y - 58), w, 42, 21);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#33412f';
      ctx.fillText(label, Math.min(1280 - w - 7, Math.max(41, x + 51)), Math.max(50, y - 31));
    }
    ctx.restore();
  }
  // Segmented shutters cover scene changes; the content underneath stays independently editable.
  for (const boundary of [4.5, 10, 16, 25.5]) {
    const distance = t - boundary;
    if (Math.abs(distance) < 0.48) {
      const coverage =
        distance < 0 ? smooth((distance + 0.48) / 0.48) : 1 - smooth(distance / 0.48);
      for (let i = 0; i < 8; i++) {
        const width = 160;
        ctx.fillStyle = i % 2 ? '#e9e8df' : '#eeede5';
        if (boundary === 25.5) ctx.fillRect(i * width, 0, width, 720 * coverage);
        else ctx.fillRect(i * width + (width * (1 - coverage)) / 2, 0, width * coverage, 720);
      }
    }
  }
  if (copy.pointer !== 'none') {
    const point = motionPointerAt(t, data);
    if (point.click > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(65,91,73,${point.click * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 9 + (1 - point.click) * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    paintCursor(ctx, point.x, point.y, copy.size, copy.pointer);
  }
  ctx.restore();
}
