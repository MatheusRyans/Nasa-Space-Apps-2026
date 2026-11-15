import React from 'react';
import data from './data.json';
import { C, FONT, LV, pe, prog, fade, ecgWave, fmt, clamp01 } from './util.js';

/* ---------- shared pieces ---------- */
export const Panel = ({ x, y, w, h, title, o = 1, s = 1, tx = 0, children, color = C.cyan }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, transform: `translateX(${tx}px) scale(${s})`, transformOrigin: '0 0', background: C.panel, border: `2px solid ${C.line}`, backdropFilter: 'blur(8px)', fontFamily: FONT, color: C.fg }}>
    <div style={{ position: 'absolute', left: -3, top: -3, width: 30, height: 30, borderLeft: `5px solid ${color}`, borderTop: `5px solid ${color}` }} />
    <div style={{ position: 'absolute', right: -3, bottom: -3, width: 30, height: 30, borderRight: `5px solid ${color}`, borderBottom: `5px solid ${color}` }} />
    {title && <div style={{ position: 'absolute', left: -2, top: -44, padding: '8px 40px 8px 20px', background: 'linear-gradient(90deg, rgba(111,224,238,.34), rgba(111,224,238,.10))', clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)', fontSize: 24, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{title}</div>}
    {children}
  </div>
);

export const Ecg = ({ t, w, h, bpm = 64, color = C.cyan, amp = 1 }) => {
  const step = 4, n = Math.floor(w / step), speed = 150, pts = [];
  for (let i = 0; i < n; i++) {
    const ti = t - (n - i) * step / speed;
    const ph = (((ti * bpm) / 60) % 1 + 1) % 1;
    pts.push(`${i * step},${(h * 0.66 - ecgWave(ph) * amp * h * 0.55).toFixed(1)}`);
  }
  return (
    <svg width={w} height={h}>
      {Array.from({ length: Math.floor(w / 40) }, (_, i) => <line key={'v' + i} x1={i * 40} x2={i * 40} y1={0} y2={h} stroke="rgba(111,224,238,.10)" />)}
      {Array.from({ length: Math.floor(h / 40) }, (_, i) => <line key={'h' + i} x1={0} x2={w} y1={i * 40} y2={i * 40} stroke="rgba(111,224,238,.10)" />)}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
    </svg>
  );
};

const Big = ({ children, size = 110, color = C.fg, style }) => (
  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1, color, letterSpacing: -2, textShadow: `0 0 28px ${color}55`, ...style }}>{children}</div>
);

/* ---------- scene 1: title ---------- */
export const Scene1 = ({ t }) => {
  const name = 'AIneedHealth';
  const o = fade(t, 0.2, 2.15, 0.2, 0.35);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 770, textAlign: 'center', opacity: o }}>
      <div style={{ display: 'inline-block', fontFamily: FONT, fontWeight: 700, fontSize: 150, letterSpacing: -4, color: C.fg }}>
        {name.split('').map((ch, i) => {
          const p = pe(t, 0.35 + i * 0.045, 0.75 + i * 0.045);
          return <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 40}px)`, color: i < 2 ? C.cyan : C.fg, textShadow: i < 2 ? `0 0 34px ${C.cyan}` : '0 0 24px rgba(217,239,246,.35)' }}>{ch}</span>;
        })}
      </div>
    </div>
  );
};

/* ---------- scene 2: the problem ---------- */
export const Scene2 = ({ t }) => {
  const a = 2.1, b = 5.65;
  const o = fade(t, a, b, 0.3, 0.3);
  const k = prog(t, a, b);
  const earthS = 1 - 0.45 * k;
  const ex = 330, ey = 250;
  const flick = (seed, base, amp) => Math.round(base + Math.sin(t * seed) * amp + Math.sin(t * seed * 2.3) * amp * 0.6);
  const bubbles = [
    { x: 700, y: 330, lab: 'HR', val: flick(9, 64, 7), unit: 'bpm' },
    { x: 1500, y: 360, lab: 'SpO₂', val: flick(7, 96, 3), unit: '%' },
    { x: 1450, y: 760, lab: 'TEMP', val: (36.6 + Math.sin(t * 8) * 0.5).toFixed(1), unit: '°C' }
  ];
  const lineX2 = 1000, lineY2 = 420;
  const dot = (t * 0.5) % 1;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs><radialGradient id="earth" cx="35%" cy="35%"><stop offset="0" stopColor="#7fd2ff" /><stop offset=".55" stopColor="#1f6fb8" /><stop offset="1" stopColor="#0a2c55" /></radialGradient></defs>
        <circle cx={ex} cy={ey} r={110 * earthS} fill="rgba(80,170,255,.18)" />
        <circle cx={ex} cy={ey} r={70 * earthS} fill="url(#earth)" style={{ filter: 'drop-shadow(0 0 22px rgba(90,180,255,.8))' }} />
        <path d={`M${ex - 40 * earthS} ${ey - 10 * earthS} q18 -26 44 -10 q-10 24 -30 30 z M${ex + 8 * earthS} ${ey + 22 * earthS} q22 -8 34 10 q-18 14 -34 -10z`} fill="rgba(110,220,170,.5)" />
        <line x1={ex + 80 * earthS} y1={ey + 30} x2={lineX2} y2={lineY2} stroke={C.cyan} strokeWidth={2.5} strokeDasharray="10 12" opacity={0.7} />
        <circle cx={ex + 80 * earthS + (lineX2 - ex - 80 * earthS) * dot} cy={ey + 30 + (lineY2 - ey - 30) * dot} r={9} fill={C.cyan} style={{ filter: `drop-shadow(0 0 12px ${C.cyan})` }} />
      </svg>
      <div style={{ position: 'absolute', left: 120, top: 390, fontFamily: FONT, fontWeight: 600, fontSize: 40, letterSpacing: 1, color: C.cyan, opacity: pe(t, 2.7, 3.1) }}>
        Mars: up to ~20 min each way
      </div>
      {bubbles.map((bb, i) => {
        const p = pe(t, 2.5 + i * 0.25, 2.95 + i * 0.25);
        return (
          <div key={i} style={{ position: 'absolute', left: bb.x, top: bb.y + Math.sin(t * 1.6 + i) * 8, opacity: p, transform: `scale(${0.8 + 0.2 * p})`, fontFamily: FONT, color: C.fg, padding: '14px 26px', background: C.panel, border: `2px solid ${C.line}`, borderRadius: 6, display: 'flex', gap: 18, alignItems: 'baseline' }}>
            <span style={{ fontSize: 28, color: C.muted, fontWeight: 600 }}>{bb.lab}</span>
            <span style={{ fontSize: 58, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{bb.val}</span>
            <span style={{ fontSize: 26, color: C.muted }}>{bb.unit}</span>
            <span style={{ fontSize: 66, fontWeight: 700, color: C.warn, opacity: 0.55 + 0.45 * Math.sin(t * 7 + i), textShadow: `0 0 20px ${C.warn}` }}>?</span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- scene 3: monitor and decide ---------- */
export const Scene3 = ({ t }) => {
  const a = 5.65, b = 9.0;
  const o = fade(t, a, b, 0.3, 0.3);
  const cnt = (to, from, s, e) => from + (to - from) * pe(t, s, e);
  const punch = prog(t, 7.4, 7.75);
  const punchO = fade(t, 7.4, b + 0.1, 0.05, 0.4);
  const dim = t > 7.4 ? 0.35 : 1;
  const shake = t > 7.4 && t < 7.8 ? Math.sin(t * 120) * (1 - (t - 7.4) / 0.4) * 10 : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, transform: `translateX(${shake}px)` }}>
      <div style={{ opacity: dim }}>
        <Panel x={110} y={230} w={700} h={270} title="Live sensor stream" o={pe(t, 5.75, 6.1)} tx={(1 - pe(t, 5.75, 6.1)) * -80}>
          <div style={{ position: 'absolute', left: 28, top: 20, fontFamily: FONT, fontSize: 24, color: C.cyan, letterSpacing: 3, fontWeight: 600 }}>ONLINE · SIMULATED</div>
          <div style={{ position: 'absolute', right: 30, top: 8, fontFamily: FONT, fontSize: 88, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 20px ${C.cyan}66` }}>{fmt(cnt(64, 0, 5.85, 6.6))}<span style={{ fontSize: 30, color: C.muted, marginLeft: 8 }}>bpm</span></div>
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 8 }}><Ecg t={t} w={672} h={150} /></div>
        </Panel>
        <Panel x={110} y={560} w={330} h={190} title="SpO₂" o={pe(t, 6.05, 6.4)} tx={(1 - pe(t, 6.05, 6.4)) * -80}>
          <div style={{ position: 'absolute', left: 26, top: 40, fontFamily: FONT, fontSize: 84, fontWeight: 700, color: C.good, fontVariantNumeric: 'tabular-nums' }}>{fmt(cnt(97, 0, 6.15, 6.8))}<span style={{ fontSize: 32, color: C.muted }}> %</span></div>
          <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30, height: 10, background: 'rgba(111,224,238,.14)' }}><div style={{ width: `${97 * pe(t, 6.15, 6.9)}%`, height: '100%', background: C.good, boxShadow: `0 0 14px ${C.good}` }} /></div>
        </Panel>
        <Panel x={480} y={560} w={330} h={190} title="Temperature" o={pe(t, 6.3, 6.65)} tx={(1 - pe(t, 6.3, 6.65)) * -80}>
          <div style={{ position: 'absolute', left: 26, top: 40, fontFamily: FONT, fontSize: 84, fontWeight: 700, color: C.good, fontVariantNumeric: 'tabular-nums' }}>{fmt(cnt(36.6, 30, 6.4, 7.0), 1)}<span style={{ fontSize: 32, color: C.muted }}> °C</span></div>
          <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30, height: 10, background: 'rgba(111,224,238,.14)' }}><div style={{ width: `${70 * pe(t, 6.4, 7.0)}%`, height: '100%', background: C.good, boxShadow: `0 0 14px ${C.good}` }} /></div>
        </Panel>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', opacity: punchO, transform: `scale(${1.5 - 0.5 * punch})` }}>
        <Big size={190} color={C.cyan} style={{ letterSpacing: 6 }}>MAKE DECISIONS</Big>
      </div>
    </div>
  );
};

/* ---------- scene 4: baseline ---------- */
export const Scene4 = ({ t }) => {
  const a = 9.0, b = 13.65;
  const o = fade(t, a, b, 0.3, 0.3);
  const S = data.sleep;
  const px = 1000, py = 230, W = 800, H = 470;
  const lo = 5.4, hi = 8.6;
  const X = i => 40 + (i / (S.series.length - 1)) * (W - 80);
  const Y = v => 30 + (1 - (v - lo) / (hi - lo)) * (H - 70);
  const draw = pe(t, 9.55, 11.7);
  const path = S.series.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const dots = [S.series.length - 3, S.series.length - 2, S.series.length - 1];
  const alertP = pe(t, 11.7, 12.1);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <Panel x={px} y={py} w={W} h={H} title="Sleep · 30 days" o={pe(t, 9.15, 9.5)} tx={(1 - pe(t, 9.15, 9.5)) * 90}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {[6, 7, 8].map(v => <g key={v}><line x1={40} x2={W - 40} y1={Y(v)} y2={Y(v)} stroke="rgba(111,224,238,.14)" /><text x={6} y={Y(v) + 8} fill={C.dim} fontSize={22} fontFamily={FONT}>{v}h</text></g>)}
          <rect x={40} y={Y(S.mean + S.sd)} width={W - 80} height={Y(S.mean - S.sd) - Y(S.mean + S.sd)} fill="rgba(111,224,238,.16)" opacity={pe(t, 9.3, 9.9)} />
          <text x={W - 44} y={Y(S.mean + S.sd) - 10} textAnchor="end" fill={C.cyan} fontSize={26} fontWeight={600} fontFamily={FONT} opacity={pe(t, 9.6, 10.1)}>YOUR BASELINE</text>
          <path d={path} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} fill="none" stroke={C.fg} strokeWidth={5} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(111,224,238,.8))' }} />
          {dots.map(i => <circle key={i} cx={X(i)} cy={Y(S.series[i])} r={11 * alertP} fill={C.warn} style={{ filter: `drop-shadow(0 0 12px ${C.warn})` }} />)}
        </svg>
        <div style={{ position: 'absolute', right: 34, bottom: 16, fontFamily: FONT, fontSize: 30, fontWeight: 600, color: C.warn, opacity: alertP }}>3 days below baseline</div>
      </Panel>
      <Panel x={px} y={760} w={W} h={120} title="Medical profile" o={pe(t, 11.0, 11.45)} tx={(1 - pe(t, 11.0, 11.45)) * 90}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 26, padding: '0 34px', fontFamily: FONT }}>
          <svg width={64} height={64} viewBox="0 0 64 64"><circle cx={32} cy={32} r={28} fill="none" stroke={C.cyan} strokeWidth={4} /><path d="M32 16v32M16 32h32" stroke={C.cyan} strokeWidth={6} strokeLinecap="round" /></svg>
          <div><div style={{ fontSize: 36, fontWeight: 600 }}>Set by the flight surgeons</div><div style={{ fontSize: 26, color: C.muted }}>baseline · tolerances · safety limits</div></div>
        </div>
      </Panel>
    </div>
  );
};

/* ---------- scene 5: equipment ---------- */
const Watch = ({ c }) => (<svg width={150} height={150} viewBox="0 0 100 100" fill="none" stroke={c} strokeWidth={3.5}><rect x={30} y={6} width={40} height={20} rx={5} /><rect x={30} y={74} width={40} height={20} rx={5} /><rect x={24} y={24} width={52} height={52} rx={14} fill={c + '1f'} /><path d="M50 38v14l9 6" strokeLinecap="round" /></svg>);
const Shirt = ({ c }) => (<svg width={150} height={150} viewBox="0 0 100 100" fill="none" stroke={c} strokeWidth={3.5} strokeLinejoin="round"><path d="M34 12 L16 24 L24 40 L32 35 V88 H68 V35 L76 40 L84 24 L66 12 Q50 24 34 12Z" fill={c + '1f'} /><path d="M40 58h6l4-9 5 16 4-7h6" strokeLinecap="round" /></svg>);
const Band = ({ c }) => (<svg width={150} height={150} viewBox="0 0 100 100" fill="none" stroke={c} strokeWidth={3.5} strokeLinecap="round"><path d="M12 56 Q50 8 88 56" /><path d="M16 66 Q50 22 84 66" /><rect x={42} y={26} width={16} height={12} rx={4} fill={c + '2a'} /></svg>);
export const Scene5 = ({ t }) => {
  const a = 13.65, b = 18.05;
  const o = fade(t, a, b, 0.3, 0.3);
  const dev = [
    { x: 330, y: 300, I: Watch, lab: 'Activity watch', s: 14.0 },
    { x: 330, y: 640, I: Shirt, lab: 'Smart shirt', s: 14.35 },
    { x: 1440, y: 440, I: Band, lab: 'Temperature band', s: 14.7 }
  ];
  const cx = 960, cy = 560;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {dev.map((d, i) => {
          const p = pe(t, d.s, d.s + 0.4), x1 = d.x + 75, y1 = d.y + 75, dot = ((t * 0.7 + i / 3) % 1);
          return <g key={i} opacity={p}><line x1={x1} y1={y1} x2={cx} y2={cy} stroke={C.cyan} strokeWidth={2.5} strokeDasharray="8 10" opacity={0.7} /><circle cx={x1 + (cx - x1) * dot} cy={y1 + (cy - y1) * dot} r={9} fill={C.cyan} style={{ filter: `drop-shadow(0 0 12px ${C.cyan})` }} /></g>;
        })}
      </svg>
      {dev.map((d, i) => {
        const p = pe(t, d.s, d.s + 0.45);
        return (
          <div key={i} style={{ position: 'absolute', left: d.x, top: d.y, opacity: p, transform: `scale(${0.7 + 0.3 * p})`, textAlign: 'center', width: 150, fontFamily: FONT }}>
            <d.I c={C.cyan} />
            <div style={{ marginTop: 6, fontSize: 28, fontWeight: 600, whiteSpace: 'nowrap', transform: 'translateX(-40px)', width: 230, textAlign: 'center' }}>{d.lab}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 600, letterSpacing: 6, color: C.cyan, opacity: pe(t, 15.6, 16.1) * 0.95 }}>RESEARCH USE · NASA · CSA</div>
    </div>
  );
};

/* ---------- scene 6: analysis and classification ---------- */
export const Scene6 = ({ t }) => {
  const a = 18.05, b = 23.25;
  const o = fade(t, a, b, 0.3, 0.3);
  const D = data.dust, sy = D.symptoms;
  const rowsTxt = [
    ['What happened?', `${sy[2].label} ${fmt(sy[2].cur, 1)}/3 · ${sy[1].label} ${fmt(sy[1].cur, 1)}/3 · ${sy[0].label} ${fmt(sy[0].cur, 1)}/3`],
    ['Why?', 'Dust carried in after the EVA on D+27'],
    ['Evidence', `3 indicators moving together · confidence ${D.conf}`],
    ['If nothing is done?', 'Symptoms can limit the next EVAs'],
    ['What to do now?', data.copy.action]
  ];
  const pc = pe(t, 18.15, 18.55);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <Panel x={1010} y={130} w={820} h={745} title="Classification" o={pc} tx={(1 - pc) * 100} color={C.warn}>
        <div style={{ position: 'absolute', left: 36, top: 30, display: 'flex', alignItems: 'center', gap: 20, fontFamily: FONT }}>
          <svg width={64} height={64} viewBox="0 0 16 16" fill="none" stroke={C.warn} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${C.warn})` }}><path d="M8 2.2L14.2 13H1.8Z" /><path d="M8 6.5v3.3M8 11.6v.1" /></svg>
          <div style={{ fontSize: 76, fontWeight: 700, color: C.warn, textShadow: `0 0 24px ${C.warn}88` }}>ALERT</div>
        </div>
        <div style={{ position: 'absolute', left: 36, right: 36, top: 118, fontFamily: FONT, fontSize: 28, lineHeight: 1.22, color: C.fg }}>{data.copy.msg}</div>
        <div style={{ position: 'absolute', left: 36, right: 36, top: 215 }}>
          {rowsTxt.map((r, i) => {
            const s0 = 18.85 + i * 0.9, p = pe(t, s0, s0 + 0.4), hot = i === 4 && t > 22.4;
            return (
              <div key={i} style={{ marginBottom: 8, padding: '8px 18px', borderTop: `2px solid ${C.line}`, opacity: p, transform: `translateX(${(1 - p) * 60}px)`, fontFamily: FONT, background: hot ? 'rgba(111,224,238,.14)' : 'transparent', boxShadow: hot ? `0 0 26px rgba(111,224,238,.4)` : 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 2, color: hot ? C.cyan : C.muted, textTransform: 'uppercase' }}>{r[0]}</div>
                <div style={{ fontSize: 28, marginTop: 2, lineHeight: 1.2 }}>{r[1]}</div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel x={1010} y={892} w={820} h={70} o={pe(t, 21.6, 22.0)} tx={(1 - pe(t, 21.6, 22.0)) * 100}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 22, padding: '0 28px', fontFamily: FONT }}>
          <div style={{ padding: '6px 14px', border: `2px solid ${C.cyan}`, color: C.cyan, fontSize: 26, fontWeight: 700, whiteSpace: 'nowrap' }}>NASA-STD-3001</div>
          <div style={{ fontSize: 26, color: C.fg, whiteSpace: 'nowrap' }}>limits relative to each astronaut’s baseline</div>
        </div>
      </Panel>
    </div>
  );
};

/* ---------- scene 7: sources ---------- */
export const Scene7 = ({ t }) => {
  const a = 23.25, b = 25.85;
  const o = fade(t, a, b, 0.25, 0.25);
  const col = (x, name, sub, s) => {
    const p = pe(t, s, s + 0.45);
    return (
      <div style={{ position: 'absolute', left: x, top: 320, width: 640, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 40}px)`, fontFamily: FONT }}>
        <Big size={170} color={C.cyan} style={{ letterSpacing: 4 }}>{name}</Big>
        <div style={{ marginTop: 18, fontSize: 32, color: C.muted, letterSpacing: 1 }}>{sub}</div>
      </div>
    );
  };
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      {col(120, 'NASA', 'NASA-STD-3001 · Human Research Program', 23.35)}
      {col(1160, 'CSA', 'Bio-Monitor documentation', 23.7)}
    </div>
  );
};

/* ---------- scene 8: closing ---------- */
export const Scene8 = ({ t }) => {
  const a = 25.85;
  const words = ['NEVER', 'LEFT', 'TO', 'CHANCE.'];
  const o = interpolate01(t, a, a + 0.2);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: FONT }}>
        {words.map((w, i) => {
          const p = pe(t, a + 0.15 + i * 0.18, a + 0.55 + i * 0.18);
          return <span key={i} style={{ display: 'inline-block', margin: '0 22px', fontSize: 130, fontWeight: 700, letterSpacing: -2, color: i === 3 ? C.good : C.fg, opacity: p, transform: `translateY(${(1 - p) * 50}px) scale(${0.85 + 0.15 * p})`, textShadow: i === 3 ? `0 0 34px ${C.good}` : '0 0 24px rgba(217,239,246,.3)' }}>{w}</span>;
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', fontFamily: FONT, opacity: pe(t, a + 1.2, a + 1.7) }}>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}><span style={{ color: C.cyan, textShadow: `0 0 28px ${C.cyan}` }}>AI</span>needHealth</div>
        <div style={{ marginTop: 10, fontSize: 32, color: C.muted, letterSpacing: 1 }}>github.com/MatheusRyans/Nasa-Space-Apps-2026</div>
      </div>
    </div>
  );
};
const interpolate01 = (t, a, b) => clamp01((t - a) / (b - a));
