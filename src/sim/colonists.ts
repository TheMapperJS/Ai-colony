import {
  MAX_COLONISTS,
  STATE_IDLE,
  STATE_WALK,
  STATE_MINE,
  STATE_BUILD,
  STATE_HARVEST,
  STATE_EAT,
  STATE_SLEEP,
  STATE_WANDER,
  TASK_MINE,
  TASK_BUILD,
  TASK_HARVEST,
  BLOCK_AIR,
  BLOCK_CAMPFIRE,
  BLOCK_BED,
  WORLD_W,
  WORLD_D,
} from './constants';
import { VoxelWorld } from './world';
import { TaskManager } from './tasks';
import { VoxelPathfinder, MAX_PATH_LENGTH } from './pathfinding';
import { audio } from './audio';

export interface ColonistMeta {
  id: number;
  name: string;
  archetypeId: string;
  archetypeName: string;
  trait: string;
  equippedWeapon: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  thought: string;
}

const FIRST_NAMES = [
  'Ada', 'Bo', 'Cyrus', 'Dawn', 'Eli', 'Faye', 'Gideon', 'Hazel',
  'Isaac', 'Juno', 'Kai', 'Lyra', 'Milo', 'Nora', 'Orion', 'Piper',
];

const ARCHETYPE_KEYS = [
  'ranger', 'paladin', 'mage', 'rogue', 'berserker', 'valkyrie', 'druid', 'monk', 'pirate', 'necromancer'
];

const ARCHETYPE_WEAPONS: Record<string, string> = {
  ranger: 'ash_spear',
  paladin: 'sword',
  mage: 'spell_tome',
  rogue: 'shadow_dagger',
  berserker: 'battleaxe',
  valkyrie: 'sword',
  druid: 'hatchet',
  monk: 'ash_spear',
  pirate: 'sword',
  necromancer: 'shadow_dagger',
};

const ARCHETYPE_TITLES: Record<string, string> = {
  ranger: 'Woodland Scout',
  paladin: 'Holy Guardian',
  mage: 'Spellweaver',
  rogue: 'Shadow Blade',
  berserker: 'Frostwolf Miner',
  valkyrie: 'Celestial Knight',
  druid: 'Earth Warden',
  monk: 'Temple Craftsman',
  pirate: 'Swashbuckler',
  necromancer: 'Night Laborer',
};

const SHIRT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const HAIR_COLORS = ['#451a03', '#78350f', '#1c1917', '#eab308', '#d97706'];
const SKIN_COLORS = ['#fcd34d', '#fbcfe8', '#fed7aa', '#fde68a', '#d6d3d1'];

export class ColonistManager {
  public count: number = 0;

  // Structure-of-Arrays
  public x: Float32Array;
  public y: Float32Array;
  public z: Float32Array;
  public vx: Float32Array;
  public vy: Float32Array;
  public vz: Float32Array;
  public rotation: Float32Array; // Facing angle

  public targetX: Float32Array;
  public targetY: Float32Array;
  public targetZ: Float32Array;

  public state: Uint8Array;
  public taskId: Int32Array;
  public workProgress: Float32Array;

  public hunger: Float32Array;    // 0 = full, 100 = starving
  public energy: Float32Array;    // 100 = rested, 0 = exhausted
  public happiness: Float32Array; // 100 = thrilled, 0 = miserable
  public health: Float32Array;

  // Path buffers per colonist (stride = MAX_PATH_LENGTH)
  public pathStep: Int16Array;
  public pathLen: Int16Array;
  public pathBufX: Int16Array;
  public pathBufY: Int16Array;
  public pathBufZ: Int16Array;

  public meta: ColonistMeta[] = [];

  constructor() {
    this.x = new Float32Array(MAX_COLONISTS);
    this.y = new Float32Array(MAX_COLONISTS);
    this.z = new Float32Array(MAX_COLONISTS);
    this.vx = new Float32Array(MAX_COLONISTS);
    this.vy = new Float32Array(MAX_COLONISTS);
    this.vz = new Float32Array(MAX_COLONISTS);
    this.rotation = new Float32Array(MAX_COLONISTS);

    this.targetX = new Float32Array(MAX_COLONISTS);
    this.targetY = new Float32Array(MAX_COLONISTS);
    this.targetZ = new Float32Array(MAX_COLONISTS);

    this.state = new Uint8Array(MAX_COLONISTS);
    this.taskId = new Int32Array(MAX_COLONISTS);
    this.workProgress = new Float32Array(MAX_COLONISTS);

    this.hunger = new Float32Array(MAX_COLONISTS);
    this.energy = new Float32Array(MAX_COLONISTS);
    this.happiness = new Float32Array(MAX_COLONISTS);
    this.health = new Float32Array(MAX_COLONISTS);

    this.pathStep = new Int16Array(MAX_COLONISTS);
    this.pathLen = new Int16Array(MAX_COLONISTS);
    this.pathBufX = new Int16Array(MAX_COLONISTS * MAX_PATH_LENGTH);
    this.pathBufY = new Int16Array(MAX_COLONISTS * MAX_PATH_LENGTH);
    this.pathBufZ = new Int16Array(MAX_COLONISTS * MAX_PATH_LENGTH);

    this.taskId.fill(-1);
  }

  public spawnColonist(world: VoxelWorld, spawnX?: number, spawnZ?: number): number {
    if (this.count >= MAX_COLONISTS) return -1;

    const idx = this.count++;
    const cx = spawnX ?? Math.floor(WORLD_W / 2 + (Math.random() * 4 - 2));
    const cz = spawnZ ?? Math.floor(WORLD_D / 2 + (Math.random() * 4 - 2));
    const cy = world.getHighestSolidY(cx, cz) + 1;

    this.x[idx] = cx + 0.5;
    this.y[idx] = cy;
    this.z[idx] = cz + 0.5;
    this.vx[idx] = 0;
    this.vy[idx] = 0;
    this.vz[idx] = 0;
    this.rotation[idx] = Math.random() * Math.PI * 2;

    this.targetX[idx] = cx;
    this.targetY[idx] = cy;
    this.targetZ[idx] = cz;

    this.state[idx] = STATE_IDLE;
    this.taskId[idx] = -1;
    this.workProgress[idx] = 0;

    this.hunger[idx] = 10 + Math.random() * 20;
    this.energy[idx] = 80 + Math.random() * 20;
    this.happiness[idx] = 85;
    this.health[idx] = 100;

    this.pathStep[idx] = 0;
    this.pathLen[idx] = 0;

    const name = FIRST_NAMES[idx % FIRST_NAMES.length];
    const archKey = ARCHETYPE_KEYS[idx % ARCHETYPE_KEYS.length];
    const trait = ARCHETYPE_TITLES[archKey] || 'Colony Pioneer';
    const equippedWeapon = ARCHETYPE_WEAPONS[archKey] || 'battleaxe';
    const shirtColor = SHIRT_COLORS[idx % SHIRT_COLORS.length];
    const hairColor = HAIR_COLORS[idx % HAIR_COLORS.length];
    const skinColor = SKIN_COLORS[idx % SKIN_COLORS.length];

    this.meta[idx] = {
      id: idx,
      name,
      archetypeId: archKey,
      archetypeName: archKey.toUpperCase(),
      trait,
      equippedWeapon,
      shirtColor,
      hairColor,
      skinColor,
      thought: `Ready to serve as ${trait}!`,
    };

    return idx;
  }

  // Request a path for colonist to target
  public setColonistDestination(
    idx: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    pathfinder: VoxelPathfinder,
    world: VoxelWorld,
    nextState: number = STATE_WALK
  ): boolean {
    const startX = Math.floor(this.x[idx]);
    const startY = Math.floor(this.y[idx]);
    const startZ = Math.floor(this.z[idx]);

    const len = pathfinder.findPath(world, startX, startY, startZ, targetX, targetY, targetZ);
    if (len <= 0) {
      return false;
    }

    const baseOffset = idx * MAX_PATH_LENGTH;
    for (let i = 0; i < len; i++) {
      this.pathBufX[baseOffset + i] = pathfinder.pathX[i];
      this.pathBufY[baseOffset + i] = pathfinder.pathY[i];
      this.pathBufZ[baseOffset + i] = pathfinder.pathZ[i];
    }

    this.pathStep[idx] = 0;
    this.pathLen[idx] = len;
    this.targetX[idx] = targetX;
    this.targetY[idx] = targetY;
    this.targetZ[idx] = targetZ;
    this.state[idx] = nextState;

    return true;
  }

  // Find nearest campfire or bed for sleeping/resting
  public findRestSpot(world: VoxelWorld, cx: number, cz: number): [number, number, number] | null {
    let closestDist = Infinity;
    let spot: [number, number, number] | null = null;

    for (let x = 0; x < WORLD_W; x++) {
      for (let z = 0; z < WORLD_D; z++) {
        const topY = world.getHighestSolidY(x, z);
        const b = world.getBlock(x, topY, z);
        const above = world.getBlock(x, topY + 1, z);

        if (b === BLOCK_BED || above === BLOCK_CAMPFIRE || above === BLOCK_BED) {
          const d = Math.hypot(x - cx, z - cz);
          if (d < closestDist) {
            closestDist = d;
            spot = [x, topY + 1, z];
          }
        }
      }
    }
    return spot;
  }

  // Simulation tick (fixed timestep e.g. 20 Hz)
  public updateTick(
    world: VoxelWorld,
    tasks: TaskManager,
    pathfinder: VoxelPathfinder,
    timeScale: number = 1
  ) {
    for (let i = 0; i < this.count; i++) {
      // 1. Update Needs
      this.hunger[i] = Math.min(100, this.hunger[i] + 0.05 * timeScale);
      this.energy[i] = Math.max(0, this.energy[i] - 0.03 * timeScale);

      // Happiness calculation
      let happiness = 100;
      if (this.hunger[i] > 60) happiness -= (this.hunger[i] - 60) * 1.2;
      if (this.energy[i] < 40) happiness -= (40 - this.energy[i]) * 1.2;
      this.happiness[i] = Math.max(10, Math.min(100, happiness));

      const curState = this.state[i];

      // 2. Priority check: Hunger > Energy > Work > Wander
      if (curState !== STATE_EAT && curState !== STATE_SLEEP) {
        if (this.hunger[i] > 75 && tasks.resources.food > 0) {
          // Switch to find food
          const centerX = Math.floor(WORLD_W / 2);
          const centerZ = Math.floor(WORLD_D / 2);
          const centerY = world.getHighestSolidY(centerX, centerZ) + 1;
          const ok = this.setColonistDestination(i, centerX, centerY, centerZ, pathfinder, world, STATE_EAT);
          if (ok) {
            this.meta[i].thought = 'Starving! Heading to stockpile for food.';
            continue;
          }
        } else if (this.energy[i] < 20) {
          // Switch to rest
          const spot = this.findRestSpot(world, this.x[i], this.z[i]);
          if (spot) {
            const ok = this.setColonistDestination(i, spot[0], spot[1], spot[2], pathfinder, world, STATE_SLEEP);
            if (ok) {
              this.meta[i].thought = 'Exhausted... Heading to rest.';
              continue;
            }
          }
        }
      }

      // 3. State Machine Execution
      switch (curState) {
        case STATE_IDLE: {
          this.meta[i].thought = 'Looking for work...';
          // Find task
          const tIdx = tasks.findTaskForColonist(i, this.x[i], this.y[i], this.z[i]);
          if (tIdx >= 0) {
            this.taskId[i] = tIdx;
            const tx = Math.floor(tasks.targetX[tIdx]);
            const ty = Math.floor(tasks.targetY[tIdx]);
            const tz = Math.floor(tasks.targetZ[tIdx]);

            // Walk to task
            const ok = this.setColonistDestination(i, tx, ty, tz, pathfinder, world, STATE_WALK);
            if (ok) {
              const tType = tasks.taskType[tIdx];
              this.meta[i].thought = tType === TASK_MINE ? 'Going to mine block' : tType === TASK_BUILD ? 'Going to build structure' : 'Going to harvest crop';
            } else {
              tasks.assignedColonist[tIdx] = -1;
              this.taskId[i] = -1;
            }
          } else {
            // Chance to wander around
            if (Math.random() < 0.05 * timeScale) {
              const wanderX = Math.floor(Math.max(2, Math.min(WORLD_W - 3, this.x[i] + (Math.random() * 10 - 5))));
              const wanderZ = Math.floor(Math.max(2, Math.min(WORLD_D - 3, this.z[i] + (Math.random() * 10 - 5))));
              const wanderY = world.getHighestSolidY(wanderX, wanderZ) + 1;
              const ok = this.setColonistDestination(i, wanderX, wanderY, wanderZ, pathfinder, world, STATE_WANDER);
              if (ok) {
                this.meta[i].thought = 'Taking a peaceful stroll.';
              }
            }
          }
          break;
        }

        case STATE_WALK:
        case STATE_WANDER: {
          const step = this.pathStep[i];
          const len = this.pathLen[i];
          const baseOffset = i * MAX_PATH_LENGTH;

          if (step < len) {
            const nextX = this.pathBufX[baseOffset + step] + 0.5;
            const nextY = this.pathBufY[baseOffset + step];
            const nextZ = this.pathBufZ[baseOffset + step] + 0.5;

            const dx = nextX - this.x[i];
            const dy = nextY - this.y[i];
            const dz = nextZ - this.z[i];
            const dist = Math.hypot(dx, dz);

            // Facing rotation
            if (dist > 0.05) {
              this.rotation[i] = Math.atan2(dx, dz);
            }

            const speed = 0.12 * timeScale;
            if (dist <= speed && Math.abs(dy) <= 1.2) {
              this.x[i] = nextX;
              this.y[i] = nextY;
              this.z[i] = nextZ;
              this.pathStep[i]++;
            } else {
              // Move towards next step
              this.x[i] += (dx / dist) * Math.min(speed, dist);
              this.y[i] += dy * 0.2; // Smooth Y climb
              this.z[i] += (dz / dist) * Math.min(speed, dist);
            }
          } else {
            // Reached path end
            if (curState === STATE_WANDER) {
              this.state[i] = STATE_IDLE;
            } else {
              // Reached task destination
              const tIdx = this.taskId[i];
              if (tIdx >= 0 && tasks.taskType[tIdx] !== 0) {
                const tType = tasks.taskType[tIdx];
                this.state[i] = tType === TASK_MINE ? STATE_MINE : tType === TASK_BUILD ? STATE_BUILD : STATE_HARVEST;
                this.workProgress[i] = 0;
              } else {
                this.state[i] = STATE_IDLE;
              }
            }
          }
          break;
        }

        case STATE_MINE:
        case STATE_BUILD:
        case STATE_HARVEST: {
          const tIdx = this.taskId[i];
          if (tIdx < 0 || tasks.taskType[tIdx] === 0) {
            this.state[i] = STATE_IDLE;
            this.taskId[i] = -1;
            break;
          }

          // Work on task
          this.workProgress[i] += 4.0 * timeScale;
          tasks.progress[tIdx] = this.workProgress[i];

          // Hit audio ticks
          if (Math.random() < 0.25 * timeScale) {
            audio.playHit();
          }

          if (curState === STATE_MINE) this.meta[i].thought = 'Mining away!';
          else if (curState === STATE_BUILD) this.meta[i].thought = 'Constructing building!';
          else this.meta[i].thought = 'Harvesting fresh crops!';

          if (this.workProgress[i] >= 100) {
            tasks.completeTask(tIdx, world);
            this.state[i] = STATE_IDLE;
            this.taskId[i] = -1;
            this.workProgress[i] = 0;
            this.meta[i].thought = 'Job done! That feels great.';
          }
          break;
        }

        case STATE_EAT: {
          this.meta[i].thought = 'Munching on colony food... Delicious!';
          this.hunger[i] = Math.max(0, this.hunger[i] - 15 * timeScale);
          if (Math.random() < 0.3) audio.playEat();

          if (this.hunger[i] <= 5) {
            if (tasks.resources.food > 0) {
              tasks.resources.food = Math.max(0, tasks.resources.food - 1);
            }
            this.hunger[i] = 0;
            this.state[i] = STATE_IDLE;
            this.meta[i].thought = 'Fully satisfied and nourished!';
          }
          break;
        }

        case STATE_SLEEP: {
          this.meta[i].thought = 'Zzz... Resting peacefully...';
          this.energy[i] = Math.min(100, this.energy[i] + 5 * timeScale);
          if (this.energy[i] >= 95) {
            this.energy[i] = 100;
            this.state[i] = STATE_IDLE;
            this.meta[i].thought = 'Awake, refreshed and ready!';
          }
          break;
        }
      }
    }
  }
}
