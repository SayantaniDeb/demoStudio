import {renderCreative} from './creative';
import {renderCinematic,motionPointerAt} from './cinematic';
import {sourceImage} from './storyboard';
import {paintCursor} from './cursor';
import type {WebsiteDemo,DemoCopy} from './websiteDemo';
export type TemplateId='cinematic'|'editorial'|'aurora'|'ai';
export const demoTemplates=[
 {id:'cinematic' as const,name:'Paper & stickers',description:'Search reveal → website → floating cards → close-up → ribbons → shutter',color:'#eef0e5'},
 {id:'editorial' as const,name:'Editorial launch',description:'Bold headline → split screen → feature chapters → detail → gallery → invitation',color:'#f4d8c4'},
 {id:'aurora' as const,name:'Aurora showcase',description:'Glow reveal → browser stage → orbiting cards → spotlight → stacked gallery → finale',color:'#25233f'},
 {id:'ai' as const,name:'AI-created components',description:'Groq creates original vector shapes, custom layouts and animated component groups',color:'#d8f3a7'}
];
export function templateChapters(id:TemplateId){const labels=id==='editorial'?['Opening headline','Split-screen tour','Feature chapters','Detail spotlight','Screen gallery','Closing invitation']:id==='aurora'?['Glow reveal','Browser stage','Orbiting features','Spotlight','Stacked gallery','Finale']:['Search reveal','Website overview','Floating UI stickers','Feature close-up','Moving feature ribbons','Shutter & end card'];return [0,4.5,10,16,21,25.5].map((time,i)=>({time,label:labels[i]}))}
const ease=(n:number)=>{const p=Math.max(0,Math.min(1,n));return p*p*(3-2*p)};
export function renderTemplate(ctx:CanvasRenderingContext2D,time:number,copy:DemoCopy,data:WebsiteDemo,id:TemplateId){
 if(id==='ai'){if(data.creative)renderCreative(ctx,time,data.creative,data.motion?.assets);else{ctx.clearRect(0,0,1280,720);ctx.fillStyle='#f4f5f0';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#34452c';ctx.font='500 28px system-ui';ctx.fillText('Generate custom AI components to begin',100,350)}return}
 if(id==='cinematic'){renderCinematic(ctx,time,copy,data);return}
 const dark=id==='aurora',bg=dark?'#121324':'#f7ede3',ink=dark?'#f4f2ff':'#292019',muted=dark?'#aaa7c4':'#827467',accent=dark?'#a99cff':'#e77245',chapters=templateChapters(id),t=Math.max(0,Math.min(30,time));
 let index=chapters.findIndex((c,i)=>t>=c.time&&(i===5||t<chapters[i+1].time));if(index<0)index=0;
 const local=t-chapters[index].time,p=ease(local/.9),features=data.sections.length?data.sections:[{title:data.title,body:data.description}],assets=[...(data.motion?.designScreens||[]),...(data.motion?.assets||[])];
 ctx.save();ctx.clearRect(0,0,1280,720);ctx.fillStyle=bg;ctx.fillRect(0,0,1280,720);
 if(dark){const glow=ctx.createRadialGradient(940,180,0,940,180,750);glow.addColorStop(0,'#6552a855');glow.addColorStop(1,'#6552a800');ctx.fillStyle=glow;ctx.fillRect(0,0,1280,720);ctx.strokeStyle='#ffffff08';for(let x=0;x<1280;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke()}}
 const text=(value:string,x:number,y:number,width:number,size:number,color=ink,maxLines=3)=>{ctx.font=`600 ${size}px ${dark?'Inter, system-ui':'Georgia, serif'}`;ctx.fillStyle=color;ctx.textBaseline='top';let row='',lines:string[]=[];for(const word of value.split(/\s+/)){if(ctx.measureText((row+' '+word).trim()).width>width&&row){lines.push(row);row=word}else row=(row+' '+word).trim()}if(row)lines.push(row);lines.slice(0,maxLines).forEach((line,i)=>ctx.fillText(line,x,y+i*size*1.12,width))};
 const card=(x:number,y:number,w:number,h:number,fill=dark?'#25263c':'#fffaf4',radius=22)=>{ctx.save();ctx.shadowColor=dark?'#0008':'#4a2c1724';ctx.shadowBlur=32;ctx.shadowOffsetY=16;ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.fill();ctx.restore()};
 const screen=(n:number,x:number,y:number,w:number,h:number)=>{card(x,y,w,h);const src=assets[n%Math.max(1,assets.length)],image=src?sourceImage(src):null;if(image?.complete&&image.naturalWidth){const scale=Math.min((w-20)/image.naturalWidth,(h-20)/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;ctx.save();ctx.beginPath();ctx.roundRect(x+10,y+10,w-20,h-20,14);ctx.clip();ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore()}else{text(copy.brand||data.brand,x+25,y+30,w-50,28);text(copy.query||data.title,x+25,y+100,w-50,22,muted)}};
 text(copy.brand||data.brand,65,35,900,20,muted,1);text(`${String(index+1).padStart(2,'0')} / 06`,1100,35,120,18,muted,1);
 ctx.save();ctx.globalAlpha=p;ctx.translate(0,(1-p)*35);
 if(index===0){if(dark){text(copy.query||data.title,130,175,1020,66);card(130,460,560,65,'#a99cff',32);text(copy.headline||data.cta,158,477,505,23,'#19182b',1)}else {text('Introducing',70,125,500,25,accent,1);text(copy.query||data.title,70,180,760,76);text(copy.filename||data.description,75,500,800,24,muted,3);ctx.fillStyle=accent;ctx.fillRect(970,150,160,360);text('↗',982,240,140,115,'#fff',1)}}
 if(index===1){if(dark){ctx.save();ctx.translate(640,355);ctx.scale(.92+.08*p,.92+.08*p);ctx.translate(-640,-355);screen(0,190,95,900,525);ctx.restore()}else {text(copy.query||data.title,65,155,390,48);text(copy.filename||data.description,65,400,360,22,muted,4);screen(0,510,125,700,480)}}
 if(index===2){if(dark){const count=Math.min(3,features.length);for(let i=0;i<count;i++){const x=105+i*365,y=210+Math.sin(local+i)*12;card(x,y,340,330);text(`0${i+1}`,x+25,y+25,270,25,accent,1);text(features[i].title,x+25,y+95,290,33);text(features[i].body||data.description,x+25,y+205,290,20,muted,4)}}else {const selected=Math.min(features.length-1,Math.floor(local/2));const f=features[selected];text(String(selected+1).padStart(2,'0'),70,165,230,145,accent,1);text(f.title,350,180,800,62);text(f.body||data.description,355,365,740,27,muted,5);ctx.fillStyle=accent;ctx.fillRect(70,590,1140*ease(local/6),5)}}
 if(index===3){const f=features[0];if(dark){screen(Math.min(2,assets.length-1),170,130,600,435);text(f.title,840,190,360,43);text(f.body||data.description,840,350,340,22,muted,5)}else {text(f.title,70,125,1100,52);screen(Math.min(2,assets.length-1),70,255,720,370);text(f.body||data.description,850,290,340,25,muted,7)}}
 if(index===4){if(dark){ctx.save();ctx.translate(640,350);ctx.rotate(-.06);ctx.translate(-640,-350);screen(1,190,165,760,430);ctx.restore();ctx.save();ctx.translate(640,350);ctx.rotate(.04);ctx.translate(-640,-350);screen(0,405,110,700,400);ctx.restore()}else {text('A closer look',65,105,1100,44);screen(0,65,210,550,340);screen(1,655,270,550,340)}}
 if(index===5){text(copy.brand||data.brand,dark?180:70,180,1050,76);text(copy.query||data.title,dark?180:75,310,1000,30,muted,3);card(dark?180:75,470,670,75,accent,38);text(copy.headline||data.cta,dark?210:105,492,610,25,dark?'#17162c':'#fff',1);text((data.sourceType?(copy.brand||data.brand):new URL(data.url).hostname),dark?180:75,600,1060,20,muted,1)}
 ctx.restore();
 if(local<.55&&index>0){ctx.fillStyle=bg;const reveal=1-ease(local/.55);if(dark){ctx.globalAlpha=reveal;ctx.fillRect(0,0,1280,720);ctx.globalAlpha=1}else ctx.fillRect(1280*(1-reveal),0,1280*reveal,720)}
 if(copy.pointer!=='none'){const point=motionPointerAt(t,data);paintCursor(ctx,point.x,point.y,copy.size,copy.pointer)}ctx.restore();
}
