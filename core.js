'use strict';
const KeyShelf = (() => {
 const stores=['eneba','gameseal','gamivo','loaded','instant'];
 const names={eneba:'Eneba',gameseal:'Gameseal',gamivo:'Gamivo',loaded:'Loaded',instant:'Instant Gaming'};
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f®™]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const words=s=>norm(s).split(' ').filter(Boolean);
 const editionNames=['standard','bundle','deluxe','ultimate','premium','gold','complete','definitive','collector','special','anniversary','goty'];
 const money=(v,c='EUR')=>Number.isFinite(v)?new Intl.NumberFormat('en-IE',{style:'currency',currency:c}).format(v):'—';
 const canonical=u=>{const x=new URL(u);x.search='';x.hash='';return x.href.replace(/\/$/,'');};
 function price(text){
  const s=String(text||'').replace(/\u00a0/g,' '),m=s.match(/(?:€|EUR|£|GBP|USD|\$)\s*([\d][\d., ]*)|([\d][\d., ]*)\s*(?:€|EUR|£|GBP|USD|\$)/i);
  if(!m)return null;
  let n=(m[1]||m[2]).trim().replace(/ /g,'');const dot=n.lastIndexOf('.'),comma=n.lastIndexOf(',');
  if(dot>=0&&comma>=0){const dec=dot>comma?'.':',';n=n.replace(dec==='.'?/,/g:/\./g,'').replace(',','.');}
  else if(comma>=0)n=/,\d{1,2}$/.test(n)?n.replace(',','.'):n.replace(/,/g,'');
  else if(dot>=0&&!/\.\d{1,2}$/.test(n))n=n.replace(/\./g,'');
  const v=Number(n);return Number.isFinite(v)&&v>=0?v:null;
 }
 const currency=s=>/€|\bEUR\b/i.test(s)?'EUR':/£|\bGBP\b/i.test(s)?'GBP':/\$|\bUSD\b/i.test(s)?'USD':null;
 function bundleTitle(title){
  // Strip platform suffixes first: the X in Xbox Series X is hardware, not a game separator.
  if(/\bbundles?\b/i.test(String(title||'')))return true;
  const name=String(title||'').replace(/\(?\b(?:xbox|microsoft store|pc|steam|playstation|ps[345]|nintendo)\b.*$/i,'').trim();
  return /\bbundles?\b/i.test(name)||/\S\s+[x×+]\s+\S/i.test(name);
 }
 function edition(title){const t=norm(title);if(bundleTitle(title))return 'bundle';for(const e of ['digital deluxe','deluxe','ultimate','premium','gold','complete','definitive','collector','special','anniversary','goty'])if(new RegExp('\\b'+e+'(?: edition)?\\b').test(t))return e.replace('digital ','');return 'standard';}
 function region(text){
  const t=norm(text);if(/europe|\beu\b/.test(t))return 'Europe';if(/global|worldwide|\bww\b/.test(t))return 'Global';
  for(const [r,re] of [['United States',/united states|\bus\b/],['United Kingdom',/united kingdom|\buk\b/],['Canada',/canada/],['Australia',/australia/],['Poland',/poland/],['Japan',/japan/],['India',/india/],['Argentina',/argentina/],['Turkey',/turkey|turkiye/],['Colombia',/colombia/],['ROW',/\brow\b/]])if(re.test(t))return r;
  for(const r of ['Brazil','Germany','Hong Kong','South Africa','Taiwan','Singapore','Mexico','Russia','Spain','France','Saudi Arabia','Austria','China','Israel','Italy','New Zealand','Chile','South Korea','Ireland'])if(t.includes(r.toLowerCase()))return r;
  return 'Unknown';
 }
 // Match title tokens only: search URLs may contain the query even for unrelated products.
 function matchesTitle(g,o){const tokens=new Set(words(o.title));const required=words(g.match).filter(w=>!(w==='x'&&bundleTitle(g.match)));return required.length>0&&required.every(w=>tokens.has(w));}
 function listingType(o){return /\baccounts?\b/.test(norm(o.title+' '+new URL(o.url).pathname))?'account':'key';}
 function titleExcluded(g,o){const t=' '+norm(o.title)+' ';return (g.exclude||'').split(',').map(norm).filter(Boolean).some(x=>t.includes(' '+x+' '));}
 function selectedType(g,o){return (g.listingTypes||['key']).includes(listingType(o));}
 function eligible(g,o,settings={}){
  if(o.ignored||titleExcluded(g,o)||!selectedType(g,o))return false;
  if(g.editions?.length&&!g.editions.includes(o.edition||edition(o.title)))return false;
  const t=norm(o.title+' '+new URL(o.url).pathname+' '+(o.platform||''));
  if(!matchesTitle(g,o))return false;
  if(g.xbox&&!/xbox|microsoft store/.test(t))return false;
  if(/\bdlc\b|season pass|upgrade pack/.test(t))return false;
  
  if(!settings.allRegions&&g.regions?.length&&!g.regions.some(r=>norm(r)===norm(o.region)))return false;
  return true;
 }
 const amount=(s,o)=>Number.isFinite(o.price)?Math.round((o.price+(s.settings.fees?.[o.store]?.flat||0)+o.price*(s.settings.fees?.[o.store]?.percent||0)/100)*100)/100:null;
 const candidates=(s,g,ed,store,type='key')=>Object.values(s.offers).filter(o=>o.gameId===g.id&&o.edition===ed&&listingType(o)===type&&(!store||o.store===store)&&eligible(g,o,s.settings)&&o.stock==='in'&&o.currency===s.settings.currency&&Number.isFinite(o.price)&&!o.discoveryOnly).sort((a,b)=>amount(s,a)-amount(s,b)||a.id.localeCompare(b.id));
 const defaults=()=>({schema:1,templates:[{id:'template-1',name:'Template 1',exclude:'',regions:[],xbox:true,listingTypes:['key'],primaryEdition:'auto',multipleEditions:false,editions:[],stores:[...stores],suffix:'xbox'}],defaultTemplate:'template-1',games:[],offers:{},events:[],checks:{},settings:{...WatchSettings.defaults(),currency:'EUR',sealPass:true,allRegions:false,gamivoSmart:false,deepSellers:true,firstPageOnly:true,eventSort:'newest',notifications:true,notifyDrops:true,notifyNew:true,notifyStock:true,notifyFailures:true,threshold:0.01,foreground:false,maxPages:20,fees:{}},lastDue:null,lastRun:null,lastBackup:null});
 function makeTemplate(input){
  const t={id:input.id||crypto.randomUUID(),name:String(input.name||'').trim(),exclude:String(input.exclude||''),regions:input.regions||[],xbox:input.xbox!==false,listingTypes:input.listingTypes||['key'],primaryEdition:input.primaryEdition||'auto',multipleEditions:!!input.multipleEditions,editions:input.editions||[],stores:input.stores||[...stores],suffix:String(input.suffix??'xbox')};
  if(!t.name||!Array.isArray(t.regions)||t.regions.some(r=>typeof r!=='string')||!Array.isArray(t.listingTypes)||!t.listingTypes.length||t.listingTypes.some(x=>!['key','account'].includes(x))||!Array.isArray(t.stores)||t.stores.some(x=>!stores.includes(x))||!Array.isArray(t.editions)||t.editions.some(x=>!editionNames.includes(x))||!['auto',...editionNames].includes(t.primaryEdition))throw Error('Invalid template options.');return t;
 }
 function searchURL(store,query){const q=encodeURIComponent(query);return {eneba:'https://www.eneba.com/store/all?drms[]=xbox&text='+q,gameseal:'https://gameseal.com/search?search='+q,gamivo:'https://www.gamivo.com/search/'+q,loaded:'https://www.loaded.com/#q='+q,instant:'https://www.instant-gaming.com/en/search/?query='+q+'&type%5B%5D=Microsoft+Store'}[store];}
 function makeGame(input){
  const name=String(input.name||'').trim(),match=String(input.match||name).trim();if(!name||!match)throw Error('Enter a game name and matching words.');
  const primaryEdition=input.primaryEdition||input.editions?.[0]||edition(name),multipleEditions=input.multipleEditions??!!(input.editions?.length>1);
  const editions=multipleEditions?[...new Set(input.editions?.length?input.editions:[primaryEdition,...(primaryEdition==='deluxe'?['standard']:['deluxe'])])]:[primaryEdition];
  if(!Array.isArray(input.listingTypes||['key'])||!(input.listingTypes||['key']).length||(input.listingTypes||['key']).some(x=>!['key','account'].includes(x)))throw Error('Choose Keys, Accounts or both.');
  if(!editionNames.includes(primaryEdition)||editions.some(ed=>!editionNames.includes(ed)))throw Error('Choose a recognised edition.');
  if(!editions.includes(primaryEdition))editions.unshift(primaryEdition);
  const g={id:input.id||crypto.randomUUID(),name,match,query:String(input.query||match+' xbox').trim(),exclude:String(input.exclude||''),regions:input.regions||['Global','Europe'],xbox:input.xbox!==false,paused:!!input.paused,created:input.created||Date.now(),primaryEdition,multipleEditions,editions,listingTypes:input.listingTypes||['key'],editionQueries:{},searches:{}};
  for(const [ed,query] of Object.entries(input.editionQueries||{}))if(editionNames.includes(ed))g.editionQueries[ed]=String(query||g.query).trim();
  for(const ed of editions)g.editionQueries[ed]=String(ed===primaryEdition?g.query:input.editionQueries?.[ed]||g.query).trim();
  for(const store of stores){const custom=input.searches?.[store];g.searches[store]=custom===false?false:custom||searchURL(store,g.query);if(g.searches[store])validateURL(g.searches[store],store);}
  return g;
 }
 function queryURL(url,store,query){
  const u=new URL(validateURL(url,store));
  if(store==='gamivo')u.pathname='/search/'+encodeURIComponent(query);
  else if(store==='loaded'){const hash=new URLSearchParams(u.hash.slice(1));hash.set('q',query);u.hash=hash.toString();}
  else u.searchParams.set(store==='eneba'?'text':store==='gameseal'?'search':'query',query);
  return u.href;
 }
 function searchJobs(g,store){
  if(!g.searches[store])return [];
  const jobs=[],seen=new Set();for(const ed of g.editions){
   const query=g.editionQueries?.[ed]||g.query,url=query===g.query?g.searches[store]:queryURL(g.searches[store],store,query);
   if(seen.has(url))continue;seen.add(url);jobs.push({url,query,editions:g.editions.filter(x=>(g.editionQueries?.[x]||g.query)===query)});
  }
  return jobs;
 }
 function validateURL(url,store){const u=new URL(url),host={instant:'instant-gaming.com'}[store]||store+'.com';if(u.protocol!=='https:'||!(u.hostname===host||u.hostname==='www.'+host))throw Error('Use an HTTPS '+names[store]+' URL.');return u.href;}
 function addEvent(s,type,g,o,extra={},now=Date.now()){const e={id:crypto.randomUUID(),type,gameId:g.id,game:g.name,edition:o.edition,listingType:listingType(o),store:o.store,title:o.title,offerId:o.id,time:now,read:false,...extra};s.events.unshift(e);return e;}
 // Complete snapshots replace only their own source. Missing offers need two complete scans.
 // Partial/failed snapshots never infer absence or overwrite prices with unknown values.
 function applySnapshot(s,g,source,result,now=Date.now()){
  if(result.error){s.checks[source]={...s.checks[source],time:now,error:result.error,complete:false};for(const o of Object.values(s.offers))if(o.source===source)o.stale=true;return [];}
  const group=o=>o.edition+'|'+listingType(o),before=new Map();for(const ed of g.editions)for(const type of ['key','account']){const best=candidates(s,g,ed,undefined,type)[0];before.set(ed+'|'+type,best&&{...best});}
  const events=[],seen=new Set(),baseline=result.silent===true||(!s.checks[source]?.initialized&&!Object.values(s.checks).some(c=>c.initialized&&c.gameId===g.id));
  for(const raw of result.offers){
   if(!matchesTitle(g,raw)||titleExcluded(g,raw))continue;
   const id=g.id+'|'+raw.store+'|'+canonical(raw.url)+'|'+(raw.sellerKey||'product');seen.add(id);const old=s.offers[id];
   const o={...old,...raw,id,gameId:g.id,source,edition:edition(raw.title),region:raw.region||region(raw.title+' '+raw.url),firstSeen:old?.firstSeen||now,lastSeen:now,misses:0,ignored:old?.ignored||false,discoveryOnly:!!raw.discoveryOnly};
   if(raw.stock==='unknown'&&old){o.price=old.price;o.currency=old.currency;o.stock=old.stock;o.stale=true;o.discoveryOnly=old.discoveryOnly;}else o.stale=false;
   o.history=old?.history||[];
   if(!old||old.price!==o.price||old.stock!==o.stock){o.history.push({time:now,price:o.price,currency:o.currency,stock:o.stock,basis:o.basis});o.history=o.history.slice(-250);}
   s.offers[id]=o;
   if(!baseline&&eligible(g,o,s.settings)&&o.stock==='in'&&o.currency===s.settings.currency&&!o.discoveryOnly){
    if(old?.currency===o.currency&&Number.isFinite(old.price)&&Number.isFinite(o.price)&&old.price-o.price>=Math.max(0.001,s.settings.threshold))events.push(addEvent(s,'drop',g,o,{old:amount(s,old),price:amount(s,o),currency:o.currency},now));
    else if(!old&&before.get(group(o))&&amount(s,o)<amount(s,before.get(group(o))))events.push(addEvent(s,'new-low',g,o,{old:amount(s,before.get(group(o))),price:amount(s,o),currency:o.currency},now));
   }
  }
  for(const o of Object.values(s.offers))if(o.source===source&&o.gameId===g.id&&!seen.has(o.id)&&o.stock!=='out'&&eligible({...g,regions:[]},o)){
   o.stale=true;if(result.complete){o.misses=(o.misses||0)+1;if(o.misses>=2||result.stockOut){o.stock='out';o.history.push({time:now,price:o.price,currency:o.currency,stock:'out',basis:o.basis});}}
  }
  for(const [key,old] of before)if(old&&s.offers[old.id]?.stock==='out'){
   const next=candidates(s,g,old.edition,undefined,listingType(old))[0];events.push(addEvent(s,'lowest-out',g,old,{old:amount(s,old),price:next?amount(s,next):null,nextTitle:next?.title,nextSeller:next?.seller,nextStore:next?.store,currency:s.settings.currency},now));
  }
  s.checks[source]={limited:!!result.limited,time:now,gameId:g.id,complete:!!result.complete,initialized:true,count:seen.size,error:result.warning||''};
  return events;
 }
 function validateSettings(input){
  const schedule=WatchSettings.validate(input);const s={...input,...schedule};
  if(!['EUR','GBP','USD'].includes(s.currency))throw Error('Choose EUR, GBP or USD.');
  for(const k of ['sealPass','allRegions','gamivoSmart','deepSellers','firstPageOnly','notifications','notifyDrops','notifyNew','notifyStock','notifyFailures','foreground'])if(typeof s[k]!=='boolean')throw Error('Invalid '+k);
  if(!['newest','oldest','drop','price','az','za'].includes(s.eventSort||'newest'))throw Error('Invalid change sort.');
  if(!Number.isFinite(s.threshold)||s.threshold<0)throw Error('Invalid alert threshold.');
  if(!Number.isInteger(s.maxPages)||s.maxPages<1||s.maxPages>100)throw Error('Page limit must be 1–100.');
  for(const store of stores){const f=s.fees?.[store]||{flat:0,percent:0};if(!Number.isFinite(f.flat)||f.flat<0||!Number.isFinite(f.percent)||f.percent<0||f.percent>100)throw Error('Invalid fee for '+names[store]);}
  return s;
 }
 function importState(data){
  if(data?.schema!==1||!Array.isArray(data.games)||typeof data.offers!=='object'||!data.offers||!Array.isArray(data.events))throw Error('This is not a Key Shelf backup.');
  const s={...defaults(),...data};s.settings=validateSettings({...defaults().settings,...data.settings});s.games=data.games.map(makeGame);s.templates=(data.templates||defaults().templates).map(makeTemplate);if(!s.templates.length)s.templates=defaults().templates;if(!s.templates.some(t=>t.id===s.defaultTemplate))s.defaultTemplate=s.templates[0].id;
  for(const o of Object.values(s.offers)){if(!stores.includes(o.store)||!s.games.some(g=>g.id===o.gameId))throw Error('Invalid offer in backup.');validateURL(o.url,o.store);o.edition=edition(o.title);if(!matchesTitle(s.games.find(g=>g.id===o.gameId),o))delete s.offers[o.id];}
  for(const [source,check] of Object.entries(s.checks))if(check.initialized)check.count=Object.values(s.offers).filter(o=>o.source===source).length;
  return s;
 }
 // Plan visits from the current search first, then recheck only still-active known pages
 // missing from that search. Explicitly unavailable and wholly unavailable historical
 // products never cause seller-page visits; the search will rediscover restocks.
 function sellerPlan(s,g,store,result){
  const discovered=new Map(),unavailable=new Set();
  for(const o of result.offers||[]){if(!eligible({...g,regions:[]},o))continue;const url=canonical(o.url);if(o.stock==='out')unavailable.add(url);else discovered.set(url,o);}
  if(!s.settings.firstPageOnly)for(const o of Object.values(s.offers))if(o.gameId===g.id&&o.store===store&&o.sellerKey&&o.stock!=='out'){
   const url=canonical(o.url);if(!unavailable.has(url)&&!discovered.has(url)&&eligible({...g,regions:[]},o))discovered.set(url,o);
  }
  return {discovered,unavailable};
 }
 function markProductUnavailable(s,g,store,url,silent=false){
  const source=g.id+'|'+store+'|'+canonical(url),offers=Object.values(s.offers).filter(o=>o.gameId===g.id&&o.store===store&&o.sellerKey&&canonical(o.url)===canonical(url)).map(o=>({...o,stock:'out'}));
  if(!offers.length)return [];
  // Explicit search stock evidence applies to every seller for that product.
  return applySnapshot(s,g,source,{offers,complete:false,silent});
 }
 return {stores,names,editionNames,norm,price,currency,bundleTitle,edition,region,money,canonical,titleExcluded,selectedType,makeTemplate,matchesTitle,listingType,eligible,amount,candidates,defaults,searchURL,queryURL,searchJobs,makeGame,validateURL,applySnapshot,validateSettings,importState,sellerPlan,markProductUnavailable};
})();
if(typeof module!=='undefined')module.exports=KeyShelf;
