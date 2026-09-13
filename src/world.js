export const WORLD_HALF=108, FLOOR_HEIGHT=3.6, INCUBATION=25, REINFORCEMENTS=10;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CAMPS=[{x:0,z:-101},{x:101,z:0},{x:0,z:101},{x:-101,z:0}],CAMP=CAMPS[0];
export const BUILDINGS=[];
for(let row=0;row<6;row++)for(let col=0;col<6;col++){
 const id=row*6+col, floors=[3,4,8,3,9,4][(id+row)%6];
 BUILDINGS.push({id,x:-75+col*30,z:-75+row*30,w:18,d:20,floors,color:[0xf2a6bc,0x81d8e1,0xffcf75,0xb8b6e9,0xf7b599,0x9ad6c9][id%6],roof:0xe6f4ec,name:`${['โรส','อควา','ซันนี่','ไลแลค','พีช','มินต์'][id%6]} ${id+1}`});
}
export function insideHouse(x,z){const col=Math.round((x+75)/30),row=Math.round((z+75)/30);if(col<0||col>5||row<0||row>5)return -1;const b=BUILDINGS[row*6+col];return Math.abs(x-b.x)<9&&Math.abs(z-b.z)<10?b.id:-1;}
export const roomAt=(b,x,z)=>Math.abs(x-b.x)>4?(x<b.x?0:2)+(z>b.z?1:0):-1;
// All collision rectangles are also used to construct visible walls and furniture.
export function wallsFor(b,floor=0){const x=b.x,z=b.z;let a=[{x:x-9,z:z-10,w:18,d:.4},{x:x-9,z:z-10,w:.4,d:20},{x:x+8.6,z:z-10,w:.4,d:20}];
 if(floor===0)a.push({x:x-9,z:z+9.6,w:7.5,d:.4},{x:x+1.5,z:z+9.6,w:7.5,d:.4});else a.push({x:x-9,z:z+9.6,w:18,d:.4});
 if(floor<b.floors)for(const side of [-1,1]){const wx=x+side*4-.2;for(const [off,len] of [[-9.6,3.6],[-4,8],[6,3.6]])a.push({x:wx,z:z+off,w:.4,d:len,interior:true});a.push({x:side<0?x-8.6:x+4.2,z:z-.2,w:4.4,d:.4,interior:true});}
 return a;
}
export function furnitureFor(b,floor){if(floor===b.floors)return [{x:b.x+4,z:b.z-7,w:2,d:2,furniture:true},{x:b.x-7.15,z:b.z-7.15,w:2.3,d:2.3,furniture:true}];return [-1,1].flatMap(side=>[-1,1].map(end=>({x:b.x+side*6.8-1,z:b.z+end*7.5-.65,w:2,d:1.3,furniture:true})));}
export function doorTemplates(){let doors=[];for(const b of BUILDINGS){doors.push({building:b.id,floor:0,x:b.x,z:b.z+9.8,w:3,d:.4,exterior:true});for(let f=0;f<b.floors;f++)for(const side of [-1,1])for(const end of [-1,1])doors.push({building:b.id,floor:f,x:b.x+side*4,z:b.z+end*5,w:.4,d:2,exterior:false});}return doors.map((d,id)=>({...d,id,hp:100,maxHp:100,open:false,broken:false,closeAt:0}));}
export const OBSTACLES=[];
for(const b of BUILDINGS){OBSTACLES.push({x:b.x-11.6,z:b.z-8,w:.8,d:.8,tree:true});if(b.id%2===0)OBSTACLES.push({x:b.x+10.5,z:b.z+12,w:2,d:3.8,car:true});}
for(const c of CAMPS)for(const side of [-1,1])OBSTACLES.push({x:c.x+side*5-1,z:c.z-1,w:2,d:2,camp:true});
export function segmentBox(a,b,r,pad=0){let lo=0,hi=1;for(const axis of ['x','z']){let delta=b[axis]-a[axis],min=r[axis]-pad,max=r[axis]+(axis==='x'?r.w:r.d)+pad;if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{let u=(min-a[axis])/delta,v=(max-a[axis])/delta;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}return true;}
export const doorRect=d=>({x:d.x-d.w/2,z:d.z-d.d/2,w:d.w,d:d.d});
export function stairsFor(b,f){return {a:{x:b.x+(f%2?2:-2),z:b.z+(f%2?-6:6),floor:f},b:{x:b.x+(f%2?2:-2),z:b.z+(f%2?6:-6),floor:f+1}};}
