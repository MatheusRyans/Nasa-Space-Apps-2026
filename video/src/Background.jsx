import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, rng } from './util.js';

const NODES = (() => {
  const r = rng(7);
  return Array.from({ length: 64 }, () => ({ x: r() * 1920, y: r() * 1080, vx: (r() - 0.5) * 14, vy: (r() - 0.5) * 14, ph: r() * 6.28, rad: r() * 1.8 + 0.8 }));
})();

export const Background = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pts = NODES.map(n => ({ x: ((n.x + n.vx * t) % 1960 + 1960) % 1960 - 20, y: ((n.y + n.vy * t) % 1120 + 1120) % 1120 - 20, ph: n.ph, rad: n.rad }));
  const lines = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx * dx + dy * dy;
    if (d2 < 52000) lines.push(<line key={i + '-' + j} x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y} stroke={C.cyan} strokeOpacity={0.22 * (1 - d2 / 52000)} strokeWidth={1.2} />);
  }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1500px 800px at 82% -10%, rgba(40,150,175,.30), transparent 62%), radial-gradient(1200px 700px at -6% 108%, rgba(20,90,130,.28), transparent 60%), ${C.bg}` }}>
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(111,224,238,.07) 2px, transparent 2px), linear-gradient(90deg, rgba(111,224,238,.07) 2px, transparent 2px)',
        backgroundSize: '96px 96px', backgroundPosition: `${(t * 6) % 96}px ${(t * 3) % 96}px`,
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, #000 20%, transparent 85%)', maskImage: 'radial-gradient(ellipse at 50% 45%, #000 20%, transparent 85%)'
      }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {lines}
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.rad} fill="#bef5fa" fillOpacity={0.5 + 0.4 * Math.sin(t * 1.4 + p.ph)} />)}
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)' }} />
    </AbsoluteFill>
  );
};
