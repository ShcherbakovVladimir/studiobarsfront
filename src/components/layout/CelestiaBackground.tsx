import React from 'react';

/** Flat canvas backdrop: n8n-style dot grid, no floating orbs. */
interface CelestiaBackgroundProps {
  /** Kept for API compatibility; animation is unused. */
  animated?: boolean;
}

const CelestiaBackground: React.FC<CelestiaBackgroundProps> = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-celestia-gradient" />
    </div>
  );
};

export default CelestiaBackground;
