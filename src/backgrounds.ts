export const backgroundPresets = [
  { id: 'aurora', name: 'Aurora', colors: ['#082f49', '#2dd4bf', '#818cf8'], angle: 135 },
  { id: 'sunset', name: 'Sunset', colors: ['#4c1d95', '#fb7185', '#fbbf24'], angle: 120 },
  { id: 'ocean', name: 'Ocean', colors: ['#0c4a6e', '#38bdf8', '#a5f3fc'], angle: 140 },
  { id: 'lavender', name: 'Lavender', colors: ['#ddd6fe', '#a78bfa', '#fbcfe8'], angle: 135 },
  { id: 'midnight', name: 'Midnight', colors: ['#020617', '#1e3a8a', '#7c3aed'], angle: 145 },
  { id: 'peach', name: 'Peach', colors: ['#fed7aa', '#fda4af', '#e9d5ff'], angle: 110 },
  {
    id: 'sonoma',
    name: 'Sonoma hills',
    colors: ['#064e3b', '#65a30d', '#d9f99d'],
    angle: 125,
    wallpaper: true,
  },
  {
    id: 'ventura',
    name: 'Ventura glow',
    colors: ['#4c1d95', '#dc2626', '#fb923c'],
    angle: 130,
    wallpaper: true,
  },
  {
    id: 'monterey',
    name: 'Monterey waves',
    colors: ['#312e81', '#a21caf', '#f0abfc'],
    angle: 145,
    wallpaper: true,
  },
  {
    id: 'big-sur',
    name: 'Coastal cliffs',
    colors: ['#075985', '#38bdf8', '#f97316'],
    angle: 120,
    wallpaper: true,
  },
  {
    id: 'sequoia',
    name: 'Forest light',
    colors: ['#052e16', '#15803d', '#a3e635'],
    angle: 155,
    wallpaper: true,
  },
  {
    id: 'dusk',
    name: 'Desert dusk',
    colors: ['#431407', '#c2410c', '#fde68a'],
    angle: 125,
    wallpaper: true,
  },
];
export function backgroundCss(color: string, preset?: string) {
  const p = backgroundPresets.find((p) => p.id === preset);
  if (!p) return color;
  return p.wallpaper
    ? `radial-gradient(ellipse at 10% 110%, ${p.colors[0]} 10%, transparent 65%), linear-gradient(${p.angle}deg, ${p.colors.join(',')})`
    : `linear-gradient(${p.angle}deg, ${p.colors.join(',')})`;
}
export function paintCanvasBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  preset?: string,
) {
  const p = backgroundPresets.find((p) => p.id === preset);
  if (!p) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const radians = (p.angle * Math.PI) / 180,
    dx = (Math.sin(radians) * w) / 2,
    dy = (-Math.cos(radians) * h) / 2,
    g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
  p.colors.forEach((c, i) => g.addColorStop(i / (p.colors.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (p.wallpaper) {
    const glow = ctx.createRadialGradient(
      w * 0.1,
      h * 1.1,
      0,
      w * 0.1,
      h * 1.1,
      Math.max(w, h) * 0.85,
    );
    glow.addColorStop(0, p.colors[0]);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
}
