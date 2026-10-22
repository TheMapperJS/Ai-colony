import { TOTAL_VOXELS, WORLD_W, WORLD_D, WORLD_H, BLOCK_AIR } from './constants';
import { VoxelWorld } from './world';

// Max path length
export const MAX_PATH_LENGTH = 128;

// Direction steps: 4 horizontal + diagonal possibilities
const STEP_DX = [1, -1, 0, 0, 1, 1, -1, -1];
const STEP_DZ = [0, 0, 1, -1, 1, -1, 1, -1];

export class VoxelPathfinder {
  // Visited stamp array: zero array clearing cost!
  private stamp: Uint32Array;
  private currentStamp: number = 1;

  // G-Score and F-Score
  private gScore: Float32Array;
  private parentIndex: Int32Array;

  // Min-Heap storage
  private heapIndex: Uint32Array;
  private heapScore: Float32Array;
  private heapSize: number = 0;

  // Output path buffer (x, y, z packed or flat)
  public pathX: Int16Array;
  public pathY: Int16Array;
  public pathZ: Int16Array;

  constructor() {
    this.stamp = new Uint32Array(TOTAL_VOXELS);
    this.gScore = new Float32Array(TOTAL_VOXELS);
    this.parentIndex = new Int32Array(TOTAL_VOXELS);

    const HEAP_CAPACITY = 2048;
    this.heapIndex = new Uint32Array(HEAP_CAPACITY);
    this.heapScore = new Float32Array(HEAP_CAPACITY);

    this.pathX = new Int16Array(MAX_PATH_LENGTH);
    this.pathY = new Int16Array(MAX_PATH_LENGTH);
    this.pathZ = new Int16Array(MAX_PATH_LENGTH);
  }

  private pushHeap(idx: number, score: number) {
    if (this.heapSize >= this.heapIndex.length - 1) return;
    let i = this.heapSize++;
    this.heapIndex[i] = idx;
    this.heapScore[i] = score;

    // Up-heap
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heapScore[i] < this.heapScore[p]) {
        // Swap
        const tIdx = this.heapIndex[i];
        const tScr = this.heapScore[i];
        this.heapIndex[i] = this.heapIndex[p];
        this.heapScore[i] = this.heapScore[p];
        this.heapIndex[p] = tIdx;
        this.heapScore[p] = tScr;
        i = p;
      } else {
        break;
      }
    }
  }

  private popHeap(): number {
    if (this.heapSize <= 0) return -1;
    const topIdx = this.heapIndex[0];
    this.heapSize--;

    if (this.heapSize > 0) {
      this.heapIndex[0] = this.heapIndex[this.heapSize];
      this.heapScore[0] = this.heapScore[this.heapSize];

      // Down-heap
      let i = 0;
      while (true) {
        let left = (i << 1) + 1;
        let right = left + 1;
        let smallest = i;

        if (left < this.heapSize && this.heapScore[left] < this.heapScore[smallest]) {
          smallest = left;
        }
        if (right < this.heapSize && this.heapScore[right] < this.heapScore[smallest]) {
          smallest = right;
        }

        if (smallest !== i) {
          const tIdx = this.heapIndex[i];
          const tScr = this.heapScore[i];
          this.heapIndex[i] = this.heapIndex[smallest];
          this.heapScore[i] = this.heapScore[smallest];
          this.heapIndex[smallest] = tIdx;
          this.heapScore[smallest] = tScr;
          i = smallest;
        } else {
          break;
        }
      }
    }

    return topIdx;
  }

  // Check if colonist can stand at (x, y, z):
  // (x, y-1, z) must be solid, and (x, y, z) and (x, y+1, z) must be non-solid air
  private isValidStandPosition(world: VoxelWorld, x: number, y: number, z: number): boolean {
    if (x < 0 || x >= WORLD_W || y < 1 || y >= WORLD_H - 1 || z < 0 || z >= WORLD_D) {
      return false;
    }
    // Block beneath feet must be solid
    if (!world.isSolid(x, y - 1, z)) return false;
    // Space at feet and head must be passable
    if (world.isSolid(x, y, z)) return false;
    if (world.isSolid(x, y + 1, z)) return false;

    return true;
  }

  // Zero-alloc A* search
  public findPath(
    world: VoxelWorld,
    startX: number,
    startY: number,
    startZ: number,
    targetX: number,
    targetY: number,
    targetZ: number
  ): number {
    this.currentStamp++;
    if (this.currentStamp === 0xFFFFFFFF) {
      this.stamp.fill(0);
      this.currentStamp = 1;
    }
    const stampId = this.currentStamp;

    // Validate or adjust start/target positions to valid standing ground
    let sy = startY;
    if (!this.isValidStandPosition(world, startX, sy, startZ)) {
      sy = world.getHighestSolidY(startX, startZ) + 1;
    }

    let ty = targetY;
    if (!this.isValidStandPosition(world, targetX, ty, targetZ)) {
      ty = world.getHighestSolidY(targetX, targetZ) + 1;
    }

    const startIdx = world.getIndex(startX, sy, startZ);
    const targetIdx = world.getIndex(targetX, ty, targetZ);

    if (startIdx < 0 || targetIdx < 0 || startIdx === targetIdx) {
      return 0;
    }

    this.heapSize = 0;
    this.gScore[startIdx] = 0;
    this.parentIndex[startIdx] = -1;
    this.stamp[startIdx] = stampId;

    const initialH = Math.hypot(targetX - startX, targetY - sy, targetZ - startZ);
    this.pushHeap(startIdx, initialH);

    let foundTargetIdx = -1;
    let closestIdx = startIdx;
    let closestDist = initialH;

    let iterations = 0;
    const MAX_ITERATIONS = 700; // Keep fast per-tick frame pacing

    while (this.heapSize > 0 && iterations++ < MAX_ITERATIONS) {
      const curIdx = this.popHeap();
      if (curIdx < 0) break;

      // Unpack coordinates
      const cx = curIdx % WORLD_W;
      const cz = Math.floor(curIdx / WORLD_W) % WORLD_D;
      const cy = Math.floor(curIdx / (WORLD_W * WORLD_D));

      const distToTarget = Math.hypot(targetX - cx, targetY - cy, targetZ - cz);
      if (distToTarget < closestDist) {
        closestDist = distToTarget;
        closestIdx = curIdx;
      }

      // Check if reached destination or within 1 block of target
      if (curIdx === targetIdx || (distToTarget <= 1.5 && Math.abs(cy - ty) <= 1)) {
        foundTargetIdx = curIdx;
        break;
      }

      const curG = this.gScore[curIdx];

      // Try 8 horizontal directions
      for (let d = 0; d < 8; d++) {
        const nx = cx + STEP_DX[d];
        const nz = cz + STEP_DZ[d];

        if (nx < 0 || nx >= WORLD_W || nz < 0 || nz >= WORLD_D) continue;

        // Try same level, step up 1, step down 1 or 2
        const yCandidates = [cy, cy + 1, cy - 1, cy - 2];
        for (let yc = 0; yc < yCandidates.length; yc++) {
          const ny = yCandidates[yc];
          if (ny < 1 || ny >= WORLD_H - 1) continue;

          if (this.isValidStandPosition(world, nx, ny, nz)) {
            const nextIdx = world.getIndex(nx, ny, nz);
            if (nextIdx < 0) continue;

            const stepCost = (d >= 4 ? 1.414 : 1.0) + (ny !== cy ? 0.3 : 0);
            const tentativeG = curG + stepCost;

            if (this.stamp[nextIdx] !== stampId || tentativeG < this.gScore[nextIdx]) {
              this.stamp[nextIdx] = stampId;
              this.gScore[nextIdx] = tentativeG;
              this.parentIndex[nextIdx] = curIdx;

              const h = Math.hypot(targetX - nx, targetY - ny, targetZ - nz);
              this.pushHeap(nextIdx, tentativeG + h * 1.05);
            }
            break; // Found valid Y for this horizontal step
          }
        }
      }
    }

    const endIdx = foundTargetIdx !== -1 ? foundTargetIdx : (closestDist <= 3 ? closestIdx : -1);
    if (endIdx === -1 || endIdx === startIdx) {
      return 0;
    }

    // Reconstruct path into pre-allocated path buffer (reversed)
    let curr = endIdx;
    let length = 0;

    while (curr !== -1 && curr !== startIdx && length < MAX_PATH_LENGTH) {
      const px = curr % WORLD_W;
      const pz = Math.floor(curr / WORLD_W) % WORLD_D;
      const py = Math.floor(curr / (WORLD_W * WORLD_D));

      this.pathX[length] = px;
      this.pathY[length] = py;
      this.pathZ[length] = pz;
      length++;

      curr = this.parentIndex[curr];
    }

    // Reverse path buffer in-place so index 0 is first step
    for (let i = 0; i < (length >> 1); i++) {
      const j = length - 1 - i;

      const tx = this.pathX[i];
      const ty = this.pathY[i];
      const tz = this.pathZ[i];

      this.pathX[i] = this.pathX[j];
      this.pathY[i] = this.pathY[j];
      this.pathZ[i] = this.pathZ[j];

      this.pathX[j] = tx;
      this.pathY[j] = ty;
      this.pathZ[j] = tz;
    }

    return length;
  }
}
