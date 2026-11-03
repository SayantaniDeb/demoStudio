import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
/** Move existing controls without duplicating their state or event handlers. */
export function StudioSlot({targetId,active,children}:{targetId:string;active:boolean;children:ReactNode}){
 const [target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{
   if(!active){setTarget(null);return;}
   const sync=()=>{const next=document.getElementById(targetId);setTarget(previous=>previous===next?previous:next);};
   sync();
   const observer=new MutationObserver(sync);
   observer.observe(document.body,{childList:true,subtree:true});
   return()=>observer.disconnect();
 },[targetId,active]);
 return active&&target?createPortal(children,target):<>{children}</>;
}
