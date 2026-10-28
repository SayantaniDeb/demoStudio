export type PointerPoint = { time: number; x: number; y: number };
export function pointerAt(points: PointerPoint[], time: number) {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a.time - b.time);
  let a = sorted[0];
  for (const b of sorted.slice(1)) {
    if (time <= b.time) {
      const fraction = Math.max(0, Math.min(1, (time - a.time) / Math.max(0.001, b.time - a.time)));
      const p = fraction * fraction * (3 - 2 * fraction);
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
    a = b;
  }
  return { x: a.x, y: a.y };
}
