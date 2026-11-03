import type { ReactNode } from 'react';
import './timeline.css';

/** Shared editor chrome; each studio supplies its own media and editing actions. */
export function Timeline({
  children,
  className = '',
  label = 'Timeline',
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`timeline shared-timeline ${className}`} role="region" aria-label={label}>
      {children}
    </div>
  );
}
export function TimelineToolbar({ children, hint, playback }: { children: ReactNode; hint?: ReactNode;playback?:ReactNode }) {
  return (
    <div className="timeline-toolbar shared-timeline-toolbar">
      {playback}
      {hint && <small>{hint}</small>}
      <div className="timeline-tools">{children}</div>
      {playback&&<div id="timeline-scale-slot"/>}
    </div>
  );
}
export function TimelineTrackLabel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`timeline-track-name shared-timeline-label ${className}`}>{children}</span>
  );
}
