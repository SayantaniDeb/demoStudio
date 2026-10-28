import type { ReactNode } from 'react';
import {
  Monitor,
  Camera,
  ZoomIn,
  Type,
  Music2,
  MousePointer2,
  Layers,
  Scissors,
  Trash2,
} from 'lucide-react';
import { Timeline, TimelineToolbar, TimelineTrackLabel } from './Timeline';
import './empty-studio.css';
export function EmptyStudioTimeline({
  website = false,
  onStart,
  onMusic,
  onCaption,
  tools,
}: {
  website?: boolean;
  onStart: () => void;
  onMusic?: () => void;
  onCaption?: () => void;
  tools?: ReactNode;
}) {
  const lanes = website
    ? [
        { name: 'Scenes', icon: Monitor },
        { name: 'Cursor', icon: MousePointer2 },
        { name: 'Captions', icon: Type },
        { name: 'Music', icon: Music2 },
        { name: 'Design', icon: Layers },
      ]
    : [
        { name: 'Screen Video', icon: Monitor },
        { name: 'Camera PIP', icon: Camera },
        { name: 'Zoom', icon: ZoomIn },
        { name: 'Captions', icon: Type },
        { name: 'Music', icon: Music2 },
        { name: 'Cursor', icon: MousePointer2 },
      ];
  return (
    <Timeline className="empty-studio-timeline">
      <TimelineToolbar>
        <button className="timeline-icon" disabled>
          <Scissors size={17} />
          Split
        </button>
        <button className="timeline-icon timeline-delete" disabled>
          <Trash2 size={17} />
          Delete
        </button>
        {tools}
      </TimelineToolbar>
      <div className="empty-studio-ruler">
        {[0, 1, 2, 3].map((n) => (
          <span key={n}>00:00</span>
        ))}
      </div>
      {lanes.map((lane, i) => (
        <div className="empty-studio-track" key={lane.name}>
          <TimelineTrackLabel>
            <lane.icon size={16} />
            <strong>{lane.name}</strong>
          </TimelineTrackLabel>
          <div className="empty-studio-track-content">
            {i === 0 ? (
              <button type="button" onClick={onStart}>
                + {website ? 'Create scenes' : 'Import video'}
              </button>
            ) : !website && lane.name === 'Music' ? (
              <button type="button" onClick={onMusic}>
                + Add music
              </button>
            ) : !website && lane.name === 'Captions' ? (
              <button type="button" onClick={onCaption}>
                + Add caption
              </button>
            ) : (
              <span className="empty-studio-track-placeholder" />
            )}
          </div>
        </div>
      ))}
    </Timeline>
  );
}
