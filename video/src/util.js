import { Easing, interpolate } from 'remotion';

export const C = {
  bg: '#050d15', fg: '#d9eff6', muted: '#9dbdc9', dim: '#7a9dab',
  cyan: '#6fe0ee', good: '#52d49b', warn: '#ecca4a', attn: '#f79a3a', crit: '#ff5d52',
  line: 'rgba(111,224,238,.28)', panel: 'rgba(9,28,41,.72)'
};
export const FONT = '"IBM Plex Sans","Segoe UI",system-ui,sans-serif';
export const LV = [C.cyan, C.warn, C.attn, C.crit];

export const clamp01 = x => Math.max(0, Math.min(1, x));
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIO = Easing.inOut(Easing.cubic);
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
export const pe = (t, a, b) => ease(prog(t, a, b));
export const fade = (t, a, b, fi = 0.25, fo = 0.25) =>
  interpolate(t, [a, a + fi, b - fo, b], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const g = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
export const ecgWave = p =>
  0.12 * g(p, 0.16, 0.025) - 0.12 * g(p, 0.285, 0.008) + 1.0 * g(p, 0.31, 0.010) - 0.22 * g(p, 0.335, 0.010) + 0.26 * g(p, 0.60, 0.045);

export const fmt = (v, d = 0) => Number(v).toFixed(d);
