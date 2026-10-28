import { groqHeaders } from './aiKey';
export type Caption = { start: number; end: number; text: string };
export type CaptionStyle = 'classic' | 'pill' | 'bold' | 'highlight';
export const captionStyles = [
  { id: 'classic', name: 'Classic subtitles' },
  { id: 'pill', name: 'Soft pill' },
  { id: 'bold', name: 'Bold outline' },
  { id: 'highlight', name: 'Highlight' },
] as const;
export function captionAt(captions: Caption[], time: number) {
  return captions.find((c) => time >= c.start && time < c.end)?.text || '';
}
export function renderCaption(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: CaptionStyle = 'classic',
  bounds?: { width: number; height: number; top: number },
  placement?: { x: number; y: number; scale: number },
) {
  if (!text.trim()) return;
  ctx.save();
  const w = bounds?.width ?? ctx.canvas.width,
    h = bounds?.height ?? ctx.canvas.height,
    scale = (w / 1280) * (placement?.scale ?? 1);
  ctx.font = `${style === 'bold' ? '800' : '600'} ${30 * scale}px Arial`;
  const max = w * 0.85,
    words = text.trim().split(/\s+/),
    rows: string[] = [];
  let row = '';
  for (const word of words) {
    if (row && ctx.measureText(row + ' ' + word).width > max) {
      rows.push(row);
      row = word;
    } else row = row ? row + ' ' + word : word;
  }
  if (row) rows.push(row);
  const lines = rows.slice(0, 3),
    line = 39 * scale,
    boxW = Math.min(w * 0.92, Math.max(...lines.map((r) => ctx.measureText(r).width)) + 44 * scale),
    boxH = lines.length * line + 24 * scale,
    x = placement
      ? Math.max(0, Math.min(w - boxW, (w * placement.x) / 100 - boxW / 2))
      : (w - boxW) / 2,
    y = placement
      ? Math.max(0, Math.min(h - boxH, (h * placement.y) / 100 - boxH / 2))
      : bounds
        ? bounds.top + (h - bounds.top - boxH) / 2
        : h - 55 * scale - boxH;
  if (style !== 'bold') {
    ctx.fillStyle =
      style === 'highlight' ? '#d8eeaa' : style === 'pill' ? '#ffffffef' : '#18181bd9';
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, style === 'pill' ? 24 * scale : 8 * scale);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style === 'highlight' || style === 'pill' ? '#27272a' : '#fff';
  lines.forEach((r, i) => {
    const yy = y + 12 * scale + line * (i + 0.5);
    if (style === 'bold') {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 6 * scale;
      ctx.lineJoin = 'round';
      ctx.strokeText(r, x + boxW / 2, yy);
    }
    ctx.fillText(r, x + boxW / 2, yy);
  });
  ctx.restore();
}
function wav(buffer: AudioBuffer, start: number, end: number) {
  const first = Math.floor(start * buffer.sampleRate),
    length = Math.floor((end - start) * buffer.sampleRate),
    bytes = new ArrayBuffer(44 + length * 2),
    view = new DataView(bytes);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, length * 2, true);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++)
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[first + i] || 0)) * 32767, true);
  return bytes;
}
export async function generateCaptions(
  source: string | AudioBuffer,
  progress: (n: number) => void,
  options: { start?: number; end?: number; offset?: number } = {},
) {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded =
      typeof source === 'string'
        ? await context.decodeAudioData(await (await fetch(source)).arrayBuffer())
        : source;
  } catch {
    throw Error(
      'The selected source has no decodable audio. Choose a clip with speech or add captions manually.',
    );
  } finally {
    await context.close();
  }
  const from = Math.max(0, options.start || 0),
    to = Math.min(decoded.duration, options.end ?? decoded.duration);
  if (to <= from) throw Error('The selected audio range is empty.');
  const offline = new OfflineAudioContext(1, Math.ceil((to - from) * 16000), 16000),
    node = offline.createBufferSource();
  node.buffer = decoded;
  node.connect(offline.destination);
  node.start(0, from, to - from);
  const audio = await offline.startRendering(),
    samples = audio.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < samples.length; i += 100) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak < 0.001) throw Error('The recording is silent. Add captions manually or record speech.');
  const captions: Caption[] = [];
  for (let start = 0; start < audio.duration; start += 60) {
    const response = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav', ...groqHeaders() },
      body: wav(audio, start, Math.min(audio.duration, start + 60)),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Caption generation failed.');
    captions.push(
      ...data.segments.map((s: Caption) => ({
        ...s,
        start: s.start + start + (options.offset || 0),
        end: s.end + start + (options.offset || 0),
      })),
    );
    progress(Math.round((Math.min(audio.duration, start + 60) / audio.duration) * 100));
  }
  if (!captions.length) throw Error('No clear speech was detected.');
  return captions;
}
