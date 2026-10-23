import * as THREE from 'three';
import {
  BLOCK_PLANKS,
  BLOCK_COBBLE,
  BLOCK_WOOD,
  BLOCK_WHEAT,
  BLOCK_STRAWBERRY,
  BLOCK_CORN,
  BLOCK_POTATOES,
  BLOCK_BEETS,
  BLOCK_HERBS,
  BLOCK_COTTON,
  BLOCK_HAY,
  BLOCK_BED,
  BLOCK_CAMPFIRE,
  BLOCK_STOCKPILE,
  BLOCK_DEFS,
} from './constants';
import { farmVoxCache } from './voxLoader';

// Shared materials for holographic previews to avoid shader recompilation
const validMat = new THREE.MeshStandardMaterial({
  color: 0x10b981,
  emissive: 0x059669,
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.72,
  roughness: 0.3,
  metalness: 0.1,
});

const invalidMat = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xdc2626,
  emissiveIntensity: 0.45,
  transparent: true,
  opacity: 0.75,
  roughness: 0.3,
  metalness: 0.1,
});

const blueprintMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.6,
  roughness: 0.4,
});

export function createStructureModel(blockType: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();

  switch (blockType) {
    case BLOCK_BED: {
      // 1. Bed Wooden Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.95), material);
      frame.position.set(0.5, 0.12, 0.5);
      group.add(frame);

      // 2. 4 Legs
      const legGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
      const offsets = [
        [0.12, 0.09, 0.12],
        [0.88, 0.09, 0.12],
        [0.12, 0.09, 0.88],
        [0.88, 0.09, 0.88],
      ];
      offsets.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, material);
        leg.position.set(x, y, z);
        group.add(leg);
      });

      // 3. Mattress & Red Quilt
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.88), material);
      mattress.position.set(0.5, 0.25, 0.5);
      group.add(mattress);

      // 4. Pillow
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.09, 0.26), material);
      pillow.position.set(0.5, 0.34, 0.22);
      group.add(pillow);

      // 5. Headboard
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.08), material);
      headboard.position.set(0.5, 0.28, 0.08);
      group.add(headboard);
      break;
    }

    case BLOCK_CAMPFIRE: {
      // 1. Ring of Stones
      const stoneGeo = new THREE.BoxGeometry(0.18, 0.12, 0.18);
      const stoneCount = 8;
      for (let i = 0; i < stoneCount; i++) {
        const angle = (i / stoneCount) * Math.PI * 2;
        const stone = new THREE.Mesh(stoneGeo, material);
        stone.position.set(
          0.5 + Math.cos(angle) * 0.35,
          0.06,
          0.5 + Math.sin(angle) * 0.35
        );
        stone.rotation.y = angle;
        group.add(stone);
      }

      // 2. Crossed Firewood Logs
      const logGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 6);
      const log1 = new THREE.Mesh(logGeo, material);
      log1.position.set(0.5, 0.14, 0.5);
      log1.rotation.z = Math.PI / 3.5;
      log1.rotation.y = Math.PI / 4;
      group.add(log1);

      const log2 = new THREE.Mesh(logGeo, material);
      log2.position.set(0.5, 0.14, 0.5);
      log2.rotation.z = -Math.PI / 3.5;
      log2.rotation.y = -Math.PI / 4;
      group.add(log2);

      // 3. Flame Core Cone
      const flameGeo = new THREE.ConeGeometry(0.18, 0.38, 5);
      const flame = new THREE.Mesh(flameGeo, material);
      flame.position.set(0.5, 0.34, 0.5);
      group.add(flame);
      break;
    }

    case BLOCK_WHEAT:
    case BLOCK_STRAWBERRY:
    case BLOCK_CORN:
    case BLOCK_POTATOES:
    case BLOCK_BEETS:
    case BLOCK_HERBS:
    case BLOCK_COTTON:
    case BLOCK_HAY: {
      const def = BLOCK_DEFS[blockType];
      const cropType = def?.cropType || 'wheat';
      const cropGeo = farmVoxCache.getGeometry(cropType, 2);
      const cropMesh = new THREE.Mesh(cropGeo, material);
      cropMesh.position.set(0.5, 0, 0.5);
      group.add(cropMesh);
      break;
    }

    case BLOCK_STOCKPILE: {
      // Pallet slats
      const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.96), material);
      baseFrame.position.set(0.5, 0.03, 0.5);
      group.add(baseFrame);

      // 3 Slats
      const slatGeo = new THREE.BoxGeometry(0.88, 0.05, 0.2);
      for (let s = -1; s <= 1; s++) {
        const slat = new THREE.Mesh(slatGeo, material);
        slat.position.set(0.5, 0.08, 0.5 + s * 0.28);
        group.add(slat);
      }

      // Corner pegs
      const pegGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
      const pegCorners = [
        [0.1, 0.12, 0.1],
        [0.9, 0.12, 0.1],
        [0.1, 0.12, 0.9],
        [0.9, 0.12, 0.9],
      ];
      pegCorners.forEach(([px, py, pz]) => {
        const peg = new THREE.Mesh(pegGeo, material);
        peg.position.set(px, py, pz);
        group.add(peg);
      });
      break;
    }

    // Standard Solid Voxel Blocks (Planks, Cobblestone, Wood, etc.)
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98), material);
      box.position.set(0.5, 0.5, 0.5);
      group.add(box);

      // Wireframe bevel accent
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(box.geometry),
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.6,
        })
      );
      wire.position.set(0.5, 0.5, 0.5);
      group.add(wire);
      break;
    }
  }

  return group;
}

export class StructurePreviewManager {
  // Active placement hover preview
  public hoverPreviewGroup: THREE.Group;
  private currentPreviewType: number = -1;
  private currentPreviewValidity: boolean = true;
  private currentMesh: THREE.Group | null = null;

  // Pre-allocated pending blueprint instances pool for tasks
  public pendingBlueprintsGroup: THREE.Group;
  private blueprintMeshes: THREE.Group[] = [];

  constructor(scene: THREE.Scene) {
    this.hoverPreviewGroup = new THREE.Group();
    this.hoverPreviewGroup.visible = false;
    scene.add(this.hoverPreviewGroup);

    this.pendingBlueprintsGroup = new THREE.Group();
    scene.add(this.pendingBlueprintsGroup);

    // Bounding wireframe outline
    const bounds = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
      new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 })
    );
    bounds.position.set(0.5, 0.5, 0.5);
    this.hoverPreviewGroup.add(bounds);
  }

  // Update hover placement preview
  public updateHoverPreview(
    x: number,
    y: number,
    z: number,
    blockType: number,
    isValid: boolean,
    visible: boolean
  ) {
    if (!visible) {
      this.hoverPreviewGroup.visible = false;
      return;
    }

    this.hoverPreviewGroup.visible = true;
    this.hoverPreviewGroup.position.set(x, y, z);

    // Rebuild preview model if type or validity changed
    if (this.currentPreviewType !== blockType || this.currentPreviewValidity !== isValid) {
      this.currentPreviewType = blockType;
      this.currentPreviewValidity = isValid;

      if (this.currentMesh) {
        this.hoverPreviewGroup.remove(this.currentMesh);
      }

      const mat = isValid ? validMat : invalidMat;
      this.currentMesh = createStructureModel(blockType, mat);
      this.hoverPreviewGroup.add(this.currentMesh);
    }
  }

  // Synchronize pending blueprint preview meshes for queued build tasks
  public syncPendingTaskBlueprints(
    taskCount: number,
    taskTypes: Uint8Array,
    taskBlockTypes: Uint8Array,
    taskX: Float32Array,
    taskY: Float32Array,
    taskZ: Float32Array
  ) {
    let activeBlueprintIdx = 0;

    for (let i = 0; i < taskCount; i++) {
      if (taskTypes[i] === 2) { // TASK_BUILD = 2
        const bType = taskBlockTypes[i];
        const tx = Math.floor(taskX[i]);
        const ty = Math.floor(taskY[i]);
        const tz = Math.floor(taskZ[i]);

        let bpGroup = this.blueprintMeshes[activeBlueprintIdx];
        if (!bpGroup) {
          bpGroup = createStructureModel(bType, blueprintMat);
          this.blueprintMeshes.push(bpGroup);
          this.pendingBlueprintsGroup.add(bpGroup);
        }

        bpGroup.visible = true;
        bpGroup.position.set(tx, ty, tz);
        activeBlueprintIdx++;
      }
    }

    // Hide extra unused blueprint meshes
    for (let j = activeBlueprintIdx; j < this.blueprintMeshes.length; j++) {
      this.blueprintMeshes[j].visible = false;
    }
  }

  // Subtle floating pulse animation in render loop
  public animate(elapsedTime: number) {
    if (this.hoverPreviewGroup.visible) {
      const pulse = Math.sin(elapsedTime * 0.005) * 0.04;
      this.hoverPreviewGroup.position.y += pulse * 0.2;
    }

    // Gentle pulse on pending blueprints
    const bpPulse = 0.55 + Math.sin(elapsedTime * 0.003) * 0.15;
    blueprintMat.opacity = bpPulse;
  }
}
