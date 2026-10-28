import React from 'react';
import { CameraPreset, TurretTelemetry } from '../types/turret';

interface TopBarProps {
  telemetry: TurretTelemetry;
  activeCamera: CameraPreset;
  orbit360: boolean;
  liveControl: boolean;
  onSelectCamera: (preset: CameraPreset) => void;
  onToggleOrbit360: () => void;
  onToggleLiveControl: () => void;
}

const CAMERA_BUTTONS: CameraPreset[] = ['3/4 STUDIO', 'FRONT', 'SIDE', 'REAR', 'LOW'];

export const TopBar: React.FC<TopBarProps> = ({
  telemetry,
  activeCamera,
  orbit360,
  liveControl,
  onSelectCamera,
  onToggleOrbit360,
  onToggleLiveControl,
}) => {
  return (
    <>
      {/* Top-Left Title & Status Header */}
      <header className="top-left-header">
        <div className="header-kicker">
          <span className="status-dot" />
          <span>AUTONOMOUS SENTRY PLATFORM</span>
        </div>
        <h1 className="header-title">UNIT-06 SPIDER TURRET</h1>
        <div className="header-badges">
          <div className="header-pill">
            STATE: <span className="accent-value">{telemetry.stateLabel}</span>
          </div>
          <div className="header-pill">
            FIRED: <strong>{telemetry.firedRounds} RDS</strong>
          </div>
          <div className="header-pill">{telemetry.activeJoints} ACTIVE JOINTS</div>
        </div>
      </header>

      {/* Top-Right Camera & Mode Selector Bar */}
      <nav className="top-right-bar" aria-label="Camera presets and control modes">
        {CAMERA_BUTTONS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`cam-btn ${activeCamera === preset ? 'active-preset' : ''}`}
            onClick={() => onSelectCamera(preset)}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          className={`cam-btn ${orbit360 ? 'active-solid' : ''}`}
          onClick={onToggleOrbit360}
        >
          360° ORBIT
        </button>
        <button
          type="button"
          className={`cam-btn ${liveControl ? 'active-live' : ''}`}
          onClick={onToggleLiveControl}
        >
          LIVE CONTROL
        </button>
      </nav>
    </>
  );
};
