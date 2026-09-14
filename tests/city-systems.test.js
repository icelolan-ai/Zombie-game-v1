import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,BUILDINGS} from '../src/simulation.js';
import {doorTemplates} from '../src/world.js';
const place=(e,x,z,floor=0)=>Object.assign(e,{x,px:x,z,pz:z,floor,y:floor*3.6,py:floor*3.6,goal:null,route:[],downUntil:0});

test('sounds attract nearby zombies, attenuate through walls, expire and remain bounded',()=>{
 const s=new Simulation(),z=s.entities[1];z.state='zombie';place(z,0,0);s.entities=[z];s.rebuildSpatial();
 s.emitNoise('shot',{x:0,z:12,floor:0},32,8);s.think(z);assert.equal(z.behavior,'investigate');assert.equal(z.goal.z,12);
 s.time=9;s.tickCity();assert.equal(s.noises.length,0);z.investigateUntil=0;s.think(z);assert.equal(z.behavior,'wander');
 const b=BUILDINGS[0];place(z,b.x+6,b.z+5);s.emitNoise('door',{x:b.x-6,z:b.z+5,floor:0},15,8);assert.equal(s.heardNoise(z),null);
 for(let i=0;i<100;i++)s.emitNoise('shot',{x:i,z:0,floor:0},32,8);assert(s.noises.length<=32);
});
test('car interaction breaks glass and sustains a timed alarm without moving the parked car',()=>{
 const s=new Simulation(),c=s.cars[0];place(s.player,c.x-2,c.z);assert(s.cityInteract(s.player));assert(c.glassBroken);assert(c.alarmUntil===20);assert(s.noises.some(n=>n.kind==='alarm'));
 s.time=4;s.tickCity();assert(s.noises.some(n=>n.created===4));s.time=30;s.tickCity();assert.equal(s.noises.length,0);
});
test('roar recruits only nearby zombies, respects cooldown and preserves player control after load',()=>{
 let s=new Simulation();place(s.player,0,0);const a=s.entities[1],far=s.entities[2];a.state=far.state='zombie';place(a,0,10);place(far,0,80);
 assert(s.roar());assert.equal(a.callUntil,8);assert.equal(far.callUntil,0);assert(!s.roar());s.think(a);assert.equal(a.behavior,'called');
 s=Simulation.restore(s.snapshot());assert.equal(s.roarReadyAt,20);assert.equal(s.entities[1].callUntil,8);s.time=20;assert(s.roar());
});
test('zombies track remembered sightings rather than following unseen victims through walls',()=>{
 const s=new Simulation(),b=BUILDINGS[0],z=s.entities[1],human=s.entities[2];z.state='zombie';place(z,b.x+1,b.z+5);place(human,b.x+2,b.z+5);s.entities=[z,human];s.rebuildSpatial();s.think(z);assert.equal(z.behavior,'hunt');const last={...z.lastSeen};
 place(human,b.x+6,b.z+5);s.rebuildSpatial();s.think(z);assert.equal(z.targetId,null);assert.notEqual(z.behavior,'hunt');assert.deepEqual(z.lastSeen,last);assert.notEqual(z.goal.x,human.x);
 s.time=20;s.noises=[];s.think(z);assert.equal(z.lastSeen,null);assert.equal(z.behavior,'wander');
});
test('brave empathetic relatives help fallen family while selfish witnesses flee',()=>{
 const s=new Simulation(),a=s.entities[1],b=s.entities[2];place(a,0,8);place(b,0,8.8);a.role=b.role='villager';a.state=b.state='human';a.familyId=b.familyId=0;a.courage=.9;a.empathy=.9;b.downUntil=10;b.infectAt=25;s.entities=[a,b];s.rebuildFamilies();s.rebuildSpatial();s.think(a);assert.equal(a.behavior,'help-family');assert(b.downUntil<2);assert.equal(b.infectAt,25);
 a.empathy=0;a.panicUntil=10;a.panicFrom={x:0,z:6,floor:0};s.think(a);assert.equal(a.behavior,'witness-flee');
});
test('barricades require build time, absorb damage, and leave a usable rear escape route',()=>{
 const s=new Simulation(),b=BUILDINGS[0],e=s.entities[1];place(e,b.x+6.3,b.z+5);e.state='human';e.home=b.id;e.teamwork=1;e.behavior='shelter';s.entities=[e];s.rebuildSpatial();s.chaos=true;const d=s.nearbyDoor(e);
 for(let i=0;i<39;i++)s.fortify(e,.1);assert.equal(d.barricadeHp,0);s.fortify(e,.1);assert.equal(d.barricadeHp,80);
 s.damageDoor(d,60);assert.equal(d.hp,100);assert.equal(d.barricadeHp,20);assert(e.retreatPoint);assert(s.doors.some(q=>q.building===b.id&&q.rear));
 s.damageDoor(d,40);assert.equal(d.barricadeHp,0);assert.equal(d.hp,80);
 for(let i=0;i<700;i++){s.time+=.05;s.pathBudget=8;s.navigate(e,e.retreatPoint,4,.05);}
 assert(Math.hypot(e.x-b.x,e.z-(b.z-15))<.5);
});
test('evacuation boards survivors, can be attacked, and records escaped people separately',()=>{
 let s=new Simulation();s.startCityEvent('evacuation');let ev=s.cityEvent,e=s.byId.get(ev.members[0]);const rect=s.vanRect();assert(!s.walkable(rect.x+rect.w/2,rect.z+rect.d/2));assert(s.walkable(ev.pickup.x,ev.pickup.z));place(e,ev.pickup.x,ev.pickup.z);s.cityAfterMove(e,.05);assert.equal(e.aboardEvent,ev.id);
 s=Simulation.restore(s.snapshot());ev=s.cityEvent;e=s.byId.get(e.id);assert.equal(e.aboardEvent,ev.id);s.time=ev.until;s.tickCity();assert.equal(e.state,'evacuated');assert.equal(s.escaped,1);assert.equal(s.converted,0);
 s.startCityEvent('evacuation');ev=s.cityEvent;place(s.player,ev.pickup.x,ev.pickup.z);for(let i=0;i<4;i++){s.player.cool=0;assert(s.cityInteract(s.player));}assert.equal(s.cityEvent,null);assert(s.events.some(e=>e.type==='evac-breach'));
});
test('an infected passenger transforms on schedule and causes an outbreak inside the evacuation van',()=>{
 const s=new Simulation();s.startCityEvent('evacuation');const ev=s.cityEvent,e=s.byId.get(ev.members[0]);place(e,ev.pickup.x,ev.pickup.z);s.infect(e,-1,true);s.cityAfterMove(e,.05);assert(e.aboardEvent);s.time=24.95;s.step(.05);assert.equal(e.state,'zombie');assert.equal(e.aboardEvent,null);assert.equal(s.cityEvent,null);assert.equal(s.escaped,0);
});
test('checkpoints assign existing guards and hidden infections preserve population and incubation',()=>{
 const s=new Simulation(),total=s.total;s.startCityEvent('checkpoint');assert(s.cityEvent.members.length>0);const e=s.byId.get(s.cityEvent.members[0]);s.think(e);assert.equal(e.behavior,'checkpoint');assert.equal(s.total,total);
 s.cityEvent=null;s.startCityEvent('hidden-infection');const patient=s.byId.get(s.cityEvent.members[0]);assert.equal(patient.state,'infected');assert.equal(patient.infectAt-s.time,25);assert.equal(s.total,total);
});
test('old v5 saves gain rear doors and new systems while v7 retains barricades and personality',()=>{
 const s=new Simulation(),old=s.snapshot();old.version=5;old.doors=old.doors.slice(0,908);delete old.city;const upgraded=Simulation.restore(old);assert.equal(upgraded.doors.length,doorTemplates().length);assert.equal(upgraded.roarReadyAt,0);
 upgraded.doors[0].barricadeHp=50;upgraded.doors[0].builtOnce=true;const next=Simulation.restore(upgraded.snapshot());assert.equal(next.doors[0].barricadeHp,50);assert.equal(next.entities[10].courage,upgraded.entities[10].courage);
});
