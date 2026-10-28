import React, { useRef } from 'react';
import {
  Crosshair,
  ChevronsRight,
  FastForward,
  RotateCw,
  ArrowDownToLine,
  Box,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { PostureMode } from '../types/turret';
import { formatSignedDeg } from './KinematicsPanel';

interface ControlDockProps {
  posture: PostureMode;
  isFiring: boolean;
  wireframe: boolean;
  explode: boolean;
  gimbalYawDeg: number;
  gimbalPitchDeg: number;
  onSelectPosture: (mode: PostureMode) => void;
  onChangeGimbal: (yawDeg: number, pitchDeg: number) => void;
  onToggleFire: () => void;
  onToggleWireframe: () => void;
  onToggleExplode: () => void;
  onResetAll: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  posture,
  isFiring,
  wireframe,
  explode,
  gimbalYawDeg,
  gimbalPitchDeg,
  onSelectPosture,
  onChangeGimbal,
  onToggleFire,
  onToggleWireframe,
  onToggleExplode,
  onResetAll,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);

  const handlePadPointer = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 3;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    const normX = dx / maxR; // -1 .. 1 -> -180° .. +180°
    const normY = -dy / maxR; // -1 .. 1 -> -45° .. +45°
    onChangeGimbal(Math.round(normX * 180), Math.round(normY * 45));
  };

  const onPadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePadPointer(e.clientX, e.clientY);
  };

  const onPadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handlePadPointer(e.clientX, e.clientY);
  };

  // Convert gimbalYawDeg (-180..180) and gimbalPitchDeg (-45..45) to percentage inside 34x34 pad
  const dotLeftPct = 50 + (gimbalYawDeg / 180) * 38;
  const dotTopPct = 50 - (gimbalPitchDeg / 45) * 38;

  const isWalkActive =
    posture === 'Walk' || posture === 'Fast Walk' || posture === 'Fast Reverse';

  return (
    <div className="control-dock" role="toolbar" aria-label="Turret Kinematics and Firing Controls">
      {/* Locomotion & Posture Group */}
      <div className="dock-group">
        <button
          type="button"
          className={`dock-btn ${posture === 'Stand' ? 'active-dark' : ''}`}
          onClick={() => onSelectPosture('Stand')}
        >
          <Crosshair size={13} />
          <span>Stand</span>
        </button>
        <button
          type="button"
          className={`dock-btn ${isWalkActive ? 'active-dark' : ''}`}
          onClick={() =>
            onSelectPosture(
              posture === 'Walk'
                ? 'Fast Walk'
                : posture === 'Fast Walk'
                ? 'Fast Reverse'
                : 'Walk'
            )
          }
          title="Cycle Walk / Fast Walk / Fast Reverse"
        >
          <ChevronsRight size={14} />
          <span>Walk</span>
        </button>
        <button
          type="button"
          className={`dock-btn ${posture === 'Sprint' ? 'active-dark' : ''}`}
          onClick={() => onSelectPosture('Sprint')}
        >
          <FastForward size={13} />
          <span>Sprint</span>
        </button>
        <button
          type="button"
          className={`dock-btn ${posture === 'Turn' ? 'active-dark' : ''}`}
          onClick={() => onSelectPosture('Turn')}
        >
          <RotateCw size={13} />
          <span>Turn</span>
        </button>
        <button
          type="button"
          className={`dock-btn ${posture === 'Sit' ? 'active-dark' : ''}`}
          onClick={() => onSelectPosture('Sit')}
        >
          <ArrowDownToLine size={13} />
          <span>Sit</span>
        </button>
      </div>

      <div className="dock-divider" />

      {/* Interactive 2D Head Gimbal Aim Pad */}
      <div className="gimbal-widget">
        <div
          ref={padRef}
          className="gimbal-pad"
          onPointerDown={onPadPointerDown}
          onPointerMove={onPadPointerMove}
          title="Drag to aim Head 360° Yaw and Pitch"
        >
          <span
            className="gimbal-dot"
            style={{ left: `${dotLeftPct}%`, top: `${dotTopPct}%` }}
          />
        </div>
        <div className="gimbal-info">
          <div className="gimbal-top-row">
            <span className="gimbal-title">HEAD 360°</span>
            <button
              type="button"
              className="gimbal-zero-btn"
              onClick={() => onChangeGimbal(0, 0)}
              title="Zero Gimbal Aim"
            >
              0°
            </button>
          </div>
          <div className="gimbal-coords">
            {gimbalYawDeg === 0 && gimbalPitchDeg === 0
              ? '0° / 0°'
              : `${formatSignedDeg(gimbalYawDeg)} / ${formatSignedDeg(gimbalPitchDeg)}`}
          </div>
        </div>
      </div>

      <div className="dock-divider" />

      {/* Primary Action: FIRE GATLING */}
      <button
        type="button"
        className={`dock-btn fire-btn ${isFiring ? 'firing' : ''}`}
        onClick={onToggleFire}
      >
        <Crosshair size={14} />
        <span>FIRE GATLING</span>
      </button>

      <div className="dock-divider" />

      {/* Inspection Mode Toggles: Wireframe, Explode, Reset */}
      <div className="dock-group">
        <button
          type="button"
          className={`dock-btn ${wireframe ? 'active-orange' : ''}`}
          onClick={onToggleWireframe}
        >
          <Box size={13} />
          <span>Wireframe</span>
        </button>
        <button
          type="button"
          className={`dock-btn ${explode ? 'active-orange' : ''}`}
          onClick={onToggleExplode}
        >
          <Maximize2 size={13} />
          <span>Explode</span>
        </button>
        <button
          type="button"
          className="dock-icon-btn"
          onClick={onResetAll}
          title="Reset All Kinematics & Views"
          aria-label="Reset All Kinematics and Views"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
