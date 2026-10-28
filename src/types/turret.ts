export type PostureMode =
  | 'Stand'
  | 'Walk'
  | 'Fast Walk'
  | 'Fast Reverse'
  | 'Sprint'
  | 'Turn'
  | 'Sit';

export type CameraPreset = '3/4 STUDIO' | 'FRONT' | 'SIDE' | 'REAR' | 'LOW' | 'TOP';

export type OrthoView = 'SIDE' | 'FRONT' | 'TOP' | 'REAR';

export type SubAssemblyId = '01' | '02' | '03';

export interface LimbKinematics {
  coxaYaw: number;
  femurPitch: number;
  tibiaPitch: number;
  footStrike: number; // 0 to 1 extension/ground contact factor
}

export interface TurretTelemetry {
  stateLabel: string; // IDLE, FAST WALK, FAST REVERSE, SPRINT, TURN, SIT
  postureBadge: string; // STANDING, FAST WALK, FAST REVERSE, SPRINTING, TURNING, SEATED
  firedRounds: number;
  activeJoints: number;
  rotaryCadenceRpm: number;
  barrelTempCelsius: number;
  barrelThermalStatus: 'COLD' | 'WARM' | 'HOT';
  gimbalYawDeg: number;
  gimbalPitchDeg: number;
  clearanceMm: number;
  rotorAngleRad: number;
  bodyYawRad: number;
  limbs: [LimbKinematics, LimbKinematics, LimbKinematics, LimbKinematics];
}
