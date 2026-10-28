export type ComponentCrop = { x: number; y: number; width: number; height: number; text?: string };
export type DemoScene = { time: number; label: string; components: ComponentCrop[] };
// Extract connected foreground regions relative to the dominant screen background.
export function findComponents(data: Uint8ClampedArray, w: number, h: number): ComponentCrop[] {
  const bins = new Map<number, number>();
  for (let i = 0; i < data.length; i += 16) {
    const key = (data[i] >> 5) * 64 + (data[i + 1] >> 5) * 8 + (data[i + 2] >> 5);
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  const bg = [...bins].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  const br = Math.floor(bg / 64) * 32 + 16,
    bgc = (Math.floor(bg / 8) % 8) * 32 + 16,
    bb = (bg % 8) * 32 + 16;
  const cw = 40,
    ch = 23;
  const mask = new Uint8Array(cw * ch);
  for (let gy = 1; gy < ch - 1; gy++)
    for (let gx = 1; gx < cw - 1; gx++) {
      let n = 0;
      for (let y = Math.floor((gy * h) / ch); y < Math.floor(((gy + 1) * h) / ch); y++)
        for (let x = Math.floor((gx * w) / cw); x < Math.floor(((gx + 1) * w) / cw); x++) {
          const i = (y * w + x) * 4;
          if (
            Math.max(
              Math.abs(data[i] - br),
              Math.abs(data[i + 1] - bgc),
              Math.abs(data[i + 2] - bb),
            ) > 65
          )
            n++;
        }
      if (n > 2) mask[gy * cw + gx] = 1;
    }
  const expanded = new Uint8Array(mask.length);
  for (let y = 1; y < ch - 1; y++)
    for (let x = 1; x < cw - 1; x++)
      if (mask[y * cw + x])
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) expanded[(y + dy) * cw + x + dx] = 1;
  const crops: ComponentCrop[] = [];
  for (let i = 0; i < expanded.length; i++) {
    if (!expanded[i]) continue;
    expanded[i] = 0;
    const queue = [i];
    let minX = cw,
      minY = ch,
      maxX = 0,
      maxY = 0,
      count = 0;
    for (let q = 0; q < queue.length; q++) {
      const p = queue[q],
        x = p % cw,
        y = Math.floor(p / cw);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      count++;
      for (const n of [p - 1, p + 1, p - cw, p + cw]) {
        if (n >= 0 && n < expanded.length && expanded[n] && Math.abs((n % cw) - x) <= 1) {
          expanded[n] = 0;
          queue.push(n);
        }
      }
    }
    if (count >= 4)
      crops.push({
        x: minX / cw,
        y: minY / ch,
        width: (maxX - minX + 1) / cw,
        height: (maxY - minY + 1) / ch,
      });
  }
  return crops.sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 6);
}
export async function generateComponents(
  url: string,
  duration: number,
  start: number,
  end: number,
  onProgress: (n: number) => void,
): Promise<DemoScene[]> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng');
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const ocrCanvas = document.createElement('canvas');
  ocrCanvas.width = 960;
  ocrCanvas.height = 540;
  const ocrCtx = ocrCanvas.getContext('2d')!;
  const v = document.createElement('video');
  v.muted = true;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  try {
    await new Promise<void>((resolve, reject) => {
      v.onloadedmetadata = () => resolve();
      v.onerror = () => reject(new Error('Video cannot be decoded.'));
      v.src = url;
    });
    const scenes: DemoScene[] = [];
    const count = Math.max(2, Math.min(10, Math.ceil((end - start) / 4)));
    for (let n = 0; n < count; n++) {
      const time = start + ((end - start) * (n + 0.25)) / count;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Component analysis timed out.')), 10000);
        v.onseeked = () => {
          clearTimeout(timeout);
          resolve();
        };
        v.currentTime = Math.min(time, duration - 0.01);
      });
      ctx.drawImage(v, 0, 0, 320, 180);
      let components = findComponents(ctx.getImageData(0, 0, 320, 180).data, 320, 180);
      ocrCtx.drawImage(v, 0, 0, 960, 540);
      const result = await worker.recognize(ocrCanvas, {}, { text: true, blocks: true });
      const textRegions = (result.data.blocks || [])
        .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
        .filter((line) => line.confidence > 65 && line.text.trim().length > 2)
        .sort(
          (a, b) =>
            (b.bbox.x1 - b.bbox.x0) * (b.bbox.y1 - b.bbox.y0) -
            (a.bbox.x1 - a.bbox.x0) * (a.bbox.y1 - a.bbox.y0),
        )
        .slice(0, 6)
        .map((line) => ({
          x: line.bbox.x0 / 960,
          y: line.bbox.y0 / 540,
          width: (line.bbox.x1 - line.bbox.x0) / 960,
          height: (line.bbox.y1 - line.bbox.y0) / 540,
          text: line.text.trim(),
        }));
      if (textRegions.length)
        components = [
          ...textRegions,
          ...components.filter((c) => c.width * c.height < 0.4).slice(0, 2),
        ];
      scenes.push({
        time,
        label: `Scene ${n + 1}`,
        components: components.length ? components : [{ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }],
      });
      onProgress(Math.round(((n + 1) / count) * 100));
    }
    return scenes;
  } finally {
    v.removeAttribute('src');
    v.load();
    await worker.terminate();
  }
}
