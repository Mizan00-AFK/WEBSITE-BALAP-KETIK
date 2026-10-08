import { memo } from 'react';
import './RacingBackground.css';

const LINES = Array.from({ length: 14 }, (_, i) => ({
  top: `${(i * 7.3 + 5) % 100}%`,
  delay: `${((i * 0.37) % 3).toFixed(2)}s`,
  duration: `${(1.8 + (i % 5) * 0.4).toFixed(2)}s`,
  width: `${80 + ((i * 37) % 160)}px`,
}));

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  delay: `${((i * 0.53) % 8).toFixed(2)}s`,
  duration: `${9 + (i % 6) * 2}s`,
  size: `${2 + (i % 3)}px`,
}));

/** Decorative dark-neon racing background (CSS only, behind every page). */
function RacingBackground() {
  return (
    <div className="racing-bg" aria-hidden="true">
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-road" />
      <div className="bg-lines">
        {LINES.map((line, i) => (
          <span
            key={i}
            style={{ top: line.top, width: line.width, animationDelay: line.delay, animationDuration: line.duration }}
          />
        ))}
      </div>
      <div className="bg-particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>
      <div className="bg-vignette" />
    </div>
  );
}

export default memo(RacingBackground);
