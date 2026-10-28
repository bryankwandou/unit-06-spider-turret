import React from 'react';
import { OrthoView } from '../types/turret';

interface OrthoStripProps {
  activeOrtho: OrthoView;
  onSelectOrtho: (view: OrthoView) => void;
}

const ORTHO_VIEWS: OrthoView[] = ['SIDE', 'FRONT', 'TOP', 'REAR'];

function renderOrthoThumbIcon(view: OrthoView) {
  const stroke = 'var(--color-on-surface)';
  if (view === 'SIDE') {
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
        {/* Cannon Drum & Barrels */}
        <rect x="6" y="7" width="11" height="4" stroke={stroke} strokeWidth="1.2" />
        <rect x="17" y="5" width="9" height="8" rx="1.5" stroke={stroke} strokeWidth="1.3" />
        {/* Head Pod & Exhausts */}
        <circle cx="20" cy="18" r="5" stroke={stroke} strokeWidth="1.3" />
        <line x1="24" y1="15" x2="29" y2="11" stroke={stroke} strokeWidth="1.2" />
        <line x1="25" y1="17" x2="30" y2="13" stroke={stroke} strokeWidth="1.2" />
        {/* Spider Legs */}
        <polyline points="17,22 10,20 7,31" stroke={stroke} strokeWidth="1.4" />
        <polyline points="23,22 30,20 32,31" stroke={stroke} strokeWidth="1.4" />
        <polyline points="20,23 18,33" stroke={stroke} strokeWidth="1.4" />
      </svg>
    );
  }
  if (view === 'FRONT') {
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
        {/* Cannon Rotor Front */}
        <circle cx="18" cy="9" r="4.5" stroke={stroke} strokeWidth="1.3" />
        <circle cx="18" cy="9" r="1.5" fill={stroke} />
        {/* Head Sphere Front */}
        <circle cx="18" cy="18" r="5.2" stroke={stroke} strokeWidth="1.3" />
        <line x1="15" y1="18" x2="21" y2="18" stroke={stroke} strokeWidth="1.2" />
        {/* 4 Legs Symmetric */}
        <polyline points="14,22 8,19 6,31" stroke={stroke} strokeWidth="1.4" />
        <polyline points="22,22 28,19 30,31" stroke={stroke} strokeWidth="1.4" />
        <polyline points="15,23 11,22 10,30" stroke={stroke} strokeWidth="1.1" />
        <polyline points="21,23 25,22 26,30" stroke={stroke} strokeWidth="1.1" />
      </svg>
    );
  }
  if (view === 'TOP') {
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
        {/* X-shaped 4 Spider Legs from Top */}
        <line x1="6" y1="6" x2="30" y2="30" stroke={stroke} strokeWidth="1.5" />
        <line x1="30" y1="6" x2="6" y2="30" stroke={stroke} strokeWidth="1.5" />
        <circle cx="18" cy="18" r="5.5" fill="var(--color-surface-elevated)" stroke={stroke} strokeWidth="1.3" />
        <rect x="16" y="5" width="4" height="12" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
      {/* Rear Breech & Head with Exhausts */}
      <circle cx="18" cy="9" r="4.2" stroke={stroke} strokeWidth="1.3" />
      <circle cx="18" cy="18" r="5.2" stroke={stroke} strokeWidth="1.3" />
      <circle cx="18" cy="18" r="1.8" stroke={stroke} strokeWidth="1.1" />
      <line x1="13" y1="15" x2="10" y2="11" stroke={stroke} strokeWidth="1.2" />
      <line x1="23" y1="15" x2="26" y2="11" stroke={stroke} strokeWidth="1.2" />
      {/* 4 Legs Symmetric */}
      <polyline points="14,22 8,19 6,31" stroke={stroke} strokeWidth="1.4" />
      <polyline points="22,22 28,19 30,31" stroke={stroke} strokeWidth="1.4" />
    </svg>
  );
}

export const OrthoStrip: React.FC<OrthoStripProps> = ({ activeOrtho, onSelectOrtho }) => {
  return (
    <div className="ortho-strip-container">
      <div className="dimensions-spec">
        <strong>1.97m</strong> HEIGHT <span>×</span> <strong>1.86m</strong> LENGTH <span>·</span>{' '}
        <strong>420kg</strong> 148 PARTS
      </div>
      <div className="ortho-cards-row" role="group" aria-label="Orthographic Camera Projections">
        {ORTHO_VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            className={`ortho-card ${activeOrtho === view ? 'active' : ''}`}
            onClick={() => onSelectOrtho(view)}
          >
            {renderOrthoThumbIcon(view)}
            <span className="ortho-card-label">{view}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
