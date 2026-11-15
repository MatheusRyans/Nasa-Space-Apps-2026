import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import timing from './timing.json';
import { C, FONT, clamp01, easeIO, fade, pe, prog } from './util.js';
import { Background } from './Background.jsx';
import { Hologram } from './Hologram.jsx';
import { SceneWrap, Source, Stars, S0, S1, S2, S3, S4, S5, S6 } from './Scenes2.jsx';

const SC = [0, 2.3, 7.85, 13.4, 18.9, 23.95, 26.75, 29.5];
// hologram pose per scene: cx, cy, scale, opacity
const POSE = [[960, 500, 1, 0], [960, 700, 0.55, 1], [960, 590, 0.85, 1], [330, 600, 0.8, 1], [560, 540, 1, 1], [960, 520, 0.7, 0], [960, 500, 0.6, 0]];
const pose = t => {
  const i = Math.max(0, SC.findIndex((s, k) => t >= s && t < SC[k + 1]));
  const cur = POSE[Math.min(i, POSE.length - 1)], prev = POSE[Math.max(0, i - 1)];
  const p = easeIO(clamp01((t - SC[i]) / 0.7));
  return cur.map((v, j) => prev[j] + (v - prev[j]) * p);
};
const HITS = [19.16, 26.98];

// split a caption into short chunks timed by character share of the narration segment
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
  const levels = { head: t > 17.8 && t < 24 ? 1 : 0, chest: t > 19.0 && t < 24 ? 1 : 0, arms: 0, legs: 0 };
  const dust = t > 19.0 ? pe(t, 19.0, 19.8) * 0.85 * (t > 23.4 ? 1 - pe(t, 23.4, 24) : 1) : 0;
  const reveal = t < 2.3 ? 0 : pe(t, 2.4, 3.4);
  const glitch = t > 18.95 && t < 19.5 ? 1 : 0;
  const bob = Math.sin(t * 1.2) * 6;
  const shake = HITS.reduce((a, h) => a + (t > h && t < h + 0.45 ? Math.sin(t * 130) * 14 * (1 - (t - h) / 0.45) : 0), 0);
  const flash = HITS.reduce((a, h) => a + (t >= h - 0.05 && t < h + 0.4 ? 0.85 * (1 - clamp01((t - h + 0.05) / 0.45)) : 0), 0);
  const S = [S0, S1, S2, S3, S4, S5, S6];

  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: C.bg, color: C.fg, opacity: fade(t, 0, 29.5, 0.05, 0.25) }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shake}px, ${-shake * 0.5}px) scale(${1 + 0.012 * Math.sin(t * 0.5)})` }}>
        <Background />
        <Stars t={t} />
        <div style={{ position: 'absolute', left: x - 360, top: y - 375 + bob, width: 720, height: 750, opacity: op, transform: `perspective(1500px) rotateY(${Math.sin(t * 0.7) * 12}deg) scale(${s})`, transformOrigin: '50% 50%' }}>
          <Hologram t={t} levels={levels} dust={dust} reveal={reveal} glitch={glitch} />
        </div>
        {S.map((Sc, i) => (t >= SC[i] - 0.3 && t < SC[i + 1] + 0.05 ? <SceneWrap key={i} t={t} a={SC[i]} b={SC[i + 1]}><Sc t={t} /></SceneWrap> : null))}
        <Source t={t} a={3.0} b={6.4} doc="NASA HRP · Communication delay (CDS)" note="Mars: up to ~20 min one way" />
        <Source t={t} a={9.0} b={11.2} doc="NASA Space Station Blog · Mar 9, 2026" note="ISS crew sent sensor data by Bluetooth adaptor to a laptop" />
        <Source t={t} a={11.3} b={13.2} doc="NASA Space Station Blog · Mar 9, 2026" note="Goal: reduce reliance on ground support for medical care" />
        <Source t={t} a={14.2} b={18.2} doc="NASA-STD-3001 Vol. 1 Rev C · [V1 3000]" note="Medical profile & baselines set by flight medicine" />
        <Source t={t} a={20.2} b={23.7} doc="NASA-STD-3001 Vol. 1 Rev C · [V1 4003] [V1 4024]" note="Crew health & performance capacity limits" />
        <Source t={t} a={24.4} b={26.6} doc="NASA Space Station Blog · Mar 9, 2026" note="Farther missions → crews need medical autonomy" />
      </div>
      {SC.slice(1, 7).map((b, i) => {
        const p = prog(t, b - 0.2, b + 0.3);
        return p > 0 && p < 1 ? <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: p * 1080, height: 5, background: C.cyan, boxShadow: `0 0 40px 12px ${C.cyan}77` }} /> : null;
      })}
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: '#fff3c8', opacity: flash, mixBlendMode: 'screen' }} />}
      {CAPS.map((c, i) => {
        const o = fade(t, c.a - 0.05, c.b + 0.15, 0.1, 0.12);
        return o > 0 ? <div key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', opacity: o }}><span style={{ display: 'inline-block', padding: '10px 30px', background: 'rgba(3,10,16,.8)', border: `1px solid ${C.line}`, fontSize: 44, fontWeight: 600, color: '#fff' }}>{c.text}</span></div> : null;
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
