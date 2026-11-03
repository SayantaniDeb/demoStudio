import type { DemoSegment } from './demoTimeline';
export function screenRange(segment: DemoSegment) {
  return {
    start: Math.max(segment.start, Math.min(segment.end, segment.visibleStart ?? segment.start)),
    end: Math.min(segment.end, Math.max(segment.start, segment.visibleEnd ?? segment.end)),
  };
}
export function trimScreenEdge(segment: DemoSegment, edge: 'start' | 'end', value: number): DemoSegment {
  const range = screenRange(segment), minimum = Math.min(0.25, segment.end - segment.start);
  return edge === 'start'
    ? {...segment, visibleStart: Math.max(segment.start, Math.min(range.end - minimum, value))}
    : {...segment, visibleEnd: Math.min(segment.end, Math.max(range.start + minimum, value))};
}
export function screenOpacity(segment: DemoSegment | undefined, time: number) {
  if (!segment || segment.hidden) return 0;
  const {start, end} = screenRange(segment);
  if (time < start || time >= end) return 0;
  const ramp = Math.min(0.35, (end - start) / 3);
  if (ramp <= 0) return 0;
  const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
  return smooth((time - start) / ramp) * smooth((end - time) / ramp);
}

// Work in edited timeline time so reordered clips and independent files behave alike.
export function cameraSoloMix(segments: DemoSegment[], sourceTime: number, screenEnabled: boolean, segmentIndex = 0) {
  if (!screenEnabled || !segments.length) return 1;
  let offset = 0, edited = 0;
  const intervals: {start: number; end: number}[] = [];
  let index = segmentIndex;
  const selected = segments[index];
  if (!selected || sourceTime < selected.start || sourceTime > selected.end) {
    index = segments.findIndex((segment) => sourceTime >= segment.start && sourceTime < segment.end);
    if (index < 0) index = segments.length - 1;
  }
  segments.forEach((segment, i) => {
    const range = screenRange(segment);
    if (!segment.hidden && range.end > range.start) intervals.push({start: offset + range.start - segment.start, end: offset + range.end - segment.start});
    if (i === index) edited = offset + Math.max(0, Math.min(segment.end - segment.start, sourceTime - segment.start));
    offset += segment.end - segment.start;
  });
  let solo = 0, weight = 0;
  for (let i = -24; i <= 24; i++) {
    const delta = i * 0.025, w = Math.exp(-delta * delta / (2 * 0.2 * 0.2));
    const time = Math.max(0, Math.min(offset - 0.000001, edited + delta));
    const visible = intervals.some((range) => time >= range.start && time < range.end);
    solo += (visible ? 0 : 1) * w; weight += w;
  }
  return solo / weight;
}
