# Voxel Colony Sim in Three.js — Zero-Alloc Roadmap

Status: **[x] ALL PHASES COMPLETED**

This zero-allocation Voxel Colony Simulation architecture has been fully implemented in TypeScript with Three.js.

---

## Phase 0 — Data Architecture (do this first) [x] COMPLETED

**Core principle: Structure-of-Arrays (SoA) + Typed Arrays**

- [x] Pre-allocate typed arrays at startup (`world.ts`, `colonists.ts`, `tasks.ts`, `enemies.ts`, `pathfinding.ts`).
- [x] No `new Object()`, `{}`, or `[]` in hot loop performance paths.
- [x] Integer IDs for entities and scalar lookup arrays.
- [x] Max capacity bounds (`MAX_COLONISTS`, `MAX_TASKS`, `MAX_PARTICLES`, `TOTAL_VOXELS`).

---

## Phase 1 — World Storage & Terrain Gen [x] COMPLETED

- [x] **Chunk size:** 16×16×16 storage in contiguous typed arrays (`Uint8Array` block types & meta).
- [x] **Procedural Terrain gen:** Multi-octave 2D noise with heightmap, settlement zone flattening, water table, trees, and wild crops generated on startup.
- [x] **Voxel access:** Direct inline indexing (`getIndex`) with zero-allocation bounds checks.
- [x] **Mutation API:** `setBlock()` updating voxels and marking `chunkDirty` flags for partial remeshing.

---

## Phase 2 — Chunk Meshing [x] COMPLETED

- [x] **Pre-allocated BufferGeometry per chunk:** Positions, normals, vertex colors, and indices created at startup and updated in-place with `DynamicDrawUsage`.
- [x] **Zero-alloc inner loop:** Direct float buffer writes using scalar face offsets, neighbor checks, and directional face shading.
- [x] **Ambient Occlusion:** 4-level vertex AO calculated during chunk remeshing.
- [x] **Throttled remeshing:** Only dirtied chunks are remeshed across frames to eliminate hitches.

---

## Phase 3 — Rendering Setup [x] COMPLETED

- [x] **Single unified terrain material:** `MeshStandardMaterial` utilizing vertex colors for material variation.
- [x] **Lighting & Atmosphere:** Directional sun light with real-time day/night motion, hemisphere light, campfire light, and scene fog (`FogExp2`).
- [x] **Camera Controls:** Smooth orbit camera with mouse drag, wheel zoom, WASD panning, and colonist tracking.
- [x] **Optimized Renderer:** ACESFilmic tone mapping, pixel ratio clamping, and optional soft shadow maps.

---

## Phase 4 — Game Loop & Time System [x] COMPLETED

- [x] **Fixed timestep simulation:** Decoupled 20 Hz simulation accumulator loop (`simulateTick`).
- [x] **Time of Day:** 24-hour day/night cycle, day counter, and pause / 1x / 2x / 5x game speed controls.
- [x] **Zero-alloc tick updates:** Direct SoA array updates during simulation ticks.

---

## Phase 5 — Pathfinding [x] COMPLETED

- [x] **Binary min-heap A*:** Packed index heap and score arrays backed by pre-allocated typed arrays.
- [x] **Zero-alloc visited tracking:** Stamp array (`stamp[idx] === stampId`) eliminating array clearing overhead.
- [x] **Path buffer output:** Direct writing into colonist path buffers (`pathBufX`, `pathBufY`, `pathBufZ`).

---

## Phase 6 — Colonist AI & Needs [x] COMPLETED

- [x] **State Machine:** Integer AI states (`STATE_IDLE`, `STATE_WALK`, `STATE_MINE`, `STATE_BUILD`, `STATE_HARVEST`, `STATE_EAT`, `STATE_SLEEP`, `STATE_WANDER`).
- [x] **Needs System:** Hunger, energy, happiness, and health tracking with priority-based task and survival dispatching.
- [x] **Character Visuals:** Rigged archetype character models, equipped weapons, walking & mining animations, and status emote billboards.

---

## Phase 7 — Building & Resources [x] COMPLETED

- [x] **Task Management:** Mine, build, and harvest tasks queued and assigned via `TaskManager` SoA.
- [x] **Structure Previews:** Holographic placement preview with validity checking and pending task blueprint overlays (`StructurePreviewManager`).
- [x] **Colony Stockpile:** Resources (`wood`, `stone`, `food`, `dirt`, `planks`, etc.) managed with build requirements and crop yields.

---

## Phase 8 — Performance Hardening [x] COMPLETED

- [x] **Zero-Allocation Hot Loops:** Pre-cached vector/raycast objects and zero runtime allocations during frame renders.
- [x] **Throttled Raycasting:** Mouse raycast checks capped to 30 Hz with result caching to keep frame times low.
- [x] **Performance Telemetry:** Integrated `perfMonitor` tracking FPS, sim ms, render ms, draw calls, and triangle counts with an in-game Benchmark Modal.

---

## Phase 9 — Polish & "Colony Sim" Feel [x] COMPLETED

- [x] **Audio:** Web Audio API sound synthesizer producing zero-alloc audio for UI clicks, hits, block breaks, building placement, and eating.
- [x] **HUD & UI:** React HUD overlay with colony stats, resource counts, collapsible control dock, time readout, and colonist inspector modal.
- [x] **Encounters:** Wildlife and hostile slime encounters (`EnemyManager`).

---

## Final Verification Summary

All 10 phases (Phase 0 through Phase 9) of the Voxel Colony Sim roadmap have been successfully implemented and verified.
