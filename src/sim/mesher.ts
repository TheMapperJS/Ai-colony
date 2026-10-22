import * as THREE from 'three';
import {
  CHUNK_SIZE,
  CHUNKS_X,
  CHUNKS_Z,
  CHUNKS_Y,
  TOTAL_CHUNKS,
  BLOCK_AIR,
  BLOCK_WATER,
  BLOCK_DEFS,
} from './constants';
import { VoxelWorld } from './world';

// Max limits per chunk geometry
const MAX_QUADS = 4096;
const MAX_VERTS = MAX_QUADS * 4;
const MAX_INDICES = MAX_QUADS * 6;

export interface ChunkMesh {
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  vertCount: number;
  triCount: number;
}

// 6 Directions: +X, -X, +Y, -Y, +Z, -Z
const FACE_DIRS = [
  [1, 0, 0],   // 0: Right
  [-1, 0, 0],  // 1: Left
  [0, 1, 0],   // 2: Top
  [0, -1, 0],  // 3: Bottom
  [0, 0, 1],   // 4: Front
  [0, 0, -1],  // 5: Back
];

// Face Quad Offsets: [x, y, z] for 4 vertices of each face
const FACE_CORNERS = [
  // Right (+X): X = 1, Y/Z iterate
  [
    [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]
  ],
  // Left (-X): X = 0
  [
    [0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]
  ],
  // Top (+Y): Y = 1
  [
    [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]
  ],
  // Bottom (-Y): Y = 0
  [
    [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]
  ],
  // Front (+Z): Z = 1
  [
    [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]
  ],
  // Back (-Z): Z = 0
  [
    [0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]
  ],
];

// Ambient Occlusion lookup factors
const AO_FACTORS = [0.45, 0.65, 0.85, 1.0];

export class VoxelMesher {
  public chunkMeshes: ChunkMesh[] = [];
  public meshObjects: THREE.Mesh[] = [];
  public terrainMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    // Pre-allocate chunk geometries and meshes
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const positions = new Float32Array(MAX_VERTS * 3);
      const normals = new Float32Array(MAX_VERTS * 3);
      const colors = new Float32Array(MAX_VERTS * 3);
      const indices = new Uint32Array(MAX_INDICES);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1).setUsage(THREE.DynamicDrawUsage));

      geometry.setDrawRange(0, 0);

      const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.chunkMeshes.push({
        geometry,
        mesh,
        positions,
        normals,
        colors,
        indices,
        vertCount: 0,
        triCount: 0,
      });
      this.meshObjects.push(mesh);
    }
  }

  public getTotalTriangles(): number {
    let sum = 0;
    for (let i = 0; i < this.chunkMeshes.length; i++) {
      sum += this.chunkMeshes[i].triCount / 3;
    }
    return sum;
  }

  public getTotalVertices(): number {
    let sum = 0;
    for (let i = 0; i < this.chunkMeshes.length; i++) {
      sum += this.chunkMeshes[i].vertCount;
    }
    return sum;
  }

  // Calculate Ambient Occlusion at vertex corner
  private calcAO(side1: boolean, side2: boolean, corner: boolean): number {
    if (side1 && side2) return 0;
    let occ = 0;
    if (side1) occ++;
    if (side2) occ++;
    if (corner) occ++;
    return 3 - occ; // 0, 1, 2, or 3
  }

  public remeshChunk(chunkIndex: number, world: VoxelWorld) {
    const chunk = this.chunkMeshes[chunkIndex];
    if (!chunk) return;

    // Calculate chunk coordinates
    const cx = chunkIndex % CHUNKS_X;
    const cz = Math.floor(chunkIndex / CHUNKS_X) % CHUNKS_Z;
    const cy = Math.floor(chunkIndex / (CHUNKS_X * CHUNKS_Z));

    const startX = cx * CHUNK_SIZE;
    const startY = cy * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    let vIdx = 0;
    let iIdx = 0;
    let quadCount = 0;

    const positions = chunk.positions;
    const normals = chunk.normals;
    const colors = chunk.colors;
    const indices = chunk.indices;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = startX + lx;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = startY + ly;
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const wz = startZ + lz;

          const blockId = world.getBlock(wx, wy, wz);
          if (blockId === BLOCK_AIR) continue;

          const def = BLOCK_DEFS[blockId];
          if (!def) continue;

          // Skip cube faces for crops - rendered with high fidelity by FarmRenderer
          if (def.isCrop) continue;

          const isWater = blockId === BLOCK_WATER;

          // Check 6 face neighbors
          for (let f = 0; f < 6; f++) {
            if (quadCount >= MAX_QUADS - 2) break;

            const [dx, dy, dz] = FACE_DIRS[f];
            const nx = wx + dx;
            const ny = wy + dy;
            const nz = wz + dz;

            const neighborId = world.getBlock(nx, ny, nz);
            const neighborDef = BLOCK_DEFS[neighborId];

            let renderFace = false;

            if (isWater) {
              // Water only renders against air or top surface
              renderFace = neighborId === BLOCK_AIR || (f === 2 && neighborId !== BLOCK_WATER);
            } else {
              // Solid voxel renders if neighbor is air, water, or transparent
              renderFace = !neighborDef || !neighborDef.isSolid || neighborDef.isTransparent;
            }

            if (!renderFace) continue;

            // Face base color
            let r = def.color[0];
            let g = def.color[1];
            let b = def.color[2];

            if (f === 2 && def.topColor) {
              // Top face color
              r = def.topColor[0];
              g = def.topColor[1];
              b = def.topColor[2];
            } else if (f === 3 && def.bottomColor) {
              // Bottom face color
              r = def.bottomColor[0];
              g = def.bottomColor[1];
              b = def.bottomColor[2];
            }

            // Directional face shade for depth
            let faceShade = 1.0;
            if (f === 2) faceShade = 1.15; // Top face brightest
            else if (f === 3) faceShade = 0.55; // Bottom darkest
            else if (f === 0 || f === 1) faceShade = 0.85; // X sides
            else faceShade = 0.95; // Z sides

            // Write 4 vertices for this quad
            const vertStart = vIdx / 3;
            const corners = FACE_CORNERS[f];

            for (let c = 0; c < 4; c++) {
              const cornerOffset = corners[c];
              const vx = wx + cornerOffset[0];
              const vy = wy + cornerOffset[1];
              const vz = wz + cornerOffset[2];

              // Position
              positions[vIdx] = vx;
              positions[vIdx + 1] = vy;
              positions[vIdx + 2] = vz;

              // Normal
              normals[vIdx] = dx;
              normals[vIdx + 1] = dy;
              normals[vIdx + 2] = dz;

              // Simple AO estimation based on top faces or corners
              let aoFactor = 1.0;
              if (f === 2) {
                // Top face AO
                const cxOffset = cornerOffset[0] === 0 ? -1 : 1;
                const czOffset = cornerOffset[2] === 0 ? -1 : 1;
                const s1 = world.isSolid(wx + cxOffset, wy + 1, wz);
                const s2 = world.isSolid(wx, wy + 1, wz + czOffset);
                const corn = world.isSolid(wx + cxOffset, wy + 1, wz + czOffset);
                const aoLevel = this.calcAO(s1, s2, corn);
                aoFactor = AO_FACTORS[aoLevel];
              }

              // Final vertex color
              colors[vIdx] = Math.min(1.0, r * faceShade * aoFactor);
              colors[vIdx + 1] = Math.min(1.0, g * faceShade * aoFactor);
              colors[vIdx + 2] = Math.min(1.0, b * faceShade * aoFactor);

              vIdx += 3;
            }

            // Write 2 triangles (6 indices)
            indices[iIdx] = vertStart;
            indices[iIdx + 1] = vertStart + 1;
            indices[iIdx + 2] = vertStart + 2;

            indices[iIdx + 3] = vertStart;
            indices[iIdx + 4] = vertStart + 2;
            indices[iIdx + 5] = vertStart + 3;

            iIdx += 6;
            quadCount++;
          }
        }
      }
    }

    // Update geometry draw range and mark attributes for GPU upload
    chunk.vertCount = vIdx / 3;
    chunk.triCount = iIdx;

    chunk.geometry.setDrawRange(0, iIdx);
    chunk.geometry.attributes.position.needsUpdate = true;
    chunk.geometry.attributes.normal.needsUpdate = true;
    chunk.geometry.attributes.color.needsUpdate = true;
    if (chunk.geometry.index) {
      chunk.geometry.index.needsUpdate = true;
    }
    chunk.geometry.computeBoundingSphere();
  }

  public updateDirtyChunks(world: VoxelWorld, maxChunksPerFrame: number = 3) {
    let updated = 0;
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      if (world.chunkDirty[i] === 1) {
        this.remeshChunk(i, world);
        world.chunkDirty[i] = 0;
        updated++;
        if (updated >= maxChunksPerFrame) break;
      }
    }
  }

  public addToScene(scene: THREE.Scene) {
    for (const chunk of this.chunkMeshes) {
      scene.add(chunk.mesh);
    }
  }
}
