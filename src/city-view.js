import * as T from '../vendor/three.module.js';
import {BUILDINGS,groundHeight} from './world.js?v=0.7';

export function cityView(v){
 const make=(geometry,material,count)=>{const m=new T.InstancedMesh(geometry,material,count);m.frustumCulled=false;m.count=0;v.scene.add(m);return m;};
 const wood=make(new T.BoxGeometry(1,1,1),v.mat(0xbda17d),6000),curtains=make(new T.BoxGeometry(1,1,1),v.mat(0xd4b79f),1200);
 const rings=make(new T.RingGeometry(.91,1,24),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),32);
 const alarms=make(new T.SphereGeometry(.18,8,6),new T.MeshBasicMaterial({color:0xffb678}),64);
 const cracks=make(new T.BoxGeometry(1,1,1),v.mat(0x405f64),64);
 const marks=make(new T.RingGeometry(.5,.65,16),new T.MeshBasicMaterial({color:0x99cae2,side:T.DoubleSide}),8);
 const van=new T.Group();v.scene.add(van);v.softBox(2.4,1.8,4.4,0xd9ddc4,0,1,0,van);v.softBox(2.1,.85,2.2,0xe6e3cc,0,2,.55,van);
 v.softBox(1.85,.6,.07,0x89b6bc,0,2,1.7,van);for(const x of [-1.22,1.22])for(const z of [-1.3,1.3]){const wheel=v.ball(.4,0x59746a,x,.45,z,van);wheel.scale.x=.5;}
 v.box(2.42,.25,4.42,0x86aea0,0,1.2,0,van);v.softBox(.9,.15,.4,0xe8be7e,0,2.5,.5,van);van.traverse(o=>o.castShadow=false);van.visible=false;
 const o=new T.Object3D(),color=new T.Color();
 const put=(mesh,i,x,y,z,w,h,d,yaw=0,tilt=0)=>{o.position.set(x,y,z);o.scale.set(w,h,d);o.rotation.set(0,yaw,tilt);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);};
 return ()=>{
  const s=v.sim,p=s.player;let boards=0,closed=0,signals=0,noise=0,broken=0;const fortified=new Set();
  for(const d of s.doors){if(d.barricadeHp>0)fortified.add(d.building);if(d.floor!==p.floor||Math.hypot(d.x-v.look.x,d.z-v.look.z)>65||d.broken)continue;
   if(d.barricadeHp>0||d.buildProgress>0&&!d.builtOnce){const amount=d.barricadeHp>0?3:Math.max(1,Math.floor(d.buildProgress/4*3)),yaw=d.w>d.d?0:Math.PI/2,width=Math.max(d.w,d.d)*.88;
    for(let j=0;j<amount;j++)put(wood,boards++,d.x,d.floor*3.6+.5+j*.56,d.z,width,.24,.16,yaw,j%2?.1:-.1);
   }
  }
  for(const id of fortified){const b=BUILDINGS[id];if(p.floor!==0||Math.hypot(b.x-v.look.x,b.z-v.look.z)>65)continue;for(const x of [-6.5,-3,3,6.5])put(curtains,closed++,b.x+x,1.95,b.z+10.5,1.22,1.55,.06);}
  for(const e of s.entities)if(e.fortifyingUntil>s.time&&e.floor===p.floor&&Math.hypot(e.x-v.look.x,e.z-v.look.z)<25)put(wood,boards++,e.x,e.y+1,e.z,1.1,.2,.45,e.angle);
  for(const n of s.noises){if(n.floor!==p.floor||Math.hypot(n.x-v.look.x,n.z-v.look.z)>60)continue;const age=s.time-n.created;if(age>2)continue;const size=.5+age*(n.kind==='roar'?6:2.5);o.position.set(n.x,n.floor*3.6+(n.floor===0?groundHeight(n.x,n.z):0)+.25,n.z);o.rotation.set(-Math.PI/2,0,0);o.scale.set(size,size,size);o.updateMatrix();rings.setMatrixAt(noise,o.matrix);rings.setColorAt(noise++,color.setHex(n.kind==='roar'?0xcfee98:n.kind==='alarm'?0xf2ae7d:0xe8d5aa));}
  if(Math.floor(s.time*5)%2===0)for(const c of s.cars)if(c.alarmUntil>s.time&&Math.hypot(c.x-v.look.x,c.z-v.look.z)<65)put(alarms,signals++,c.x,1.9,c.z,1,1,1);
  for(const c of s.cars)if(c.glassBroken&&Math.hypot(c.x-v.look.x,c.z-v.look.z)<65)for(const side of [-1,1])put(cracks,broken++,c.x+side*.13,1.43,c.z+.97,.025,.42,.02,0,side*.5);
  const ev=s.cityEvent;van.visible=ev?.kind==='evacuation'&&Math.hypot(ev.pickup.x-v.look.x,ev.pickup.z-v.look.z)<75;if(van.visible){van.position.set(ev.pickup.x+2.4,0,ev.pickup.z);}
  let checkpoints=0;if(ev?.kind==='checkpoint')for(const id of ev.members){const e=s.byId.get(id),q=e?.checkpointGoal;if(!q)continue;o.position.set(q.x,.2,q.z);o.rotation.set(-Math.PI/2,0,0);o.scale.set(1,1,1);o.updateMatrix();marks.setMatrixAt(checkpoints++,o.matrix);}
  for(const [m,count] of [[wood,boards],[curtains,closed],[rings,noise],[alarms,signals],[marks,checkpoints],[cracks,broken]]){m.count=count;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 };
}
