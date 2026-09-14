# Outbreak City — Pastel Edition v0.5

A free, self-contained browser zombie sandbox, deployed with GitHub Pages. Vanilla JavaScript and vendored Three.js; no runtime CDN or build step.

## Play

https://icelolan-ai.github.io/Zombie-game-v1/?v=0.3

WASD / touch joystick moves relative to camera. Drag the canvas horizontally to orbit; the vertical slider on the right zooms. Pinch and wheel zoom remain available. Space / Bite attacks people or a nearby closed door. E / Use assists stair entry when close to a landing, otherwise strikes a nearby door. Q rotates the camera. Pinch or wheel zooms. Walk along the stairs to climb or descend; the camera follows elevation and cuts away higher storeys in your current building.

## City rules

- Population selector: 100–3,000 initial NPC, including police/soldiers.
- 288 × 288 world, 36 city buildings plus 16 fenced houses in four village neighbourhoods; city buildings with 3, 4, 8 or 9 occupied storeys and accessible rooftops. Each occupied storey contains four separate rooms and doors.
- Walls, room partitions, furniture, tree trunks and parked cars block movement. Shots and bites cannot pass through closed doors or between floors.
- Doors have 100 durability. Hold Bite or press Hammer nearby to destroy them. Civilian/guard AI opens intact doors and automatically closes them after crossing, when the doorway is clear. Zombies cannot open intact doors.
- A bite knocks a victim down briefly (2.5 seconds). About half of infected NPC later collapse for a variable interval during incubation, while others limp on. Nearby zombies can crouch and feed together. Conversion occurs 25 simulation seconds after the original bite; further feeding does not reset the clock.
- Below 30 living zombies civilians continue ordinary wandering. Witnesses who can see a bite immediately flee locally, including before the global threshold. At 30, a persistent citywide evacuation begins: civilians choose nearby shelter, use rooms/stairs and flee to higher storeys when threatened. Police form defensive groups in building entrances.
- Every new peak of ten living zombies unlocks one ten-soldier team. Teams arrive from alternating north/east/south/west edge camps, at least 25 simulation seconds apart. Thresholds never retrigger by killing and regrowing the same number of zombies. Pending teams remain queued.
- Victory occurs when every currently spawned NPC has converted, including reinforcements. Victory cancels the remaining reinforcement queue so the game can finish. Losing the controlled zombie transfers control to another survivor; defeat occurs when no zombie or incubating human remains.

## Performance and saving

Spatial collision/sensing queries, an explicit multilevel navigation graph, at most eight path searches per simulation tick, staggered AI thinking, static scenery batches, static lighting shadows, instanced crowds, up to 96 nearby detailed animated actors, and adaptive render resolution target smoother mobile performance. The 3,000 population mode is intentionally available, but 60 FPS is not guaranteed on any particular iPhone/iPad. Start at 100 and increase according to device performance.

Simulation runs at 20 Hz and rendering interpolates positions/elevation. Browser focus loss pauses the game; cooldown and infection timing use game time. Blood effects are bounded. Far NPC remain simulated; their detailed render meshes are omitted.

Autosave uses local IndexedDB; export/import uses JSON. **v0.3 and v0.4 city saves remain supported and NPC inside newly placed props are moved to nearby safe ground. v0.1/v0.2 village saves are not supported.** Old local saves are not automatically erased; start a new round for the city.

## Validation

`npm test`: infection timing, closed door/obstacle collisions, inter-floor isolation, reinforcement thresholds/cooldowns, panic threshold, real multilevel path traversal, player climbing/descending, 3,000-population path budget, snapshot validation and final victory.

`tests/browser.mjs`: Chromium software-rendered smoke checks at desktop, phone portrait, phone landscape and tablet sizes; population, bite, save/load, floor cutaways, bounded draw calls, reinforcement and end screen. Screenshots are uploaded by CI. This is not a benchmark of physical iOS hardware.

## Limits

Buildings and crowds are procedural clay-like models, not scanned clay or stop-motion footage. Cars are parked props. Stair flights assist alignment and constrain movement along a ramp. Rooftop parapets have a marked open edge at the front: walking off starts a gravity-driven fall with height-dependent landing damage. Intact walls remain solid. Crowd contacts can overlap in tight queues; rigid obstacles remain solid. No multiplayer or ragdoll physics. Exterior shadows are baked for performance; interiors use ambient lighting and floor-aware actor contact shadows.

Three.js and RoundedBoxGeometry are MIT licensed; see vendor/LICENSE-three.txt.

## v0.4 crowd and scene changes

Zombies have seeded individual wandering destinations, gait speeds, pause timing, approach angles, lateral motion and short-range separation. Visible path-corner skipping and obstacle steering prevent repeated backtracking. At narrow doors and stairs the collision-safe corridor still constrains the crowd.

Civilian evacuation mixes outdoor running (40% of personalities while directly threatened) with sheltering in rooms. At 300 combined infected/zombies, police and soldiers retreat together to upper floors; higher counts select higher refuge floors. Military teams deploy outside vehicle collisions through safe lanes, with staggered exit times. Tests verify all 40 soldiers from four directions exit.

Scene adds 72 trees, 36 benches, 36 streetlights, four transport trucks and eight raised park terraces with sloped walkable surfaces. CSS applies a subtle peripheral blur while keeping the player area and HUD sharp; Economy quality disables this effect. Three thousand NPC is an available population setting, not a promise of 60 FPS on every device.

## v0.5 villages, farms and infection reactions

- Each new round gets a fresh random seed and a validated, unobstructed spawn point. Loading a saved round restores the saved position and does not reroll the spawn.
- Four suburban neighbourhoods add sixteen one/two-storey houses with pitched roofs, gardens, solid fences and breakable garden gates. The original 36 city buildings keep their IDs and door-save order.
- Four corn farms occupy the open corner plots, including crop rows and collidable hay bales. Walking through corn slows movement to 75%. Sloped park areas follow the same elevation function for graphics and movement.
- Forest belts add trees while leaving roads, gates and field entrances open. Lower-detail foliage and scenery batching limit rendering cost.
- Incubation collapse schedules persist across save/load. Conversion still happens 25 game-seconds after the first bite, clears the lying pose, and is not delayed by feeding or panic.
- Bite witnesses require same-floor line of sight; hidden NPC do not react through walls. Witnesses run immediately, while nearby guards move to cover. Panic has a finite duration rather than permanently overriding all later decisions.
- Old v0.3/v0.4 city saves retain their NPC, conversion progress and first 780 door states; new house doors and gates start intact.
