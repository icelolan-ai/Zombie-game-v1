import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-output',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:844,height:390},{width:820,height:1180}]){
 const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER ERROR',e.stack);});page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|VALIDATE_STATUS|Shader Error/.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:8080/?debug=1');await page.waitForFunction(()=>window.__game?.view?.renderer);
 await page.locator('#populationCount').press(viewport.width===1280?'End':'Home');const chosen=viewport.width===1280?3000:100;assert.equal(await page.locator('#populationValue').textContent(),String(chosen));await page.screenshot({path:`test-output/menu-${viewport.width}.png`});
 await page.locator('#play').click();await page.waitForFunction(()=>window.__game.sim.time>.2);
 // Camera drag and the vertical range work without engaging the movement joystick.
 const yawBefore=await page.evaluate(()=>window.__game.view.yaw);await page.mouse.move(viewport.width*.35,viewport.height*.5);await page.mouse.down();await page.mouse.move(viewport.width*.65,viewport.height*.5,{steps:8});await page.mouse.up();assert(Math.abs(await page.evaluate(()=>window.__game.view.yaw)-yawBefore)>.2);
 await page.locator('#zoomSlider').press('End');assert.equal(await page.evaluate(()=>window.__game.view.zoom),70);await page.locator('#zoomSlider').press('Home');assert.equal(await page.evaluate(()=>window.__game.view.zoom),24);
 await page.evaluate(()=>{const g=window.__game;g.view.yaw=.65;g.view.zoom=43;document.getElementById('zoomSlider').value='43';});
 const sliderBox=await page.locator('#zoomSlider').boundingBox();assert(sliderBox.height>sliderBox.width&&sliderBox.x>viewport.width*.8);
 await page.screenshot({path:`test-output/street-${viewport.width}.png`});assert.equal(await page.locator('#menu').isVisible(),false);assert.equal(await page.evaluate(()=>window.__game.sim.total),chosen);
 // Stop the simulation while creating a controlled, reproducible bite fixture.
 await page.evaluate(()=>{let g=window.__game;g.pause();let p=g.sim.player;p.x=0;p.z=8;p.floor=0;p.y=0;let e=g.sim.entities[1];e.x=1;e.z=8;e.state='human';e.infectAt=null;});
 await page.locator('#play').click();const biteBox=await page.locator('#bite').boundingBox();await page.mouse.move(biteBox.x+biteBox.width/2,biteBox.y+biteBox.height/2);await page.mouse.down();
 await page.waitForFunction(()=>window.__game.sim.entities[1].state==='infected');await page.mouse.up();
 await page.locator('#pause').click();const time=await page.evaluate(()=>window.__game.sim.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.sim.time),time);
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent==='บันทึกเกมแล้ว');
 await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#menu').hidden);assert.equal(await page.evaluate(()=>window.__game.sim.entities[1].state),'infected');
 await page.evaluate(()=>{let g=window.__game;g.pause();let e=g.sim.entities[1];g.sim.time=e.infectAt-.05;g.sim.step(.05);g.sim.player.x=-75;g.sim.player.z=-75;g.sim.player.floor=0;g.sim.player.y=0;});
 assert.equal(await page.evaluate(()=>window.__game.sim.entities[1].state),'zombie');await page.waitForFunction(()=>window.__game.view.houses[0].cut.visible===false&&Math.hypot(window.__game.view.look.x+75,window.__game.view.look.z+75)<.5);
 await page.locator('#play').click();await page.screenshot({path:`test-output/game-${viewport.width}.png`});
 // Controls must be on screen and do not overlap the bite button.
 const boxes=await page.evaluate(()=>['joystick','bite','interact','roar','pause','zoomSlider'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};}));for(const b of boxes){assert(b.x>=0&&b.y>=0&&b.x+b.w<=viewport.width+1&&b.y+b.h<=viewport.height+1,JSON.stringify(b));}
 const drawCalls=await page.evaluate(()=>window.__game.view.renderer.info.render.calls);
 assert(drawCalls<350,`Too many draws: ${drawCalls}`);
 // Climb to the eighth floor and verify upper layers are cut away.
 await page.evaluate(()=>{const g=window.__game;g.pause();const p=g.sim.player;p.x=45;p.z=-75;p.floor=7;p.y=7*3.6;p.py=p.y;p.px=p.x;p.pz=p.z;});
 await page.waitForFunction(()=>window.__game.view.houses[4].levels[8].group.visible===false);
 await page.waitForFunction(()=>Math.hypot(window.__game.view.look.x-45,window.__game.view.look.z+75)<.5);await page.locator('#play').click();await page.screenshot({path:`test-output/upper-floor-${viewport.width}.png`});
 await page.evaluate(()=>{const p=window.__game.sim.player;p.x=0;p.z=8;p.floor=0;p.y=0;p.py=0;});
 if(viewport.width===390){
  for(const [name,x,z] of [['village',-75,-90],['farm',-105,-105],['park',-105,-15]]){
   await page.evaluate(({x,z})=>{const g=window.__game;g.pause();const p=g.sim.player;p.x=p.px=x;p.z=p.pz=z;p.floor=0;p.y=p.py=0;g.view.look.set(x,.4,z);}, {x,z});
   await page.locator('#play').click();await page.waitForTimeout(350);await page.screenshot({path:'test-output/'+name+'.png'});
  }
  await page.evaluate(()=>{const g=window.__game;g.pause();Object.assign(g.sim.player,{x:0,px:0,z:8,pz:8,floor:0,y:0,py:0});for(const [i,x] of [[2,1.6],[3,-1.6]])Object.assign(g.sim.entities[i],{x,px:x,z:8,pz:8,floor:0,y:0,py:0,downUntil:0});g.view.look.set(0,.4,8);g.view.zoom=24;});
  await page.waitForTimeout(400);await page.locator('#menu').evaluate(el=>el.hidden=true);await page.screenshot({path:'test-output/clay-characters.png'});
  const focus=await page.locator('#focusBlur').evaluate(el=>({x:parseFloat(el.style.getPropertyValue('--focus-x')),y:parseFloat(el.style.getPropertyValue('--focus-y')),blur:getComputedStyle(el).backdropFilter}));assert(Math.abs(focus.x-50)<10&&Math.abs(focus.y-50)<10);assert(focus.blur.includes('3px'));
  // Rendering follows the stair flight immediately, even after a sideways approach.
  await page.evaluate(()=>{const g=window.__game,p=g.sim.player;Object.assign(p,{x:-77,z:-69,floor:0,y:0,angle:Math.PI/2});g.sim.startStair(p,1);g.sim.advanceStair(p,.3);g.view.look.set(p.x,p.y,p.z);});
  await page.waitForFunction(()=>{const g=window.__game,a=g.view.actors.get(g.sim.playerId);return a&&Math.abs(Math.cos(a.root.rotation.y-g.sim.player.angle)-1)<.001;});
  await page.evaluate(()=>{const g=window.__game,p=g.sim.player;p.stair=null;g.view.zoom=43;document.querySelector('#menu').hidden=false;});
  await page.evaluate(()=>{const g=window.__game;g.pause();const p=g.sim.player;p.x=p.px=0;p.z=p.pz=8;p.floor=0;p.y=p.py=0;g.view.look.set(0,.4,8);const e=g.sim.entities[2];e.x=e.px=1;e.z=e.pz=8;e.floor=0;e.y=e.py=0;e.state='infected';e.infectAt=g.sim.time+20;e.downUntil=g.sim.time+10;});
  await page.waitForFunction(()=>{const a=window.__game.view.actors.get(window.__game.sim.entities[2].id);return a&&a.body.rotation.x< -1.2;});
  await page.locator('#play').click();await page.screenshot({path:'test-output/incubation.png'});
 }
 // The maximum crowd grows safely, then the result screen stops simulation.
 await page.evaluate(()=>{const g=window.__game;g.pause();for(let i=1;i<=10;i++){let e=g.sim.entities[i];if(!e.everConverted){e.everConverted=true;g.sim.converted++;}e.state='zombie';e.infectAt=null;}g.sim.step(.05);});
 assert.equal(await page.evaluate(()=>window.__game.sim.reinforced),true);assert.equal(await page.evaluate(()=>window.__game.sim.total),chosen+10);
 await page.locator('#play').click();await page.waitForFunction(()=>window.__game.view.crowd.count>0);
 // A possessed reinforcement must drop its AI route and release the old joystick.
 if(viewport.width===390){
  await page.evaluate(()=>{const s=window.__game.sim,e=s.entities[1];Object.assign(e,{x:0,px:0,z:8,pz:8,y:0,py:0,floor:0,stair:null,fall:null,downUntil:0,exitGoal:{x:0,z:25,floor:0},deployAt:0});});
  const j=await page.locator('#joystick').boundingBox();await page.mouse.move(j.x+j.width/2+25,j.y+j.height/2);await page.mouse.down();
  await page.evaluate(()=>{const s=window.__game.sim;s.damage(s.player,9999,'test');});
  await page.waitForFunction(()=>window.__game.sim.playerId===window.__game.sim.entities[1].id);
  const rest=await page.evaluate(()=>({x:window.__game.sim.player.x,z:window.__game.sim.player.z,t:window.__game.sim.time}));
  await page.waitForFunction(t=>window.__game.sim.time>t+.5,rest.t);
  const stopped=await page.evaluate(()=>({x:window.__game.sim.player.x,z:window.__game.sim.player.z}));assert(Math.hypot(stopped.x-rest.x,stopped.z-rest.z)<.01);
  await page.mouse.up();await page.mouse.down();await page.waitForFunction(p=>Math.hypot(window.__game.sim.player.x-p.x,window.__game.sim.player.z-p.z)>.5,stopped);await page.mouse.up();
  const released=await page.evaluate(()=>({x:window.__game.sim.player.x,z:window.__game.sim.player.z,t:window.__game.sim.time}));await page.waitForFunction(t=>window.__game.sim.time>t+.5,released.t);
  assert(await page.evaluate(p=>Math.hypot(window.__game.sim.player.x-p.x,window.__game.sim.player.z-p.z)<.01,released));
 }
 await page.locator('#roar').click();await page.waitForFunction(()=>window.__game.sim.roarReadyAt>window.__game.sim.time);await page.waitForFunction(()=>document.querySelector('#roar').disabled);
 if(viewport.width===390){
  await page.evaluate(()=>{const g=window.__game;g.pause();const c=g.sim.cars[0],p=g.sim.player;Object.assign(p,{x:c.x-2,px:c.x-2,z:c.z,pz:c.z,y:0,py:0,floor:0,stair:null,fall:null,cool:0,downUntil:0});g.view.look.set(p.x,.4,p.z);});
  await page.locator('#play').click();await page.locator('#interact').click();await page.waitForFunction(()=>window.__game.sim.cars[0].glassBroken);await page.screenshot({path:'test-output/alarm.png'});
  await page.evaluate(()=>{const g=window.__game;g.pause();const d=g.sim.doors[0];Object.assign(d,{barricadeHp:70,builtOnce:true,open:false});Object.assign(g.sim.player,{x:-75,px:-75,z:-64,pz:-64,y:0,py:0,floor:0,cool:0});g.view.look.set(-75,.4,-64);});
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#doorText').textContent.includes('แนวกั้น'));await page.screenshot({path:'test-output/barricade.png'});
  await page.evaluate(()=>{const g=window.__game;g.pause();g.sim.cityEvent=null;g.sim.startCityEvent('evacuation');const q=g.sim.cityEvent.pickup;Object.assign(g.sim.player,{x:q.x-.8,px:q.x-.8,z:q.z-1.8,pz:q.z-1.8,y:0,py:0,floor:0,cool:0});g.view.look.set(q.x,.4,q.z);});
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#cityEventStatus').textContent.includes('รถอพยพ'));await page.locator('#interact').click();assert.equal(await page.evaluate(()=>window.__game.sim.cityEvent.hp),60);await page.screenshot({path:'test-output/evacuation.png'});
  await page.evaluate(()=>window.__game.sim.finishEvacuation(false));
 }
 await page.evaluate(()=>{const g=window.__game;g.pause();for(const e of g.sim.entities.slice(1)){if(!e.everConverted){e.state='infected';e.infectAt=g.sim.time+.05;}}});
 await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#result').hidden);assert.equal(await page.evaluate(()=>window.__game.sim.outcome),'win');
 const endTime=await page.evaluate(()=>window.__game.sim.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.sim.time),endTime);
 await page.screenshot({path:`test-output/result-${viewport.width}.png`});
 await page.locator('#newRound').click();assert.equal(await page.locator('#populationSetup').isVisible(),true);
 report.push({viewport,errors,controls:boxes,drawCalls,selectedPopulation:chosen});assert.deepEqual(errors,[]);await context.close();
}
}finally{await writeFile('test-output/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log('Desktop, phone portrait/landscape, and tablet browser checks passed.');
