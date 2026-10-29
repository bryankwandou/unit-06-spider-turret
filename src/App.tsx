import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  CameraPreset,
  LimbKinematics,
  OrthoView,
  PostureMode,
  SubAssemblyId,
  TurretTelemetry,
} from './types/turret';
import {
  applyLimbKinematics,
  buildSpiderTurretRig,
  SpiderTurretRig,
} from './three/spiderTurretModel';
import { ReticleOverlay } from './components/ReticleOverlay';
import { TopLeftHeader, TopRightCameraBar } from './components/TopBar';
import { KinematicsPanel } from './components/KinematicsPanel';
import { OrthoStrip } from './components/OrthoStrip';
import { CadBlueprintsPanel } from './components/CadBlueprintsPanel';
import { ControlDock } from './components/ControlDock';

const INITIAL_LIMB: LimbKinematics = {
  coxaYaw: 0,
  femurPitch: -0.34,
  tibiaPitch: 0.34,
  footStrike: 1,
};

function getCameraSphericalForPreset(preset: CameraPreset): {
  theta: number;
  phi: number;
  radius: number;
  targetY: number;
} {
  switch (preset) {
    case '3/4 STUDIO':
      return { theta: -Math.PI * 0.34, phi: 1.36, radius: 7.15, targetY: 1.32 };
    case 'FRONT':
      return { theta: 0, phi: 1.44, radius: 6.85, targetY: 1.32 };
    case 'SIDE':
      return { theta: -Math.PI * 0.5, phi: 1.44, radius: 6.85, targetY: 1.32 };
    case 'REAR':
      return { theta: Math.PI, phi: 1.44, radius: 6.85, targetY: 1.32 };
    case 'LOW':
      return { theta: -0.16, phi: 1.72, radius: 5.25, targetY: 1.3 };
    case 'TOP':
      return { theta: 0, phi: 0.22, radius: 7.6, targetY: 1.25 };
  }
}

function computeUiScale(w: number, h: number): number {
  const scaleX = w / 1500;
  const scaleY = h / 880;
  return Math.max(0.38, Math.min(1.15, Math.min(scaleX, scaleY)));
}

export const App: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [uiScale, setUiScale] = useState<number>(() =>
    typeof window !== 'undefined' ? computeUiScale(window.innerWidth, window.innerHeight) : 1
  );

  const [posture, setPosture] = useState<PostureMode>('Stand');
  const [activeCamera, setActiveCamera] = useState<CameraPreset>('3/4 STUDIO');
  const [activeOrtho, setActiveOrtho] = useState<OrthoView>('SIDE');
  const [activeModule, setActiveModule] = useState<SubAssemblyId | null>(null);
  const [orbit360, setOrbit360] = useState<boolean>(true);
  const [liveControl, setLiveControl] = useState<boolean>(false);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [explode, setExplode] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<TurretTelemetry>({
    stateLabel: 'IDLE',
    postureBadge: 'STANDING',
    firedRounds: 0,
    activeJoints: 19,
    rotaryCadenceRpm: 0,
    barrelTempCelsius: 28,
    barrelThermalStatus: 'COLD',
    gimbalYawDeg: 0,
    gimbalPitchDeg: 0,
    clearanceMm: 560,
    rotorAngleRad: 0,
    bodyYawRad: 0,
    limbs: [
      { ...INITIAL_LIMB },
      { ...INITIAL_LIMB },
      { ...INITIAL_LIMB },
      { ...INITIAL_LIMB },
    ],
  });

  // Mutable simulation state accessed inside requestAnimationFrame
  const simRef = useRef({
    posture: 'Stand' as PostureMode,
    isFiring: false,
    wireframe: false,
    explode: false,
    explodeCurrent: 0,
    orbit360: true,
    liveControl: false,
    targetGimbalYawDeg: 0,
    targetGimbalPitchDeg: 0,
    currentGimbalYawDeg: 0,
    currentGimbalPitchDeg: 0,
    rotaryRpm: 0,
    barrelTemp: 28,
    firedRounds: 0,
    shotAccumulator: 0,
    rotorAngleRad: 0,
    gaitPhase: 0,
    bodyYawRad: 0,
    camTheta: -Math.PI * 0.34,
    camPhi: 1.36,
    camRadius: 7.15,
    camTargetY: 1.32,
    targetCamTheta: -Math.PI * 0.34,
    targetCamPhi: 1.36,
    targetCamRadius: 7.15,
    targetCamTargetY: 1.32,
    userOrbiting: false,
    draggedLimbIndex: null as number | null,
    manualLimbOffsets: [
      { femurDelta: 0, tibiaDelta: 0 },
      { femurDelta: 0, tibiaDelta: 0 },
      { femurDelta: 0, tibiaDelta: 0 },
      { femurDelta: 0, tibiaDelta: 0 },
    ],
    keysPressed: new Set<string>(),
  });

  const rigRef = useRef<SpiderTurretRig | null>(null);

  const handleSelectCamera = useCallback((preset: CameraPreset) => {
    setActiveCamera(preset);
    const sph = getCameraSphericalForPreset(preset);
    simRef.current.targetCamTheta = sph.theta;
    simRef.current.targetCamPhi = sph.phi;
    simRef.current.targetCamRadius = sph.radius;
    simRef.current.targetCamTargetY = sph.targetY;

    if (preset === 'SIDE' || preset === 'FRONT' || preset === 'REAR' || preset === 'TOP') {
      setActiveOrtho(preset);
    }
  }, []);

  const handleSelectOrtho = useCallback(
    (ortho: OrthoView) => {
      setActiveOrtho(ortho);
      handleSelectCamera(ortho);
    },
    [handleSelectCamera]
  );

  const handleSelectModule = useCallback(
    (modId: SubAssemblyId) => {
      setActiveModule(modId);
      if (modId === '01') {
        handleSelectCamera('3/4 STUDIO');
      } else if (modId === '02') {
        handleSelectCamera('FRONT');
      } else if (modId === '03') {
        handleSelectCamera('REAR');
      }
    },
    [handleSelectCamera]
  );

  const handleSelectPosture = useCallback((mode: PostureMode) => {
    setPosture(mode);
    simRef.current.posture = mode;
    simRef.current.manualLimbOffsets.forEach((o) => {
      o.femurDelta = 0;
      o.tibiaDelta = 0;
    });
  }, []);

  const handleChangeGimbal = useCallback((yawDeg: number, pitchDeg: number) => {
    const clampedYaw = Math.max(-180, Math.min(180, yawDeg));
    const clampedPitch = Math.max(-45, Math.min(45, pitchDeg));
    simRef.current.targetGimbalYawDeg = clampedYaw;
    simRef.current.targetGimbalPitchDeg = clampedPitch;
  }, []);

  const handleToggleFire = useCallback(() => {
    setIsFiring((prev) => {
      const next = !prev;
      simRef.current.isFiring = next;
      return next;
    });
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setWireframe((prev) => {
      const next = !prev;
      simRef.current.wireframe = next;
      rigRef.current?.setWireframe(next);
      return next;
    });
  }, []);

  const handleToggleExplode = useCallback(() => {
    setExplode((prev) => {
      const next = !prev;
      simRef.current.explode = next;
      return next;
    });
  }, []);

  const handleToggleOrbit360 = useCallback(() => {
    setOrbit360((prev) => {
      const next = !prev;
      simRef.current.orbit360 = next;
      return next;
    });
  }, []);

  const handleToggleLiveControl = useCallback(() => {
    setLiveControl((prev) => {
      const next = !prev;
      simRef.current.liveControl = next;
      if (next) {
        simRef.current.orbit360 = false;
        setOrbit360(false);
      }
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => {
    setPosture('Stand');
    setIsFiring(false);
    setWireframe(false);
    setExplode(false);
    setActiveCamera('3/4 STUDIO');
    setActiveOrtho('SIDE');
    setActiveModule(null);
    setOrbit360(true);
    setLiveControl(false);

    const s = simRef.current;
    s.posture = 'Stand';
    s.isFiring = false;
    s.wireframe = false;
    s.explode = false;
    s.orbit360 = true;
    s.liveControl = false;
    s.targetGimbalYawDeg = 0;
    s.targetGimbalPitchDeg = 0;
    s.bodyYawRad = 0;
    s.manualLimbOffsets.forEach((o) => {
      o.femurDelta = 0;
      o.tibiaDelta = 0;
    });
    const sph = getCameraSphericalForPreset('3/4 STUDIO');
    s.targetCamTheta = sph.theta;
    s.targetCamPhi = sph.phi;
    s.targetCamRadius = sph.radius;
    s.targetCamTargetY = sph.targetY;
    rigRef.current?.setWireframe(false);
  }, []);

  // Keyboard Listeners for LIVE CONTROL
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      simRef.current.keysPressed.add(key);
      if (simRef.current.liveControl && e.code === 'Space') {
        e.preventDefault();
        simRef.current.isFiring = true;
        setIsFiring(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      simRef.current.keysPressed.delete(key);
      if (simRef.current.liveControl && e.code === 'Space') {
        e.preventDefault();
        simRef.current.isFiring = false;
        setIsFiring(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main Three.js Studio Scene Setup & Animation Loop
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xfffaf2, 0xd8cfc2, 1.35);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff9ee, 2.2);
    keyLight.position.set(5.5, 9.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeef4ff, 0.95);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffdcb8, 1.1);
    rimLight.position.set(0, 6, -7);
    scene.add(rimLight);

    // Subtle Ground Shadow Catcher Plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(16, 16);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.11 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.position.y = 0.02;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Build Articulated Spider Turret Rig
    const turretRig = buildSpiderTurretRig();
    rigRef.current = turretRig;
    scene.add(turretRig.root);

    // Raycaster for Interactive Leg Dragging & Viewport Orbiting
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let prevPointerX = 0;
    let prevPointerY = 0;

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObjects(turretRig.pelvisGroup.children, true);

      let hitLimbIdx: number | null = null;
      for (const hit of intersects) {
        if (typeof hit.object.userData.limbIndex === 'number') {
          hitLimbIdx = hit.object.userData.limbIndex;
          break;
        }
      }

      if (hitLimbIdx !== null) {
        simRef.current.draggedLimbIndex = hitLimbIdx;
      } else {
        simRef.current.userOrbiting = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      const s = simRef.current;

      if (s.liveControl && !s.userOrbiting && s.draggedLimbIndex === null) {
        const rect = renderer.domElement.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        s.targetGimbalYawDeg = Math.round(nx * 165);
        s.targetGimbalPitchDeg = Math.round(ny * 40);
      }

      if (s.draggedLimbIndex !== null) {
        const offset = s.manualLimbOffsets[s.draggedLimbIndex];
        offset.femurDelta = Math.max(-0.55, Math.min(0.45, offset.femurDelta - dy * 0.005));
        offset.tibiaDelta = Math.max(-0.45, Math.min(0.55, offset.tibiaDelta + dx * 0.005));
        return;
      }

      if (s.userOrbiting) {
        s.targetCamTheta -= dx * 0.0075;
        s.targetCamPhi = Math.max(0.25, Math.min(1.82, s.targetCamPhi - dy * 0.0065));
        s.camTheta = s.targetCamTheta;
        s.camPhi = s.targetCamPhi;
      }
    };

    const onPointerUp = () => {
      simRef.current.userOrbiting = false;
      simRef.current.draggedLimbIndex = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      simRef.current.targetCamRadius = Math.max(
        2.9,
        Math.min(8.2, simRef.current.targetCamRadius + e.deltaY * 0.0028)
      );
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setUiScale(computeUiScale(w, h));
    };
    window.addEventListener('resize', onResize);
    onResize();

    // High-Precision Simulation Loop
    let lastTime = performance.now();
    let uiTimer = 0;
    let reqId = 0;

    const animate = (now: number) => {
      reqId = requestAnimationFrame(animate);
      const rawDt = (now - lastTime) / 1000;
      const dt = rawDt > 0 ? Math.min(0.05, rawDt) : 0.016;
      lastTime = now;

      const s = simRef.current;

      // 1. Live Control Keyboard Override
      let effectivePosture = s.posture;
      if (s.liveControl) {
        const keys = s.keysPressed;
        const shift = keys.has('shift');
        if (keys.has('w') || keys.has('arrowup')) {
          effectivePosture = shift ? 'Sprint' : 'Fast Walk';
        } else if (keys.has('s') || keys.has('arrowdown')) {
          effectivePosture = 'Fast Reverse';
        } else if (
          keys.has('a') ||
          keys.has('d') ||
          keys.has('arrowleft') ||
          keys.has('arrowright')
        ) {
          effectivePosture = 'Turn';
        } else {
          effectivePosture = 'Stand';
        }
      }

      // 2. Smooth Explode Factor Interpolation
      const targetExplode = s.explode ? 1 : 0;
      s.explodeCurrent += (targetExplode - s.explodeCurrent) * Math.min(1, dt * 7.5);
      turretRig.setExplodeFactor(s.explodeCurrent);

      // 3. Gimbal Aim Smoothing
      s.currentGimbalYawDeg +=
        (s.targetGimbalYawDeg - s.currentGimbalYawDeg) * Math.min(1, dt * 10);
      s.currentGimbalPitchDeg +=
        (s.targetGimbalPitchDeg - s.currentGimbalPitchDeg) * Math.min(1, dt * 10);

      turretRig.headYawGroup.rotation.y = THREE.MathUtils.degToRad(s.currentGimbalYawDeg);
      const pitchRad = THREE.MathUtils.degToRad(s.currentGimbalPitchDeg);
      turretRig.headPitchGroup.rotation.x = -pitchRad * 0.45;
      turretRig.cannonPitchGroup.rotation.x = -pitchRad * 0.55;

      // 4. Rotary Gatling Cadence, Thermal Core, Muzzle Flash & Casings
      if (s.isFiring) {
        s.rotaryRpm += (334 - s.rotaryRpm) * Math.min(1, dt * 6.5);
        s.barrelTemp = Math.min(788, s.barrelTemp + dt * 155);
      } else {
        s.rotaryRpm = Math.max(0, s.rotaryRpm - dt * 210);
        s.barrelTemp = Math.max(28, s.barrelTemp - dt * 68);
      }

      const rps = s.rotaryRpm / 60;
      s.rotorAngleRad = (s.rotorAngleRad + rps * Math.PI * 2 * dt) % (Math.PI * 2);
      turretRig.barrelRotorGroup.rotation.z = s.rotorAngleRad;
      turretRig.updateThermalGlow(s.barrelTemp);

      if (s.isFiring && s.rotaryRpm > 80) {
        s.shotAccumulator += dt * 18;
        while (s.shotAccumulator >= 1) {
          s.shotAccumulator -= 1;
          s.firedRounds += 1;
          turretRig.spawnCasing();
        }
        const recoilKick = Math.sin(now * 0.085) * 0.032;
        turretRig.cannonRecoilGroup.position.z = -0.025 + recoilKick;
        turretRig.muzzleFlashGroup.visible = Math.sin(now * 0.12) > -0.25;
        turretRig.muzzleFlashGroup.rotation.z = now * 0.03;
      } else {
        turretRig.cannonRecoilGroup.position.z *= 0.8;
        turretRig.muzzleFlashGroup.visible = false;
      }

      // Update Ejected Brass Casings Physics
      for (const c of turretRig.casingsPool) {
        if (!c.active) continue;
        c.age += dt;
        c.velocity.y -= 9.8 * dt;
        c.mesh.position.addScaledVector(c.velocity, dt);
        c.mesh.rotation.x += c.angularVelocity.x * dt;
        c.mesh.rotation.y += c.angularVelocity.y * dt;
        c.mesh.rotation.z += c.angularVelocity.z * dt;

        if (c.mesh.position.y < 0.04) {
          c.mesh.position.y = 0.04;
          c.velocity.y = Math.abs(c.velocity.y) * 0.35;
          c.velocity.x *= 0.65;
          c.velocity.z *= 0.65;
        }
        if (c.age > 2.2) {
          c.active = false;
          c.mesh.visible = false;
        }
      }

      // 5. 4-Limb Inverse/Forward Gait Kinematics
      let gaitSpeed = 0;
      let strideYawAmp = 0;
      let liftPitchAmp = 0;
      let basePelvisY = 1.05;
      let baseFemurPitch = -0.34;
      let baseTibiaPitch = 0.34;
      let stateLabel = 'IDLE';
      let postureBadge = 'STANDING';

      switch (effectivePosture) {
        case 'Stand':
          gaitSpeed = 1.2;
          strideYawAmp = 0;
          liftPitchAmp = 0.012;
          basePelvisY = 1.05;
          stateLabel = 'IDLE';
          postureBadge = 'STANDING';
          break;
        case 'Walk':
          gaitSpeed = 4.6;
          strideYawAmp = 0.22;
          liftPitchAmp = 0.22;
          basePelvisY = 1.01;
          stateLabel = 'WALK';
          postureBadge = 'WALKING';
          break;
        case 'Fast Walk':
          gaitSpeed = 7.2;
          strideYawAmp = 0.28;
          liftPitchAmp = 0.28;
          basePelvisY = 0.99;
          stateLabel = 'FAST WALK';
          postureBadge = 'FAST WALK';
          break;
        case 'Fast Reverse':
          gaitSpeed = -7.2;
          strideYawAmp = 0.28;
          liftPitchAmp = 0.28;
          basePelvisY = 0.99;
          stateLabel = 'FAST REVERSE';
          postureBadge = 'FAST REVERSE';
          break;
        case 'Sprint':
          gaitSpeed = 11.4;
          strideYawAmp = 0.36;
          liftPitchAmp = 0.36;
          basePelvisY = 0.96;
          stateLabel = 'SPRINT';
          postureBadge = 'SPRINTING';
          break;
        case 'Turn':
          gaitSpeed = 6.4;
          strideYawAmp = 0.26;
          liftPitchAmp = 0.24;
          basePelvisY = 1.01;
          s.bodyYawRad += dt * 0.95;
          stateLabel = 'TURN';
          postureBadge = 'TURNING';
          break;
        case 'Sit':
          gaitSpeed = 0.8;
          strideYawAmp = 0;
          liftPitchAmp = 0.005;
          basePelvisY = 0.72;
          baseFemurPitch = -0.68;
          baseTibiaPitch = 0.68;
          stateLabel = 'SIT';
          postureBadge = 'SEATED';
          break;
      }

      s.gaitPhase += dt * gaitSpeed;

      const phaseOffsets = [0, Math.PI, 0, Math.PI];
      const computedLimbs: [LimbKinematics, LimbKinematics, LimbKinematics, LimbKinematics] = [
        { ...INITIAL_LIMB },
        { ...INITIAL_LIMB },
        { ...INITIAL_LIMB },
        { ...INITIAL_LIMB },
      ];

      let avgLift = 0;
      for (let i = 0; i < 4; i++) {
        const ph = s.gaitPhase + phaseOffsets[i];
        const sinPh = Math.sin(ph);
        const cosPh = Math.cos(ph);

        const sideSign = effectivePosture === 'Turn' ? 1 : i === 0 || i === 1 ? 1 : -1;
        const coxaYaw = cosPh * strideYawAmp * sideSign;
        const stepLift = Math.max(0, sinPh) * liftPitchAmp;

        const manual = s.manualLimbOffsets[i];
        const femurPitch = baseFemurPitch - stepLift + manual.femurDelta;
        const tibiaPitch = baseTibiaPitch + stepLift * 0.85 + manual.tibiaDelta;
        const footStrike = Math.max(0, Math.min(1, 1 - Math.max(0, sinPh) * 0.9));

        computedLimbs[i] = {
          coxaYaw,
          femurPitch,
          tibiaPitch,
          footStrike,
        };
        avgLift += Math.abs(manual.femurDelta) * 55 + stepLift * 28;
      }

      applyLimbKinematics(turretRig, computedLimbs);

      const bobOffset =
        effectivePosture === 'Stand' || effectivePosture === 'Sit'
          ? Math.sin(s.gaitPhase) * 0.006
          : Math.abs(Math.sin(s.gaitPhase)) * 0.032;

      const currentPelvisY = basePelvisY + bobOffset;
      turretRig.pelvisGroup.position.y = currentPelvisY;
      turretRig.pelvisGroup.rotation.y = s.bodyYawRad;
      turretRig.headYawGroup.position.y = currentPelvisY + 0.43;

      // 6. Camera Orbit & Preset Smoothing
      if (s.orbit360 && !s.userOrbiting && s.draggedLimbIndex === null) {
        s.targetCamTheta += dt * 0.16;
      }

      s.camTheta += (s.targetCamTheta - s.camTheta) * Math.min(1, dt * 7);
      s.camPhi += (s.targetCamPhi - s.camPhi) * Math.min(1, dt * 7);
      s.camRadius += (s.targetCamRadius - s.camRadius) * Math.min(1, dt * 7);
      s.camTargetY += (s.targetCamTargetY - s.camTargetY) * Math.min(1, dt * 7);

      const camX = s.camRadius * Math.sin(s.camPhi) * Math.sin(s.camTheta);
      const camY = s.camTargetY + s.camRadius * Math.cos(s.camPhi);
      const camZ = s.camRadius * Math.sin(s.camPhi) * Math.cos(s.camTheta);

      camera.position.set(camX, Math.max(0.25, camY), camZ);
      camera.lookAt(0, s.camTargetY, 0);

      renderer.render(scene, camera);

      // 7. Throttled Telemetry State Sync (~20 Hz)
      uiTimer += dt;
      if (uiTimer >= 0.048) {
        uiTimer = 0;
        const clearanceMm = Math.round((currentPelvisY / 1.05) * 560 - avgLift);
        const thermalStatus: 'COLD' | 'WARM' | 'HOT' =
          s.barrelTemp > 480 ? 'HOT' : s.barrelTemp > 140 ? 'WARM' : 'COLD';

        setTelemetry({
          stateLabel,
          postureBadge,
          firedRounds: s.firedRounds,
          activeJoints: 19,
          rotaryCadenceRpm: Math.round(s.rotaryRpm),
          barrelTempCelsius: Math.round(s.barrelTemp),
          barrelThermalStatus: thermalStatus,
          gimbalYawDeg: Math.round(s.currentGimbalYawDeg),
          gimbalPitchDeg: Math.round(s.currentGimbalPitchDeg),
          clearanceMm,
          rotorAngleRad: s.rotorAngleRad,
          bodyYawRad: s.bodyYawRad,
          limbs: computedLimbs,
        });
      }
    };

    reqId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(reqId);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <main
      className="studio-root"
      style={{ '--ui-scale': uiScale } as React.CSSProperties}
    >
      {/* Floor Technical Reticle Overlay */}
      <ReticleOverlay />

      {/* Interactive 3D WebGL Viewport */}
      <div
        ref={viewportRef}
        className="viewport-layer"
        aria-label="Interactive 3D Spider Turret Viewport"
      />

      {/* Left HUD Column (Header + Kinematics Panel + Ortho Strip) */}
      <div className="hud-left-column">
        <div className="hud-left-top-stack">
          <TopLeftHeader telemetry={telemetry} />
          <KinematicsPanel telemetry={telemetry} />
        </div>
        <OrthoStrip activeOrtho={activeOrtho} onSelectOrtho={handleSelectOrtho} />
      </div>

      {/* Right HUD Column (Camera Bar + DWG-06 Sub-Assembly CAD Blueprints) */}
      <div className="hud-right-column">
        <TopRightCameraBar
          activeCamera={activeCamera}
          orbit360={orbit360}
          liveControl={liveControl}
          onSelectCamera={handleSelectCamera}
          onToggleOrbit360={handleToggleOrbit360}
          onToggleLiveControl={handleToggleLiveControl}
        />
        <CadBlueprintsPanel
          telemetry={telemetry}
          activeModule={activeModule}
          onSelectModule={handleSelectModule}
        />
      </div>

      {/* Live Control Active Keyboard HUD Indicator */}
      {liveControl && (
        <div className="live-control-hud" role="status">
          <div>
            <span className="key-pill">WASD</span>LOCOMOTION
          </div>
          <div>
            <span className="key-pill">SHIFT</span>SPRINT
          </div>
          <div>
            <span className="key-pill">MOUSE</span>GIMBAL AIM
          </div>
          <div>
            <span className="key-pill">SPACE</span>FIRE GATLING
          </div>
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <ControlDock
        posture={posture}
        isFiring={isFiring}
        wireframe={wireframe}
        explode={explode}
        gimbalYawDeg={telemetry.gimbalYawDeg}
        gimbalPitchDeg={telemetry.gimbalPitchDeg}
        onSelectPosture={handleSelectPosture}
        onChangeGimbal={handleChangeGimbal}
        onToggleFire={handleToggleFire}
        onToggleWireframe={handleToggleWireframe}
        onToggleExplode={handleToggleExplode}
        onResetAll={handleResetAll}
      />
    </main>
  );
};
