import {viewAt,type FocusPoint} from './motion';
export type FileZoomPath={id:string;points:FocusPoint[];zoom:number};
export function multipleZoomView(paths:FileZoomPath[],time:number){
 let weight=0,x=0,y=0,amount=0;
 for(const path of paths){const view=viewAt(path.points,time,true,path.zoom,50,50),w=Math.max(0,view.zoom-1);weight+=w;x+=view.x*w;y+=view.y*w;amount=Math.max(amount,w);}
 return {zoom:1+amount,x:weight?x/weight:50,y:weight?y/weight:50};
}
