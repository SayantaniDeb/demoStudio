/** Split segments append a/b to their parent id; inherit its zoom until overridden. */
export function timelineZoom(id:string|undefined,clips:Record<string,number>|undefined,fallback:number){
 if(!clips)return {amount:fallback,custom:false};
 let key=id||'';while(key){if(Object.prototype.hasOwnProperty.call(clips,key))return {amount:Math.max(1,Math.min(4,clips[key])),custom:true};key=key.slice(0,-1)}
 return {amount:1,custom:false};
}
