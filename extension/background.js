let session=null;
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
 if(m.type==='frame-command'&&sender.tab&&/^http:\/\/(127\.0\.0\.1|localhost):5173\//.test(sender.tab.url||'')){
 if(m.command==='hello'){respond({available:true});return}
 if(m.command==='start'){chrome.storage.session.get('target').then(async({target})=>{if(!target||target===sender.tab.id){respond({error:'Select the webpage using the extension first.'});return}session={target,owner:sender.tab.id,id:m.id};try{await chrome.tabs.sendMessage(target,{type:'frame-track',enabled:true,id:m.id});respond({active:true})}catch{session=null;respond({error:'Reload the selected webpage, then try again.'})}});return true}
 if(m.command==='stop'&&session?.owner===sender.tab.id){chrome.tabs.sendMessage(session.target,{type:'frame-track',enabled:false}).catch(()=>{});session=null;respond({active:false})}
 }
 if(m.type==='frame-sample'&&session&&sender.tab?.id===session.target&&m.id===session.id)chrome.tabs.sendMessage(session.owner,{type:'frame-sample',...m}).catch(()=>{});
});
