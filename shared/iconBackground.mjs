/** Remove only near-white pixels connected to the image boundary.
 * Enclosed white logo details are untouched. Existing alpha is retained.
 */
export function removeIconBackground(pixels, width, height) {
  if (pixels.length !== width * height * 4 || width < 1 || height < 1)
    throw Error('Invalid icon dimensions');
  const data = new Uint8ClampedArray(pixels),
    seen = new Uint8Array(width * height),
    queue = new Int32Array(width * height);
  let head = 0,
    tail = 0;
  const eligible = (i) => {
    const p = i * 4,
      r = data[p],
      g = data[p + 1],
      b = data[p + 2];
    return (
      data[p + 3] < 16 || (Math.min(r, g, b) >= 195 && Math.max(r, g, b) - Math.min(r, g, b) <= 38)
    );
  };
  const push = (i) => {
    if (!seen[i] && eligible(i)) {
      seen[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++],
      x = i % width,
      y = Math.floor(i / width);
    if (x) push(i - 1);
    if (x + 1 < width) push(i + 1);
    if (y) push(i - width);
    if (y + 1 < height) push(i + width);
  }
  for (let i = 0; i < seen.length; i++)
    if (seen[i]) {
      const p = i * 4;
      if (data[p + 3] < 16) {
        data[p + 3] = 0;
        continue;
      }
      const min = Math.min(data[p], data[p + 1], data[p + 2]),
        alpha = Math.max(0, Math.min(1, (238 - min) / 43));
      if (alpha === 0) {
        data[p + 3] = 0;
        continue;
      }
      for (let c = 0; c < 3; c++)
        data[p + c] = Math.round(Math.max(0, (data[p + c] - 255 * (1 - alpha)) / alpha));
      data[p + 3] = Math.round(data[p + 3] * alpha);
    }
  // Keep a white-only logo intact rather than erasing the entire image.
  if (!data.some((v, i) => i % 4 === 3 && v > 32)) return new Uint8ClampedArray(pixels);
  return data;
}
