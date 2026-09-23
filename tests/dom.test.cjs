const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root=require('node:path').join(__dirname, '..') + require('node:path').sep;
const pause=()=>new Promise(r=>setTimeout(r,20));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await pause()}throw Error('Timed out')}
async function open(file,search='',omit=''){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 class Local extends ResourceLoader{fetch(url){const u=new URL(url);const name=u.pathname.slice(1);if(name===omit)return Promise.resolve(Buffer.from(''));if(u.hostname==='example.org'&&fs.existsSync(root+name))return Promise.resolve(fs.readFileSync(root+name));return null}}
 const dom=new JSDOM(fs.readFileSync(root+file,'utf8'),{url:'https://example.org/'+file+search,runScripts:'dangerously',resources:new Local(),pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.scrollTo=()=>{};w.TextEncoder=TextEncoder;w.CanvasRenderingContext2D=function(){};w.print=()=>{w.printed=true};
  const canvases=new WeakMap();function canvas(el){let c=canvases.get(el);if(!c){c=createCanvas(el.width,el.height);canvases.set(el,c)}return c}
  w.HTMLCanvasElement.prototype.getContext=function(...args){return canvas(this).getContext(...args)};
  w.HTMLCanvasElement.prototype.toDataURL=function(...args){return canvas(this).toDataURL(...args)};
  const src=Object.getOwnPropertyDescriptor(w.HTMLImageElement.prototype,'src');
  Object.defineProperty(w.HTMLImageElement.prototype,'src',{get:src.get,set(value){src.set.call(this,value);if(value.startsWith('data:'))loadImage(value).then(()=>this.dispatchEvent(new w.Event('load'))).catch(()=>this.dispatchEvent(new w.Event('error')))}});
 }});
 await new Promise(r=>dom.window.addEventListener('load',r));return {dom,w:dom.window,d:dom.window.document,errors};
}
(async()=>{
 let x=await open('index.html','?node=B07');let {w,d}=x;
 assert.equal(d.querySelector('#screen-destination').hidden,false);
 assert.equal(d.querySelectorAll('.dest-btn').length,42);
 assert.equal(d.querySelectorAll('#manual-location-select option').length,72);
 d.querySelector('#destination-search').value='tham my';d.querySelector('#destination-search').dispatchEvent(new w.Event('input'));
 d.querySelector('.dest-btn').click();assert.equal(d.querySelector('#screen-directions').hidden,false);assert.match(d.querySelector('#directions-list').textContent,/trùng với đích/);assert.equal(d.querySelectorAll('#map-svg circle').length,1);
 d.querySelector('#btn-back-to-destinations').click();d.querySelector('#destination-search').value='cap cuu';d.querySelector('#destination-search').dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.dest-btn').length,1);d.querySelector('.dest-btn').click();assert.ok(d.querySelectorAll('#map-svg line').length>0);
 d.querySelector('#zoom-in').click();assert.match(d.querySelector('#map-stage').className,/zoom-2/);
 d.querySelector('#btn-route-change-origin').click();assert.equal(new URL(w.location.href).searchParams.get('node'),null);
 assert.equal(x.errors.length,0,x.errors.join('\n'));x.dom.window.close();
 console.log('PASS destination count, manual locations, no-accent search, same-origin route, SVG, zoom, URL reset');
 for(const id of ['B09','B14','B15','constructor','__proto__','missing']){x=await open('index.html','?node='+id);assert.equal(x.d.querySelector('#screen-no-location').hidden,false);assert.equal(x.d.querySelector('#scan-error').hidden,false);assert.equal(x.errors.length,0);x.dom.window.close()}
 console.log('PASS excluded locations and invalid/prototype QR IDs');
 x=await open('index.html','?node=B01_F3_5');({w,d}=x);d.querySelector('#destination-search').value='N1A tang 2';d.querySelector('#destination-search').dispatchEvent(new w.Event('input'));d.querySelector('.dest-btn').click();assert.match(d.querySelector('#directions-list').textContent,/xuống Tầng 2/);assert.equal(d.querySelector('.floor-tab[aria-pressed="true"]').textContent,'Tầng 3');assert.equal(x.errors.length,0);x.dom.window.close();
 console.log('PASS upper-floor initial tab and descending directions');
 x=await open('index.html','','map-data.js');assert.equal(x.d.querySelector('#boot-status').hidden,false);assert.match(x.d.querySelector('#boot-status').textContent,/Không thể tải/);x.dom.window.close();
 console.log('PASS missing-data user-visible failure');
 x=await open('admin.html');({w,d}=x);assert.equal(d.querySelector('#base-url-input').value,'https://example.org/index.html');assert.equal(d.querySelectorAll('#qr-location-select option').length,72);
 d.querySelector('#base-url-input').value='https://example.org/index.html?lang=vi#map';d.querySelector('#btn-generate').click();await until(()=>!d.querySelector('#btn-print').disabled || !d.querySelector('#qr-error').hidden);
 assert.equal(d.querySelector('#qr-error').hidden,true,d.querySelector('#qr-error').textContent);assert.equal(d.querySelectorAll('.qr-card').length,71);
 assert.equal(d.querySelectorAll('.qr-card img').length,71);const url=new URL(d.querySelector('.qr-meta a').href);assert.equal(url.searchParams.get('lang'),'vi');assert.equal(url.searchParams.get('node'),'G_1A');assert.equal(url.hash,'');
 for (const e of d.querySelectorAll('.qr-card')){assert.equal(e.querySelector('.qr-instruction').textContent,'Quét mã QR để tìm đường đi trong Bệnh viện');assert.ok(e.querySelector('.qr-meta').classList.contains('no-print'))}
 const image=d.querySelector('.qr-card img').src;
 const decodedImage=await loadImage(image), c=createCanvas(280,280), ctx=c.getContext('2d');
 ctx.fillStyle='white';ctx.fillRect(0,0,280,280);ctx.drawImage(decodedImage,20,20);
 const pixels=ctx.getImageData(0,0,280,280), qr=require('jsqr')(pixels.data,280,280);
 assert.ok(qr);assert.equal(qr.data,'https://example.org/index.html?lang=vi&node=G_1A');
 console.log('PASS QR PNG independent decoding');
 d.querySelector('#btn-print').click();assert.equal(w.printed,true);
 d.querySelector('#base-url-input').value='javascript:alert(1)';d.querySelector('#base-url-input').dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('#btn-print').disabled,true);assert.equal(d.querySelectorAll('.qr-card').length,0);d.querySelector('#btn-generate').click();await pause();assert.equal(d.querySelector('#qr-error').hidden,false);
 assert.equal(x.errors.length,0,x.errors.join('\n'));x.dom.window.close();
 console.log('PASS admin generates 71 local QR images, URL query handling, labels, print gate, invalid URL, stale print invalidation');
 x=await open('admin.html','','vendor/qrcode.min.js');x.d.querySelector('#btn-generate').click();await pause();assert.equal(x.d.querySelector('#btn-print').disabled,true);assert.match(x.d.querySelector('#qr-error').textContent,/Thiếu thư viện/);x.dom.window.close();
 console.log('PASS missing QR dependency fails safely');
})().catch(e=>{console.error(e);process.exitCode=1});
