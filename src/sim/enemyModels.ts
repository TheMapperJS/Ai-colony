import * as THREE from 'three';
import { VoxelRigBuilder } from './voxelRigBuilder';

export function buildEnemyModel(enemyType: string): { group: THREE.Group; partMeshes: Map<string, THREE.Mesh> } {
  switch (enemyType) {
    case 'goblin': {
      const parts = ['head', 'torso', 'right_hand', 'left_hand', 'right_foot', 'left_foot'];
      const b = new VoxelRigBuilder(parts);

      b.setColor(1, 108, 162, 54);  // Green skin light
      b.setColor(2, 78, 126, 40);   // Skin mid
      b.setColor(4, 155, 198, 88);  // Highlight / nose
      b.setColor(5, 255, 215, 40);  // Amber eye
      b.setColor(7, 40, 25, 15);    // Slit pupil
      b.setColor(8, 250, 245, 230); // Fangs
      b.setColor(9, 135, 60, 48);   // Red bandana
      b.setColor(12, 105, 78, 48);  // Tunic
      b.setColor(14, 175, 142, 98); // Rope belt
      b.setColor(16, 170, 180, 190);// Cleaver blade

      // Torso & rope belt
      b.fillBox('torso', -3, 3, -2, 2, 4, 12, 12);
      b.fillBox('torso', -4, 4, -3, 2, 6, 7, 14);
      // Feet
      b.fillBox('right_foot', 2, 5, -3, 2, 0, 3, 2);
      b.fillBox('left_foot', -5, -2, -3, 2, 0, 3, 2);
      // Hands
      b.fillBox('left_hand', 6, 8, -2, 1, 4, 7, 1);
      b.fillBox('right_hand', -8, -6, -2, 1, 4, 7, 1);
      // Cleaver on right hand
      b.fillBox('right_hand', -7, -7, -9, -4, 4, 7, 16);
      // Head, snout, eyes, bat ears, red bandana
      b.fillBox('head', -4, 4, -4, 4, 13, 20, 1);
      b.fillBox('head', -1, 1, -5, -5, 15, 16, 4); // snout
      b.fillBox('head', -3, -1, -5, -4, 16, 17, 5); // eyes
      b.fillBox('head', 1, 3, -5, -4, 16, 17, 5);
      b.fillBox('head', -5, 5, -4, 4, 20, 22, 9); // bandana
      // Bat ears
      for (const sx of [-1, 1]) {
        b.fillBox('head', sx * 5, sx * 8, 0, 2, 16, 18, 1);
      }

      return b.buildModelGroup(0.045);
    }

    case 'slime':
    case 'slime_aether': {
      const isAether = enemyType === 'slime_aether';
      const parts = ['Slime_Body', 'Slime_Core', 'Slime_Face'];
      const b = new VoxelRigBuilder(parts);

      if (isAether) {
        b.setColor(1, 110, 235, 255); // Cyan body
        b.setColor(2, 45, 185, 230);
        b.setColor(4, 235, 255, 255); // Aether core
        b.setColor(5, 75, 240, 255);
        b.setColor(6, 255, 255, 255); // Eye glint
        b.setColor(7, 24, 32, 48);    // Eye pupil
      } else {
        b.setColor(1, 115, 225, 95);  // Lime body
        b.setColor(2, 65, 185, 72);
        b.setColor(4, 220, 255, 140); // Core
        b.setColor(5, 145, 240, 65);
        b.setColor(6, 255, 255, 255); // Eye
        b.setColor(7, 25, 45, 30);
      }

      // Rounded jelly dome body
      b.fillBox('Slime_Body', -6, 6, -6, 6, 0, 1, 2);
      b.fillBox('Slime_Body', -7, 7, -6, 6, 2, 6, 1);
      b.fillBox('Slime_Body', -5, 5, -5, 5, 7, 9, 1);
      b.fillBox('Slime_Body', -3, 3, -3, 3, 10, 12, 1);
      b.setVoxel('Slime_Body', 0, 0, 13, 1); // apex tip

      // Glowing core inside
      b.fillBox('Slime_Core', -2, 2, -2, 2, 4, 7, 4);

      // Anime chibi eyes
      for (const sx of [-1, 1]) {
        const ex = sx * 3;
        b.fillBox('Slime_Face', ex - 1, ex + 1, -7, -7, 5, 7, 6);
        b.fillBox('Slime_Face', ex, ex + 1, -8, -8, 5, 6, 7);
      }

      return b.buildModelGroup(0.045);
    }

    case 'skeleton_warrior': {
      const parts = ['skull', 'helmet', 'plume', 'ribcage', 'soul_orb', 'breastplate', 'hand_L', 'shield', 'hand_R', 'sword', 'boot_L', 'boot_R'];
      const b = new VoxelRigBuilder(parts);

      b.setColor(1, 242, 238, 224); // Bone
      b.setColor(4, 38, 34, 42);    // Sockets
      b.setColor(5, 210, 255, 255); // Glowing cyan eye
      b.setColor(8, 186, 142, 58);  // Bronze
      b.setColor(11, 215, 52, 44);  // Plume
      b.setColor(13, 195, 202, 212);// Steel

      // Ribs & glowing soul orb
      b.fillBox('ribcage', -1, 1, -1, 1, 6, 12, 1);
      b.fillBox('ribcage', -3, 3, -3, -3, 8, 11, 1);
      b.fillBox('soul_orb', -1, 1, -2, 0, 8, 10, 5);
      // Bronze breastplate
      b.fillBox('breastplate', -3, 3, -4, -4, 9, 11, 8);
      // Legs
      b.fillBox('boot_R', 2, 4, -1, 0, 0, 5, 1);
      b.fillBox('boot_L', -4, -2, -1, 0, 0, 5, 1);
      // Shield
      b.fillBox('shield', 7, 8, -2, 2, 3, 7, 8);
      // Sword
      b.fillBox('sword', -8, -7, -10, -2, 5, 6, 13);
      // Skull & helmet with plume
      b.fillBox('skull', -4, 4, -4, 3, 13, 18, 1);
      for (const sx of [-1, 1]) {
        b.fillBox('skull', sx * 2, sx * 2, -5, -4, 16, 17, 5); // cyan eye
      }
      b.fillBox('helmet', -5, 5, -5, 4, 19, 21, 8);
      b.fillBox('plume', 0, 0, -4, 4, 22, 24, 11);

      return b.buildModelGroup(0.045);
    }

    case 'orc_brute': {
      const parts = ['head', 'torso', 'belt', 'hand_L', 'hand_R', 'weapon', 'boot_L', 'boot_R'];
      const b = new VoxelRigBuilder(parts);

      b.setColor(1, 96, 138, 52);   // Olive skin
      b.setColor(6, 255, 75, 35);   // Red eyes
      b.setColor(8, 245, 238, 215); // Tusks
      b.setColor(10, 68, 74, 82);   // Black iron
      b.setColor(13, 182, 192, 204);// Steel axe
      b.setColor(14, 98, 68, 42);   // Leather

      // Muscular torso
      b.fillBox('torso', -5, 5, -4, 4, 7, 15, 1);
      b.fillBox('belt', -6, 6, -4, 4, 5, 7, 14);
      // Legs
      b.fillBox('boot_R', 2, 5, -3, 3, 0, 5, 14);
      b.fillBox('boot_L', -5, -2, -3, 3, 0, 5, 14);
      // Hands
      b.fillBox('hand_L', 7, 9, -2, 2, 4, 10, 1);
      b.fillBox('hand_R', -9, -7, -2, 2, 4, 10, 1);
      // Double axe
      b.fillBox('weapon', -9, -8, -10, 0, 4, 7, 10);
      b.fillBox('weapon', -9, -8, -10, -5, 1, 10, 13);
      // Head, underbite tusks, red eyes, horned helm
      b.fillBox('head', -5, 5, -4, 4, 15, 22, 1);
      b.fillBox('head', -3, -3, -6, -5, 16, 18, 8); // tusk left
      b.fillBox('head', 3, 3, -6, -5, 16, 18, 8);  // tusk right
      b.setVoxel('head', -2, -5, 18, 6); // red eye
      b.setVoxel('head', 2, -5, 18, 6);
      b.fillBox('head', -6, 6, -5, 4, 20, 23, 10); // iron helm
      b.fillBox('head', -8, -7, -1, 1, 22, 24, 8); // horn left
      b.fillBox('head', 7, 8, -1, 1, 22, 24, 8);   // horn right

      return b.buildModelGroup(0.045);
    }

    case 'stone_golem': {
      const parts = ['head', 'torso', 'soul_orb', 'hand_L', 'hand_R', 'boot_L', 'boot_R'];
      const b = new VoxelRigBuilder(parts);

      b.setColor(1, 118, 124, 132); // Granite
      b.setColor(2, 86, 92, 100);   // Basalt
      b.setColor(5, 78, 142, 62);   // Moss
      b.setColor(7, 215, 255, 255); // Aether crystal
      b.setColor(8, 45, 220, 250);  // Cyan glow

      // Heavy basalt torso with hollow heart
      b.fillBox('torso', -7, 7, -4, 4, 7, 17, 2);
      b.fillBox('torso', -5, 5, -4, 3, 17, 18, 5); // moss
      // Floating aether crystal heart
      b.fillBox('soul_orb', -2, 2, -3, 1, 10, 14, 8);
      // Huge boulder fists
      b.fillBox('hand_L', 8, 12, -4, 4, 2, 11, 2);
      b.fillBox('hand_R', -12, -8, -4, 4, 2, 11, 2);
      // Pillar stone legs
      b.fillBox('boot_L', -6, -2, -4, 4, 0, 6, 2);
      b.fillBox('boot_R', 2, 6, -4, 4, 0, 6, 2);
      // Monolith head with glowing visor
      b.fillBox('head', -4, 4, -4, 3, 17, 23, 1);
      b.fillBox('head', -3, 3, -5, -4, 19, 20, 8); // visor rune

      return b.buildModelGroup(0.05);
    }

    default: {
      return buildEnemyModel('goblin');
    }
  }
}
