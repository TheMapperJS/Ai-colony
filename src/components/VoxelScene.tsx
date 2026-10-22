import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VoxelWorld } from '../sim/world';
import { VoxelMesher } from '../sim/mesher';
import { ColonistManager } from '../sim/colonists';
import { TaskManager } from '../sim/tasks';
import { VoxelPathfinder } from '../sim/pathfinding';
import {
  WORLD_W,
  WORLD_D,
  WORLD_H,
  BLOCK_AIR,
  BLOCK_DEFS,
  TASK_MINE,
  TASK_BUILD,
  TASK_HARVEST,
  STATE_MINE,
  STATE_BUILD,
  STATE_HARVEST,
  STATE_SLEEP,
} from '../sim/constants';
import { audio } from '../sim/audio';
import { perfMonitor } from '../sim/benchmark';
import { StructurePreviewManager } from '../sim/structurePreviews';
import { EnemyManager } from '../sim/enemies';
import { createArchetypeCharacterVisual, createEnemyVisual } from '../sim/characterVisuals';

// Reusable math helpers outside render loop (Zero-Alloc)
const _v1 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

interface VoxelSceneProps {
  world: VoxelWorld;
  mesher: VoxelMesher;
  colonists: ColonistManager;
  tasks: TaskManager;
  enemies: EnemyManager;
  pathfinder: VoxelPathfinder;
  activeTool: 'select' | 'mine' | 'build' | 'harvest' | 'cancel';
  selectedBlockType: number;
  selectedColonistId: number | null;
  onSelectColonist: (id: number | null) => void;
  gameSpeed: number; // 0, 1, 2, 5
  timeOfDay: number; // 0 to 24 hours
  setTimeOfDay: React.Dispatch<React.SetStateAction<number>>;
  setDayCount: React.Dispatch<React.SetStateAction<number>>;
  onHoverVoxel: (coords: [number, number, number] | null, blockName?: string) => void;
}

export const VoxelScene: React.FC<VoxelSceneProps> = (props) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Sync props into ref to prevent useEffect recreation and WebGL teardown!
  const propsRef = useRef(props);
  propsRef.current = props;

  // Local scalar time of day for high-frequency smooth lighting without React re-render stalls
  const simTimeRef = useRef(props.timeOfDay);
  const lastUiTimeSyncRef = useRef(performance.now());

  // Camera Orbit State
  const camState = useRef({
    target: new THREE.Vector3(WORLD_W / 2, 6, WORLD_D / 2),
    radius: 36,
    theta: Math.PI / 4, // 45 deg
    phi: Math.PI / 3.2,
    isDragging: false,
    dragButton: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    keys: { KeyW: false, KeyS: false, KeyA: false, KeyD: false, KeyQ: false, KeyE: false },
  });

  // Hover caching to prevent repeated raycasts and React state updates
  const hoveredVoxel = useRef<{
    point: [number, number, number];
    normal: [number, number, number];
  } | null>(null);
  const lastHoverKey = useRef<string>('');
  const pointerDirty = useRef<boolean>(true);
  const lastRaycastTime = useRef<number>(0);

  // Fixed 20 Hz simulation accumulator
  const simAcc = useRef(0);
  const SIM_TICK = 1 / 20;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { world, mesher, colonists, tasks, enemies, pathfinder } = propsRef.current;

    // Detect software GL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec0ee);
    scene.fog = new THREE.FogExp2(0x7ec0ee, 0.015);

    // 2. Camera Setup
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 250);

    // 3. High Performance Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.width = 512;
      sunLight.shadow.mapSize.height = 512;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 100;
      sunLight.shadow.camera.left = -28;
      sunLight.shadow.camera.right = 28;
      sunLight.shadow.camera.top = 28;
      sunLight.shadow.camera.bottom = -28;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    // Campfire Point Light
    const campfireLight = new THREE.PointLight(0xff8822, 2.5, 12, 1.5);
    const centerX = Math.floor(WORLD_W / 2);
    const centerZ = Math.floor(WORLD_D / 2);
    const centerY = world.getHighestSolidY(centerX, centerZ) + 1.5;
    campfireLight.position.set(centerX + 0.5, centerY, centerZ + 0.5);
    scene.add(campfireLight);

    // 5. Add Voxel Terrain Meshes
    mesher.addToScene(scene);

    // 6. Ghost Placement & 3D Structure Preview Manager
    const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    ghostMesh.visible = false;
    scene.add(ghostMesh);

    const previewManager = new StructurePreviewManager(scene);

    // 7. Colonist Visuals (Ported from characters_4e696883.py & generate_weapons)
    const colonistMeshes: THREE.Group[] = [];
    for (let i = 0; i < colonists.count; i++) {
      const cGroup = createArchetypeCharacterVisual(colonists.meta[i]);
      colonistMeshes.push(cGroup);
      scene.add(cGroup);
    }

    // 8. Enemy & Wildlife Visuals (Ported from generate_enemies_79db27ed.py)
    const enemyMeshes: THREE.Group[] = [];
    for (let e = 0; e < enemies.count; e++) {
      const eGroup = createEnemyVisual(enemies.meta[e].type);
      enemyMeshes.push(eGroup);
      scene.add(eGroup);
    }

    // 8. Event Listeners
    const onMouseDown = (e: MouseEvent) => {
      camState.current.isDragging = true;
      camState.current.dragButton = e.button;
      camState.current.lastMouseX = e.clientX;
      camState.current.lastMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _mouse.set(mouseX, mouseY);
      pointerDirty.current = true;

      if (camState.current.isDragging) {
        const dx = e.clientX - camState.current.lastMouseX;
        const dy = e.clientY - camState.current.lastMouseY;
        camState.current.lastMouseX = e.clientX;
        camState.current.lastMouseY = e.clientY;

        if (camState.current.dragButton === 0 || camState.current.dragButton === 2) {
          camState.current.theta -= dx * 0.005;
          camState.current.phi = Math.max(0.15, Math.min(Math.PI / 2.05, camState.current.phi + dy * 0.005));
        } else if (camState.current.dragButton === 1) {
          const forward = new THREE.Vector3(-Math.sin(camState.current.theta), 0, -Math.cos(camState.current.theta));
          const right = new THREE.Vector3(Math.cos(camState.current.theta), 0, -Math.sin(camState.current.theta));
          camState.current.target.addScaledVector(right, -dx * 0.035);
          camState.current.target.addScaledVector(forward, dy * 0.035);
        }
      }
    };

    const onMouseUp = () => {
      camState.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camState.current.radius = Math.max(10, Math.min(75, camState.current.radius + e.deltaY * 0.03));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code in camState.current.keys) {
        camState.current.keys[e.code as keyof typeof camState.current.keys] = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code in camState.current.keys) {
        camState.current.keys[e.code as keyof typeof camState.current.keys] = false;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      audio.playClick();

      const { activeTool, selectedBlockType, onSelectColonist } = propsRef.current;

      // Check colonist hit
      _raycaster.setFromCamera(_mouse, camera);
      for (let i = 0; i < colonistMeshes.length; i++) {
        const cGroup = colonistMeshes[i];
        const intersects = _raycaster.intersectObjects(cGroup.children, true);
        if (intersects.length > 0) {
          onSelectColonist(i);
          return;
        }
      }

      if (!hoveredVoxel.current) {
        onSelectColonist(null);
        return;
      }

      const [hx, hy, hz] = hoveredVoxel.current.point;
      const [nx, ny, nz] = hoveredVoxel.current.normal;

      if (activeTool === 'select') {
        onSelectColonist(null);
      } else if (activeTool === 'mine') {
        const targetBlock = world.getBlock(hx, hy, hz);
        if (targetBlock !== BLOCK_AIR) {
          tasks.addTask(TASK_MINE, hx, hy, hz, targetBlock);
        }
      } else if (activeTool === 'build') {
        const bx = hx + nx;
        const by = hy + ny;
        const bz = hz + nz;
        if (world.getBlock(bx, by, bz) === BLOCK_AIR) {
          tasks.addTask(TASK_BUILD, bx, by, bz, selectedBlockType);
        }
      } else if (activeTool === 'harvest') {
        tasks.addTask(TASK_HARVEST, hx, hy, hz, world.getBlock(hx, hy, hz));
      } else if (activeTool === 'cancel') {
        tasks.cancelTaskAt(hx, hy, hz) || tasks.cancelTaskAt(hx + nx, hy + ny, hz + nz);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);
    container.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    // 9. High-Performance Render Loop with Benchmarking
    let animId = 0;
    let lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      const frameDelta = currentTime - lastFrameTime;
      const dt = Math.min(0.1, frameDelta / 1000);
      lastFrameTime = currentTime;

      const currentProps = propsRef.current;
      const speed = currentProps.gameSpeed;

      // Automated Benchmark camera sweep
      if (perfMonitor.isBenchmarking) {
        camState.current.theta += 0.02;
        camState.current.phi = 0.8 + Math.sin(currentTime * 0.002) * 0.25;
      }

      // Keyboard camera navigation
      const keys = camState.current.keys;
      const forward = new THREE.Vector3(-Math.sin(camState.current.theta), 0, -Math.cos(camState.current.theta));
      const right = new THREE.Vector3(Math.cos(camState.current.theta), 0, -Math.sin(camState.current.theta));
      const panSpeed = 16 * dt;

      if (keys.KeyW) camState.current.target.addScaledVector(forward, panSpeed);
      if (keys.KeyS) camState.current.target.addScaledVector(forward, -panSpeed);
      if (keys.KeyA) camState.current.target.addScaledVector(right, -panSpeed);
      if (keys.KeyD) camState.current.target.addScaledVector(right, panSpeed);
      if (keys.KeyQ) camState.current.theta += 1.8 * dt;
      if (keys.KeyE) camState.current.theta -= 1.8 * dt;

      // Clamp camera target
      camState.current.target.x = Math.max(4, Math.min(WORLD_W - 4, camState.current.target.x));
      camState.current.target.z = Math.max(4, Math.min(WORLD_D - 4, camState.current.target.z));

      // Follow selected colonist
      if (currentProps.selectedColonistId !== null && currentProps.selectedColonistId < colonists.count) {
        const scId = currentProps.selectedColonistId;
        camState.current.target.lerp(_v1.set(colonists.x[scId], colonists.y[scId], colonists.z[scId]), 0.08);
      }

      // Update camera matrix
      const cx = camState.current.target.x + camState.current.radius * Math.sin(camState.current.phi) * Math.sin(camState.current.theta);
      const cy = camState.current.target.y + camState.current.radius * Math.cos(camState.current.phi);
      const cz = camState.current.target.z + camState.current.radius * Math.sin(camState.current.phi) * Math.cos(camState.current.theta);
      camera.position.set(cx, cy, cz);
      camera.lookAt(camState.current.target);

      // Simulation fixed tick accumulation
      const simStart = performance.now();
      if (speed > 0) {
        simAcc.current += dt * speed;
        while (simAcc.current >= SIM_TICK) {
          colonists.updateTick(world, tasks, pathfinder, speed);
          enemies.updateTick(world, colonists, tasks, speed);
          simAcc.current -= SIM_TICK;

          // Advance local time scalar
          simTimeRef.current += 0.015 * speed;
          if (simTimeRef.current >= 24) {
            simTimeRef.current -= 24;
            currentProps.setDayCount((d) => d + 1);
          }
        }

        // Throttle UI React state updates to 2 times per second to prevent re-render thrashing
        if (currentTime - lastUiTimeSyncRef.current > 500) {
          lastUiTimeSyncRef.current = currentTime;
          currentProps.setTimeOfDay(simTimeRef.current);
        }
      }
      const simMs = performance.now() - simStart;

      // Day / Night Sun Lighting Update
      const timeOfDay = simTimeRef.current;
      const hourAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
      const sunDistance = 50;
      const sunX = WORLD_W / 2 + Math.cos(hourAngle) * sunDistance;
      const sunY = Math.sin(hourAngle) * sunDistance;
      const sunZ = WORLD_D / 2 + Math.sin(hourAngle * 0.3) * 15;

      sunLight.position.set(sunX, Math.max(2, sunY), sunZ);
      sunLight.target.position.set(WORLD_W / 2, 4, WORLD_D / 2);
      sunLight.target.updateMatrixWorld();

      if (timeOfDay >= 6 && timeOfDay <= 18) {
        const dayProgress = (timeOfDay - 6) / 12;
        const intensity = Math.sin(dayProgress * Math.PI) * 1.5;
        sunLight.intensity = Math.max(0.15, intensity);
        sunLight.color.set(0xfff8e8);
        scene.background = new THREE.Color().setHSL(0.58, 0.6, 0.45 + intensity * 0.25);
        if (scene.fog) scene.fog.color.copy(scene.background);
      } else {
        sunLight.intensity = 0.25;
        sunLight.color.set(0x8899cc);
        scene.background = new THREE.Color(0x080c18);
        if (scene.fog) scene.fog.color.set(0x080c18);
      }

      campfireLight.intensity = 2.2 + Math.sin(currentTime * 0.01) * 0.4;

      // Remesh dirty chunks
      mesher.updateDirtyChunks(world, 1);

      // Throttled Raycast Mouse to Chunks (Only when pointer moves, max 30 Hz)
      if (pointerDirty.current && currentTime - lastRaycastTime.current > 33) {
        pointerDirty.current = false;
        lastRaycastTime.current = currentTime;

        _raycaster.setFromCamera(_mouse, camera);
        // Use pre-cached meshObjects array (zero allocation!)
        const intersects = _raycaster.intersectObjects(mesher.meshObjects, false);

        if (intersects.length > 0) {
          const hit = intersects[0];
          if (hit.point && hit.face) {
            const vx = Math.floor(hit.point.x - hit.face.normal.x * 0.01);
            const vy = Math.floor(hit.point.y - hit.face.normal.y * 0.01);
            const vz = Math.floor(hit.point.z - hit.face.normal.z * 0.01);

            const key = `${vx},${vy},${vz}`;
            hoveredVoxel.current = {
              point: [vx, vy, vz],
              normal: [Math.round(hit.face.normal.x), Math.round(hit.face.normal.y), Math.round(hit.face.normal.z)],
            };

            // Only notify React when hovered block actually changes!
            if (key !== lastHoverKey.current) {
              lastHoverKey.current = key;
              const blockId = world.getBlock(vx, vy, vz);
              const blockDef = BLOCK_DEFS[blockId];
              currentProps.onHoverVoxel([vx, vy, vz], blockDef ? blockDef.name : undefined);
            }

            if (currentProps.activeTool === 'build') {
              ghostMesh.visible = false;
              const bx = vx + Math.round(hit.face.normal.x);
              const by = vy + Math.round(hit.face.normal.y);
              const bz = vz + Math.round(hit.face.normal.z);

              // Check validity: space is air, in bounds, and sufficient stockpile resources
              const isAir = world.getBlock(bx, by, bz) === BLOCK_AIR;
              const inBounds = bx >= 0 && bx < WORLD_W && by >= 0 && by < WORLD_H && bz >= 0 && bz < WORLD_D;
              const def = BLOCK_DEFS[currentProps.selectedBlockType];
              let hasResources = true;
              if (def && def.buildCost) {
                for (const cost of def.buildCost) {
                  const resKey = cost.resource as keyof typeof tasks.resources;
                  if ((tasks.resources[resKey] ?? 0) < cost.count) {
                    hasResources = false;
                    break;
                  }
                }
              }
              const isValid = isAir && inBounds && hasResources;
              previewManager.updateHoverPreview(bx, by, bz, currentProps.selectedBlockType, isValid, true);
            } else {
              previewManager.updateHoverPreview(0, 0, 0, 0, false, false);
              ghostMesh.visible = true;
              if (currentProps.activeTool === 'mine') {
                ghostMesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
                (ghostMesh.material as THREE.MeshBasicMaterial).color.set(0xef4444);
              } else {
                ghostMesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
                (ghostMesh.material as THREE.MeshBasicMaterial).color.set(0x38bdf8);
              }
            }
          }
        } else {
          hoveredVoxel.current = null;
          ghostMesh.visible = false;
          previewManager.updateHoverPreview(0, 0, 0, 0, false, false);
          if (lastHoverKey.current !== '') {
            lastHoverKey.current = '';
            currentProps.onHoverVoxel(null);
          }
        }
      }

      // Update Structure Previews & Pending Task Blueprints
      previewManager.animate(currentTime);
      previewManager.syncPendingTaskBlueprints(
        tasks.count,
        tasks.taskType,
        tasks.blockType,
        tasks.targetX,
        tasks.targetY,
        tasks.targetZ
      );

      // Update Colonists Visuals & Animation
      for (let i = 0; i < colonists.count; i++) {
        let cGroup = colonistMeshes[i];
        if (!cGroup) {
          cGroup = createArchetypeCharacterVisual(colonists.meta[i]);
          colonistMeshes.push(cGroup);
          scene.add(cGroup);
        }

        const px = colonists.x[i];
        const py = colonists.y[i];
        const pz = colonists.z[i];
        const rot = colonists.rotation[i];
        const cState = colonists.state[i];

        cGroup.position.set(px, py, pz);
        cGroup.rotation.y = rot;

        const ud = cGroup.userData;
        const walkCycle = Math.sin(currentTime * 0.012) * 0.45;
        const isMoving = cState === 1 || cState === 7;

        if (cState === STATE_SLEEP) {
          cGroup.rotation.x = -Math.PI / 2;
          cGroup.position.y = py + 0.15;
          if (ud.leftLeg) ud.leftLeg.rotation.x = 0;
          if (ud.rightLeg) ud.rightLeg.rotation.x = 0;
          if (ud.rightArm) ud.rightArm.rotation.x = 0;
        } else {
          cGroup.rotation.x = 0;
          if (ud.leftLeg && ud.rightLeg) {
            if (isMoving) {
              ud.leftLeg.rotation.x = walkCycle;
              ud.rightLeg.rotation.x = -walkCycle;
              if (ud.leftArm) ud.leftArm.rotation.x = -walkCycle * 0.8;
              if (ud.rightArm) ud.rightArm.rotation.x = walkCycle * 0.8;
            } else {
              ud.leftLeg.rotation.x = 0;
              ud.rightLeg.rotation.x = 0;
              if (ud.leftArm) ud.leftArm.rotation.x = 0;
              if (ud.rightArm) ud.rightArm.rotation.x = 0;
            }
          }

          if (cState === STATE_MINE || cState === STATE_BUILD || cState === STATE_HARVEST) {
            const toolSwing = Math.sin(currentTime * 0.02) * 0.85;
            if (ud.rightArm) ud.rightArm.rotation.x = -0.8 + toolSwing;
            if (ud.weapon) ud.weapon.rotation.x = 0.5 + toolSwing;
          } else {
            if (ud.weapon) ud.weapon.rotation.x = Math.PI / 4;
          }
        }

        // Emote billboard
        let currentEmote = '😊';
        if (cState === STATE_MINE) currentEmote = '⛏️';
        else if (cState === STATE_BUILD) currentEmote = '🔨';
        else if (cState === STATE_HARVEST) currentEmote = '🌾';
        else if (cState === 5) currentEmote = '🍗';
        else if (cState === STATE_SLEEP) currentEmote = '💤';
        else if (colonists.hunger[i] > 70) currentEmote = '⚠️';
        else if (colonists.happiness[i] < 40) currentEmote = '😟';

        if (ud.lastEmote !== currentEmote) {
          ud.lastEmote = currentEmote;
          ud.spriteCtx.clearRect(0, 0, 64, 64);
          ud.spriteCtx.fillText(currentEmote, 32, 32);
          ud.spriteTex.needsUpdate = true;
        }
      }

      // Update Enemies Visuals & Animation
      for (let e = 0; e < enemies.count; e++) {
        let eGroup = enemyMeshes[e];
        if (!eGroup) {
          eGroup = createEnemyVisual(enemies.meta[e].type);
          enemyMeshes.push(eGroup);
          scene.add(eGroup);
        }
        eGroup.visible = true;
        eGroup.position.set(enemies.x[e], enemies.y[e], enemies.z[e]);
        eGroup.rotation.y = enemies.rotation[e];

        // Slime bounce or walking animation
        const isSlime = enemies.meta[e].type.includes('slime');
        if (isSlime) {
          const bounce = 1.0 + Math.sin(currentTime * 0.015) * 0.15;
          eGroup.scale.set(1 / bounce, bounce, 1 / bounce);
        }

        // Health bar update
        const curHp = Math.round(enemies.hp[e]);
        if (eGroup.userData.lastHp !== curHp) {
          eGroup.userData.lastHp = curHp;
          const ctx = eGroup.userData.hpCtx;
          ctx.clearRect(0, 0, 96, 24);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(0, 0, 96, 24);
          ctx.fillStyle = curHp > 20 ? '#10b981' : '#ef4444';
          const hpWidth = Math.max(0, (curHp / enemies.maxHp[e]) * 92);
          ctx.fillRect(2, 2, hpWidth, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${enemies.meta[e].name}`, 48, 15);
          eGroup.userData.hpTex.needsUpdate = true;
        }
      }
      for (let j = enemies.count; j < enemyMeshes.length; j++) {
        enemyMeshes[j].visible = false;
      }

      // Render WebGL Scene
      const renderStart = performance.now();
      renderer.render(scene, camera);
      const renderMs = performance.now() - renderStart;

      // Record performance telemetry
      const drawCalls = renderer.info.render.calls;
      const triangles = renderer.info.render.triangles;
      perfMonitor.recordFrame(frameDelta, simMs, renderMs, drawCalls, triangles);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [props.world]); // Only recreate WebGL scene if world itself is regenerated!

  return <div ref={mountRef} className="w-full h-full relative cursor-crosshair overflow-hidden" />;
};
