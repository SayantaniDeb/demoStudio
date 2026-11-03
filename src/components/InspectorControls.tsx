import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
/** Keep editing panels outside the preview/timeline's height calculation. */
export function InspectorControls({children, active = true, layout = false}: {children:ReactNode; active?:boolean; layout?:boolean}) {
  const [target,setTarget]=useState<HTMLElement|null>(null);
  useEffect(()=>{const query=window.matchMedia('(max-width: 800px)'); const sync=()=>setTarget(document.getElementById(layout&&query.matches?'mobile-layout-slot':'feature-inspector')); sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[layout]);
  return active && target ? createPortal(<div className="feature-inspector-panel">{children}</div>,target) : <>{children}</>;
}
