import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-output',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:844,height:390},{width:820,height:1180}]){
 const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?debug=1');await page.waitForFunction(()=>window.__game?.view?.renderer);
 await page.screenshot({path:`test-output/menu-${viewport.width}.png`});
 await page.locator('#play').click();await page.waitForFunction(()=>window.__game.sim.time>.2);
 assert.equal(await page.locator('#menu').isVisible(),false);
 // Stop the simulation while creating a controlled, reproducible bite fixture.
 await page.evaluate(()=>{let g=window.__game;g.pause();let p=g.sim.player;p.x=0;p.z=8;let e=g.sim.entities[1];e.x=1;e.z=8;e.state='human';e.infectAt=null;});
 await page.locator('#play').click();const biteBox=await page.locator('#bite').boundingBox();await page.mouse.move(biteBox.x+biteBox.width/2,biteBox.y+biteBox.height/2);await page.mouse.down();
 await page.waitForFunction(()=>window.__game.sim.entities[1].state==='infected');await page.mouse.up();
 await page.locator('#pause').click();const time=await page.evaluate(()=>window.__game.sim.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.sim.time),time);
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent==='บันทึกเกมแล้ว');
 await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#menu').hidden);assert.equal(await page.evaluate(()=>window.__game.sim.entities[1].state),'infected');
 await page.evaluate(()=>{let g=window.__game;g.pause();let e=g.sim.entities[1];g.sim.time=e.infectAt-.05;g.sim.step(.05);g.sim.player.x=-25;g.sim.player.z=-25;});
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__game.sim.entities[1].state),'zombie');assert.equal(await page.evaluate(()=>window.__game.view.houses[0].cut.visible),false);
 await page.locator('#play').click();await page.screenshot({path:`test-output/game-${viewport.width}.png`});
 // Controls must be on screen and do not overlap the bite button.
 const boxes=await page.evaluate(()=>['joystick','bite','interact','pause'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};}));for(const b of boxes){assert(b.x>=0&&b.y>=0&&b.x+b.w<=viewport.width+1&&b.y+b.h<=viewport.height+1,JSON.stringify(b));}
 report.push({viewport,errors,controls:boxes});assert.deepEqual(errors,[]);await context.close();
}
}finally{await writeFile('test-output/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log('Desktop, phone portrait/landscape, and tablet browser checks passed.');
