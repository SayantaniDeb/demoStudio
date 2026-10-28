const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: 'string' },
  num = { type: 'number' };
export const componentSchema = object({
  kind: {
    type: 'string',
    enum: ['card', 'text', 'button', 'input', 'badge', 'circle', 'progress', 'bars', 'image'],
  },
  text: str,
  x: num,
  y: num,
  width: num,
  height: num,
  fill: str,
  color: str,
  fontSize: num,
  radius: num,
  delay: num,
  enter: { type: 'string', enum: ['fade', 'slide', 'pop', 'typewriter'] },
  values: { type: 'array', items: num },
  binding: { type: 'string', enum: ['none', 'brand', 'headline', 'description', 'cta'] },
});
export const storyboardSchema = object({
  scenes: {
    type: 'array',
    items: object({
      title: str,
      duration: num,
      background: str,
      gradient: str,
      zoom: num,
      focusX: num,
      focusY: num,
      pointerX: num,
      pointerY: num,
      components: { type: 'array', items: componentSchema },
    }),
  },
});
export function validateStoryboard(value) {
  let field = 'structure';
  const fail = () => {
    throw new Error('Groq returned an invalid storyboard: ' + field);
  };
  const check = (v, s) => {
    if (s.type === 'object') {
      if (
        !v ||
        typeof v !== 'object' ||
        Array.isArray(v) ||
        Object.keys(v).length !== s.required.length
      )
        fail();
      for (const k of s.required) {
        if (!(k in v)) fail();
        check(v[k], s.properties[k]);
      }
    } else if (s.type === 'array') {
      if (!Array.isArray(v)) fail();
      v.forEach((x) => check(x, s.items));
    } else if (
      typeof v !== s.type ||
      (s.type === 'number' && !Number.isFinite(v)) ||
      (s.enum && !s.enum.includes(v))
    )
      fail();
  };
  check(value, storyboardSchema);
  const range = (v, a, b) => {
      if (v < a || v > b) {
        field += ` (value ${v}, allowed ${a}..${b})`;
        fail();
      }
    },
    color = (v) => {
      if (!/^#[0-9a-f]{6}$/i.test(v)) {
        field += ` (colour ${JSON.stringify(v)} must be six-digit hex, e.g. #334455; convert rgb/names to hex)`;
        fail();
      }
    };
  field = 'scene count';
  range(value.scenes.length, 3, 8);
  let total = 0;
  for (const [si, s] of value.scenes.entries()) {
    field = `scene ${si} duration`;
    if (s.title.length > 120) fail();
    range(s.duration, 3, 10);
    total += s.duration;
    color(s.background);
    color(s.gradient);
    range(s.zoom, 1, 1.3);
    range(s.focusX, 0, 1280);
    range(s.focusY, 0, 720);
    range(s.pointerX, 0, 1280);
    range(s.pointerY, 0, 720);
    range(s.components.length, 1, 24);
    for (const [ci, c] of s.components.entries()) {
      field = `scene ${si} component ${ci} geometry/font/delay/values`;
      if (c.text.length > 500) fail();
      range(c.x, 0, 1280);
      range(c.y, 0, 720);
      range(c.width, 1, 1280 - c.x);
      range(c.height, 1, 720 - c.y);
      range(c.fontSize, c.text || c.binding !== 'none' ? 12 : 0, 80);
      range(c.radius, 0, 100);
      range(c.delay, 0, s.duration - 1);
      color(c.fill);
      color(c.color);
      range(c.values.length, 0, 16);
      c.values.forEach((v) => range(v, 0, 1));
      if (['progress', 'bars', 'image'].includes(c.kind) && !c.values.length) fail();
    }
  }
  field = 'total duration';
  range(total, 12, 60);
  return value;
}

// Resolve harmless style/layout differences before strict validation. Never execute model code.
export function prepareStoryboard(value) {
  const copy = structuredClone(value);
  const hex = (v) => {
    if (typeof v !== 'string') return v;
    if (/^#[0-9a-f]{3}$/i.test(v))
      return (
        '#' +
        v
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
      );
    const rgb = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(v);
    return rgb && rgb.slice(1).every((n) => Number(n) <= 255)
      ? '#' +
          rgb
            .slice(1)
            .map((n) => Number(n).toString(16).padStart(2, '0'))
            .join('')
      : v;
  };
  if (Array.isArray(copy?.scenes))
    for (const s of copy.scenes) {
      s.background = hex(s.background);
      s.gradient = hex(s.gradient);
      if (!Array.isArray(s.components)) continue;
      for (const c of s.components) {
        c.fill = hex(c.fill);
        c.color = hex(c.color);
        if (c.fontSize === 0 && (c.text || c.binding !== 'none')) c.fontSize = 24;
        // A layer may extend beyond the page by a small amount; fit it without changing its content.
        if (
          Number.isFinite(c.x) &&
          Number.isFinite(c.width) &&
          c.x >= 0 &&
          c.x < 1280 &&
          c.width > 0 &&
          c.width <= 1280
        )
          c.width = Math.min(c.width, 1280 - c.x);
        if (
          Number.isFinite(c.y) &&
          Number.isFinite(c.height) &&
          c.y >= 0 &&
          c.y < 720 &&
          c.height > 0 &&
          c.height <= 720
        )
          c.height = Math.min(c.height, 720 - c.y);
      }
    }
  return validateStoryboard(copy);
}
