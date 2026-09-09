import test from "node:test";import assert from "node:assert/strict";
import {createFlush,loadUiModule} from "./react-harness.mjs";
createFlush();const {ViewportIndex,focusLayout}=loadUiModule("src/components/encyclopedia/map-space.ts");
test("viewport query matches brute force across negative and positive positions",()=>{
 const items=Array.from({length:3000},(_,i)=>({id:String(i),x:(i%60)*50-1000,y:Math.floor(i/60)*70-800,w:35,h:55,scale:i%3?1:0.1}));
 const index=new ViewportIndex(items);
 for(const b of [{x:-500,y:-400,w:390,h:844},{x:950,y:400,w:700,h:500}]){
 const expected=items.filter(n=>n.scale>=.5&&n.x<=b.x+b.w&&n.x+n.w>=b.x&&n.y<=b.y+b.h&&n.y+n.h>=b.y).map(n=>n.id).sort();
 assert.deepEqual(index.query(b,.5).map(n=>n.id).sort(),expected);
 }});
test("large offscreen collection stays out of the drawn set",()=>{
 const items=Array.from({length:100000},(_,i)=>({id:String(i),x:(i%400)*300,y:Math.floor(i/400)*400,w:240,h:300,scale:1}));
 const index=new ViewportIndex(items);assert.ok(index.query({x:0,y:0,w:390,h:844}).length<12);
});
test("focus projection preserves identities and the unfocused layout",()=>{
 const cell=id=>({id,name:id,description:"",maps:[],broader:[],relations:[],studies:[],manifestations:[],sources:[],questions:[],provenance:{basis:"recollected",note:"test"},state:"Draft"});
 const cells=[cell("root"),cell("child")];const plates=cells.map((cell,i)=>({kind:"plate",id:cell.id,cell,x:i*1000,y:0,w:232,h:180,scale:1,level:0}));
 const base={plates,satellites:[],byId:new Map(plates.map(p=>[p.id,p])),regions:[],bounds:{x:0,y:0,w:1200,h:300},topBounds:{x:0,y:0,w:1200,h:300},topCentre:{x:0,y:0}};
 const index={neighbours:()=>[{cell:cells[1],via:"narrower"}]};
 assert.equal(focusLayout(base,index,null,14),base);
 const flat=focusLayout(base,index,"root",0),depth=focusLayout(base,index,"root",22);
 assert.deepEqual(depth.plates.map(p=>p.id),["root","child"]);assert.equal(base.plates[0].w,232);
 assert.ok(depth.byId.get("root").w>depth.byId.get("child").w);assert.notEqual(flat.byId.get("child").x,depth.byId.get("child").x);
});