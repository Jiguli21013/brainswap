import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const code = await fs.readFile(new URL('app.js',root),'utf8');
const imageCode = await fs.readFile(new URL('image-loader.js',root),'utf8');
const data = JSON.parse(await fs.readFile(new URL('data/cards.json',root),'utf8'));
class Element {
  constructor(tagName='DIV') { this.tagName=tagName; this.style={}; this.dataset={}; this.children=[]; this.textContent=''; this.hidden=false; this.classList={remove(){},add(){},toggle(){}}; this.section={hidden:false}; }
  replaceChildren(...items) { this.children=items; }
  append(...items) { this.children.push(...items); }
  replaceWith(node) { this.registry.set('portrait',node); node.registry=this.registry; }
  closest() { return this.section; }
  removeAttribute(name) { delete this[name]; }
}
async function boot(response, protocol='http:', hostname='localhost', search='') {
  const elements=new Map(); const errors=[]; const fitRequests=[];
  const document={getElementById(id){if(!elements.has(id)){const el=new Element();el.registry=elements;elements.set(id,el);}return elements.get(id)},createElement(tag){const el=new Element(tag.toUpperCase());el.registry=elements;return el;},createTextNode(text){return {textContent:text}},addEventListener(type,fn){this.listener=fn}};
  const store=new Map();
  class FakeImage extends Element { constructor(){super('IMG');this.registry=elements;this.naturalWidth=100;this.complete=false;} get src(){return this._src;} set src(value){this._src=value;if(value)queueMicrotask(()=>{this.complete=true;this.onload?.();});} }
  const context=vm.createContext({document,URL,URLSearchParams,Image:FakeImage,AbortController,setTimeout,clearTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},encodeURIComponent,scheduleViewportFit:()=>fitRequests.push(1),location:{protocol,hostname,search},fetch:async path=>path==='data/cards.json'?response:{ok:true,status:200,json:async()=>({query:{pages:[]}})},console:{error:e=>errors.push(String(e))}});
  vm.runInContext(imageCode,context);
  vm.runInContext(code,context);
  for(let i=0;i<8;i++) await Promise.resolve();
  return {context,elements,document,errors,fitRequests};
}
const state=await boot({ok:true,json:async()=>data});
const visibleData=data.filter(c=>![478,492].includes(c.id));
const visibleCount=visibleData.length;
assert.equal(visibleCount,592);
const seen=new Set();const names=[];
for(let index=0;index<visibleCount;index++) {
  if(index)vm.runInContext('next()',state.context);
  for(let turn=0;turn<12;turn++)await Promise.resolve();
  const card=vm.runInContext('history[position]',state.context);
  assert(![478,492].includes(card.id),'Excluded card displayed');
  assert(!seen.has(card.id),'Deck repeats before exhaustion');seen.add(card.id);names.push(card.name);
  assert.equal(state.elements.get('name').textContent,card.name);
  assert.equal(state.elements.get('question').textContent,card.question);
  assert.equal(state.elements.get('bio').textContent,card.biography||'');
  assert.deepEqual(state.elements.get('traits').children.map(c=>c.textContent),card.adjectives);
  for(const [element,field] of [['works','notableWorks'],['facts','interestingFacts']]) {
    assert.deepEqual(state.elements.get(element).children.map(c=>c.textContent),card[field]);
    assert.equal(state.elements.get(element).section.hidden,card[field].length===0);
  }
}
assert.equal(seen.size,visibleCount);assert(seen.has(496),'Grigori Rasputin must remain');assert.deepEqual([...seen].sort((a,b)=>a-b),visibleData.map(c=>c.id));vm.runInContext('prev()',state.context);assert.equal(state.elements.get('name').textContent,names[visibleCount-2]);
vm.runInContext('next()',state.context);assert.equal(state.elements.get('name').textContent,names[visibleCount-1]);
vm.runInContext('next()',state.context);assert.notEqual(state.elements.get('name').textContent,names[visibleCount-1]);
let prevented=false;state.document.listener({key:'ArrowLeft',target:{tagName:'BODY'},preventDefault(){prevented=true}});assert(prevented);
assert.equal(state.elements.get('name').textContent,names[visibleCount-1]);
const previous=vm.runInContext('position',state.context);state.document.listener({key:'ArrowLeft',target:{tagName:'INPUT'}});assert.equal(vm.runInContext('position',state.context),previous);
const invalid=await boot({ok:true,json:async()=>data.slice(0,593)});assert(invalid.elements.get('next').disabled);assert.equal(invalid.errors.length,1);
const offline=await boot({ok:false,status:404},'file:');assert(offline.elements.get('bio').textContent.includes('local web server'));
assert.equal(vm.runInContext("safeUrl('javascript:alert(1)')",state.context),null);
console.log('PASS: 592 visible cards render canonical fields; Putin and Hitler excluded, Rasputin retained; deck coverage, history, keyboard navigation, load failures and URL scheme checks.');

const fixture={...data[0],imageUrl:'https://example.org/candidate.jpg',imageSource:'https://en.wikipedia.org/wiki/Test',imageVerificationStatus:'not_verified',imageAttribution:null,imageIssue:{reason:'Rights unknown'}};
for (const host of ['localhost','public.example','owner.github.io']) {
  const preview=await boot({ok:true,json:async()=>data},'https:',host,'');
  preview.context.fixture=fixture;vm.runInContext('render(fixture)',preview.context);
  for(let i=0;i<12;i++)await Promise.resolve();
  const portrait=preview.elements.get('portrait');assert.equal(portrait.src,fixture.imageUrl);
  assert(preview.elements.get('image-credit').children.some(x=>x.textContent?.includes('Unverified stored image')));
  assert(preview.elements.get('image-credit').children.some(x=>x.textContent?.includes('Rights unknown')));
  assert(preview.elements.get('image-credit').children.some(x=>x.href===fixture.imageSource));
}
console.log('PASS: stored HTTPS images display regardless of verification status on localhost and GitHub Pages, with source links and existing rights warnings.');

assert(state.fitRequests.length>=visibleCount,'Card changes must request viewport fitting');
console.log('PASS: card changes and image-loading results trigger viewport refitting.');

for(let turn=0;turn<30;turn++)await Promise.resolve();
const simulatedImageStats=state.context.getImageLoadingStats();assert.equal(simulatedImageStats.stored,581);assert.equal(simulatedImageStats.placeholder,11);assert.equal(simulatedImageStats.wikipedia,0);assert.equal(simulatedImageStats.loading,0);
console.log('PASS: simulated full-deck image outcomes and unique-card counters: 581 stored, 0 Wikipedia, 11 placeholders (network mocked).');
