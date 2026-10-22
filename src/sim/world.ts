import {
  CHUNK_SIZE,
  CHUNKS_X,
  CHUNKS_Z,
  CHUNKS_Y,
  WORLD_W,
  WORLD_D,
  WORLD_H,
  TOTAL_CHUNKS,
  TOTAL_VOXELS,
  BLOCK_AIR,
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
  BLOCK_WOOD,
  BLOCK_LEAVES,
  BLOCK_WATER,
  BLOCK_WHEAT,
  BLOCK_STRAWBERRY,
  BLOCK_CORN,
  BLOCK_POTATOES,
  BLOCK_BEETS,
  BLOCK_HERBS,
  BLOCK_COTTON,
  BLOCK_HAY,
  BLOCK_CAMPFIRE,
  BLOCK_STOCKPILE,
  BLOCK_DEFS,
} from './constants';

export class VoxelWorld {
  public blockType: Uint8Array;
  public blockMeta: Uint8Array;
  public chunkDirty: Uint8Array; // 1 = needs remeshing

  constructor() {
    this.blockType = new Uint8Array(TOTAL_VOXELS);
    this.blockMeta = new Uint8Array(TOTAL_VOXELS);
    this.chunkDirty = new Uint8Array(TOTAL_CHUNKS);
    this.chunkDirty.fill(1); // All chunks dirty initially
  }

  public getIndex(x: number, y: number, z: number): number {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) {
      return -1;
    }
    return x + z * WORLD_W + y * (WORLD_W * WORLD_D);
  }

  public getChunkIndex(cx: number, cy: number, cz: number): number {
    if (cx < 0 || cx >= CHUNKS_X || cy < 0 || cy >= CHUNKS_Y || cz < 0 || cz >= CHUNKS_Z) {
      return -1;
    }
    return cx + cz * CHUNKS_X + cy * (CHUNKS_X * CHUNKS_Z);
  }

  public getChunkCoordsForVoxel(x: number, y: number, z: number): [number, number, number] {
    return [
      Math.floor(x / CHUNK_SIZE),
      Math.floor(y / CHUNK_SIZE),
      Math.floor(z / CHUNK_SIZE),
    ];
  }

  public getBlock(x: number, y: number, z: number): number {
    const idx = this.getIndex(x, y, z);
    if (idx < 0) return BLOCK_AIR;
    return this.blockType[idx];
  }

  public getMeta(x: number, y: number, z: number): number {
    const idx = this.getIndex(x, y, z);
    if (idx < 0) return 0;
    return this.blockMeta[idx];
  }

  public markChunkDirtyAt(x: number, y: number, z: number) {
    const [cx, cy, cz] = this.getChunkCoordsForVoxel(x, y, z);
    const cidx = this.getChunkIndex(cx, cy, cz);
    if (cidx >= 0) this.chunkDirty[cidx] = 1;

    // Check chunk borders to mark neighbor dirty if needed
    const lx = x % CHUNK_SIZE;
    const ly = y % CHUNK_SIZE;
    const lz = z % CHUNK_SIZE;

    if (lx === 0 && cx > 0) this.chunkDirty[this.getChunkIndex(cx - 1, cy, cz)] = 1;
    if (lx === CHUNK_SIZE - 1 && cx < CHUNKS_X - 1) this.chunkDirty[this.getChunkIndex(cx + 1, cy, cz)] = 1;
    if (ly === 0 && cy > 0) this.chunkDirty[this.getChunkIndex(cx, cy - 1, cz)] = 1;
    if (ly === CHUNK_SIZE - 1 && cy < CHUNKS_Y - 1) this.chunkDirty[this.getChunkIndex(cx, cy + 1, cz)] = 1;
    if (lz === 0 && cz > 0) this.chunkDirty[this.getChunkIndex(cx, cy, cz - 1)] = 1;
    if (lz === CHUNK_SIZE - 1 && cz < CHUNKS_Z - 1) this.chunkDirty[this.getChunkIndex(cx, cy, cz + 1)] = 1;
  }

  public setBlock(x: number, y: number, z: number, type: number, meta: number = 0): boolean {
    const idx = this.getIndex(x, y, z);
    if (idx < 0) return false;

    if (this.blockType[idx] === type && this.blockMeta[idx] === meta) {
      return false;
    }

    this.blockType[idx] = type;
    this.blockMeta[idx] = meta;
    this.markChunkDirtyAt(x, y, z);
    return true;
  }

  public isSolid(x: number, y: number, z: number): boolean {
    const type = this.getBlock(x, y, z);
    return BLOCK_DEFS[type]?.isSolid ?? false;
  }

  public getHighestSolidY(x: number, z: number): number {
    for (let y = WORLD_H - 1; y >= 0; y--) {
      if (this.isSolid(x, y, z)) {
        return y;
      }
    }
    return 0;
  }

  public markAllDirty() {
    this.chunkDirty.fill(1);
  }

  // Procedural World Generation
  public generate(seed: number = 12345) {
    this.blockType.fill(BLOCK_AIR);
    this.blockMeta.fill(0);

    const pseudoRandom = (x: number, z: number, s: number) => {
      const n = Math.sin(x * 12.9898 + z * 78.233 + s * 43.123) * 43758.5453;
      return n - Math.floor(n);
    };

    const noise2D = (x: number, z: number, freq: number, s: number) => {
      const fx = x * freq;
      const fz = z * freq;
      const ix = Math.floor(fx);
      const iz = Math.floor(fz);
      const fxFrac = fx - ix;
      const fzFrac = fz - iz;

      // Smoothstep
      const u = fxFrac * fxFrac * (3 - 2 * fxFrac);
      const v = fzFrac * fzFrac * (3 - 2 * fzFrac);

      const a = pseudoRandom(ix, iz, s);
      const b = pseudoRandom(ix + 1, iz, s);
      const c = pseudoRandom(ix, iz + 1, s);
      const d = pseudoRandom(ix + 1, iz + 1, s);

      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };

    // 1. Generate Heightmap & Base Blocks
    for (let x = 0; x < WORLD_W; x++) {
      for (let z = 0; z < WORLD_D; z++) {
        // Multi-octave terrain
        const n1 = noise2D(x, z, 0.05, seed);
        const n2 = noise2D(x, z, 0.12, seed + 100);
        const n3 = noise2D(x, z, 0.25, seed + 200);

        // Center clearing flattening for colony hub
        const distFromCenter = Math.hypot(x - WORLD_W / 2, z - WORLD_D / 2);
        const centerFactor = Math.max(0, 1 - distFromCenter / 12);

        let height = Math.floor(4 + n1 * 4 + n2 * 2 + n3 * 1);
        if (centerFactor > 0.1) {
          // Flatten settlement zone at height 5
          height = Math.round(height * (1 - centerFactor) + 5 * centerFactor);
        }
        height = Math.max(2, Math.min(WORLD_H - 5, height));

        const waterLevel = 3;

        for (let y = 0; y <= height; y++) {
          const idx = this.getIndex(x, y, z);
          if (y === height) {
            this.blockType[idx] = BLOCK_GRASS;
          } else if (y >= height - 2) {
            this.blockType[idx] = BLOCK_DIRT;
          } else {
            this.blockType[idx] = BLOCK_STONE;
          }
        }

        // Fill water in low trenches
        for (let y = height + 1; y <= waterLevel; y++) {
          const idx = this.getIndex(x, y, z);
          this.blockType[idx] = BLOCK_WATER;
        }
      }
    }

    // 2. Add Trees & Crops
    for (let x = 3; x < WORLD_W - 3; x += 4) {
      for (let z = 3; z < WORLD_D - 3; z += 4) {
        const distCenter = Math.hypot(x - WORLD_W / 2, z - WORLD_D / 2);
        if (distCenter < 7) continue; // Keep colony spawn area clear

        const treeNoise = pseudoRandom(x, z, seed + 555);
        const groundY = this.getHighestSolidY(x, z);

        if (this.getBlock(x, groundY, z) === BLOCK_GRASS && groundY > 3) {
          if (treeNoise > 0.65) {
            // Spawn Tree
            const trunkHeight = 3 + Math.floor(pseudoRandom(x, z, seed + 777) * 2);
            for (let ty = 1; ty <= trunkHeight; ty++) {
              this.setBlock(x, groundY + ty, z, BLOCK_WOOD);
            }
            // Canopy
            const topY = groundY + trunkHeight;
            for (let dx = -2; dx <= 2; dx++) {
              for (let dz = -2; dz <= 2; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy === 1) continue;
                  const lx = x + dx;
                  const ly = topY + dy;
                  const lz = z + dz;
                  if (this.getBlock(lx, ly, lz) === BLOCK_AIR) {
                    this.setBlock(lx, ly, lz, BLOCK_LEAVES);
                  }
                }
              }
            }
            // Top leaf
            this.setBlock(x, topY + 2, z, BLOCK_LEAVES);
          } else if (treeNoise > 0.44 && treeNoise <= 0.58) {
            // Spawn wild crops
            if (this.getBlock(x, groundY + 1, z) === BLOCK_AIR) {
              const cropNoise = pseudoRandom(x, z, seed + 888);
              let wildCrop = BLOCK_WHEAT;
              if (cropNoise < 0.22) wildCrop = BLOCK_STRAWBERRY;
              else if (cropNoise < 0.38) wildCrop = BLOCK_CORN;
              else if (cropNoise < 0.52) wildCrop = BLOCK_POTATOES;
              else if (cropNoise < 0.65) wildCrop = BLOCK_BEETS;
              else if (cropNoise < 0.78) wildCrop = BLOCK_HERBS;
              else if (cropNoise < 0.88) wildCrop = BLOCK_COTTON;
              else if (cropNoise < 0.94) wildCrop = BLOCK_HAY;
              this.setBlock(x, groundY + 1, z, wildCrop);
              this.blockMeta[this.getIndex(x, groundY + 1, z)] = 2; // mature
            }
          }
        }
      }
    }

    // 3. Colony Spawn Starter Setup
    const centerX = Math.floor(WORLD_W / 2);
    const centerZ = Math.floor(WORLD_D / 2);
    const centerY = this.getHighestSolidY(centerX, centerZ);

    // Campfire at center
    this.setBlock(centerX, centerY + 1, centerZ, BLOCK_CAMPFIRE);
    // Stockpile adjacent to campfire
    this.setBlock(centerX + 2, centerY + 1, centerZ, BLOCK_STOCKPILE);

    this.markAllDirty();
  }
}
