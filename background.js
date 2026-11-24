'use strict';
let state,run=null,stopRequested=false,scanWindow=null;
const ready=(async()=>{const saved=(await browser.storage.local.get('keyShelf')).keyShelf;state=saved?KeyShelf.importState(saved):KeyShelf.defaults();if(!saved){state.games.push(KeyShelf.makeGame({name:'LEGO Batman: Legacy of the Dark Knight',match:'legacy of the dark knight',query:'legacy of the dark knight xbox',multipleEditions:true,editions:['standard','deluxe']}));state.lastDue=WatchSettings.due(state.settings);await persist();}await browser.alarms.create('clock',{periodInMinutes:1});})();
const persist=()=>browser.storage.local.set({keyShelf:state});
const status=()=>({state,run});
async function openDashboard(){const url=browser.runtime.getURL('dashboard.html'),tabs=await browser.tabs.query({url});if(tabs.length){await browser.tabs.update(tabs[0].id,{active:true});await browser.windows.update(tabs[0].windowId,{focused:true});}else await browser.tabs.create({url});}
async function broadcast(){try{await browser.runtime.sendMessage({type:'progress',run});}catch{}}
async function notify(title,message){try{await browser.notifications.create({type:'basic',iconUrl:browser.runtime.getURL('icon.png'),title,message});}catch(e){console.warn('Notification failed',e.message);}}
browser.notifications.onClicked.addListener(openDashboard);
async function waitTab(id,store){
 const started=Date.now();while(Date.now()-started<(store==='instant'?15000:45000)){if(stopRequested)throw Error('Stopped');const t=await browser.tabs.get(id);if(t.status==='complete')return;
  // Instant Gaming can finish its search while ads keep the tab loading.
  if(store==='instant')try{KeyShelf.validateURL(t.url,store);const [ready]=await browser.tabs.executeScript(id,{code:"document.readyState !== 'loading' && !!document.querySelector('#search-app,.search-app')"});if(ready)return;}catch{}
  await new Promise(r=>setTimeout(r,500));}throw Error('Page timed out');
}
async function readURL(url,store,detail=false,game=null){
 KeyShelf.validateURL(url,store);let tab;
 try{
  tab=await browser.tabs.create({windowId:scanWindow.id,url,active:true});await waitTab(tab.id,store);
  const current=await browser.tabs.get(tab.id);KeyShelf.validateURL(current.url,store);
  await browser.tabs.executeScript(tab.id,{file:'core.js'});await browser.tabs.executeScript(tab.id,{file:'reader.js'});
  const code='ShelfReader.collect('+JSON.stringify(store)+','+JSON.stringify(state.settings)+','+detail+','+JSON.stringify(game)+')';
  const result=await browser.tabs.executeScript(tab.id,{code});return result[0]||{error:'No result returned.'};
 }catch(e){return {error:e.message};}finally{if(tab)try{await browser.tabs.remove(tab.id);}catch{}}
}
async function backup(auto=false){
 const data=JSON.stringify(state,null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 try{const file=(auto?state.settings.backupFolder+'/':'')+'Key-Shelf-Backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';const id=await browser.downloads.download({url,filename:file,saveAs:!auto,conflictAction:'uniquify'});
  await new Promise((resolve,reject)=>{const listener=d=>{if(d.id!==id)return;if(d.state?.current==='complete'){browser.downloads.onChanged.removeListener(listener);resolve();}else if(d.state?.current==='interrupted'){browser.downloads.onChanged.removeListener(listener);reject(Error('Backup download interrupted.'));}};browser.downloads.onChanged.addListener(listener);browser.downloads.search({id}).then(rows=>{if(rows[0]?.state==='complete'){browser.downloads.onChanged.removeListener(listener);resolve();}else if(rows[0]?.state==='interrupted'){browser.downloads.onChanged.removeListener(listener);reject(Error('Backup download interrupted.'));}});});
  state.lastBackup=Date.now();await persist();return {ok:true};
 }finally{URL.revokeObjectURL(url);}
}
async function scan(gameId=null,retryOnly=false){
 await ready;if(run?.active)return {ok:false,error:'A scan is already running.'};
 stopRequested=false;const games=state.games.filter(g=>!g.paused&&(!gameId||g.id===gameId)),jobs=[];
 for(const g of games)for(const store of KeyShelf.stores)if(g.searches[store]&&(!retryOnly||state.checks[g.id+'|'+store]?.error))jobs.push({g,store,queries:KeyShelf.searchJobs(g,store)});
 run={active:true,done:0,total:jobs.length,message:'Starting scan',errors:0,started:Date.now()};await broadcast();
 let events=[],failures=[];
 try{
  if(!jobs.length){run.message='No searches to check.';return {ok:true};}
  scanWindow=await browser.windows.create({url:browser.runtime.getURL('scan.html'),type:'normal',focused:state.settings.foreground,width:1100,height:800});
  for(const {g,store,queries} of jobs){
   if(stopRequested)break;run.message=g.name+' · '+KeyShelf.names[store]+' · collecting search listings';await broadcast();
   const source=g.id+'|'+store,silent=!state.checks[g.id+'|'+store]?.initialized,found=new Map(),queryErrors=[];
   let complete=true,limited=false;
   for(const [index,query] of queries.entries()){
    if(stopRequested)break;run.message=g.name+' · '+KeyShelf.names[store]+' · search '+(index+1)+' / '+queries.length+' · '+query.editions.join(' / ');await broadcast();
    const r=await readURL(query.url,store,false,g);
    if(r.error||r.warning){queryErrors.push(query.editions.join(' / ')+': '+(r.error||r.warning));complete=false;}
    if(!r.complete)complete=false;if(r.limited)limited=true;
    for(const o of r.offers||[])found.set(KeyShelf.canonical(o.url)+'|'+(o.sellerKey||'product'),o);
   }
   const result={offers:[...found.values()],complete,limited,warning:queryErrors.join('; '),error:!found.size&&queryErrors.length?queryErrors.join('; '):undefined};
   result.silent=silent;
   if(stopRequested)break;
   events.push(...KeyShelf.applySnapshot(state,g,source,result));
   if(result.error||result.warning){run.errors++;failures.push(g.name+' / '+KeyShelf.names[store]+': '+(result.error||result.warning));}
   // Search results identify product pages; seller snapshots identify the actual offer.
   if(!result.error&&['eneba','gamivo'].includes(store)&&(state.settings.deepSellers||store==='gamivo')){
    const {discovered,unavailable}=KeyShelf.sellerPlan(state,g,store,result);
    for(const product of unavailable)events.push(...KeyShelf.markProductUnavailable(state,g,store,product,silent));
    run.skippedUnavailable=(run.skippedUnavailable||0)+unavailable.size;
    let index=0;for(const [product,o] of discovered){
     if(stopRequested)break;run.message=g.name+' · '+KeyShelf.names[store]+' · seller offers '+(++index)+' / '+discovered.size;await broadcast();
     const detailSource=source+'|'+product,r=await readURL(product,store,true,g);r.silent=silent;if(stopRequested)break;
     events.push(...KeyShelf.applySnapshot(state,g,detailSource,r));
     if(r.error||r.warning){run.errors++;failures.push(g.name+' / '+KeyShelf.names[store]+' seller page: '+(r.error||r.warning));state.checks[source].error='Seller page needs attention: '+(r.error||r.warning);(state.checks[source].sellerFailures||=[]).push({url:product,title:o.title,error:r.error||r.warning});}
     await persist();
    }
   }
   run.done++;await persist();await broadcast();
  }
  state.lastRun=Date.now();await persist();
  // A stock-loss event may occur before later stores refresh: resolve its replacement using the finished scan.
  for(const e of events.filter(e=>e.type==='lowest-out')){const g=state.games.find(g=>g.id===e.gameId),next=g&&KeyShelf.candidates(state,g,e.edition,undefined,e.listingType||'key')[0];e.price=next?KeyShelf.amount(state,next):null;e.nextTitle=next?.title;e.nextSeller=next?.seller;e.nextStore=next?.store;}
  await persist();
  if(state.settings.notifications){
   const alertEvents=events.filter(e=>e.type==='drop'?state.settings.notifyDrops:e.type==='new-low'?state.settings.notifyNew:state.settings.notifyStock);
   if(alertEvents.length){const message=alertEvents.slice(0,5).map(e=>e.game+' ('+e.edition+' · '+(e.listingType==='account'?'Accounts':'Keys')+'): '+(e.type==='lowest-out'?'cheapest out of stock; next '+(e.price===null?'none available':KeyShelf.money(e.price,e.currency)+' at '+KeyShelf.names[e.nextStore]):KeyShelf.money(e.old,e.currency)+' → '+KeyShelf.money(e.price,e.currency))).join('\n');await notify('Key Shelf · '+alertEvents.length+' changes',message+(alertEvents.length>5?'\nOpen Key Shelf for more.':''));}
   if(failures.length&&state.settings.notifyFailures)await notify('Key Shelf · checks need attention',failures.slice(0,3).join('\n'));
  }
 }catch(e){run.errors++;run.message=e.message;}
 finally{
  if(scanWindow)try{await browser.windows.remove(scanWindow.id);}catch{}scanWindow=null;
  run.active=false;run.message=stopRequested?'Stopped — collected results saved.':'Finished '+run.done+' / '+run.total+' store checks · '+events.length+' changes · '+run.errors+' checks need attention'+(run.skippedUnavailable?' · '+run.skippedUnavailable+' unavailable product pages skipped':'');await broadcast();
 }
 return {ok:true};
}
async function clock(){
 await ready;if(run?.active)return;
 const due=WatchSettings.due(state.settings);if(due&&due!==state.lastDue){state.lastDue=due;await persist();await scan();}
 if(state.settings.autoBackup&&Date.now()-(state.lastBackup||0)>(state.settings.backupFrequency==='weekly'?7:1)*86400000)try{await backup(true);}catch(e){if(state.settings.notifyFailures)await notify('Key Shelf backup failed',e.message);}
}
browser.alarms.onAlarm.addListener(a=>{if(a.name==='clock')clock().catch(console.error);});
browser.runtime.onStartup.addListener(()=>clock().catch(console.error));
browser.runtime.onMessage.addListener((m,sender)=>{
 if(sender.url&&!sender.url.startsWith(browser.runtime.getURL('')))return undefined;
 return (async()=>{
  await ready;
  if(m.type==='state')return status();
  if(m.type==='open'){await openDashboard();return {ok:true};}
  if(m.type==='scan'){scan(m.gameId,m.retryOnly).catch(console.error);return {ok:true};}
  if(m.type==='stop'){stopRequested=true;return {ok:true};}
  if(m.type==='test'){await notify('Key Shelf test','Price-drop and stock alerts will appear here.');return {ok:true};}
  if(m.type==='backup')return backup(false);
  if(run?.active&&['saveTemplate','deleteTemplate','saveGame','deleteGame','settings','restore','ignore'].includes(m.type))throw Error('Stop the current scan before editing tracking rules.');
  if(m.type==='saveTemplate'){const t=KeyShelf.makeTemplate(m.template),i=state.templates.findIndex(x=>x.id===t.id);if(i<0)state.templates.push(t);else state.templates[i]=t;if(m.default)state.defaultTemplate=t.id;await persist();return {ok:true};}
  if(m.type==='deleteTemplate'){if(state.templates.length<2)throw Error('Keep at least one template.');state.templates=state.templates.filter(t=>t.id!==m.id);if(state.defaultTemplate===m.id)state.defaultTemplate=state.templates[0].id;await persist();return {ok:true};}
  if(m.type==='saveGame'){const g=KeyShelf.makeGame(m.game),index=state.games.findIndex(x=>x.id===g.id);if(index<0)state.games.push(g);else state.games[index]=g;await persist();return {ok:true};}
  if(m.type==='deleteGame'){state.games=state.games.filter(g=>g.id!==m.id);for(const [id,o] of Object.entries(state.offers))if(o.gameId===m.id)delete state.offers[id];for(const k of Object.keys(state.checks))if(k.startsWith(m.id+'|'))delete state.checks[k];await persist();return {ok:true};}
  if(m.type==='ignore'){if(state.offers[m.id])state.offers[m.id].ignored=!!m.ignored;await persist();return {ok:true};}
  if(m.type==='markRead'){for(const e of state.events)e.read=true;await persist();return {ok:true};}
  if(m.type==='settings'){
   const next=KeyShelf.validateSettings({...state.settings,...m.settings}),changedStores=new Set();
   if(next.currency!==state.settings.currency)for(const store of KeyShelf.stores)changedStores.add(store);
   for(const [key,store] of [['sealPass','gameseal'],['gamivoSmart','gamivo'],['deepSellers','eneba']])if(next[key]!==state.settings[key])changedStores.add(store);
   state.settings=next;
   for(const [source,c] of Object.entries(state.checks))if(changedStores.has(source.split('|')[1]))c.initialized=false;
   for(const o of Object.values(state.offers))if(changedStores.has(o.store)){o.stale=true;o.discoveryOnly=true;}
   state.lastDue=WatchSettings.due(next);await persist();return {ok:true};
  }
  if(m.type==='restore'){state=KeyShelf.importState(m.data);await persist();return {ok:true};}
  return undefined;
 })().catch(e=>({error:e.message}));
});
ready.catch(console.error);
