import React from 'react';
import { C, LV, rng, clamp01 } from './util.js';

const PARTS = (() => {
  const r = rng(99);
  return Array.from({ length: 150 }, () => ({ x: r(), y: r(), s: 0.04 + r() * 0.10, ph: r() * 6.28, a: 0.5 + r() * 0.45, rad: 1.4 + r() * 2.6, k: r() }));
})();

const rows = (a, b, n) => Array.from({ length: n }, (_, i) => Math.round(a + (b - a) * i / (n - 1)));
const slice = (x1, x2, ys, c) => <path d={ys.map(y => `M${x1} ${y}H${x2}`).join('')} fill="none" stroke={c} strokeOpacity={0.35} strokeWidth={1} />;

// levels: {head, chest, arms, legs}; good = true paints level 0 green (used on the closing shot)
export const Hologram = ({ t, levels, dust = 0, reveal = 1, good = false, glitch = 0 }) => {
  const col = l => (l === 0 ? (good ? C.good : C.cyan) : LV[l]);
  const Region = ({ l, children }) => {
    const c = col(l);
    return <g fill={c + '26'} stroke={c} strokeWidth={2.2} style={{ filter: `drop-shadow(0 0 8px ${c})` }}>{children}</g>;
  };
  const cc = col(levels.chest);
  const sweepY = ((t % 5.8) / 5.8) * 470;
  const ringPhase = i => ((t / 3.4) + i / 3) % 1;
  const beat = (t * 1.0) % 1;
  const jx = glitch ? Math.sin(t * 90) * 4 * glitch : 0;
  return (
    <svg width={720} height={750} viewBox="0 0 480 500" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="beamg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={C.cyan} stopOpacity=".55" /><stop offset="1" stopColor={C.cyan} stopOpacity="0" /></linearGradient>
        <linearGradient id="sweepg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9aeef7" stopOpacity="0" /><stop offset=".5" stopColor="#9aeef7" stopOpacity=".9" /><stop offset="1" stopColor="#9aeef7" stopOpacity="0" /></linearGradient>
        <clipPath id="figclip"><rect x="120" y="10" width="240" height="462" /></clipPath>
        <clipPath id="revealclip"><rect x="0" y={500 - 500 * clamp01(reveal)} width="480" height={500 * clamp01(reveal) + 4} /></clipPath>
      </defs>
      <g opacity={clamp01(reveal * 1.4)}>
        <polygon points="140,468 340,468 300,10 180,10" fill="url(#beamg)" opacity={0.75} />
        {[[140, 26], [100, 19], [62, 12]].map(([rx, ry], i) => <ellipse key={i} cx={240} cy={468} rx={rx} ry={ry} fill="none" stroke={C.cyan} strokeWidth={1.6} opacity={0.6} />)}
        {[0, 1, 2].map(i => { const p = ringPhase(i); return <ellipse key={i} cx={240} cy={468} rx={140} ry={26} fill="none" stroke={C.cyan} strokeWidth={1.8} opacity={Math.sin(Math.PI * p) * 0.9} transform={`translate(240 468) scale(${0.5 + 0.8 * p}) translate(-240 -468)`} />; })}
      </g>
      <g clipPath="url(#revealclip)" transform={`translate(${jx} 0)`}>
        <rect x="198" y="128" width="84" height="118" rx="10" fill="rgba(111,224,238,.06)" stroke={C.line} strokeWidth={1.2} strokeDasharray="3 3" />
        <Region l={levels.chest}>
          <rect x="190" y="122" width="100" height="146" rx="24" />
          {slice(196, 284, rows(140, 256, 8), cc)}
          <rect x="214" y="150" width="52" height="34" rx="5" fill="rgba(111,224,238,.10)" stroke={C.line} strokeWidth={1} />
          <path d="M220 168 h8 l4-9 5 16 4-7 h20" fill="none" stroke={C.fg} strokeWidth={1.6} opacity=".85" />
        </Region>
        <Region l={levels.head}>
          <rect x="220" y="108" width="40" height="14" rx="6" />
          <circle cx="240" cy="70" r="44" />
          <ellipse cx="240" cy="74" rx="30" ry="24" fill="rgba(3,12,20,.88)" stroke={C.line} strokeWidth={1} />
          <path d="M222 66 q10-10 22-8" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={2} />
        </Region>
        <Region l={levels.arms}>
          <rect x="156" y="128" width="34" height="128" rx="17" transform="rotate(8 173 128)" />
          <rect x="290" y="128" width="34" height="128" rx="17" transform="rotate(-8 307 128)" />
          <circle cx="155" cy="266" r="14" /><circle cx="325" cy="266" r="14" />
        </Region>
        <Region l={levels.legs}>
          <rect x="194" y="266" width="42" height="160" rx="18" /><rect x="244" y="266" width="42" height="160" rx="18" />
          <rect x="190" y="420" width="50" height="34" rx="12" /><rect x="240" y="420" width="50" height="34" rx="12" />
          {slice(198, 232, rows(284, 408, 8), col(levels.legs))}{slice(248, 282, rows(284, 408, 8), col(levels.legs))}
        </Region>
        <circle cx="240" cy="167" r={7 + beat * 26} fill="none" stroke={cc} strokeWidth={2} opacity={(1 - beat) * 0.9} />
      </g>
      <g clipPath="url(#figclip)" opacity={clamp01(reveal * 2)}><rect x="120" y={sweepY - 13} width="240" height="26" fill="url(#sweepg)" /></g>
      {dust > 0 && PARTS.map((p, i) => {
        if (p.k > dust) return null;
        const x = ((p.x + Math.sin(t * 0.9 + p.ph) * 0.03 + t * p.s * 0.05) % 1) * 560 - 40;
        const y = ((p.y + t * p.s) % 1) * 520 - 10;
        return <circle key={i} cx={x} cy={y} r={p.rad} fill="rgba(238,214,176,1)" opacity={p.a * (0.7 + 0.3 * Math.sin(t * 3 + p.ph))} />;
      })}
    </svg>
  );
};
