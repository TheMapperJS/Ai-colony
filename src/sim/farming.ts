import {
  BLOCK_AIR,
  BLOCK_WHEAT,
  BLOCK_STRAWBERRY,
  BLOCK_CORN,
  BLOCK_POTATOES,
  BLOCK_BEETS,
  BLOCK_HERBS,
  BLOCK_COTTON,
  BLOCK_HAY,
  TASK_HARVEST,
} from './constants';
import { VoxelWorld } from './world';
import { TaskManager, ColonyResources } from './tasks';
import { audio } from './audio';

export type CropType =
  | 'wheat'
  | 'strawberry'
  | 'corn'
  | 'potatoes'
  | 'beets'
  | 'herbs'
  | 'cotton'
  | 'hay';

export interface CropDef {
  blockId: number;
  cropType: CropType;
  name: string;
  icon: string;
  resourceKey: keyof ColonyResources;
  yieldCount: number;
  growthTime: number; // in seconds
  description: string;
}

export const CROPS: Record<CropType, CropDef> = {
  wheat: {
    blockId: BLOCK_WHEAT,
    cropType: 'wheat',
    name: 'Wheat Crop',
    icon: '🌾',
    resourceKey: 'food',
    yieldCount: 3,
    growthTime: 16,
    description: 'Golden staple grain, harvested to feed hungry colonists.',
  },
  strawberry: {
    blockId: BLOCK_STRAWBERRY,
    cropType: 'strawberry',
    name: 'Strawberry Bush',
    icon: '🍓',
    resourceKey: 'food',
    yieldCount: 4,
    growthTime: 12,
    description: 'Sweet berry bush with fast growth cycle and high morale.',
  },
  corn: {
    blockId: BLOCK_CORN,
    cropType: 'corn',
    name: 'Sweetcorn Stalk',
    icon: '🌽',
    resourceKey: 'food',
    yieldCount: 5,
    growthTime: 22,
    description: 'Tall golden stalks producing abundant calorie-dense ears.',
  },
  potatoes: {
    blockId: BLOCK_POTATOES,
    cropType: 'potatoes',
    name: 'Potato Plant',
    icon: '🥔',
    resourceKey: 'food',
    yieldCount: 4,
    growthTime: 15,
    description: 'Hardy tubers that thrive in all soil and weather conditions.',
  },
  beets: {
    blockId: BLOCK_BEETS,
    cropType: 'beets',
    name: 'Beetroot Crop',
    icon: '🟣',
    resourceKey: 'food',
    yieldCount: 3,
    growthTime: 14,
    description: 'Deep crimson root vegetables packed with essential nutrients.',
  },
  herbs: {
    blockId: BLOCK_HERBS,
    cropType: 'herbs',
    name: 'Medicinal Herbs',
    icon: '🌿',
    resourceKey: 'herbs',
    yieldCount: 2,
    growthTime: 18,
    description: 'Fragrant medicinal plants used for healing and restoring vitality.',
  },
  cotton: {
    blockId: BLOCK_COTTON,
    cropType: 'cotton',
    name: 'Cotton Crop',
    icon: '☁️',
    resourceKey: 'cotton',
    yieldCount: 3,
    growthTime: 18,
    description: 'Fluffy white bolls providing cloth fibers for bedding and warm garb.',
  },
  hay: {
    blockId: BLOCK_HAY,
    cropType: 'hay',
    name: 'Pasture Hay',
    icon: '🌾',
    resourceKey: 'hay',
    yieldCount: 3,
    growthTime: 13,
    description: 'Sun-dried grass fodder used for thatch roofs and animal bedding.',
  },
};

export const CROP_TYPE_LIST: CropType[] = [
  'wheat',
  'strawberry',
  'corn',
  'potatoes',
  'beets',
  'herbs',
  'cotton',
  'hay',
];

export interface FarmPlot {
  x: number;
  y: number;
  z: number;
  cropType: CropType;
  stage: number; // 0 = sprout, 1 = growing, 2 = mature
  growth: number; // 0..100%
  watered: boolean;
  harvestTaskId: number;
  autoReplant: boolean;
}

export class FarmManager {
  public plots: FarmPlot[] = [];
  private plotMap = new Map<number, FarmPlot>();

  private packKey(x: number, y: number, z: number): number {
    return (x & 0x7f) | ((y & 0x7f) << 7) | ((z & 0x7f) << 14);
  }

  public getPlot(x: number, y: number, z: number): FarmPlot | undefined {
    return this.plotMap.get(this.packKey(x, y, z));
  }

  public scanWorldForCrops(world: VoxelWorld, tasks?: TaskManager) {
    this.plots = [];
    this.plotMap.clear();

    for (let x = 0; x < 48; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 48; z++) {
          const blockId = world.getBlock(x, y, z);
          for (const cropType of CROP_TYPE_LIST) {
            const def = CROPS[cropType];
            if (def && def.blockId === blockId) {
              const stage = world.getMeta(x, y, z) || 2;
              const key = this.packKey(x, y, z);
              const plot: FarmPlot = {
                x,
                y,
                z,
                cropType,
                stage,
                growth: stage === 2 ? 100 : stage === 1 ? 45 : 0,
                watered: true,
                harvestTaskId: -1,
                autoReplant: true,
              };
              this.plots.push(plot);
              this.plotMap.set(key, plot);
              if (stage === 2 && tasks) {
                plot.harvestTaskId = tasks.addTask(TASK_HARVEST, x, y, z, def.blockId, 2);
              }
              break;
            }
          }
        }
      }
    }
  }

  public plantCrop(
    cropType: CropType,
    x: number,
    y: number,
    z: number,
    world: VoxelWorld,
    tasks?: TaskManager,
    initialStage: number = 0
  ): boolean {
    const key = this.packKey(x, y, z);
    if (this.plotMap.has(key)) return false;

    const def = CROPS[cropType];
    if (!def) return false;

    // Check if player has food/seed to plant (if tasks passed)
    if (tasks && tasks.resources.food < 1 && initialStage === 0) {
      return false;
    }
    if (tasks && initialStage === 0) {
      tasks.resources.food = Math.max(0, tasks.resources.food - 1);
    }

    world.setBlock(x, y, z, def.blockId);
    world.blockMeta[world.getIndex(x, y, z)] = initialStage;

    const plot: FarmPlot = {
      x,
      y,
      z,
      cropType,
      stage: initialStage,
      growth: initialStage === 2 ? 100 : initialStage === 1 ? 45 : 0,
      watered: true,
      harvestTaskId: -1,
      autoReplant: true,
    };

    this.plots.push(plot);
    this.plotMap.set(key, plot);

    if (initialStage === 2 && tasks) {
      plot.harvestTaskId = tasks.addTask(TASK_HARVEST, x, y, z, def.blockId, 2);
    }

    audio.playPlace();
    return true;
  }

  public removePlot(x: number, y: number, z: number) {
    const key = this.packKey(x, y, z);
    const plot = this.plotMap.get(key);
    if (!plot) return;

    this.plotMap.delete(key);
    const idx = this.plots.indexOf(plot);
    if (idx >= 0) {
      this.plots.splice(idx, 1);
    }
  }

  public harvestPlot(
    plot: FarmPlot,
    world: VoxelWorld,
    tasks: TaskManager,
    isDruid: boolean = false
  ): number {
    const def = CROPS[plot.cropType];
    if (!def) return 0;

    let count = def.yieldCount;
    if (isDruid) {
      count = Math.ceil(count * 1.5); // Druid perk: +50% Crop Yield!
    }

    // Deposit harvested produce into colony stockpile
    const resKey = def.resourceKey;
    if (tasks.resources[resKey] !== undefined) {
      tasks.resources[resKey] += count;
    }

    // Special bonus: Harvesting medicinal herbs also gives +1 food
    if (plot.cropType === 'herbs') {
      tasks.resources.food += 1;
    }

    audio.playBreak();

    if (plot.autoReplant) {
      // Replant immediately into sprout
      plot.stage = 0;
      plot.growth = 0;
      plot.harvestTaskId = -1;
      const idx = world.getIndex(plot.x, plot.y, plot.z);
      if (idx >= 0) world.blockMeta[idx] = 0;
    } else {
      // Clear block back to air
      world.setBlock(plot.x, plot.y, plot.z, BLOCK_AIR);
      this.removePlot(plot.x, plot.y, plot.z);
    }

    return count;
  }

  public update(dt: number, world: VoxelWorld, tasks: TaskManager) {
    // Progress crop growth
    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      const def = CROPS[plot.cropType];
      if (!def) continue;

      // Verify block is still present in world
      const currentBlock = world.getBlock(plot.x, plot.y, plot.z);
      if (currentBlock !== def.blockId) {
        this.removePlot(plot.x, plot.y, plot.z);
        i--;
        continue;
      }

      if (plot.stage < 2) {
        // Growth speed factor (15-22s base)
        const rate = (100 / def.growthTime) * dt * (plot.watered ? 1.25 : 1.0);
        plot.growth = Math.min(100, plot.growth + rate);

        if (plot.growth >= 35 && plot.stage === 0) {
          plot.stage = 1; // Growing stage
          const idx = world.getIndex(plot.x, plot.y, plot.z);
          if (idx >= 0) world.blockMeta[idx] = 1;
        }

        if (plot.growth >= 100 && plot.stage === 1) {
          plot.stage = 2; // Mature stage
          const idx = world.getIndex(plot.x, plot.y, plot.z);
          if (idx >= 0) world.blockMeta[idx] = 2;

          // Dispatch automatic harvest task
          if (plot.harvestTaskId === -1) {
            plot.harvestTaskId = tasks.addTask(
              TASK_HARVEST,
              plot.x,
              plot.y,
              plot.z,
              def.blockId,
              2
            );
          }
        }
      } else {
        // Already mature, ensure harvest task is active
        if (plot.harvestTaskId === -1) {
          plot.harvestTaskId = tasks.addTask(
            TASK_HARVEST,
            plot.x,
            plot.y,
            plot.z,
            def.blockId,
            2
          );
        }
      }
    }
  }
}
