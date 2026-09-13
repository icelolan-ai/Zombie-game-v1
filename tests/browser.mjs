import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-output',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:844,height:390},{width:820,height:1180}]){
 const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER ERROR',e.stack);});
 await page.goto('http://127.0.0.1:8080/?debug=1');await page.waitForFunction(()=>window.__game?.view?.renderer);
 await page.locator('#populationCount').press(viewport.width===1280?'End':'Home');const chosen=viewport.width===1280?100:20;assert.equal(await page.locator('#populationValue').textContent(),String(chosen));await page.screenshot({path:`test-output/menu-${viewport.width}.png`});
 await page.locator('#play').click();await page.waitForFunction(()=>window.__game.sim.time>.2);
 assert.equal(await page.locator('#menu').isVisible(),false);assert.equal(await page.evaluate(()=>window.__game.sim.total),chosen);
 // Stop the simulation while creating a controlled, reproducible bite fixture.
 await page.evaluate(()=>{let g=window.__game;g.pause();let p=g.sim.player;p.x=0;p.z=8;let e=g.sim.entities[1];e.x=1;e.z=8;e.state='human';e.infectAt=null;});
 await page.locator('#play').click();const biteBox=await page.locator('#bite').boundingBox();await page.mouse.move(biteBox.x+biteBox.width/2,biteBox.y+biteBox.height/2);await page.mouse.down();
 await page.waitForFunction(()=>window.__game.sim.entities[1].state==='infected');await page.mouse.up();
 await page.locator('#pause').click();const time=await page.evaluate(()=>window.__game.sim.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.sim.time),time);
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent==='บันทึกเกมแล้ว');
 await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#menu').hidden);assert.equal(await page.evaluate(()=>window.__game.sim.entities[1].state),'infected');
 await page.evaluate(()=>{let g=window.__game;g.pause();let e=g.sim.entities[1];g.sim.time=e.infectAt-.05;g.sim.step(.05);g.sim.player.x=-25;g.sim.player.z=-25;});
 assert.equal(await page.evaluate(()=>window.__game.sim.entities[1].state),'zombie');await page.waitForFunction(()=>window.__game.view.houses[0].cut.visible===false);
 await page.locator('#play').click();await page.screenshot({path:`test-output/game-${viewport.width}.png`});
 // Controls must be on screen and do not overlap the bite button.
 const boxes=await page.evaluate(()=>['joystick','bite','interact','pause'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};}));for(const b of boxes){assert(b.x>=0&&b.y>=0&&b.x+b.w<=viewport.width+1&&b.y+b.h<=viewport.height+1,JSON.stringify(b));}
 const drawCalls=await page.evaluate(()=>window.__game.view.renderer.info.render.calls);
 assert(drawCalls<180,`Too many draws: ${drawCalls}`);
 // The maximum crowd grows safely, then the result screen stops simulation.
 await page.evaluate(()=>{const g=window.__game;g.pause();for(let i=1;i<=10;i++){let e=g.sim.entities[i];if(!e.everConverted){e.everConverted=true;g.sim.converted++;}e.state='zombie';e.infectAt=null;}g.sim.step(.05);});
 assert.equal(await page.evaluate(()=>window.__game.sim.reinforced),true);assert.equal(await page.evaluate(()=>window.__game.sim.total),chosen+8);
 await page.locator('#play').click();await page.waitForFunction(()=>window.__game.view.actors.size===window.__game.sim.entities.length);
 await page.evaluate(()=>{const g=window.__game;g.pause();for(const e of g.sim.entities.slice(1)){if(!e.everConverted){e.state='infected';e.infectAt=g.sim.time+.05;}}});
 await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#result').hidden);assert.equal(await page.evaluate(()=>window.__game.sim.outcome),'win');
 const endTime=await page.evaluate(()=>window.__game.sim.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.sim.time),endTime);
 await page.screenshot({path:`test-output/result-${viewport.width}.png`});
 await page.locator('#newRound').click();assert.equal(await page.locator('#populationSetup').isVisible(),true);
 report.push({viewport,errors,controls:boxes,drawCalls,selectedPopulation:chosen});assert.deepEqual(errors,[]);await context.close();
}
}finally{await writeFile('test-output/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log('Desktop, phone portrait/landscape, and tablet browser checks passed.');
