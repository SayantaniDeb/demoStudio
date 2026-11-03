import {StudioSlot} from './StudioSlot';
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';

/** The time scale changes independently of the project and its media. */
export function TimelineViewport({children}: {children: ReactNode}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const topScroll = useRef<HTMLDivElement>(null);
  const topSpacer = useRef<HTMLDivElement>(null);
  const rulerViewport=useRef<HTMLDivElement>(null);
  const rulerContent=useRef<HTMLDivElement>(null);
  const items=Children.toArray(children);
  const ruler=items.find(child=>isValidElement<{className?:string}>(child)&&child.props.className?.split(' ').includes('ruler'));
  const tracks=items.filter(child=>child!==ruler);
  const scale = useRef(1);
  const [zoom, setZoom] = useState(1);
  const changeZoom = (value: number, clientX?: number) => {
    const el = viewport.current;
    if (!el || !content.current) return;
    const next = Math.max(0.25, Math.min(12, value));
    const anchor = clientX === undefined ? el.clientWidth / 2 : Math.max(0, Math.min(el.clientWidth, clientX - el.getBoundingClientRect().left));
    const label = parseFloat(getComputedStyle(el).getPropertyValue('--timeline-label-width')) || 166;
    const oldWidth = Math.max(1, el.clientWidth - label);
    const position = (el.scrollLeft + anchor - label) / (oldWidth * scale.current);
    scale.current = next;
    content.current.style.width = `${label + oldWidth * Math.max(1, next)}px`;
    content.current.style.setProperty('--timeline-clip-scale', String(Math.min(1, next)));
    el.scrollLeft = Math.max(0, label + position * oldWidth * next - anchor);
    if(topSpacer.current) topSpacer.current.style.width = `${label + oldWidth * Math.max(1,next)}px`;
    if(topScroll.current) topScroll.current.scrollLeft=el.scrollLeft;
    if(rulerContent.current) {rulerContent.current.style.width=`${label + oldWidth * Math.max(1,next)}px`;rulerContent.current.style.setProperty('--timeline-clip-scale',String(Math.min(1,next)));}
    if(rulerViewport.current)rulerViewport.current.scrollLeft=el.scrollLeft;
    setZoom(next);
  };
  useEffect(() => {
    const el = viewport.current!;
    const scrollBox = el.closest<HTMLElement>('.shared-timeline') || el;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        changeZoom(scale.current * Math.exp(-event.deltaY * 0.012), event.clientX);
        return;
      }
      const unit = event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? el.clientWidth : 1;
      const dx = event.deltaX * unit, dy = event.deltaY * unit;
      const horizontal = event.shiftKey || Math.abs(dx) > Math.abs(dy);
      if (!horizontal && scrollBox.scrollHeight > scrollBox.clientHeight + 1) {
        // Two-finger vertical scrolling moves the tracks, wherever the pointer is.
        event.preventDefault();
        scrollBox.scrollTop += dy;
      } else if (el.scrollWidth > el.clientWidth + 1) {
        event.preventDefault();
        el.scrollLeft += horizontal && dx ? dx : dy;
      }
    };
    let touchPinch: {distance:number; zoom:number} | null = null;
    const distance = (touches: TouchList) => Math.hypot(touches[1].clientX-touches[0].clientX, touches[1].clientY-touches[0].clientY);
    const touchStart = (event: TouchEvent) => {
      if(event.touches.length !== 2) return;
      event.preventDefault();
      touchPinch = {distance: Math.max(1,distance(event.touches)),zoom:scale.current};
    };
    const touchMove = (event: TouchEvent) => {
      if(event.touches.length !== 2 || !touchPinch) return;
      event.preventDefault();
      changeZoom(touchPinch.zoom * distance(event.touches)/touchPinch.distance,
        (event.touches[0].clientX+event.touches[1].clientX)/2);
    };
    const touchEnd = (event: TouchEvent) => { if(event.touches.length<2) touchPinch=null; };
    let initial = 1;
    const start = (event: Event) => { event.preventDefault(); initial = scale.current; };
    const gesture = (event: Event) => {
      event.preventDefault();
      if(touchPinch) return;
      const e = event as Event & {scale: number; clientX: number};
      changeZoom(initial * e.scale, e.clientX);
    };
    const resize = new ResizeObserver(() => changeZoom(scale.current));
    resize.observe(el);
    const toolbar=scrollBox.querySelector<HTMLElement>('.shared-timeline-toolbar');
    const toolbarResize=new ResizeObserver(()=>{if(toolbar)scrollBox.style.setProperty('--timeline-toolbar-height',`${toolbar.getBoundingClientRect().height}px`);});
    if(toolbar)toolbarResize.observe(toolbar);
    const initialScroll = requestAnimationFrame(() => {
      const primary = content.current?.querySelector('.primary-screen-track');
      if(primary) scrollBox.scrollTop = scrollBox.scrollHeight;
    });
    scrollBox.addEventListener('wheel', wheel, {passive: false});
    el.addEventListener('touchstart',touchStart,{passive:false});
    el.addEventListener('touchmove',touchMove,{passive:false});
    el.addEventListener('touchend',touchEnd);
    el.addEventListener('touchcancel',touchEnd);
    el.addEventListener('gesturestart', start, {passive: false});
    el.addEventListener('gesturechange', gesture, {passive: false});
    return () => { toolbarResize.disconnect();cancelAnimationFrame(initialScroll);el.removeEventListener('touchstart',touchStart);el.removeEventListener('touchmove',touchMove);el.removeEventListener('touchend',touchEnd);el.removeEventListener('touchcancel',touchEnd);resize.disconnect(); scrollBox.removeEventListener('wheel', wheel); el.removeEventListener('gesturestart', start); el.removeEventListener('gesturechange', gesture); };
  }, []);
  return <div className="timeline-navigation">
    <StudioSlot targetId="timeline-scale-slot" active={true}><div className="timeline-scale-controls">
      <button aria-label="Scroll timeline left" onClick={() => viewport.current?.scrollBy({left: -viewport.current.clientWidth * .7, behavior: 'smooth'})}>←</button>
      <button aria-label="Zoom timeline out" disabled={zoom <= 0.25} onClick={() => changeZoom(zoom / 1.4)}>−</button>
      <input type="range" className="timeline-zoom-slider" aria-label="Timeline zoom" min={Math.log(.25)} max={Math.log(12)} step=".02" value={Math.log(zoom)} onChange={e=>changeZoom(Math.exp(+e.target.value))}/>
      <button aria-label="Fit timeline" onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</button>
      <button aria-label="Zoom timeline in" disabled={zoom >= 12} onClick={() => changeZoom(zoom * 1.4)}>+</button>
      <span>Scroll tracks · swipe to pan · pinch to zoom</span>
      <button aria-label="Scroll timeline right" onClick={() => viewport.current?.scrollBy({left: viewport.current.clientWidth * .7, behavior: 'smooth'})}>→</button>
    </div></StudioSlot>
    <div className="timeline-sticky-navigation"><span>↑ Scroll up for features</span><div className="timeline-top-scroll" ref={topScroll} aria-label="Scroll timeline horizontally" tabIndex={0} onScroll={e=>{if(viewport.current)viewport.current.scrollLeft=e.currentTarget.scrollLeft;if(rulerViewport.current)rulerViewport.current.scrollLeft=e.currentTarget.scrollLeft;}}><div ref={topSpacer}/></div><div className="timeline-ruler-viewport" ref={rulerViewport}><div className="timeline-ruler-content" ref={rulerContent}>{ruler}</div></div></div>
    <div className="timeline-viewport" ref={viewport} onScroll={e=>{if(topScroll.current)topScroll.current.scrollLeft=e.currentTarget.scrollLeft;if(rulerViewport.current)rulerViewport.current.scrollLeft=e.currentTarget.scrollLeft;}}><div ref={content} className="timeline-zoom-content">{tracks}</div></div>
  </div>;
}
