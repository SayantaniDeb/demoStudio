import { useEffect, useRef } from 'react';
import { Ban } from 'lucide-react';
import { paintCursor, type CursorAppearance } from '../cursor';

export function PointerPreview({style}: {style: CursorAppearance}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 112, 88);
    ctx.save(); ctx.scale(2, 2);
    paintCursor(ctx, (style === 'arrow' || style === 'auto') ? 20 : 28, (style === 'arrow' || style === 'auto') ? 9 : style === 'hand' ? 15 : 22, 25, style);
    ctx.restore();
  }, [style]);
  return style === 'none' ? <Ban size={23} strokeWidth={1.5} /> : <canvas ref={canvas} width={112} height={88} style={{width:56,height:44}} aria-hidden="true" />;
}
