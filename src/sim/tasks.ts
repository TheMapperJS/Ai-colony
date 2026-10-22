import {
  MAX_TASKS,
  TASK_NONE,
  TASK_MINE,
  TASK_BUILD,
  TASK_HARVEST,
  BLOCK_AIR,
  BLOCK_DEFS,
} from './constants';
import { VoxelWorld } from './world';
import { audio } from './audio';

export interface ColonyResources {
  wood: number;
  stone: number;
  food: number;
  dirt: number;
  planks: number;
  cotton: number;
  herbs: number;
  hay: number;
}

export class TaskManager {
  // Structure-of-Arrays for Colony Tasks
  public count: number = 0;
  public taskType: Uint8Array;
  public targetX: Float32Array;
  public targetY: Float32Array;
  public targetZ: Float32Array;
  public blockType: Uint8Array;
  public progress: Float32Array;
  public assignedColonist: Int16Array;
  public priority: Uint8Array;

  // Colony Stockpile Resources
  public resources: ColonyResources = {
    wood: 12,
    stone: 8,
    food: 20,
    dirt: 10,
    planks: 4,
    cotton: 2,
    herbs: 3,
    hay: 4,
  };

  constructor() {
    this.taskType = new Uint8Array(MAX_TASKS);
    this.targetX = new Float32Array(MAX_TASKS);
    this.targetY = new Float32Array(MAX_TASKS);
    this.targetZ = new Float32Array(MAX_TASKS);
    this.blockType = new Uint8Array(MAX_TASKS);
    this.progress = new Float32Array(MAX_TASKS);
    this.assignedColonist = new Int16Array(MAX_TASKS);
    this.priority = new Uint8Array(MAX_TASKS);

    this.assignedColonist.fill(-1);
  }

  public getTaskAt(x: number, y: number, z: number): number {
    for (let i = 0; i < this.count; i++) {
      if (
        this.taskType[i] !== TASK_NONE &&
        Math.floor(this.targetX[i]) === x &&
        Math.floor(this.targetY[i]) === y &&
        Math.floor(this.targetZ[i]) === z
      ) {
        return i;
      }
    }
    return -1;
  }

  public addTask(type: number, x: number, y: number, z: number, blockType: number = 0, priority: number = 1): number {
    // If task already exists here, return it
    const existing = this.getTaskAt(x, y, z);
    if (existing >= 0) return existing;

    if (this.count >= MAX_TASKS - 1) return -1;

    // Check if build task and player has resources
    if (type === TASK_BUILD) {
      const def = BLOCK_DEFS[blockType];
      if (def && def.buildCost) {
        for (const cost of def.buildCost) {
          const resKey = cost.resource as keyof ColonyResources;
          if ((this.resources[resKey] ?? 0) < cost.count) {
            return -2; // Insufficient resources
          }
        }
        // Deduct resources on task queue
        for (const cost of def.buildCost) {
          const resKey = cost.resource as keyof ColonyResources;
          this.resources[resKey] -= cost.count;
        }
      }
    }

    const idx = this.count++;
    this.taskType[idx] = type;
    this.targetX[idx] = x;
    this.targetY[idx] = y;
    this.targetZ[idx] = z;
    this.blockType[idx] = blockType;
    this.progress[idx] = 0;
    this.assignedColonist[idx] = -1;
    this.priority[idx] = priority;

    return idx;
  }

  public cancelTask(idx: number) {
    if (idx < 0 || idx >= this.count || this.taskType[idx] === TASK_NONE) return;

    // Refund resources if build task
    if (this.taskType[idx] === TASK_BUILD) {
      const def = BLOCK_DEFS[this.blockType[idx]];
      if (def && def.buildCost) {
        for (const cost of def.buildCost) {
          const resKey = cost.resource as keyof ColonyResources;
          this.resources[resKey] += cost.count;
        }
      }
    }

    // Swap with last active task to maintain contiguous array without alloc
    const last = this.count - 1;
    if (idx !== last) {
      this.taskType[idx] = this.taskType[last];
      this.targetX[idx] = this.targetX[last];
      this.targetY[idx] = this.targetY[last];
      this.targetZ[idx] = this.targetZ[last];
      this.blockType[idx] = this.blockType[last];
      this.progress[idx] = this.progress[last];
      this.assignedColonist[idx] = this.assignedColonist[last];
      this.priority[idx] = this.priority[last];
    }

    this.taskType[last] = TASK_NONE;
    this.assignedColonist[last] = -1;
    this.count--;
  }

  public cancelTaskAt(x: number, y: number, z: number): boolean {
    const idx = this.getTaskAt(x, y, z);
    if (idx >= 0) {
      this.cancelTask(idx);
      return true;
    }
    return false;
  }

  public findTaskForColonist(colonistIdx: number, cx: number, cy: number, cz: number): number {
    let bestTask = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < this.count; i++) {
      if (this.taskType[i] === TASK_NONE) continue;
      if (this.assignedColonist[i] !== -1 && this.assignedColonist[i] !== colonistIdx) continue;

      const dist = Math.hypot(
        this.targetX[i] - cx,
        this.targetY[i] - cy,
        this.targetZ[i] - cz
      );

      // Score based on priority and distance
      const score = (this.priority[i] * 50) - dist;
      if (score > bestScore) {
        bestScore = score;
        bestTask = i;
      }
    }

    if (bestTask >= 0) {
      this.assignedColonist[bestTask] = colonistIdx;
    }

    return bestTask;
  }

  public completeTask(idx: number, world: VoxelWorld) {
    if (idx < 0 || idx >= this.count) return;

    const tx = Math.floor(this.targetX[idx]);
    const ty = Math.floor(this.targetY[idx]);
    const tz = Math.floor(this.targetZ[idx]);
    const type = this.taskType[idx];

    if (type === TASK_MINE || type === TASK_HARVEST) {
      const currentBlock = world.getBlock(tx, ty, tz);
      const def = BLOCK_DEFS[currentBlock];
      if (def && def.resourceYield) {
        const resKey = def.resourceYield.resource as keyof ColonyResources;
        if (this.resources[resKey] !== undefined) {
          this.resources[resKey] += def.resourceYield.count;
        }
      }
      world.setBlock(tx, ty, tz, BLOCK_AIR);
      audio.playBreak();
    } else if (type === TASK_BUILD) {
      world.setBlock(tx, ty, tz, this.blockType[idx]);
      audio.playPlace();
    }

    audio.playTaskComplete();
    this.cancelTask(idx);
  }
}
