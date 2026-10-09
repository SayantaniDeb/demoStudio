import {validateCreative} from './creative.mjs';
export function buildStoryboard(value,assetCount=0,brandIconAsset=-1){
 if(!Array.isArray(value?.scenes)||value.scenes.length<2||value.scenes.length>12)throw Error('Expected two to twelve storyboard scenes.');
 const styles=['sage','ocean','sunset','violet','mono'];
 const style=styles.includes(value.style)?value.style:'sage';
 const energy=['calm','balanced','snappy'].includes(value.energy)?value.energy:'balanced';
 const seed=Number.isInteger(value.seed)?Math.abs(value.seed)%100000:0;
 const families=['search','gallery','panels','network','media','metrics','type','spotlight'];
 const preferred=value.scenes.map(s=>s.layout).filter(l=>families.includes(l));
 const rotation=seed%families.length;
 const layouts=[...new Set([...preferred,...families.slice(rotation),...families.slice(0,rotation)])];
 const base=validateCreative({scenes:value.scenes.map((s,i)=>{
 if(typeof s.headline!=='string'||!s.headline.trim()||s.headline.length>65||typeof s.caption!=='string'||s.caption.length>110||!['reveal','slide','zoom'].includes(s.motion))throw Error('Invalid storyboard scene.');
 const duration=i===0||i===value.scenes.length-1?3:4,dark=i>0&&i<value.scenes.length-1,ink=dark?'#ffffff':'#23352b';
 const el=(kind,width,height,fill,extra={})=>({kind,x:0,y:0,width,height,fill,...extra});
 const key=(time,x,y,scale=1,opacity=1,rotation=0)=>({time,x,y,scale,opacity,rotation});
 const component=(name,elements,x,y,delay=0)=>({name,elements,keyframes:[key(0,x,y+35,.94,0),key(delay+.45,x,y),key(duration-.25,x,y),key(duration,x,y-12,1,0)]});
 const components=[component('Headline',[el('text',1120,115,ink,{text:s.headline,fontSize:42})],80,65),component('Caption',[el('text',1120,75,dark?'#dce5cf':'#647352',{text:s.caption,fontSize:24})],80,175,.1)];
 if(i===0){
 components.push(component('Browser shell',[el('rect',900,350,'#ffffff',{radius:20}),el('rect',900,42,'#dce5cf',{radius:16}),...[0,1,2].map(n=>el('ellipse',10,10,'#80936a',{x:20+n*19,y:15}))],190,285,.1));
 components.push(component('Content panel',[el('rect',510,235,'#edf1e7',{radius:12}),el('text',440,90,'#23352b',{x:30,y:30,text:s.caption,fontSize:23}),el('rect',240,12,'#bfd879',{x:30,y:145,radius:6}),el('rect',350,12,'#dce5cf',{x:30,y:173,radius:6})],220,355,.3));
 components.push(component('Floating feature',[el('rect',235,210,'#bfd879',{radius:20}),el('path',100,100,'#536643',{x:65,y:38,path:'M 0 45 L 35 70 L 90 0 L 105 15 L 38 98 Z'}),el('text',195,55,'#23352b',{x:20,y:145,text:'Explore',fontSize:19})],780,370,.6));
 }else if(i<value.scenes.length-1){
 value.scenes.slice(Math.max(0,i-1),Math.max(0,i-1)+3).forEach((scene,n)=>{const card=component('Feature card '+(n+1),[el('rect',330,270,n===1?'#bfd879':'#ffffff',{radius:22}),el('ellipse',56,56,'#dce5cf',{x:28,y:28}),el('text',45,45,'#23352b',{x:43,y:36,text:String(n+1),fontSize:26}),el('text',274,130,'#23352b',{x:28,y:112,text:scene.headline,fontSize:25})],95+n*380,340,n*.22);card.keyframes.splice(2,0,key(2,95+n*380,320+n*8,1,1,n===1?-2:2));components.push(card)});
 }else{
 components.push(component('Action stage',[el('rect',860,340,'#20302c',{radius:25}),el('text',740,100,'#ffffff',{x:60,y:45,text:s.caption,fontSize:28})],210,280,.1));
 const button=component('Action button',[el('rect',360,76,'#bfd879',{radius:38}),el('text',275,55,'#23352b',{x:36,y:15,text:'Explore',fontSize:28}),el('path',35,35,'#23352b',{x:295,y:22,path:'M 0 12 L 24 12 L 15 3 L 19 0 L 35 16 L 19 32 L 15 29 L 24 20 L 0 20 Z'})],460,470,.3);button.keyframes.splice(2,0,key(1.7,460,470,.94));components.push(button);
 const cursor=component('Animated cursor',[el('path',40,55,'#ffffff',{stroke:'#536643',strokeWidth:3,path:'M 0 0 L 10 48 L 20 33 L 35 48 L 43 40 L 28 25 L 47 20 Z'})],930,620);cursor.keyframes=[key(0,980,650,1,0),key(.6,900,590),key(1.6,740,510),key(1.8,740,510,.8),key(2,740,510),key(3,740,510,1,0)];components.push(cursor);
 }
 if(Number.isInteger(brandIconAsset)&&brandIconAsset>=0&&brandIconAsset<assetCount){components.push(component('Website icon',[el('image',72,72,'#ffffff',{asset:brandIconAsset})],1120,40,.1))}
 // A persistent illustrated timeline mirrors the homepage tour, with its own playhead.
 const trackY=660;
 components.push(component('Timeline',[0,1,2].map(n=>el('rect',340,16,n===i?'#bfd879':'#93a782',{x:n*360,radius:5})),100,trackY,.05));
 const playhead=component('Timeline playhead',[el('rect',3,38,dark?'#ffffff':'#536643')],100,trackY-11);
 playhead.keyframes=[key(0,100,trackY-11,1,0),key(.15,100,trackY-11),key(duration-.15,1160,trackY-11),key(duration,1160,trackY-11,1,0)];components.push(playhead);
 // Individually growing bars give panels continuous motion after their entrance.
 if(i===0){for(let n=0;n<3;n++){const bar=component('Growing content '+n,[el('rect',120,35,['#dce5cf','#bfd879','#93a782'][n],{radius:7})],250+n*145,550,.3+n*.1);bar.keyframes=[key(0,250+n*145,550,.01,0),key(.5+n*.2,250+n*145,550,.1,1),key(1.5+n*.2,250+n*145,550,1,1),key(duration,250+n*145,550,1,0)];components.push(bar)}}
 if(i===1){const connector=component('Connecting features',[el('path',1000,30,'#bfd879',{stroke:'#bfd879',strokeWidth:4,path:'M 0 0 L 760 0'})],260,630);connector.keyframes=[key(0,260,630,.01,0),key(.9,260,630,.01),key(2.8,260,630,1),key(duration,260,630,1,0)];components.push(connector)}
 return {title:s.headline,duration,background:dark?'#20302c':'#edf1e7',components};
 })});
 const targetDuration=value.durationSeconds===undefined?null:Number(value.durationSeconds);
 if(targetDuration!==null&&(![5,10,15,20,25,30].includes(targetDuration)))throw Error('Choose a duration from 5 to 30 seconds.');
 const durations=targetDuration!==null?Array(targetDuration/2.5).fill(4):value.sceneCount?Array(value.sceneCount).fill(4):[3,4,4,4,4,4,4,3];
 const scenes=durations.map((duration,index)=>{
 const briefIndex=value.scenes.length===durations.length?index:index===0?0:index===durations.length-1?value.scenes.length-1:1+(index-1)%Math.max(1,value.scenes.length-2);
 const brief=value.scenes[briefIndex];
 const source=base.scenes[briefIndex];
 const scene=structuredClone(source);scene.duration=duration;
 scene.components.forEach(c=>{c.keyframes=c.keyframes.map(k=>({...k,time:k.time/source.duration*duration}))});
 if(index===0||index===durations.length-1)return scene;
 const header=scene.components.filter(c=>['Headline','Caption','Website icon','Timeline','Timeline playhead'].includes(c.name));
 const ink='#23352b',accent='#bfd879';
 const element=(kind,x,y,width,height,fill,extra={})=>({kind,x,y,width,height,fill,...extra});
 const key=(time,x,y,scale=1,opacity=1)=>({time,x,y,scale,opacity,rotation:0});
 const add=(name,elements,x,y,delay=0)=>header.push({name,elements,keyframes:[key(0,x,y+30,.9,0),key(.35+delay,x,y),key(2.7,x,y-8),key(duration,x,y,1,0)]});
 const label=brief.headline,detail=brief.caption;
 // Each four-second beat has a different illustrated screen and independent action.
 add('Workspace', [element('rect',0,0,920,340,'#ffffff',{radius:22}),element('rect',0,0,920,35,'#dce5cf',{radius:12})],180,290);
 const layout=families.indexOf(layouts[(index-1)%layouts.length])+1;
 if(layout===1){
 add('Search field',[element('rect',0,0,800,65,'#edf1e7',{radius:15}),element('text',25,12,750,50,ink,{fontSize:25,text:detail})],240,355,.15);
 for(let n=0;n<3;n++)add('Search result '+n,[element('rect',0,0,800,40,n===1?accent:'#edf1e7',{radius:8}),element('rect',20,15,300+n*100,9,'#93a782',{radius:4})],240,440+n*52,.4+n*.2);
 }else if(layout===2){
 for(let n=0;n<4;n++){add('Gallery tile '+n,[element('rect',0,0,180,205,n%2?accent:'#dce5cf',{radius:16}),element('ellipse',50,35,80,80,'#93a782'),element('rect',25,155,130,12,ink,{radius:6})],230+n*210,370,n*.18)}
 }else if(layout===3){
 for(let n=0;n<3;n++){const x=260+n*260;add('Layered panel '+n,[element('rect',0,0,240,230,n===1?accent:'#edf1e7',{radius:18}),element('text',20,28,200,110,ink,{text:detail.split(/(?<=[.!?])\s+/)[n]||['Discover','Explore','Continue'][n],fontSize:22}),element('rect',20,175,180,12,'#93a782',{radius:5})],x,350+n*12,n*.2);header.at(-1).keyframes.splice(2,0,key(1.8,x,330+n*12,1.04))}
 }else if(layout===4){
 add('Connection paths',[element('path',0,0,760,200,'#ffffff',{stroke:'#93a782',strokeWidth:5,path:'M 0 110 L 300 110 L 500 20 M 300 110 L 500 200 M 500 20 L 740 110 L 500 200'})],260,360,.1);
 for(const [n,[x,y]] of [[260,470],[560,470],[760,380],[760,560],[1000,470]].entries())add('Connected node '+n,[element('ellipse',0,0,56,56,n===1?accent:'#dce5cf'),element('ellipse',19,19,18,18,ink)],x-28,y-28,n*.15);
 }else if(layout===5){
 add('Media canvas',[element('rect',0,0,580,250,'#edf1e7',{radius:16}),element('path',220,65,100,100,ink,{path:'M 0 0 L 0 100 L 85 50 Z'})],230,350,.1);
 for(let n=0;n<3;n++)add('Media control '+n,[element('rect',0,0,190,56,n===1?accent:'#dce5cf',{radius:12}),element('rect',20,23,150,10,'#93a782',{radius:5})],850,360+n*78,.2+n*.15);
 }else if(layout===7){
 add('Typographic statement',[element('text',0,0,790,180,ink,{text:detail,fontSize:58}),element('rect',0,190,420,12,accent,{radius:6})],245,355,.1);
 for(let n=0;n<3;n++)add('Editorial accent '+n,[element('ellipse',0,0,45,45,n===1?accent:'#93a782')],265+n*80,565,n*.16);
 }else if(layout===8){
 add('Spotlight halo',[element('ellipse',0,0,260,260,'#dce5cf'),element('ellipse',40,40,180,180,accent)],245,340,.1);
 add('Spotlight detail',[element('rect',0,0,440,230,'#edf1e7',{radius:20}),element('text',28,28,385,170,ink,{text:detail,fontSize:33})],585,365,.25);
 }else{
 add('Focus panel',[element('rect',0,0,800,230,'#edf1e7',{radius:18}),element('text',35,25,730,100,ink,{text:detail,fontSize:30})],240,365,.1);
 for(let n=0;n<3;n++){add('Activity bar '+n,[element('rect',0,0,210,32,n===1?accent:'#93a782',{radius:8})],275+n*245,530,.2);header.at(-1).keyframes=[key(0,275+n*245,530,.01,0),key(.3+n*.2,275+n*245,530,.1),key(1.4+n*.25,275+n*245,530),key(duration,275+n*245,530,1,0)]}
 }
 scene.components=header;scene.title=label;return scene;
 });
 const palettes={sage:['#edf1e7','#20302c','#23352b','#647352','#bfd879','#dce5cf','#93a782'],ocean:['#edf5fa','#142e43','#17374b','#537187','#65c7db','#d8eaf3','#7ba9c1'],sunset:['#fff5ec','#452f2b','#48312c','#8a6450','#f5b76c','#f5e1cf','#ca9672'],violet:['#f4f0fb','#2a2040','#34264a','#75628c','#c5a0f0','#e5dbf3','#a18bbd'],mono:['#f4f4f1','#222725','#242b28','#626c66','#c8d3be','#e3e7df','#919e93']};
 const original=palettes.sage,colors=palettes[style];
 const recolor=color=>colors[original.indexOf(color)]||color;
 scenes.forEach((scene,index)=>{scene.background=recolor(scene.background);scene.components.forEach((c,ci)=>{
 c.elements=c.elements.map(e=>({...e,fill:recolor(e.fill),stroke:recolor(e.stroke)}));
 if(['Timeline','Timeline playhead','User pointer','User caption'].includes(c.name))return;
 const motion=value.scenes[Math.min(index,value.scenes.length-1)].motion;
 c.keyframes=c.keyframes.map((k,ki)=>{const next={...k};if(ki===0){const target=c.keyframes[1];if(motion==='slide'){next.x=target.x+(seed%2?-100:100);next.y=target.y;next.scale=1}else if(motion==='zoom'){next.x=target.x;next.y=target.y;next.scale=.7}if(energy==='snappy')next.rotation=(ci%2?1:-1)*3;}if(ki>0&&ki<c.keyframes.length-1&&k.time<1.2)next.time=k.time*(energy==='snappy'?.7:energy==='calm'?1.15:1);return next});
 });});
 if(targetDuration!==null)scenes.forEach(scene=>{const previous=scene.duration;scene.duration=2.5;scene.components.forEach(c=>{c.keyframes=c.keyframes.map(k=>({...k,time:k.time/previous*2.5}))})});
 return validateCreative({scenes});
}

export function restyleStoryboard(plan,assetCount=0,brandIconAsset=-1,options={}){
 const valid=validateCreative(plan),styles=['sage','ocean','sunset','violet','mono'];
 const briefs=valid.scenes.map(s=>({headline:s.title.slice(0,65),caption:(s.components.find(c=>c.name==='Caption')?.elements.find(e=>e.kind==='text')?.text||'').slice(0,110),motion:'slide'}));
 const next=buildStoryboard({scenes:briefs,style:styles.includes(options.style)?options.style:styles[Math.abs(options.seed||0)%styles.length],energy:options.energy||'balanced',seed:options.seed||0,sceneCount:valid.scenes.length},assetCount,brandIconAsset);
 next.scenes=valid.scenes.map((old,index)=>{const scene=next.scenes[index];scene.title=old.title;
 scene.components=scene.components.map(c=>{const previous=old.components.find(p=>p.name===c.name);return {...c,keyframes:c.keyframes.map(k=>({...k,time:k.time/scene.duration*old.duration})),elements:c.elements.map((e,ei)=>['Headline','Caption'].includes(c.name)&&e.kind==='text'&&previous?.elements[ei]?.kind==='text'?{...e,text:previous.elements[ei].text}:e.kind==='image'&&previous?.elements[ei]?.kind==='image'?{...e,asset:previous.elements[ei].asset}:c.name==='Website icon'&&e.kind==='image'&&previous?.elements.some(e=>e.kind==='image')?{...e,asset:previous.elements.find(e=>e.kind==='image').asset}:c.name==='Headline'&&e.kind==='text'?{...e,text:old.title}:e)}});
 scene.duration=old.duration;
 scene.components.push(...old.components.filter(c=>['User pointer','User caption'].includes(c.name)));
 return scene});
 return validateCreative(next);
}
