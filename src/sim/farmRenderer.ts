import * as THREE from 'three';
import { farmVoxCache } from './voxLoader';
import { FarmPlot, CROP_TYPE_LIST } from './farming';

const MAX_INSTANCES_PER_MODEL = 128;

export class FarmRenderer {
  public group: THREE.Group;
  private instanceMeshes = new Map<string, THREE.InstancedMesh>();
  private dummy = new THREE.Object3D();
  private sharedMaterial: THREE.MeshStandardMaterial;
  private matureIndicatorMesh: THREE.InstancedMesh;
  private dummyIndicator = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'FarmCropsLayer';
    scene.add(this.group);

    this.sharedMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
      metalness: 0.1,
      flatShading: true,
    });

    // Subtle harvest indicator icon/diamond for mature crops
    const indicatorGeo = new THREE.OctahedronGeometry(0.12, 0);
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      wireframe: false,
    });
    this.matureIndicatorMesh = new THREE.InstancedMesh(
      indicatorGeo,
      indicatorMat,
      MAX_INSTANCES_PER_MODEL * 4
    );
    this.matureIndicatorMesh.count = 0;
    this.matureIndicatorMesh.frustumCulled = false;
    this.group.add(this.matureIndicatorMesh);

    // Initialize InstancedMeshes for all 24 models (8 crops x 3 stages)
    for (const crop of CROP_TYPE_LIST) {
      for (let stage = 0; stage < 3; stage++) {
        const key = `${crop}_${stage}`;
        const geo = farmVoxCache.getGeometry(crop, stage);
        const instMesh = new THREE.InstancedMesh(
          geo,
          this.sharedMaterial,
          MAX_INSTANCES_PER_MODEL
        );
        instMesh.count = 0;
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;
        instMesh.frustumCulled = false;

        this.instanceMeshes.set(key, instMesh);
        this.group.add(instMesh);
      }
    }
  }

  // Preload all .vox models from /assets/farm/
  public async initModels(): Promise<void> {
    await farmVoxCache.preloadAll();

    // Update geometries of all instanced meshes once parsed
    for (const crop of CROP_TYPE_LIST) {
      for (let stage = 0; stage < 3; stage++) {
        const key = `${crop}_${stage}`;
        const instMesh = this.instanceMeshes.get(key);
        if (instMesh) {
          instMesh.geometry = farmVoxCache.getGeometry(crop, stage);
        }
      }
    }
  }

  // Sync and render all active crop plots with zero allocations per frame
  public update(plots: FarmPlot[], time: number) {
    // Count buckets for each model
    const counts = new Map<string, number>();
    for (const crop of CROP_TYPE_LIST) {
      counts.set(`${crop}_0`, 0);
      counts.set(`${crop}_1`, 0);
      counts.set(`${crop}_2`, 0);
    }

    let matureCount = 0;

    // Place each crop into its corresponding InstancedMesh
    for (let i = 0; i < plots.length; i++) {
      const plot = plots[i];
      const key = `${plot.cropType}_${plot.stage}`;
      const instMesh = this.instanceMeshes.get(key);
      if (!instMesh) continue;

      const currentIdx = counts.get(key) || 0;
      if (currentIdx >= MAX_INSTANCES_PER_MODEL) continue;

      // Subtle natural wind sway
      const windSway = Math.sin(time * 2.2 + plot.x * 1.5 + plot.z * 1.5) * 0.04;
      const baseRotation = ((plot.x * 37 + plot.z * 19) % 4) * (Math.PI / 2);

      this.dummy.position.set(plot.x + 0.5, plot.y, plot.z + 0.5);
      this.dummy.rotation.set(0, baseRotation + windSway, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();

      instMesh.setMatrixAt(currentIdx, this.dummy.matrix);
      counts.set(key, currentIdx + 1);

      // If mature, place a glowing diamond above it
      if (plot.stage === 2 && matureCount < MAX_INSTANCES_PER_MODEL * 4) {
        const bounce = Math.sin(time * 4.0 + plot.x + plot.z) * 0.05;
        this.dummyIndicator.position.set(plot.x + 0.5, plot.y + 1.15 + bounce, plot.z + 0.5);
        this.dummyIndicator.rotation.set(0, time * 2.0, 0);
        this.dummyIndicator.scale.set(1, 1, 1);
        this.dummyIndicator.updateMatrix();

        this.matureIndicatorMesh.setMatrixAt(matureCount, this.dummyIndicator.matrix);
        matureCount++;
      }
    }

    // Update draw counts and mark buffer attributes
    for (const [key, count] of counts.entries()) {
      const instMesh = this.instanceMeshes.get(key);
      if (instMesh) {
        instMesh.count = count;
        if (count > 0) {
          instMesh.instanceMatrix.needsUpdate = true;
        }
      }
    }

    this.matureIndicatorMesh.count = matureCount;
    if (matureCount > 0) {
      this.matureIndicatorMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    this.sharedMaterial.dispose();
    for (const instMesh of this.instanceMeshes.values()) {
      instMesh.geometry.dispose();
    }
    this.group.clear();
  }
}
