import type {ReactNode} from 'react';
import {Scissors} from 'lucide-react';
import './timeline.css';

/** Shared editor chrome; each studio supplies its own media and editing actions. */
export function Timeline({children,className='',label='Timeline'}:{children:ReactNode;className?:string;label?:string}) {
 return <div className={`timeline shared-timeline ${className}`} role="region" aria-label={label}>{children}</div>;
}
export function TimelineToolbar({children,hint}:{children:ReactNode;hint?:ReactNode}) {
 return <div className="timeline-toolbar shared-timeline-toolbar"><span><Scissors size={17}/> Timeline</span>{hint&&<small>{hint}</small>}<div className="timeline-tools">{children}</div></div>;
}
export function TimelineTrackLabel({children,className=''}:{children:ReactNode;className?:string}) {
 return <span className={`timeline-track-name shared-timeline-label ${className}`}>{children}</span>;
}
