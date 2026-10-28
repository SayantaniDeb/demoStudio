import { renderCreative } from './creative';
import { motionPointerAt } from './cinematic';
import { sourceImage } from './storyboard';
import { paintCursor } from './cursor';
import type { WebsiteDemo, DemoCopy } from './websiteDemo';
export type TemplateId = 'cinematic' | 'editorial' | 'aurora' | 'ai';
export const demoTemplates = [
  {
    id: 'cinematic' as const,
    name: 'Paper & stickers',
    description: 'Search reveal → website → floating cards → close-up → ribbons → shutter',
    color: '#eef0e5',
  },
  {
    id: 'editorial' as const,
    name: 'Editorial launch',
    description: 'Bold headline → split screen → feature chapters → detail → gallery → invitation',
    color: '#f4f4f5',
  },
  {
    id: 'aurora' as const,
    name: 'Aurora showcase',
    description:
      'Glow reveal → browser stage → orbiting cards → spotlight → stacked gallery → finale',
    color: '#18181b',
  },
  {
    id: 'ai' as const,
    name: 'AI-created components',
    description:
      'Groq creates original vector shapes, custom layouts and animated component groups',
    color: '#d8f3a7',
  },
];
export function templateChapters(id: TemplateId) {
  const labels =
    id === 'editorial'
      ? [
          'Opening headline',
          'Split-screen tour',
          'Feature chapters',
          'Detail spotlight',
          'Screen gallery',
          'Closing invitation',
        ]
      : id === 'aurora'
        ? [
            'Glow reveal',
            'Browser stage',
            'Orbiting features',
            'Spotlight',
            'Stacked gallery',
            'Finale',
          ]
        : [
            'Search reveal',
            'Website overview',
            'Floating UI stickers',
            'Feature close-up',
            'Moving feature ribbons',
            'Shutter & end card',
          ];
  return [0, 4.5, 10, 16, 21, 25.5].map((time, i) => ({ time, label: labels[i] }));
}
const ease = (n: number) => {
  const p = Math.max(0, Math.min(1, n));
  return p * p * (3 - 2 * p);
};
export function renderTemplate(
  ctx: CanvasRenderingContext2D,
  time: number,
  copy: DemoCopy,
  data: WebsiteDemo,
  id: TemplateId,
) {
  if (id === 'ai') {
    if (data.creative) renderCreative(ctx, time, data.creative, data.motion?.assets);
    else {
      ctx.clearRect(0, 0, 1280, 720);
      ctx.fillStyle = '#f4f5f0';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#34452c';
      ctx.font = '500 28px system-ui';
      ctx.fillText('Generate custom AI components to begin', 100, 350);
    }
    return;
  }
  const paper = id === 'cinematic',
    dark = id === 'aurora',
    bg = dark ? '#18181b' : paper ? '#eef0e5' : '#f4f4f5',
    ink = dark ? '#fafafa' : '#18181b',
    muted = dark ? '#a1a1aa' : '#71717a',
    accent = '#b8d568',
    chapters = templateChapters(id),
    t = Math.max(0, Math.min(30, time));
  let index = chapters.findIndex((c, i) => t >= c.time && (i === 5 || t < chapters[i + 1].time));
  if (index < 0) index = 0;
  const local = t - chapters[index].time,
    p = ease(local / 0.9),
    features = data.sections.length
      ? data.sections
      : [{ title: data.title, body: data.description }],
    assets = [...(data.motion?.designScreens || []), ...(data.motion?.assets || [])];
  ctx.save();
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 720);
  if (dark) {
    const glow = ctx.createRadialGradient(940, 180, 0, 940, 180, 750);
    glow.addColorStop(0, '#b8d56818');
    glow.addColorStop(1, '#b8d56800');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.strokeStyle = '#ffffff08';
    for (let x = 0; x < 1280; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
  }
  const text = (
    value: string,
    x: number,
    y: number,
    width: number,
    size: number,
    color = ink,
    maxLines = 3,
  ) => {
    ctx.font = `600 ${size}px Geist, system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    let row = '',
      lines: string[] = [];
    for (const word of value.split(/\s+/)) {
      if (ctx.measureText((row + ' ' + word).trim()).width > width && row) {
        lines.push(row);
        row = word;
      } else row = (row + ' ' + word).trim();
    }
    if (row) lines.push(row);
    lines
      .slice(0, maxLines)
      .forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.12, width));
  };
  const card = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill = dark ? '#27272a' : '#ffffff',
    radius = 12,
  ) => {
    ctx.save();
    ctx.shadowColor = dark ? '#18181b88' : '#18181b20';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.restore();
  };
  const screen = (n: number, x: number, y: number, w: number, h: number) => {
    card(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.clip();
    ctx.fillStyle = dark ? '#323236' : '#e4e4e7';
    ctx.fillRect(x, y, w, 34);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 0 ? accent : muted;
      ctx.beginPath();
      ctx.arc(x + 18 + i * 13, y + 17, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    let host = copy.brand || data.brand;
    try {
      if (data.url) host = new URL(data.url).hostname;
    } catch {
      /* Source may be an uploaded image. */
    }
    ctx.font = '400 12px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = muted;
    ctx.fillText(host, x + 72, y + 17, w - 90);
    const src =
        assets[((n % Math.max(1, assets.length)) + assets.length) % Math.max(1, assets.length)],
      image = src ? sourceImage(src) : null;
    if (image?.complete && image.naturalWidth) {
      const scale = Math.min((w - 20) / image.naturalWidth, (h - 54) / image.naturalHeight),
        iw = image.naturalWidth * scale,
        ih = image.naturalHeight * scale;
      ctx.drawImage(image, x + (w - iw) / 2, y + 34 + (h - 34 - ih) / 2, iw, ih);
    } else {
      text(copy.brand || data.brand, x + 25, y + 60, w - 50, 28);
      text(copy.query || data.title, x + 25, y + 115, w - 50, 22, muted);
    }
    ctx.restore();
  };
  const feature = (n: number, x: number, y: number, w: number, h: number) => {
    const f = features[n % features.length];
    card(x, y, w, h);
    text(String(n + 1).padStart(2, '0'), x + 24, y + 22, w - 48, 18, muted, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 24, y + 55, 36, 4);
    text(f.title, x + 24, y + 82, w - 48, 30, ink, 2);
    text(f.body || data.description, x + 24, y + 166, w - 48, 20, muted, 3);
  };

  text(copy.brand || data.brand, 65, 35, 900, 20, muted, 1);
  text(`${String(index + 1).padStart(2, '0')} / 06`, 1100, 35, 120, 18, muted, 1);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(0, (1 - p) * 35);
  if (index === 0) {
    if (paper) {
      text('PRODUCT STORY', 70, 125, 550, 18, muted, 1);
      text(copy.query || data.title, 70, 180, 630, 62);
      text(copy.filename || data.description, 75, 410, 560, 23, muted, 4);
      ctx.save();
      ctx.translate(955, 340);
      ctx.rotate(-0.065);
      ctx.translate(-955, -340);
      screen(0, 760, 170, 430, 350);
      ctx.restore();
      card(810, 550, 340, 54, accent, 8);
      text(copy.headline || data.cta, 830, 566, 300, 18, ink, 1);
    } else if (dark) {
      text(copy.query || data.title, 130, 175, 1020, 66);
      card(130, 460, 560, 65, accent, 32);
      text(copy.headline || data.cta, 158, 477, 505, 23, '#18181b', 1);
    } else {
      text('Introducing', 70, 125, 500, 25, accent, 1);
      text(copy.query || data.title, 70, 180, 760, 76);
      text(copy.filename || data.description, 75, 500, 800, 24, muted, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(970, 150, 160, 360);
      text('↗', 982, 240, 140, 115, '#fff', 1);
    }
  }
  if (index === 1) {
    if (paper) {
      card(155, 120, 950, 490, '#d4d4d8');
      screen(0, 175, 100, 930, 500);
      text(copy.query || data.title, 180, 630, 900, 22, ink, 1);
    } else if (dark) {
      ctx.save();
      ctx.translate(640, 355);
      ctx.scale(0.92 + 0.08 * p, 0.92 + 0.08 * p);
      ctx.translate(-640, -355);
      screen(0, 190, 95, 900, 525);
      ctx.restore();
    } else {
      text(copy.query || data.title, 65, 155, 390, 48);
      text(copy.filename || data.description, 65, 400, 360, 22, muted, 4);
      screen(0, 510, 125, 700, 480);
    }
  }
  if (index === 2) {
    if (paper || dark) {
      screen(0, 70, 165, 680, 420);
      const float = Math.sin(local * 1.4) * 5;
      feature(0, 790, 115 + float, 405, 245);
      feature(1, 825, 390 - float, 370, 245);
    } else {
      const selected = Math.min(features.length - 1, Math.floor(local / 2));
      const f = features[selected];
      text(String(selected + 1).padStart(2, '0'), 70, 165, 230, 145, accent, 1);
      text(f.title, 350, 180, 800, 62);
      text(f.body || data.description, 355, 365, 740, 27, muted, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(70, 590, 1140 * ease(local / 6), 5);
    }
  }
  if (index === 3) {
    const f = features[0];
    if (dark) {
      screen(Math.min(2, assets.length - 1), 170, 130, 600, 435);
      text(f.title, 840, 190, 360, 43);
      text(f.body || data.description, 840, 350, 340, 22, muted, 5);
    } else {
      text(f.title, 70, 125, 1100, 52);
      screen(Math.min(2, assets.length - 1), 70, 255, 720, 370);
      text(f.body || data.description, 850, 290, 340, 25, muted, 7);
    }
  }
  if (index === 4) {
    if (paper) {
      text('IN THE DETAILS', 65, 105, 1100, 18, muted, 1);
      screen(0, 65, 185, 710, 420);
      feature(0, 825, 200, 380, 250);
      card(825, 485, 380, 100, accent, 8);
      text(features[Math.min(1, features.length - 1)].title, 850, 510, 330, 24, ink, 2);
    } else if (dark) {
      ctx.save();
      ctx.translate(640, 350);
      ctx.rotate(-0.06);
      ctx.translate(-640, -350);
      screen(1, 190, 165, 760, 430);
      ctx.restore();
      ctx.save();
      ctx.translate(640, 350);
      ctx.rotate(0.04);
      ctx.translate(-640, -350);
      screen(0, 405, 110, 700, 400);
      ctx.restore();
    } else {
      text('A closer look', 65, 105, 1100, 44);
      screen(0, 65, 210, 550, 340);
      screen(1, 655, 270, 550, 340);
    }
  }
  if (index === 5) {
    text(copy.brand || data.brand, dark ? 180 : 70, 180, 1050, 76);
    text(copy.query || data.title, dark ? 180 : 75, 310, 1000, 30, muted, 3);
    card(dark ? 180 : 75, 470, 670, 75, accent, 38);
    text(copy.headline || data.cta, dark ? 210 : 105, 492, 610, 25, '#18181b', 1);
    text(copy.brand || data.brand, dark ? 180 : 75, 600, 1060, 20, muted, 1);
  }
  ctx.restore();
  if (local < 0.55 && index > 0) {
    ctx.fillStyle = bg;
    const reveal = 1 - ease(local / 0.55);
    if (dark) {
      ctx.globalAlpha = reveal;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.globalAlpha = 1;
    } else ctx.fillRect(1280 * (1 - reveal), 0, 1280 * reveal, 720);
  }
  if (copy.pointer !== 'none') {
    const point = motionPointerAt(t, data);
    paintCursor(ctx, point.x, point.y, copy.size, copy.pointer);
  }
  ctx.restore();
}
