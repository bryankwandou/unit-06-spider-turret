import React from 'react';
import { TurretTelemetry } from '../types/turret';

interface KinematicsPanelProps {
  telemetry: TurretTelemetry;
}

export function formatSignedDeg(val: number): string {
  const rounded = Math.round(val);
  if (rounded === 0) return '0°';
  return rounded > 0 ? `+${rounded}°` : `${rounded}°`;
}

export const KinematicsPanel: React.FC<KinematicsPanelProps> = ({ telemetry }) => {
  const yawRad = (telemetry.gimbalYawDeg * Math.PI) / 180;
  const needleLen = 28;
  const nx = 48 + Math.sin(yawRad) * needleLen;
  const ny = 48 - Math.cos(yawRad) * needleLen;

  const rotorDeg = (telemetry.rotorAngleRad * 180) / Math.PI;

  const diagonalAngles = [
    -Math.PI * 0.25, // NE
    Math.PI * 0.25,  // SE
    Math.PI * 0.75,  // SW
    -Math.PI * 0.75, // NW
  ];

  return (
    <aside className="kinematics-panel" aria-label="Kinematics and Rotor Telemetry">
      <div className="panel-header-row">
        <span className="panel-label">KINEMATICS &amp; ROTOR</span>
        <span className="posture-badge">{telemetry.postureBadge}</span>
      </div>

      <div className="gauges-grid">
        {/* Left Gauge: 4-LIMB GAIT & YAW */}
        <div className="gauge-card">
          <svg width="96" height="92" viewBox="0 0 96 96">
            {/* Dashed Outer Footprint Circle */}
            <circle
              cx="48"
              cy="48"
              r="34"
              fill="none"
              stroke="var(--color-outline-strong)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            {/* Cardinal Ticks */}
            <line x1="48" y1="10" x2="48" y2="16" stroke="var(--color-outline-strong)" strokeWidth="1.2" />
            <line x1="48" y1="80" x2="48" y2="86" stroke="var(--color-outline-strong)" strokeWidth="1.2" />
            <line x1="10" y1="48" x2="16" y2="48" stroke="var(--color-outline-strong)" strokeWidth="1.2" />
            <line x1="80" y1="48" x2="86" y2="48" stroke="var(--color-outline-strong)" strokeWidth="1.2" />

            {/* 4 Diagonal Limb Vectors */}
            {diagonalAngles.map((baseAngle, idx) => {
              const limb = telemetry.limbs[idx];
              const dynamicAngle = baseAngle + limb.coxaYaw * 0.65;
              const innerR = 9;
              const midR = 20 + limb.footStrike * 4;
              const outerR = 31;

              const x0 = 48 + Math.cos(dynamicAngle) * innerR;
              const y0 = 48 + Math.sin(dynamicAngle) * innerR;
              const x1 = 48 + Math.cos(dynamicAngle) * midR;
              const y1 = 48 + Math.sin(dynamicAngle) * midR;
              const x2 = 48 + Math.cos(dynamicAngle) * outerR;
              const y2 = 48 + Math.sin(dynamicAngle) * outerR;

              const isStance = limb.footStrike > 0.45;

              return (
                <g key={idx}>
                  {/* Base leg track */}
                  <line
                    x1={x0}
                    y1={y0}
                    x2={x2}
                    y2={y2}
                    stroke="var(--color-outline-strong)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Active femur/tibia vector */}
                  <line
                    x1={x0}
                    y1={y0}
                    x2={x1}
                    y2={y1}
                    stroke="var(--color-on-surface)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  {/* Active orange extension segment */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isStance ? 'var(--color-primary)' : 'var(--color-outline-strong)'}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  {/* Knee node */}
                  <circle cx={x1} cy={y1} r="2.2" fill="var(--color-on-surface)" />
                  {/* Foot contact pad */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={isStance ? '3' : '2.2'}
                    fill={isStance ? 'var(--color-primary)' : 'var(--color-outline-strong)'}
                  />
                </g>
              );
            })}

            {/* Gimbal Yaw Heading Line */}
            <line
              x1="48"
              y1="48"
              x2={nx}
              y2={ny}
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Central Pelvis Ring */}
            <circle
              cx="48"
              cy="48"
              r="9"
              fill="var(--color-surface-elevated)"
              stroke="var(--color-on-surface)"
              strokeWidth="2"
            />
          </svg>
          <span className="gauge-caption">4-LIMB GAIT &amp; YAW</span>
        </div>

        {/* Right Gauge: 6×28MM BORE ROTOR */}
        <div className="gauge-card">
          <svg width="96" height="92" viewBox="0 0 96 96">
            {/* Outer Breech Drum Ring */}
            <circle
              cx="48"
              cy="48"
              r="31"
              fill="none"
              stroke="var(--color-on-surface)"
              strokeWidth="1.8"
            />
            <circle
              cx="48"
              cy="48"
              r="28"
              fill="none"
              stroke="var(--color-outline)"
              strokeWidth="0.8"
            />

            {/* Rotating 6-Barrel Cluster */}
            <g transform={`rotate(${rotorDeg} 48 48)`}>
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const bx = 48 + Math.cos(rad) * 18.5;
                const by = 48 + Math.sin(rad) * 18.5;
                const isTopHot = telemetry.rotaryCadenceRpm > 0 && deg === 0;
                return (
                  <g key={deg}>
                    <circle
                      cx={bx}
                      cy={by}
                      r="6.2"
                      fill={isTopHot ? 'var(--color-primary-soft)' : 'none'}
                      stroke={isTopHot ? 'var(--color-primary)' : 'var(--color-on-surface)'}
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={bx}
                      cy={by}
                      r="2.3"
                      fill={isTopHot ? 'var(--color-primary)' : 'var(--color-on-surface)'}
                    />
                  </g>
                );
              })}
            </g>

            {/* Central Rotor Core */}
            <circle
              cx="48"
              cy="48"
              r="5.5"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.2"
            />
            <circle cx="48" cy="48" r="2" fill="var(--color-primary)" />
          </svg>
          <span className="gauge-caption">6×28MM BORE ROTOR</span>
        </div>
      </div>

      {/* 2x2 Telemetry Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{telemetry.rotaryCadenceRpm} RPM</div>
          <div className="metric-caption">ROTARY CADENCE</div>
        </div>
        <div className="metric-card">
          <div className="metric-value thermal">
            {Math.round(telemetry.barrelTempCelsius)}°C {telemetry.barrelThermalStatus}
          </div>
          <div className="metric-caption">BARREL CORE</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {telemetry.gimbalYawDeg === 0 && telemetry.gimbalPitchDeg === 0
              ? '0° / 0°'
              : `${formatSignedDeg(telemetry.gimbalYawDeg)} / ${formatSignedDeg(
                  telemetry.gimbalPitchDeg
                )}`}
          </div>
          <div className="metric-caption">GIMBAL AIM</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{Math.round(telemetry.clearanceMm)} mm</div>
          <div className="metric-caption">CLEARANCE</div>
        </div>
      </div>
    </aside>
  );
};
