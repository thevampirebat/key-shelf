'use strict';
// Isolated content-script scope; reads product cards and clicks only pagination/load-more.
var ShelfReader = (() => {
 const text=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
 const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 const out=s=>/sold out|out of stock|not available|currently unavailable/i.test(s);
 const blocked=()=>/verify you are human|checking your browser|unusual traffic|access denied|just a moment/i.test(document.title+' '+text(document.body).slice(0,2500));
 function item(store,card,a,priceNode,extra={}){
  if(!a)return null;const title=extra.title||a.title||a.getAttribute('aria-label')||text(card.querySelector('h2,[itemprop="name"],.product-name,.title'))||text(a);
  const ptext=extra.priceText||text(priceNode);const price=KeyShelf.price(ptext),currency=KeyShelf.currency(ptext)||extra.currency;
  return {store,title,url:a.href,price,currency:currency||null,stock:out(text(card))||extra.out?'out':price!==null?'in':'unknown',region:extra.region||KeyShelf.region(title+' '+a.href),platform:extra.platform||'',seller:extra.seller||'',sellerKey:extra.sellerKey||'',...extra};
 }
 function search(store,settings){
  const offers=[];let cards=[];
  if(store==='gameseal'){
   cards=[...document.querySelectorAll('.cms-element-product-listing .product-box')];
   if(!cards.length)cards=[...document.querySelectorAll('#content-main .product-info')].filter(c=>c.querySelector('a.product-name'));
   for(const c of cards){const a=c.querySelector('a.product-name'),seal=c.querySelector('.seal-pass-price .product-price-regular'),regular=c.querySelector('.product-price-wrapper .product-price-regular');
    const o=item(store,c,a,settings.sealPass?seal:regular,{region:KeyShelf.region(text(c.querySelector('.product-region'))),platform:text(c.querySelector('.product-platform')),basis:settings.sealPass?'Seal Pass':'Regular'});
    if(o){if(settings.sealPass&&!seal&&!out(text(c))){o.stock='unknown';o.price=null;o.warning='Seal Pass price missing';}offers.push(o);}
   }
  }else if(store==='eneba'){
   const seen=new Set();for(const a of document.querySelectorAll('a[title][href]')){
    if(!/key|xbox|edition/i.test(a.title)||!/\/[^/]+/.test(new URL(a.href).pathname)||seen.has(a.href))continue;
    let c=a.parentElement;for(let n=0;n<5&&c&&!c.querySelector('.DTv7Ag,.VkR9uM');n++){if(out(text(c))&&text(c).length<1600)break;c=c.parentElement;}
    if(!c||text(c).length>2200)continue;const p=c.querySelector('.DTv7Ag .L5ErLT,.VkR9uM .L5ErLT');if(!p&&!out(text(c)))continue;
    seen.add(a.href);offers.push(item(store,c,a,p,{basis:'Search from price',discoveryOnly:settings.deepSellers}));cards.push(c);
   }
  }else if(store==='gamivo'){
   cards=[...document.querySelectorAll('.search-results__tiles app-product-tile')];for(const c of cards)offers.push(item(store,c,c.querySelector('a[href*="/product/"]'),c.querySelector('.price__final'),{basis:'Search from price (may require SMART)',discoveryOnly:true}));
  }else if(store==='loaded'){
   cards=[...document.querySelectorAll('#algolia_instant_selector .algolia-item')];for(const c of cards){
    const o=item(store,c,c.querySelector('a.algolia-hit-link'),c.querySelector('[itemprop="lowPrice"],.price'),{title:c.dataset.name,region:KeyShelf.region(c.dataset.regionValue||''),platform:c.querySelector('img[data-platforms]')?.dataset.platforms||'',basis:'Regular',out:c.dataset.stock==='0'});if(o)offers.push(o);
   }
  }else if(store==='instant'){
   const scope=document.querySelector('#search-app,.search-app')||document;
   const seen=new Set();for(const a of scope.querySelectorAll('a.cover[href]')){
    if(!/\/[a-z]{2}\/\d+/i.test(new URL(a.href).pathname))continue;
    const c=a.closest('.item')||a.parentElement;if(!c||seen.has(a.href))continue;seen.add(a.href);cards.push(c);
    offers.push(item(store,c,a,c.querySelector('.price'),{basis:'Regular',region:KeyShelf.region(a.title||a.getAttribute('aria-label')||'')}));
   }
  }
  const filtered=offers.filter(Boolean);const body=text(document.body);
  let total=null;const patterns=store==='eneba'?[/Results found:\s*([\d,]+)/i]:store==='gameseal'?[/Results found:\s*([\d,]+)/i]:store==='gamivo'?[/([\d,]+) item\(s\)/i]:store==='instant'?[/([\d,]+) results/i]:[];
  const resultText=store==='instant'?text(document.querySelector('#search-app,.search-app'))||body:body;
  for(const re of patterns){const m=resultText.match(re);if(m){total=Number(m[1].replace(/,/g,''));break;}}
  const instantScope=store==='instant'?document.querySelector('#search-app,.search-app'):null;
  const loading=!!instantScope&&[...instantScope.querySelectorAll('[aria-busy="true"],.loading,.loader,.spinner')].some(visible);
  const emptyInstant=store==='instant'&&!!instantScope&&/\b(?:no|zero|0)\s+(?:matching\s+)?(?:results|games|products|items)\b/i.test(resultText);
  const noResults=!loading&&!filtered.length&&(emptyInstant||(total===0||/no (?:products|results|items) found|\b0 results\b|no results for|we couldn.t find/i.test(resultText)));
  const next=nextControl(store);return {offers:filtered,total,noResults,hasNext:!!next,loading,signature:filtered.map(o=>o.url+'|'+o.price+'|'+o.stock).join(';')};
 }
 function nextControl(store){
  if(store==='gameseal'){
   const input=document.querySelector('.cms-element-product-listing .page-next:not(.disabled) input[name="p"]');
   if(input&&!input.disabled){const label=input.parentElement.querySelector('label.page-link');if(visible(label))return label;}
  }
  const scopes={eneba:document,gameseal:document,gamivo:document.querySelector('#search-results-pagination')||document,loaded:document.querySelector('#algolia_instant_selector')||document,instant:document.querySelector('#search-app')||document};
  for(const e of scopes[store].querySelectorAll('a[rel="next"],button,a')){
   if(!visible(e)||e.disabled||e.getAttribute('aria-disabled')==='true'||e.classList.contains('disabled'))continue;
   const label=e.getAttribute('aria-label')||e.title||text(e);if(/^(?:next(?: page)?|load more(?: products)?|show more(?: results)?|show more results)$/i.test(label)||/ais-InfiniteHits-loadMore/.test(e.className))return e;
  }
  return null;
 }
 function gamivoOfferSection(){
  const heading=[...document.querySelectorAll('h2,h3,h4,[role="heading"],.title')].find(e=>/^all\s+offers\b/i.test(text(e)));
  if(!heading)return {heading:null,scope:null,rows:[]};
  const scope=heading.closest('section,app-product-offers');
  let rows=[];
  if(scope)rows=[...scope.querySelectorAll('app-product-offer-tile,[data-testid="app-product-offer-item"],.offer-row')];
  else for(let sibling=heading.nextElementSibling;sibling;sibling=sibling.nextElementSibling){
   if(sibling.matches('h2,h3,h4,[role="heading"]'))break;
   if(sibling.matches('app-product-offer-tile,[data-testid="app-product-offer-item"],.offer-row'))rows.push(sibling);
   rows.push(...sibling.querySelectorAll('app-product-offer-tile,[data-testid="app-product-offer-item"],.offer-row'));
  }
  rows=[...new Set(rows.map(e=>e.matches('app-product-offer-tile')?e:e.querySelector('app-product-offer-tile')||e))];
  return {heading,scope,rows};
 }
 function sellers(store,settings){
  const title=text(document.querySelector('h1')),url=location.href,region=KeyShelf.region(title+' '+url),offers=[];
  let reason='',offerScope=null,total=null;
  if(store==='eneba'){
   const seen=new Set();for(const a of document.querySelectorAll('a[href*="/vendor/"]')){
    const seller=text(a)||a.querySelector('img')?.alt;if(!seller)continue;let c=a.parentElement;
    for(let n=0;n<6&&c&&!c.querySelector('.w7tD3i .L5ErLT');n++)c=c.parentElement;
    if(!c||text(c).length>2200)continue;const p=c.querySelector('.w7tD3i .L5ErLT');if(!p)continue;
    const sellerKey=new URL(a.href).pathname;if(seen.has(sellerKey))continue;seen.add(sellerKey);
    offers.push({store,title,url,price:KeyShelf.price(text(p)),currency:KeyShelf.currency(text(p)),stock:'in',region,seller,sellerKey,basis:'Seller price'});
   }
  }else if(store==='gamivo'){
   // Read the actual All offers container. It can be collapsed/lazy-loaded and
   // the supplier names can be role=button divs rather than native buttons.
   const section=gamivoOfferSection();offerScope=section.scope;
   const count=text(section.heading).match(/\((\d+)\)/);if(count)total=Number(count[1]);
   reason=!section.heading?'Gamivo All offers section has not loaded.':!section.rows.length?'Gamivo seller rows have not loaded.':'Gamivo did not expose a readable '+(settings.gamivoSmart?'SMART':'regular')+' seller price.';
   const seen=new Set();for(const c of section.rows){const a=c.querySelector('a[href*="/merchant/"],a[data-testid="supplier-tos-link"]');if(!a?.href)continue;
    const seller=text(c.querySelector('[data-testid="supplier-name"],.supplier-details__name'))||[...c.querySelectorAll('app-product-offer-supplier button')].map(text).find(Boolean)||decodeURIComponent(new URL(a.href).pathname.split('/').pop());const sellerKey=new URL(a.href).pathname;
    if(seen.has(sellerKey))continue;seen.add(sellerKey);
    const prices=[...c.querySelectorAll('.price__value,.price__final,[data-testid="offer-price"]')].map(p=>({value:KeyShelf.price(text(p)),currency:KeyShelf.currency(text(p)),smart:/\bSMART\b/i.test(text(p.closest('.price,.offer-price')||p.parentElement)),action:!!p.closest('.action')})).filter(p=>p.value!==null);
    let applicable=prices.filter(p=>p.smart===settings.gamivoSmart);
    if(applicable.some(p=>p.action))applicable=applicable.filter(p=>p.action);
    applicable.sort((a,b)=>settings.gamivoSmart?a.value-b.value:b.value-a.value);const p=applicable[0];
    if(p)offers.push({store,title,url,price:p.value,currency:p.currency,stock:'in',region,seller,sellerKey,basis:settings.gamivoSmart?'SMART':'Regular seller price'});
   }
  }
  const load=[...(offerScope||document).querySelectorAll('button')].find(e=>visible(e)&&!e.disabled&&/^load \d+ more offers|^show more offers|^load more$/i.test(text(e)));
  const stockText=store==='gamivo'?text(offerScope)||text(document.querySelector('app-product-header,.product-header,main')):text(document.querySelector('main'))||text(document.body);
  const stockOut=!offers.length&&/sold out|out of stock|no offers available/i.test(stockText.slice(0,6000));
  const totalMatch=text(document.body).match(store==='gamivo'?/All offers\s*\((\d+)\)/i:/(\d+)\s+other offers/i);
  return {offers,title,region,load:!!load,total:total??(totalMatch?Number(totalMatch[1]):null),stockOut,reason,signature:offers.map(o=>o.sellerKey+'|'+o.price).join(';')};
 }
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 async function collect(store,settings,detail=false,game=null){
  const all=new Map(),rawSeen=new Set();let previous='',stable=0,last,complete=false,warning='',expanded=false,limited=false;
  for(let page=0;page<settings.maxPages;page++){
   const started=Date.now();let ready=false;for(let i=0;i<(store==='instant'&&!detail?12:30);i++){
    if(blocked())return {error:'Website verification or access block. Open the search in Firefox to inspect it.'};
    const r=detail?sellers(store,settings):search(store,settings);
    last=r;
    if(detail&&store==='gamivo'&&!r.offers.length&&!r.stockOut&&!expanded){
     const section=gamivoOfferSection();if(section.heading){
      section.heading.scrollIntoView?.({block:'center'});
      if(section.scope?.classList.contains('is-collapsed'))(section.heading.closest('header')||section.heading).click();
      expanded=true;await pause(700);continue;
     }
    }
    if(r.offers.length||r.noResults||r.stockOut){if(r.signature===previous)stable++;else stable=0;previous=r.signature;last=r;
     // A hydrated search can briefly say zero while its request is still loading.
     // Priced cards win over that placeholder; empty results need a longer settle.
     if(stable>=2&&(!r.noResults||Date.now()-started>=2800)){ready=true;break;}}
    await pause(700);
   }
   if(!ready)return {offers:[...all.values()],complete:false,error:rawSeen.size?undefined:last?.reason||'No readable listings. Page layout may have changed.',warning:rawSeen.size?'Page did not finish loading; previous listings retained.':undefined};
   for(const o of last.offers){const key=KeyShelf.canonical(o.url)+'|'+(o.sellerKey||'product');rawSeen.add(key);if(!game||KeyShelf.matchesTitle(game,o)&&!KeyShelf.titleExcluded(game,o))all.set(key,o);}
   let next;
   if(detail){const scope=store==='gamivo'?gamivoOfferSection().scope:document;next=[...(scope||document).querySelectorAll('button')].find(e=>visible(e)&&!e.disabled&&/^load \d+ more offers|^show more offers|^load more$/i.test(text(e)));}
   else next=nextControl(store);
   if(!next){
    complete=detail?(last.stockOut||rawSeen.size>0&&(!last.total||rawSeen.size>=last.total)):last.noResults||rawSeen.size>0&&(!last.total||rawSeen.size>=last.total);
    if(!complete)warning='Listing count was incomplete; missing offers retained.';
    break;
   }
   if(settings.firstPageOnly){limited=true;complete=false;break;}
   const old=last.signature;next.click();stable=0;previous='';let changed=false;
   for(let i=0;i<25;i++){await pause(600);const r=detail?sellers(store,settings):search(store,settings);if(r.signature!==old){changed=true;break;}}
   if(!changed){warning='Next page did not load; missing offers retained.';break;}
  }
  if(!complete&&!warning&&!limited)warning='Page limit reached; missing offers retained.';
  return {offers:[...all.values()],complete,limited,warning,stockOut:last?.stockOut||false};
 }
 return {search,sellers,collect};
})();
