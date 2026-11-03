export type LayoutRect = {x: number; y: number; width: number; height: number};
export function placeCamera(screen: LayoutRect, canvas: {width: number; height: number}, size: {width: number; height: number}, position: string, outside: boolean, portrait: boolean): LayoutRect {
  const gap = 24, inset = 16;
  let {width, height} = size;
  if (!outside) {
    const fit = Math.min(1, Math.max(1, screen.width - inset * 2) / width, Math.max(1, screen.height - inset * 2) / height);
    width *= fit; height *= fit;
  }
  let x = position.endsWith('left') ? screen.x + inset : position.endsWith('center') ? screen.x + (screen.width - width) / 2 : screen.x + screen.width - width - inset;
  let y = position.startsWith('top') ? screen.y + inset : position.startsWith('bottom') ? screen.y + screen.height - height - inset : screen.y + (screen.height - height) / 2;
  if (outside) {
    if (portrait) y = position.startsWith('top') ? screen.y - gap - height : screen.y + screen.height + gap;
    else x = position.endsWith('left') ? screen.x - gap - width : screen.x + screen.width + gap;
  }
  // Keep the full camera frame inside the export canvas.
  return {x: Math.max(0, Math.min(canvas.width - width, x)), y: Math.max(0, Math.min(canvas.height - height, y)), width, height};
}

export function soloCameraRect(base: LayoutRect, canvas: {width: number; height: number}, mix: number): LayoutRect {
  const ratio = base.width / Math.max(1, base.height);
  const width = Math.min(canvas.width * 0.64, canvas.height * 0.76 * ratio);
  const height = width / ratio;
  const target = {x: (canvas.width - width) / 2, y: (canvas.height - height) / 2, width, height};
  const amount = Math.max(0, Math.min(1, mix));
  return {x: base.x + (target.x - base.x) * amount, y: base.y + (target.y - base.y) * amount,
    width: base.width + (target.width - base.width) * amount, height: base.height + (target.height - base.height) * amount};
}

export function screenMediaScale(source: {width: number; height: number}, frame: {width: number; height: number}, contain: boolean) {
  if (source.width <= 0 || source.height <= 0) return 1;
  return (contain ? Math.min : Math.max)(frame.width / source.width, frame.height / source.height);
}

/** Let zoom consume the canvas padding instead of clipping inside the inset frame. */
export function zoomedScreenBounds(frame: LayoutRect, canvas: {width:number;height:number}, zoom:number): LayoutRect {
  const scale=Math.max(1,zoom);
  const left=Math.max(0,frame.x-frame.width*(scale-1)/2);
  const top=Math.max(0,frame.y-frame.height*(scale-1)/2);
  const right=Math.min(canvas.width,frame.x+frame.width+frame.width*(scale-1)/2);
  const bottom=Math.min(canvas.height,frame.y+frame.height+frame.height*(scale-1)/2);
  return {x:left,y:top,width:right-left,height:bottom-top};
}
export function expandedMediaOffset(start:number, length:number, mediaLength:number, preferred:number) {
  return mediaLength >= length ? Math.min(start, Math.max(start+length-mediaLength,preferred)) : start+(length-mediaLength)/2;
}

export function mobileZoomPlacement(base:{x:number;y:number;scale:number}, zoom:number, focus:{x:number;y:number}) {
  const z=Math.max(1,zoom),scale=base.scale*z;
  return {scale,x:base.x-(65+1150*focus.x/100)*base.scale*(z-1),y:base.y-(50+620*focus.y/100)*base.scale*(z-1)};
}
