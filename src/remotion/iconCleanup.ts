import {removeIconBackground} from '../../shared/iconBackground.mjs';
/** Local pixels only: no upload, model, or external background-removal service. */
export async function cleanIcon(source:string){
 if(!/^data:image\/(png|jpeg|webp);base64,/.test(source))return source;
 const bitmap=await createImageBitmap(await (await fetch(source)).blob());
 try{
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return source;
 context.drawImage(bitmap,0,0);const image=context.getImageData(0,0,canvas.width,canvas.height);
 image.data.set(removeIconBackground(image.data,canvas.width,canvas.height));context.putImageData(image,0,0);
 return canvas.toDataURL('image/png');
 }finally{bitmap.close()}
}
