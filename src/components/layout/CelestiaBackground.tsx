import React, { useEffect } from 'react';

/** Static-ish backdrop: orbs use transform only; no live CSS blur. */
interface CelestiaBackgroundProps {
  /** false — шары стоят на месте: под непрозрачными рабочими панелями анимация не видна, но грузит GPU каждый кадр. */
  animated?: boolean;
}

const CelestiaBackground: React.FC<CelestiaBackgroundProps> = ({ animated = true }) => {
  useEffect(() => {
    const sync = () => {
      document.documentElement.classList.toggle('tab-hidden', document.hidden);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden${animated ? '' : ' celestia-static'}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-celestia-gradient" />
      <div className="floating-orb floating-orb-1" />
      <div className="floating-orb floating-orb-2" />
      <div className="floating-orb floating-orb-3" />
    </div>
  );
};

export default CelestiaBackground;
