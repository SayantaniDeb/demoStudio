export type CaptionPlacement={x:number;y:number;scale:number};
export function fittedMediaRect(width:number,height:number,sourceWidth:number,sourceHeight:number){
 const scale=Math.min(width/sourceWidth,height/sourceHeight);
 return {x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2,width:sourceWidth*scale,height:sourceHeight*scale,scale};
}
export function moveCaptionPlacement(initial:CaptionPlacement,dx:number,dy:number,media:{width:number;height:number},box:{width:number;height:number}){
 const halfX=Math.min(50,box.width/media.width*50),halfY=Math.min(50,box.height/media.height*50);
 return {...initial,x:Math.max(halfX,Math.min(100-halfX,initial.x+dx/media.width*100)),y:Math.max(halfY,Math.min(100-halfY,initial.y+dy/media.height*100))};
}
export function resizeCaptionScale(initial:number,dx:number,dy:number,width:number,height:number){
 const factor=1+2*(dx*width+dy*height)/Math.max(1,width*width+height*height);
 return Math.max(.4,Math.min(3,initial*factor));
}
