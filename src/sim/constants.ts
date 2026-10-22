// Voxel Colony Sim - Constants & Data Types

export const CHUNK_SIZE = 16;
export const CHUNKS_X = 3; // 48 voxels wide
export const CHUNKS_Z = 3; // 48 voxels deep
export const CHUNKS_Y = 1; // 16 voxels high
export const WORLD_W = CHUNKS_X * CHUNK_SIZE; // 48
export const WORLD_D = CHUNKS_Z * CHUNK_SIZE; // 48
export const WORLD_H = CHUNKS_Y * CHUNK_SIZE; // 16
export const TOTAL_CHUNKS = CHUNKS_X * CHUNKS_Z * CHUNKS_Y; // 9 chunks
export const TOTAL_VOXELS = WORLD_W * WORLD_H * WORLD_D;

// Block Types
export const BLOCK_AIR = 0;
export const BLOCK_GRASS = 1;
export const BLOCK_DIRT = 2;
export const BLOCK_STONE = 3;
export const BLOCK_WOOD = 4;
export const BLOCK_LEAVES = 5;
export const BLOCK_WATER = 6;
export const BLOCK_PLANKS = 7;
export const BLOCK_COBBLE = 8;
export const BLOCK_WHEAT = 9;
export const BLOCK_CAMPFIRE = 10;
export const BLOCK_BED = 11;
export const BLOCK_STOCKPILE = 12;
export const BLOCK_STRAWBERRY = 13;
export const BLOCK_CORN = 14;
export const BLOCK_POTATOES = 15;
export const BLOCK_BEETS = 16;
export const BLOCK_HERBS = 17;
export const BLOCK_COTTON = 18;
export const BLOCK_HAY = 19;

export interface BlockDef {
  id: number;
  name: string;
  isSolid: boolean;
  isTransparent: boolean;
  color: [number, number, number]; // RGB 0-1
  topColor?: [number, number, number];
  bottomColor?: [number, number, number];
  resourceYield?: { resource: string; count: number };
  buildCost?: { resource: string; count: number }[];
  isCrop?: boolean;
  cropType?: string;
}

export const BLOCK_DEFS: Record<number, BlockDef> = {
  [BLOCK_AIR]: {
    id: BLOCK_AIR,
    name: 'Air',
    isSolid: false,
    isTransparent: true,
    color: [0, 0, 0],
  },
  [BLOCK_GRASS]: {
    id: BLOCK_GRASS,
    name: 'Grass',
    isSolid: true,
    isTransparent: false,
    color: [0.38, 0.65, 0.28],
    topColor: [0.42, 0.72, 0.31],
    bottomColor: [0.48, 0.34, 0.22],
    resourceYield: { resource: 'dirt', count: 1 },
  },
  [BLOCK_DIRT]: {
    id: BLOCK_DIRT,
    name: 'Dirt',
    isSolid: true,
    isTransparent: false,
    color: [0.48, 0.34, 0.22],
    resourceYield: { resource: 'dirt', count: 1 },
    buildCost: [{ resource: 'dirt', count: 1 }],
  },
  [BLOCK_STONE]: {
    id: BLOCK_STONE,
    name: 'Stone',
    isSolid: true,
    isTransparent: false,
    color: [0.55, 0.55, 0.57],
    resourceYield: { resource: 'stone', count: 1 },
  },
  [BLOCK_WOOD]: {
    id: BLOCK_WOOD,
    name: 'Wood Log',
    isSolid: true,
    isTransparent: false,
    color: [0.45, 0.30, 0.16],
    topColor: [0.65, 0.48, 0.28],
    resourceYield: { resource: 'wood', count: 2 },
    buildCost: [{ resource: 'wood', count: 1 }],
  },
  [BLOCK_LEAVES]: {
    id: BLOCK_LEAVES,
    name: 'Leaves',
    isSolid: true,
    isTransparent: false,
    color: [0.26, 0.52, 0.22],
    resourceYield: { resource: 'food', count: 1 },
  },
  [BLOCK_WATER]: {
    id: BLOCK_WATER,
    name: 'Water',
    isSolid: false,
    isTransparent: true,
    color: [0.18, 0.45, 0.75],
  },
  [BLOCK_PLANKS]: {
    id: BLOCK_PLANKS,
    name: 'Wood Planks',
    isSolid: true,
    isTransparent: false,
    color: [0.72, 0.53, 0.32],
    resourceYield: { resource: 'wood', count: 1 },
    buildCost: [{ resource: 'wood', count: 1 }],
  },
  [BLOCK_COBBLE]: {
    id: BLOCK_COBBLE,
    name: 'Cobblestone',
    isSolid: true,
    isTransparent: false,
    color: [0.42, 0.42, 0.44],
    resourceYield: { resource: 'stone', count: 1 },
    buildCost: [{ resource: 'stone', count: 1 }],
  },
  [BLOCK_WHEAT]: {
    id: BLOCK_WHEAT,
    name: 'Wheat Crop',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'wheat',
    color: [0.85, 0.76, 0.25],
    resourceYield: { resource: 'food', count: 3 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_STRAWBERRY]: {
    id: BLOCK_STRAWBERRY,
    name: 'Strawberry Bush',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'strawberry',
    color: [0.92, 0.22, 0.28],
    resourceYield: { resource: 'food', count: 4 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_CORN]: {
    id: BLOCK_CORN,
    name: 'Sweetcorn Stalk',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'corn',
    color: [0.94, 0.85, 0.22],
    resourceYield: { resource: 'food', count: 5 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_POTATOES]: {
    id: BLOCK_POTATOES,
    name: 'Potato Plant',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'potatoes',
    color: [0.72, 0.58, 0.38],
    resourceYield: { resource: 'food', count: 4 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_BEETS]: {
    id: BLOCK_BEETS,
    name: 'Beetroot Crop',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'beets',
    color: [0.65, 0.15, 0.32],
    resourceYield: { resource: 'food', count: 3 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_HERBS]: {
    id: BLOCK_HERBS,
    name: 'Medicinal Herbs',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'herbs',
    color: [0.28, 0.78, 0.45],
    resourceYield: { resource: 'herbs', count: 2 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_COTTON]: {
    id: BLOCK_COTTON,
    name: 'Cotton Crop',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'cotton',
    color: [0.95, 0.95, 0.92],
    resourceYield: { resource: 'cotton', count: 3 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_HAY]: {
    id: BLOCK_HAY,
    name: 'Pasture Hay',
    isSolid: false,
    isTransparent: true,
    isCrop: true,
    cropType: 'hay',
    color: [0.78, 0.72, 0.35],
    resourceYield: { resource: 'hay', count: 3 },
    buildCost: [{ resource: 'food', count: 1 }],
  },
  [BLOCK_CAMPFIRE]: {
    id: BLOCK_CAMPFIRE,
    name: 'Campfire',
    isSolid: false,
    isTransparent: true,
    color: [0.92, 0.45, 0.12],
    buildCost: [{ resource: 'wood', count: 2 }, { resource: 'stone', count: 2 }],
  },
  [BLOCK_BED]: {
    id: BLOCK_BED,
    name: 'Colonist Bed',
    isSolid: false,
    isTransparent: true,
    color: [0.82, 0.25, 0.25],
    buildCost: [{ resource: 'wood', count: 3 }],
  },
  [BLOCK_STOCKPILE]: {
    id: BLOCK_STOCKPILE,
    name: 'Stockpile Zone',
    isSolid: false,
    isTransparent: true,
    color: [0.85, 0.65, 0.3],
    buildCost: [{ resource: 'wood', count: 1 }],
  },
};

// Colonist AI States
export const STATE_IDLE = 0;
export const STATE_WALK = 1;
export const STATE_MINE = 2;
export const STATE_BUILD = 3;
export const STATE_HARVEST = 4;
export const STATE_EAT = 5;
export const STATE_SLEEP = 6;
export const STATE_WANDER = 7;

export const STATE_NAMES: Record<number, string> = {
  [STATE_IDLE]: 'Idle',
  [STATE_WALK]: 'Traveling',
  [STATE_MINE]: 'Mining',
  [STATE_BUILD]: 'Constructing',
  [STATE_HARVEST]: 'Harvesting',
  [STATE_EAT]: 'Eating',
  [STATE_SLEEP]: 'Sleeping',
  [STATE_WANDER]: 'Strolling',
};

// Task Types
export const TASK_NONE = 0;
export const TASK_MINE = 1;
export const TASK_BUILD = 2;
export const TASK_HARVEST = 3;

export const MAX_COLONISTS = 32;
export const MAX_TASKS = 256;
export const MAX_PARTICLES = 128;
