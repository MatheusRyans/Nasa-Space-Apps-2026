import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import timing from './timing.json';
import { C, FONT, clamp01, easeIO, fade, pe, prog } from './util.js';
import { Background } from './Background.jsx';
import { Hologram } from './Hologram.jsx';
import { Source, Stars } from './Scenes2.jsx';
import { V0, V1, V2, V3, V4, V5, V6 } from './Scenes3.jsx';

const END = 29.5;
const SC = [0, 2.3, 7.85, 13.4, 19.12, 23.9, 26.75, END];
// hologram pose per scene: cx, cy, scale, opacity, seconds to travel there
const POSE = [[960, 620, 0.5, 0, 0], [960, 700, 0.55, 1, 0.6], [520, 560, 0.9, 1, 0.75], [400, 600, 0.8, 1, 0.7], [560, 540, 1, 1, 0], [960, 520, 0.95, 1, 0.7], [330, 215, 0.2, 1, 0.5]];
const pose = t => {
  const i = Math.min(POSE.length - 1, Math.max(0, SC.findIndex((s, k) => t >= s && t < SC[k + 1])));
  const cur = POSE[i], prev = POSE[Math.max(0, i - 1)], p = cur[4] ? easeIO(clamp01((t - SC[i]) / cur[4])) : 1;
  return cur.slice(0, 4).map((v, j) => prev[j] + (v - prev[j]) * p);
};
// camera: slow push-ins, a tracking pan on the Bluetooth scene, a push toward the risk node before the alert
const cam = t => {
  let s = 1, tx = 0, ty = 0;
  if (t < 2.3) s = 1;
  else if (t < 7.85) s = 1 + 0.04 * prog(t, 2.3, 7.6);
  else if (t < 13.4) { s = 1.04; tx = 40 * easeIO(prog(t, 7.85, 8.4)) - 90 * easeIO(prog(t, 8.5, 10.8)) + 50 * easeIO(prog(t, 12.9, 13.4)); }
  else if (t < 19.12) { const k = 0.13 * easeIO(prog(t, 17.6, 19.05)); s = 1.04 + k; tx = -(1440 - 960) * k; ty = -(560 - 540) * k; }
  else if (t < 23.9) s = 1.04;
  else if (t < 26.75) s = 1.04 + 0.03 * prog(t, 23.9, 26.75);
  else s = 1.07 + 0.03 * prog(t, 26.75, END);
  return { s, tx, ty };
};
const HITS = [[19.16, 16, 0.85], [26.96, 7, 0.14], [27.55, 5, 0.1]];

const chunks = sg => {
  const parts = sg.cap.split(/(?<=[.,])\s+/), out = [];
  for (const p of parts) { if (out.length && out[out.length - 1].length < 16) out[out.length - 1] += ' ' + p; else out.push(p); }
  const total = out.reduce((a, c) => a + c.length, 0); let t0 = sg.start;
  return out.map(text => { const d = sg.dur * text.length / total, r = { text, a: t0, b: t0 + d }; t0 += d; return r; });
};
const CAPS = timing.segments.flatMap(chunks);

const useFont = () => {
  const [h] = useState(() => delayRender('font'));
  useEffect(() => {
    const done = () => continueRender(h);
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap';
    document.head.appendChild(l);
    const to = setTimeout(done, 6000);
    Promise.all([document.fonts.load('600 40px "IBM Plex Sans"'), document.fonts.load('700 40px "IBM Plex Sans"')]).then(() => { clearTimeout(to); done(); }).catch(() => { clearTimeout(to); done(); });
  }, []);
};

export const Main = () => {
  useFont();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [x, y, s, op] = pose(t);
  const c = cam(t);
  const alert = t >= 19.16 && t < 24.1;
  const levels = { head: alert ? 1 : 0, chest: t > 5.5 && t < 7.9 ? 3 : alert ? 1 : 0, arms: alert ? 1 : 0, legs: 0 };
  const dust = t > 19.3 ? pe(t, 19.3, 20.0) * 0.85 * (1 - pe(t, 23.3, 23.9)) : 0;
  const reveal = t < 2.3 ? 0 : pe(t, 2.4, 3.4);
  const glitch = (t > 19.14 && t < 19.6) || (t > 5.5 && t < 5.8) ? 1 : 0;
  const bob = Math.sin(t * 1.2) * 6 * (t > 26.75 ? 1 - pe(t, 26.75, 27.1) : 1);
  const breathe = 1 + 0.008 * Math.sin(t * 2.1);
  const rotY = Math.sin(t * 0.7) * 15;
  const shake = HITS.reduce((a, [h, amp]) => a + (t > h && t < h + 0.45 ? Math.sin(t * 130) * amp * (1 - (t - h) / 0.45) : 0), 0);
  const flash = HITS.reduce((a, [h, , f]) => a + (t >= h - 0.03 && t < h + 0.4 ? f * (1 - clamp01((t - h + 0.03) / 0.43)) : 0), 0);
  const dim = 0.32 * easeIO(prog(t, 17.9, 19.05)) * (t < 19.12 ? 1 : 0) + 0.5 * pe(t, 26.75, 27.0);
  const heal = easeIO(prog(t, 23.85, 24.35));
  const holo = { t, levels, dust, reveal, glitch, good: t >= 24.1 };

  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: C.bg, color: C.fg, opacity: fade(t, 0, END, 0.05, 0.15) }}>
      <div style={{ position: 'absolute', inset: -40, transform: `translate(${c.tx * 0.25}px, ${c.ty * 0.25}px) scale(${1 + (c.s - 1) * 0.4})` }}>
        <div style={{ position: 'absolute', inset: 40 }}><Background /><div style={{ position: 'absolute', inset: 0, transform: `translateX(${c.tx * 0.5}px)` }}><Stars t={t} /></div></div>
      </div>
      {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: '#01060b', opacity: dim }} />}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${c.tx + shake}px, ${c.ty - shake * 0.5}px) scale(${c.s})`, transformOrigin: '960px 540px' }}>
        <div style={{ position: 'absolute', left: x - 360, top: y - 375 + bob, width: 720, height: 750, opacity: op, transform: `perspective(1400px) rotateY(${rotY}deg) scale(${s}, ${s * breathe})`, transformOrigin: '50% 50%', transformStyle: 'preserve-3d' }}>
          <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(-70px) scale(1.04)', opacity: 0.3, filter: 'blur(2px)' }}><Hologram {...holo} dust={0} /></div>
          <div style={{ position: 'absolute', inset: 0 }}><Hologram {...holo} /></div>
        </div>
        <V0 t={t} /><V1 t={t} /><V2 t={t} /><V3 t={t} /><V4 t={t} /><V5 t={t} /><V6 t={t} />
      </div>
      {heal > 0 && heal < 1 && <div style={{ position: 'absolute', left: 0, right: 0, top: heal * 1080 - 4, height: 8, background: C.good, boxShadow: `0 0 60px 20px ${C.good}88` }} />}
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: '#fff3c8', opacity: Math.min(0.9, flash), mixBlendMode: 'screen' }} />}
      <Source t={t} a={3.0} b={6.4} doc="NASA HRP · Communication delay (CDS)" note="Mars: up to ~20 min one way" />
      <Source t={t} a={9.0} b={11.2} doc="NASA Space Station Blog · Mar 9, 2026" note="ISS crew sent sensor data by Bluetooth adaptor to a laptop" />
      <Source t={t} a={11.3} b={13.2} doc="NASA Space Station Blog · Mar 9, 2026" note="Goal: reduce reliance on ground support for medical care" />
      <Source t={t} a={14.2} b={18.2} doc="NASA-STD-3001 Vol. 1 Rev C · [V1 3000]" note="Medical profile & baselines set by flight medicine" />
      <Source t={t} a={20.3} b={23.6} doc="NASA-STD-3001 Vol. 1 Rev C · [V1 4003] [V1 4024]" note="Crew health & performance capacity limits" />
      <Source t={t} a={24.5} b={26.5} doc="NASA Space Station Blog · Mar 9, 2026" note="Farther missions → crews need medical autonomy" />
      {CAPS.map((cp, i) => {
        const o = fade(t, cp.a - 0.05, cp.b + 0.15, 0.1, 0.12);
        return o > 0 ? <div key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: 30, textAlign: 'center', opacity: o }}><span style={{ display: 'inline-block', padding: '6px 22px', background: 'rgba(3,10,16,.62)', fontSize: 36, fontWeight: 600, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>{cp.text}</span></div> : null;
      })}
      <div style={{ position: 'absolute', right: 44, top: 36, padding: '8px 18px', border: `2px solid ${C.line}`, background: C.panel, color: C.cyan, fontSize: 22, fontWeight: 600, letterSpacing: 3 }}>SIMULATED DATA</div>

      <Audio src={staticFile('audio/bed.wav')} volume={0.32} />
      {timing.segments.map(sg => (
        <Sequence key={sg.id} from={Math.round(sg.start * fps)} durationInFrames={Math.ceil((sg.dur + 0.3) * fps)}>
          <Audio src={staticFile(`narration/${sg.id}.wav`)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
