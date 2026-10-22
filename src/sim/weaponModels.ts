import * as THREE from 'three';
import { VoxelRigBuilder } from './voxelRigBuilder';

export function buildWeaponMesh(type: string): THREE.Group {
  const v = new VoxelRigBuilder(['weapon']);

  switch (type) {
    case 'battleaxe': {
      v.setColor(1, 105, 68, 42);   // Ash shaft
      v.setColor(2, 68, 44, 26);
      v.setColor(3, 215, 172, 68);  // Brass collar
      v.setColor(5, 205, 212, 222); // Steel blade bright
      v.setColor(6, 142, 150, 162); // Blade mid
      v.setColor(7, 85, 92, 102);   // Dark iron
      v.setColor(8, 225, 65, 48);   // Crimson grip

      // Haft
      v.fillBox('weapon', 0, 1, 0, 1, 0, 24, 1);
      v.fillBox('weapon', -1, 2, -1, 2, 0, 1, 3);
      for (let rz = 5; rz <= 11; rz++) {
        v.fillBox('weapon', -1, 2, 0, 1, rz, rz, rz % 2 === 0 ? 8 : 1);
      }
      // Axe head
      v.fillBox('weapon', -2, 3, -1, 2, 19, 23, 7);
      v.fillBox('weapon', -6, -2, 0, 1, 18, 24, 6);
      v.fillBox('weapon', -7, -7, 0, 1, 17, 25, 5);
      v.fillBox('weapon', 3, 7, 0, 1, 18, 24, 6);
      v.fillBox('weapon', 8, 8, 0, 1, 17, 25, 5);
      break;
    }

    case 'sword':
    case 'iron_arming_sword': {
      v.setColor(1, 91, 52, 35);
      v.setColor(2, 153, 77, 44);
      v.setColor(3, 220, 172, 66);  // Brass guard & pommel
      v.setColor(4, 83, 99, 118);   // Fuller
      v.setColor(5, 153, 176, 192); // Blade steel
      v.setColor(6, 226, 239, 244); // Blade edge bright

      // Pommel & grip
      v.fillBox('weapon', -1, 0, 0, 1, 0, 1, 3);
      for (let z = 2; z <= 6; z++) {
        v.fillBox('weapon', -1, 0, 0, 1, z, z, z % 2 === 0 ? 1 : 2);
      }
      // Crossguard
      v.fillBox('weapon', -4, 3, 0, 1, 7, 8, 3);
      // Blade
      for (let z = 9; z <= 23; z++) {
        const lo = z < 21 ? -2 : -1;
        const hi = z < 21 ? 1 : 0;
        v.fillBox('weapon', lo, hi, 0, 1, z, z, 5);
        v.fillBox('weapon', lo, lo, 0, 1, z, z, 6);
        v.fillBox('weapon', hi, hi, 0, 1, z, z, 6);
      }
      v.fillBox('weapon', -1, 0, 0, 0, 24, 24, 6);
      break;
    }

    case 'hatchet':
    case 'raider_hatchet': {
      v.setColor(1, 91, 52, 35);
      v.setColor(2, 153, 77, 44);
      v.setColor(3, 220, 172, 66);
      v.setColor(4, 83, 99, 118);
      v.setColor(5, 153, 176, 192);
      v.setColor(6, 226, 239, 244);

      v.fillBox('weapon', -1, 0, 0, 1, 0, 16, 1);
      v.fillBox('weapon', -2, 1, -1, 2, 11, 15, 4);
      v.fillBox('weapon', 2, 4, 0, 1, 12, 15, 5);
      v.fillBox('weapon', 5, 6, 0, 1, 10, 17, 5);
      v.fillBox('weapon', 7, 7, 0, 1, 10, 17, 6);
      break;
    }

    case 'warhammer':
    case 'stone_warhammer': {
      v.setColor(1, 91, 52, 35);
      v.setColor(2, 153, 77, 44);
      v.setColor(3, 220, 172, 66);
      v.setColor(7, 75, 87, 82);
      v.setColor(8, 132, 151, 137);

      v.fillBox('weapon', -1, 0, 0, 1, 0, 17, 1);
      v.fillBox('weapon', -2, 1, -1, 2, 10, 11, 3);
      v.fillBox('weapon', -5, 4, -2, 3, 14, 20, 7);
      v.fillBox('weapon', -4, 3, -2, 3, 15, 19, 8);
      break;
    }

    case 'dagger':
    case 'shadow_dagger': {
      v.setColor(1, 45, 38, 48);
      v.setColor(3, 215, 175, 65);
      v.setColor(5, 235, 242, 250);
      v.setColor(6, 175, 185, 198);
      v.setColor(8, 85, 230, 245); // Cyan venom gem

      v.fillBox('weapon', 0, 1, 0, 1, 0, 1, 3);
      v.setVoxel('weapon', 0, 0, -1, 8);
      v.fillBox('weapon', 0, 1, 0, 1, 2, 6, 1);
      v.fillBox('weapon', -3, 4, 0, 1, 7, 7, 3);
      for (let z = 8; z <= 18; z++) {
        const w = z >= 15 ? 1 : 2;
        v.fillBox('weapon', -w + 1, w, 0, 1, z, z, 6);
        v.setVoxel('weapon', -w + 1, 0, z, 5);
        v.setVoxel('weapon', w, 0, z, 5);
      }
      v.setVoxel('weapon', 0, 0, 19, 5);
      break;
    }

    case 'shield':
    case 'heater_shield': {
      v.setColor(1, 48, 88, 185);   // Royal blue field
      v.setColor(3, 235, 240, 248); // Silver chevron
      v.setColor(5, 225, 182, 55);  // Gold rim and boss
      v.setColor(7, 85, 55, 35);    // Wood back

      for (let z = 0; z <= 18; z++) {
        const halfW = z <= 2 ? 1 : z <= 5 ? 2 : z <= 8 ? 3 : z <= 12 ? 4 : z <= 15 ? 5 : 6;
        v.fillBox('weapon', -halfW, halfW, 0, 0, z, z, 5);
        if (halfW > 1) {
          v.fillBox('weapon', -halfW + 1, halfW - 1, 0, 0, z, z, 1);
          v.fillBox('weapon', -halfW + 1, halfW - 1, 1, 1, z, z, 7);
        }
      }
      for (let x = -4; x <= 4; x++) {
        const cz = 12 - Math.abs(x);
        v.setVoxel('weapon', x, -1, cz, 3);
      }
      v.fillBox('weapon', -1, 1, -1, -1, 10, 12, 5);
      break;
    }

    case 'spell_tome': {
      v.setColor(1, 118, 35, 42);   // Crimson leather
      v.setColor(3, 242, 235, 215); // Pages
      v.setColor(5, 225, 185, 58);  // Gold clasp & corners
      v.setColor(7, 55, 220, 245);  // Aether bookmark

      v.fillBox('weapon', -5, 5, -2, -2, 0, 14, 1);
      v.fillBox('weapon', -5, 5, 2, 2, 0, 14, 1);
      v.fillBox('weapon', -5, -5, -2, 2, 0, 14, 1);
      v.fillBox('weapon', -4, 4, -1, 1, 1, 13, 3);
      v.fillBox('weapon', -1, 1, -2, -2, 6, 8, 5);
      v.setVoxel('weapon', 0, -3, 7, 7);
      v.fillBox('weapon', 0, 0, 0, 0, -2, 0, 7);
      break;
    }

    default: {
      // Pickaxe default
      v.setColor(1, 105, 68, 42);
      v.setColor(5, 180, 190, 205);
      v.fillBox('weapon', 0, 1, 0, 1, 0, 16, 1);
      v.fillBox('weapon', -5, 6, 0, 1, 14, 16, 5);
      break;
    }
  }

  const { group } = v.buildModelGroup(0.045);
  return group;
}
