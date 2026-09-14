import {BUILDINGS,OBSTACLES,CAMPS,WORLD_HALF,insideHouse,groundHeight} from './world.js?v=0.7';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=e=>({x:e.x,z:e.z,floor:e.floor||0});
const guard=e=>e.role==='police'||e.role==='soldier';
const alive=e=>e&&(e.state==='human'||e.state==='infected');
const hash=(id,salt)=>(((Math.imul(id+1,1597334677)^Math.imul(salt,3812015801))>>>0)%1000)/1000;
export function traits(id,role){return {courage:hash(id,1),empathy:hash(id,2),teamwork:hash(id,3),familyId:role==='villager'?Math.floor((id-1)/3):-1,lastSeen:null,searchUntil:0,searchStepAt:0,heardId:-1,callUntil:0,callPoint:null,aboardEvent:null};}

export const citySystems={
 initCity(){
  this.noises=[];this.noiseId=0;this.roarReadyAt=0;this.nextCityEventAt=65;this.cityEvent=null;this.lastCityEvent='';this.cityEventSerial=0;this.escaped=0;
  this.cars=OBSTACLES.filter(r=>r.car).map((r,id)=>({id,x:r.x+r.w/2,z:r.z+r.d/2,alarmUntil:0,nextPulse:0,readyAt:0,glassBroken:false}));
  for(const d of this.doors)Object.assign(d,{barricadeHp:0,buildProgress:0,builderId:null,builtOnce:false});
  this.rebuildFamilies();
 },
 rebuildFamilies(){this.families=new Map();for(const e of this.entities){if(e.familyId<0)continue;if(!this.families.has(e.familyId))this.families.set(e.familyId,[]);this.families.get(e.familyId).push(e.id);}},
 arrangeFamilies(){
  for(const ids of this.families.values()){const leader=this.byId.get(ids[0]);for(const [i,id] of ids.entries()){const e=this.byId.get(id);e.home=leader.home;if(i&&id>5){const p=this.safeSpawn(leader.x+(i===1?1.6:-1.6),leader.z+1.4);Object.assign(e,{x:p.x,px:p.x,z:p.z,pz:p.z,y:groundHeight(p.x,p.z),py:groundHeight(p.x,p.z)});}}}this.rebuildSpatial();
 },
 emitNoise(kind,p,radius=20,ttl=9){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return;
  const floor=p.floor||0,key=kind+':'+floor+':'+Math.round(p.x/4)+':'+Math.round(p.z/4);
  const old=this.noises.find(n=>n.key===key&&this.time-n.created<1);if(old)return old;
  const n={id:this.noiseId++,key,kind,...point(p),radius,created:this.time,until:this.time+ttl};this.noises.push(n);if(this.noises.length>32)this.noises.shift();
  if(kind!=='shot')this.events.push({type:'noise',kind,x:p.x,z:p.z,y:p.y??floor*3.6});return n;
 },
 heardNoise(e){
  let best=null,score=0;for(const n of this.noises){if(n.until<=this.time||n.id===e.heardId)continue;const vertical=Math.abs(e.floor-n.floor),blocked=!this.navigationSight(e,n,0,true);const range=n.radius*(blocked?.48:1)/(1+vertical*.65),d=distance(e,n);if(d>range)continue;const strength=(1-d/range)*(n.until-this.time)/(n.until-n.created);if(strength>score){score=strength;best=n;}}return best;
 },
 roar(){
  const p=this.player;if(this.outcome||!p||p.state!=='zombie'||p.stair||p.fall||p.downUntil>this.time||this.time<this.roarReadyAt)return false;
  this.roarReadyAt=this.time+20;let count=0;
  for(const e of this.entities){if(e.id===p.id||e.state!=='zombie'||distance(e,p)>30||Math.abs(e.floor-p.floor)>1)continue;e.callPoint=point(p);e.callUntil=this.time+8;e.goal=null;e.route=[];e.thinkAt=0;count++;}
  this.emitNoise('roar',p,34,8);this.events.push({type:'roar',x:p.x,z:p.z,y:p.y,count});return true;
 },
 cityInteract(p){
  if(!p||p.state!=='zombie'||p.stair||p.fall||p.downUntil>this.time||p.cool>0)return false;
  const ev=this.cityEvent;if(ev?.kind==='evacuation'&&ev.phase==='boarding'&&distance(p,ev.pickup)<3&&p.floor===0){ev.hp=Math.max(0,ev.hp-20);p.cool=.5;p.pose=.5;this.emitNoise('alarm',ev.pickup,42,10);if(ev.hp===0)this.finishEvacuation(false);return true;}
  const car=this.cars.find(c=>p.floor===0&&distance(p,c)<3.3);if(!car||this.time<car.readyAt)return false;
  car.glassBroken=true;car.alarmUntil=this.time+20;car.nextPulse=this.time+3;car.readyAt=this.time+30;p.cool=.6;p.pose=.5;this.emitNoise('glass',car,38,10);this.emitNoise('alarm',car,42,10);this.events.push({type:'car-alarm',x:car.x,z:car.z,y:0});return true;
 },
 zombieThink(e){
  const prey=this.nearest(e,20,n=>n.state==='human'||n.state==='infected'&&n.downUntil>this.time);
  if(e.callUntil>this.time&&e.callPoint&&(!prey||distance(e,prey)>2.5)){
   const a=e.wanderPhase,r=2+(e.id%5)*.6,p={x:e.callPoint.x+Math.sin(a)*r,z:e.callPoint.z+Math.cos(a)*r,floor:e.callPoint.floor};
   e.goal=this.walkable(p.x,p.z,.35,false,p.floor)?p:e.callPoint;e.targetId=null;e.behavior='called';return;
  }
  if(prey){e.targetId=prey.id;e.lastSeen=point(prey);e.searchUntil=this.time+14;e.goal=this.huntGoal(e,prey);e.behavior='hunt';return;}
  e.targetId=null;
  if(e.lastSeen&&this.time<e.searchUntil){
   if(e.floor!==e.lastSeen.floor||distance(e,e.lastSeen)>2){e.goal=e.lastSeen;e.behavior='track';return;}
   if(this.time>=(e.searchStepAt||0)){
    const b=BUILDINGS[insideHouse(e.lastSeen.x,e.lastSeen.z)];let candidates=b?this.floorNodes.get(`${b.id}:${e.lastSeen.floor}`):null;
    if(candidates?.length)e.goal=point(candidates[(e.id+Math.floor(this.time/3))%candidates.length]);
    else {const a=e.wanderPhase+this.time*.7,p={x:e.lastSeen.x+Math.sin(a)*4,z:e.lastSeen.z+Math.cos(a)*4,floor:e.floor};e.goal=this.walkable(p.x,p.z,.35,false,e.floor)?p:point(e);}
    e.searchStepAt=this.time+2.5;e.pauseUntil=this.time+.35;
   }e.behavior='search';return;
  }
  e.lastSeen=null;
  const sound=this.heardNoise(e);if(sound){e.heardId=sound.id;e.investigatePoint=point(sound);e.investigateUntil=this.time+10;e.goal=e.investigatePoint;e.route=[];e.behavior='investigate';return;}
  if(e.investigatePoint&&this.time<e.investigateUntil&&distance(e,e.investigatePoint)>1){e.goal=e.investigatePoint;e.behavior='investigate';return;}
  this.wanderGoal(e);
 },
 familyThink(e){
  if(e.familyId<0||guard(e)||e.state!=='human')return false;
  const relatives=(this.families.get(e.familyId)||[]).map(id=>this.byId.get(id)).filter(n=>n?.id!==e.id&&alive(n)&&n.floor===e.floor&&distance(e,n)<14);
  const down=relatives.find(n=>n.downUntil>this.time&&this.lineOfSight(e,n));
  if(down&&e.courage>.45&&e.empathy>.55&&!this.nearest(e,3,n=>n.state==='zombie')){
   e.goal=point(down);e.behavior='help-family';e.helpId=down.id;
   if(distance(e,down)<1.2){down.downUntil=Math.min(down.downUntil,this.time+.8);down.collapseUntil=Math.min(down.collapseUntil,this.time+.8);e.pauseUntil=this.time+.3;}
   return true;
  }
  if(!this.chaos&&this.time>=(e.panicUntil||0)){
   const leader=relatives.find(n=>n.id<e.id&&distance(e,n)>4&&this.lineOfSight(e,n));if(leader&&e.empathy>.3){e.goal={x:leader.x+Math.sin(e.id)*1.5,z:leader.z+Math.cos(e.id)*1.5,floor:e.floor};e.behavior='follow-family';return true;}
  }
  return false;
 },
 cityThink(e){
  if(e.state==='zombie'){this.zombieThink(e);return true;}
  const ev=this.cityEvent;
  if(ev?.kind==='evacuation'&&ev.phase==='boarding'&&ev.members.includes(e.id)&&alive(e)){
   if(this.nearest(e,3,n=>n.state==='zombie'))return false;e.goal=ev.pickup;e.behavior='evacuate';return true;
  }
  if(guard(e)&&!this.lockdown&&e.checkpointUntil>this.time&&e.checkpointGoal){e.goal=e.checkpointGoal;e.behavior='checkpoint';e.targetId=this.nearest(e,23,n=>n.state==='zombie')?.id??null;return true;}
  if(this.familyThink(e))return true;
  if(e.retreatPoint&&e.retreatUntil>this.time){e.goal=e.retreatPoint;e.behavior='rear-escape';return true;}
  return false;
 },
 fortify(e,dt){
  if(!this.chaos||e.state!=='human'||e.teamwork<.45||e.floor!==0||e.stair||e.fall||e.behavior!=='shelter')return;
  const building=insideHouse(e.x,e.z);if(building<0)return;
  const d=this.nearbyDoor(e);if(!d||d.building!==building||d.rear||d.gate||d.broken||d.builtOnce)return;
  const builder=this.byId.get(d.builderId);if(d.builderId!==null&&d.builderId!==e.id&&builder?.state==='human'&&distance(builder,d)<3&&builder.fortifyingUntil>this.time-.5)return;
  if(this.nearest({...d,id:-1},1.1,n=>n.id!==e.id,false))return;
  d.builderId=e.id;d.open=false;d.buildProgress=Math.min(4,d.buildProgress+dt);e.pose=.2;e.fortifyingUntil=this.time+.15;
  if(d.buildProgress>=4){d.barricadeHp=80;d.builtOnce=true;d.builderId=null;this.emitNoise('barricade',d,12,6);this.events.push({type:'barricade',x:d.x,z:d.z,y:0});}
 },
 cityAfterMove(e,dt){
  this.fortify(e,dt);
  const ev=this.cityEvent;if(ev?.kind==='evacuation'&&ev.phase==='boarding'&&ev.members.includes(e.id)&&alive(e)&&e.floor===0&&distance(e,ev.pickup)<1.7){e.aboardEvent=ev.id;e.goal=null;e.route=[];}
 },
 alarmBreach(d){
  if(d.barricadeHp>25||!d.builtOnce)return;const b=BUILDINGS[d.building];if(!b)return;
  for(const e of this.entities){if(e.state!=='human'||e.home!==b.id||e.retreatUntil>this.time||insideHouse(e.x,e.z)!==b.id)continue;e.retreatPoint={x:b.x,z:b.z-15,floor:0};e.retreatUntil=this.time+18;e.goal=e.retreatPoint;e.route=[];e.thinkAt=0;}
 },
 startCityEvent(kind){
  if(this.cityEvent)return false;
  const choices=['evacuation','checkpoint','hidden-infection'].filter(k=>k!==this.lastCityEvent);kind=kind||choices[Math.floor(this.random()*choices.length)];
  const id=++this.cityEventSerial;this.lastCityEvent=kind;
  if(kind==='evacuation'){
   const camp=CAMPS[Math.floor(this.random()*CAMPS.length)],pickup={x:camp.x*.82,z:camp.z*.82,floor:0};
   const candidates=this.entities.filter(e=>alive(e)&&!guard(e)&&!e.aboardEvent&&e.floor===0).sort((a,b)=>distance(a,pickup)-distance(b,pickup)).slice(0,8);
   this.cityEvent={id,kind,phase:'boarding',pickup,members:candidates.map(e=>e.id),until:this.time+45,hp:80};for(const e of candidates){e.thinkAt=0;e.route=[];}
   for(const e of this.entities)if(e.floor===0&&distance(e,pickup)<7&&!this.walkable(e.x,e.z)){const q=this.safeSpawn(e.x,e.z);Object.assign(e,{x:q.x,px:q.x,z:q.z,pz:q.z});}
  }else if(kind==='checkpoint'){
   const p=this.streetNodes[Math.floor(this.random()*this.streetNodes.length)];this.cityEvent={id,kind,pickup:point(p),until:this.time+40,members:[]};
   const guards=this.entities.filter(e=>e.state==='human'&&guard(e)&&!e.exitGoal).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,6);
   for(const [i,e] of guards.entries()){const q=this.safeSpawn(p.x+(i%3-1)*1.3,p.z+Math.floor(i/3)*1.3);e.checkpointGoal={...q,floor:0};e.checkpointUntil=this.time+40;e.thinkAt=0;e.route=[];this.cityEvent.members.push(e.id);}
  }else{
   const candidates=this.entities.filter(e=>e.state==='human'&&!guard(e));const indoors=candidates.filter(e=>insideHouse(e.x,e.z)>=0);const list=indoors.length?indoors:candidates;const e=list[Math.floor(this.random()*list.length)];
   if(!e)return false;this.infect(e,-1,true);this.cityEvent={id,kind,pickup:point(e),members:[e.id],until:this.time+25};
  }
  this.events.push({type:'city-event',kind,x:this.cityEvent.pickup.x,z:this.cityEvent.pickup.z,y:0});return true;
 },
 finishEvacuation(success){
  const ev=this.cityEvent;if(ev?.kind!=='evacuation')return;
  let count=0;for(const id of ev.members){const e=this.byId.get(id);if(!e)continue;
   if(e.aboardEvent===ev.id){if(success&&e.state==='human'){e.state='evacuated';e.infectAt=null;e.downUntil=0;this.escaped++;count++;}else{const p=this.safeSpawn(ev.pickup.x+(id%3-1)*1.1,ev.pickup.z+1.5);Object.assign(e,{x:p.x,px:p.x,z:p.z,pz:p.z,y:groundHeight(p.x,p.z),py:groundHeight(p.x,p.z)});}e.aboardEvent=null;}
   e.goal=null;e.route=[];e.thinkAt=0;
  }
  this.events.push({type:success?'evac-depart':'evac-breach',x:ev.pickup.x,z:ev.pickup.z,y:0,count});this.emitNoise(success?'engine':'crash',ev.pickup,38,10);this.cityEvent=null;
 },
 vanRect(){const ev=this.cityEvent;return ev?.kind==='evacuation'?{x:ev.pickup.x+1.2,z:ev.pickup.z-2.2,w:2.4,d:4.4}:null;},
 tickCity(){
  this.noises=this.noises.filter(n=>n.until>this.time);
  for(const c of this.cars)if(c.alarmUntil>this.time&&c.nextPulse<=this.time){this.emitNoise('alarm',c,42,8);c.nextPulse=this.time+3;}
  const ev=this.cityEvent;
  if(ev?.kind==='evacuation'){
   if(ev.members.some(id=>{const e=this.byId.get(id);return e?.aboardEvent===ev.id&&e.state==='zombie';}))this.finishEvacuation(false);
   else if(this.time>=ev.until)this.finishEvacuation(!ev.members.some(id=>{const e=this.byId.get(id);return e?.aboardEvent===ev.id&&e.state==='infected';}));
  }else if(ev&&this.time>=ev.until)this.cityEvent=null;
  if(this.chaos&&!this.cityEvent&&this.time>=this.nextCityEventAt&&!this.outcome){this.startCityEvent();this.nextCityEventAt=this.time+75+this.random()*35;}
 },
 citySnapshot(){return {noises:this.noises,noiseId:this.noiseId,roarReadyAt:this.roarReadyAt,cars:this.cars,cityEvent:this.cityEvent,nextCityEventAt:this.nextCityEventAt,lastCityEvent:this.lastCityEvent,cityEventSerial:this.cityEventSerial,escaped:this.escaped};},
 restoreCity(data){
  const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
  const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<WORLD_HALF&&Math.abs(p.z)<WORLD_HALF&&Number.isInteger(p.floor)&&p.floor>=0&&p.floor<=9;
  for(const e of this.entities){const defaults=traits(e.id,e.role);for(const k of ['courage','empathy','teamwork'])e[k]=Number.isFinite(e[k])?Math.max(0,Math.min(1,e[k])):defaults[k];e.familyId=defaults.familyId;
   for(const k of ['lastSeen','callPoint','investigatePoint','retreatPoint','checkpointGoal'])if(!validPoint(e[k]))e[k]=null;
   for(const k of ['searchUntil','searchStepAt','callUntil','investigateUntil','retreatUntil','checkpointUntil'])e[k]=finite(e[k]);e.heardId=finite(e.heardId,-1);e.aboardEvent=null;
  }
  for(const d of this.doors){d.barricadeHp=Math.max(0,Math.min(80,finite(d.barricadeHp)));d.buildProgress=Math.max(0,Math.min(4,finite(d.buildProgress)));d.builtOnce=!!d.builtOnce;d.builderId=null;if(d.broken)d.barricadeHp=0;if(d.barricadeHp>0)d.open=false;}
  if(data){
   this.noises=(Array.isArray(data.noises)?data.noises:[]).filter(n=>validPoint(n)&&Number.isFinite(n.id)&&Number.isFinite(n.radius)&&n.radius>0&&n.radius<=50&&Number.isFinite(n.created)&&Number.isFinite(n.until)&&n.until>this.time).slice(-32);
   this.noiseId=Math.max(finite(data.noiseId),...this.noises.map(n=>n.id+1),0);this.roarReadyAt=finite(data.roarReadyAt);this.nextCityEventAt=finite(data.nextCityEventAt,this.time+65);this.lastCityEvent=String(data.lastCityEvent||'');this.cityEventSerial=finite(data.cityEventSerial);
   for(const c of this.cars){const old=Array.isArray(data.cars)&&data.cars.find(n=>n.id===c.id);if(old)Object.assign(c,{alarmUntil:finite(old.alarmUntil),nextPulse:finite(old.nextPulse),readyAt:finite(old.readyAt),glassBroken:!!old.glassBroken});}
   const ev=data.cityEvent;if(ev&&['evacuation','checkpoint','hidden-infection'].includes(ev.kind)&&validPoint(ev.pickup)&&Number.isFinite(ev.until)&&Number.isInteger(ev.id)&&Array.isArray(ev.members)){
    this.cityEvent={...ev,hp:Math.max(0,Math.min(80,finite(ev.hp,80))),members:ev.members.filter(id=>this.byId.has(id)).slice(0,8)};
    if(ev.kind==='evacuation')for(const id of this.cityEvent.members){const e=this.byId.get(id);if(alive(e)&&distance(e,ev.pickup)<1.7)e.aboardEvent=ev.id;}
   }
  }
  this.escaped=this.entities.filter(e=>e.state==='evacuated').length;this.rebuildFamilies();
 }
};
