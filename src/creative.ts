import { sourceImage } from './storyboard';
export type CreativeKey = {
  time: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};
export type CreativeElement = {
  kind: 'rect' | 'ellipse' | 'path' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  fontSize: number;
  text: string;
  path: string;
  asset: number;
};
export type CreativeComponent = {
  id: string;
  name: string;
  keyframes: CreativeKey[];
  elements: CreativeElement[];
};
export type CreativeAnimation = {
  version: 1;
  model?: string;
  scenes: {
    title: string;
    duration: number;
    background: string;
    components: CreativeComponent[];
  }[];
};
export const creativeDuration = (p: CreativeAnimation) =>
  p.scenes.reduce((n, s) => n + s.duration, 0);
export function creativeChapters(p: CreativeAnimation) {
  let time = 0;
  return p.scenes.map((s) => {
    const c = { time, label: s.title };
    time += s.duration;
    return c;
  });
}
export function creativeFrame(p: CreativeAnimation, t: number) {
  let offset = 0;
  for (const [i, scene] of p.scenes.entries()) {
    if (t < offset + scene.duration || i === p.scenes.length - 1)
      return { scene, time: Math.max(0, Math.min(scene.duration, t - offset)) };
    offset += scene.duration;
  }
  throw Error('No creative scenes');
}
export function componentPose(c: CreativeComponent, t: number) {
  const keys = c.keyframes;
  let a = keys[0];
  for (const b of keys.slice(1)) {
    if (t <= b.time) {
      let p = Math.max(0, Math.min(1, (t - a.time) / (b.time - a.time)));
      p = p * p * (3 - 2 * p);
      const mix = (key: keyof CreativeKey) => a[key] + (b[key] - a[key]) * p;
      return {
        x: mix('x'),
        y: mix('y'),
        scale: mix('scale'),
        rotation: mix('rotation'),
        opacity: mix('opacity'),
      };
    }
    a = b;
  }
  return a;
}
function textLines(e: CreativeElement) {
  const lines: string[] = [];
  let row = '';
  const limit = Math.max(1, Math.floor(e.width / (e.fontSize * 0.57)));
  for (const word of e.text.split(/\s+/)) {
    if ((row + ' ' + word).trim().length > limit && row) {
      lines.push(row);
      row = word;
    } else row = (row + ' ' + word).trim();
  }
  if (row) lines.push(row);
  return lines.slice(0, Math.max(1, Math.floor(e.height / (e.fontSize * 1.2))));
}
const pathCache = new Map<string, Path2D>();
export function renderCreative(
  ctx: CanvasRenderingContext2D,
  t: number,
  plan: CreativeAnimation,
  assets: string[] = [],
) {
  const { scene, time } = creativeFrame(plan, t);
  ctx.save();
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, 1280, 720);
  for (const c of scene.components) {
    const pose = componentPose(c, time);
    if (pose.opacity < 0.001) continue;
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate((pose.rotation * Math.PI) / 180);
    ctx.scale(pose.scale, pose.scale);
    ctx.globalAlpha = pose.opacity;
    for (const e of c.elements) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.fill;
      ctx.strokeStyle = e.stroke;
      ctx.lineWidth = e.strokeWidth;
      if (e.kind === 'text') {
        ctx.font = `600 ${e.fontSize}px system-ui`;
        ctx.textBaseline = 'top';
        textLines(e).forEach((line, i) => ctx.fillText(line, 0, i * e.fontSize * 1.2, e.width));
      } else if (e.kind === 'image') {
        const img = assets[e.asset] ? sourceImage(assets[e.asset]) : null;
        if (img?.complete && img.naturalWidth) {
          const scale = Math.min(e.width / img.naturalWidth, e.height / img.naturalHeight);
          ctx.drawImage(
            img,
            (e.width - img.naturalWidth * scale) / 2,
            (e.height - img.naturalHeight * scale) / 2,
            img.naturalWidth * scale,
            img.naturalHeight * scale,
          );
        }
      } else {
        let path: Path2D;
        if (e.kind === 'path') {
          path = pathCache.get(e.path) || new Path2D(e.path);
          pathCache.set(e.path, path);
          if (pathCache.size > 256) pathCache.delete(pathCache.keys().next().value!);
        } else {
          path = new Path2D();
          if (e.kind === 'rect') path.roundRect(0, 0, e.width, e.height, e.radius);
          else
            path.ellipse(e.width / 2, e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
        }
        ctx.fill(path);
        if (e.strokeWidth) ctx.stroke(path);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export function creativeSVG(plan: CreativeAnimation, t: number, assets: string[] = []) {
  const { scene, time } = creativeFrame(plan, t);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${scene.background}"/>` +
    scene.components
      .map((c) => {
        const p = componentPose(c, time);
        return (
          `<g transform="translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(${p.scale})" opacity="${p.opacity}">` +
          c.elements
            .map((e) => {
              const common = `fill="${e.fill}" stroke="${e.stroke}" stroke-width="${e.strokeWidth}"`;
              if (e.kind === 'path')
                return `<path transform="translate(${e.x} ${e.y})" d="${xml(e.path)}" ${common}/>`;
              if (e.kind === 'rect')
                return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e.radius}" ${common}/>`;
              if (e.kind === 'ellipse')
                return `<ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" ${common}/>`;
              if (e.kind === 'text')
                return `<text x="${e.x}" y="${e.y + e.fontSize}" font-family="system-ui" font-size="${e.fontSize}" ${common}>${textLines(
                  e,
                )
                  .map(
                    (line, i) =>
                      `<tspan x="${e.x}" y="${e.y + e.fontSize + i * e.fontSize * 1.2}">${xml(line)}</tspan>`,
                  )
                  .join('')}</text>`;
              const src = assets[e.asset] || '';
              return /^data:image\/(png|jpeg|webp);base64,/.test(src)
                ? `<image x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" href="${xml(src)}"/>`
                : '';
            })
            .join('') +
          '</g>'
        );
      })
      .join('') +
    '</svg>'
  );
}
