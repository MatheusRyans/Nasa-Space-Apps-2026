import React from 'react';
import { Img, staticFile } from 'remotion';
import data from './data.json';
import { C, FONT, LV, clamp01, easeIO, fade, pe, prog, rng, fmt } from './util.js';
import { Panel, Ecg } from './Scenes.jsx';
import { Hologram } from './Hologram.jsx';

export const hp = (vx, vy, [cx, cy, s]) => [cx + (vx * 1.5 - 360) * s, cy + (vy * 1.5 - 375) * s];
const LEVEL_NAMES = ['GOOD', 'ALERT', 'ATTENTION', 'CRITICAL'];

/* ---------- building blocks ---------- */
const BT = ({ size = 40, color = C.cyan, sw = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l10 10-5 5V2l5 5L7 17" /></svg>
);
const Chip = ({ x, y, o = 1, tx = 0, color = C.cyan, children, size = 26 }) => (
  <div style={{ position: 'absolute', left: x, top: y, opacity: o, transform: `translateX(${tx}px)`, padding: '10px 22px', background: C.panel, border: `2px solid ${color}66`, borderLeft: `7px solid ${color}`, fontFamily: FONT, fontSize: size, fontWeight: 600, color: C.fg, whiteSpace: 'nowrap', boxShadow: `0 0 24px ${color}33` }}>{children}</div>
);
const FNode = ({ x, y, w, h, title, sub, color = C.cyan, o = 1, lit = 0, icon, fs = 27 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, transform: `scale(${0.9 + 0.1 * o})`, background: lit ? `${color}26` : C.panel, border: `2px solid ${lit ? color : C.line}`, boxShadow: lit ? `0 0 34px ${color}66` : 'none', fontFamily: FONT, color: C.fg, display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', boxSizing: 'border-box' }}>
    {icon}<div><div style={{ fontSize: fs, fontWeight: 700, whiteSpace: 'nowrap' }}>{title}</div>{sub && <div style={{ fontSize: 19, color: C.muted, whiteSpace: 'nowrap' }}>{sub}</div>}</div>
  </div>
);
const Link = ({ x1, y1, x2, y2, t, o = 1, color = C.cyan, n = 3, speed = 0.6, dashed = true }) => (
  <g opacity={o}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? '9 11' : undefined} opacity={0.65} />
    {Array.from({ length: n }, (_, i) => { const p = (t * speed + i / n) % 1; return <circle key={i} cx={x1 + (x2 - x1) * p} cy={y1 + (y2 - y1) * p} r={8} fill={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />; })}
  </g>
);
const Ring3D = ({ cx, cy, r, t, color = C.cyan, speed = 20, o = 1, tilt = 72 }) => (
  <div style={{ position: 'absolute', inset: 0, perspective: 1300, perspectiveOrigin: `${cx}px ${cy - 300}px`, opacity: o, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', border: `3px dashed ${color}99`, boxShadow: `0 0 30px ${color}55, inset 0 0 30px ${color}33`, transform: `rotateX(${tilt}deg) rotateZ(${t * speed}deg)` }} />
    <div style={{ position: 'absolute', left: cx - r * 0.72, top: cy - r * 0.72, width: r * 1.44, height: r * 1.44, borderRadius: '50%', border: `2px solid ${color}77`, transform: `rotateX(${tilt}deg) rotateZ(${-t * speed * 1.4}deg)` }} />
  </div>
);

const BLOBS = (k, r0) => { const r = rng(k); return Array.from({ length: 16 }, () => ({ x: (r() * 4 - 2) * r0, y: (r() * 1.7 - 0.85) * r0, rx: (0.18 + r() * 0.4) * r0, ry: (0.08 + r() * 0.2) * r0 })); };
export const Planet = ({ x, y, r, t, kind, id, spin = 0.025 }) => {
  const earth = kind === 'earth';
  const [c1, c2, c3] = earth ? ['#9bdcff', '#1f72bd', '#06264a'] : ['#ffbb86', '#b9491d', '#3b1207'];
  const blob = earth ? 'rgba(112,224,150,.8)' : 'rgba(80,26,8,.5)';
  const W = 4 * r, off = ((t * spin) % 1) * W;
  const bl = BLOBS(earth ? 3 : 8, r);
  const g = (dx) => bl.map((b, i) => <ellipse key={i} cx={b.x + dx} cy={b.y} rx={b.rx} ry={b.ry} fill={blob} />);
  return (
    <svg style={{ position: 'absolute', left: x - 2 * r, top: y - 2 * r }} width={4 * r} height={4 * r} viewBox={`${-2 * r} ${-2 * r} ${4 * r} ${4 * r}`}>
      <defs>
        <radialGradient id={'pb' + id} cx="35%" cy="32%" r="80%"><stop offset="0" stopColor={c1} /><stop offset=".55" stopColor={c2} /><stop offset="1" stopColor={c3} /></radialGradient>
        <radialGradient id={'ps' + id} cx="32%" cy="30%" r="85%"><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".78" /></radialGradient>
        <radialGradient id={'pg' + id}><stop offset=".62" stopColor={c1} stopOpacity=".35" /><stop offset="1" stopColor={c1} stopOpacity="0" /></radialGradient>
        <clipPath id={'pc' + id}><circle r={r} /></clipPath>
      </defs>
      <circle r={r * 1.9} fill={`url(#pg${id})`} />
      <circle r={r} fill={`url(#pb${id})`} />
      <g clipPath={`url(#pc${id})`}><g transform={`translate(${-off} 0)`}>{g(0)}{g(W)}</g></g>
      <circle r={r} fill={`url(#ps${id})`} />
      <circle r={r * 1.015} fill="none" stroke={c1} strokeOpacity=".55" strokeWidth={r * 0.02} />
    </svg>
  );
};

const STARS = (() => { const r = rng(5); return Array.from({ length: 150 }, () => ({ x: r() * 2000, y: r() * 1150, d: r(), s: r() * 2 + 0.6, ph: r() * 6 })); })();
export const Stars = ({ t }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    {STARS.map((s, i) => <circle key={i} cx={((s.x - t * (3 + s.d * 16)) % 2000 + 2000) % 2000 - 40} cy={s.y - 35} r={s.s * (0.5 + s.d)} fill="#cdeff6" opacity={(0.25 + 0.5 * s.d) * (0.75 + 0.25 * Math.sin(t * 2 + s.ph))} />)}
  </svg>
);

export const SceneWrap = ({ t, a, b, children }) => {
  const fin = a <= 0 ? 1 : easeIO(prog(t, a - 0.25, a + 0.4)), fout = easeIO(prog(t, b - 0.4, b));
  const sc = (0.8 + 0.2 * fin) * (1 + 0.45 * fout), blur = (1 - fin) * 16 + fout * 18;
  return <div style={{ position: 'absolute', inset: 0, opacity: fin * (1 - fout), transform: `scale(${sc})`, filter: blur > 0.4 ? `blur(${blur}px)` : 'none' }}>{children}</div>;
};

export const Source = ({ t, a, b, doc, note }) => {
  const o = fade(t, a, b, 0.4, 0.5), p = pe(t, a, a + 0.55);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 60, top: 34, opacity: o, transform: `translateX(${(1 - p) * -80}px)`, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 26px 10px 16px', background: 'rgba(5,16,26,.88)', border: `2px solid ${C.line}`, borderLeft: `8px solid ${C.cyan}`, fontFamily: FONT, boxShadow: '0 0 30px rgba(111,224,238,.18)' }}>
      <svg width={30} height={36} viewBox="0 0 24 28" fill="none" stroke={C.cyan} strokeWidth={2} strokeLinejoin="round"><path d="M4 2h11l5 5v19H4z" /><path d="M15 2v5h5M8 13h8M8 17h8M8 21h5" /></svg>
      <div><div style={{ fontSize: 14, letterSpacing: 4, color: C.cyan, fontWeight: 700 }}>SOURCE</div><div style={{ fontSize: 24, fontWeight: 700, color: C.fg, whiteSpace: 'nowrap' }}>{doc}</div>{note && <div style={{ fontSize: 19, color: C.muted, whiteSpace: 'nowrap' }}>{note}</div>}</div>
    </div>
  );
};

/* ---------- S0: opening + team ---------- */
const MEMBERS = ['Clara Beatriz', 'Matheus Ryan', 'Cauã Mesquita', 'Álvaro Boaventura'];
export const S0 = ({ t }) => {
  const zoom = 1.55 - 0.55 * pe(t, 0, 1.2), cp = pe(t, 0.8, 1.5), blurB = 7 * cp;
  const dly = Math.round(20 * pe(t, 0.2, 1.4));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '72% 56%', filter: `blur(${blurB}px)`, opacity: 1 - 0.35 * cp }}>
        <Planet id="m0" kind="mars" x={1400} y={620} r={330} t={t} spin={0.012} />
        <Planet id="e0" kind="earth" x={330} y={290} r={46} t={t} spin={0.05} />
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}><Link x1={380} y1={300} x2={1150} y2={540} t={t} n={4} speed={0.5} /></svg>
        <div style={{ position: 'absolute', left: 560, top: 360, fontFamily: FONT, fontWeight: 700, fontSize: 56, color: C.cyan, textShadow: `0 0 24px ${C.cyan}` }}>~{dly} min <span style={{ fontSize: 28, color: C.muted, fontWeight: 600 }}>one-way delay</span></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 55, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 104, letterSpacing: -3, opacity: cp, transform: `translateY(${(1 - cp) * -30}px)` }}>
        <span style={{ color: C.cyan, textShadow: `0 0 30px ${C.cyan}` }}>AI</span>needHealth
      </div>
      <div style={{ position: 'absolute', left: 510, top: 195, width: 900, height: 506, opacity: cp, transform: `scale(${0.72 + 0.28 * cp})`, filter: `drop-shadow(0 0 26px ${C.cyan}88)` }}>
        <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, calc(100% - 44px) 0, 100% 44px, 100% 100%, 44px 100%, 0 calc(100% - 44px))' }}>
          <Img src={staticFile('team/team.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,13,21,0) 60%, rgba(5,13,21,.55))' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: `${((t * 0.9) % 1) * 100}%`, height: 8, background: 'rgba(111,224,238,.6)', boxShadow: `0 0 26px ${C.cyan}` }} />
          <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 4px ${C.cyan}` }} />
        </div>
      </div>
      {MEMBERS.map((m, i) => {
        const p = pe(t, 1.15 + i * 0.1, 1.55 + i * 0.1);
        return (
          <div key={m} style={{ position: 'absolute', left: 510 + i * 226, top: 735, width: 214, opacity: p, transform: `translateY(${(1 - p) * 26}px)`, padding: '10px 0', textAlign: 'center', background: C.panel, borderTop: `4px solid ${C.cyan}`, fontFamily: FONT, color: C.fg }}>
            <div style={{ fontSize: 15, letterSpacing: 4, color: C.cyan, fontWeight: 700 }}>0{i + 1}</div>
            <div style={{ fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap' }}>{m}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 858, textAlign: 'center', fontFamily: FONT, fontSize: 26, letterSpacing: 8, color: C.muted, opacity: pe(t, 1.5, 1.9) }}>SPACE APPS CHALLENGE 2026 · HEALTH MONITORING FOR ASTRONAUTS</div>
    </div>
  );
};

/* ---------- S1: the problem ---------- */
export const S1 = ({ t }) => {
  const a = 2.3;
  const dly = Math.round(20 * pe(t, 2.8, 4.1));
  const chain = [['ASTRONAUT', 'one body', 5.5], ['CREW', 'shared risk', 6.3], ['MISSION', 'everything at stake', 7.0]];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Planet id="e1" kind="earth" x={250} y={330} r={120} t={t} spin={0.03} />
      <Planet id="m1" kind="mars" x={1690} y={310} r={140} t={t} spin={0.018} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Link x1={380} y1={330} x2={1550} y2={310} t={t} n={4} speed={0.35} o={pe(t, 2.6, 3.0)} />
        {chain.map((c, i) => i < 2 && <line key={i} x1={1500} x2={1500} y1={652 + i * 96} y2={688 + i * 96} stroke={C.crit} strokeWidth={3} opacity={pe(t, c[2], c[2] + 0.3)} />)}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: FONT, opacity: pe(t, 2.7, 3.1) }}>
        <div style={{ fontSize: 22, letterSpacing: 8, color: C.muted, fontWeight: 600 }}>SIGNAL DELAY · EARTH ↔ MARS</div>
        <div style={{ fontSize: 120, fontWeight: 700, color: C.cyan, textShadow: `0 0 34px ${C.cyan}88`, lineHeight: 1.05 }}>~{dly} min</div>
        <div style={{ fontSize: 26, color: C.muted }}>one way · no instant help</div>
      </div>
      <Ring3D cx={960} cy={830} r={250} t={t} o={pe(t, 2.9, 3.4)} />
      <Chip x={110} y={640} o={pe(t, 4.0, 4.4)} tx={(1 - pe(t, 4.0, 4.4)) * -70} color={C.crit}>NO DOCTOR ON BOARD</Chip>
      <Chip x={110} y={722} o={pe(t, 4.5, 4.9)} tx={(1 - pe(t, 4.5, 4.9)) * -70} color={C.crit}>NO FAST EVACUATION</Chip>
      <Chip x={110} y={804} o={pe(t, 5.0, 5.4)} tx={(1 - pe(t, 5.0, 5.4)) * -70} color={C.warn}>LONG-DURATION MISSION</Chip>
      {chain.map((c, i) => {
        const p = pe(t, c[2], c[2] + 0.35), hot = t > c[2] + 0.2;
        return <FNode key={i} x={1290} y={600 + i * 96} w={420} h={64} title={c[0]} sub={null} color={C.crit} o={0.35 + 0.65 * p} lit={hot ? 1 : 0} icon={<div style={{ width: 14, height: 14, borderRadius: 7, background: hot ? C.crit : C.dim, boxShadow: hot ? `0 0 14px ${C.crit}` : 'none' }} />} />;
      })}
      <div style={{ position: 'absolute', left: 1290, top: 560, fontFamily: FONT, fontSize: 22, letterSpacing: 4, color: C.crit, fontWeight: 700, opacity: pe(t, 5.3, 5.6) }}>ONE FAILING BODY →</div>
      {[[760, 580, 'HR'], [1130, 560, 'SpO₂']].map(([x, y, l], i) => (
        <div key={i} style={{ position: 'absolute', left: x, top: y + Math.sin(t * 1.7 + i) * 7, opacity: pe(t, 3.6 + i * 0.3, 4 + i * 0.3) * (0.6 + 0.4 * Math.sin(t * 6 + i)), fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.warn, padding: '6px 16px', border: `2px solid ${C.warn}88`, background: C.panel }}>{l} ?</div>
      ))}
    </div>
  );
};

/* ---------- S2: Bluetooth ---------- */
export const P2 = [960, 590, 0.85];
export const S2 = ({ t }) => {
  const sensors = [{ v: [240, 167], l: 'ECG patch', dx: 140, dy: -30, s: 8.6 }, { v: [155, 266], l: 'Wrist band', dx: -330, dy: 10, s: 8.9 }, { v: [240, 62], l: 'Temp band', dx: 130, dy: -45, s: 9.2 }];
  const nodes = [['SENSORS', 'biometric', 150], ['ASTRONAUT', 'wearing', 590], ['AIneedHealth', 'smart system', 1030], ['MISSION CONTROL', 'Earth', 1470]];
  const pk = Math.floor(12000 + (t - 8) * 61);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {nodes.slice(0, 3).map((n, i) => <Link key={i} x1={n[2] + 300} y1={206} x2={nodes[i + 1][2]} y2={206} t={t} n={3} speed={0.9} o={pe(t, 9.0 + i * 0.35, 9.4 + i * 0.35)} />)}
        {sensors.map((s, k) => {
          const [px, py] = hp(s.v[0], s.v[1], P2), on = pe(t, s.s, s.s + 0.4);
          return <g key={k} opacity={on}>
            {[0, 1, 2].map(i => { const ph = ((t * 0.9) + i / 3) % 1; return <circle key={i} cx={px} cy={py} r={14 + ph * 120} fill="none" stroke={C.cyan} strokeWidth={3} opacity={(1 - ph) * 0.9} />; })}
            <circle cx={px} cy={py} r={9} fill={C.cyan} style={{ filter: `drop-shadow(0 0 12px ${C.cyan})` }} />
            <line x1={px} y1={py} x2={px + s.dx} y2={py + s.dy} stroke={C.cyan} strokeWidth={2} opacity={0.7} />
          </g>;
        })}
      </svg>
      {sensors.map((s, k) => {
        const [px, py] = hp(s.v[0], s.v[1], P2), on = pe(t, s.s + 0.1, s.s + 0.5);
        return <div key={k} style={{ position: 'absolute', left: px + s.dx + (s.dx < 0 ? -230 : 0), top: py + s.dy - 26, width: 230, opacity: on, display: 'flex', alignItems: 'center', gap: 10, flexDirection: s.dx < 0 ? 'row-reverse' : 'row', fontFamily: FONT, color: C.fg, fontSize: 24, fontWeight: 600, padding: s.dx < 0 ? '0 0 0 0' : 0 }}><BT size={38} /><span style={{ whiteSpace: 'nowrap' }}>{s.l}</span></div>;
      })}
      {nodes.map((n, i) => <FNode key={i} x={n[2]} y={160} w={300} h={92} title={n[0]} sub={n[1]} o={pe(t, 8.3 + i * 0.3, 8.7 + i * 0.3)} lit={t > 9.2 + i * 0.35 ? 1 : 0} color={i === 3 ? C.good : C.cyan} />)}
      {[0, 1, 2].map(i => <div key={i} style={{ position: 'absolute', left: nodes[i][2] + 300 + 10, top: 138, width: 120, textAlign: 'center', opacity: pe(t, 9.2 + i * 0.35, 9.6 + i * 0.35) }}><BT size={30} /></div>)}
      <div style={{ position: 'absolute', left: 90, top: 270, opacity: pe(t, 10.6, 11.0), transform: `scale(${0.85 + 0.15 * pe(t, 10.6, 11.0)})`, fontFamily: FONT, color: C.fg }}>
        <svg width={170} height={110} viewBox="0 0 170 110" fill="none" strokeLinecap="round"><path d="M8 80 q30 -70 70 -30 t70 -35" stroke={C.dim} strokeWidth={9} /><path d="M20 100 L150 8" stroke={C.crit} strokeWidth={9} /></svg>
        <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1 }}>NO CABLES</div>
        <div style={{ fontSize: 26, color: C.muted, marginTop: 8 }}>fully wireless wearables</div>
      </div>
      <Chip x={1330} y={760} o={pe(t, 12.2, 12.6)} size={22}>ISS TEST · BLUETOOTH ADAPTOR → LAPTOP</Chip>
      <Panel x={1440} y={420} w={380} h={300} title="Live link" o={pe(t, 11.5, 11.9)} tx={(1 - pe(t, 11.5, 11.9)) * 80}>
        <div style={{ position: 'absolute', left: 26, top: 22, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontSize: 28, fontWeight: 700 }}><BT size={36} /> BLUETOOTH LE</div>
        <div style={{ position: 'absolute', left: 26, top: 84, display: 'flex', gap: 8, alignItems: 'flex-end' }}>{[28, 46, 64, 84].map((h, i) => <div key={i} style={{ width: 20, height: h * (0.75 + 0.25 * Math.sin(t * 5 + i)), background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }} />)}</div>
        <div style={{ position: 'absolute', right: 26, top: 88, fontFamily: FONT, textAlign: 'right' }}><div style={{ fontSize: 20, color: C.muted, letterSpacing: 3 }}>PACKETS</div><div style={{ fontSize: 48, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pk.toLocaleString('en-US')}</div></div>
        <div style={{ position: 'absolute', left: 26, right: 26, bottom: 24, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: C.good }}>● CONTINUOUS · SIMULATED</div>
      </Panel>
    </div>
  );
};

/* ---------- S3: analysis ---------- */
const spark = (seed, end) => { const r = rng(seed); return Array.from({ length: 24 }, (_, i) => 0.25 + 0.15 * (r() - 0.5) + (end - 0.25) * Math.pow(i / 23, 2.2)); };
export const S3 = ({ t }) => {
  const steps = ['DATA', 'CORRELATION', 'INTERPRETATION', 'RISK', 'DECISION'], ts = [13.75, 15.1, 16.3, 17.4, 18.25];
  const S = data.sleep, sy = data.dust.symptoms;
  const cw = 520, ch = 270, lo = 5.4, hi = 8.6;
  const X = i => 20 + (i / (S.series.length - 1)) * (cw - 40), Y = v => 14 + (1 - (v - lo) / (hi - lo)) * (ch - 28);
  const path = S.series.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const draw = pe(t, 14.1, 15.8), al = pe(t, 15.8, 16.2);
  const sparks = sy.map((s, i) => ({ label: s.label, cur: s.cur, pts: spark(10 + i, Math.min(0.95, s.cur / 2.2)) }));
  const mk = pe(t, 17.5, 18.2);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {steps.map((s, i) => <React.Fragment key={s}>
        <FNode fs={22} x={650 + i * 240} y={150} w={226} h={84} title={s} o={pe(t, 13.55 + i * 0.1, 13.9 + i * 0.1)} lit={t > ts[i] ? 1 : 0} color={i === 4 ? C.good : C.cyan} />
        {i < 4 && <div style={{ position: 'absolute', left: 650 + i * 240 + 226, top: 178, width: 14, color: t > ts[i] ? C.cyan : C.dim, fontSize: 30, textAlign: 'center', opacity: pe(t, 13.7 + i * 0.1, 14 + i * 0.1) }}>▸</div>}
      </React.Fragment>)}
      <Panel x={650} y={290} w={cw + 40} h={ch + 90} title="Baseline" o={pe(t, 13.9, 14.3)} tx={(1 - pe(t, 13.9, 14.3)) * 70}>
        <svg width={cw + 40} height={ch + 90} style={{ position: 'absolute', left: 10, top: 20 }}>
          <rect x={20} y={Y(S.mean + S.sd)} width={cw - 40} height={Y(S.mean - S.sd) - Y(S.mean + S.sd)} fill="rgba(111,224,238,.17)" opacity={pe(t, 14.0, 14.5)} />
          <text x={cw - 24} y={Y(S.mean + S.sd) - 8} textAnchor="end" fill={C.cyan} fontSize={22} fontWeight={700} fontFamily={FONT} opacity={pe(t, 14.3, 14.7)}>PERSONAL BASELINE</text>
          <path d={path} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} fill="none" stroke={C.fg} strokeWidth={4} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(111,224,238,.8))' }} />
          {[S.series.length - 3, S.series.length - 2, S.series.length - 1].map(i => <circle key={i} cx={X(i)} cy={Y(S.series[i])} r={9 * al} fill={C.warn} style={{ filter: `drop-shadow(0 0 10px ${C.warn})` }} />)}
          <text x={20} y={ch + 54} fill={C.warn} fontSize={24} fontWeight={700} fontFamily={FONT} opacity={al}>sleep: 3 days below baseline</text>
        </svg>
      </Panel>
      <Panel x={1250} y={290} w={570} h={ch + 90} title="Correlation" o={pe(t, 14.6, 15.0)} tx={(1 - pe(t, 14.6, 15.0)) * 70}>
        {sparks.map((s, i) => {
          const w = 300, h = 66, d = pe(t, 15.2 + i * 0.25, 16.4 + i * 0.25);
          const p = s.pts.map((v, j) => `${j ? 'L' : 'M'}${(j / 23) * w} ${h - v * h}`).join('');
          return <div key={i} style={{ position: 'absolute', left: 26, top: 40 + i * 98, width: 520, fontFamily: FONT, color: C.fg }}>
            <div style={{ position: 'absolute', left: 0, top: 18, fontSize: 28, fontWeight: 700 }}>{s.label}</div>
            <svg width={w} height={h} style={{ position: 'absolute', left: 130, top: 0 }}><path d={p} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d} fill="none" stroke={C.warn} strokeWidth={4} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px ${C.warn})` }} /></svg>
            <div style={{ position: 'absolute', right: 0, top: 12, fontSize: 36, fontWeight: 700, color: C.warn, opacity: d, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.cur * d, 1)}<span style={{ fontSize: 20, color: C.muted }}>/3</span></div>
          </div>;
        })}
        <div style={{ position: 'absolute', left: 26, bottom: 20, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.cyan, opacity: pe(t, 16.6, 17.0) }}>3 signals moving together → pattern</div>
      </Panel>
      <Panel x={650} y={705} w={1170} h={190} title="Risk" o={pe(t, 16.9, 17.3)} tx={(1 - pe(t, 16.9, 17.3)) * 70} color={C.warn}>
        <div style={{ position: 'absolute', left: 30, top: 34, right: 360, display: 'flex', gap: 8 }}>
          {LEVEL_NAMES.map((n, i) => <div key={n} style={{ flex: 1, height: 56, background: `${LV[i]}${i === 1 && mk > 0.8 ? '55' : '22'}`, border: `2px solid ${LV[i]}${i === 1 && mk > 0.8 ? '' : '66'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 21, fontWeight: 700, color: LV[i] }}>{n}</div>)}
        </div>
        <div style={{ position: 'absolute', top: 100, left: 124 + 197 * mk - 13, width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderBottom: `20px solid ${C.warn}`, opacity: mk, filter: `drop-shadow(0 0 8px ${C.warn})` }} />
        <div style={{ position: 'absolute', right: 30, top: 24, width: 310, fontFamily: FONT, color: C.fg, opacity: pe(t, 17.6, 18.0) }}>
          <div style={{ fontSize: 24, color: C.muted, letterSpacing: 3, fontWeight: 600 }}>INTERPRETATION</div>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>Dust-exposure pattern</div>
          <div style={{ fontSize: 24, color: C.warn, fontWeight: 600 }}>confidence {data.dust.conf}</div>
        </div>
      </Panel>
    </div>
  );
};

/* ---------- S4: the WOW moment ---------- */
export const P4 = [560, 540, 1];
export const S4 = ({ t }) => {
  const hit = 19.16, st = prog(t, hit, hit + 0.5), stamp = t > hit && t < 20.7 ? 1 : 0;
  const stampS = 2.4 - 1.4 * pe(t, hit, hit + 0.3);
  const [cx, cy] = hp(240, 167, P4);
  const sw = prog(t, hit, hit + 1.1);
  const rows = [['Crew informed', 20.4], ['Mission control notified', 22.0], ['Protocol started', 22.7]];
  const arrive = pe(t, 21.3, 22.0);
  const pk = (k) => { const p = clamp01((t - 21.0 - k * 0.12) / 0.9); return [cx + (1060 - cx) * p, cy + (310 - cy) * p - Math.sin(p * Math.PI) * 120, p]; };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {t > hit && sw < 1 && <circle cx={cx} cy={cy} r={40 + sw * 700} fill="none" stroke={C.warn} strokeWidth={10 * (1 - sw)} opacity={1 - sw} />}
        {t > 21.0 && [0, 1, 2, 3, 4].map(k => { const [x, y, p] = pk(k); return p > 0 && p < 1 ? <circle key={k} cx={x} cy={y} r={11 - k} fill={C.warn} style={{ filter: `drop-shadow(0 0 14px ${C.warn})` }} /> : null; })}
      </svg>
      {stamp ? <div style={{ position: 'absolute', left: 60, width: 1000, top: 380, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 210, letterSpacing: 8, color: C.warn, textShadow: `0 0 60px ${C.warn}`, transform: `scale(${stampS})`, opacity: 1 - pe(t, 20.2, 20.7) }}>ALERT</div> : null}
      <Panel x={1060} y={140} w={760} h={320} title="Mission control · Earth" o={pe(t, 19.4, 19.8)} tx={(1 - pe(t, 19.4, 19.8)) * 90}>
        {['A-01', 'A-02', 'A-03'].map((id, i) => {
          const hot = i === 1 && t > 22.0, col = hot ? C.warn : C.good;
          return <div key={id} style={{ position: 'absolute', left: 26 + i * 240, top: 36, width: 220, height: 170, background: `${col}1c`, border: `2px solid ${col}`, boxShadow: hot ? `0 0 34px ${C.warn}88` : 'none', fontFamily: FONT, color: C.fg, padding: '16px 18px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 22, color: C.muted, letterSpacing: 3, fontWeight: 600 }}>CREW</div>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{id}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: col, marginTop: 6 }}>{hot ? 'ALERT' : 'GOOD'}</div>
            <div style={{ height: 38, marginTop: 4, opacity: 0.9 }}><Ecg t={t + i} w={184} h={38} color={col} amp={0.9} /></div>
          </div>;
        })}
        <div style={{ position: 'absolute', left: 26, right: 26, bottom: 18, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.warn, opacity: pe(t, 22.0, 22.4) }}>● MESSAGE RECEIVED · A-02 · dust-exposure pattern</div>
      </Panel>
      <Panel x={1060} y={500} w={760} h={400} title="Decision support" o={pe(t, 19.5, 19.9)} tx={(1 - pe(t, 19.5, 19.9)) * 90} color={C.warn}>
        <div style={{ position: 'absolute', left: 30, top: 22, display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT }}>
          <svg width={54} height={54} viewBox="0 0 16 16" fill="none" stroke={C.warn} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${C.warn})` }}><path d="M8 2.2L14.2 13H1.8Z" /><path d="M8 6.5v3.3M8 11.6v.1" /></svg>
          <div style={{ fontSize: 60, fontWeight: 700, color: C.warn }}>ALERT</div>
        </div>
        <div style={{ position: 'absolute', left: 30, right: 30, top: 100, fontFamily: FONT, opacity: pe(t, 19.9, 20.3) }}>
          <div style={{ fontSize: 21, letterSpacing: 3, color: C.cyan, fontWeight: 700 }}>WHAT TO DO NOW</div>
          <div style={{ fontSize: 31, fontWeight: 600, lineHeight: 1.2, color: C.fg }}>{data.copy.action}</div>
        </div>
        {rows.map(([txt, s0], i) => {
          const p = pe(t, s0, s0 + 0.35);
          return <div key={i} style={{ position: 'absolute', left: 30, right: 30, top: 214 + i * 54, opacity: p, transform: `translateX(${(1 - p) * 40}px)`, display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT, fontSize: 29, fontWeight: 600, color: C.fg }}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={C.good} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10} /><path d="M7 12.5l3.2 3.2L17 9" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg>{txt}
          </div>;
        })}
      </Panel>
    </div>
  );
};

/* ---------- S5: impact ---------- */
const Icon = ({ k }) => {
  const p = { fill: 'none', stroke: C.cyan, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return <svg width={84} height={84} viewBox="0 0 48 48" {...p}>{k === 0 ? <><circle cx={24} cy={20} r={11} /><path d="M10 44c2-10 8-14 14-14s12 4 14 14" /></> : k === 1 ? <><circle cx={14} cy={20} r={6} /><circle cx={34} cy={20} r={6} /><circle cx={24} cy={16} r={7} /><path d="M4 42c1-8 5-11 10-11M44 42c-1-8-5-11-10-11M12 44c1-9 6-13 12-13s11 4 12 13" /></> : <><path d="M24 4c8 6 10 16 8 28H16C14 20 16 10 24 4z" /><circle cx={24} cy={17} r={4} /><path d="M16 32l-6 8 8-3M32 32l6 8-8-3" /></>}</svg>;
};
export const S5 = ({ t }) => {
  const cards = [['ASTRONAUT', 'Self-assessment with a clear next step', 23.95], ['CREW', 'One shared, explainable status', 24.6], ['MISSION', 'Early warning before performance drops', 25.25]];
  const chips = ['EXPLAINABLE', 'PERSONAL BASELINE', '4-LEVEL CLASSIFICATION', 'MEDICAL AUTONOMY'];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {cards.map(([ti, tx, s0], i) => {
        const p = pe(t, s0, s0 + 0.5);
        return <Panel key={ti} x={150 + i * 580} y={250} w={520} h={330} o={p} s={0.88 + 0.12 * p} title={ti} color={C.good}>
          <div style={{ position: 'absolute', left: 36, top: 40 }}><Icon k={i} /></div>
          <div style={{ position: 'absolute', left: 36, right: 30, top: 150, fontFamily: FONT, fontSize: 38, fontWeight: 700, lineHeight: 1.18, color: C.fg }}>{tx}</div>
          <div style={{ position: 'absolute', left: 36, right: 36, bottom: 30, height: 8, background: 'rgba(111,224,238,.14)' }}><div style={{ width: `${100 * pe(t, s0 + 0.2, s0 + 1.1)}%`, height: '100%', background: C.good, boxShadow: `0 0 14px ${C.good}` }} /></div>
        </Panel>;
      })}
      {chips.map((c, i) => <Chip key={c} x={190 + i * 410 - (i === 3 ? 20 : 0)} y={690} o={pe(t, 24.7 + i * 0.2, 25.1 + i * 0.2)} color={C.cyan} size={25}>{c}</Chip>)}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', fontFamily: FONT, fontSize: 34, letterSpacing: 6, color: C.muted, opacity: pe(t, 25.2, 25.7) }}>FARTHER FROM EARTH, MORE MEDICAL AUTONOMY</div>
    </div>
  );
};

/* ---------- S6: closing ---------- */
export const S6 = ({ t }) => {
  const a = 26.75, lit = pe(t, 27.6, 28.4);
  const col = lit > 0.5 ? C.good : C.cyan;
  const xs = [330, 720, 1110, 1500];
  const nodes = [['ASTRONAUT', null], ['BLUETOOTH', 'bt'], ['AIneedHealth', 'ai'], ['EARTH CONTROL', 'earth']];
  const words = [['MAKE', 26.98], ['DECISIONS', 27.18], ['IN REAL TIME.', 27.55]];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {xs.slice(0, 3).map((x, i) => <Link key={i} x1={x + 85} y1={235} x2={xs[i + 1] - 85} y2={235} t={t} n={3} speed={1.1} color={col} o={pe(t, a + 0.1 + i * 0.15, a + 0.5 + i * 0.15)} />)}
      </svg>
      {nodes.map(([n, k], i) => {
        const p = pe(t, a + 0.05 + i * 0.12, a + 0.45 + i * 0.12);
        return <div key={n} style={{ position: 'absolute', left: xs[i] - 90, top: 140, width: 180, textAlign: 'center', opacity: p, transform: `scale(${0.8 + 0.2 * p})`, fontFamily: FONT, color: C.fg }}>
          <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto', borderRadius: 75, border: `3px solid ${col}`, background: `${col}1c`, boxShadow: `0 0 ${24 + 26 * lit}px ${col}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {k === null ? <div style={{ transform: 'scale(.2)', width: 144, height: 150, flex: 'none' }}><div style={{ marginLeft: -288, marginTop: -300 }}><Hologram t={t} levels={{ head: 0, chest: 0, arms: 0, legs: 0 }} good={lit > 0.5} reveal={1} /></div></div> : k === 'bt' ? <BT size={86} color={col} sw={2} /> : k === 'ai' ? <div style={{ fontSize: 54, fontWeight: 700, color: col }}>AI</div> : <svg width={92} height={92} viewBox="0 0 48 48" fill="none" stroke={col} strokeWidth={2.4}><circle cx={24} cy={24} r={18} /><path d="M6 24h36M24 6c-8 9-8 27 0 36M24 6c8 9 8 27 0 36" /></svg>}
          </div>
          <div style={{ marginTop: 10, fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>{n}</div>
        </div>;
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 118, letterSpacing: -2, whiteSpace: 'nowrap' }}>
        {words.map(([w, s0], i) => { const p = pe(t, s0, s0 + 0.35); return <span key={w} style={{ display: 'inline-block', margin: '0 18px', opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${1.25 - 0.25 * p})`, color: i === 2 ? col : C.fg, textShadow: `0 0 ${i === 2 ? 44 : 26}px ${i === 2 ? col : 'rgba(217,239,246,.4)'}` }}>{w}</span>; })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', fontFamily: FONT, fontSize: 48, fontWeight: 600, color: C.fg, opacity: pe(t, 28.0, 28.45) }}>From information to action in seconds.</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 720, display: 'flex', justifyContent: 'center', gap: 26, fontFamily: FONT, opacity: pe(t, 28.3, 28.7) }}>
        <div style={{ fontSize: 24, color: C.muted, letterSpacing: 4, alignSelf: 'center' }}>BASED ON</div>
        <div style={{ padding: '8px 22px', border: `2px solid ${C.cyan}`, color: C.cyan, fontSize: 30, fontWeight: 700 }}>NASA-STD-3001</div>
        <div style={{ padding: '8px 22px', border: `2px solid ${C.cyan}`, color: C.cyan, fontSize: 30, fontWeight: 700 }}>NASA Human Research Program</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 810, textAlign: 'center', fontFamily: FONT, fontSize: 26, color: C.dim, opacity: pe(t, 28.6, 29.0) }}>github.com/MatheusRyans/Nasa-Space-Apps-2026</div>
    </div>
  );
};
