import {captionStyles,captionFonts,captionAppearance,type CaptionStyle,type CaptionAppearance} from '../captions';
import './captionDesign.css';
export function CaptionDesignControls({style,appearance,onStyle,onChange,disabled,showStyles=true}:{style:CaptionStyle;appearance:CaptionAppearance;onStyle:(style:CaptionStyle)=>void;onChange:(value:CaptionAppearance)=>void;disabled?:boolean;showStyles?:boolean}){
 const design=captionAppearance(style,appearance);
 const update=<K extends keyof CaptionAppearance>(key:K,value:CaptionAppearance[K])=>onChange({...appearance,[key]:value});
 return <fieldset className="caption-design-controls" disabled={disabled}><legend>Caption appearance</legend>
  {showStyles&&<label>Style<select aria-label="Caption style" value={style} onChange={e=>onStyle(e.target.value as CaptionStyle)}>{captionStyles.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
  <label>Font<select aria-label="Caption font" value={appearance.font||'arial'} onChange={e=>update('font',e.target.value as keyof typeof captionFonts)}>{Object.entries(captionFonts).map(([id,font])=><option key={id} value={id}>{font.name}</option>)}</select></label>
  <div className="caption-design-pair"><label>Weight<select aria-label="Caption font weight" value={design.weight} onChange={e=>update('weight',e.target.value as CaptionAppearance['weight'])}><option value="400">Regular</option><option value="600">Semibold</option><option value="800">Bold</option></select></label><label>Text colour<input aria-label="Caption text colour" type="color" value={design.color} onChange={e=>update('color',e.target.value)}/></label></div>
  <label>Font size · {design.size}px<input aria-label="Caption font size" type="range" min="16" max="64" value={design.size} onChange={e=>update('size',+e.target.value)}/></label>
  <label className="caption-design-check"><input aria-label="Italic captions" type="checkbox" checked={design.italic} onChange={e=>update('italic',e.target.checked)}/>Italic</label>
  <label className="caption-design-check"><input aria-label="Caption background" type="checkbox" checked={design.background} onChange={e=>update('background',e.target.checked)}/>Show background</label>
  {design.background&&<><label>Background colour<input aria-label="Caption background colour" type="color" value={design.backgroundColor} onChange={e=>update('backgroundColor',e.target.value)}/></label><label>Background opacity · {Math.round(design.backgroundOpacity*100)}%<input aria-label="Caption background opacity" type="range" min="0" max="100" value={design.backgroundOpacity*100} onChange={e=>update('backgroundOpacity',+e.target.value/100)}/></label></>}
  <small>Appearance applies to the video preview and captioned-video export. SRT, VTT and TXT contain text and timing.</small>
 </fieldset>;
}
