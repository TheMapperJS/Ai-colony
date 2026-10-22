import * as THREE from 'three';

// Fast, zero-alloc in-memory Voxel Mesh Builder
// Converts voxel coordinates into efficient, face-culled Three.js BufferGeometry
export class VoxelRigBuilder {
  public parts: Map<string, Map<number, number>> = new Map();
  public palette: [number, number, number][] = new Array(256).fill([0, 0, 0]);

  constructor(partNames: string[]) {
    for (const name of partNames) {
      this.parts.set(name, new Map());
    }
  }

  public setColor(index: number, r: number, g: number, b: number) {
    if (index >= 1 && index <= 255) {
      this.palette[index] = [r / 255, g / 255, b / 255];
    }
  }

  // Pack coordinate (x, y, z) into a 32-bit integer (-128..127 range)
  private packCoord(x: number, y: number, z: number): number {
    return ((x + 128) & 0xff) | (((y + 128) & 0xff) << 8) | (((z + 128) & 0xff) << 16);
  }

  private unpackCoord(key: number): [number, number, number] {
    const x = (key & 0xff) - 128;
    const y = ((key >> 8) & 0xff) - 128;
    const z = ((key >> 16) & 0xff) - 128;
    return [x, y, z];
  }

  public setVoxel(part: string, x: number, y: number, z: number, colorIndex: number) {
    const partMap = this.parts.get(part);
    if (partMap && colorIndex >= 1 && colorIndex <= 255) {
      partMap.set(this.packCoord(x, y, z), colorIndex);
    }
  }

  public removeVoxel(part: string, x: number, y: number, z: number) {
    const partMap = this.parts.get(part);
    if (partMap) {
      partMap.delete(this.packCoord(x, y, z));
    }
  }

  public fillBox(part: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, colorIndex: number) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const minZ = Math.min(z0, z1);
    const maxZ = Math.max(z0, z1);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          this.setVoxel(part, x, y, z, colorIndex);
        }
      }
    }
  }

  // Build a Three.js Group with animated sub-parts
  // Scale factor: scale voxels into world units (e.g. 1/16 unit per voxel)
  public buildModelGroup(scale: number = 0.05): { group: THREE.Group; partMeshes: Map<string, THREE.Mesh> } {
    const rootGroup = new THREE.Group();
    const partMeshes = new Map<string, THREE.Mesh>();

    const sharedMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
      metalness: 0.1,
      flatShading: true,
    });

    // Face offsets for 6 directions
    const DIRS = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];

    const FACE_CORNERS = [
      // +X
      [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
      // -X
      [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
      // +Y
      [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
      // -Y
      [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
      // +Z
      [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
      // -Z
      [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
    ];

    for (const [partName, voxelMap] of this.parts.entries()) {
      if (voxelMap.size === 0) continue;

      const positions: number[] = [];
      const normals: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];
      let vertOffset = 0;

      for (const [key, colorIdx] of voxelMap.entries()) {
        const [vx, vy, vz] = this.unpackCoord(key);
        const [cr, cg, cb] = this.palette[colorIdx] || [0.5, 0.5, 0.5];

        // Check 6 neighbors for face culling
        for (let f = 0; f < 6; f++) {
          const [dx, dy, dz] = DIRS[f];
          const neighborKey = this.packCoord(vx + dx, vy + dy, vz + dz);
          if (voxelMap.has(neighborKey)) continue; // neighbor exists, cull face

          // Directional lighting shade
          const shade = f === 2 ? 1.15 : f === 3 ? 0.65 : f === 4 || f === 5 ? 0.95 : 0.85;
          const r = Math.min(1.0, cr * shade);
          const g = Math.min(1.0, cg * shade);
          const b = Math.min(1.0, cb * shade);

          // Write quad vertices
          const corners = FACE_CORNERS[f];
          for (let c = 0; c < 4; c++) {
            // Note: In MagicaVoxel, Z is up, Y is depth. In Three.js, Y is up, Z is depth!
            // Conversion: threeX = voxelX * scale, threeY = voxelZ * scale, threeZ = -voxelY * scale
            const gx = vx + corners[c][0];
            const gy = vy + corners[c][1];
            const gz = vz + corners[c][2];

            positions.push(gx * scale, gz * scale, -gy * scale);
            normals.push(dx, dz, -dy);
            colors.push(r, g, b);
          }

          // Two triangles
          indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
          indices.push(vertOffset, vertOffset + 2, vertOffset + 3);
          vertOffset += 4;
        }
      }

      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        const mesh = new THREE.Mesh(geometry, sharedMaterial);
        mesh.name = partName;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        partMeshes.set(partName, mesh);
        rootGroup.add(mesh);
      }
    }

    return { group: rootGroup, partMeshes };
  }
}
