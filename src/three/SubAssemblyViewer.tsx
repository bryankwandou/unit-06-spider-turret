import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LimbKinematics, SubAssemblyId } from '../types/turret';
import { buildSpiderTurretRig } from './spiderTurretModel';

interface SubAssemblyViewerProps {
  moduleId: SubAssemblyId;
  rotorAngleRad: number;
  gimbalYawDeg: number;
  gimbalPitchDeg: number;
  limbState: LimbKinematics;
}

function applyCadBlueprintStyle(root: THREE.Object3D, orangeMat: THREE.Material) {
  const cadPeachMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color(0xf0d2b8),
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const cadWhiteMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color(0xe6e3dc),
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const cadEdgeMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0x2c2926),
    transparent: true,
    opacity: 0.78,
  });

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const isOrange = mesh.material === orangeMat;
      mesh.material = isOrange ? cadPeachMat : cadWhiteMat;

      // Remove any existing wireframe children and attach CAD ink edges
      for (let i = mesh.children.length - 1; i >= 0; i--) {
        if ((mesh.children[i] as THREE.LineSegments).isLineSegments) {
          mesh.remove(mesh.children[i]);
        }
      }
      const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
      const line = new THREE.LineSegments(edges, cadEdgeMat);
      mesh.add(line);
    }
  });
}

export const SubAssemblyViewer: React.FC<SubAssemblyViewerProps> = ({
  moduleId,
  rotorAngleRad,
  gimbalYawDeg,
  gimbalPitchDeg,
  limbState,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    rotorAngleRad,
    gimbalYawDeg,
    gimbalPitchDeg,
    limbState,
  });

  stateRef.current = {
    rotorAngleRad,
    gimbalYawDeg,
    gimbalPitchDeg,
    limbState,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = container.offsetWidth || 280;
    const height = container.offsetHeight || 120;

    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 30);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3));
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfffaf0, 1.3);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const fullRig = buildSpiderTurretRig();
    const orangeRef = fullRig.materials.weatheredOrange;

    const subjectGroup = new THREE.Group();
    scene.add(subjectGroup);

    let barrelRotorRef: THREE.Group | null = null;
    let limbFemurRef: THREE.Group | null = null;
    let limbTibiaRef: THREE.Group | null = null;

    if (moduleId === '01') {
      // Module 01: 6-Barrel Gatling Cannon (side profile facing right, centered vertically)
      const cannonClone = fullRig.cannonRecoilGroup;
      cannonClone.parent?.remove(cannonClone);
      applyCadBlueprintStyle(cannonClone, orangeRef);
      cannonClone.position.set(-0.22, -0.02, 0);
      cannonClone.rotation.set(0.06, Math.PI * 0.52, 0);
      subjectGroup.add(cannonClone);
      barrelRotorRef = fullRig.barrelRotorGroup;
      camera.position.set(0, 0.04, 4.25);
      camera.lookAt(0, 0.02, 0);
    } else if (moduleId === '02') {
      // Module 02: Spherical Head & Exhausts (excluding cannon, centered vertically)
      const headClone = fullRig.headPitchGroup;
      headClone.remove(fullRig.cannonPitchGroup);
      headClone.parent?.remove(headClone);
      applyCadBlueprintStyle(headClone, orangeRef);
      headClone.position.set(0.05, -0.04, 0);
      headClone.rotation.set(0.12, Math.PI * 0.62, 0);
      subjectGroup.add(headClone);
      camera.position.set(0, 0.06, 3.15);
      camera.lookAt(0, 0.04, 0);
    } else {
      // Module 03: Articulated Spider Limb (centered in CAD frame)
      const singleLimb = fullRig.limbs[0].rootGroup;
      singleLimb.parent?.remove(singleLimb);
      singleLimb.rotation.set(0, -Math.PI * 0.5, 0);
      singleLimb.position.set(0.74, 0.25, 0);
      applyCadBlueprintStyle(singleLimb, orangeRef);
      subjectGroup.add(singleLimb);
      limbFemurRef = fullRig.limbs[0].femurPivot;
      limbTibiaRef = fullRig.limbs[0].tibiaPivot;
      camera.position.set(0, -0.03, 3.8);
      camera.lookAt(0, -0.05, 0);
    }

    // Allow interactive dragging inside the CAD blueprint card
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let userYawOffset = 0;
    let userPitchOffset = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      userYawOffset += dx * 0.01;
      userPitchOffset = Math.max(-0.5, Math.min(0.5, userPitchOffset + dy * 0.01));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const syncSize = () => {
      if (!container) return;
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    };

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    let reqId = 0;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const st = stateRef.current;

      if (moduleId === '01' && barrelRotorRef) {
        barrelRotorRef.rotation.z = st.rotorAngleRad;
        subjectGroup.rotation.y = userYawOffset;
        subjectGroup.rotation.x = userPitchOffset;
      } else if (moduleId === '02') {
        subjectGroup.rotation.y =
          userYawOffset + THREE.MathUtils.degToRad(st.gimbalYawDeg * 0.25);
        subjectGroup.rotation.x =
          userPitchOffset + THREE.MathUtils.degToRad(st.gimbalPitchDeg * 0.35);
      } else if (moduleId === '03' && limbFemurRef && limbTibiaRef) {
        limbFemurRef.rotation.x = st.limbState.femurPitch;
        limbTibiaRef.rotation.x = st.limbState.tibiaPitch;
        subjectGroup.rotation.y = userYawOffset;
        subjectGroup.rotation.x = userPitchOffset;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, [moduleId]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  );
};
