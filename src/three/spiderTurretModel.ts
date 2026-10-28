import * as THREE from 'three';
import { createTurretMaterials, TurretMaterialSet } from './proceduralTextures';
import { LimbKinematics } from '../types/turret';

export interface ExplodablePart {
  object: THREE.Object3D;
  restPos: THREE.Vector3;
  explodeDelta: THREE.Vector3;
}

export interface EjectedCasing {
  mesh: THREE.Mesh;
  active: boolean;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  age: number;
}

export interface LimbRig {
  hipMountAngle: number;
  rootGroup: THREE.Group;
  coxaPivot: THREE.Group;
  femurPivot: THREE.Group;
  tibiaPivot: THREE.Group;
  tarsusPivot: THREE.Group;
}

export interface SpiderTurretRig {
  root: THREE.Group;
  pelvisGroup: THREE.Group;
  headYawGroup: THREE.Group;
  headPitchGroup: THREE.Group;
  cannonPitchGroup: THREE.Group;
  cannonRecoilGroup: THREE.Group;
  barrelRotorGroup: THREE.Group;
  muzzleFlashGroup: THREE.Group;
  casingsGroup: THREE.Group;
  limbs: [LimbRig, LimbRig, LimbRig, LimbRig];
  explodableParts: ExplodablePart[];
  wireframeLines: THREE.LineSegments[];
  standardMeshes: Array<{ mesh: THREE.Mesh; baseMaterial: THREE.Material }>;
  thermalBarrelMaterials: THREE.MeshStandardMaterial[];
  materials: TurretMaterialSet;
  casingsPool: EjectedCasing[];
  spawnCasing: () => void;
  setWireframe: (enabled: boolean) => void;
  setExplodeFactor: (factor: number) => void;
  updateThermalGlow: (tempCelsius: number) => void;
}

export function buildSpiderTurretRig( existingMaterials?: TurretMaterialSet): SpiderTurretRig {
  const materials = existingMaterials ?? createTurretMaterials();
  const root = new THREE.Group();
  const explodableParts: ExplodablePart[] = [];
  const wireframeLines: THREE.LineSegments[] = [];
  const standardMeshes: Array<{ mesh: THREE.Mesh; baseMaterial: THREE.Material }> = [];
  const thermalBarrelMaterials: THREE.MeshStandardMaterial[] = [];

  const wireSolidMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1b1918),
    roughness: 0.75,
    metalness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  function registerExplodable(obj: THREE.Object3D, dx: number, dy: number, dz: number) {
    explodableParts.push({
      object: obj,
      restPos: obj.position.clone(),
      explodeDelta: new THREE.Vector3(dx, dy, dz),
    });
  }

  function decorateMesh(mesh: THREE.Mesh, limbIndex?: number) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (limbIndex !== undefined) {
      mesh.userData.limbIndex = limbIndex;
    }
    standardMeshes.push({ mesh, baseMaterial: mesh.material as THREE.Material });

    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 24);
    const line = new THREE.LineSegments(edgesGeo, materials.wireframeOverlay);
    line.visible = false;
    mesh.add(line);
    wireframeLines.push(line);
  }

  // =========================================================================
  // 1. PELVIS RING & CENTRAL HYDRAULIC COLUMN
  // =========================================================================
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 1.05, 0);
  root.add(pelvisGroup);

  // Main dark pelvis core ring
  const pelvisCoreGeo = new THREE.CylinderGeometry(0.46, 0.44, 0.22, 32);
  const pelvisCoreMesh = new THREE.Mesh(pelvisCoreGeo, materials.gunmetalDark);
  decorateMesh(pelvisCoreMesh);
  pelvisGroup.add(pelvisCoreMesh);

  // Upper & lower bevel rings on pelvis
  const pelvisTopLipGeo = new THREE.TorusGeometry(0.42, 0.045, 14, 32);
  pelvisTopLipGeo.rotateX(Math.PI / 2);
  const pelvisTopLip = new THREE.Mesh(pelvisTopLipGeo, materials.gunmetalDark);
  pelvisTopLip.position.set(0, 0.11, 0);
  decorateMesh(pelvisTopLip);
  pelvisGroup.add(pelvisTopLip);

  const pelvisBotLip = new THREE.Mesh(pelvisTopLipGeo, materials.gunmetalDark);
  pelvisBotLip.position.set(0, -0.11, 0);
  decorateMesh(pelvisBotLip);
  pelvisGroup.add(pelvisBotLip);

  // Lower undercarriage cap
  const underCapGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.08, 24);
  const underCap = new THREE.Mesh(underCapGeo, materials.gunmetalDark);
  underCap.position.set(0, -0.15, 0);
  decorateMesh(underCap);
  pelvisGroup.add(underCap);
  registerExplodable(underCap, 0, -0.25, 0);

  // 4 Weathered Orange Armor Panels around the pelvis (at 0, 90, 180, 270 deg)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const armorHolder = new THREE.Group();
    armorHolder.rotation.y = angle;
    pelvisGroup.add(armorHolder);

    const panelGeo = new THREE.CylinderGeometry(
      0.495,
      0.485,
      0.19,
      16,
      1,
      false,
      -0.36,
      0.72
    );
    const panelMesh = new THREE.Mesh(panelGeo, materials.weatheredOrange);
    decorateMesh(panelMesh);
    armorHolder.add(panelMesh);
    registerExplodable(panelMesh, 0, 0, 0.28);
  }

  // Central Hydraulic Column connecting pelvis to head
  const neckColumnGeo = new THREE.CylinderGeometry(0.19, 0.21, 0.28, 24);
  const neckColumn = new THREE.Mesh(neckColumnGeo, materials.hydraulicSteel);
  neckColumn.position.set(0, 0.22, 0);
  decorateMesh(neckColumn);
  pelvisGroup.add(neckColumn);
  registerExplodable(neckColumn, 0, 0.14, 0);

  // =========================================================================
  // 2. FOUR ARTICULATED SPIDER LIMBS (NE, NW, SW, SE)
  // =========================================================================
  const hipAngles = [
    Math.PI * 0.25,  // Front-Right
    Math.PI * 0.75,  // Rear-Right
    Math.PI * 1.25,  // Rear-Left
    Math.PI * 1.75,  // Front-Left
  ];

  const limbsList: LimbRig[] = [];

  for (let i = 0; i < 4; i++) {
    const mountAngle = hipAngles[i];
    const limbRoot = new THREE.Group();
    limbRoot.rotation.y = mountAngle;
    pelvisGroup.add(limbRoot);

    // Hip Clevis Bracket attached to Pelvis
    const hipBracketGeo = new THREE.BoxGeometry(0.18, 0.16, 0.22);
    const hipBracket = new THREE.Mesh(hipBracketGeo, materials.gunmetalDark);
    hipBracket.position.set(0, 0, 0.48);
    decorateMesh(hipBracket, i);
    limbRoot.add(hipBracket);

    // Coxa Yaw Pivot
    const coxaPivot = new THREE.Group();
    coxaPivot.position.set(0, 0, 0.56);
    limbRoot.add(coxaPivot);

    // Coxa Drum Cylinder (horizontal axis)
    const coxaDrumGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.21, 20);
    coxaDrumGeo.rotateZ(Math.PI / 2);
    const coxaDrum = new THREE.Mesh(coxaDrumGeo, materials.gunmetalDark);
    decorateMesh(coxaDrum, i);
    coxaPivot.add(coxaDrum);

    // Coxa Cap Rings
    const coxaCapGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.23, 16);
    coxaCapGeo.rotateZ(Math.PI / 2);
    const coxaCap = new THREE.Mesh(coxaCapGeo, materials.gunmetalMid);
    decorateMesh(coxaCap, i);
    coxaPivot.add(coxaCap);
    registerExplodable(coxaCap, 0.14, 0, 0);

    // Femur Pitch Pivot (310mm I-Beam Dual Parallel Bars)
    const femurPivot = new THREE.Group();
    femurPivot.position.set(0, 0, 0.04);
    coxaPivot.add(femurPivot);

    const femurLength = 0.74;
    // Upper I-Beam Bar
    const upperBeamGeo = new THREE.BoxGeometry(0.095, 0.055, femurLength);
    const upperBeam = new THREE.Mesh(upperBeamGeo, materials.gunmetalDark);
    upperBeam.position.set(0, 0.046, femurLength * 0.5);
    decorateMesh(upperBeam, i);
    femurPivot.add(upperBeam);
    registerExplodable(upperBeam, 0, 0.14, 0);

    // Lower I-Beam Bar
    const lowerBeamGeo = new THREE.BoxGeometry(0.095, 0.05, femurLength);
    const lowerBeam = new THREE.Mesh(lowerBeamGeo, materials.gunmetalDark);
    lowerBeam.position.set(0, -0.046, femurLength * 0.5);
    decorateMesh(lowerBeam, i);
    femurPivot.add(lowerBeam);
    registerExplodable(lowerBeam, 0, -0.14, 0);

    // Side Webbing / Parallel Tie Rods inside Femur
    const tieRodGeo = new THREE.CylinderGeometry(0.016, 0.016, femurLength * 0.88, 10);
    tieRodGeo.rotateX(Math.PI / 2);
    const tieRodLeft = new THREE.Mesh(tieRodGeo, materials.hydraulicSteel);
    tieRodLeft.position.set(0.055, 0, femurLength * 0.5);
    decorateMesh(tieRodLeft, i);
    femurPivot.add(tieRodLeft);
    registerExplodable(tieRodLeft, 0.12, 0, 0);

    const tieRodRight = new THREE.Mesh(tieRodGeo, materials.hydraulicSteel);
    tieRodRight.position.set(-0.055, 0, femurLength * 0.5);
    decorateMesh(tieRodRight, i);
    femurPivot.add(tieRodRight);
    registerExplodable(tieRodRight, -0.12, 0, 0);

    // Knee / Tibia Pitch Pivot at end of Femur
    const tibiaPivot = new THREE.Group();
    tibiaPivot.position.set(0, 0, femurLength);
    femurPivot.add(tibiaPivot);

    // Knee Cylindrical Joint Drum
    const kneeDrumGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.22, 20);
    kneeDrumGeo.rotateZ(Math.PI / 2);
    const kneeDrum = new THREE.Mesh(kneeDrumGeo, materials.gunmetalDark);
    decorateMesh(kneeDrum, i);
    tibiaPivot.add(kneeDrum);

    const kneeInnerCapGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.24, 16);
    kneeInnerCapGeo.rotateZ(Math.PI / 2);
    const kneeInnerCap = new THREE.Mesh(kneeInnerCapGeo, materials.gunmetalMid);
    decorateMesh(kneeInnerCap, i);
    tibiaPivot.add(kneeInnerCap);

    // Pointed Knee Armor Crest Shield (sweeping upward above the knee)
    const crestShape = new THREE.Shape();
    crestShape.moveTo(0, -0.05);
    crestShape.lineTo(0.14, 0.04);
    crestShape.lineTo(0.04, 0.36);
    crestShape.lineTo(-0.03, 0.34);
    crestShape.lineTo(-0.08, 0.02);
    crestShape.closePath();

    const crestExtrude = new THREE.ExtrudeGeometry(crestShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    crestExtrude.center();
    crestExtrude.rotateY(Math.PI / 2);
    const kneeCrest = new THREE.Mesh(crestExtrude, materials.gunmetalDark);
    kneeCrest.position.set(0, 0.22, 0.06);
    kneeCrest.rotation.x = -0.22;
    decorateMesh(kneeCrest, i);
    tibiaPivot.add(kneeCrest);
    registerExplodable(kneeCrest, 0, 0.32, 0.14);

    // Two rivet pins on Knee Crest
    for (const rOffset of [-0.025, 0.025]) {
      const rivetGeo = new THREE.SphereGeometry(0.014, 8, 8);
      const rivet = new THREE.Mesh(rivetGeo, materials.hydraulicSteel);
      rivet.position.set(rOffset, 0.11, 0.12);
      decorateMesh(rivet, i);
      tibiaPivot.add(rivet);
      registerExplodable(rivet, 0, 0.22, 0.18);
    }

    // Tibia Shin Segment (355mm SHIN - extends downward Along -Y in local tibia frame)
    const tibiaLength = 0.82;
    const shinUpperGeo = new THREE.BoxGeometry(0.155, tibiaLength * 0.85, 0.17);
    const shinUpper = new THREE.Mesh(shinUpperGeo, materials.gunmetalDark);
    shinUpper.position.set(0, -tibiaLength * 0.44, 0.02);
    decorateMesh(shinUpper, i);
    tibiaPivot.add(shinUpper);

    // Recessed Side Spine Plate on Tibia
    const shinSpineGeo = new THREE.BoxGeometry(0.175, tibiaLength * 0.68, 0.075);
    const shinSpine = new THREE.Mesh(shinSpineGeo, materials.gunmetalMid);
    shinSpine.position.set(0, -tibiaLength * 0.44, 0.02);
    decorateMesh(shinSpine, i);
    tibiaPivot.add(shinSpine);
    registerExplodable(shinSpine, 0, 0, 0.16);

    // Ankle Collar Drum at bottom of Tibia
    const tarsusPivot = new THREE.Group();
    tarsusPivot.position.set(0, -tibiaLength * 0.88, 0.02);
    tibiaPivot.add(tarsusPivot);

    const ankleCollarGeo = new THREE.BoxGeometry(0.18, 0.15, 0.2);
    const ankleCollar = new THREE.Mesh(ankleCollarGeo, materials.gunmetalDark);
    decorateMesh(ankleCollar, i);
    tarsusPivot.add(ankleCollar);

    const ankleDrumGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.21, 16);
    ankleDrumGeo.rotateZ(Math.PI / 2);
    const ankleDrum = new THREE.Mesh(ankleDrumGeo, materials.gunmetalMid);
    ankleDrum.position.set(0, -0.02, 0.02);
    decorateMesh(ankleDrum, i);
    tarsusPivot.add(ankleDrum);

    // Curved Pointed 2-Pad Pincer Claw Foot (curving inward toward center)
    const clawShape = new THREE.Shape();
    clawShape.moveTo(-0.07, 0);
    clawShape.quadraticCurveTo(-0.09, -0.22, -0.24, -0.42);
    clawShape.quadraticCurveTo(-0.04, -0.34, 0.06, -0.14);
    clawShape.lineTo(0.07, 0);
    clawShape.closePath();

    const clawGeo = new THREE.ExtrudeGeometry(clawShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    clawGeo.center();
    clawGeo.rotateY(Math.PI / 2);
    const clawMesh = new THREE.Mesh(clawGeo, materials.gunmetalDark);
    clawMesh.position.set(0, -0.24, -0.04);
    decorateMesh(clawMesh, i);
    tarsusPivot.add(clawMesh);
    registerExplodable(clawMesh, 0, -0.34, -0.08);

    limbsList.push({
      hipMountAngle: mountAngle,
      rootGroup: limbRoot,
      coxaPivot,
      femurPivot,
      tibiaPivot,
      tarsusPivot,
    });
  }

  // =========================================================================
  // 3. SPHERICAL HEAD & EXHAUSTS POD (MODULE 02)
  // =========================================================================
  const headYawGroup = new THREE.Group();
  headYawGroup.position.set(0, 1.48, 0);
  root.add(headYawGroup);

  const headPitchGroup = new THREE.Group();
  headYawGroup.add(headPitchGroup);

  // Lower Orange Neck Ring
  const headNeckRingGeo = new THREE.TorusGeometry(0.28, 0.055, 14, 32);
  headNeckRingGeo.rotateX(Math.PI / 2);
  const headNeckRing = new THREE.Mesh(headNeckRingGeo, materials.weatheredOrange);
  headNeckRing.position.set(0, -0.3, 0);
  decorateMesh(headNeckRing);
  headPitchGroup.add(headNeckRing);
  registerExplodable(headNeckRing, 0, -0.18, 0);

  // Main Weathered Orange Spherical Core
  const headSphereGeo = new THREE.SphereGeometry(0.46, 36, 28);
  const headSphere = new THREE.Mesh(headSphereGeo, materials.weatheredOrange);
  headSphere.scale.set(1.04, 0.94, 1.04);
  decorateMesh(headSphere);
  headPitchGroup.add(headSphere);

  // Equatorial Dark Armor Belt around Lower Head Sphere
  const headBeltGeo = new THREE.CylinderGeometry(0.455, 0.41, 0.11, 32, 1, true);
  const headBelt = new THREE.Mesh(headBeltGeo, materials.gunmetalDark);
  headBelt.position.set(0, -0.17, 0);
  decorateMesh(headBelt);
  headPitchGroup.add(headBelt);

  // Front T-Visor Armored Faceplate (facing +Z in turret local space)
  const visorGroup = new THREE.Group();
  visorGroup.position.set(0, -0.02, 0.42);
  headPitchGroup.add(visorGroup);
  registerExplodable(visorGroup, 0, 0, 0.36);

  // Upper T-Visor Brow Plate
  const visorBrowGeo = new THREE.BoxGeometry(0.28, 0.08, 0.12);
  const visorBrow = new THREE.Mesh(visorBrowGeo, materials.gunmetalDark);
  visorBrow.position.set(0, 0.11, 0.01);
  visorBrow.rotation.x = 0.25;
  decorateMesh(visorBrow);
  visorGroup.add(visorBrow);

  // Left & Right Cheek Plates (forming the T-slit)
  const cheekGeo = new THREE.BoxGeometry(0.125, 0.15, 0.12);
  const leftCheek = new THREE.Mesh(cheekGeo, materials.gunmetalDark);
  leftCheek.position.set(0.075, -0.02, 0.02);
  decorateMesh(leftCheek);
  visorGroup.add(leftCheek);

  const rightCheek = new THREE.Mesh(cheekGeo, materials.gunmetalDark);
  rightCheek.position.set(-0.075, -0.02, 0.02);
  decorateMesh(rightCheek);
  visorGroup.add(rightCheek);

  // Front Recessed Optic Ports flanking the T-Visor
  for (const sideX of [-0.21, 0.21]) {
    const frontEyeGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.08, 14);
    frontEyeGeo.rotateX(Math.PI / 2);
    const frontEye = new THREE.Mesh(frontEyeGeo, materials.gunmetalDark);
    frontEye.position.set(sideX, 0.09, -0.03);
    decorateMesh(frontEye);
    visorGroup.add(frontEye);
  }

  // Side Circular Acoustic / Sensor Pods (Left +X and Right -X)
  for (const dirX of [-1, 1]) {
    const earPodGroup = new THREE.Group();
    earPodGroup.position.set(dirX * 0.44, -0.01, -0.02);
    headPitchGroup.add(earPodGroup);
    registerExplodable(earPodGroup, dirX * 0.38, 0, 0);

    const outerDrumGeo = new THREE.CylinderGeometry(0.24, 0.25, 0.11, 28);
    outerDrumGeo.rotateZ(Math.PI / 2);
    const outerDrum = new THREE.Mesh(outerDrumGeo, materials.gunmetalDark);
    decorateMesh(outerDrum);
    earPodGroup.add(outerDrum);

    const midRingGeo = new THREE.TorusGeometry(0.16, 0.032, 12, 24);
    midRingGeo.rotateY(Math.PI / 2);
    const midRing = new THREE.Mesh(midRingGeo, materials.gunmetalMid);
    midRing.position.set(dirX * 0.05, 0, 0);
    decorateMesh(midRing);
    earPodGroup.add(midRing);

    const centerBossGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.15, 20);
    centerBossGeo.rotateZ(Math.PI / 2);
    const centerBoss = new THREE.Mesh(centerBossGeo, materials.gunmetalDark);
    centerBoss.position.set(dirX * 0.02, 0, 0);
    decorateMesh(centerBoss);
    earPodGroup.add(centerBoss);
  }

  // Top-Front Antenna / Sensor Stalk
  const antennaGroup = new THREE.Group();
  antennaGroup.position.set(0.12, 0.36, 0.24);
  antennaGroup.rotation.z = -0.25;
  antennaGroup.rotation.x = 0.25;
  headPitchGroup.add(antennaGroup);
  registerExplodable(antennaGroup, 0.12, 0.28, 0.18);

  const stalkGeo = new THREE.CylinderGeometry(0.022, 0.032, 0.16, 12);
  const stalkMesh = new THREE.Mesh(stalkGeo, materials.gunmetalDark);
  decorateMesh(stalkMesh);
  antennaGroup.add(stalkMesh);

  const bulbGeo = new THREE.SphereGeometry(0.052, 14, 14);
  const bulbMesh = new THREE.Mesh(bulbGeo, materials.gunmetalDark);
  bulbMesh.position.set(0, 0.09, 0);
  decorateMesh(bulbMesh);
  antennaGroup.add(bulbMesh);

  // Rear Yellow-Ringed Optical Port (facing -Z)
  const rearPortGroup = new THREE.Group();
  rearPortGroup.position.set(0, 0.05, -0.45);
  headPitchGroup.add(rearPortGroup);
  registerExplodable(rearPortGroup, 0, 0, -0.28);

  const rearBezelGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.08, 24);
  rearBezelGeo.rotateX(Math.PI / 2);
  const rearBezel = new THREE.Mesh(rearBezelGeo, materials.gunmetalDark);
  decorateMesh(rearBezel);
  rearPortGroup.add(rearBezel);

  const yellowRingGeo = new THREE.TorusGeometry(0.068, 0.016, 12, 24);
  const yellowRing = new THREE.Mesh(yellowRingGeo, materials.opticYellow);
  yellowRing.position.set(0, 0, -0.042);
  decorateMesh(yellowRing);
  rearPortGroup.add(yellowRing);

  // 6 Angled Exhaust Manifold Pipes (3 on Left-Rear, 3 on Right-Rear)
  const exhaustGroup = new THREE.Group();
  headPitchGroup.add(exhaustGroup);
  registerExplodable(exhaustGroup, 0, 0.16, -0.42);

  for (const sideX of [-1, 1]) {
    for (let p = 0; p < 3; p++) {
      const yBase = 0.06 + p * 0.095;
      const zBase = -0.32 + p * 0.03;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sideX * 0.26, yBase - 0.05, zBase + 0.08),
        new THREE.Vector3(sideX * 0.34, yBase + 0.06, zBase - 0.12),
        new THREE.Vector3(sideX * 0.38, yBase + 0.24, zBase - 0.32),
      ]);
      const pipeGeo = new THREE.TubeGeometry(curve, 14, 0.036, 12, false);
      const pipeMesh = new THREE.Mesh(pipeGeo, materials.gunmetalDark);
      decorateMesh(pipeMesh);
      exhaustGroup.add(pipeMesh);

      // Lip collar at pipe tip
      const tipPos = curve.getPoint(1);
      const tipTan = curve.getTangent(1);
      const tipCollarGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.03, 12);
      const tipCollar = new THREE.Mesh(tipCollarGeo, materials.gunmetalMid);
      tipCollar.position.copy(tipPos);
      tipCollar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipTan.normalize());
      decorateMesh(tipCollar);
      exhaustGroup.add(tipCollar);
    }
  }

  // Upper Gimbal Neck Post connecting Head to Gatling Cannon
  const upperNeckCollarGeo = new THREE.TorusGeometry(0.21, 0.045, 12, 28);
  upperNeckCollarGeo.rotateX(Math.PI / 2);
  const upperNeckCollar = new THREE.Mesh(upperNeckCollarGeo, materials.gunmetalDark);
  upperNeckCollar.position.set(0, 0.41, 0);
  decorateMesh(upperNeckCollar);
  headPitchGroup.add(upperNeckCollar);

  const upperNeckPostGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.28, 24);
  const upperNeckPost = new THREE.Mesh(upperNeckPostGeo, materials.hydraulicSteel);
  upperNeckPost.position.set(0, 0.54, 0);
  decorateMesh(upperNeckPost);
  headPitchGroup.add(upperNeckPost);

  // =========================================================================
  // 4. 6-BARREL GATLING CANNON ASSEMBLY (MODULE 01)
  // =========================================================================
  const cannonPitchGroup = new THREE.Group();
  cannonPitchGroup.position.set(0, 0.92, 0);
  headPitchGroup.add(cannonPitchGroup);

  const cannonRecoilGroup = new THREE.Group();
  cannonPitchGroup.add(cannonRecoilGroup);

  // Main Weathered Orange Rotary Drum Housing (aligned along Z axis)
  const drumLength = 0.78;
  const drumRadius = 0.34;
  const drumGeo = new THREE.CylinderGeometry(drumRadius, drumRadius * 0.96, drumLength, 32);
  drumGeo.rotateX(Math.PI / 2);
  const drumMesh = new THREE.Mesh(drumGeo, materials.weatheredOrange);
  drumMesh.position.set(0, 0, -0.14);
  decorateMesh(drumMesh);
  cannonRecoilGroup.add(drumMesh);

  // Black Structural Bands around the Orange Drum Housing
  const bandPositionsZ = [-0.48, -0.12, 0.21];
  bandPositionsZ.forEach((bz, idx) => {
    const r = idx === 0 ? drumRadius * 0.97 : drumRadius * 1.015;
    const bandGeo = new THREE.CylinderGeometry(r, r, 0.055, 32);
    bandGeo.rotateX(Math.PI / 2);
    const bandMesh = new THREE.Mesh(bandGeo, materials.gunmetalDark);
    bandMesh.position.set(0, 0, bz);
    decorateMesh(bandMesh);
    cannonRecoilGroup.add(bandMesh);
    if (idx === 0) {
      registerExplodable(bandMesh, 0, 0, -0.28);
    } else if (idx === 2) {
      registerExplodable(bandMesh, 0, 0, 0.22);
    }
  });

  // Rear Breech Cap Plate
  const breechCapGeo = new THREE.CylinderGeometry(drumRadius * 0.9, drumRadius * 0.84, 0.08, 28);
  breechCapGeo.rotateX(Math.PI / 2);
  const breechCap = new THREE.Mesh(breechCapGeo, materials.gunmetalDark);
  breechCap.position.set(0, 0, -0.54);
  decorateMesh(breechCap);
  cannonRecoilGroup.add(breechCap);
  registerExplodable(breechCap, 0, 0, -0.45);

  // Front Drum Shield Plate
  const frontShieldGeo = new THREE.CylinderGeometry(drumRadius * 0.92, drumRadius * 0.92, 0.07, 28);
  frontShieldGeo.rotateX(Math.PI / 2);
  const frontShield = new THREE.Mesh(frontShieldGeo, materials.gunmetalDark);
  frontShield.position.set(0, 0, 0.26);
  decorateMesh(frontShield);
  cannonRecoilGroup.add(frontShield);
  registerExplodable(frontShield, 0, 0, 0.28);

  // Side Circular Drum Bosses on Left & Right of Orange Drum
  for (const sideX of [-1, 1]) {
    const sideBossGroup = new THREE.Group();
    sideBossGroup.position.set(sideX * 0.33, 0, -0.05);
    cannonRecoilGroup.add(sideBossGroup);
    registerExplodable(sideBossGroup, sideX * 0.28, 0, 0);

    const bossCylGeo = new THREE.CylinderGeometry(0.145, 0.155, 0.1, 24);
    bossCylGeo.rotateZ(Math.PI / 2);
    const bossCyl = new THREE.Mesh(bossCylGeo, materials.gunmetalDark);
    decorateMesh(bossCyl);
    sideBossGroup.add(bossCyl);

    const bossInnerGeo = new THREE.TorusGeometry(0.085, 0.022, 10, 20);
    bossInnerGeo.rotateY(Math.PI / 2);
    const bossInner = new THREE.Mesh(bossInnerGeo, materials.gunmetalMid);
    bossInner.position.set(sideX * 0.045, 0, 0);
    decorateMesh(bossInner);
    sideBossGroup.add(bossInner);
  }

  // Top Angled Heavy Carry Handle on Drum Housing
  const handleGroup = new THREE.Group();
  handleGroup.position.set(0, 0.39, -0.04);
  cannonRecoilGroup.add(handleGroup);
  registerExplodable(handleGroup, 0, 0.36, 0);

  const handleTopGeo = new THREE.BoxGeometry(0.12, 0.048, 0.42);
  const handleTop = new THREE.Mesh(handleTopGeo, materials.gunmetalDark);
  handleTop.position.set(0, 0.08, 0);
  decorateMesh(handleTop);
  handleGroup.add(handleTop);

  const handleFrontPostGeo = new THREE.BoxGeometry(0.11, 0.14, 0.055);
  const handleFrontPost = new THREE.Mesh(handleFrontPostGeo, materials.gunmetalDark);
  handleFrontPost.position.set(0, 0.01, 0.17);
  handleFrontPost.rotation.x = -0.28;
  decorateMesh(handleFrontPost);
  handleGroup.add(handleFrontPost);

  const handleRearPost = new THREE.Mesh(handleFrontPostGeo, materials.gunmetalDark);
  handleRearPost.position.set(0, 0.01, -0.17);
  handleRearPost.rotation.x = 0.28;
  decorateMesh(handleRearPost);
  handleGroup.add(handleRearPost);

  // Rotating 6×28mm Barrel Cluster
  const barrelRotorGroup = new THREE.Group();
  barrelRotorGroup.position.set(0, 0, 0.28);
  cannonRecoilGroup.add(barrelRotorGroup);
  registerExplodable(barrelRotorGroup, 0, 0, 0.62);

  const barrelTotalLen = 0.96;
  const barrelRingRadius = 0.145;

  // Central Rotor Core Shaft
  const coreShaftGeo = new THREE.CylinderGeometry(0.048, 0.048, barrelTotalLen * 0.92, 16);
  coreShaftGeo.rotateX(Math.PI / 2);
  const coreShaft = new THREE.Mesh(coreShaftGeo, materials.hydraulicSteel);
  coreShaft.position.set(0, 0, barrelTotalLen * 0.45);
  decorateMesh(coreShaft);
  barrelRotorGroup.add(coreShaft);

  // 6 Individual Barrels (Rear Gunmetal Half + Front Thermal-Emissive Half)
  for (let b = 0; b < 6; b++) {
    const bAngle = (b * Math.PI) / 3;
    const bx = Math.cos(bAngle) * barrelRingRadius;
    const by = Math.sin(bAngle) * barrelRingRadius;

    // Rear half of barrel
    const rearBarrelGeo = new THREE.CylinderGeometry(0.038, 0.04, barrelTotalLen * 0.48, 16);
    rearBarrelGeo.rotateX(Math.PI / 2);
    const rearBarrel = new THREE.Mesh(rearBarrelGeo, materials.gunmetalDark);
    rearBarrel.position.set(bx, by, barrelTotalLen * 0.24);
    decorateMesh(rearBarrel);
    barrelRotorGroup.add(rearBarrel);

    // Front half of barrel (heats up dynamically during firing)
    const thermalMat = new THREE.MeshStandardMaterial({
      map: materials.gunmetalDark.map,
      roughnessMap: materials.gunmetalDark.roughnessMap,
      bumpMap: materials.gunmetalDark.bumpMap,
      bumpScale: 0.007,
      metalness: 0.42,
      roughness: 0.48,
    });
    thermalBarrelMaterials.push(thermalMat);

    const frontBarrelGeo = new THREE.CylinderGeometry(0.038, 0.038, barrelTotalLen * 0.52, 16);
    frontBarrelGeo.rotateX(Math.PI / 2);
    const frontBarrel = new THREE.Mesh(frontBarrelGeo, thermalMat);
    frontBarrel.position.set(bx, by, barrelTotalLen * 0.74);
    decorateMesh(frontBarrel);
    barrelRotorGroup.add(frontBarrel);

    // Muzzle Nozzle Tip Collar
    const nozzleTipGeo = new THREE.CylinderGeometry(0.045, 0.042, 0.08, 16);
    nozzleTipGeo.rotateX(Math.PI / 2);
    const nozzleTip = new THREE.Mesh(nozzleTipGeo, thermalMat);
    nozzleTip.position.set(bx, by, barrelTotalLen * 0.98);
    decorateMesh(nozzleTip);
    barrelRotorGroup.add(nozzleTip);

    // Bore Hole Dark Interior
    const boreGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.02, 12);
    boreGeo.rotateX(Math.PI / 2);
    const boreMat = new THREE.MeshBasicMaterial({ color: 0x090909 });
    const boreMesh = new THREE.Mesh(boreGeo, boreMat);
    boreMesh.position.set(bx, by, barrelTotalLen * 1.021);
    barrelRotorGroup.add(boreMesh);
  }

  // Barrel Support Clamps (Mid & Dual Muzzle Disks)
  const clampZPositions = [0.42, 0.78, 0.86];
  clampZPositions.forEach((cz, cIdx) => {
    const clampMat = cIdx >= 1 ? thermalBarrelMaterials[0] : materials.gunmetalDark;
    const clampGeo = new THREE.CylinderGeometry(0.205, 0.205, cIdx === 1 ? 0.065 : 0.048, 24);
    clampGeo.rotateX(Math.PI / 2);
    const clampMesh = new THREE.Mesh(clampGeo, clampMat);
    clampMesh.position.set(0, 0, cz);
    decorateMesh(clampMesh);
    barrelRotorGroup.add(clampMesh);
  });

  // =========================================================================
  // 5. MUZZLE FLASH & TRACER BEAM GROUP
  // =========================================================================
  const muzzleFlashGroup = new THREE.Group();
  muzzleFlashGroup.position.set(0, 0.145, 0.28 + barrelTotalLen * 1.04);
  muzzleFlashGroup.visible = false;
  cannonRecoilGroup.add(muzzleFlashGroup);

  // Starburst Flash Cones
  for (let s = 0; s < 5; s++) {
    const spikeGeo = new THREE.ConeGeometry(0.045, 0.42, 6);
    spikeGeo.translate(0, 0.21, 0);
    spikeGeo.rotateX(Math.PI / 2);
    const spike = new THREE.Mesh(spikeGeo, materials.muzzleFlash);
    spike.rotation.z = (s * Math.PI * 2) / 5;
    spike.rotation.y = (s % 2 === 0 ? 1 : -1) * 0.24;
    muzzleFlashGroup.add(spike);
  }

  // High-Velocity Tracer Beam
  const tracerMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xfff5eb),
    transparent: true,
    opacity: 0.78,
  });
  const tracerGeo = new THREE.CylinderGeometry(0.012, 0.028, 3.6, 8);
  tracerGeo.translate(0, 1.8, 0);
  tracerGeo.rotateX(Math.PI / 2);
  const tracerBeam = new THREE.Mesh(tracerGeo, tracerMat);
  muzzleFlashGroup.add(tracerBeam);

  // =========================================================================
  // 6. EJECTED BRASS SHELL CASINGS POOL
  // =========================================================================
  const casingsGroup = new THREE.Group();
  root.add(casingsGroup);

  const casingGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.095, 10);
  const casingsPool: EjectedCasing[] = [];
  for (let c = 0; c < 36; c++) {
    const cMesh = new THREE.Mesh(casingGeo, materials.brassCasing);
    cMesh.visible = false;
    cMesh.castShadow = true;
    casingsGroup.add(cMesh);
    casingsPool.push({
      mesh: cMesh,
      active: false,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      age: 0,
    });
  }

  let nextCasingIdx = 0;
  function spawnCasing() {
    const item = casingsPool[nextCasingIdx];
    nextCasingIdx = (nextCasingIdx + 1) % casingsPool.length;

    // Compute world position of cannon breech ejection port
    const ejectLocal = new THREE.Vector3(-0.24, 0.16, -0.18);
    cannonRecoilGroup.localToWorld(ejectLocal);
    root.worldToLocal(ejectLocal);

    item.mesh.position.copy(ejectLocal);
    item.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Eject upward and sideways relative to head yaw
    const yaw = headYawGroup.rotation.y;
    const lateralSpeed = -1.6 - Math.random() * 1.3;
    const backSpeed = -0.6 - Math.random() * 0.9;
    const vx = Math.cos(yaw) * lateralSpeed + Math.sin(yaw) * backSpeed;
    const vz = -Math.sin(yaw) * lateralSpeed + Math.cos(yaw) * backSpeed;

    item.velocity.set(vx, 2.2 + Math.random() * 1.4, vz);
    item.angularVelocity.set(
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 22
    );
    item.age = 0;
    item.active = true;
    item.mesh.visible = true;
  }

  function setWireframe(enabled: boolean) {
    for (const line of wireframeLines) {
      line.visible = enabled;
    }
    for (const entry of standardMeshes) {
      entry.mesh.material = enabled ? wireSolidMat : entry.baseMaterial;
    }
  }

  function setExplodeFactor(factor: number) {
    const clamped = Math.max(0, Math.min(1, factor));
    for (const part of explodableParts) {
      part.object.position.lerpVectors(
        part.restPos,
        part.restPos.clone().add(part.explodeDelta),
        clamped
      );
    }
  }

  function updateThermalGlow(tempCelsius: number) {
    // Map 28°C .. 788°C to 0 .. 1
    const heatNorm = Math.max(0, Math.min(1, (tempCelsius - 28) / (788 - 28)));
    for (const mat of thermalBarrelMaterials) {
      if (heatNorm > 0.03) {
        const glowColor = new THREE.Color().setHSL(
          0.04 + heatNorm * 0.045,
          0.96,
          0.25 + heatNorm * 0.35
        );
        mat.color.lerpColors(new THREE.Color(0x282a2e), new THREE.Color(0xff9b38), heatNorm * 0.85);
        mat.emissive.copy(glowColor);
        mat.emissiveIntensity = heatNorm * 1.45;
      } else {
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  }

  return {
    root,
    pelvisGroup,
    headYawGroup,
    headPitchGroup,
    cannonPitchGroup,
    cannonRecoilGroup,
    barrelRotorGroup,
    muzzleFlashGroup,
    casingsGroup,
    limbs: limbsList as [LimbRig, LimbRig, LimbRig, LimbRig],
    explodableParts,
    wireframeLines,
    standardMeshes,
    thermalBarrelMaterials,
    materials,
    casingsPool,
    spawnCasing,
    setWireframe,
    setExplodeFactor,
    updateThermalGlow,
  };
}

export function applyLimbKinematics(rig: SpiderTurretRig, limbsState: [LimbKinematics, LimbKinematics, LimbKinematics, LimbKinematics]) {
  for (let i = 0; i < 4; i++) {
    const limb = rig.limbs[i];
    const state = limbsState[i];
    limb.coxaPivot.rotation.y = state.coxaYaw;
    limb.femurPivot.rotation.x = state.femurPitch;
    limb.tibiaPivot.rotation.x = state.tibiaPitch;
  }
}
