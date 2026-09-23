'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({URL, console});
for (const file of ['map-image.js', 'map-data.js', 'navigation-core.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const {api, map, directory, image} = vm.runInContext('({api:HospitalNavigation,map:HOSPITAL_MAP,directory:BUILDING_DIRECTORY,image:MAP_IMAGE})', context);
const engine = api.create(map, directory, image);
const clone = data => JSON.parse(JSON.stringify(data));
test('B09/B14/B15 remain disconnected, excluded from routing and QR', () => {
  for (const id of ['B09','B14','B15']) {
    assert.equal(map.nodes.find(n=>n.id===id).routingEnabled, false);
    assert.equal(map.edges.some(e=>e.from===id || e.to===id), false);
    assert.equal(engine.isSupported(id), false);
    assert.equal(engine.qrNodes.some(n=>n.id===id), false);
    assert.equal(engine.findPath('G_1A',id).status,'unsupported');
  }
});
test('all supported QR-to-destination routes exist and never traverse restricted destinations', () => {
  let normal=0, same=0;
  for (const origin of engine.qrNodes) for(const dest of engine.destinations.filter(d=>engine.isSupported(d.targetId))) {
    const result=engine.findPath(origin.id,dest.targetId);
    assert.ok(['ok','same'].includes(result.status), origin.id+' -> '+dest.targetId);
    if (result.status==='same') {same++; assert.equal(result.steps.length,0); assert.equal(result.cost,0);}
    else { normal++; assert.equal(result.steps[0].from,origin.id); assert.equal(result.steps.at(-1).to,dest.targetId); }
    result.steps.slice(1).forEach(s=>assert.ok(engine.canTransit(s.from),s.from));
    assert.ok(engine.directions(result,dest).length);
  }
  assert.equal(normal,2952); assert.equal(same,30);
});
test('screen coordinates yield correct left/right turns',()=>{
  assert.equal(api.turnLabel(0,Math.PI/2),'Rẽ phải');
  assert.equal(api.turnLabel(0,-Math.PI/2),'Rẽ trái');
  assert.equal(api.turnLabel(Math.PI/2,0),'Rẽ trái');
  assert.equal(api.turnLabel(-Math.PI/2,0),'Rẽ phải');
  assert.equal(api.turnLabel(0,0),'Đi thẳng');
  assert.equal(api.turnLabel(0,Math.PI),'Quay lại');
});
test('every vertical edge reports the actual destination floor in either direction',()=>{
  for(const edge of map.edges.filter(e=>e.isElevator)) for(const [from,to] of [[edge.from,edge.to],[edge.to,edge.from]]) {
    const a=engine.nodes.get(from),b=engine.nodes.get(to);
    const step=engine.adjacency.get(from).find(e=>e.to===to);
    const lines=engine.directions({status:'ok',start:from,end:to,steps:[step]}, {desc:'Đích kiểm thử',floor:b.floor});
    assert.ok(lines.some(l=>l.text.includes(`${b.floor>a.floor?'lên':'xuống'} Tầng ${b.floor} (từ Tầng ${a.floor})`)));
  }
});
test('same-node selection is valid, invalid/prototype IDs are rejected',()=>{
  assert.equal(engine.findPath('B07','B07').status,'same');
  for(const id of ['constructor','__proto__','toString','missing','']) assert.equal(engine.findPath(id,'B07').status,'invalid');
});
test('Vietnamese search and QR URLs with existing query/hash',()=>{
  assert.ok(engine.destinations.some(d=>d.searchText.includes(api.normalize('cap cuu'))));
  assert.equal(api.normalize('ĐƯỜNG đi'),'duong di');
  const url=new URL(api.buildQrUrl('https://example.org/index.html?lang=vi&node=OLD#map','B07'));
  assert.equal(url.searchParams.get('lang'),'vi'); assert.equal(url.searchParams.get('node'),'B07'); assert.equal(url.searchParams.getAll('node').length,1); assert.equal(url.hash,'');
  for(const base of ['javascript:alert(1)','file:///tmp/index.html','https://user:pass@example.org/','invalid']) assert.throws(()=>api.buildQrUrl(base,'B07'));
});
test('invalid data fails early rather than producing partial routes',()=>{
  const cases=[];
  let m=clone(map);m.nodes.push(m.nodes[0]);cases.push(m);
  m=clone(map);m.edges.push({from:'missing',to:'B07'});cases.push(m);
  m=clone(map);m.edges[0].weight=-1;cases.push(m);
  m=clone(map);m.nodes[0].x=NaN;cases.push(m);
  m=clone(map);m.edges.push({...m.edges[0]});cases.push(m);
  for(const m of cases) assert.throws(()=>api.create(m,directory,image));
  assert.throws(()=>api.create(map,{B07:[{desc:'bad',nodeId:'missing'}]},image));
});
test('no fallback through forbidden rooms; supports one-way and disabled edges',()=>{
  const tiny={nodes:[{id:'A',name:'A',x:0,y:0,floor:1,isGate:true},{id:'R',name:'R',x:1,y:1,floor:1,isDestination:true,isTransitPoint:false},{id:'B',name:'B',x:2,y:2,floor:1,isGate:true}],edges:[{from:'A',to:'R'},{from:'R',to:'B'}]};
  assert.equal(api.create(tiny,{},image).findPath('A','B').status,'unreachable');
  tiny.nodes[1].isTransitPoint=true;tiny.edges[0].oneWay=true;
  let e=api.create(tiny,{},image);assert.equal(e.findPath('A','B').status,'ok');assert.equal(e.findPath('B','A').status,'unreachable');
  tiny.edges[0].enabled=false;e=api.create(tiny,{},image);assert.equal(e.findPath('A','B').status,'unsupported');
});

test('one-way terminal nodes remain valid destinations',()=>{
  const m={nodes:[{id:'A',name:'A',x:1,y:1,floor:1,isGate:true},{id:'B',name:'B',x:2,y:2,floor:1,isDestination:true}],edges:[{from:'A',to:'B',oneWay:true}]};
  const e=api.create(m,{},image);assert.equal(e.findPath('A','B').status,'ok');assert.equal(e.findPath('B','A').status,'unreachable');
});
