import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code = await fs.readFile(new URL('../viewport-fit.js', import.meta.url), 'utf8');
const callbacks = new Map();
const frames = [];
const viewport = {clientWidth:1920,clientHeight:1080};
let extraContent = 0;
const shell = {
  dataset:{},style:{setProperty(name,value){this[name]=value;}},
  get offsetWidth(){return Math.round(Number(this.style.width.replace('px','')));},
  get offsetHeight(){return (this.dataset.layout==='stacked'?1100:this.offsetWidth<1200?850:700)+extraContent;}
};
const context = vm.createContext({document:{querySelector:s=>s==='.viewport'?viewport:s==='.shell'?shell:null},window:{addEventListener:(type,callback)=>callbacks.set(type,callback)},requestAnimationFrame:callback=>{frames.push(callback);return frames.length;}});
vm.runInContext(code,context);
const flush = () => {assert.equal(frames.length,1,'Fit requests must coalesce into one animation frame');frames.shift()();};
const assertFit = () => {
  const scale=Number(shell.dataset.fitScale);
  assert(scale>0&&scale<=1);
  assert(shell.offsetWidth*scale<=viewport.clientWidth+0.1);
  assert(shell.offsetHeight*scale<=viewport.clientHeight+0.1);
  assert.equal(shell.dataset.fit,'ready');
};
context.scheduleViewportFit();context.scheduleViewportFit();flush();assertFit();assert.equal(Number(shell.dataset.fitScale),1);
for(const [width,height] of [[1440,900],[1366,768],[1280,800],[1280,720],[1024,768],[768,1024],[390,844]]){
  viewport.clientWidth=width;viewport.clientHeight=height;callbacks.get('resize')();flush();assertFit();
}
assert.equal(shell.dataset.layout,'stacked');
const before=Number(shell.dataset.fitScale);extraContent=600;context.scheduleViewportFit();flush();assertFit();assert(Number(shell.dataset.fitScale)<before,'Longer content must trigger a smaller fit');
extraContent=0;viewport.clientWidth=1920;viewport.clientHeight=1080;callbacks.get('resize')();flush();assertFit();assert.equal(Number(shell.dataset.fitScale),1,'Scale must restore on window expansion');
context.window.visualViewport={width:390,height:600,offsetLeft:20,offsetTop:30};context.scheduleViewportFit();flush();assert(Number(shell.dataset.fitScale)*shell.offsetHeight<=600);assert.equal(shell.style.left,'215px');assert.equal(shell.style.top,'330px');
console.log('PASS: uniform width/height fitting, resize recovery, long-content refitting, coalesced requests, and visual viewport bounds.');
