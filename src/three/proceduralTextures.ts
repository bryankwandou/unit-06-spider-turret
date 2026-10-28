import * as THREE from 'three';

export interface TurretMaterialSet {
  weatheredOrange: THREE.MeshStandardMaterial;
  gunmetalDark: THREE.MeshStandardMaterial;
  gunmetalMid: THREE.MeshStandardMaterial;
  hydraulicSteel: THREE.MeshStandardMaterial;
  brassCasing: THREE.MeshStandardMaterial;
  opticYellow: THREE.MeshStandardMaterial;
  muzzleFlash: THREE.MeshBasicMaterial;
  wireframeOverlay: THREE.LineBasicMaterial;
}

function pseudoNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.123) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, scale: number, seed: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const a = pseudoNoise(ix, iy, seed);
  const b = pseudoNoise(ix + 1, iy, seed);
  const c = pseudoNoise(ix, iy + 1, seed);
  const d = pseudoNoise(ix + 1, iy + 1, seed);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number, seed: number): number {
  let value = 0;
  let amp = 0.5;
  let scale = 64;
  for (let i = 0; i < 4; i++) {
    value += amp * smoothNoise(x, y, scale, seed + i * 17);
    scale *= 0.5;
    amp *= 0.5;
  }
  return value;
}

export function createWeatheredOrangeTextures(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const imgData = cCtx.createImageData(size, size);
  const rData = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n1 = fbm(x, y, 11);
      const n2 = fbm(x + 120, y + 85, 29);

      // Edge grime and soot patches matching the weathered studio look
      const sootFactor = Math.max(0, Math.min(1, (n1 - 0.52) * 3.2));
      const highlightFactor = Math.max(0, Math.min(1, (0.48 - n2) * 2.4));

      // Base industrial orange RGB(224, 82, 32) -> Soot RGB(42, 28, 22) -> Highlight RGB(246, 128, 52)
      let r = 224 * (1 - sootFactor) + 38 * sootFactor + highlightFactor * 22;
      let g = 82 * (1 - sootFactor) + 25 * sootFactor + highlightFactor * 36;
      let b = 32 * (1 - sootFactor) + 20 * sootFactor + highlightFactor * 16;

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;

      const roughVal = Math.floor(110 + sootFactor * 95 - highlightFactor * 25);
      rData.data[idx] = roughVal;
      rData.data[idx + 1] = roughVal;
      rData.data[idx + 2] = roughVal;
      rData.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(imgData, 0, 0);
  rCtx.putImageData(rData, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap, bumpMap: roughnessMap };
}

export function createGunmetalTextures(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const imgData = cCtx.createImageData(size, size);
  const rData = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 73);
      const n2 = fbm(x * 2.1 + 40, y * 2.1 + 19, 107);
      const scratch = pseudoNoise(x * 0.5, y * 4.0, 91) > 0.94 ? 36 : 0;

      // Charcoal gunmetal RGB(58, 61, 66) with weathered slate mottling
      const base = Math.floor(48 + n * 46 + n2 * 18 + scratch);
      imgData.data[idx] = Math.min(255, base);
      imgData.data[idx + 1] = Math.min(255, base + 2);
      imgData.data[idx + 2] = Math.min(255, base + 5);
      imgData.data[idx + 3] = 255;

      const rough = Math.floor(105 + (1 - n) * 75 - scratch * 1.2);
      rData.data[idx] = rough;
      rData.data[idx + 1] = rough;
      rData.data[idx + 2] = rough;
      rData.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(imgData, 0, 0);
  rCtx.putImageData(rData, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap };
}

let cachedOrangeTex: {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} | null = null;

let cachedGunmetalTex: {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null = null;

export function createTurretMaterials(): TurretMaterialSet {
  const orangeTex = cachedOrangeTex ?? (cachedOrangeTex = createWeatheredOrangeTextures());
  const gunmetalTex = cachedGunmetalTex ?? (cachedGunmetalTex = createGunmetalTextures());

  const weatheredOrange = new THREE.MeshStandardMaterial({
    map: orangeTex.map,
    roughnessMap: orangeTex.roughnessMap,
    bumpMap: orangeTex.bumpMap,
    bumpScale: 0.008,
    metalness: 0.32,
    roughness: 0.52,
  });

  const gunmetalDark = new THREE.MeshStandardMaterial({
    map: gunmetalTex.map,
    roughnessMap: gunmetalTex.roughnessMap,
    bumpMap: gunmetalTex.roughnessMap,
    bumpScale: 0.007,
    metalness: 0.42,
    roughness: 0.48,
  });

  const gunmetalMid = new THREE.MeshStandardMaterial({
    map: gunmetalTex.map,
    color: new THREE.Color(0x888d96),
    roughnessMap: gunmetalTex.roughnessMap,
    metalness: 0.48,
    roughness: 0.4,
  });

  const hydraulicSteel = new THREE.MeshStandardMaterial({
    map: gunmetalTex.map,
    color: new THREE.Color(0x787c84),
    metalness: 0.82,
    roughness: 0.28,
  });

  const brassCasing = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xd8a842),
    metalness: 0.88,
    roughness: 0.22,
  });

  const opticYellow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xeab308),
    emissive: new THREE.Color(0xca8a04),
    emissiveIntensity: 0.35,
    metalness: 0.4,
    roughness: 0.3,
  });

  const muzzleFlash = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff9233),
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  const wireframeOverlay = new THREE.LineBasicMaterial({
    color: new THREE.Color(0xd9381e),
    transparent: true,
    opacity: 0.85,
  });

  return {
    weatheredOrange,
    gunmetalDark,
    gunmetalMid,
    hydraulicSteel,
    brassCasing,
    opticYellow,
    muzzleFlash,
    wireframeOverlay,
  };
}
