import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=await fs.readFile(new URL('../image-loader.js',import.meta.url),'utf8');
const stored='https://example.org/stored.jpg';
const thumb='https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/test.jpg/800px-test.jpg';
const original='https://upload.wikimedia.org/wikipedia/commons/a/ab/test.jpg';
const key='brainswap:wikipedia-images:v1';
const base={id:1,name:'Test subject',wikiTitle:'Test subject',imageVerificationStatus:'not_verified',imageAttribution:{artist:'Stored author',license:'Stored license',licenseUrl:'https://example.org/rights'},imageSource:'https://example.org/file',imageIssue:{reason:'Stored rights note'}};
const page={title:'Test subject',fullurl:'https://en.wikipedia.org/wiki/Test_subject',pageimage:'test.jpg',thumbnail:{source:thumb},original:{source:original}};
const response=(pages=[page])=>({ok:true,status:200,json:async()=>({query:{pages}})});
class Element{constructor(){this.style={};this.dataset={};this.children=[];}replaceChildren(...nodes){this.children=nodes;}append(...nodes){this.children.push(...nodes);}}
function setup({responses=[response()],outcomes={},store=new Map(),storageError=false}={}){
 const elements=new Map([['portrait',new Element()],['image-credit',new Element()]]);const calls=[];const loads=[];const pending=[];const timers=new Map();let timerId=0;let fits=0;
 class FakeImage{constructor(){this.naturalWidth=100;}set src(url){this._src=url;if(!url)return;loads.push(url);const outcome=outcomes[url]??true;if(outcome==='pending')pending.push(this);else queueMicrotask(()=>outcome?this.onload?.():this.onerror?.());}}
 const context=vm.createContext({URL,URLSearchParams,AbortController,Image:FakeImage,setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),localStorage:{getItem:k=>{if(storageError)throw Error('storage denied');return store.get(k)||null;},setItem:(k,v)=>{if(storageError)throw Error('storage denied');store.set(k,v);}},document:{getElementById:id=>elements.get(id),createElement:()=>new Element(),createTextNode:text=>({textContent:text})},fallbackImage:()=> 'data:image/svg+xml,fallback',scheduleViewportFit:()=>fits++,fetch:async(url,options)=>{calls.push({url,options});const next=responses.shift();if(next instanceof Error)throw next;if(typeof next==='function')return next(url,options);assert(next,'Unexpected additional API request');return next;}});
 vm.runInContext(code,context);return {context,elements,calls,loads,pending,timers,store,get fits(){return fits;}};
}
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const show=(state,card)=>state.context.showCardImage(card);
const kind=state=>state.elements.get('portrait').dataset.imageKind;
const credit=state=>state.elements.get('image-credit').children.map(n=>n.textContent||'').join(' ');
// Existing images are tried first, irrespective of verification status, with their attribution intact.
const first=setup();await show(first,{...base,imageUrl:stored});assert.equal(kind(first),'stored');assert.equal(first.calls.length,0);assert.equal(first.elements.get('portrait').src,stored);assert(credit(first).includes('Unverified stored image'));assert(credit(first).includes('Stored license'));assert(credit(first).includes('Stored rights note'));
// Missing URLs query the mapped article, use anonymous CORS, and cache only a loaded image.
const missing=setup();const snapshot=JSON.stringify(base);await show(missing,base);assert.equal(kind(missing),'wikipedia');assert.equal(JSON.stringify(base),snapshot);assert(credit(missing).includes('Unverified Wikipedia image'));assert(credit(missing).includes('Stored image record'));assert.equal(missing.calls.length,1);const query=new URL(missing.calls[0].url);assert.equal(query.searchParams.get('origin'),'*');assert.equal(query.searchParams.get('titles'),base.wikiTitle);assert.equal(query.searchParams.get('redirects'),'1');assert.equal(missing.calls[0].options.credentials,'omit');assert(missing.calls[0].options.signal);assert.equal(JSON.parse(missing.store.get(key)).entries[base.wikiTitle].url,thumb);
await show(missing,base);assert.equal(missing.calls.length,1,'Cached success must avoid a repeat API request');const reload=setup({responses:[],store:missing.store});await show(reload,base);assert.equal(kind(reload),'wikipedia');assert.equal(reload.calls.length,0,'localStorage cache must survive a page reload');
// Broken stored URLs fall through to Wikipedia; broken thumbnails can use the returned original URL.
const broken=setup({outcomes:{[stored]:false,[thumb]:false}});await show(broken,{...base,imageUrl:stored});assert.equal(kind(broken),'wikipedia');assert.deepEqual(broken.loads,[stored,thumb,original]);assert.equal(JSON.parse(broken.store.get(key)).entries[base.wikiTitle].url,original);
// Missing/disambiguation articles, no image, bad schemes, and obvious logos retain placeholders.
for(const pages of [[{missing:true}], [{pageprops:{disambiguation:''},thumbnail:{source:thumb}}], [{title:'No image'}], [{thumbnail:{source:'javascript:alert(1)'}}], [{...page,pageimage:'Franchise_logo.svg'}]]){
 const state=setup({responses:[response(pages)]});await show(state,base);assert.equal(kind(state),'placeholder');assert.equal(state.store.get(key),undefined);await show(state,base);assert.equal(state.calls.length,1,'Negative result must not hammer the API');
}
for(const reply of [new Error('offline'),{ok:false,status:503},{ok:true,status:200,json:async()=>{throw Error('invalid JSON');}},{ok:true,status:200,json:async()=>({error:{code:'maxlag'}})}]){const state=setup({responses:[reply]});await show(state,base);assert.equal(kind(state),'placeholder');}
const rate=setup({responses:[{ok:false,status:429,headers:{get:()=> '120'}}]});await show(rate,base);await show(rate,{...base,id:2,wikiTitle:'Other title'});assert.equal(rate.calls.length,1);assert.equal(rate.context.getImageLoadingStats().placeholder,2);
// An API timeout aborts the request; image timeouts terminate rather than looping.
const apiTimeout=setup({responses:[(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))]});const apiPending=show(apiTimeout,base);await flush();[...apiTimeout.timers.values()].find(t=>t.ms===8000).fn();await apiPending;assert.equal(kind(apiTimeout),'placeholder');
const imageTimeout=setup({outcomes:{[thumb]:'pending',[original]:false}});const waiting=show(imageTimeout,base);await flush();[...imageTimeout.timers.values()].find(t=>t.ms===10000).fn();await waiting;assert.equal(kind(imageTimeout),'placeholder');
const allBroken=setup({outcomes:{[stored]:false,[thumb]:false,[original]:false}});await show(allBroken,{...base,imageUrl:stored});assert.equal(kind(allBroken),'placeholder');assert.equal(allBroken.calls.length,1);assert.equal(allBroken.store.get(key),undefined);assert(credit(allBroken).includes('Stored author'));
// Cached failures are evicted and refreshed; storage corruption and quota failures are harmless.
const stale='https://upload.wikimedia.org/wikipedia/commons/a/ab/stale.jpg';const cache=new Map([[key,JSON.stringify({entries:{[base.wikiTitle]:{url:stale,source:page.fullurl,savedAt:Date.now()}}})]]);const refresh=setup({store:cache,outcomes:{[stale]:false}});await show(refresh,base);assert.equal(refresh.calls.length,1);assert.equal(kind(refresh),'wikipedia');
for(const options of [{storageError:true},{store:new Map([[key,'not json']])},{store:new Map([[key,JSON.stringify({entries:{[base.wikiTitle]:{url:thumb,savedAt:0}}})]])}]){const state=setup(options);await show(state,base);assert.equal(kind(state),'wikipedia');}
// Stale image and API completions must never replace the next card's portrait or credits.
const race=setup({outcomes:{[stored]:'pending'}});const old=show(race,{...base,imageUrl:stored});await flush();const current={...base,id:2,name:'Current subject',imageUrl:'https://example.org/current.jpg'};await show(race,current);await old;assert.equal(race.elements.get('portrait').src,current.imageUrl);assert(race.elements.get('portrait').alt.includes(current.name));assert.equal(race.calls.length,0);
let completeApi;const apiRace=setup({responses:[()=>new Promise(resolve=>completeApi=resolve)]});const oldRequest=show(apiRace,base);await flush();await show(apiRace,current);completeApi(response());await oldRequest;assert.equal(apiRace.elements.get('portrait').src,current.imageUrl);
// A failure after a successful preflight still reaches Wikipedia and refits attribution content.
const displayFailure=setup();await show(displayFailure,{...base,imageUrl:stored});displayFailure.elements.get('portrait').onerror();await flush();assert.equal(kind(displayFailure),'wikipedia');assert(displayFailure.fits>1);
console.log('PASS: stored-first loading, missing/broken-image Wikipedia fallbacks, persistent success caching, source/rights preservation, CORS, missing/ambiguous pages, API/network/JSON errors, rate limiting, timeouts, cache recovery, disabled storage, and stale-result protection.');
