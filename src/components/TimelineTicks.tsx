import { useEffect, useRef, useState } from 'react';
export function TimelineTicks({duration}: {duration: number}) {
  const probe = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState({width: 800, scale: 1});
  useEffect(() => {
    const ruler = probe.current?.parentElement;
    if (!ruler) return;
    const content = ruler.closest('.timeline-zoom-content, .timeline-ruler-content') || ruler;
    const measure = () => setMetrics({width: ruler.clientWidth, scale: parseFloat(getComputedStyle(content).getPropertyValue('--timeline-clip-scale')) || 1});
    const resize = new ResizeObserver(measure); resize.observe(ruler);
    const changes = new MutationObserver(measure); changes.observe(content, {attributes:true,attributeFilter:['style']});
    measure(); return () => {resize.disconnect(); changes.disconnect();};
  }, []);
  const span = duration / metrics.scale;
  const desired = span / Math.max(1, metrics.width / 85);
  const steps = [.1,.2,.5,1,2,5,10,15,30,60,120,300,600,1800,3600];
  const step = steps.find(value => value >= desired) || Math.ceil(desired / 3600) * 3600;
  const minor = step / 5;
  const count = Math.min(500, Math.floor(span / minor));
  return <>
    <span ref={probe} className="timeline-tick-probe" aria-hidden="true" />
    {Array.from({length:count+1},(_,i) => {
      const t = i * minor, major = i % 5 === 0;
      const seconds = Math.floor(t + .00001);
      const label = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}${step < 1 ? '.'+Math.round((t-seconds)*10) : ''}`;
      return <span key={i} className={`timeline-time-tick ${major ? 'major' : ''}`} style={{left:`${t/span*100}%`}} aria-hidden="true">{major && <span>{label}</span>}</span>;
    })}
  </>;
}
