const test=require('node:test');const assert=require('node:assert/strict');
global.WatchSettings=require('../schedule.js');const K=require('../core.js');
const game=()=>K.makeGame({name:'LEGO Batman: Legacy of the Dark Knight',match:'legacy of the dark knight',query:'legacy of the dark knight xbox'});
const offer=(price=40,extra={})=>({store:'eneba',title:'LEGO Batman: Legacy of the Dark Knight Xbox Series Key EUROPE',url:'https://www.eneba.com/xbox-lego-batman-europe',price,currency:'EUR',stock:'in',region:'Europe',seller:'Seller A',sellerKey:'/vendor/a',...extra});
function setup(){const s=K.defaults(),g=game();s.games=[g];return {s,g};}
test('locale price parsing does not confuse decimal commas and thousands',()=>{for(const [s,n] of [['59,99€',59.99],['€1,234.56',1234.56],['1.234,56 EUR',1234.56],['EUR 40.09',40.09],['47.99\u00a0€',47.99],['€0.00',0]])assert.equal(K.price(s),n);assert.equal(K.price('No price'),null);});
test('editions, platform, DLC and region eligibility stay separate',()=>{const g=game();assert.equal(K.edition('Dark Knight Deluxe Edition Xbox'),'deluxe');assert.equal(K.edition('Dark Knight Xbox'),'standard');assert.equal(K.eligible(g,offer()),true);assert.equal(K.eligible(g,offer(20,{region:'United States'})),false);assert.equal(K.eligible(g,offer(20,{title:'Legacy of the Dark Knight PC Steam',url:'https://www.eneba.com/steam-game'})),false);assert.equal(K.eligible(g,offer(20,{title:'Legacy of the Dark Knight Xbox DLC'})),false);assert.equal(K.eligible(g,offer(20,{title:'Legacy of the Dark Knight Xbox Account'})),false);});
test('baseline and unchanged snapshots are quiet, individual seller drops alert',()=>{const {s,g}=setup();const source=g.id+'|eneba';assert.equal(K.applySnapshot(s,g,source,{offers:[offer()],complete:true}).length,0);assert.equal(K.applySnapshot(s,g,source,{offers:[offer()],complete:true}).length,0);const e=K.applySnapshot(s,g,source,{offers:[offer(39)],complete:true});assert.equal(e[0].type,'drop');assert.equal(e[0].old,40);assert.equal(e[0].price,39);});
test('new seller alerts only if below the previous best; expensive new sellers stay quiet',()=>{const {s,g}=setup(),source=g.id+'|eneba';K.applySnapshot(s,g,source,{offers:[offer()],complete:true});let e=K.applySnapshot(s,g,source,{offers:[offer(),offer(50,{sellerKey:'/vendor/b'})],complete:true});assert.equal(e.length,0);e=K.applySnapshot(s,g,source,{offers:[offer(),offer(50,{sellerKey:'/vendor/b'}),offer(35,{sellerKey:'/vendor/c'})],complete:true});assert.equal(e[0].type,'new-low');assert.equal(e[0].price,35);});
test('new cheaper product source alerts after initial baseline',()=>{const {s,g}=setup();K.applySnapshot(s,g,'first',{offers:[offer()],complete:true});const e=K.applySnapshot(s,g,'new-product',{offers:[offer(30,{url:'https://www.eneba.com/new-product',sellerKey:'/vendor/b'})],complete:true});assert.equal(e[0].type,'new-low');});
test('initial multi-product scan stays quiet',()=>{const {s,g}=setup();K.applySnapshot(s,g,'first',{offers:[offer()],complete:true,silent:true});assert.equal(K.applySnapshot(s,g,'second',{offers:[offer(30,{url:'https://www.eneba.com/product-2'})],complete:true,silent:true}).length,0);});
test('price increases update current value without alert',()=>{const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer()],complete:true});assert.equal(K.applySnapshot(s,g,'a',{offers:[offer(45)],complete:true}).length,0);assert.equal(K.candidates(s,g,'standard')[0].price,45);});
test('seller disappearance needs two complete scans and names next lowest',()=>{const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer(),offer(42,{sellerKey:'/vendor/b',seller:'Seller B'})],complete:true});assert.equal(K.applySnapshot(s,g,'a',{offers:[offer(42,{sellerKey:'/vendor/b',seller:'Seller B'})],complete:true}).length,0);const e=K.applySnapshot(s,g,'a',{offers:[offer(42,{sellerKey:'/vendor/b',seller:'Seller B'})],complete:true});assert.equal(e[0].type,'lowest-out');assert.equal(e[0].price,42);assert.equal(e[0].nextSeller,'Seller B');assert.equal(K.applySnapshot(s,g,'a',{offers:[offer(42,{sellerKey:'/vendor/b',seller:'Seller B'})],complete:true}).length,0);});
test('explicit out of stock is immediate; no replacement is represented as null',()=>{const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer()],complete:true});const e=K.applySnapshot(s,g,'a',{offers:[offer(null,{stock:'out'})],complete:true});assert.equal(e[0].type,'lowest-out');assert.equal(e[0].price,null);});
test('failed, empty-partial and unknown-price scans do not manufacture stock loss',()=>{const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer()],complete:true});for(let i=0;i<4;i++)K.applySnapshot(s,g,'a',{offers:[],complete:false});assert.equal(K.candidates(s,g,'standard')[0].stock,'in');K.applySnapshot(s,g,'a',{error:'Verification'});K.applySnapshot(s,g,'a',{offers:[offer(null,{stock:'unknown'})],complete:false});assert.equal(K.candidates(s,g,'standard')[0].price,40);assert.equal(s.events.length,0);});
test('currency mismatch and discovery-only SMART search prices cannot win',()=>{const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer(),offer(10,{sellerKey:'/vendor/b',currency:'USD'}),offer(20,{sellerKey:'',discoveryOnly:true})],complete:true});assert.equal(K.candidates(s,g,'standard')[0].price,40);});
test('fees add estimated totals; settings and backup validation reject wrong hosts',()=>{const {s,g}=setup();s.settings.fees.eneba={flat:1,percent:5};assert.equal(K.amount(s,offer()),43);assert.throws(()=>K.makeGame({name:'Game',searches:{eneba:'https://evil.example/path'}}));assert.throws(()=>K.importState({schema:1,games:[],offers:null,events:[]}));assert.equal(K.importState(s).games[0].name,g.name);});
test('Irish schedule validates weekdays and catches up exactly by due key',()=>{const s=WatchSettings.defaults();s.time1='21:00';assert.equal(WatchSettings.due(s,new Date('2026-10-12T20:05:00Z')),'2026-10-12T21:00');s.mode='manual';assert.equal(WatchSettings.due(s),null);assert.throws(()=>WatchSettings.validate({...s,mode:'weekly',days:[1,2]}));});
test('all-regions comparison includes cheaper US and unknown-region Instant Gaming offers',()=>{
 const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer(40),offer(30,{sellerKey:'/vendor/us',region:'United States'}),offer(32,{store:'instant',url:'https://www.instant-gaming.com/en/22199-buy-game/',region:'Unknown',sellerKey:'',seller:''})],complete:true});
 assert.equal(K.candidates(s,g,'standard')[0].price,40);s.settings.allRegions=true;assert.equal(K.candidates(s,g,'standard')[0].price,30);assert.equal(K.candidates(s,g,'standard','instant')[0].price,32);
 const invalid=offer(1,{title:'Legacy of the Dark Knight Steam PC',url:'https://www.eneba.com/steam-game',region:'Global'});assert.equal(K.eligible(g,invalid,s.settings),false);
});
test('seller plan skips current and historical unavailable products while revisiting active missing pages',()=>{
 const {s,g}=setup();s.settings.firstPageOnly=false;const active=offer(40),oldOut=offer(35,{url:'https://www.eneba.com/old-out',stock:'out'}),newOut=offer(null,{url:'https://www.eneba.com/new-out',sellerKey:'',stock:'out'});
 K.applySnapshot(s,g,g.id+'|eneba|'+K.canonical(active.url),{offers:[active],complete:true});K.applySnapshot(s,g,'old',{offers:[oldOut],complete:true});
 const plan=K.sellerPlan(s,g,'eneba',{offers:[newOut]});assert.equal(plan.discovered.size,1);assert.ok(plan.discovered.has(K.canonical(active.url)));assert.ok(!plan.discovered.has(K.canonical(oldOut.url)));assert.equal(plan.unavailable.size,1);
 const unavailableActive=K.sellerPlan(s,g,'eneba',{offers:[{...active,stock:'out'}]});assert.equal(unavailableActive.discovered.size,0);
});
test('explicit product unavailable marks cached sellers out without visiting the page and keeps stock alert',()=>{
 const {s,g}=setup(),source=g.id+'|eneba|'+K.canonical(offer().url);
 K.applySnapshot(s,g,source,{offers:[offer()],complete:true});K.applySnapshot(s,g,'other',{offers:[offer(42,{store:'loaded',url:'https://www.loaded.com/game',sellerKey:'',seller:''})],complete:true,silent:true});
 const e=K.markProductUnavailable(s,g,'eneba',offer().url);assert.equal(e.length,1);assert.equal(e[0].type,'lowest-out');assert.equal(e[0].price,42);assert.equal(e[0].nextStore,'loaded');assert.equal(Object.values(s.offers).find(o=>o.sellerKey).stock,'out');
 assert.equal(K.markProductUnavailable(s,g,'eneba',offer().url).length,0);
 const back=K.sellerPlan(s,g,'eneba',{offers:[offer(39,{sellerKey:''})]});assert.equal(back.discovered.size,1);
});
test('old backups gain the all-regions setting without losing existing filters or prices',()=>{
 const {s,g}=setup();delete s.settings.allRegions;const restored=K.importState(s);assert.equal(restored.settings.allRegions,false);assert.deepEqual(restored.games[0].regions,['Global','Europe']);
});
test('new games track one edition and finding a Deluxe result cannot add a Deluxe row',()=>{
 const {s,g}=setup();s.settings.firstPageOnly=false;assert.deepEqual(g.editions,['standard']);assert.equal(g.multipleEditions,false);
 K.applySnapshot(s,g,'a',{offers:[offer(),offer(35,{title:'Legacy of the Dark Knight Deluxe Edition Xbox Key EUROPE',url:'https://www.eneba.com/deluxe-game'})],complete:true});assert.deepEqual(g.editions,['standard']);assert.equal(K.candidates(s,g,'deluxe').length,0);assert.equal(K.sellerPlan(s,g,'eneba',{offers:[offer(35,{title:'Legacy of the Dark Knight Deluxe Edition Xbox Key EUROPE',url:'https://www.eneba.com/deluxe-game'})]}).discovered.size,1); // Only the existing active Standard page remains.
});
test('a single-edition Deluxe game tracks Deluxe without inventing Standard',()=>{
 const g=K.makeGame({name:'Legacy of the Dark Knight Deluxe Edition',match:'legacy of the dark knight',query:'legacy deluxe xbox'});assert.equal(g.primaryEdition,'deluxe');assert.deepEqual(g.editions,['deluxe']);
});
test('multiple editions generate distinct queries while preserving filtered search URLs',()=>{
 const g=K.makeGame({name:'Legacy',match:'legacy',query:'legacy xbox',multipleEditions:true,editions:['standard','deluxe','ultimate'],editionQueries:{deluxe:'legacy deluxe xbox',ultimate:'legacy ultimate xbox'},searches:{eneba:'https://www.eneba.com/store/all?drms[]=xbox&regions[]=europe&text=legacy+xbox'}});
 const jobs=K.searchJobs(g,'eneba');assert.equal(jobs.length,3);assert.equal(new URL(jobs[1].url).searchParams.get('text'),'legacy deluxe xbox');assert.equal(new URL(jobs[1].url).searchParams.get('drms[]'),'xbox');assert.equal(new URL(jobs[1].url).searchParams.get('regions[]'),'europe');
 assert.match(K.searchJobs(g,'gamivo')[1].url,/legacy%20deluxe%20xbox/);assert.equal(new URL(K.searchJobs(g,'instant')[1].url).searchParams.get('type[]'),'Microsoft Store');
 assert.equal(new URLSearchParams(new URL(K.searchJobs(g,'loaded')[1].url).hash.slice(1)).get('q'),'legacy deluxe xbox');
});
test('identical edition queries run once and legacy edition selections migrate',()=>{
 const legacy=K.makeGame({name:'Legacy',query:'legacy xbox',editions:['standard','deluxe']});assert.equal(legacy.multipleEditions,true);assert.equal(K.searchJobs(legacy,'gamivo').length,1);assert.deepEqual(K.searchJobs(legacy,'gamivo')[0].editions,['standard','deluxe']);
 const disabled=K.makeGame({...legacy,multipleEditions:false,editionQueries:{standard:'legacy xbox',deluxe:'legacy deluxe xbox'}});assert.deepEqual(disabled.editions,['standard']);assert.equal(K.searchJobs(disabled,'eneba').length,1);assert.equal(disabled.editionQueries.deluxe,'legacy deluxe xbox');
});
test('whole title words reject fuzzy simulator results and query contamination before saving or visiting',()=>{
 const s=K.defaults(),g=K.makeGame({name:'Priest Simulator'});s.games=[g];
 const make=title=>offer(10,{title,url:'https://www.eneba.com/'+title.toLowerCase().replaceAll(' ','-')+'?text=priest+simulator+xbox'});
 const good=make('Priest Simulator Xbox'),bad=['Bakery Simulator Xbox','Ranch Simulator Xbox','Priest Simulatorium Xbox'].map(make);
 K.applySnapshot(s,g,'search',{offers:[good,...bad],complete:true});assert.equal(Object.keys(s.offers).length,1);assert.equal(s.checks.search.count,1);assert.equal(K.sellerPlan(s,g,'eneba',{offers:[good,...bad]}).discovered.size,1);
 const unrelated={...bad[0],id:'bad',gameId:g.id,source:'search'};s.offers.bad=unrelated;const restored=K.importState(s);assert.equal(Object.keys(restored.offers).length,1);assert.equal(restored.checks.search.count,1);assert.equal(Object.values(restored.offers)[0].history.length,1);
});
test('Bundle classification and separate searches are available without adding automatic editions',()=>{
 assert.ok(K.editionNames.includes('bundle'));assert.equal(K.edition('Priest Simulator Deluxe Bundle Xbox'),'bundle');
 const g=K.makeGame({name:'Priest Simulator',multipleEditions:true,editions:['standard','bundle'],editionQueries:{bundle:'priest simulator bundle xbox'}});assert.equal(K.searchJobs(g,'gameseal').length,2);
});
test('accounts have independent minima, new lows and next-lowest stock alerts',()=>{
 const {s,g}=setup();g.listingTypes=['key','account'];const key=offer(40),account=offer(10,{title:'Legacy of the Dark Knight Xbox Account',url:'https://www.eneba.com/account-game',sellerKey:'/a'}),backup={...account,price:12,sellerKey:'/b'};
 K.applySnapshot(s,g,'a',{offers:[key,account,backup],complete:true});assert.equal(K.candidates(s,g,'standard')[0].price,40);assert.equal(K.candidates(s,g,'standard',undefined,'account')[0].price,10);
 let events=K.applySnapshot(s,g,'a',{offers:[key,{...account,price:9},backup],complete:true});assert.equal(events[0].listingType,'account');assert.equal(events[0].type,'drop');
 events=K.applySnapshot(s,g,'a',{offers:[key,{...account,stock:'out'},backup],complete:true});assert.equal(events[0].type,'lowest-out');assert.equal(events[0].price,12);assert.equal(events[0].listingType,'account');assert.equal(K.candidates(s,g,'standard')[0].price,40);
 events=K.applySnapshot(s,g,'a',{offers:[key,{...account,stock:'out'},backup,{...account,sellerKey:'/c',price:8}],complete:true});assert.equal(events[0].type,'new-low');assert.equal(events[0].old,12);assert.equal(events[0].listingType,'account');
});

test('cross-title bundles without the word Bundle get the bundle edition; hardware X stays Standard',()=>{
 for(const title of ['Priest Simulator x Crime Simulator (Xbox Series X|S) XBOX LIVE Key EUROPE','Priest Simulator × Crime Simulator Xbox Key UNITED STATES','Priest Simulator + Crime Simulator Xbox Key UNITED KINGDOM'])assert.equal(K.edition(title),'bundle');
 for(const title of ['Priest Simulator (Xbox Series X|S) XBOX LIVE Key EUROPE','Mega Man X Xbox Key','Game Xbox Series X S Key','Final Fantasy X Xbox Key'])assert.equal(K.edition(title),'standard');
 const s=K.defaults(),g=K.makeGame({name:'Priest Simulator x Crime Simulator',query:'Priest Simulator x Crime Simulator xbox'});s.games=[g];assert.deepEqual(g.editions,['bundle']);
 const regions=['Europe','United States','United Kingdom'],offers=regions.map((region,i)=>offer(30+i,{title:'Priest Simulator x Crime Simulator (Xbox Series X|S) XBOX LIVE Key '+region,url:'https://www.eneba.com/priest-crime-'+i,region,sellerKey:''}));
 K.applySnapshot(s,g,'search',{offers,complete:true});assert.equal(Object.keys(s.offers).length,3);assert.equal(K.sellerPlan(s,g,'eneba',{offers}).discovered.size,3);assert.equal(K.candidates(s,g,'bundle').length,1);s.settings.allRegions=true;assert.equal(K.candidates(s,g,'bundle').length,3);
 assert.equal(K.matchesTitle(g,{...offers[0],title:'Priest Simulator + Crime Simulator Xbox Key EUROPE'}),true);assert.equal(K.matchesTitle(g,{...offers[0],title:'Priest Simulator Xbox Key EUROPE'}),false);assert.equal(K.matchesTitle(g,{...offers[0],title:'Crime Simulator Xbox Key EUROPE'}),false);
 const cached=Object.values(s.offers)[0];cached.edition='standard';const restored=K.importState(s);assert.equal(restored.offers[cached.id].edition,'bundle');assert.equal(restored.offers[cached.id].history.length,1);
});
test('templates default to blank filters and survive backup with opt-in Accounts',()=>{
 const s=K.defaults();assert.equal(s.defaultTemplate,'template-1');assert.equal(s.templates[0].exclude,'');assert.deepEqual(s.templates[0].regions,[]);assert.deepEqual(s.templates[0].listingTypes,['key']);
 const t=K.makeTemplate({name:'All regions accounts',regions:[],exclude:'(PC)',listingTypes:['account']});s.templates.push(t);s.defaultTemplate=t.id;const restored=K.importState(s);assert.equal(restored.defaultTemplate,t.id);assert.deepEqual(restored.templates[1].listingTypes,['account']);assert.throws(()=>K.makeTemplate({name:'Bad',listingTypes:['bad']}));
 const g=game(),account=offer(5,{title:'Legacy of the Dark Knight Xbox Account'});assert.equal(K.eligible(g,account),false);g.listingTypes=['account'];assert.equal(K.eligible(g,account),true);assert.equal(K.eligible(g,offer()),false);
});
test('PC exclusions use title words and block saving, comparisons and seller visits',()=>{
 const {s,g}=setup();g.exclude='(PC)';const pc=offer(10,{title:'Legacy of the Dark Knight (PC) Xbox',url:'https://www.eneba.com/pc'});assert.equal(K.titleExcluded(g,pc),true);K.applySnapshot(s,g,'a',{offers:[pc,offer()],complete:true});assert.equal(Object.keys(s.offers).length,1);assert.equal(K.sellerPlan(s,g,'eneba',{offers:[pc]}).discovered.has(K.canonical(pc.url)),false);g.exclude='PC';assert.equal(K.titleExcluded(g,pc),true);assert.equal(K.titleExcluded(g,{...pc,title:'Legacy of the Dark Knight Xbox NPC'}),false);
});
test('first page mode skips historical seller pages absent from current results and never infers missing stock',()=>{
 const {s,g}=setup();K.applySnapshot(s,g,'a',{offers:[offer()],complete:true});assert.equal(K.sellerPlan(s,g,'eneba',{offers:[]}).discovered.size,0);
 for(let i=0;i<3;i++)K.applySnapshot(s,g,'a',{offers:[],complete:false,limited:true});assert.equal(K.candidates(s,g,'standard')[0].stock,'in');assert.equal(s.events.length,0);assert.equal(s.checks.a.limited,true);s.settings.firstPageOnly=false;assert.equal(K.sellerPlan(s,g,'eneba',{offers:[]}).discovered.size,1);
});
