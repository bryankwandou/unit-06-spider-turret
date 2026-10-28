# UNIT-06 SPIDER TURRET — Autonomous Sentry Platform

Interactive 3D kinematics, ballistics, and CAD sub-assembly studio for the UNIT-06 Spider Turret autonomous sentry platform.

## Capabilities

- **Articulated 19-Joint 3D Assembly**: Four inverse-kinematic spider limbs (coxa, dual I-beam femur, knee crest shield, tibia shin, and curved 2-pad pincer tarsus), central pelvis ring, spherical optics/exhaust head pod, and a 6-barrel 28mm rotary Gatling cannon.
- **Locomotion & Posture Gaits**: Real-time procedural gait synthesis for Stand, Walk, Fast Walk, Fast Reverse, Sprint, Turn, and Sit postures, plus direct interactive limb dragging in the 3D viewport.
- **Rotary Ballistics & Thermal Simulation**: 6-barrel rotary cadence up to 3,600 RPM, dynamic barrel core heating (`28°C COLD` to `788°C HOT`) with thermal emissive barrel glow, muzzle flash spikes, tracer beams, recoil kinematics, and physics-simulated brass shell casing ejection.
- **Synchronized DWG-06 Sub-Assembly CAD Blueprints**: Live technical line-art and shaded CAD viewports for Module 01 (6-Barrel Gatling Cannon), Module 02 (Spherical Head & Exhausts), and Module 03 (Articulated Spider Limb).
- **Inspection Modes**: Full red-orange edge Wireframe overlay, multi-axis 148-part Explode view, 2D Gimbal Aim controller (`HEAD 360°`), preset orthographic/studio cameras (`3/4 STUDIO`, `FRONT`, `SIDE`, `REAR`, `LOW`, `TOP`), `360° ORBIT`, and `LIVE CONTROL` (WASD/Arrows + Mouse Aim + Space Fire).

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```
