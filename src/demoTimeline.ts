import { motionChapters, MOTION_DURATION } from './cinematic';
import type { WebsiteDemo } from './websiteDemo';
export type DemoSegment = { id: string; start: number; end: number };
export const defaultSegments = () =>
  motionChapters.map((c, i) => ({
    id: `scene-${i}`,
    start: c.time,
    end: motionChapters[i + 1]?.time || MOTION_DURATION,
  }));
export function segments(data: WebsiteDemo) {
  return data.motion?.segments || defaultSegments();
}
export function editedDuration(data: WebsiteDemo) {
  return segments(data).reduce((n, s) => n + s.end - s.start, 0);
}
export function editedChapters(data: WebsiteDemo) {
  let time = 0;
  return segments(data).map((s, i) => {
    const label = [...motionChapters].reverse().find((c) => c.time <= s.start)?.label || 'Segment';
    const value = { time, label: `${i + 1}. ${label}` };
    time += s.end - s.start;
    return value;
  });
}
export function sourceTime(data: WebsiteDemo, time: number) {
  let elapsed = 0;
  const list = segments(data);
  for (let i = 0; i < list.length; i++) {
    const s = list[i],
      duration = s.end - s.start;
    if (time < elapsed + duration || i === list.length - 1)
      return {
        time: s.start + Math.max(0, Math.min(duration, time - elapsed)),
        index: i,
        local: Math.max(0, time - elapsed),
      };
    elapsed += duration;
  }
  return { time: 0, index: 0, local: 0 };
}
export function splitAt(data: WebsiteDemo, time: number) {
  const mapped = sourceTime(data, time),
    list = segments(data);
  const selected = list[mapped.index];
  if (mapped.time - selected.start < 0.3 || selected.end - mapped.time < 0.3) return list;
  return list.flatMap((s, i) =>
    i === mapped.index
      ? [
          { ...s, id: s.id + '-a', end: mapped.time },
          { ...s, id: s.id + '-b', start: mapped.time },
        ]
      : [s],
  );
}
export const durationOf = (list: DemoSegment[]) => list.reduce((n, s) => n + s.end - s.start, 0);
export function mapSegments(list: DemoSegment[], time: number) {
  let elapsed = 0;
  for (let i = 0; i < list.length; i++) {
    const s = list[i],
      length = s.end - s.start;
    if (time < elapsed + length || i === list.length - 1)
      return {
        time: s.start + Math.max(0, Math.min(length, time - elapsed)),
        index: i,
        local: Math.max(0, time - elapsed),
        offset: elapsed,
      };
    elapsed += length;
  }
  return { time: 0, index: 0, local: 0, offset: 0 };
}
export function splitSegments(list: DemoSegment[], time: number) {
  const m = mapSegments(list, time),
    s = list[m.index];
  if (!s || m.time - s.start < 0.25 || s.end - m.time < 0.25) return list;
  return list.flatMap((s, i) =>
    i === m.index
      ? [
          { ...s, id: s.id + 'a', end: m.time },
          { ...s, id: s.id + 'b', start: m.time },
        ]
      : [s],
  );
}
