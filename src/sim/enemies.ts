import { WORLD_W, WORLD_D } from './constants';
import { VoxelWorld } from './world';
import { ColonistManager } from './colonists';
import { TaskManager } from './tasks';
import { audio } from './audio';

export const MAX_ENEMIES = 16;

export interface EnemyMeta {
  id: number;
  type: string;
  name: string;
  level: number;
  dropResource: string;
  dropCount: number;
}

export const ENEMY_TYPES = [
  { type: 'slime', name: 'Forest Slime', hp: 30, drop: 'food', count: 3 },
  { type: 'slime_aether', name: 'Aether Slime', hp: 45, drop: 'food', count: 4 },
  { type: 'goblin', name: 'Goblin Scrapper', hp: 50, drop: 'wood', count: 4 },
  { type: 'skeleton_warrior', name: 'Skeleton Legionnaire', hp: 70, drop: 'stone', count: 5 },
  { type: 'orc_brute', name: 'Orc Berserker', hp: 110, drop: 'stone', count: 8 },
  { type: 'stone_golem', name: 'Ancient Stone Golem', hp: 160, drop: 'stone', count: 12 },
];

export class EnemyManager {
  public count: number = 0;

  // Structure-of-Arrays
  public x: Float32Array;
  public y: Float32Array;
  public z: Float32Array;
  public rotation: Float32Array;
  public hp: Float32Array;
  public maxHp: Float32Array;
  public state: Uint8Array; // 0=WANDER, 1=CHASE, 2=ATTACK, 3=DEAD
  public targetColonist: Int16Array;
  public attackCooldown: Float32Array;

  public meta: EnemyMeta[] = [];

  constructor() {
    this.x = new Float32Array(MAX_ENEMIES);
    this.y = new Float32Array(MAX_ENEMIES);
    this.z = new Float32Array(MAX_ENEMIES);
    this.rotation = new Float32Array(MAX_ENEMIES);
    this.hp = new Float32Array(MAX_ENEMIES);
    this.maxHp = new Float32Array(MAX_ENEMIES);
    this.state = new Uint8Array(MAX_ENEMIES);
    this.targetColonist = new Int16Array(MAX_ENEMIES);
    this.attackCooldown = new Float32Array(MAX_ENEMIES);

    this.targetColonist.fill(-1);
  }

  public spawnEnemy(world: VoxelWorld, enemyType?: string, spawnX?: number, spawnZ?: number): number {
    if (this.count >= MAX_ENEMIES) return -1;

    const idx = this.count++;
    const chosenType = enemyType || ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)].type;
    const def = ENEMY_TYPES.find((e) => e.type === chosenType) || ENEMY_TYPES[0];

    const cx = spawnX ?? Math.floor(Math.random() > 0.5 ? Math.random() * 8 + 4 : WORLD_W - 8 - Math.random() * 8);
    const cz = spawnZ ?? Math.floor(Math.random() > 0.5 ? Math.random() * 8 + 4 : WORLD_D - 8 - Math.random() * 8);
    const cy = world.getHighestSolidY(cx, cz) + 1;

    this.x[idx] = cx + 0.5;
    this.y[idx] = cy;
    this.z[idx] = cz + 0.5;
    this.rotation[idx] = Math.random() * Math.PI * 2;
    this.hp[idx] = def.hp;
    this.maxHp[idx] = def.hp;
    this.state[idx] = 0; // WANDER
    this.targetColonist[idx] = -1;
    this.attackCooldown[idx] = 0;

    this.meta[idx] = {
      id: idx,
      type: def.type,
      name: def.name,
      level: 1,
      dropResource: def.drop,
      dropCount: def.count,
    };

    return idx;
  }

  public removeEnemy(idx: number) {
    if (idx < 0 || idx >= this.count) return;

    const last = this.count - 1;
    if (idx !== last) {
      this.x[idx] = this.x[last];
      this.y[idx] = this.y[last];
      this.z[idx] = this.z[last];
      this.rotation[idx] = this.rotation[last];
      this.hp[idx] = this.hp[last];
      this.maxHp[idx] = this.maxHp[last];
      this.state[idx] = this.state[last];
      this.targetColonist[idx] = this.targetColonist[last];
      this.attackCooldown[idx] = this.attackCooldown[last];
      this.meta[idx] = { ...this.meta[last], id: idx };
    }

    this.count--;
  }

  public updateTick(
    world: VoxelWorld,
    colonists: ColonistManager,
    tasks: TaskManager,
    timeScale: number = 1
  ) {
    for (let i = 0; i < this.count; i++) {
      if (this.hp[i] <= 0) {
        // Drop loot to stockpile
        const m = this.meta[i];
        if (m && m.dropResource in tasks.resources) {
          const key = m.dropResource as keyof typeof tasks.resources;
          tasks.resources[key] += m.dropCount;
        }
        audio.playTaskComplete();
        this.removeEnemy(i);
        i--;
        continue;
      }

      this.attackCooldown[i] = Math.max(0, this.attackCooldown[i] - 0.05 * timeScale);

      // Find nearest colonist
      let nearestCol = -1;
      let nearestDist = 8.0; // Aggro radius

      for (let c = 0; c < colonists.count; c++) {
        const dist = Math.hypot(colonists.x[c] - this.x[i], colonists.z[c] - this.z[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestCol = c;
        }
      }

      if (nearestCol >= 0) {
        // Chase / Attack colonist
        const targetX = colonists.x[nearestCol];
        const targetZ = colonists.z[nearestCol];
        const dx = targetX - this.x[i];
        const dz = targetZ - this.z[i];
        const dist = Math.hypot(dx, dz);

        this.rotation[i] = Math.atan2(dx, dz);

        if (dist > 1.2) {
          // Move towards colonist
          const speed = 0.06 * timeScale;
          this.x[i] += (dx / dist) * speed;
          this.z[i] += (dz / dist) * speed;

          const groundY = world.getHighestSolidY(Math.floor(this.x[i]), Math.floor(this.z[i])) + 1;
          this.y[i] = groundY;
        } else {
          // Attack combat exchange
          if (this.attackCooldown[i] <= 0) {
            this.attackCooldown[i] = 1.0;
            audio.playHit();

            // Colonist fights back
            const damageToEnemy = 15;
            this.hp[i] -= damageToEnemy;

            // Damage to colonist
            colonists.health[nearestCol] = Math.max(10, colonists.health[nearestCol] - 6);
            colonists.meta[nearestCol].thought = 'Defending the colony from threats!';
          }
        }
      } else {
        // Peaceful wander
        if (Math.random() < 0.03 * timeScale) {
          this.rotation[i] += (Math.random() - 0.5) * 1.5;
        }
        const speed = 0.02 * timeScale;
        const nx = this.x[i] + Math.sin(this.rotation[i]) * speed;
        const nz = this.z[i] + Math.cos(this.rotation[i]) * speed;

        if (nx > 2 && nx < WORLD_W - 3 && nz > 2 && nz < WORLD_D - 3) {
          this.x[i] = nx;
          this.z[i] = nz;
          this.y[i] = world.getHighestSolidY(Math.floor(nx), Math.floor(nz)) + 1;
        } else {
          this.rotation[i] += Math.PI;
        }
      }
    }
  }
}
