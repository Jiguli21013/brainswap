import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const code = await fs.readFile(new URL('app.js',root),'utf8');
const data = JSON.parse(await fs.readFile(new URL('data/cards.json',root),'utf8'));
class Element {
  constructor(tagName='DIV') { this.tagName=tagName; this.style={}; this.children=[]; this.textContent=''; this.hidden=false; this.classList={remove(){},add(){}}; this.section={hidden:false}; }
  replaceChildren(...items) { this.children=items; }
  append(...items) { this.children.push(...items); }
  closest() { return this.section; }
  removeAttribute(name) { delete this[name]; }
}
async function boot(response, protocol='http:', hostname='localhost', search='') {
  const elements=new Map(); const errors=[];
  const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},createElement(tag){return new Element(tag.toUpperCase())},createTextNode(text){return {textContent:text}},addEventListener(type,fn){this.listener=fn}};
  const context=vm.createContext({document,URL,URLSearchParams,encodeURIComponent,location:{protocol,hostname,search},fetch:async path=>{assert.equal(path,'data/cards.json');return response},console:{error:e=>errors.push(String(e))}});
  vm.runInContext(code,context);
  for(let i=0;i<8;i++) await Promise.resolve();
  return {context,elements,document,errors};
}
const state=await boot({ok:true,json:async()=>data});
const seen=new Set();const names=[];
for(let index=0;index<594;index++) {
  if(index)vm.runInContext('next()',state.context);
  const card=vm.runInContext('history[position]',state.context);
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
assert.equal(seen.size,594);vm.runInContext('prev()',state.context);assert.equal(state.elements.get('name').textContent,names[592]);
vm.runInContext('next()',state.context);assert.equal(state.elements.get('name').textContent,names[593]);
vm.runInContext('next()',state.context);assert.notEqual(state.elements.get('name').textContent,names[593]);
let prevented=false;state.document.listener({key:'ArrowLeft',target:{tagName:'BODY'},preventDefault(){prevented=true}});assert(prevented);
assert.equal(state.elements.get('name').textContent,names[593]);
const previous=vm.runInContext('position',state.context);state.document.listener({key:'ArrowLeft',target:{tagName:'INPUT'}});assert.equal(vm.runInContext('position',state.context),previous);
const invalid=await boot({ok:true,json:async()=>data.slice(0,593)});assert(invalid.elements.get('next').disabled);assert.equal(invalid.errors.length,1);
const offline=await boot({ok:false,status:404},'file:');assert(offline.elements.get('bio').textContent.includes('local web server'));
assert.equal(vm.runInContext("safeUrl('javascript:alert(1)')",state.context),null);
console.log('PASS: all 594 cards render canonical fields; deck coverage, history, keyboard navigation, load failures and URL scheme checks.');

const fixture={...data[0],imageUrl:'https://example.org/candidate.jpg',imageSource:'https://en.wikipedia.org/wiki/Test',imageVerificationStatus:'not_verified',imageAttribution:null,imageIssue:{reason:'Rights unknown'}};
for (const [host,query,allowed] of [['localhost','?candidateImages=true',true],['127.0.0.1','?candidateImages=true',true],['[::1]','?candidateImages=true',true],['localhost','',false],['public.example','?candidateImages=true',false]]) {
  const preview=await boot({ok:true,json:async()=>data},'http:',host,query);
  preview.context.fixture=fixture;vm.runInContext('render(fixture)',preview.context);
  const portrait=preview.elements.get('portrait');assert.equal(portrait.src===fixture.imageUrl,allowed);
  if(allowed){assert(preview.elements.get('image-credit').children.some(x=>x.textContent?.includes('Unverified image candidate')));assert(preview.elements.get('image-credit').children.some(x=>x.textContent?.includes('Rights unknown')));portrait.onerror();assert(portrait.src.startsWith('data:image/svg+xml'));}
  preview.context.fixture={...fixture,imageUrl:'http://example.org/insecure.jpg'};vm.runInContext('render(fixture)',preview.context);assert(preview.elements.get('portrait').src.startsWith('data:image/svg+xml'));
}
console.log('PASS: candidate previews require explicit loopback opt-in, preserve warnings and source links, reject insecure URLs, and retain load-failure fallbacks.');
