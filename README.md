# Outbreak City — Pastel Edition v0.3

A free, self-contained browser zombie sandbox, deployed with GitHub Pages. Vanilla JavaScript and vendored Three.js; no runtime CDN or build step.

## Play

https://icelolan-ai.github.io/Zombie-game-v1/?v=0.3

WASD / touch joystick moves relative to camera. Space / Bite attacks people or a nearby closed door. E / Hammer strikes a door. Q rotates the camera. Pinch or wheel zooms. Walk along the stairs to climb or descend; the camera follows elevation and cuts away higher storeys in your current building.

## City rules

- Population selector: 100–2,000 initial NPC, including police/soldiers.
- 216 × 216 world, 36 pastel buildings with 3, 4, 8 or 9 occupied storeys and accessible rooftops. Each occupied storey contains four separate rooms and doors.
- Walls, room partitions, furniture, tree trunks and parked cars block movement. Shots and bites cannot pass through closed doors or between floors.
- Doors have 100 durability. Hold Bite or press Hammer nearby to destroy them. Civilian/guard AI opens intact doors and automatically closes them after crossing, when the doorway is clear. Zombies cannot open intact doors.
- A bite knocks a victim down for seven seconds. Nearby zombies can crouch and feed together. Conversion occurs 25 simulation seconds after the original bite; further feeding does not reset the clock.
- Below 30 living zombies civilians continue ordinary wandering. At 30, a persistent citywide evacuation begins: civilians choose nearby shelter, use rooms/stairs and flee to higher storeys when threatened. Police form defensive groups in building entrances.
- Every new peak of ten living zombies unlocks one ten-soldier team. Teams arrive from alternating north/east/south/west edge camps, at least 25 simulation seconds apart. Thresholds never retrigger by killing and regrowing the same number of zombies. Pending teams remain queued.
- Victory occurs when every currently spawned NPC has converted, including reinforcements. Victory cancels the remaining reinforcement queue so the game can finish. Losing the controlled zombie transfers control to another survivor; defeat occurs when no zombie or incubating human remains.

## Performance and saving

Spatial collision/sensing queries, an explicit multilevel navigation graph, at most eight path searches per simulation tick, staggered AI thinking, static scenery batches, static lighting shadows, instanced crowds, up to 96 nearby detailed animated actors, and adaptive render resolution target smoother mobile performance. The 2,000 population mode is intentionally available, but 60 FPS is not guaranteed on any particular iPhone/iPad. Start at 100 and increase according to device performance.

Simulation runs at 20 Hz and rendering interpolates positions/elevation. Browser focus loss pauses the game; cooldown and infection timing use game time. Blood effects are bounded. Far NPC remain simulated; their detailed render meshes are omitted.

Autosave uses local IndexedDB; export/import uses JSON. **The v0.3 city changes map topology and cannot import v0.1/v0.2 village saves.** Old local saves are not automatically erased; start a new round for the city.

## Validation

`npm test`: infection timing, closed door/obstacle collisions, inter-floor isolation, reinforcement thresholds/cooldowns, panic threshold, real multilevel path traversal, player climbing/descending, 2,000-population path budget, snapshot validation and final victory.

`tests/browser.mjs`: Chromium software-rendered smoke checks at desktop, phone portrait, phone landscape and tablet sizes; population, bite, save/load, floor cutaways, bounded draw calls, reinforcement and end screen. Screenshots are uploaded by CI. This is not a benchmark of physical iOS hardware.

## Limits

Buildings and crowds are procedural clay-like models, not scanned clay or stop-motion footage. Cars are parked props. Stair flights constrain movement along a ramp; there is no jumping or falling physics. Crowd contacts can overlap in tight queues; rigid obstacles remain solid. No multiplayer or ragdoll physics. Exterior shadows are baked for performance; interiors use ambient lighting and floor-aware actor contact shadows.

Three.js and RoundedBoxGeometry are MIT licensed; see vendor/LICENSE-three.txt.
