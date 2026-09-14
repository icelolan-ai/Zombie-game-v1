import * as T from '../vendor/three.module.js';
import {PARKS,OBSTACLES,groundHeight} from './world.js?v=0.7';

export function clayTree(v,r){
 const x=r.x+r.w/2,z=r.z+r.d/2,y=groundHeight(x,z),kind=Math.abs(Math.round(x*7+z*13))%4;
 const trunk=kind===2?0xe4d9bd:0xa77e64;
 v.softBox(r.w,2.8,r.d,trunk,x,y+1.4,z);
 if(kind===0){ // layered evergreen
  for(let i=0;i<3;i++){const m=new T.Mesh(new T.ConeGeometry(1.65-i*.35,2.35,10),v.mat([0x659888,0x77aa94,0x91bba0][i]));m.position.set(x,y+2.5+i*.85,z);v.scene.add(m);}
 }else if(kind===1){ // broad, lumpy maple
  for(let i=0;i<5;i++){const a=i*2.4;v.ball(1.15,[0xedbb79,0xf3cc85,0xdfa86b][i%3],x+Math.sin(a)*.85,y+3.1+(i%2)*.6,z+Math.cos(a)*.85);}
 }else if(kind===2){ // pale-trunk birch
  for(let i=0;i<3;i++){const m=v.ball(1.05,[0xabc993,0xb8d69f,0x94b682][i],x+Math.sin(i*3)*.6,y+3+i*.55,z+Math.cos(i*3)*.45);m.scale.y=1.35;}
  for(const h of [.6,1.2,1.9])v.box(r.w+.025,.07,r.d+.025,0x9e9980,x,y+h,z);
 }else{ // slim cypress
  for(let i=0;i<3;i++){const m=v.ball(.75-i*.11,[0x679d85,0x7bac91,0x94bb9b][i],x,y+2.6+i*.8,z);m.scale.y=1.7;}
 }
}

export function streetProp(v,r){
 const x=r.x+r.w/2,z=r.z+r.d/2,y=groundHeight(x,z);
 if(r.pond){
  v.softBox(r.w,.35,r.d,0xd3c7a4,x,y+.17,z);
  v.softBox(r.w-.45,.15,r.d-.45,0x66b5bb,x,y+.34,z);
  for(let i=0;i<5;i++){const m=v.ball(.32,0x91b98a,x+Math.cos(i*2.4)*1.8,y+.46,z+Math.sin(i*2.4)*1.3);m.scale.y=.16;}
  return true;
 }
 if(r.phone){
  v.softBox(1.35,2.65,1.35,0xcc8985,x,y+1.33,z);
  v.softBox(1.08,1.75,.09,0x87b7ba,x,y+1.45,z+.71);
  for(const dx of [-.52,0,.52])v.box(.055,1.8,.08,0xf2d7bd,x+dx,y+1.45,z+.78);
  v.box(1.05,.065,.08,0xf2d7bd,x,y+1.5,z+.78);
  v.softBox(1.15,.3,.1,0xf3dbb9,x,y+2.48,z+.74);
  v.softBox(1.52,.25,1.52,0xaf7977,x,y+2.75,z);
  v.box(.07,.25,.08,0xe6c078,x+.39,y+1,z+.8);
  return true;
 }
 if(r.traffic){
  v.softBox(.5,.3,.5,0x7d8f83,x,y+.15,z);v.softBox(.18,3.1,.18,0x7b8c85,x,y+1.6,z);
  v.softBox(.56,1.4,.48,0x526f70,x,y+3.45,z);
  for(let i=0;i<3;i++){const m=v.ball(.15,0x344f51,x,y+3.86-i*.4,z+.25);m.scale.z=.3;}
  return true;
 }
 if(r.bin){v.softBox(.7,.95,.7,0x75978e,x,y+.5,z);v.softBox(.8,.13,.8,0x526f67,x,y+1,z);v.box(.4,.1,.05,0x384f48,x,y+.83,z+.38);return true;}
 if(r.planter){v.softBox(r.w,.5,r.d,0xd7a18b,x,y+.25,z);v.softBox(r.w-.1,.07,r.d-.1,0x879b69,x,y+.54,z);flowers(v,x,y+.6,z,3);return true;}
 return false;
}

function flowers(v,x,y,z,count=5,parent=v.scene){
 for(let i=0;i<count;i++){const dx=Math.sin(i*2.4)*.35,dz=Math.cos(i*2.4)*.24;v.box(.045,.35,.045,0x7d9c6d,x+dx,y+.13,z+dz,parent);v.ball(.13,[0xf2b6b2,0xf5d98a,0xc6b4db][i%3],x+dx,y+.35,z+dz,parent,0);}
}

export function parkGround(v){
 for(const p of PARKS){
  v.softBox(24,.18,24,0xb3cfa2,p.x,0,p.z);
  v.box(2.3,.05,24,0xe6d2ad,p.x,.13,p.z);
  v.box(24,.05,2.3,0xe6d2ad,p.x,.135,p.z);
  for(const [dx,dz] of [[-5,3],[-4,-4],[8,6]]){v.softBox(2,.18,1.4,0x9cba88,p.x+dx,.2,p.z+dz);flowers(v,p.x+dx,.3,p.z+dz,7);}
  // Stepping stones make the park's entrances legible, without blocking them.
  for(const z of [-10,-8,8,10])v.softBox(1.7,.1,1.05,0xf2dfbd,p.x,.19,p.z+z);
 }
}

export function facadeDetails(v,b,f,front){
 if(f===0){
  // Individually pressed brick courses: bounded to the street-level facade.
  const mortar=0xd7c4b0,brick=b.kind==='house'?0xd4aa92:0xc5b6a8;
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   const x=side*(2.4+col*1.65+(row%2)*.12);
   v.box(1.48,.2,.07,row%2?brick:mortar,x,.35+row*.25,10.23,front);
  }
  for(const side of [-1,1]){
   v.softBox(.3,3.2,.45,0xf2ddc6,side*8.7,1.8,10.16,front);
   v.softBox(.72,.22,.62,0xf6e6d0,side*8.7,3.3,10.16,front);
  }
  const awning=v.softBox(3.4,.18,1.25,b.id%2?0xd5acaa:0x92bab2,0,2.95,10.6,front);awning.rotation.x=.12;
  for(const x of [-1.2,0,1.2])v.box(.34,.055,1.27,0xf7e6c8,x,3.06,10.6,front).rotation.x=.12;
 }else if(f<3){
  for(const x of [-6.5,6.5]){
   v.softBox(1.8,.18,.5,0xf4deca,x,1,10.48,front);
   if((b.id+f)%3===0){v.softBox(1.3,.3,.48,0xb99483,x,1.22,10.5,front);flowers(v,x,1.37,10.5,3,front);}
  }
 }
}

// Small ambient motions: no extra point lights, AI agents, or expensive water pass.
export function ambientLife(v){
 const ducks=[];
 for(const r of OBSTACLES.filter(r=>r.pond)){
  const g=new T.Group();v.scene.add(g);
  const body=v.ball(.23,0xf4db9b,0,0,0,g);body.scale.set(1,.7,1.5);
  v.ball(.16,0xf9e7b6,0,.2,.17,g);v.softBox(.15,.07,.15,0xe9ac73,0,.17,.34,g);
  g.traverse(o=>{o.castShadow=false;});ducks.push({g,x:r.x+r.w/2,z:r.z+r.d/2});
 }
 const lights=OBSTACLES.filter(r=>r.traffic),mesh=new T.InstancedMesh(new T.SphereGeometry(.13,8,6),new T.MeshBasicMaterial({color:0xffffff}),lights.length);
 mesh.frustumCulled=false;v.scene.add(mesh);const o=new T.Object3D(),color=new T.Color();let phase=-1;
 return time=>{
  for(const [i,d] of ducks.entries()){const a=time*.22+i;d.g.position.set(d.x+Math.sin(a)*1.1,.58+Math.sin(time*2+i)*.025,d.z+Math.cos(a)*.7);d.g.rotation.y=a+Math.PI/2;}
  const tick=Math.floor(time/7)%3;if(tick===phase)return;phase=tick;
  for(const [i,r] of lights.entries()){const signal=(tick+i%2)%3;o.position.set(r.x+r.w/2,3.86-signal*.4,r.z+r.d/2+.28);o.scale.set(1,1,.3);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,color.setHex([0xf39b89,0xf4d68a,0xa6d697][signal]));}
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 };
}
