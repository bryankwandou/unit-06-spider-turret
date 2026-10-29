import React from 'react';

export const ReticleOverlay: React.FC = () => {
  return (
    <div className="reticle-overlay" aria-hidden="true">
      <svg
        viewBox="0 0 760 760"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top Bore Axis Label */}
        <text
          x="380"
          y="22"
          textAnchor="middle"
          fill="var(--color-reticle-text)"
          fontFamily="var(--font-mono)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing="0.14em"
        >
          000° N · TURRET BORE AXIS
        </text>

        {/* Top & Bottom Vertical Axis Lines */}
        <line
          x1="380"
          y1="34"
          x2="380"
          y2="92"
          stroke="var(--color-reticle-line)"
          strokeWidth="1.2"
        />
        <line
          x1="380"
          y1="668"
          x2="380"
          y2="726"
          stroke="var(--color-reticle-line)"
          strokeWidth="1.2"
        />

        {/* Left & Right Horizontal Axis Lines */}
        <line
          x1="34"
          y1="380"
          x2="92"
          y2="380"
          stroke="var(--color-reticle-line)"
          strokeWidth="1.2"
        />
        <line
          x1="668"
          y1="380"
          x2="726"
          y2="380"
          stroke="var(--color-reticle-line)"
          strokeWidth="1.2"
        />

        {/* Outer Compass Circle */}
        <circle
          cx="380"
          cy="380"
          r="306"
          stroke="var(--color-reticle-line)"
          strokeWidth="1"
        />

        {/* Inner Dashed Footprint Envelope Circle */}
        <circle
          cx="380"
          cy="380"
          r="224"
          stroke="var(--color-reticle-line)"
          strokeWidth="1"
          strokeDasharray="5 6"
        />

        {/* Diagonal 45-degree Tick Marks on Outer Ring */}
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 380 + Math.cos(rad) * 290;
          const y1 = 380 + Math.sin(rad) * 290;
          const x2 = 380 + Math.cos(rad) * 306;
          const y2 = 380 + Math.sin(rad) * 306;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-reticle-line)"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Minor 15-degree Tick Marks */}
        {Array.from({ length: 24 }).map((_, idx) => {
          const deg = idx * 15;
          if (deg % 45 === 0) return null;
          const rad = (deg * Math.PI) / 180;
          const x1 = 380 + Math.cos(rad) * 298;
          const y1 = 380 + Math.sin(rad) * 298;
          const x2 = 380 + Math.cos(rad) * 306;
          const y2 = 380 + Math.sin(rad) * 306;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-reticle-line)"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Bottom Footprint Envelope Label */}
        <text
          x="380"
          y="746"
          textAnchor="middle"
          fill="var(--color-reticle-text)"
          fontFamily="var(--font-mono)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing="0.14em"
        >
          180° S · Ø 1.86M FOOTPRINT ENVELOPE
        </text>
      </svg>
    </div>
  );
};
