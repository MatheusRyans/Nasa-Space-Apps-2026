// v4 scenes: same story and narration, new motion. Every scene owns its entrance and exit so each cut is different.
import React from 'react';
import { Img, staticFile } from 'remotion';
import data from './data.json';
import { C, FONT, LV, clamp01, easeIO, pe, prog, rng, fmt } from './util.js';
import { Planet, hp } from './Scenes2.jsx';

const lerp = (a, b, u) => a + (b - a) * u;
const along = (pts, u) => {
  const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = clamp01(u) * L.reduce((a, b) => a + b, 0);
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) { const k = L[i] ? Math.min(1, d / L[i]) : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; }
    d -= L[i];
  }
  return pts[0];
};
const BT = ({ size = 40, color = C.cyan, sw = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l10 10-5 5V2l5 5L7 17" /></svg>
);
const Dot = ({ x, y, r = 8, c = C.cyan, o = 1 }) => <circle cx={x} cy={y} r={r} fill={c} opacity={o} style={{ filter: `drop-shadow(0 0 ${r * 1.4}px ${c})` }} />;
const Svg = ({ children, style }) => <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', ...style }}>{children}</svg>;
const Check = ({ p, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.good} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10} /><path d="M7 12.5l3.2 3.2L17 9" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg>
);

/* ================= V0 · distance + team (0 – 2.3) ================= */
const PEOPLE = [['Clara Beatriz', 0.29, 0], ['Matheus Ryan', 0.42, 1], ['Cauã Mesquita', 0.545, 0], ['Álvaro Boaventura', 0.7, 1]];
export const V0 = ({ t }) => {
  if (t > 2.6) return null;
  const out = easeIO(prog(t, 2.0, 2.5)), cp = pe(t, 0.75, 1.35), zoom = 1.5 - 0.5 * pe(t, 0, 1.1);
  const fx = lerp(960, 250, out), fy = lerp(448, 330, out), fs = (0.72 + 0.28 * cp) * lerp(1, 0.07, out);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '70% 56%', filter: `blur(${7 * cp}px)`, opacity: (1 - 0.45 * cp) * (1 - out) }}>
        <Planet id="m0" kind="mars" x={1400} y={620} r={330} t={t} spin={0.012} />
        <Planet id="e0" kind="earth" x={330} y={290} r={46} t={t} spin={0.05} />
        <Svg><line x1={380} y1={300} x2={1150} y2={540} stroke={C.cyan} strokeWidth={2.5} strokeDasharray="9 11" opacity={0.6} />{[0, 1, 2, 3].map(i => { const u = (t * 0.5 + i / 4) % 1; return <Dot key={i} x={lerp(380, 1150, u)} y={lerp(300, 540, u)} />; })}</Svg>
        <div style={{ position: 'absolute', left: 300, top: 350, fontFamily: FONT, fontSize: 24, letterSpacing: 6, color: C.muted, fontWeight: 600 }}>EARTH</div>
        <div style={{ position: 'absolute', left: 1320, top: 250, fontFamily: FONT, fontSize: 30, letterSpacing: 8, color: '#ffbb86', fontWeight: 700 }}>MARS</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 55, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 104, letterSpacing: -3, opacity: cp * (1 - clamp01(out * 2.5)), transform: `translateY(${(1 - cp) * -30}px)` }}>
        <span style={{ color: C.cyan, textShadow: `0 0 30px ${C.cyan}` }}>AI</span>needHealth
      </div>
      <div style={{ position: 'absolute', left: fx - 450, top: fy - 253, width: 900, height: 506, opacity: cp * (1 - prog(t, 2.35, 2.5)), transform: `scale(${fs})`, filter: `drop-shadow(0 0 28px ${C.cyan}99)` }}>
        <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, calc(100% - 44px) 0, 100% 44px, 100% 100%, 44px 100%, 0 calc(100% - 44px))' }}>
          <Img src={staticFile('team/team.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.74) contrast(1.08) saturate(.7)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(60,190,215,.20)', mixBlendMode: 'color' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(5,13,21,0) 45%, rgba(5,13,21,.72) 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(111,224,238,.07) 0 2px, transparent 2px 6px)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: `${((t * 0.9) % 1) * 100}%`, height: 8, background: 'rgba(111,224,238,.6)', boxShadow: `0 0 26px ${C.cyan}` }} />
          <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 4px ${C.cyan}` }} />
        </div>
      </div>
      <Svg style={{ opacity: 1 - clamp01(out * 3) }}>
        {PEOPLE.map(([n, f, row], i) => { const p = pe(t, 1.1 + i * 0.1, 1.45 + i * 0.1), x = 510 + f * 900; return <g key={n} opacity={p}><line x1={x} y1={640} x2={x} y2={640 + (84 + row * 54) * p} stroke={C.cyan} strokeWidth={2} /><circle cx={x} cy={640} r={5} fill={C.cyan} /></g>; })}
      </Svg>
      {PEOPLE.map(([n, f, row], i) => {
        const p = pe(t, 1.2 + i * 0.1, 1.6 + i * 0.1) * (1 - clamp01(out * 3));
        return <div key={n} style={{ position: 'absolute', left: 510 + f * 900 - 130, top: 722 + row * 54, width: 260, textAlign: 'center', opacity: p, fontFamily: FONT }}><span style={{ display: 'inline-block', padding: '5px 16px', background: 'rgba(5,16,26,.92)', borderTop: `3px solid ${C.cyan}`, fontSize: 25, fontWeight: 700, color: C.fg, whiteSpace: 'nowrap' }}>{n}</span></div>;
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 868, textAlign: 'center', fontFamily: FONT, fontSize: 24, letterSpacing: 8, color: C.muted, opacity: pe(t, 1.5, 1.9) * (1 - clamp01(out * 3)) }}>SPACE APPS CHALLENGE 2026 · HEALTH MONITORING FOR ASTRONAUTS</div>
    </div>
  );
};

/* ================= V1 · the problem (2.3 – 7.85) ================= */
export const V1 = ({ t }) => {
  if (t < 2.2 || t > 8.1) return null;
  const zo = easeIO(prog(t, 7.5, 8.0)), far = pe(t, 5.1, 5.8);
  const slam = pe(t, 2.62, 2.92), eg = pe(t, 2.25, 2.9);
  const dots = [1390, 1490, 1590, 1690];
  const shipHot = t > 7.0;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - zo, transform: `scale(${1 + 2.4 * zo})`, transformOrigin: '960px 552px', filter: zo > 0.02 ? `blur(${14 * zo}px)` : 'none' }}>
      <div style={{ position: 'absolute', inset: 0, filter: far > 0.02 ? `blur(${5 * far}px)` : 'none', opacity: 1 - 0.45 * far }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${0.3 + 0.7 * eg})`, transformOrigin: '250px 330px', opacity: eg }}><Planet id="e1" kind="earth" x={250} y={330} r={120} t={t} spin={0.03} /></div>
        <div style={{ opacity: pe(t, 2.4, 3.0) }}><Planet id="m1" kind="mars" x={1690} y={310} r={140} t={t} spin={0.018} /></div>
        <Svg style={{ opacity: pe(t, 2.5, 3.0) }}><line x1={380} y1={330} x2={1550} y2={310} stroke={C.cyan} strokeWidth={2.5} strokeDasharray="9 11" opacity={0.6} />{[0, 1, 2, 3].map(i => { const u = (t * 0.22 + i / 4) % 1; return <Dot key={i} x={lerp(380, 1550, u)} y={lerp(330, 310, u)} />; })}</Svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 128, textAlign: 'center', fontFamily: FONT, opacity: clamp01(slam * 3) }}>
          <div style={{ fontSize: 22, letterSpacing: 8, color: C.muted, fontWeight: 600 }}>ONE-WAY SIGNAL DELAY · EARTH ↔ MARS</div>
          <div style={{ fontSize: 116, fontWeight: 700, color: C.cyan, textShadow: `0 0 36px ${C.cyan}88`, lineHeight: 1.05, transform: `scale(${1.7 - 0.7 * slam})`, filter: slam < 0.9 ? `blur(${(1 - slam) * 8}px)` : 'none' }}>~20 min</div>
        </div>
      </div>
      {/* 3D ring under the astronaut */}
      <div style={{ position: 'absolute', inset: 0, perspective: 1300, perspectiveOrigin: '960px 530px', opacity: pe(t, 2.9, 3.4) }}>
        <div style={{ position: 'absolute', left: 710, top: 580, width: 500, height: 500, borderRadius: '50%', border: `3px dashed ${C.cyan}99`, boxShadow: `0 0 30px ${C.cyan}55`, transform: `rotateX(72deg) rotateZ(${t * 20}deg)` }} />
      </div>
      <div style={{ position: 'absolute', left: 110, top: 600, fontFamily: FONT, opacity: pe(t, 4.05, 4.35) * (1 - 0.55 * pe(t, 5.3, 5.8)), transform: `translateX(${(1 - pe(t, 4.05, 4.4)) * -60}px)`, borderLeft: `8px solid ${C.crit}`, paddingLeft: 26 }}>
        <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.02, color: C.fg, textShadow: `0 0 26px ${C.crit}66` }}>NO DOCTOR<br />ON BOARD</div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 10, opacity: pe(t, 4.6, 4.9) }}>no fast evacuation</div>
      </div>
      {/* one failing body → crew → mission */}
      <Svg>
        <line x1={1170} y1={705} x2={lerp(1170, 1300, pe(t, 5.5, 6.0))} y2={710} stroke={C.crit} strokeWidth={4} opacity={pe(t, 5.5, 5.7)} style={{ filter: `drop-shadow(0 0 8px ${C.crit})` }} />
        <rect x={1300} y={620} width={480} height={180} rx={90} fill={shipHot ? `${C.crit}22` : 'rgba(9,28,41,.6)'} stroke={shipHot ? C.crit : C.line} strokeWidth={3} opacity={pe(t, 5.2, 5.6)} style={{ filter: shipHot ? `drop-shadow(0 0 22px ${C.crit})` : 'none' }} />
        {dots.map((x, i) => { const hot = t > 6.0 + i * 0.22; return <circle key={i} cx={x} cy={710} r={hot ? 24 + 3 * Math.sin(t * 9 + i) : 22} fill={hot ? C.crit : `${C.cyan}55`} stroke={hot ? C.crit : C.cyan} strokeWidth={2} opacity={pe(t, 5.3 + i * 0.05, 5.7 + i * 0.05)} style={{ filter: hot ? `drop-shadow(0 0 14px ${C.crit})` : 'none' }} />; })}
      </Svg>
      <div style={{ position: 'absolute', left: 1300, top: 572, width: 480, textAlign: 'center', fontFamily: FONT, fontSize: 24, letterSpacing: 6, fontWeight: 700, color: t > 6.0 ? C.crit : C.muted, opacity: pe(t, 5.3, 5.7) }}>CREW</div>
      <div style={{ position: 'absolute', left: 1300, top: 818, width: 480, textAlign: 'center', fontFamily: FONT, fontSize: 40, letterSpacing: 4, fontWeight: 700, color: C.crit, textShadow: `0 0 24px ${C.crit}`, opacity: pe(t, 7.0, 7.25), transform: `scale(${1.3 - 0.3 * pe(t, 7.0, 7.3)})` }}>MISSION AT RISK</div>
    </div>
  );
};

/* ================= V2 · Bluetooth, tracked signal (7.85 – 13.4) ================= */
export const P2 = [520, 560, 0.9];
export const V2 = ({ t }) => {
  if (t < 7.7 || t > 13.8) return null;
  const o = pe(t, 7.9, 8.4) * (1 - prog(t, 13.3, 13.7));
  const chest = hp(240, 167, P2), wrist = hp(155, 266, P2), head = hp(240, 62, P2);
  const HUB = [1010, 440], SYS = [1320, 440], EAR = [1630, 440];
  const route = [chest, HUB, SYS, [EAR[0] - 90, EAR[1]]];
  const hero = t < 9.3 ? prog(t, 8.5, 9.3) * 0.46 : t < 9.9 ? 0.46 + prog(t, 9.3, 9.9) * 0.27 : 0.73 + prog(t, 9.9, 10.6) * 0.27;
  const hubOn = t > 9.3, sysOn = t > 9.9, earOn = t > 10.6, stream = pe(t, 10.6, 11.0);
  const cut = pe(t, 10.2, 10.9);
  const readings = [['HR', '64 bpm', 11.15], ['SpO₂', '97 %', 11.45], ['TEMP', '36.6 °C', 11.75]];
  const lit = (on, at) => (on ? 1 + 0.5 * Math.max(0, 1 - (t - at) / 0.5) : 0);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <Svg>
        {/* old cables: sagging, then gone */}
        <g opacity={pe(t, 8.0, 8.5) * 0.55 * (1 - cut)} transform={`translate(0 ${cut * 46})`} fill="none" stroke={C.dim} strokeWidth={7} strokeLinecap="round" strokeDasharray={cut > 0.05 ? '14 22' : undefined}>
          <path d={`M${chest[0] + 40} ${chest[1] + 30} Q 780 640 ${HUB[0] - 70} ${HUB[1] + 40}`} /><path d={`M${HUB[0] + 70} ${HUB[1] + 40} Q 1195 590 ${SYS[0] - 70} ${SYS[1] + 50}`} /><path d={`M${SYS[0] + 70} ${SYS[1] + 50} Q 1520 590 ${EAR[0] - 80} ${EAR[1] + 50}`} />
        </g>
        {/* wireless links */}
        {[[chest, HUB], [wrist, HUB], [head, HUB]].map(([a, b], i) => <path key={i} d={`M${a[0]} ${a[1]} Q ${(a[0] + b[0]) / 2} ${Math.min(a[1], b[1]) - 60 + i * 50} ${b[0] - 78} ${b[1]}`} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeDasharray="8 10" opacity={pe(t, 8.5 + i * 0.1, 9.0 + i * 0.1) * 0.75} />)}
        <line x1={HUB[0] + 78} y1={HUB[1]} x2={SYS[0] - 80} y2={SYS[1]} stroke={C.cyan} strokeWidth={3} strokeDasharray="8 10" opacity={hubOn ? 0.8 : 0.15} />
        <line x1={SYS[0] + 80} y1={SYS[1]} x2={EAR[0] - 92} y2={EAR[1]} stroke={sysOn ? C.cyan : C.dim} strokeWidth={3} strokeDasharray="8 10" opacity={sysOn ? 0.8 : 0.15} />
        {/* sensors on the body */}
        {[chest, wrist, head].map(([x, y], k) => { const on = pe(t, 8.2 + k * 0.1, 8.6 + k * 0.1); return <g key={k} opacity={on}>{[0, 1, 2].map(i => { const ph = (t * 1.1 + i / 3 + k * 0.2) % 1; return <circle key={i} cx={x} cy={y} r={12 + ph * 90} fill="none" stroke={C.cyan} strokeWidth={3} opacity={(1 - ph) * 0.85} />; })}<Dot x={x} y={y} r={9} /></g>; })}
        {/* the tracked pulse */}
        {t > 8.5 && t < 10.75 && [0, 1, 2, 3, 4, 5, 6].map(k => { const [x, y] = along(route, hero - k * 0.014); return <Dot key={k} x={x} y={y} r={16 - k * 2} c="#eaffff" o={1 - k * 0.14} />; })}
        {/* continuous stream */}
        {stream > 0 && Array.from({ length: 12 }, (_, i) => { const u = (t * 0.85 + i / 12) % 1, [x, y] = along(route, u); return <Dot key={i} x={x} y={y} r={6} o={stream * 0.9} />; })}
        {/* Bluetooth waves at the hub */}
        {hubOn && [0, 1, 2].map(i => { const ph = (t * 0.9 + i / 3) % 1; return <circle key={i} cx={HUB[0]} cy={HUB[1]} r={80 + ph * 110} fill="none" stroke={C.cyan} strokeWidth={3} opacity={(1 - ph) * 0.6} />; })}
        {earOn && (() => { const ph = prog(t, 10.6, 11.5); return <circle cx={EAR[0]} cy={EAR[1]} r={90 + ph * 160} fill="none" stroke={C.good} strokeWidth={5 * (1 - ph)} opacity={1 - ph} />; })()}
      </Svg>
      <div style={{ opacity: pe(t, 8.3, 8.8) }}><Planet id="e2" kind="earth" x={EAR[0]} y={EAR[1]} r={85} t={t} spin={0.04} /></div>
      <div style={{ position: 'absolute', left: HUB[0] - 78, top: HUB[1] - 78, width: 156, height: 156, borderRadius: 78, border: `4px solid ${C.cyan}`, background: hubOn ? `${C.cyan}33` : C.panel, boxShadow: `0 0 ${hubOn ? 60 : 16}px ${C.cyan}${hubOn ? 'aa' : '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pe(t, 8.2, 8.7), transform: `scale(${Math.max(1, lit(hubOn, 9.3)) * (0.8 + 0.2 * pe(t, 8.2, 8.7))})` }}><BT size={104} color={hubOn ? '#eaffff' : C.cyan} sw={2} /></div>
      <div style={{ position: 'absolute', left: SYS[0] - 80, top: SYS[1] - 80, width: 160, height: 160, borderRadius: 28, border: `4px solid ${sysOn ? C.cyan : C.line}`, background: sysOn ? `${C.cyan}2e` : C.panel, boxShadow: sysOn ? `0 0 50px ${C.cyan}99` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 70, fontWeight: 700, color: sysOn ? '#eaffff' : C.dim, opacity: pe(t, 8.35, 8.85), transform: `scale(${Math.max(1, lit(sysOn, 9.9))})` }}>AI</div>
      {[['SENSORS', chest[0], 905], ['BLUETOOTH', HUB[0], 548], ['AIneedHealth', SYS[0], 548], ['MISSION CONTROL', EAR[0], 548]].map(([l, x, y], i) => <div key={l} style={{ position: 'absolute', left: x - 160, top: y, width: 320, textAlign: 'center', fontFamily: FONT, fontSize: 24, letterSpacing: 4, fontWeight: 700, color: i === 1 ? C.cyan : C.fg, opacity: pe(t, 8.3 + i * 0.12, 8.8 + i * 0.12) }}>{l}</div>)}
      <div style={{ position: 'absolute', left: 900, top: 650, fontFamily: FONT, opacity: pe(t, 10.2, 10.5), transform: `scale(${1.25 - 0.25 * pe(t, 10.2, 10.55)})`, transformOrigin: '0 50%' }}>
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, color: C.fg, textShadow: `0 0 30px ${C.cyan}66` }}>NO CABLES</div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 10 }}>wireless wearables · continuous link</div>
      </div>
      {readings.map(([l, v, s0], i) => {
        const u = prog(t, s0, s0 + 0.45), [x, y] = along([[HUB[0], HUB[1] - 100], [SYS[0], SYS[1] - 110], [EAR[0] - 60, EAR[1] - 120]], easeIO(u)), done = pe(t, s0 + 0.45, s0 + 0.75);
        return <React.Fragment key={l}>
          {u > 0 && u < 1 && <div style={{ position: 'absolute', left: x - 70, top: y - 22, padding: '4px 14px', background: 'rgba(5,16,26,.92)', border: `2px solid ${C.cyan}`, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.fg, whiteSpace: 'nowrap', boxShadow: `0 0 20px ${C.cyan}88`, filter: 'blur(.6px)' }}>{l} {v}</div>}
          <div style={{ position: 'absolute', left: 1500, top: 640 + i * 62, width: 300, opacity: done, transform: `translateX(${(1 - done) * 30}px)`, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontSize: 28, fontWeight: 700, color: C.fg }}><Check p={done} size={32} /><span style={{ color: C.muted, width: 78 }}>{l}</span>{v}</div>
        </React.Fragment>;
      })}
      <div style={{ position: 'absolute', left: 1500, top: 600, fontFamily: FONT, fontSize: 20, letterSpacing: 4, color: C.good, fontWeight: 700, opacity: pe(t, 11.5, 11.8) }}>RECEIVED ON EARTH</div>
    </div>
  );
};

/* ================= V3 · analysis as one flow (13.4 – 19.12) ================= */
export const P3 = [400, 600, 0.8];
const spark = (seed, end) => { const r = rng(seed); return Array.from({ length: 24 }, (_, i) => 0.3 + 0.12 * (r() - 0.5) + (end - 0.3) * Math.pow(i / 23, 2.4)); };
export const V3 = ({ t }) => {
  if (t < 13.15 || t >= 19.12) return null;
  const rv = easeIO(prog(t, 13.2, 13.85)) * 2400;
  const S = data.sleep, sy = data.dust.symptoms;
  const head = hp(240, 70, P3), chestP = hp(240, 167, P3), arm = hp(325, 200, P3);
  const X0 = 640, W = 440, H = 80, NODE = [1440, 560], R = 118;
  const sleepPts = S.series.map(v => clamp01((v - 5.6) / (8.4 - 5.6)));
  const rows = [
    { l: 'SLEEP', sub: '30 days', from: head, y: 270, pts: sleepPts, band: [clamp01((S.mean - S.sd - 5.6) / 2.8), clamp01((S.mean + S.sd - 5.6) / 2.8)], val: '3 days below', s: 13.8 },
    { l: sy[0].label.toUpperCase(), sub: 'symptom', from: head, y: 400, pts: spark(11, 0.86), band: [0.12, 0.48], val: `${fmt(sy[0].cur, 1)}/3`, s: 14.2 },
    { l: sy[1].label.toUpperCase(), sub: 'symptom', from: chestP, y: 530, pts: spark(12, 0.9), band: [0.12, 0.48], val: `${fmt(sy[1].cur, 1)}/3`, s: 14.55 },
    { l: sy[2].label.toUpperCase(), sub: 'symptom', from: arm, y: 660, pts: spark(13, 0.9), band: [0.12, 0.48], val: `${fmt(sy[2].cur, 1)}/3`, s: 14.9 }
  ];
  const merge = pe(t, 16.45, 17.4), node = pe(t, 16.3, 16.8), gauge = pe(t, 17.7, 18.2), alertOn = t > 18.1;
  const rail = ['DATA', 'CORRELATION', 'INTERPRETATION', 'RISK', 'DECISION'], rt = [13.8, 16.5, 17.2, 17.8, 99];
  const arc = (a0, a1, r) => { const p = a => [NODE[0] + r * Math.cos(a), NODE[1] + r * Math.sin(a)], [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`; };
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: rv < 2300 ? `circle(${rv}px at 1700px 440px)` : 'none' }}>
      <div style={{ position: 'absolute', inset: -200, background: C.bg, opacity: 0.93 * (1 - prog(t, 13.8, 14.2)) }} />
      <Svg>{rv < 2300 && <circle cx={1700} cy={440} r={Math.max(0, rv - 4)} fill="none" stroke={C.cyan} strokeWidth={6} opacity={0.8} style={{ filter: `drop-shadow(0 0 16px ${C.cyan})` }} />}</Svg>
      {rail.map((s, i) => { const on = t > rt[i]; return <div key={s} style={{ position: 'absolute', left: 640 + i * 240, top: 150, width: 230, opacity: pe(t, 13.7 + i * 0.08, 14.0 + i * 0.08), fontFamily: FONT }}>
        <div style={{ height: 5, background: on ? C.cyan : 'rgba(111,224,238,.18)', boxShadow: on ? `0 0 14px ${C.cyan}` : 'none' }} />
        <div style={{ marginTop: 8, fontSize: 20, letterSpacing: 3, fontWeight: 700, color: on ? C.fg : C.dim }}>{s}</div>
      </div>; })}
      <Svg>
        {rows.map((r, i) => {
          const d = pe(t, r.s, r.s + 1.4), dev = pe(t, r.s + 1.2, r.s + 1.6), n = r.pts.length;
          const path = r.pts.map((v, j) => `${j ? 'L' : 'M'}${(X0 + (j / (n - 1)) * W).toFixed(1)} ${(r.y + H - v * H).toFixed(1)}`).join('');
          const yEnd = r.y + H - r.pts[n - 1] * H, yMid = r.y + H / 2;
          const cv = `M${X0 + W + 14} ${yEnd} C ${X0 + W + 150} ${yEnd}, ${NODE[0] - R - 160} ${NODE[1]}, ${NODE[0] - R - 6} ${NODE[1]}`;
          return <g key={i}>
            <path d={`M${r.from[0]} ${r.from[1]} L ${X0 - 30} ${yMid} L ${X0 - 8} ${yMid}`} fill="none" stroke={dev > 0.5 ? C.warn : C.cyan} strokeWidth={2} opacity={pe(t, r.s - 0.15, r.s + 0.25) * 0.7} />
            <Dot x={r.from[0]} y={r.from[1]} r={7} c={dev > 0.5 ? C.warn : C.cyan} o={pe(t, r.s - 0.15, r.s + 0.2)} />
            <rect x={X0} y={r.y + H - r.band[1] * H} width={W} height={(r.band[1] - r.band[0]) * H} fill="rgba(111,224,238,.16)" opacity={pe(t, r.s - 0.1, r.s + 0.4)} />
            <path d={path} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d} fill="none" stroke={C.fg} strokeWidth={4} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 7px rgba(111,224,238,.8))' }} />
            <Dot x={X0 + W} y={yEnd} r={10 * dev} c={C.warn} />
            <path d={cv} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - merge} fill="none" stroke={C.warn} strokeWidth={3.5} opacity={0.9} style={{ filter: `drop-shadow(0 0 8px ${C.warn})` }} />
            {merge > 0.95 && [0, 1].map(k => { const u = (t * 0.9 + k / 2 + i * 0.13) % 1, x = lerp(X0 + W + 14, NODE[0] - R - 6, u), yy = lerp(yEnd, NODE[1], easeIO(u)); return <Dot key={k} x={x} y={yy} r={5} c={C.warn} />; })}
          </g>;
        })}
        {/* risk node */}
        <g opacity={node}>
          <circle cx={NODE[0]} cy={NODE[1]} r={R} fill={alertOn ? `${C.warn}22` : 'rgba(9,28,41,.85)'} stroke={alertOn ? C.warn : C.cyan} strokeWidth={4} style={{ filter: `drop-shadow(0 0 ${alertOn ? 40 : 18}px ${alertOn ? C.warn : C.cyan})` }} />
          {LV.map((c, i) => { const a0 = Math.PI * (0.78 + i * 0.37), a1 = a0 + Math.PI * 0.33, on = i === 1 && alertOn; return <path key={i} d={arc(a0, a1, R + 26)} fill="none" stroke={c} strokeWidth={on ? 16 : 9} strokeLinecap="round" opacity={gauge * (on ? 1 : 0.32)} style={{ filter: on ? `drop-shadow(0 0 14px ${c})` : 'none' }} />; })}
        </g>
      </Svg>
      {rows.map((r, i) => { const dev = pe(t, r.s + 1.2, r.s + 1.6); return <React.Fragment key={i}>
        <div style={{ position: 'absolute', left: X0, top: r.y - 34, fontFamily: FONT, fontSize: 22, letterSpacing: 3, fontWeight: 700, color: C.fg, opacity: pe(t, r.s - 0.1, r.s + 0.3) }}>{r.l} <span style={{ color: C.dim, fontWeight: 600 }}>· {r.sub}</span></div>
        <div style={{ position: 'absolute', left: X0 + W - 250, top: r.y - 36, width: 250, textAlign: 'right', fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.warn, opacity: dev, textShadow: `0 0 14px ${C.warn}88` }}>{r.val}</div>
      </React.Fragment>; })}
      <div style={{ position: 'absolute', left: X0, top: 772, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontSize: 20, letterSpacing: 3, fontWeight: 700, color: C.cyan, opacity: pe(t, 14.0, 14.5) }}><div style={{ width: 46, height: 18, background: 'rgba(111,224,238,.3)', border: '1px solid rgba(111,224,238,.6)' }} />PERSONAL BASELINE</div>
      <div style={{ position: 'absolute', left: NODE[0] - R, top: NODE[1] - 50, width: 2 * R, textAlign: 'center', fontFamily: FONT, opacity: node }}>
        <div style={{ fontSize: 18, letterSpacing: 4, color: C.muted, fontWeight: 700 }}>{alertOn ? 'RISK' : 'CORRELATION'}</div>
        <div style={{ fontSize: alertOn ? 54 : 40, fontWeight: 700, color: alertOn ? C.warn : C.fg, lineHeight: 1.1, textShadow: alertOn ? `0 0 24px ${C.warn}` : 'none', transform: `scale(${alertOn ? 1.3 - 0.3 * pe(t, 18.1, 18.4) : 1})` }}>{alertOn ? 'ALERT' : `${Math.round(4 * merge)} signals`}</div>
      </div>
      <div style={{ position: 'absolute', left: NODE[0] - 240, top: NODE[1] + R + 50, width: 480, textAlign: 'center', fontFamily: FONT, opacity: pe(t, 17.3, 17.7) }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.fg }}>Dust-exposure pattern</div>
        <div style={{ fontSize: 24, color: C.warn, fontWeight: 600 }}>confidence {data.dust.conf} · moving together</div>
      </div>
    </div>
  );
};

/* ================= V4 · the WOW (19.12 – 23.9) ================= */
export const P4 = [560, 540, 1];
export const V4 = ({ t }) => {
  if (t < 19.12 || t > 24.4) return null;
  const hit = 19.16, hl = easeIO(prog(t, 23.85, 24.35));
  const [cx, cy] = hp(240, 167, P4), EAR = [1730, 235];
  const sw = prog(t, hit, hit + 1.0), beam = pe(t, 19.6, 19.82), slam = pe(t, hit, hit + 0.32);
  const card = pe(t, 19.95, 20.45);
  const rows = [['Crew informed', 20.9], ['Mission control notified', 21.9], ['Protocol started', 22.4]];
  const mc = pe(t, 21.6, 22.0);
  const bx = lerp(cx, EAR[0] - 60, beam), by = lerp(cy, EAR[1] + 30, beam);
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: hl > 0 ? `inset(${hl * 100}% 0 0 0)` : 'none' }}>
      <Svg>
        {sw < 1 && <circle cx={cx} cy={cy} r={40 + sw * 900} fill="none" stroke={C.warn} strokeWidth={14 * (1 - sw)} opacity={1 - sw} />}
        {sw < 1 && <circle cx={cx} cy={cy} r={20 + sw * 560} fill="none" stroke="#fff6d0" strokeWidth={6 * (1 - sw)} opacity={(1 - sw) * 0.8} />}
        {t > 19.6 && <g>
          <line x1={cx} y1={cy} x2={bx} y2={by} stroke={C.warn} strokeWidth={beam < 1 ? 12 : 4} strokeLinecap="round" opacity={beam < 1 ? 1 : 0.75} strokeDasharray={beam < 1 ? undefined : '10 12'} style={{ filter: `drop-shadow(0 0 ${beam < 1 ? 26 : 10}px ${C.warn})` }} />
          {beam >= 1 && [0, 1, 2, 3].map(i => { const u = (t * 1.5 + i / 4) % 1; return <Dot key={i} x={lerp(cx, EAR[0] - 60, u)} y={lerp(cy, EAR[1] + 30, u)} r={7} c={C.warn} />; })}
          {beam >= 1 && (() => { const ph = prog(t, 19.82, 20.7); return <circle cx={EAR[0]} cy={EAR[1]} r={70 + ph * 150} fill="none" stroke={C.warn} strokeWidth={6 * (1 - ph)} opacity={1 - ph} />; })()}
          {beam >= 1 && <circle cx={EAR[0]} cy={EAR[1]} r={78} fill="none" stroke={C.warn} strokeWidth={4} opacity={0.6 + 0.4 * Math.sin(t * 7)} style={{ filter: `drop-shadow(0 0 16px ${C.warn})` }} />}
        </g>}
      </Svg>
      <div style={{ opacity: pe(t, 19.3, 19.6) }}><Planet id="e4" kind="earth" x={EAR[0]} y={EAR[1]} r={64} t={t} spin={0.04} /></div>
      <div style={{ position: 'absolute', left: 1500, top: 312, width: 460, textAlign: 'center', fontFamily: FONT, fontSize: 22, letterSpacing: 4, fontWeight: 700, color: C.warn, opacity: pe(t, 19.85, 20.1) }}>EARTH · NOTIFIED</div>
      {/* one ALERT: slams in, then becomes the header of the decision card */}
      <div style={{ position: 'absolute', left: 1010, top: 372, width: 800, height: 430 * card, background: C.panel, border: `2px solid ${C.warn}88`, borderTop: 'none', opacity: clamp01(card * 3), boxShadow: `0 0 40px ${C.warn}22` }} />
      <div style={{ position: 'absolute', left: 1010, top: 372, width: 800, height: 6, background: C.warn, boxShadow: `0 0 24px ${C.warn}`, opacity: slam }} />
      <div style={{ position: 'absolute', left: 1040, top: 392, display: 'flex', alignItems: 'center', gap: 22, fontFamily: FONT, transform: `scale(${lerp(2.1 - 1.1 * slam, 0.62, card)})`, transformOrigin: '0 0', opacity: clamp01(slam * 4) }}>
        <svg width={120} height={120} viewBox="0 0 16 16" fill="none" stroke={C.warn} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 14px ${C.warn})` }}><path d="M8 2.2L14.2 13H1.8Z" /><path d="M8 6.5v3.3M8 11.6v.1" /></svg>
        <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: 4, color: C.warn, textShadow: `0 0 50px ${C.warn}`, lineHeight: 1 }}>ALERT</div>
      </div>
      <div style={{ position: 'absolute', left: 1046, right: 140, top: 492, fontFamily: FONT, opacity: pe(t, 20.2, 20.6), transform: `translateY(${(1 - pe(t, 20.2, 20.6)) * 20}px)` }}>
        <div style={{ fontSize: 22, letterSpacing: 4, color: C.cyan, fontWeight: 700 }}>WHAT TO DO NOW</div>
        <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.18, color: C.fg, marginTop: 4 }}>{data.copy.action}</div>
      </div>
      {rows.map(([txt, s0], i) => { const p = pe(t, s0, s0 + 0.28); return <div key={i} style={{ position: 'absolute', left: 1046, top: 632 + i * 52, opacity: p, transform: `translateX(${(1 - p) * 40}px)`, display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT, fontSize: 30, fontWeight: 600, color: C.fg }}><Check p={p} />{txt}</div>; })}
      <div style={{ position: 'absolute', left: 1010, top: 150, width: 600, height: 150, opacity: mc, transform: `scale(${0.85 + 0.15 * mc})`, transformOrigin: '100% 50%', background: C.panel, border: `2px solid ${C.warn}`, boxShadow: `0 0 34px ${C.warn}55`, fontFamily: FONT, padding: '16px 24px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 20, letterSpacing: 4, color: C.muted, fontWeight: 700 }}>MISSION CONTROL · EARTH</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 4 }}><span style={{ fontSize: 50, fontWeight: 700, color: C.fg }}>A-02</span><span style={{ fontSize: 34, fontWeight: 700, color: C.warn }}>ALERT</span></div>
        <div style={{ fontSize: 23, color: C.fg }}>dust-exposure pattern · <span style={{ color: C.good, fontWeight: 700 }}>received</span></div>
      </div>
    </div>
  );
};

/* ================= V5 · impact (23.9 – 26.75) ================= */
export const V5 = ({ t }) => {
  if (t < 23.85 || t > 27.0) return null;
  const hl = easeIO(prog(t, 23.85, 24.35)), o = 1 - prog(t, 26.65, 26.9);
  const a = pe(t, 24.15, 24.55), b = pe(t, 25.4, 25.8), ring = pe(t, 24.2, 25.4);
  const dots = [0, 1, 2, 3];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, clipPath: hl < 1 ? `inset(0 0 ${(1 - hl) * 100}% 0)` : 'none' }}>
      <Svg>
        <circle cx={960} cy={520} r={350} fill="none" stroke={C.good} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} transform="rotate(-90 960 520)" style={{ filter: `drop-shadow(0 0 18px ${C.good})` }} />
        <circle cx={960} cy={520} r={378} fill="none" stroke={C.good} strokeWidth={2} strokeDasharray="4 16" opacity={0.5 * ring} transform={`rotate(${t * 14} 960 520)`} />
      </Svg>
      <div style={{ position: 'absolute', left: 70, top: 420, width: 470, fontFamily: FONT, opacity: a, transform: `translateX(${(1 - a) * -70}px)`, textAlign: 'right' }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, color: C.fg }}>PROTECTING<br /><span style={{ color: C.good, textShadow: `0 0 30px ${C.good}` }}>ASTRONAUTS</span></div>
        <div style={{ fontSize: 28, color: C.muted, marginTop: 14 }}>a clear next step, in their hands</div>
      </div>
      <div style={{ position: 'absolute', left: 1400, top: 420, width: 480, fontFamily: FONT, opacity: b, transform: `translateX(${(1 - b) * 70}px)` }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, color: C.fg }}>PRESERVING<br /><span style={{ color: C.good, textShadow: `0 0 30px ${C.good}` }}>MISSIONS</span></div>
        <div style={{ display: 'flex', gap: 18, marginTop: 22 }}>{dots.map(i => { const on = t > 25.7 + i * 0.14; return <div key={i} style={{ width: 40, height: 40, borderRadius: 20, background: on ? C.good : `${C.cyan}44`, border: `2px solid ${on ? C.good : C.cyan}`, boxShadow: on ? `0 0 16px ${C.good}` : 'none' }} />; })}<div style={{ fontSize: 24, color: C.muted, alignSelf: 'center', marginLeft: 6 }}>crew safe</div></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 932, textAlign: 'center', fontFamily: FONT, fontSize: 24, letterSpacing: 8, color: C.muted, opacity: pe(t, 25.0, 25.5) }}>FARTHER FROM EARTH · MORE MEDICAL AUTONOMY</div>
    </div>
  );
};

/* ================= V6 · closing (26.75 – 29.5) ================= */
export const NODE6 = [330, 215];
export const V6 = ({ t }) => {
  if (t < 26.7) return null;
  const xs = [330, 750, 1170, 1590], y = 215, fire = 27.55;
  const reach = i => fire + i * 0.2, on = i => t > reach(i);
  const w1 = pe(t, 26.96, 27.2), w2 = pe(t, 27.55, 27.8);
  const names = ['ASTRONAUT', 'BLUETOOTH', 'AIneedHealth', 'EARTH CONTROL'];
  const hero = prog(t, fire, fire + 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Svg>
        {[0, 1, 2].map(i => <line key={i} x1={xs[i] + 82} y1={y} x2={xs[i + 1] - 82} y2={y} stroke={on(i + 1) ? C.good : C.dim} strokeWidth={3} strokeDasharray="9 11" opacity={pe(t, 26.85 + i * 0.05, 27.1 + i * 0.05) * (on(i + 1) ? 0.9 : 0.4)} />)}
        {t > fire && hero < 1 && [0, 1, 2, 3, 4].map(k => <Dot key={k} x={lerp(xs[0], xs[3], clamp01(hero - k * 0.02))} y={y} r={16 - k * 2.5} c="#eafff4" o={1 - k * 0.18} />)}
        {t > fire + 0.6 && Array.from({ length: 9 }, (_, i) => { const u = (t * 0.7 + i / 9) % 1; return <Dot key={i} x={lerp(xs[0] + 82, xs[3] - 82, u)} y={y} r={6} c={C.good} />; })}
        {xs.map((x, i) => on(i) && [0, 1].map(k => { const ph = ((t - reach(i)) * 0.8 + k / 2) % 1; return <circle key={`${i}${k}`} cx={x} cy={y} r={78 + ph * 70} fill="none" stroke={C.good} strokeWidth={3} opacity={(1 - ph) * 0.55} />; }))}
      </Svg>
      {xs.map((x, i) => {
        const p = pe(t, 26.85 + i * 0.06, 27.15 + i * 0.06), col = on(i) ? C.good : C.cyan, pop = on(i) ? 1 + 0.25 * Math.max(0, 1 - (t - reach(i)) / 0.35) : 1;
        return <div key={i} style={{ position: 'absolute', left: x - 110, top: y - 78, width: 220, textAlign: 'center', opacity: p, fontFamily: FONT, color: C.fg }}>
          <div style={{ width: 156, height: 156, margin: '0 auto', borderRadius: 78, border: `4px solid ${col}`, background: i === 0 ? 'transparent' : `${col}1f`, boxShadow: `0 0 ${on(i) ? 46 : 18}px ${col}99`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pop})` }}>
            {i === 1 ? <BT size={92} color={col} sw={2} /> : i === 2 ? <div style={{ fontSize: 62, fontWeight: 700, color: col }}>AI</div> : i === 3 ? <svg width={96} height={96} viewBox="0 0 48 48" fill="none" stroke={col} strokeWidth={2.4}><circle cx={24} cy={24} r={18} /><path d="M6 24h36M24 6c-8 9-8 27 0 36M24 6c8 9 8 27 0 36" /></svg> : null}
          </div>
          <div style={{ marginTop: 12, fontSize: 21, fontWeight: 700, letterSpacing: 3, color: on(i) ? C.fg : C.muted, whiteSpace: 'nowrap' }}>{names[i]}</div>
        </div>;
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 388, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 150, letterSpacing: -3, lineHeight: 1, color: C.fg, opacity: clamp01(w1 * 4), transform: `scale(${1.5 - 0.5 * w1})`, textShadow: '0 0 34px rgba(217,239,246,.4)', filter: w1 < 0.9 ? `blur(${(1 - w1) * 10}px)` : 'none' }}>MAKE DECISIONS</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 548, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 150, letterSpacing: -3, lineHeight: 1, color: C.good, opacity: clamp01(w2 * 4), transform: `scale(${1.5 - 0.5 * w2})`, textShadow: `0 0 54px ${C.good}`, filter: w2 < 0.9 ? `blur(${(1 - w2) * 10}px)` : 'none' }}>IN REAL TIME.</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 736, textAlign: 'center', fontFamily: FONT, fontSize: 46, fontWeight: 600, color: C.fg, opacity: pe(t, 28.05, 28.45), transform: `translateY(${(1 - pe(t, 28.05, 28.45)) * 18}px)` }}>From information to action in seconds.</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 838, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, fontFamily: FONT, opacity: pe(t, 28.35, 28.75) }}>
        <div style={{ fontSize: 20, color: C.muted, letterSpacing: 4 }}>BASED ON</div>
        <div style={{ padding: '5px 16px', border: `2px solid ${C.cyan}99`, color: C.cyan, fontSize: 24, fontWeight: 700 }}>NASA-STD-3001</div>
        <div style={{ padding: '5px 16px', border: `2px solid ${C.cyan}99`, color: C.cyan, fontSize: 24, fontWeight: 700 }}>NASA Human Research Program</div>
        <div style={{ fontSize: 22, color: C.dim, marginLeft: 14 }}>github.com/MatheusRyans/Nasa-Space-Apps-2026</div>
      </div>
    </div>
  );
};
