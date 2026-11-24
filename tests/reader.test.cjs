const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=(()=>{if(process.env.KEY_SHELF_TEST_MODULES)return require(process.env.KEY_SHELF_TEST_MODULES);try{return require('linkedom');}catch{return require('../../.test-runtime/node_modules/linkedom');}})();
const schedule=fs.readFileSync(require.resolve('../schedule.js'),'utf8'),core=fs.readFileSync(require.resolve('../core.js'),'utf8'),reader=fs.readFileSync(require.resolve('../reader.js'),'utf8');
function context(html,url='https://www.eneba.com/product'){
 const {document,window}=parseHTML('<html><head><title>Store</title></head><body>'+html+'</body></html>');
 window.HTMLElement.prototype.getClientRects=function(){return this.hasAttribute('hidden')?[]:[{}];};
 const c=vm.createContext({document,window,URL,crypto,Intl,Node:{DOCUMENT_POSITION_FOLLOWING:4},location:{href:url},getComputedStyle:()=>({visibility:'visible'}),setTimeout});vm.runInContext(schedule+'\n'+core+'\n'+reader,c);return c;
}
const read=(c,store)=>vm.runInContext('ShelfReader.search('+JSON.stringify(store)+',KeyShelf.defaults().settings)',c);
test('Gameseal scopes to listing results and reads actual Seal Pass rather than list price',()=>{
 const c=context('<div class="product-box"><a class="product-name" href="https://gameseal.com/menu">Navigation game</a></div><div class="cms-element-product-listing"><div class="product-box"><a class="product-name" title="Legacy of the Dark Knight" href="https://gameseal.com/game">Legacy of the Dark Knight</a><div class="product-region">GLOBAL</div><div class="product-platform">Xbox Live</div><div class="product-price-wrapper"><span class="product-price-list">69.99 €</span><span class="product-price-regular">55.13 €</span></div><a class="seal-pass-price"><span class="product-price-regular">46.86 €</span></a></div></div> Results found: 2');
 const r=read(c,'gameseal');assert.equal(r.offers.length,1);assert.equal(r.offers[0].price,46.86);assert.equal(r.offers[0].basis,'Seal Pass');assert.equal(r.total,2);
});
test('missing Seal Pass remains unknown instead of silently using regular price',()=>{
 const c=context('<div class="cms-element-product-listing"><div class="product-box"><a class="product-name" title="Game Xbox" href="https://gameseal.com/game">Game Xbox</a><div class="product-price-wrapper"><span class="product-price-regular">55.13 €</span></div></div></div>');const r=read(c,'gameseal');assert.equal(r.offers[0].price,null);assert.equal(r.offers[0].stock,'unknown');
});
test('Gameseal pagination follows the next-page label and stops at a disabled final page',()=>{
 const c=context('<div class="cms-element-product-listing"><li class="page-item page-next"><input type="radio" name="p" id="p-next-bottom" value="2"><label class="page-link" for="p-next-bottom">→</label></li></div>');assert.equal(read(c,'gameseal').hasNext,true);c.document.querySelector('.page-next').classList.add('disabled');assert.equal(read(c,'gameseal').hasNext,false);
});
test('Eneba reader takes product price and excludes cashback value',()=>{
 const c=context('<div class="uy1qit"><div><a title="Legacy of the Dark Knight Xbox Key EUROPE" href="https://www.eneba.com/xbox-game"></a></div><div class="VkR9uM"><span class="DTv7Ag"><span class="L5ErLT">€40.37</span></span></div><div>Cashback <span class="L5ErLT">€4.44</span></div></div> Results found: 1');const r=read(c,'eneba');assert.equal(r.offers.length,1);assert.equal(r.offers[0].price,40.37);assert.equal(r.offers[0].discoveryOnly,true);
});
test('Eneba explicit sold-out card is collected without a price',()=>{
 const c=context('<div><a title="Legacy of the Dark Knight Xbox Key JAPAN" href="https://www.eneba.com/xbox-game-japan"></a><div>Sold out</div></div>');const r=read(c,'eneba');assert.equal(r.offers.length,1);assert.equal(r.offers[0].stock,'out');assert.equal(r.offers[0].price,null);
});
test('Loaded uses only search cards and reads stock and region metadata',()=>{
 const c=context('<div id="algolia_instant_selector"><div class="algolia-item" data-name="Legacy Xbox" data-stock="1" data-region-value="Europe &amp; UK"><a class="algolia-hit-link" href="https://www.loaded.com/game"></a><span itemprop="lowPrice">€40.09</span></div><button class="ais-InfiniteHits-loadMore" disabled>Load More</button></div>');const r=read(c,'loaded');assert.equal(r.offers[0].price,40.09);assert.equal(r.offers[0].region,'Europe');assert.equal(r.hasNext,false);
});
test('Instant Gaming reads NBSP prices and preserves unknown region',()=>{
 const c=context('<div id="search-app"><div class="item"><a class="cover" title="Legacy of the Dark Knight Xbox" href="https://www.instant-gaming.com/en/22199-game"></a><div class="price">47.99\u00a0€</div></div><h2>1 results</h2></div>');const r=read(c,'instant');assert.equal(r.offers[0].price,47.99);assert.equal(r.offers[0].region,'Unknown');assert.equal(r.total,1);
});
test('Gamivo search from prices are discovery-only',()=>{
 const c=context('<div class="search-results__tiles"><app-product-tile><a href="https://www.gamivo.com/product/game"><span>Legacy Xbox</span></a><h2>Legacy Xbox</h2><div class="price__final">€40.57</div></app-product-tile></div>24 item(s)');const r=read(c,'gamivo');assert.equal(r.offers[0].price,40.57);assert.equal(r.offers[0].discoveryOnly,true);
});
test('Gamivo seller reader distinguishes mobile SMART summary from regular desktop price',()=>{
 const c=context('<h1>Legacy of the Dark Knight Xbox Key Europe</h1><h2>All offers (1)</h2><app-product-offer-tile><app-product-offer-supplier><button>Gedonix</button><a href="https://www.gamivo.com/merchant/5860307/Gedonix#tos">Supplier terms</a></app-product-offer-supplier><div class="price"><div class="price__value">€40.57</div></div><div class="price"><div class="price__value">€43.16</div></div><div class="price">Save 6% with SMART<div class="price__value">€40.57</div></div></app-product-offer-tile>','https://www.gamivo.com/product/game');
 let r=vm.runInContext("ShelfReader.sellers('gamivo',KeyShelf.defaults().settings)",c);assert.equal(r.offers[0].price,43.16);r=vm.runInContext("ShelfReader.sellers('gamivo',{...KeyShelf.defaults().settings,gamivoSmart:true})",c);assert.equal(r.offers[0].price,40.57);
});
test('Gameseal normal-price mode chooses the regular sale price, not Seal Pass or list price',()=>{
 const c=context('<div class="cms-element-product-listing"><div class="product-box"><a class="product-name" title="Legacy Xbox" href="https://gameseal.com/game">Legacy Xbox</a><div class="product-price-wrapper"><span class="product-price-list">69.99 €</span><span class="product-price-regular">55.13 €</span></div><a class="seal-pass-price"><span class="product-price-regular">46.86 €</span></a></div></div>');
 const r=vm.runInContext("ShelfReader.search('gameseal',{...KeyShelf.defaults().settings,sealPass:false})",c);assert.equal(r.offers[0].price,55.13);assert.equal(r.offers[0].basis,'Regular');
});
test('Instant Gaming finds both editions in an alternate search root despite a zero-result placeholder',()=>{
 const c=context('<p hidden>0 results</p><div class="search-app"><h2>2 results</h2><div class="item"><a class="cover" title="Legacy of the Dark Knight Xbox" href="https://www.instant-gaming.com/en/22199-buy-game/"></a><div class="price">47.99 €</div></div><div class="item"><a class="cover" title="Legacy of the Dark Knight Deluxe Edition Xbox" href="https://www.instant-gaming.com/en/22200-buy-deluxe/"></a><div class="price">62.25 €</div></div></div>');
 const r=read(c,'instant');assert.equal(r.offers.length,2);assert.equal(r.total,2);assert.equal(r.noResults,false);assert.equal(r.offers[0].price,47.99);assert.equal(r.offers[1].price,62.25);
 assert.equal(vm.runInContext('KeyShelf.edition(ShelfReader.search("instant",KeyShelf.defaults().settings).offers[1].title)',c),'deluxe');
});
test('Gamivo reads only All offers across current section/test-id markup, ignoring promoted sellers',()=>{
 const c=context('<h1>Legacy Xbox EUROPE</h1><app-product-offers><section><header><h2>Promoted offers</h2></header><app-product-offer-tile><a href="https://www.gamivo.com/merchant/1/Promoted">Terms</a><div class="price"><div class="price__value">€1.00</div></div></app-product-offer-tile></section></app-product-offers><app-product-offers><section class="is-collapsed"><header><h2>All offers (1)</h2></header><div><li data-testid="app-product-offer-item"><app-product-offer-tile><div data-testid="supplier-name" role="button">Gedonix</div><a data-testid="supplier-tos-link" href="https://www.gamivo.com/merchant/5860307/Gedonix#tos">Terms</a><div class="price"><div class="price__value">€40.57</div></div><div class="action"><div class="price"><div class="price__value">€43.16</div></div></div><div class="action"><div class="price">Save 6% with SMART<div class="price__value">€40.57</div></div></div></app-product-offer-tile></li></div></section></app-product-offers>','https://www.gamivo.com/product/game');
 const r=vm.runInContext("ShelfReader.sellers('gamivo',KeyShelf.defaults().settings)",c);assert.equal(r.offers.length,1);assert.equal(r.offers[0].seller,'Gedonix');assert.equal(r.offers[0].price,43.16);assert.equal(r.total,1);
});
test('Gamivo can read accessible heading and fallback row/price markup',()=>{
 const c=context('<h1>Legacy Xbox EUROPE</h1><section><header><div role="heading">All offers (1)</div></header><div class="offer-row"><div data-testid="supplier-name">Seller One</div><a href="https://www.gamivo.com/merchant/1/Seller">Terms</a><div class="action"><div class="offer-price"><span data-testid="offer-price">€25.00</span></div></div><div class="action"><div class="offer-price">With SMART<span data-testid="offer-price">€20.00</span></div></div></div></section>','https://www.gamivo.com/product/game');
 const r=vm.runInContext("ShelfReader.sellers('gamivo',KeyShelf.defaults().settings)",c);assert.equal(r.offers[0].price,25);assert.equal(r.offers[0].seller,'Seller One');
});
test('Gamivo collection expands a lazy All offers panel before reporting a read failure',async()=>{
 const c=context('<h1>Legacy Xbox EUROPE</h1><section class="is-collapsed"><header><h2>All offers (1)</h2></header><div id="lazy-rows"></div></section>','https://www.gamivo.com/product/game');let clicks=0;
 c.setTimeout=(f)=>setImmediate(f);
 c.document.querySelector('header').addEventListener('click',()=>{clicks++;c.document.querySelector('section').classList.remove('is-collapsed');c.document.getElementById('lazy-rows').innerHTML='<app-product-offer-tile><div data-testid="supplier-name">Seller One</div><a href="https://www.gamivo.com/merchant/1/Seller">Terms</a><div class="action"><div class="price"><span class="price__value">€25.00</span></div></div></app-product-offer-tile>';});
 const r=await vm.runInContext("ShelfReader.collect('gamivo',KeyShelf.defaults().settings,true)",c);assert.equal(clicks,1);assert.equal(r.complete,true);assert.equal(r.offers[0].price,25);assert.equal(r.error,undefined);
});

test('filtered collection uses raw result totals and unrelated-only results are successful empty scans',async()=>{
 const html='<div id="algolia_instant_selector"><div class="algolia-item" data-name="Bakery Simulator Xbox" data-stock="1"><a class="algolia-hit-link" href="https://www.loaded.com/bakery"></a><span itemprop="lowPrice">€10.00</span></div><div class="algolia-item" data-name="Priest Simulator Xbox" data-stock="1"><a class="algolia-hit-link" href="https://www.loaded.com/priest"></a><span itemprop="lowPrice">€15.00</span></div></div> Results found: 2';
 const c=context(html,'https://www.loaded.com/#q=priest+simulator');c.setTimeout=fn=>{fn();};let r=await vm.runInContext('ShelfReader.collect("loaded",KeyShelf.defaults().settings,false,KeyShelf.makeGame({name:"Priest Simulator"}))',c);assert.equal(r.offers.length,1);assert.equal(r.complete,true);assert.equal(r.error,undefined);
 c.document.querySelector('[data-name="Priest Simulator Xbox"]').setAttribute('data-name','Ranch Simulator Xbox');r=await vm.runInContext('ShelfReader.collect("loaded",KeyShelf.defaults().settings,false,KeyShelf.makeGame({name:"Priest Simulator"}))',c);assert.equal(r.offers.length,0);assert.equal(r.complete,true);assert.equal(r.error,undefined);
});

test('Eneba collects all three cross-title bundle regions including an unavailable result',async()=>{
 const regions=['EUROPE','UNITED STATES','UNITED KINGDOM'];const html=regions.map((region,i)=>'<div><a title="Priest Simulator x Crime Simulator (Xbox Series X|S) XBOX LIVE Key '+region+'" href="https://www.eneba.com/priest-crime-'+i+'"></a>'+(i===2?'<div>Sold out</div>':'<div class="VkR9uM"><span class="DTv7Ag"><span class="L5ErLT">€'+(30+i)+'.00</span></span></div>')+'</div>').join('')+' Results found: 3';
 const c=context(html,'https://www.eneba.com/store/all?drms[]=xbox&text=priest+simulator+x+crime+simulator+xbox');c.setTimeout=fn=>fn();const r=await vm.runInContext('ShelfReader.collect("eneba",KeyShelf.defaults().settings,false,KeyShelf.makeGame({name:"Priest Simulator x Crime Simulator",primaryEdition:"bundle"}))',c);assert.equal(r.offers.length,3);assert.equal(r.complete,true);assert.equal(r.offers[2].stock,'out');
 c.offers=r.offers;assert.equal(vm.runInContext('KeyShelf.sellerPlan(KeyShelf.defaults(),KeyShelf.makeGame({name:"Priest Simulator x Crime Simulator"}),"eneba",{offers}).discovered.size',c),2);
});
test('first page mode does not click Loaded load-more and reports intentional limited coverage',async()=>{
 const c=context('<div id="algolia_instant_selector"><div class="algolia-item" data-name="Priest Simulator Xbox" data-stock="1"><a class="algolia-hit-link" href="https://www.loaded.com/priest"></a><span itemprop="lowPrice">€15.00</span></div><button class="ais-InfiniteHits-loadMore">Load more</button></div>','https://www.loaded.com/#q=priest');c.setTimeout=fn=>fn();let clicks=0;c.document.querySelector('button').click=()=>clicks++;const r=await vm.runInContext('ShelfReader.collect("loaded",KeyShelf.defaults().settings)',c);assert.equal(clicks,0);assert.equal(r.offers.length,1);assert.equal(r.complete,false);assert.equal(r.limited,true);assert.equal(r.warning,'');assert.equal(r.error,undefined);
});
function fastClock(c,onPause=()=>{}){let now=0;c.Date=class extends Date{static now(){return now;}};c.setTimeout=(fn,ms)=>{now+=ms;onPause(now);fn();};return ()=>now;}
test('Instant Gaming explicit empty search finishes after the short settling window',async()=>{
 for(const message of ['No games found','No results','0 games','No matching products']){const c=context('<div id="search-app">'+message+'</div>','https://www.instant-gaming.com/en/search/?query=test');const elapsed=fastClock(c);const r=await vm.runInContext('ShelfReader.collect("instant",KeyShelf.defaults().settings)',c);assert.equal(r.complete,true,message);assert.equal(r.offers.length,0);assert.equal(r.error,undefined);assert.ok(elapsed()>=2800&&elapsed()<=3500);}
});
test('Instant Gaming transient empty placeholder gives way to delayed real results',async()=>{
 const c=context('<div id="search-app">No results</div>','https://www.instant-gaming.com/en/search/?query=test');fastClock(c,t=>{if(t>=2100)c.document.querySelector('#search-app').innerHTML='<div class="item"><a class="cover" title="Legacy Xbox" href="https://www.instant-gaming.com/en/22200-buy-game/"></a><div class="price">€40.00</div></div>';});const r=await vm.runInContext('ShelfReader.collect("instant",KeyShelf.defaults().settings)',c);assert.equal(r.offers.length,1);assert.equal(r.complete,true);
});
test('Instant Gaming stuck loading and unrecognised pages fail within nine seconds without inferring empty stock',async()=>{
 for(const html of ['<div id="search-app"><span aria-busy="true">Loading</span>No results</div>','<div id="search-app">Loading search</div>']){const c=context(html,'https://www.instant-gaming.com/en/search/?query=test');const elapsed=fastClock(c);const r=await vm.runInContext('ShelfReader.collect("instant",KeyShelf.defaults().settings)',c);assert.equal(r.complete,false);assert.ok(r.error);assert.ok(elapsed()<=9000);}
});
