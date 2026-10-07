export type CaptureCursorStatus='hidden'|'visible'|'unconfirmed';
export async function configureCaptureCursor(track:MediaStreamTrack):Promise<CaptureCursorStatus>{
 // Apply again after the user selects a source: capture implementations may
 // ignore the initial hint or report different settings on the chosen surface.
 try{await track.applyConstraints({cursor:'never'} as MediaTrackConstraints)}catch{/* Inspect actual settings instead of assuming the request succeeded. */}
 const cursor=(track.getSettings() as MediaTrackSettings&{cursor?:string}).cursor;
 return cursor==='never'?'hidden':cursor==='always'||cursor==='motion'?'visible':'unconfirmed';
}
