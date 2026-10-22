# Voxel Colony Sim in Three.js — Zero-Alc Roadmap

This is a meaty project. Here's a phased roadmap with the GC-avoidance strategy baked into every layer.

---

## Phase 0 — Data Architecture (do this first)

This is the most important phase. Get it wrong and you'll rewrite everything.

**Core principle: Structure-of-Arrays (SoA) + Typed Arrays**

```
// World data (single giant block)
world
  .blockType    : Uint8Array    // 1 byte per voxel (material ID)
  .blockMeta    : Uint8Array    // 1 byte per voxel (sub-state, e.g. HP tier)
  .blockFluid   : Uint16Array   // fluid type + level, 0 = none
  // size = chunkSize³ * numChunks, or per-chunk typed arrays

// Colonists (one array per field)
colonists
  .x  : Float32Array
  .y  : Float32Array
  .z  : Float32Array
  .vx : Float32Array
  .vy : Float32Array
  .vz : Float32Array
  .state : Uint8Array          // AI state machine ID
  .stateData : Uint32Array     // target block, task ID, etc.
  .hp   : Uint16Array
  .need_hunger : Uint8Array
  .need_rest   : Uint8Array
  .need_fun    : Uint8Array
  .inventory : Uint16Array     // flat, stride = INV_SLOTS per colonist
  .invCount  : Uint16Array

// Buildings / tasks
tasks
  .type   : Uint8Array
  .x, .y, .z : Float32Array
  .progress : Float32Array
  .assigned : Int16Array       // colonist index, -1 = unassigned
```

**Rules to bake in from day one:**
- **No `new Object()`, no `{}`, no `[]` in hot loops.** Pre-allocate typed arrays at startup.
- **No closures in per-tick / per-frame code.** Use index-based dispatch or a jump table of function refs.
- **SoA over AoS.** Better cache locality, and you iterate one contiguous block at a time.
- **Integer IDs everywhere.** A colonist is an `Int32` index into the arrays above. No entity objects.
- **String keys → enums.** Material types, task types, AI states are all `Uint8` constants.
- **Pre-allocate everything at a known max.** `MAX_COLONISTS = 256`, `MAX_TASKS = 512`, etc. Track a `count` scalar; recycle slots on death/complete.

---

## Phase 1 — World Storage & Terrain Gen

- **Chunk size:** 16×16×16 (or 32×32×16). Store each chunk as its own set of typed arrays so you can unload distant chunks.
- **Terrain gen** (simplex/value noise) runs **once at load** into the typed arrays. This is the one time you're allowed to be a little loose; it's off the hot path.
- **Voxel access:** a single inline `getVoxel(x, y, z) → byte` that computes the chunk index + offset. No branching on "is this valid?" in the inner meshing loop — pad the world or use a sentinel block type for out-of-bounds.
- **Mutation API:** `setBlock(cx, cy, cz, type)` that also flags the affected chunk(s) as "dirty" (a `Uint8Array` dirty flag, one byte per chunk). This is how the renderer knows what to remesh.

```
// dirty tracking (zero alloc)
chunkDirty : Uint8Array   // 1 = needs remesh
// or a bitmask if you want to remesh faces selectively
```

---

## Phase 2 — Chunk Meshing (the big one)

This is where most Three.js voxel engines create garbage. Avoid it.

### Strategy: **pre-allocated BufferGeometry per chunk, updated in place**

```
For each chunk slot (pre-allocated at startup for MAX_VISIBLE_CHUNKS):
  geometry = new THREE.BufferGeometry()          // created ONCE
  positions = new Float32Array(MAX_VERTS)        // e.g. 16³ * 6 faces * 6 verts * 3 = ~46k floats
  normals   = new Float32Array(MAX_VERTS)
  uvs       = new Float32Array(MAX_VERTS_UV)
  colors    = new Float32Array(MAX_VERTS)       // optional per-vertex tint
  indices   = new Uint32Array(MAX_TRIS)

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('normal',   new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1).setUsage(THREE.DynamicDrawUsage))
```

### Meshing algorithm (the inner loop)
- Iterate every voxel in the chunk.
- For each of the 6 face directions, check the neighbor voxel.
- If neighbor is air (or transparent), **write face vertices directly into the pre-allocated arrays** at a running `vertCount` / `triCount` offset.
- **No temporary vectors.** Use scalar math:
  ```js
  // Instead of: const p = v1.clone().addScaledVector(dir, 0.5)
  positions[vertBase + 0] = x + dirX * 0.5;
  positions[vertBase + 1] = y + dirY * 0.5;
  positions[vertBase + 2] = z + dirZ * 0.5;
  ```
- After the loop:
  ```js
  geometry.setDrawRange(0, triCount);
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.normal.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.index.needsUpdate = true;
  ```
- **Only remesh dirty chunks**, and do it **spread across frames** (e.g. 1–2 chunks per frame) to avoid hitches.

### What to avoid in Three.js
- **Don't** create a new `THREE.Mesh` per chunk. Pre-create `MAX_VISIBLE_CHUNKS` meshes at startup.
- **Don't** call `geometry.dispose()` and recreate. Reuse the buffer.
- **Don't** use `THREE.InstancedMesh` for the terrain (it's for many identical geometries; here each chunk has a unique shape). It *is* great for entities (Phase 6).
- Be aware Three.js internals (e.g. `Matrix4.copy`, `Vector3.copy`) do small allocations. For per-frame camera transforms, keep your own `Matrix4` / `Vector3` instances and reuse them.

---

## Phase 3 — Rendering Setup

- **One material** for all terrain (or a small set, e.g. 4–8). Use vertex colors for per-block variation instead of texture atlases if you want to keep it simple. If you do textures, bake an atlas and use UVs.
- **Fog** for depth cueing (hides the chunk boundary and reduces overdraw).
- **Frustum culling:** let Three.js cull the chunk meshes. Since they're pre-allocated and you set `mesh.visible = false` for out-of-bounds, this is free.
- **Chunk visibility radius:** ~4–6 chunks. Beyond that, `visible = false`.
- **Lighting:** start with a single directional light + ambient. No per-voxel lighting in v1. Later, bake AO into vertex colors during meshing (multiply the corner vertex brightness by how many of its 3 orthogonal neighbors are solid).
- **Renderer settings:**
  ```js
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // avoid antialias if perf-tight; or use FXAA post pass
  ```

---

## Phase 4 — Game Loop & Time System

- **Fixed timestep simulation** (e.g. 20 ticks/sec) decoupled from render (60+ fps).
- Use an accumulator:
  ```js
  let acc = 0;
  const TICK = 1 / 20;
  function frame(dt) {
    acc += dt;
    while (acc >= TICK) {
      simulateTick();   // pathfinding, AI, needs, tasks
      acc -= TICK;
    }
    render(acc / TICK); // interpolation factor for smooth motion
  }
  ```
- **`simulateTick()`** touches only the typed arrays. No allocations.
- **`render()`** reads the interpolated positions (lerp between previous-tick and current-tick arrays — store a `prevX/prevY/prevZ` set too) and updates the InstancedMesh matrices.
- **Pause / speed controls** are just scaling `acc` accumulation.

---

## Phase 5 — Pathfinding

This is the most GC-prone system in JS if done naively (object-based open/closed sets).

### Use a **binary min-heap backed by a `Uint32Array`**

```
openSet
  .heap    : Uint32Array  // packed (x | y<<8 | z<<16) or (blockIndex)
  .fScore  : Float32Array // g + h, indexed by block index
  .gScore  : Float32Array
  .size    : number
```

- **A\* over the voxel grid.** 6-directional (or 26-directional with corner-cutting prevention).
- **Pre-allocate** all arrays to `WORLD_VOLUME` (or chunk-local). Reset with a `Uint32Array` "visited stamp" array (increment a global `visitId` each search; a cell is "visited this search" if `stamp[voxel] === visitId`). **Zero clearing cost.**
- **Path reconstruction:** write into a pre-allocated `Uint32Array pathBuf`, return `(buf, length)`. No array allocation.
- **For multiple colonists targeting the same block** (e.g. everyone going to the same building), consider a **flow field** per target: BFS from the target, store a "next step direction" byte per voxel. Each colonist just reads the byte at their position. O(1) per step, O(1) memory per field. Pre-allocate 2–4 flow field buffers and swap them.

### What to avoid
- ❌ `const neighbors = [ [1,0,0], [-1,0,0], ... ]` created per call → hoist to module-level `const` or use 6 unrolled inline checks.
- ❌ `Set` / `Map` for visited → use the typed-array stamp technique.
- ❌ Object nodes `{x, y, z, g, f}` → use the packed-integer heap.

---

## Phase 6 — Colonist AI & Needs

### State machine (integer-based, not object-based)
```js
const STATE_IDLE = 0, STATE_WALK = 1, STATE_WORK = 2, STATE_EAT = 3, STATE_SLEEP = 4, STATE_DEATH = 255;
```

- Each tick, per colonist:
  1. **Update needs** (hunger += rate, etc.) — a few scalar adds.
  2. **Priority check** — a small fixed-size priority list (e.g. `needPriority[4]` = `[0,1,2,3]` meaning hunger > rest > fun > work). Compare current needs, pick highest.
  3. **Dispatch to state handler** — a pre-built array of function refs:
     ```js
     const handlers = [fnIdle, fnWalk, fnWork, fnEat, fnSleep, fnDeath];
     handlers[colonists.state[i]](i);  // i = colonist index
     ```
     Each handler reads/writes only the SoA arrays. **No `this`, no closures, no temp objects.**
  4. **Movement:** if `STATE_WALK`, read the next path step from `pathBuf`, lerp position. Write into `colonists.x[i]` etc.

### Task assignment
- Tasks are in the `tasks[]` typed arrays.
- A colonist in `STATE_IDLE` scans `tasks[]` for an unassigned one (`assigned[t] === -1`). Linear scan is fine for < 512 tasks. Mark `assigned[t] = colonistIndex`.
- On completion: `progress[t] = 1`, `assigned[t] = -1`, set `task type` to done → recycle slot by swapping with the last active task and decrementing `taskCount`.

### What to avoid
- ❌ `class Colonist { constructor() { this.need = new NeedSystem() } }` → all of that is just indices into typed arrays.
- ❌ `forEach`, `filter`, `map` over entity lists → plain `for (let i = 0; i < colonistCount; i++)`.
- ❌ String-based event dispatch → integer state IDs.

---

## Phase 7 — Building & Resources

- **Building = a pattern of voxels + a task.**
  - Player clicks → raycast against chunk meshes (Three.js `Raycaster`, reuse one instance) → get world block → spawn a task.
  - Task stores: type, center position, and a reference to a **pre-baked build pattern** (a small typed array of `[dx, dy, dz, blockType]` quads, indexed by building type).
  - Colonist works: each tick, decrement `progress`. At threshold, call `setBlock()` for the next voxel in the pattern.
- **Resources / inventory:** flat `Uint16Array` per colonist (or a global shared stockpile array). No object per item. A "stack" is just `(itemType, count)` in two parallel arrays.
- **Production chains** (e.g. wood → planks → frames) are just task-type transitions: completing task type A appends task type B to the task array.

---

## Phase 8 — Performance Hardening

This is where you go from "works" to "runs at 60 fps with 500 colonists."

| Area | Technique |
|---|---|
| **Meshing** | Remesh only dirty chunks, spread across frames. Consider **greedy meshing** (merge coplanar quads) to reduce vertex count ~3–5×. |
| **Pathfinding** | Batch: run pathfinding for at most N colonists per tick. Use flow fields for shared targets. |
| **AI** | **Spatial partitioning:** a uniform grid hash (`Uint32Array` head-of-list + linked list via `Int32Array next[]`) so colonists only check neighbors in their cell. |
| **Rendering** | Frustum cull chunks. LOD: far chunks use a 2× or 4× coarser mesh. Merge static far chunks into a single geometry. |
| **Three.js overhead** | Avoid `renderer.render()` triggering internal matrix recalcs unnecessarily. Set `matrixAutoUpdate = false` on chunk meshes and update manually. |
| **GC monitoring** | Use `--expose-gc` + `global.gc()` in a debug harness, or Chrome DevTools "Record allocation profile" during a 30-sec gameplay session. Target: **< 5 KB allocated per frame** (ideally 0). |
| **Typed array growth** | If you need to grow (more chunks loaded), **double the buffer size** and copy. Do it in one shot, not incrementally. |
| **Worker threads** | Move terrain gen and pathfinding to a `Worker` with `SharedArrayBuffer` + `Atomics` for truly parallel, GC-free simulation. (This is a later optimization.) |

---

## Phase 9 — Polish & "Colony Sim" Feel

- **Audio:** pre-allocate a small pool of `AudioBufferSourceNodes`. Reuse. No new `Audio` objects per event.
- **Particles** (dust, smoke): pre-allocated `InstancedMesh` with a fixed count. Kill by scaling to 0.
- **UI / HUD:** use a plain DOM or a separate 2D canvas overlay. Keep it out of the 3D scene graph. Avoid creating DOM nodes per frame.
- **Save/Load:** serialize the typed arrays directly to `ArrayBuffer` → `FileReader` / `fetch`. No JSON (no string allocation for numbers).
- **Minimap:** a small 2D canvas, redraw only when a chunk is dirty. Read directly from the block-type array.
- **Day/night cycle:** rotate the directional light, adjust ambient. All scalar math, zero alloc.

---

## Suggested build order (what to actually ship in what order)

```
Week 1   Phase 0 + 1 + 2  →  you can fly a camera over generated terrain
Week 2   Phase 3 + 4      →  game loop running, terrain renders at 60fps
Week 3   Phase 5          →  one colonist can pathfind across the map
Week 4   Phase 6          →  colonist has needs, walks to a target, "works"
Week 5   Phase 7          →  player places a building, colonist builds it
Week 6   Phase 8          →  profile, fix GC spikes, spatial partitioning
Week 7   Phase 9          →  save/load, audio, minimap, juice
```

---

## TL;DR — the 5 rules that make or break this

1. **Typed arrays for all game data. Ever.**
2. **Pre-allocate GPU buffers. Update in place. Never dispose-and-recreate.**
3. **No `new`, no `{}`, no `[]` in per-tick or per-frame code.**
4. **Integer IDs + index arithmetic. No entity objects, no string keys.**
5. **Profile with allocation tracking from Week 1, not after the fact.**

Want me to dive deeper into any of these phases — like write out the chunk mesher, the heap-based A\*, or the SoA data layout in actual code?
