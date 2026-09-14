export const WORLD_HALF=144, FLOOR_HEIGHT=3.6, INCUBATION=25, REINFORCEMENTS=10;
export const FARMS=[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*105,z:z*105,w:22,d:22,name:'ไร่ข้าวโพด'})));
export const PARKS=[{x:-105,z:-15},{x:105,z:15},{x:-15,z:-105},{x:15,z:105}].map((p,id)=>({...p,id,w:24,d:24,name:'สวนดินปั้น '+(id+1)}));
export function inCornfield(x,z){return FARMS.some(p=>Math.abs(x-p.x)<p.w/2&&Math.abs(z-p.z)<p.d/2);}
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CAMPS=[{x:0,z:-137},{x:137,z:0},{x:0,z:137},{x:-137,z:0}],CAMP=CAMPS[0];
export const BUILDINGS=[];
for(let row=0;row<6;row++)for(let col=0;col<6;col++){
 const id=row*6+col, floors=[3,4,8,3,9,4][(id+row)%6];
 BUILDINGS.push({id,x:-75+col*30,z:-75+row*30,w:18,d:20,floors,color:[0xf2a6bc,0x81d8e1,0xffcf75,0xb8b6e9,0xf7b599,0x9ad6c9][id%6],roof:0xe6f4ec,name:`${['โรส','อควา','ซันนี่','ไลแลค','พีช','มินต์'][id%6]} ${id+1}`});
}
export const VILLAGES=[{name:'หมู่บ้านสวนเหนือ',plots:[[-75,-105],[-45,-105],[45,-105],[75,-105]]},{name:'หมู่บ้านริมทุ่ง',plots:[[105,-75],[105,-45],[105,45],[105,75]]},{name:'หมู่บ้านดอกไม้',plots:[[-75,105],[-45,105],[45,105],[75,105]]},{name:'หมู่บ้านป่าสน',plots:[[-105,-75],[-105,-45],[-105,45],[-105,75]]}];
for(const [v,village] of VILLAGES.entries())for(const [i,[x,z]] of village.plots.entries())BUILDINGS.push({id:BUILDINGS.length,x,z,w:18,d:20,floors:1+i%2,kind:'house',village:v,fenced:true,color:[0xf5c4b2,0xc7ddb1,0xf4dca4,0xc4dbe5][v],roof:[0xbc8278,0x7da58e,0xc7956e,0x8e9cb8][v],name:`${village.name} ${i+1}`});
const buildingCells=new Map(BUILDINGS.map(b=>[`${Math.round((b.x+75)/30)},${Math.round((b.z+75)/30)}`,b]));
export function insideHouse(x,z){const b=buildingCells.get(`${Math.round((x+75)/30)},${Math.round((z+75)/30)}`);return b&&Math.abs(x-b.x)<9&&Math.abs(z-b.z)<10?b.id:-1;}
export function fencesFor(b){return [{x:b.x-12.5,z:b.z-13,w:25,d:.3},{x:b.x-12.5,z:b.z-13,w:.3,d:26},{x:b.x+12.2,z:b.z-13,w:.3,d:26},{x:b.x-12.5,z:b.z+12.7,w:10.8,d:.3},{x:b.x+1.7,z:b.z+12.7,w:10.8,d:.3}].map(r=>({...r,fence:true}));}
export const roomAt=(b,x,z)=>Math.abs(x-b.x)>4?(x<b.x?0:2)+(z>b.z?1:0):-1;
// All collision rectangles are also used to construct visible walls and furniture.
export function wallsFor(b,floor=0){const x=b.x,z=b.z;let a=[{x:x-9,z:z-10,w:18,d:.4},{x:x-9,z:z-10,w:.4,d:20},{x:x+8.6,z:z-10,w:.4,d:20}];
 if(floor===0||floor===b.floors)a.push({x:x-9,z:z+9.6,w:7.5,d:.4},{x:x+1.5,z:z+9.6,w:7.5,d:.4});else a.push({x:x-9,z:z+9.6,w:18,d:.4});
 if(floor<b.floors)for(const side of [-1,1]){const wx=x+side*4-.2;for(const [off,len] of [[-9.6,3.6],[-4,8],[6,3.6]])a.push({x:wx,z:z+off,w:.4,d:len,interior:true});a.push({x:side<0?x-8.6:x+4.2,z:z-.2,w:4.4,d:.4,interior:true});}
 return a;
}
export function furnitureFor(b,floor){if(floor===b.floors)return [{x:b.x+4,z:b.z-7,w:2,d:2,furniture:true},{x:b.x-7.15,z:b.z-7.15,w:2.3,d:2.3,furniture:true}];return [-1,1].flatMap(side=>[-1,1].map(end=>({x:b.x+side*6.8-1,z:b.z+end*7.5-.65,w:2,d:1.3,furniture:true})));}
export function doorTemplates(){let doors=[];for(const b of BUILDINGS){doors.push({building:b.id,floor:0,x:b.x,z:b.z+9.8,w:3,d:.4,exterior:true});for(let f=0;f<b.floors;f++)for(const side of [-1,1])for(const end of [-1,1])doors.push({building:b.id,floor:f,x:b.x+side*4,z:b.z+end*5,w:.4,d:2,exterior:false});}for(const b of BUILDINGS)if(b.fenced)doors.push({building:b.id,floor:0,x:b.x,z:b.z+12.85,w:3.4,d:.3,exterior:true,gate:true});return doors.map((d,id)=>({...d,id,hp:100,maxHp:100,open:false,broken:false,closeAt:0}));}
export const OBSTACLES=[];
for(const b of BUILDINGS){OBSTACLES.push({x:b.x-11.6,z:b.z-8,w:.8,d:.8,tree:true});if(b.kind!=='house'&&b.id%2===0)OBSTACLES.push({x:b.x+10.5,z:b.z+12,w:2,d:3.8,car:true});}
for(const c of CAMPS)for(const side of [-1,1])OBSTACLES.push({x:c.x+side*5-1,z:c.z-1,w:2,d:2,camp:true});
export function segmentBox(a,b,r,pad=0){let lo=0,hi=1;for(const axis of ['x','z']){let delta=b[axis]-a[axis],min=r[axis]-pad,max=r[axis]+(axis==='x'?r.w:r.d)+pad;if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{let u=(min-a[axis])/delta,v=(max-a[axis])/delta;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}return true;}
export const doorRect=d=>({x:d.x-d.w/2,z:d.z-d.d/2,w:d.w,d:d.d});
export function stairsFor(b,f){return {a:{x:b.x+(f%2?2:-2),z:b.z+(f%2?-6:6),floor:f},b:{x:b.x+(f%2?2:-2),z:b.z+(f%2?6:-6),floor:f+1}};}

// Raised park terraces have sloped approaches; simulation and mesh share this surface.
export const TERRACES=[...[-1,1].flatMap(side=>[-60,-20,20,60].map((z,i)=>({x:side*134,z,w:12,d:20,h:1.4+(i%3)*.6}))),...[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*120,z:z*120,w:28,d:28,h:2.4})))];
export function groundHeight(x,z){let y=0;for(const p of TERRACES){const a=clamp((p.w/2-Math.abs(x-p.x))/2,0,1),b=clamp((p.d/2-Math.abs(z-p.z))/2,0,1);y=Math.max(y,p.h*a*b);}return y;}
for(const b of BUILDINGS){for(const z of [-3,4])OBSTACLES.push({x:b.x-11.6,z:b.z+z,w:.8,d:.8,tree:true});OBSTACLES.push({x:b.x-6.5,z:b.z+11.5,w:2.6,d:.85,bench:true});OBSTACLES.push({x:b.x+11,z:b.z-7.5,w:.45,d:.45,lamp:true});}

export const transportFor=c=>({x:c.x+(c.x===0?6:0),z:c.z+(c.x===0?0:6)});
for(const c of CAMPS){const p=transportFor(c);OBSTACLES.push({x:p.x-1.25,z:p.z-2.25,w:2.5,d:4.5,truck:true});}

for(const b of BUILDINGS)if(b.fenced)OBSTACLES.push(...fencesFor(b));
for(const f of FARMS)for(const [dx,dz] of [[-7,-7],[7,-7]])OBSTACLES.push({x:f.x+dx-1,z:f.z+dz-.7,w:2,d:1.4,hay:true});
// Solid props and pond banks share collision rectangles with their rendered shapes.
for(const p of PARKS){
 OBSTACLES.push({x:p.x+2,z:p.z-6,w:6,d:4.5,pond:true});
 for(const z of [-7,7])OBSTACLES.push({x:p.x-7,z:p.z+z,w:2.6,d:.85,bench:true,park:true});
 for(const [dx,dz] of [[-9,-9],[-9,9],[9,9]])OBSTACLES.push({x:p.x+dx-.4,z:p.z+dz-.4,w:.8,d:.8,tree:true,park:true});
 OBSTACLES.push({x:p.x-2,z:p.z+8,w:.45,d:.45,lamp:true,park:true});
}
for(const x of [-90,-30,30,90])for(const z of [-90,-30,30,90])OBSTACLES.push({x:x+4.5,z:z+4.5,w:.5,d:.5,traffic:true});
for(const b of BUILDINGS){
 if(b.id%6===1)OBSTACLES.push({x:b.x+10.6,z:b.z+2,w:1.35,d:1.35,phone:true});
 OBSTACLES.push({x:b.x+5,z:b.z+11.2,w:.7,d:.7,bin:true});
 if(b.kind==='house')OBSTACLES.push({x:b.x+3,z:b.z+11.3,w:1.1,d:.8,planter:true});
}
// Forest belts leave street lanes, entrances and fenced plots unobstructed.
let forestSeed=391;const forestRandom=()=>{forestSeed=(forestSeed*16807)%2147483647;return forestSeed/2147483647;};
for(let x=-138;x<=138;x+=9)for(let z=-138;z<=138;z+=9){const px=x+(forestRandom()-.5)*3,pz=z+(forestRandom()-.5)*3;if(Math.abs(px)<90&&Math.abs(pz)<90)continue;if(inCornfield(px,pz)||PARKS.some(p=>Math.abs(px-p.x)<13&&Math.abs(pz-p.z)<13))continue;if(Math.abs(px-Math.round(px/30)*30)<4.8||Math.abs(pz-Math.round(pz/30)*30)<4.8)continue;if(BUILDINGS.some(b=>Math.abs(px-b.x)<14&&Math.abs(pz-b.z)<15)||CAMPS.some(c=>Math.hypot(px-c.x,pz-c.z)<12))continue;OBSTACLES.push({x:px-.35,z:pz-.35,w:.7,d:.7,tree:true,forest:true});}
