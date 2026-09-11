import React, { useEffect } from 'react';

/** Static-ish backdrop: orbs use transform only; no live CSS blur. */
const CelestiaBackground: React.FC = () => {
  useEffect(() => {
    const sync = () => {
      document.documentElement.classList.toggle('tab-hidden', document.hidden);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-celestia-gradient" />
      <div className="floating-orb floating-orb-1" />
      <div className="floating-orb floating-orb-2" />
      <div className="floating-orb floating-orb-3" />
    </div>
  );
};

export default CelestiaBackground;
