// Generates the sound bed by code: a quiet low pad, filtered-noise whooshes on scene changes, and two impact hits.
// No samples, no third-party music. Scene times come from src/timing.json plus the fixed scene starts below.
const fs = require('fs');
const path = require('path');
const SR = 44100, DUR = 30;
const N = SR * DUR;
const buf = new Float32Array(N);
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

// pad
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const lfo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.11 * t);
  const fade = Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 1.5);
  buf[i] += fade * lfo * 0.07 * (Math.sin(2 * Math.PI * 55 * t) + 0.6 * Math.sin(2 * Math.PI * 82.4 * t + 1) + 0.4 * Math.sin(2 * Math.PI * 110 * t + 2));
}
// whooshes
const whooshes = [2.3, 7.85, 13.4, 19.7, 24.05, 26.75];
for (const w of whooshes) {
  const len = Math.floor(SR * 0.55), start = Math.floor((w - 0.25) * SR);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const k = i / len, a = 0.02 + 0.55 * k * k;
    lp += (rnd() - lp) * a;
    const env = Math.sin(Math.PI * k) ** 1.6;
    if (start + i >= 0 && start + i < N) buf[start + i] += lp * env * 0.55;
  }
}
// impact hits: "Make decisions!" and the closing line
function hit(time, amp) {
  const start = Math.floor(time * SR), len = Math.floor(SR * 1.1);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = Math.exp(-t * 5.5);
    const f = 60 - 18 * Math.min(1, t * 3);
    if (start + i < N) buf[start + i] += amp * env * Math.sin(2 * Math.PI * f * t) + (i < 600 ? amp * 0.4 * rnd() * (1 - i / 600) : 0);
  }
}
// riser into the ALERT moment
for (let i = 0; i < SR * 1.25; i++) { const k = i / (SR * 1.25), t0 = 17.9 * SR + i; buf[Math.floor(t0)] += rnd() * 0.22 * k * k * Math.sin(2 * Math.PI * (300 + 1800 * k) * i / SR + 0); }
hit(19.16, 0.6);
hit(26.96, 0.5);
hit(27.55, 0.42);
// ticks while the evidence rows appear
for (const tk of [2.62, 9.3, 9.9, 10.6, 11.6, 11.9, 12.2, 16.5, 17.8, 18.1, 20.9, 21.9, 22.4, 27.75, 27.95, 28.15]) {
  const start = Math.floor(tk * SR), len = Math.floor(SR * 0.05);
  for (let i = 0; i < len; i++) buf[start + i] += Math.sin(2 * Math.PI * 1400 * i / SR) * Math.exp(-i / 350) * 0.12;
}
// normalize and write 16-bit mono WAV
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const g = 0.85 / (peak || 1);
const data = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * g * 32767))), i * 2);
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28);
h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
const dir = path.join(__dirname, '..', 'public', 'audio');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'bed.wav'), Buffer.concat([h, data]));
console.log('bed.wav:', (data.length / 1024 / 1024).toFixed(1), 'MB,', DUR, 's, peak before normalize', peak.toFixed(2));
