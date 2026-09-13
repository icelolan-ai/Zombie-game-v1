export const INCUBATION = 25;
export const WORLD_HALF = 68;
export const REINFORCEMENTS = 8;
export const CAMP = { x: 0, z: -63 };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const BUILDINGS = [
 {x:-25,z:-25,w:11,d:10,color:0xe5c6a5,roof:0xb87765,name:'บ้านสวน'},
 {x:-8,z:-26,w:10,d:9,color:0xe6d3b2,roof:0x87aaa2,name:'ร้านขายของ'},
 {x:18,z:-24,w:13,d:11,color:0xc6d2c8,roof:0x839caa,name:'สถานีตำรวจ'},
 {x:-28,z:-5,w:11,d:10,color:0xddc7aa,roof:0xc99f70,name:'บ้านริมทาง'},
 {x:25,z:-3,w:10,d:10,color:0xe5c6b6,roof:0xba8e81,name:'บ้านช่างไม้'},
 {x:-24,z:22,w:12,d:10,color:0xd0d7b5,roof:0x91aa87,name:'บ้านต้นไม้'},
 {x:-6,z:25,w:10,d:9,color:0xe5c8a9,roof:0xcb947d,name:'บ้านอบขนม'},
 {x:20,z:24,w:12,d:10,color:0xdfd2b5,roof:0x8ea5ad,name:'บ้านปลายซอย'},
 ...[[-48,-46],[-28,-48],[-8,-48],[15,-48],[37,-46],[49,-27],[49,-5],[48,18],[43,43],[21,48],[-3,49],[-27,46],[-48,28],[-49,5],[-49,-18]].map(([x,z],i)=>({x,z,w:9+i%3,d:8+i%2,color:[0xe4ceb7,0xd8d8b9,0xe5c4b6][i%3],roof:[0xbb9482,0x90a79b,0xc8aa7e,0x92a2ad][i%4],name:`บ้านดิน ${i+9}`}))
];
const dist2 = (a,b) => (a.x-b.x)**2+(a.z-b.z)**2;
const armed = e => e.role==='police'||e.role==='soldier';
export function insideHouse(x,z){return BUILDINGS.findIndex(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2);}
export function wallsFor(b){const x=b.x,z=b.z,w=b.w/2,d=b.d/2;return [
 {x:x-w,z:z-d,w:b.w,d:.5},{x:x-w,z:z-d,w:.5,d:b.d},{x:x+w-.5,z:z-d,w:.5,d:b.d},
 {x:x-w,z:z+d-.5,w:w-1.5,d:.5},{x:x+1.5,z:z+d-.5,w:w-1.5,d:.5}];}
function segmentBox(a,b,r,pad=0){let lo=0,hi=1;for(const axis of ['x','z']){let delta=b[axis]-a[axis],min=r[axis]-pad,max=r[axis]+(axis==='x'?r.w:r.d)+pad;if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{let u=(min-a[axis])/delta,v=(max-a[axis])/delta;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}return true;}
class Heap{
 constructor(){this.a=[];}
 push(n){let a=this.a,i=a.length;a.push(n);while(i>0){let p=(i-1)>>1;if(a[p].f<=n.f)break;a[i]=a[p];i=p;}a[i]=n;}
 pop(){let a=this.a,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return top;}
}
export class Simulation{
 constructor(seed=815,population=42){
  this.seed=seed>>>0;this.time=0;this.entities=[];this.walls=BUILDINGS.flatMap(wallsFor);
  this.wallCells=new Map();for(const w of this.walls)for(let x=Math.floor((w.x-1)/8);x<=Math.floor((w.x+w.w+1)/8);x++)for(let z=Math.floor((w.z-1)/8);z<=Math.floor((w.z+w.d+1)/8);z++){let k=`${x},${z}`;if(!this.wallCells.has(k))this.wallCells.set(k,[]);this.wallCells.get(k).push(w);}
  this.doors=BUILDINGS.map(b=>({x:b.x,z:b.z+b.d/2-.25,open:true,broken:false,hp:2}));
  this.events=[];this.nextId=0;this.converted=0;this.outcome='';this.playerId=0;this.reinforced=false;
  this.initialPopulation=clamp(Math.round(Number(population)||42),20,100);this.total=this.initialPopulation;
  this.pathBudget=2;this.pathCount=0;this.gridSize=WORLD_HALF*2+1;this.grid=new Uint8Array(this.gridSize**2);
  for(let z=-WORLD_HALF;z<=WORLD_HALF;z++)for(let x=-WORLD_HALF;x<=WORLD_HALF;x++)this.grid[this.key(x,z)]=this.walkable(x,z,.43,false)?1:0;
  this.create('zombie',-2,7,true);let guards=Math.max(4,Math.round(this.total*.17));
  for(let i=0;i<this.total;i++){
   let x,z;let guard=i>=this.total-guards;
   if(i<3){x=-5+i*3;z=12+i*2;}else if(guard){x=12+(i%5)*2;z=-15;}
   else if(i<BUILDINGS.length+3){let b=BUILDINGS[(i-3)%BUILDINGS.length];x=b.x;z=b.z;}
   else{do{x=this.random()*118-59;z=this.random()*116-58;}while(!this.walkable(x,z));}
   const e=this.create(guard?(i>=this.total-2?'soldier':'police'):'villager',x,z);
   if(guard){e.squad=Math.floor((i-(this.total-guards))/4);e.home=[2,4,10,18][e.squad%4];e.slot=(i-(this.total-guards))%4;}
  }
  this.rebuildSpatial();
 }
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 create(role,x,z,player=false){const hp=player?150:role==='soldier'?110:90;const e={id:this.nextId++,role,state:role==='zombie'?'zombie':'human',x,z,px:x,pz:z,angle:0,hp,maxHp:hp,infectAt:null,everConverted:false,cool:0,route:[],routeIndex:0,repath:0,goal:null,move:0,fear:.85+this.random()*.3,pose:0,thinkAt:this.time+this.random()*.35,targetId:null,squad:0,home:2,slot:0,behavior:'wander'};this.entities.push(e);return e;}
 get player(){return this.entities.find(e=>e.id===this.playerId);}
 key(x,z){return (z+WORLD_HALF)*this.gridSize+x+WORLD_HALF;}
 walkable(x,z,r=.38,doors=true){if(Math.abs(x)>WORLD_HALF-1-r||Math.abs(z)>WORLD_HALF-1-r)return false;for(const w of this.wallCells.get(`${Math.floor(x/8)},${Math.floor(z/8)}`)||[])if(x>w.x-r&&x<w.x+w.w+r&&z>w.z-r&&z<w.z+w.d+r)return false;if(doors)for(const d of this.doors)if(!d.open&&!d.broken&&Math.abs(x-d.x)<1.5+r&&Math.abs(z-d.z)<.25+r)return false;return true;}
 lineOfSight(a,b,pad=0,doors=true){for(const w of this.walls)if(segmentBox(a,b,w,pad))return false;if(doors)for(const d of this.doors)if(!d.open&&!d.broken&&segmentBox(a,b,{x:d.x-1.5,z:d.z-.25,w:3,d:.5},pad))return false;return true;}
 rebuildSpatial(){this.spatial=new Map();for(const e of this.entities){if(e.state==='dead')continue;let k=`${Math.floor(e.x/10)},${Math.floor(e.z/10)}`;if(!this.spatial.has(k))this.spatial.set(k,[]);this.spatial.get(k).push(e);}}
 nearest(e,range,predicate){let best=null,bestD=range*range;for(let x=Math.floor((e.x-range)/10);x<=Math.floor((e.x+range)/10);x++)for(let z=Math.floor((e.z-range)/10);z<=Math.floor((e.z+range)/10);z++)for(const n of this.spatial.get(`${x},${z}`)||[]){if(n.id===e.id||!predicate(n))continue;let d=dist2(e,n);if(d<bestD&&this.lineOfSight(e,n)){best=n;bestD=d;}}return best;}
 moveEntity(e,dx,dz){let ox=e.x,oz=e.z;if(this.walkable(e.x+dx,e.z))e.x+=dx;if(this.walkable(e.x,e.z+dz))e.z+=dz;e.move=Math.hypot(e.x-ox,e.z-oz);if(e.move>.0001)e.angle=Math.atan2(dx,dz);}
 infect(e,source){if(this.outcome||e.state!=='human')return false;e.state='infected';e.infectAt=this.time+INCUBATION;e.pose=.45;this.events.push({type:'bite',x:e.x,z:e.z,source});return true;}
 bite(a){if(this.outcome||!a||a.state!=='zombie'||a.cool>0)return false;let target=null,d=2.05**2;for(const e of this.entities){if(e.state!=='human')continue;let ds=dist2(a,e);if(ds<d&&this.lineOfSight(a,e)){d=ds;target=e;}}if(!target)return false;a.angle=Math.atan2(target.x-a.x,target.z-a.z);a.pose=.5;a.cool=1.1;return this.infect(target,a.id);}
 damage(e,amount,source){if(this.outcome||e.state==='dead')return;e.hp=Math.max(0,e.hp-amount);e.pose=.18;this.events.push({type:'hit',x:e.x,z:e.z,source});if(!e.hp){e.state='dead';e.infectAt=null;e.route=[];this.events.push({type:'death',x:e.x,z:e.z});}}
 interact(){let p=this.player;if(this.outcome||!p||p.state==='dead')return false;let d=this.doors.find(d=>dist2(d,p)<9);if(!d||d.broken)return false;d.open=!d.open;this.events.push({type:'door',x:d.x,z:d.z,open:d.open});return true;}
 path(a,b){
  const sx=Math.round(a.x),sz=Math.round(a.z),tx=Math.round(clamp(b.x,-66,66)),tz=Math.round(clamp(b.z,-66,66));
  const start=this.key(sx,sz),end=this.key(tx,tz),open=new Heap(),cost=new Map([[start,0]]),parent=new Map(),closed=new Set();open.push({x:sx,z:sz,k:start,g:0,f:0});let best=start,bestD=Infinity,nodes=0;
  while(open.a.length&&nodes++<1800){let n=open.pop();if(closed.has(n.k))continue;closed.add(n.k);let d=Math.hypot(n.x-tx,n.z-tz);if(d<bestD){bestD=d;best=n.k;}if(n.k===end)break;
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){let x=n.x+dx,z=n.z+dz;if(Math.abs(x)>66||Math.abs(z)>66)continue;let k=this.key(x,z);if(!this.grid[k]||closed.has(k)||(dx&&dz&&(!this.grid[this.key(n.x+dx,n.z)]||!this.grid[this.key(n.x,n.z+dz)])))continue;let g=n.g+(dx&&dz?1.414:1);if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);parent.set(k,n.k);open.push({x,z,k,g,f:g+Math.hypot(x-tx,z-tz)});}
  }
  let route=[],k=best;while(k!==start&&parent.has(k)){route.push({x:k%this.gridSize-WORLD_HALF,z:Math.floor(k/this.gridSize)-WORLD_HALF});k=parent.get(k);}return route.reverse();
 }
 navigate(e,goal,speed,dt){
  if(!goal||dist2(e,goal)<.12)return;
  for(const d of this.doors)if(!d.open&&!d.broken&&dist2(e,d)<5.3){if(e.state==='zombie'){d.hp-=dt;if(d.hp<=0){d.open=true;d.broken=true;this.events.push({type:'door',x:d.x,z:d.z,open:true});}}else d.open=true;}
  let next;
  if(this.lineOfSight(e,goal,.43,false))next=goal;
  else{e.repath-=dt;if(e.repath<=0&&this.pathBudget>0){this.pathBudget--;this.pathCount++;e.route=this.path(e,goal);e.routeIndex=0;e.repath=1.2+this.random()*.5;}next=e.route[e.routeIndex];if(next&&dist2(e,next)<.09){e.routeIndex++;next=e.route[e.routeIndex];}}
  if(!next)return;let dx=next.x-e.x,dz=next.z-e.z,len=Math.hypot(dx,dz);if(len<.001)return;let step=Math.min(speed*dt,len);this.moveEntity(e,dx/len*step,dz/len*step);
 }
 rally(e){let b=BUILDINGS[e.home]||BUILDINGS[2];return {x:b.x+[-.7,.7,-.7,.7][e.slot%4],z:b.z+b.d/2-1.7-Math.floor(e.slot/2)*1.1};}
 think(e){
  if(e.state==='zombie'){let n=this.nearest(e,18,n=>n.state==='human');e.targetId=n?.id??null;if(n){e.goal={x:n.x,z:n.z};e.behavior='hunt';}else if(e.behavior==='hunt'){e.behavior='search';}else this.wanderGoal(e);}
  else if(armed(e)){e.behavior='defend';e.goal=this.rally(e);e.targetId=this.nearest(e,19,n=>n.state==='zombie')?.id??null;}
  else{let n=this.nearest(e,11,n=>n.state==='zombie');if(n){let dx=e.x-n.x,dz=e.z-n.z,len=Math.hypot(dx,dz)||1;e.goal={x:clamp(e.x+dx/len*10,-64,64),z:clamp(e.z+dz/len*10,-64,64)};e.behavior='flee';}else this.wanderGoal(e);}
 }
 wanderGoal(e){if(!e.goal||dist2(e,e.goal)<2){if(this.random()<.5){let b=BUILDINGS[Math.floor(this.random()*BUILDINGS.length)];e.goal={x:b.x,z:b.z};}else{let x,z;do{x=this.random()*120-60;z=this.random()*120-60;}while(!this.walkable(x,z));e.goal={x,z};}e.repath=0;}e.behavior='wander';}
 spawnReinforcements(){if(this.reinforced)return;this.reinforced=true;this.total+=REINFORCEMENTS;for(let i=0;i<REINFORCEMENTS;i++){let e=this.create('soldier',CAMP.x+(i%4-1.5)*1.6,CAMP.z-Math.floor(i/4)*1.5);e.home=i<4?2:10;e.slot=i%4;e.squad=10+Math.floor(i/4);e.behavior='defend';e.goal=this.rally(e);e.thinkAt=this.time;}this.events.push({type:'reinforcements',count:REINFORCEMENTS,x:CAMP.x,z:CAMP.z});}
 step(dt,input={x:0,z:0,bite:false}){
  if(this.outcome)return;this.time+=dt;this.pathBudget=2;this.pathCount=0;
  for(const e of this.entities){e.px=e.x;e.pz=e.z;e.cool=Math.max(0,e.cool-dt);e.pose=Math.max(0,e.pose-dt);e.move=0;if(e.state==='infected'&&this.time+1e-8>=e.infectAt){e.state='zombie';e.infectAt=null;e.everConverted=true;this.converted++;e.goal=null;e.route=[];e.thinkAt=0;this.events.push({type:'convert',x:e.x,z:e.z});}}
  if(!this.reinforced&&this.entities.filter(e=>e.state==='zombie').length>10)this.spawnReinforcements();
  let p=this.player;if(p?.state==='dead'){let next=this.entities.find(e=>e.state==='zombie');if(next){this.playerId=next.id;p=next;this.events.push({type:'transfer'});}}
  this.rebuildSpatial();
  // Rotate the processing start so the bounded path budget is fair across a large crowd.
  const start=Math.floor(this.time*20)%this.entities.length;
  for(let i=0;i<this.entities.length;i++){
   const e=this.entities[(i+start)%this.entities.length];if(e.state==='dead')continue;
   if(e.id===this.playerId&&e.state==='zombie'){let len=Math.hypot(input.x,input.z);if(len>.01)this.moveEntity(e,input.x/Math.max(1,len)*5.4*dt,input.z/Math.max(1,len)*5.4*dt);if(input.bite)this.bite(e);continue;}
   if(e.state==='infected'&&e.infectAt-this.time<3)continue;
   if(this.time>=e.thinkAt){this.think(e);e.thinkAt=this.time+.3+this.random()*.12;}
   const target=e.targetId===null?null:this.entities.find(n=>n.id===e.targetId);
   if(e.state==='zombie'){
    if(target?.state==='human'){e.goal={x:target.x,z:target.z};if(dist2(e,target)<4.2)this.bite(e);}
    this.navigate(e,e.goal,e.behavior==='hunt'?3.1:1.65,dt);
   }else if(armed(e)){
    this.navigate(e,e.goal,2.8,dt);
    if(target?.state==='zombie'&&dist2(e,target)<225&&this.lineOfSight(e,target)){e.angle=Math.atan2(target.x-e.x,target.z-e.z);if(e.cool<=0){e.cool=e.role==='soldier'?1.15:1.7;this.events.push({type:'shot',x:e.x,z:e.z,tx:target.x,tz:target.z});if(this.random()<.7)this.damage(target,e.role==='soldier'?12:9,e.id);}}
   }else this.navigate(e,e.goal,e.behavior==='flee'?(e.state==='infected'?2.6:3.5)*e.fear:1.5,dt);
  }
  if(this.converted>=this.total){this.outcome='win';this.events.push({type:'win'});}
  else if(!this.entities.some(e=>e.state==='zombie'||e.state==='infected')){this.outcome='lose';this.events.push({type:'lose'});}
 }
 snapshot(){return {version:2,seed:this.seed,time:this.time,entities:this.entities.map(e=>({...e,route:[]})),doors:this.doors.map(d=>({...d})),playerId:this.playerId,converted:this.converted,total:this.total,initialPopulation:this.initialPopulation,reinforced:this.reinforced,nextId:this.nextId,outcome:this.outcome};}
 static restore(data){
  const legacy=data?.version===1;
  if(!data||(!legacy&&data.version!==2)||!Array.isArray(data.entities)||data.entities.length<21||data.entities.length>109||!Array.isArray(data.doors)||data.doors.length!==(legacy?8:BUILDINGS.length)||!Number.isFinite(data.time)||data.time<0)throw Error('รูปแบบไฟล์เซฟไม่ถูกต้อง');
  const initial=legacy?42:data.initialPopulation,reinforced=legacy?false:data.reinforced;
  if(!Number.isInteger(initial)||initial<20||initial>100||typeof reinforced!=='boolean'||data.total!==initial+(reinforced?REINFORCEMENTS:0)||data.entities.length!==data.total+1)throw Error('ข้อมูลประชากรไม่ถูกต้อง');
  const ids=new Set();for(const e of data.entities){if(!Number.isInteger(e.id)||ids.has(e.id)||!['human','infected','zombie','dead'].includes(e.state)||!['villager','police','soldier','zombie'].includes(e.role)||![e.x,e.z,e.hp,e.maxHp,e.cool,e.angle,e.fear].every(Number.isFinite)||Math.abs(e.x)>67||Math.abs(e.z)>67||e.hp<0||e.maxHp<=0||e.hp>e.maxHp||e.fear<=0||e.fear>3||(e.state==='infected'&&!Number.isFinite(e.infectAt)))throw Error('ข้อมูลตัวละครไม่ถูกต้อง');ids.add(e.id);}
  if(!ids.has(data.playerId)||!Number.isInteger(data.converted)||data.converted!==data.entities.filter(e=>e.everConverted).length||!Number.isFinite(data.seed))throw Error('ข้อมูลรอบเกมไม่ถูกต้อง');
  for(let i=0;i<data.doors.length;i++){let d=data.doors[i],b=BUILDINGS[i];if(d.x!==b.x||d.z!==b.z+b.d/2-.25||typeof d.open!=='boolean'||typeof d.broken!=='boolean')throw Error('ข้อมูลประตูไม่ถูกต้อง');}
  let s=new Simulation(data.seed,initial);Object.assign(s,{time:data.time,playerId:data.playerId,converted:data.converted,total:data.total,initialPopulation:initial,reinforced,nextId:Math.max(...ids)+1,outcome:['win','lose'].includes(data.outcome)?data.outcome:''});s.seed=data.seed;
  s.entities=data.entities.map(e=>({...e,px:e.x,pz:e.z,route:[],routeIndex:0,repath:0,goal:null,pose:0,move:0,thinkAt:s.time+(e.id%8)*.04,targetId:null,home:Number.isInteger(e.home)&&BUILDINGS[e.home]?e.home:2,slot:Number.isInteger(e.slot)?Math.abs(e.slot)%4:e.id%4,squad:Number.isInteger(e.squad)?e.squad:0,behavior:'wander'}));
  data.doors.forEach((d,i)=>s.doors[i]={...d,hp:Number.isFinite(d.hp)?clamp(d.hp,0,2):2});s.rebuildSpatial();return s;
 }
}
