import * as THREE from 'three';
import { VoxelRigBuilder } from './voxelRigBuilder';

export const PART_NAMES = [
  'Shoulder_right',
  'Right_Arm_Hand',
  'Head_Hair_Ears',
  'Shoulder_left',
  'Left_Arm_Hand',
  'Torso_Body',
  'Right_Foot',
  'Left_Foot',
];

export interface ArchetypeDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  statBonus: string;
  createBuilder: () => VoxelRigBuilder;
}

function buildBaseHumanoid(
  v: VoxelRigBuilder,
  skinLight: [number, number, number],
  skinDark: [number, number, number],
  blush: [number, number, number],
  browCol: [number, number, number],
  eyeDark: [number, number, number],
  eyeLight: [number, number, number],
  hairBright: [number, number, number],
  hairMid: [number, number, number],
  hairDark: [number, number, number],
  pauldronMain: [number, number, number],
  pauldronTrim: [number, number, number],
  gloveMain: [number, number, number],
  gloveCuff: [number, number, number],
  torsoMain: [number, number, number],
  torsoShade: [number, number, number],
  beltCol: [number, number, number],
  buckleCol: [number, number, number],
  bootUpper: [number, number, number],
  bootSole: [number, number, number],
  bootTrim: [number, number, number]
) {
  v.setColor(1, ...skinLight);
  v.setColor(2, ...skinDark);
  v.setColor(3, ...blush);
  v.setColor(4, ...browCol);
  v.setColor(5, 255, 255, 255);
  v.setColor(6, ...eyeDark);
  v.setColor(7, ...eyeLight);
  v.setColor(9, ...hairBright);
  v.setColor(10, ...hairMid);
  v.setColor(11, ...hairDark);
  v.setColor(12, ...gloveCuff);
  v.setColor(26, ...pauldronMain);
  v.setColor(27, ...pauldronTrim);
  v.setColor(28, ...gloveMain);
  v.setColor(29, ...bootSole);
  v.setColor(30, ...buckleCol);
  v.setColor(31, ...beltCol);
  v.setColor(32, ...bootUpper);
  v.setColor(33, ...bootTrim);
  v.setColor(41, ...torsoMain);
  v.setColor(42, ...torsoShade);

  // 1. Pauldrons
  v.fillBox('Shoulder_right', -9, -5, -3, 3, 10, 12, 26);
  v.fillBox('Shoulder_right', -8, -5, -2, 2, 13, 13, 27);
  v.fillBox('Shoulder_left', 5, 9, -3, 3, 10, 12, 26);
  v.fillBox('Shoulder_left', 5, 8, -2, 2, 13, 13, 27);

  // 2. Forearms / Hands
  for (const [part, cx] of [['Right_Arm_Hand', -7], ['Left_Arm_Hand', 8]] as const) {
    const x0 = Math.floor(cx - 2.5);
    const x1 = Math.floor(cx + 2.5);
    v.fillBox(part, x0 + 1, x1 - 1, -2, 1, 4, 7, 28);
    v.fillBox(part, x0 + 2, x1 - 2, -1, 0, 3, 3, 12);
    v.fillBox(part, x0 + 2, x1 - 2, -1, 0, 8, 8, 12);
  }

  // 3. Torso
  v.fillBox('Torso_Body', -4, 4, -3, 2, 4, 12, 42);
  v.fillBox('Torso_Body', -3, 3, -3, 2, 4, 12, 41);
  v.fillBox('Torso_Body', -4, 4, -3, 2, 7, 8, 31);
  v.fillBox('Torso_Body', -1, 1, -4, -3, 7, 9, 30);

  // 4. Feet
  for (const [part, x0, x1] of [['Right_Foot', 2, 5], ['Left_Foot', -5, -2]] as const) {
    v.fillBox(part, x0, x1, -3, 2, 0, 0, 29);
    v.fillBox(part, x0, x1, -3, 2, 1, 2, 32);
    v.fillBox(part, x0, x1, -2, 2, 3, 3, 33);
  }

  // 5. Head
  v.fillBox('Head_Hair_Ears', -4, 4, -4, 4, 13, 20, 1);
  v.fillBox('Head_Hair_Ears', -5, -5, -4, 4, 13, 14, 2);
  v.fillBox('Head_Hair_Ears', 5, 5, -4, 4, 13, 14, 2);
  // Blush
  v.fillBox('Head_Hair_Ears', -4, -3, -4, -4, 14, 14, 3);
  v.fillBox('Head_Hair_Ears', 3, 4, -4, -4, 14, 14, 3);
  // Eyes
  for (const sx of [-1, 1]) {
    v.fillBox('Head_Hair_Ears', sx * 4, sx * 4, -4, -4, 15, 17, 5);
    const ix0 = sx < 0 ? -3 : 2;
    const ix1 = sx < 0 ? -2 : 3;
    v.fillBox('Head_Hair_Ears', ix0, ix1, -4, -4, 15, 15, 7);
    v.fillBox('Head_Hair_Ears', ix0, ix1, -4, -4, 16, 17, 6);
    v.fillBox('Head_Hair_Ears', sx < 0 ? -4 : 2, sx < 0 ? -2 : 4, -4, -4, 18, 18, 4);
  }

  // Hair base
  v.fillBox('Head_Hair_Ears', -6, -5, -4, 4, 15, 21, 9);
  v.fillBox('Head_Hair_Ears', 5, 6, -4, 4, 15, 21, 9);
  v.fillBox('Head_Hair_Ears', -6, 6, 4, 5, 14, 23, 10);
  v.fillBox('Head_Hair_Ears', -6, 6, -4, 5, 21, 23, 10);
  v.fillBox('Head_Hair_Ears', -5, 5, -4, 4, 24, 24, 9);
  v.fillBox('Head_Hair_Ears', -6, 6, -5, -5, 21, 23, 9);
}

// 1. Woodland Elf Ranger
function generateRanger(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [252, 210, 178], [232, 180, 144], [240, 148, 132], [90, 75, 55],
    [18, 132, 68], [68, 212, 118], [242, 238, 218], [216, 208, 184], [182, 172, 146],
    [46, 108, 54], [198, 156, 58], [96, 62, 38], [64, 40, 24],
    [42, 104, 52], [28, 74, 36], [88, 54, 32], [236, 188, 52],
    [96, 62, 38], [48, 30, 18], [46, 108, 54]
  );
  v.setColor(43, 38, 142, 68);
  v.setColor(44, 224, 182, 62);

  // Pointed Elven ears
  for (const sx of [-1, 1]) {
    v.fillBox('Head_Hair_Ears', sx * 7, sx * 8, -1, 1, 16, 17, 2);
    v.fillBox('Head_Hair_Ears', sx * 8, sx * 9, 0, 2, 17, 18, 1);
  }
  // Circlet
  v.fillBox('Head_Hair_Ears', -5, 5, -5, -5, 20, 20, 44);
  v.fillBox('Head_Hair_Ears', -1, 1, -5, -5, 20, 21, 43);
  return v;
}

// 2. Ironbeard Paladin
function generatePaladin(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [250, 204, 172], [226, 174, 140], [234, 142, 126], [148, 52, 22],
    [186, 118, 16], [248, 192, 48], [214, 82, 32], [178, 62, 22], [138, 44, 14],
    [188, 198, 214], [238, 188, 46], [164, 174, 192], [238, 188, 46],
    [188, 198, 214], [32, 82, 178], [72, 48, 32], [244, 196, 52],
    [164, 174, 192], [52, 58, 72], [238, 188, 46]
  );
  v.setColor(43, 244, 196, 52);
  v.setColor(44, 32, 82, 178);

  // Braided Beard
  v.fillBox('Head_Hair_Ears', -4, 4, -5, -4, 13, 14, 9);
  v.fillBox('Head_Hair_Ears', -3, 3, -5, -4, 11, 12, 10);
  v.fillBox('Head_Hair_Ears', -2, 2, -5, -4, 9, 10, 9);
  // Gold Coronet
  v.fillBox('Head_Hair_Ears', -5, 5, -6, -5, 21, 21, 43);
  v.fillBox('Head_Hair_Ears', -1, 1, -6, -5, 22, 23, 43);
  return v;
}

// 3. Arcane Sorceress
function generateMage(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [255, 224, 206], [238, 198, 178], [248, 162, 172], [88, 52, 122],
    [136, 38, 196], [214, 108, 255], [216, 182, 248], [184, 144, 226], [146, 106, 192],
    [74, 38, 124], [238, 192, 62], [48, 26, 86], [238, 192, 62],
    [74, 38, 124], [48, 24, 84], [238, 192, 62], [64, 232, 255],
    [58, 30, 98], [32, 18, 56], [238, 192, 62]
  );
  v.setColor(43, 48, 24, 84);
  v.setColor(44, 74, 38, 124);
  v.setColor(45, 238, 192, 62);
  v.setColor(46, 64, 232, 255);

  // Pointed Witch Hat
  v.fillBox('Head_Hair_Ears', -9, 9, -8, 8, 23, 23, 43);
  v.fillBox('Head_Hair_Ears', -6, 6, -5, 5, 25, 25, 45);
  v.fillBox('Head_Hair_Ears', -1, 1, -6, -5, 25, 26, 46);
  v.fillBox('Head_Hair_Ears', -4, 4, -2, 6, 28, 29, 43);
  v.fillBox('Head_Hair_Ears', -1, 1, 3, 8, 31, 32, 45);
  return v;
}

// 4. Crimson Shinobi Rogue
function generateRogue(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [242, 198, 166], [214, 168, 136], [214, 168, 136], [32, 34, 42],
    [176, 22, 38], [248, 64, 78], [224, 230, 242], [186, 194, 210], [142, 150, 168],
    [34, 38, 48], [196, 28, 38], [34, 38, 48], [196, 28, 38],
    [38, 42, 54], [24, 26, 34], [196, 28, 38], [214, 220, 230],
    [34, 38, 48], [20, 22, 28], [196, 28, 38]
  );
  v.setColor(43, 28, 32, 42);
  v.setColor(44, 196, 28, 38);

  // Ninja mask & crimson headband
  v.fillBox('Head_Hair_Ears', -4, 4, -5, -4, 13, 14, 43);
  v.fillBox('Head_Hair_Ears', -6, 6, -5, 5, 19, 20, 44);
  v.fillBox('Head_Hair_Ears', -2, 0, 6, 8, 18, 19, 44);
  return v;
}

// 5. Frostwolf Berserker
function generateBerserker(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [238, 188, 154], [208, 156, 124], [198, 132, 112], [58, 38, 26],
    [196, 98, 18], [255, 178, 52], [92, 62, 42], [68, 44, 28], [48, 30, 18],
    [138, 144, 154], [98, 104, 114], [104, 68, 42], [148, 154, 166],
    [118, 78, 48], [78, 50, 30], [62, 40, 24], [184, 190, 202],
    [92, 60, 36], [44, 28, 18], [138, 144, 154]
  );
  v.setColor(43, 98, 106, 118);
  v.setColor(44, 236, 228, 204);
  v.setColor(46, 36, 124, 214);

  // Warpaint stripe
  v.fillBox('Head_Hair_Ears', -4, -2, -4, -4, 14, 14, 46);
  // Horned Helm
  v.fillBox('Head_Hair_Ears', -6, 6, -5, 5, 20, 23, 43);
  for (const sx of [-1, 1]) {
    v.fillBox('Head_Hair_Ears', sx * 8, sx * 7, -2, 1, 21, 23, 44);
    v.fillBox('Head_Hair_Ears', sx * 10, sx * 8, -2, 1, 23, 25, 44);
  }
  return v;
}

// 6. Celestial Valkyrie
function generateValkyrie(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [255, 218, 190], [234, 192, 162], [248, 156, 152], [186, 138, 42],
    [24, 118, 214], [96, 196, 255], [255, 224, 92], [232, 192, 58], [196, 154, 38],
    [238, 242, 250], [248, 202, 64], [228, 234, 244], [248, 202, 64],
    [238, 242, 250], [48, 124, 212], [248, 202, 64], [82, 224, 255],
    [228, 234, 244], [148, 156, 172], [248, 202, 64]
  );
  v.setColor(43, 248, 250, 255);
  v.setColor(44, 214, 224, 240);
  v.setColor(45, 248, 202, 64);
  v.setColor(46, 82, 224, 255);

  // Helm Wings
  for (const sx of [-1, 1]) {
    v.fillBox('Head_Hair_Ears', sx * 7, sx * 7, -3, 1, 19, 23, 44);
    v.fillBox('Head_Hair_Ears', sx * 8, sx * 8, -1, 3, 21, 26, 43);
  }
  return v;
}

// 7. Wildwood Druid
function generateDruid(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [238, 194, 162], [208, 164, 132], [224, 142, 128], [38, 88, 44],
    [22, 148, 82], [92, 244, 142], [58, 138, 64], [42, 106, 48], [28, 78, 34],
    [96, 64, 38], [72, 168, 58], [82, 54, 32], [72, 168, 58],
    [88, 58, 34], [42, 106, 48], [72, 168, 58], [255, 196, 48],
    [82, 54, 32], [48, 32, 18], [72, 168, 58]
  );
  v.setColor(43, 138, 96, 58);
  v.setColor(44, 102, 68, 38);
  v.setColor(45, 112, 218, 78);

  // Stag Antlers
  for (const sx of [-1, 1]) {
    v.fillBox('Head_Hair_Ears', sx * 5, sx * 4, -2, 0, 24, 26, 44);
    v.fillBox('Head_Hair_Ears', sx * 7, sx * 6, -2, 0, 26, 29, 43);
    v.fillBox('Head_Hair_Ears', sx * 9, sx * 8, -1, 1, 29, 32, 43);
  }
  return v;
}

// 8. Sun-Temple Monk
function generateMonk(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [236, 186, 148], [206, 156, 118], [218, 136, 118], [42, 34, 28],
    [168, 104, 18], [242, 184, 54], [48, 40, 36], [34, 28, 24], [22, 18, 16],
    [236, 132, 28], [148, 32, 32], [238, 230, 214], [148, 32, 32],
    [236, 132, 28], [148, 32, 32], [148, 32, 32], [244, 198, 62],
    [238, 230, 214], [88, 58, 34], [148, 32, 32]
  );
  v.setColor(43, 218, 182, 106);
  v.setColor(44, 186, 148, 76);
  v.setColor(45, 148, 32, 32);

  // Conical Bamboo Kasa Hat
  v.fillBox('Head_Hair_Ears', -10, 10, -9, 9, 22, 22, 44);
  v.fillBox('Head_Hair_Ears', -8, 8, -7, 7, 23, 24, 43);
  v.fillBox('Head_Hair_Ears', -6, 6, -5, 5, 25, 25, 45);
  v.fillBox('Head_Hair_Ears', -2, 2, -1, 1, 28, 28, 44);
  return v;
}

// 9. Pirate Captain
function generatePirate(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [240, 192, 156], [210, 162, 126], [218, 138, 122], [48, 32, 22],
    [82, 54, 32], [148, 102, 64], [68, 46, 32], [48, 32, 22], [32, 20, 14],
    [168, 24, 34], [244, 196, 52], [62, 40, 26], [244, 196, 52],
    [168, 24, 34], [112, 16, 24], [52, 34, 22], [244, 196, 52],
    [52, 34, 22], [28, 18, 12], [244, 196, 52]
  );
  v.setColor(43, 28, 30, 38);
  v.setColor(44, 244, 196, 52);
  v.setColor(45, 228, 36, 48);

  // Eyepatch
  v.fillBox('Head_Hair_Ears', 2, 4, -4, -4, 15, 17, 43);
  // Tricorne Hat
  v.fillBox('Head_Hair_Ears', -9, 9, -6, 6, 22, 24, 43);
  v.fillBox('Head_Hair_Ears', -9, 9, -6, 6, 25, 25, 44);
  v.fillBox('Head_Hair_Ears', 5, 7, -3, 4, 26, 28, 45); // Plume
  return v;
}

// 10. Dread Necromancer
function generateNecromancer(): VoxelRigBuilder {
  const v = new VoxelRigBuilder(PART_NAMES);
  buildBaseHumanoid(
    v,
    [214, 218, 224], [178, 184, 194], [164, 152, 174], [36, 28, 48],
    [18, 176, 64], [96, 255, 118], [42, 32, 56], [30, 22, 42], [20, 14, 28],
    [42, 32, 56], [228, 222, 204], [32, 26, 44], [228, 222, 204],
    [42, 32, 56], [24, 18, 34], [118, 22, 42], [72, 255, 112],
    [32, 26, 44], [18, 14, 24], [228, 222, 204]
  );
  v.setColor(43, 236, 230, 212);
  v.setColor(45, 72, 255, 112);

  // Skull Mask & Hood
  v.fillBox('Head_Hair_Ears', -4, 4, -5, -5, 19, 21, 43);
  v.fillBox('Head_Hair_Ears', -6, 6, -6, 5, 22, 24, 10);
  v.fillBox('Head_Hair_Ears', -1, 1, -6, -6, 22, 23, 45);
  return v;
}

export const ARCHETYPES: Record<string, ArchetypeDefinition> = {
  ranger: {
    id: 'ranger',
    name: 'Elf Ranger',
    title: 'Woodland Scout',
    description: 'Master of the forest with swift gathering & foraging speed.',
    statBonus: '+40% Movement & Foraging',
    createBuilder: generateRanger,
  },
  paladin: {
    id: 'paladin',
    name: 'Ironbeard Paladin',
    title: 'Holy Guardian',
    description: 'Armored protector inspiring courage and high morale.',
    statBonus: '+50% Health & High Morale',
    createBuilder: generatePaladin,
  },
  mage: {
    id: 'mage',
    name: 'Arcane Sorceress',
    title: 'Spellweaver',
    description: 'Harnesses aether energy for swift building & research.',
    statBonus: '+35% Construction Speed',
    createBuilder: generateMage,
  },
  rogue: {
    id: 'rogue',
    name: 'Crimson Shinobi',
    title: 'Shadow Blade',
    description: 'Agile scout specializing in stealth and rapid hauling.',
    statBonus: '+30% Speed & Hauling',
    createBuilder: generateRogue,
  },
  berserker: {
    id: 'berserker',
    name: 'Frostwolf Viking',
    title: 'Fierce Miner',
    description: 'Shatters rocks and clears boulders in record time.',
    statBonus: '+60% Mining Speed',
    createBuilder: generateBerserker,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Celestial Valkyrie',
    title: 'Aether Knight',
    description: 'Graceful warrior who rarely tires and bolsters morale.',
    statBonus: '-40% Energy Depletion',
    createBuilder: generateValkyrie,
  },
  druid: {
    id: 'druid',
    name: 'Wildwood Druid',
    title: 'Earth Warden',
    description: 'Nurtures crops and yields bonus harvest food.',
    statBonus: '+50% Crop Yield',
    createBuilder: generateDruid,
  },
  monk: {
    id: 'monk',
    name: 'Sun-Temple Monk',
    title: 'Ascetic Craftsman',
    description: 'Disciplined worker who consumes less food and never starves.',
    statBonus: '-50% Hunger Rate',
    createBuilder: generateMonk,
  },
  pirate: {
    id: 'pirate',
    name: 'Pirate Captain',
    title: 'Swashbuckler',
    description: 'Charismatic leader who finds extra gold and stone.',
    statBonus: '+25% Resource Yield',
    createBuilder: generatePirate,
  },
  necromancer: {
    id: 'necromancer',
    name: 'Dread Necromancer',
    title: 'Soul Harvester',
    description: 'Unfazed by danger and tirelessly labors through the night.',
    statBonus: 'Night Work Affinity',
    createBuilder: generateNecromancer,
  },
};
