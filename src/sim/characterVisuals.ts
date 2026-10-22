import * as THREE from 'three';
import { ARCHETYPES } from './archetypeModels';
import { buildWeaponMesh } from './weaponModels';
import { buildEnemyModel } from './enemyModels';
import { ColonistMeta } from './colonists';

export interface VisualRigUserData {
  head?: THREE.Object3D;
  torso?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  weapon?: THREE.Object3D;
  shield?: THREE.Object3D;
  sprite: THREE.Sprite;
  spriteCtx: CanvasRenderingContext2D;
  spriteTex: THREE.CanvasTexture;
  lastEmote: string;
}

export function createArchetypeCharacterVisual(meta: ColonistMeta): THREE.Group {
  const root = new THREE.Group();
  const archDef = ARCHETYPES[meta.archetypeId] || ARCHETYPES.paladin;
  const builder = archDef.createBuilder();
  const { group, partMeshes } = builder.buildModelGroup(0.045);

  root.add(group);

  const head = partMeshes.get('Head_Hair_Ears');
  const torso = partMeshes.get('Torso_Body');
  const rightArm = partMeshes.get('Right_Arm_Hand');
  const leftArm = partMeshes.get('Left_Arm_Hand');
  const rightLeg = partMeshes.get('Right_Foot');
  const leftLeg = partMeshes.get('Left_Foot');

  // Attach equipped weapon to right arm
  const weapon = buildWeaponMesh(meta.equippedWeapon || 'sword');
  weapon.scale.set(0.65, 0.65, 0.65);
  weapon.position.set(-0.35, 0.2, 0.1);
  weapon.rotation.x = Math.PI / 4;
  if (rightArm) {
    rightArm.add(weapon);
  } else {
    root.add(weapon);
  }

  // If Paladin or Warrior, attach heater shield to left arm
  let shield: THREE.Group | undefined;
  if (meta.archetypeId === 'paladin') {
    shield = buildWeaponMesh('heater_shield');
    shield.scale.set(0.6, 0.6, 0.6);
    shield.position.set(0.35, 0.3, 0);
    shield.rotation.y = -Math.PI / 2;
    if (leftArm) leftArm.add(shield);
  }

  // Floating Status emote billboard
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('😊', 32, 32);

  const spriteTexture = new THREE.CanvasTexture(canvas);
  spriteTexture.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({ map: spriteTexture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.y = 1.35;
  sprite.scale.set(0.45, 0.45, 1);
  root.add(sprite);

  const ud: VisualRigUserData = {
    head,
    torso,
    rightArm,
    leftArm,
    rightLeg,
    leftLeg,
    weapon,
    shield,
    sprite,
    spriteCtx: ctx,
    spriteTex: spriteTexture,
    lastEmote: '😊',
  };

  root.userData = ud;
  return root;
}

export function createEnemyVisual(enemyType: string): THREE.Group {
  const root = new THREE.Group();
  const { group, partMeshes } = buildEnemyModel(enemyType);
  root.add(group);

  // Floating HP bar
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.y = 1.25;
  sprite.scale.set(0.7, 0.18, 1);
  root.add(sprite);

  root.userData = {
    partMeshes,
    hpCtx: ctx,
    hpTex: tex,
    lastHp: -1,
  };

  return root;
}
