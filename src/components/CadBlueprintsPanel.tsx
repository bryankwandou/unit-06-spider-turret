import React from 'react';
import { SubAssemblyId, TurretTelemetry } from '../types/turret';
import { SubAssemblyViewer } from '../three/SubAssemblyViewer';
import { formatSignedDeg } from './KinematicsPanel';

interface CadBlueprintsPanelProps {
  telemetry: TurretTelemetry;
  activeModule: SubAssemblyId | null;
  onSelectModule: (id: SubAssemblyId) => void;
}

export const CadBlueprintsPanel: React.FC<CadBlueprintsPanelProps> = ({
  telemetry,
  activeModule,
  onSelectModule,
}) => {
  const gimbalLabel =
    telemetry.gimbalYawDeg === 0 && telemetry.gimbalPitchDeg === 0
      ? '0° / 0°'
      : `${formatSignedDeg(telemetry.gimbalYawDeg)} / ${formatSignedDeg(
          telemetry.gimbalPitchDeg
        )}`;

  return (
    <aside className="cad-panel" aria-label="DWG-06 Sub-Assembly CAD Blueprints">
      <div className="cad-panel-header">
        <div className="cad-panel-title-group">
          <span className="dwg-badge">DWG-06</span>
          <span className="cad-panel-title">SUB-ASSEMBLY CAD BLUEPRINTS</span>
        </div>
        <span className="modules-count-badge">3 MODULES</span>
      </div>

      {/* MODULE 01: 6-BARREL GATLING CANNON */}
      <div
        className={`cad-module-card ${activeModule === '01' ? 'active' : ''}`}
        onClick={() => onSelectModule('01')}
      >
        <div className="cad-module-top">
          <div className="cad-module-title-wrap">
            <span className="cad-idx accent">01</span>
            <span className="cad-module-name">6-BARREL GATLING CANNON</span>
          </div>
          <span className="cad-live-pill">{telemetry.rotaryCadenceRpm} RPM</span>
        </div>
        <div className="cad-canvas-box">
          <span className="crop-mark tl" />
          <span className="crop-mark tr" />
          <span className="crop-mark bl" />
          <span className="crop-mark br" />
          <SubAssemblyViewer
            moduleId="01"
            rotorAngleRad={telemetry.rotorAngleRad}
            gimbalYawDeg={telemetry.gimbalYawDeg}
            gimbalPitchDeg={telemetry.gimbalPitchDeg}
            limbState={telemetry.limbs[0]}
          />
        </div>
        <div className="cad-specs-footer">
          <div className="cad-spec-item">
            <span className="cad-spec-label">CALIBER</span>
            <span className="cad-spec-val">6× 28mm</span>
          </div>
          <div className="cad-spec-item">
            <span className="cad-spec-label">BREECH</span>
            <span className="cad-spec-val">ROTARY DRUM</span>
          </div>
          <div className="cad-spec-item">
            <span className="cad-spec-label">MAX FEED</span>
            <span className="cad-spec-val">3,600 RPM</span>
          </div>
        </div>
      </div>

      {/* MODULE 02: SPHERICAL HEAD & EXHAUSTS */}
      <div
        className={`cad-module-card ${activeModule === '02' ? 'active' : ''}`}
        onClick={() => onSelectModule('02')}
      >
        <div className="cad-module-top">
          <div className="cad-module-title-wrap">
            <span className="cad-idx">02</span>
            <span className="cad-module-name">SPHERICAL HEAD &amp; EXHAUSTS</span>
          </div>
          <span className="cad-live-pill">{gimbalLabel}</span>
        </div>
        <div className="cad-canvas-box">
          <span className="crop-mark tl" />
          <span className="crop-mark tr" />
          <span className="crop-mark bl" />
          <span className="crop-mark br" />
          <SubAssemblyViewer
            moduleId="02"
            rotorAngleRad={telemetry.rotorAngleRad}
            gimbalYawDeg={telemetry.gimbalYawDeg}
            gimbalPitchDeg={telemetry.gimbalPitchDeg}
            limbState={telemetry.limbs[0]}
          />
        </div>
        <div className="cad-specs-footer">
          <div className="cad-spec-item">
            <span className="cad-spec-label">OPTICS</span>
            <span className="cad-spec-val">T-VISOR + CAM</span>
          </div>
          <div className="cad-spec-item">
            <span className="cad-spec-label">MANIFOLD</span>
            <span className="cad-spec-val">6× EXHAUSTS</span>
          </div>
          <div className="cad-spec-item">
            <span className="cad-spec-label">GIMBAL</span>
            <span className="cad-spec-val">360° / +45°</span>
          </div>
        </div>
      </div>

      {/* MODULE 03: ARTICULATED SPIDER LIMB */}
      <div
        className={`cad-module-card ${activeModule === '03' ? 'active' : ''}`}
        onClick={() => onSelectModule('03')}
      >
        <div className="cad-module-top">
          <div className="cad-module-title-wrap">
            <span className="cad-idx">03</span>
            <span className="cad-module-name">ARTICULATED SPIDER LIMB</span>
          </div>
          <span className="cad-live-pill">{Math.round(telemetry.clearanceMm)} mm</span>
        </div>
        <div className="cad-canvas-box">
          <span className="crop-mark tl" />
          <span className="crop-mark tr" />
          <span className="crop-mark bl" />
          <span className="crop-mark br" />
          <SubAssemblyViewer
            moduleId="03"
            rotorAngleRad={telemetry.rotorAngleRad}
            gimbalYawDeg={telemetry.gimbalYawDeg}
            gimbalPitchDeg={telemetry.gimbalPitchDeg}
            limbState={telemetry.limbs[0]}
          />
        </div>
        <div className="cad-specs-footer">
          <div className="cad-spec-item">
            <span className="cad-spec-label">FEMUR L1</span>
            <span className="cad-spec-val">310mm I-BEAM</span>
          </div>
          <div className="cad-spec-item">
            <span className="cad-spec-label">TIBIA L2</span>
            <span className="cad-spec-val">355mm SHIN</span>
          </div>
          <div className="cad-spec-item">
            <span className="cad-spec-label">ANCHOR</span>
            <span className="cad-spec-val">2-PAD PINCER</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
