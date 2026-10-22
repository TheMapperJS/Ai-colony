import * as THREE from 'three';

export interface ParsedVox {
  size: [number, number, number];
  voxels: { x: number; y: number; z: number; colorIndex: number }[];
  palette: [number, number, number][];
}

// MagicaVoxel Default Palette Fallback (if no RGBA chunk)
function getDefaultPalette(): [number, number, number][] {
  const pal: [number, number, number][] = new Array(256).fill([0.5, 0.5, 0.5]);
  for (let i = 0; i < 256; i++) {
    pal[i] = [((i * 17) % 256) / 255, ((i * 37) % 256) / 255, ((i * 73) % 256) / 255];
  }
  return pal;
}

// High performance binary parser for MagicaVoxel .vox files
export function parseVoxBuffer(buffer: ArrayBuffer): ParsedVox {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Validate "VOX " header
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== 'VOX ') {
    throw new Error('Invalid VOX file magic header: ' + magic);
  }

  let offset = 8; // skip magic (4) and version (4)
  let size: [number, number, number] = [16, 16, 16];
  const voxels: { x: number; y: number; z: number; colorIndex: number }[] = [];
  let palette: [number, number, number][] = [];

  while (offset + 12 <= buffer.byteLength) {
    const chunkId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );
    const contentBytes = view.getInt32(offset + 4, true);
    offset += 12;

    if (chunkId === 'SIZE') {
      size = [
        view.getInt32(offset, true),
        view.getInt32(offset + 4, true),
        view.getInt32(offset + 8, true),
      ];
    } else if (chunkId === 'XYZI') {
      const numVoxels = view.getInt32(offset, true);
      for (let i = 0; i < numVoxels; i++) {
        const o = offset + 4 + i * 4;
        voxels.push({
          x: bytes[o],
          y: bytes[o + 1],
          z: bytes[o + 2],
          colorIndex: bytes[o + 3],
        });
      }
    } else if (chunkId === 'RGBA') {
      palette = [];
      for (let i = 0; i < 256; i++) {
        const o = offset + i * 4;
        palette.push([bytes[o] / 255, bytes[o + 1] / 255, bytes[o + 2] / 255]);
      }
    }

    offset += contentBytes;
  }

  if (palette.length === 0) {
    palette = getDefaultPalette();
  }

  return { size, voxels, palette };
}

// 6 Directional Face Offsets and Corners for Face Culling
const DIRS = [
  [1, 0, 0],   // +X (Right)
  [-1, 0, 0],  // -X (Left)
  [0, 0, 1],   // +Z in vox = +Y in Three.js (Top)
  [0, 0, -1],  // -Z in vox = -Y in Three.js (Bottom)
  [0, 1, 0],   // +Y in vox = +Z in Three.js (Front)
  [0, -1, 0],  // -Y in vox = -Z in Three.js (Back)
];

const FACE_CORNERS = [
  // +X
  [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  // -X
  [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
  // +Z (Top face in MagicaVoxel)
  [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]],
  // -Z (Bottom face in MagicaVoxel)
  [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
  // +Y (Front in MagicaVoxel)
  [[1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1]],
  // -Y (Back in MagicaVoxel)
  [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
];

// Convert Parsed VOX into an optimized Three.js BufferGeometry
export function buildVoxGeometry(parsed: ParsedVox, scale: number = 1 / 16): THREE.BufferGeometry {
  const voxelMap = new Map<number, number>();
  for (const v of parsed.voxels) {
    const key = (v.x & 0xff) | ((v.y & 0xff) << 8) | ((v.z & 0xff) << 16);
    voxelMap.set(key, v.colorIndex);
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertOffset = 0;

  for (const v of parsed.voxels) {
    // Color from palette (MagicaVoxel 1-based color index)
    const colorIdx = v.colorIndex > 0 ? v.colorIndex - 1 : 0;
    const [cr, cg, cb] = parsed.palette[colorIdx] || [0.4, 0.7, 0.3];

    for (let f = 0; f < 6; f++) {
      const [dx, dy, dz] = DIRS[f];
      const nx = v.x + dx;
      const ny = v.y + dy;
      const nz = v.z + dz;
      const neighborKey = (nx & 0xff) | ((ny & 0xff) << 8) | ((nz & 0xff) << 16);

      // Face culling: if neighbor exists, do not emit quad
      if (voxelMap.has(neighborKey)) continue;

      // Shading based on normal orientation
      let shade = 1.0;
      if (f === 2) shade = 1.15; // Top face brightest
      else if (f === 3) shade = 0.65; // Bottom face
      else if (f === 0 || f === 1) shade = 0.85; // Sides
      else shade = 0.95;

      const r = Math.min(1.0, cr * shade);
      const g = Math.min(1.0, cg * shade);
      const b = Math.min(1.0, cb * shade);

      const corners = FACE_CORNERS[f];
      for (let c = 0; c < 4; c++) {
        const corner = corners[c];
        const vx = v.x + corner[0];
        const vy = v.y + corner[1];
        const vz = v.z + corner[2];

        // Coordinate conversion:
        // In MagicaVoxel: X is right (0..15), Y is depth (0..15), Z is height (0..15)
        // In Three.js: X is right, Y is height, Z is depth
        // Centered around X and Z: (vx - 8) * scale, vz * scale (resting on ground at Y=0), (vy - 8) * scale
        const gx = (vx - 8) * scale;
        const gy = vz * scale;
        const gz = (vy - 8) * scale;

        positions.push(gx, gy, gz);
        normals.push(dx, dz, dy); // normal conversion
        colors.push(r, g, b);
      }

      indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
      indices.push(vertOffset, vertOffset + 2, vertOffset + 3);
      vertOffset += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

// Procedural fallback geometry if asset fails or loading
function createFallbackCropGeometry(stage: number): THREE.BufferGeometry {
  const height = stage === 0 ? 0.25 : stage === 1 ? 0.55 : 0.85;
  const geo = new THREE.BoxGeometry(0.2, height, 0.2);
  geo.translate(0, height / 2, 0);
  const colors = new Float32Array(geo.attributes.position.count * 3);
  const r = stage === 2 ? 0.85 : 0.35;
  const g = stage === 2 ? 0.75 : 0.75;
  const b = stage === 2 ? 0.25 : 0.35;
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = r;
    colors[i + 1] = g;
    colors[i + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

// Cache of all 24 farm geometries
class FarmVoxCacheManager {
  private cache = new Map<string, THREE.BufferGeometry>();
  private loadPromise: Promise<void> | null = null;

  public async preloadAll(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    const crops = ['wheat', 'strawberry', 'corn', 'potatoes', 'beets', 'herbs', 'cotton', 'hay'];
    const stages = ['sprout', 'growing', 'mature'];

    this.loadPromise = (async () => {
      const promises: Promise<void>[] = [];

      for (const crop of crops) {
        for (let s = 0; s < 3; s++) {
          const stageName = stages[s];
          const fileName = s === 0 ? `${crop}_sprout` : s === 1 ? `${crop}_growing` : crop;
          const cacheKey = `${crop}_${s}`;

          promises.push(
            (async () => {
              try {
                const res = await fetch(`/assets/farm/${fileName}.vox`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const buf = await res.arrayBuffer();
                const parsed = parseVoxBuffer(buf);
                const geo = buildVoxGeometry(parsed);
                this.cache.set(cacheKey, geo);
              } catch (err) {
                console.warn(`Could not load /assets/farm/${fileName}.vox:`, err);
                this.cache.set(cacheKey, createFallbackCropGeometry(s));
              }
            })()
          );
        }
      }

      await Promise.all(promises);
    })();

    return this.loadPromise;
  }

  public getGeometry(cropType: string, stage: number): THREE.BufferGeometry {
    const key = `${cropType}_${stage}`;
    const geo = this.cache.get(key);
    if (geo) return geo;

    // Fallback if not loaded yet
    const fallback = createFallbackCropGeometry(stage);
    this.cache.set(key, fallback);
    return fallback;
  }
}

export const farmVoxCache = new FarmVoxCacheManager();
