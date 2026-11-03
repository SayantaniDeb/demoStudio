export type CursorAppearance =
  'ibeam' | 'auto' | 'arrow' | 'circle' | 'crosshair' | 'glow' | 'ring' | 'hand' | 'target' | 'none';
export type CursorSeed = { time: number; x: number; y: number; width: number };
export function paintCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  style: CursorAppearance,
) {
  if (style === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#25292e';
  ctx.lineWidth = Math.max(1.2, size / 20);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = '#11182720';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  ctx.beginPath();
  if (style === 'ibeam') {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(4, size * .16);
    const beam = () => { ctx.beginPath(); ctx.moveTo(0,-size*.45); ctx.lineTo(0,size*.45); ctx.moveTo(-size*.17,-size*.45); ctx.lineTo(size*.17,-size*.45); ctx.moveTo(-size*.17,size*.45); ctx.lineTo(size*.17,size*.45); ctx.stroke(); };
    beam(); ctx.strokeStyle = '#25312b'; ctx.lineWidth = Math.max(1.5,size*.055); beam();
  } else if (style === 'glow') {
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff';
    ctx.arc(0, 0, Math.max(3, size * 0.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#17201c22';
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 'ring' || style === 'target') {
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    if (style === 'target') {
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (style === 'hand') {
    ctx.moveTo(-size * 0.18, size * 0.6);
    ctx.lineTo(-size * 0.18, -size * 0.18);
    ctx.quadraticCurveTo(-size * 0.08, -size * 0.34, size * 0.02, -size * 0.18);
    ctx.lineTo(size * 0.02, size * 0.22);
    ctx.bezierCurveTo(size * 0.4, size * 0.05, size * 0.62, size * 0.22, size * 0.58, size * 0.46);
    ctx.lineTo(size * 0.45, size * 0.9);
    ctx.lineTo(0, size * 0.9);
    ctx.lineTo(-size * 0.42, size * 0.5);
    ctx.quadraticCurveTo(-size * 0.48, size * 0.3, -size * 0.3, size * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (style === 'circle') {
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (style === 'crosshair') {
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(0, size / 2);
    ctx.stroke();
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.035, size * 0.82);
    ctx.lineTo(size * 0.22, size * 0.64);
    ctx.lineTo(size * 0.39, size);
    ctx.lineTo(size * 0.54, size * 0.925);
    ctx.lineTo(size * 0.37, size * 0.565);
    ctx.lineTo(size * 0.63, size * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
type Pixel = { x: number; y: number; r: number; g: number; b: number; foreground?: boolean };
export class CursorReplacer {
  canvas = document.createElement('canvas');
  ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  output = document.createElement('canvas');
  outputCtx = this.output.getContext('2d')!;
  background: number[] = [];
  mask: Pixel[] = [];
  samples: Pixel[] = [];
  width = 0;
  height = 0;
  x = 0;
  y = 0;
  lastTime = -1;
  confidence = 0;
  lastStyle = '';
  lastSize = 0;
  previous?: Uint8ClampedArray;
  previousX = -1;
  previousY = -1;
  seed?: CursorSeed;
  initialized = false;
  calibrate(v: HTMLVideoElement, seed: CursorSeed) {
    this.seed = seed;
    this.canvas.width = Math.min(v.videoWidth, 960);
    this.canvas.height = Math.round((v.videoHeight * this.canvas.width) / v.videoWidth);
    this.ctx.drawImage(v, 0, 0, this.canvas.width, this.canvas.height);
    this.output.width = v.videoWidth;
    this.output.height = v.videoHeight;
    this.width = Math.max(7, Math.round((seed.width * this.canvas.width) / v.videoWidth));
    this.height = Math.round(this.width * 1.5);
    this.x = Math.max(
      0,
      Math.min(this.canvas.width - this.width, Math.round(seed.x * this.canvas.width)),
    );
    this.y = Math.max(
      0,
      Math.min(this.canvas.height - this.height, Math.round(seed.y * this.canvas.height)),
    );
    const image = this.ctx.getImageData(this.x, this.y, this.width, this.height);
    const d = image.data;
    const corners = [
      0,
      (this.width - 1) * 4,
      (this.height - 1) * this.width * 4,
      (this.width * this.height - 1) * 4,
    ];
    const background = [0, 1, 2].map((c) => corners.map((i) => d[i + c]).sort((a, b) => a - b)[2]);
    this.background = background;
    this.mask = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        if (Math.max(...background.map((b, c) => Math.abs(d[i + c] - b))) > 65)
          this.mask.push({ x, y, r: d[i], g: d[i + 1], b: d[i + 2], foreground: true });
      }
    if (this.mask.length < 5 || this.mask.length > this.width * this.height * 0.75)
      throw new Error(
        'Could not isolate the cursor. Pick its top-left tip on a clear background, or adjust original cursor size.',
      );
    const stride = Math.max(1, Math.ceil(this.mask.length / 60));
    this.samples = this.mask.filter((_, i) => i % stride === 0);
    for (let y = 0; y < this.height; y += 3)
      for (let x = 0; x < this.width; x += 3) {
        const i = (y * this.width + x) * 4;
        if (!this.mask.some((p) => p.x === x && p.y === y))
          this.samples.push({ x, y, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
    this.previous = undefined;
    this.lastTime = -1;
    this.initialized = true;
    this.confidence = 1;
  }
  render(v: HTMLVideoElement, style: CursorAppearance, size: number): HTMLCanvasElement {
    if (!this.initialized) return this.output;
    if (v.seeking || v.readyState < 2) {
      this.lastTime = -1;
      return this.output;
    }
    if (v.currentTime === this.lastTime && style === this.lastStyle && size === this.lastSize)
      return this.output;
    this.ctx.drawImage(v, 0, 0, this.canvas.width, this.canvas.height);
    const frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = frame.data,
      w = this.canvas.width,
      h = this.canvas.height;
    const score = (x: number, y: number) => {
      const corners = [
        (y * w + x) * 4,
        (y * w + x + this.width - 1) * 4,
        ((y + this.height - 1) * w + x) * 4,
        ((y + this.height - 1) * w + x + this.width - 1) * 4,
      ];
      const shift = [0, 1, 2].map((c) =>
        Math.max(
          -90,
          Math.min(
            90,
            corners.map((i) => data[i + c]).sort((a, b) => a - b)[2] - this.background[c],
          ),
        ),
      );
      let sum = 0,
        weight = 0;
      for (const p of this.samples) {
        const i = ((y + p.y) * w + x + p.x) * 4,
          k = p.foreground ? 4 : 1;
        sum +=
          k *
          (Math.abs(data[i] - Math.max(0, Math.min(255, p.r + shift[0]))) +
            Math.abs(data[i + 1] - Math.max(0, Math.min(255, p.g + shift[1]))) +
            Math.abs(data[i + 2] - Math.max(0, Math.min(255, p.b + shift[2]))));
        weight += k;
      }
      return 1 - sum / (weight * 3 * 255);
    };
    let best = -1,
      bx = this.x,
      by = this.y;
    const continuous = this.lastTime >= 0 && Math.abs(v.currentTime - this.lastTime) < 0.6;
    const refine = (cx: number, cy: number, radius: number) => {
      for (let y = Math.max(0, cy - radius); y <= Math.min(h - this.height, cy + radius); y++)
        for (let x = Math.max(0, cx - radius); x <= Math.min(w - this.width, cx + radius); x++) {
          const s = score(x, y);
          if (s > best) {
            best = s;
            bx = x;
            by = y;
          }
        }
    };
    const radius = continuous
      ? Math.max(80, Math.ceil(Math.abs(v.currentTime - this.lastTime) * 900))
      : Math.max(w, h);
    for (
      let y = Math.max(0, this.y - radius);
      y <= Math.min(h - this.height, this.y + radius);
      y += 2
    )
      for (
        let x = Math.max(0, this.x - radius);
        x <= Math.min(w - this.width, this.x + radius);
        x += 2
      ) {
        const s = score(x, y);
        if (s > best) {
          best = s;
          bx = x;
          by = y;
        }
      }
    refine(bx, by, 3);
    if (best < 0.94 && continuous) {
      // Refine several distant candidates, not only the best coarse-grid score.
      // A fast, small arrow may fall between coarse samples at its true position.
      const candidates: { x: number; y: number; s: number }[] = [];
      for (let y = 0; y <= h - this.height; y += 3)
        for (let x = 0; x <= w - this.width; x += 3) {
          const s = score(x, y);
          if (candidates.length < 8 || s > candidates[candidates.length - 1].s) {
            candidates.push({ x, y, s });
            candidates.sort((a, b) => b.s - a.s);
            candidates.length = Math.min(8, candidates.length);
          }
        }
      for (const c of candidates) refine(c.x, c.y, 3);
    }
    // Uncertain matches do not overwrite the last trusted position.
    if (best >= 0.94) {
      this.x = bx;
      this.y = by;
    }
    this.confidence = best;
    const matched = best >= 0.94;
    this.outputCtx.drawImage(v, 0, 0, this.output.width, this.output.height);
    if (matched) {
      const original = new Uint8ClampedArray(data);
      for (const p of this.mask) {
        const px = this.x + p.x,
          py = this.y + p.y,
          i = (py * w + px) * 4;
        const left = Math.max(0, this.x - 2),
          right = Math.min(w - 1, this.x + this.width + 2);
        const previousClear =
          this.previous &&
          !(
            px >= this.previousX &&
            px < this.previousX + this.width &&
            py >= this.previousY &&
            py < this.previousY + this.height
          );
        for (let c = 0; c < 3; c++) {
          const l = original[(py * w + left) * 4 + c],
            r = original[(py * w + right) * 4 + c];
          data[i + c] =
            previousClear &&
            Math.abs(this.previous![(py * w + left) * 4 + c] - l) < 18 &&
            Math.abs(this.previous![(py * w + right) * 4 + c] - r) < 18
              ? this.previous![i + c]
              : l + ((r - l) * (px - left)) / Math.max(1, right - left);
        }
      }
      this.ctx.putImageData(frame, 0, 0);
      const ratio = this.output.width / w;
      for (const p of this.mask) {
        const i = ((this.y + p.y) * w + this.x + p.x) * 4;
        this.outputCtx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
        this.outputCtx.fillRect(
          (this.x + p.x) * ratio,
          (this.y + p.y) * ratio,
          Math.ceil(ratio),
          Math.ceil(ratio),
        );
      }
      paintCursor(
        this.outputCtx,
        this.x * ratio,
        this.y * ratio,
        (size * this.output.width) / 1280,
        style,
      );
      this.previous = original;
      this.previousX = this.x;
      this.previousY = this.y;
    }
    this.lastTime = v.currentTime;
    this.lastStyle = style;
    this.lastSize = size;
    return this.output;
  }
}

export async function analyzeCursor(
  url: string,
  seed: CursorSeed,
  duration: number,
  progress: (n: number) => void,
) {
  const v = document.createElement('video');
  v.muted = true;
  v.preload = 'auto';
  const wait = (event: string, action?: () => void) =>
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Cursor analysis timed out.'));
      }, 15000);
      const cleanup = () => {
        clearTimeout(timeout);
        v.removeEventListener(event, done);
        v.removeEventListener('error', error);
      };
      const done = () => {
          cleanup();
          resolve();
        },
        error = () => {
          cleanup();
          reject(new Error('Could not decode cursor footage.'));
        };
      v.addEventListener(event, done, { once: true });
      v.addEventListener('error', error, { once: true });
      action?.();
    });
  try {
    await wait('loadedmetadata', () => {
      v.src = url;
    });
    await wait('seeked', () => {
      v.currentTime = Math.max(0.001, seed.time);
    });
    const tracker = new CursorReplacer();
    tracker.calibrate(v, seed);
    const points: import('./motion').FocusPoint[] = [];
    let lastX = seed.x * 100,
      lastY = seed.y * 100,
      lastMoved = -10;
    for (let time = 0; time < duration; time += 0.4) {
      if (Math.abs(v.currentTime - time) > 0.001)
        await wait('seeked', () => {
          v.currentTime = Math.max(0.001, time);
        });
      tracker.render(v, 'none', 28);
      const confident = tracker.confidence >= 0.94;
      const x = (tracker.x / tracker.canvas.width) * 100,
        y = (tracker.y / tracker.canvas.height) * 100;
      if (confident && Math.hypot(x - lastX, y - lastY) > 1) {
        lastMoved = time;
        lastX = x;
        lastY = y;
      }
      points.push({
        time,
        x: lastX,
        y: lastY,
        strength: confident && time - lastMoved < 1.2 ? 1 : 0,
      });
      progress(Math.round((time / duration) * 100));
    }
    points.push({ time: duration, x: lastX, y: lastY, strength: 0 });
    progress(100);
    return points;
  } finally {
    v.removeAttribute('src');
    v.load();
  }
}
