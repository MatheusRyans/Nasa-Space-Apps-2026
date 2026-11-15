// Fits the OmniVoice takes (from tools/gen_voice.py) into the existing timeline: trims silence,
// time-compresses (pitch-preserving atempo, max 1.2x) only when a take overruns its slot, loudness-normalizes.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const SRC = process.argv[2], ROOT = path.join(__dirname, '..');
const FFMPEG = path.join(ROOT, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe');
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'timing.json'), 'utf8').replace(/^﻿/, ''));
const OUT = path.join(ROOT, 'public', 'narration');
function readWav(f) {
  const b = fs.readFileSync(f); let d = 12;
  while (d < b.length - 8 && b.toString('ascii', d, d + 4) !== 'data') d += 8 + b.readUInt32LE(d + 4);
  const rate = b.readUInt32LE(24), n = Math.floor((b.length - d - 8) / 2), s = new Int16Array(n);
  for (let i = 0; i < n; i++) s[i] = b.readInt16LE(d + 8 + 2 * i);
  return { rate, s };
}
function writeWav(f, rate, s) {
  const h = Buffer.alloc(44), n = s.length * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n, 40);
  const d = Buffer.alloc(n); for (let i = 0; i < s.length; i++) d.writeInt16LE(s[i], 2 * i);
  fs.writeFileSync(f, Buffer.concat([h, d]));
}
const START_S1 = 0.65, TAIL = 0.2, END = 29.3;
const segs = timing.segments; segs[0].start = START_S1;
let report = [];
segs.forEach((sg, i) => {
  const { rate, s } = readWav(path.join(SRC, sg.id + '.wav'));
  let a = -1, z = -1; for (let k = 0; k < s.length; k++) if (Math.abs(s[k]) > 300) { if (a < 0) a = k; z = k; }
  const m = Math.floor(rate * 0.04), t = s.slice(Math.max(0, a - m), Math.min(s.length, z + m));
  const tmp = path.join(SRC, sg.id + '.trim.wav'); writeWav(tmp, rate, t);
  const dur = t.length / rate, slotEnd = i + 1 < segs.length ? segs[i + 1].start - TAIL : END, slot = slotEnd - sg.start;
  const tempo = Math.min(1.2, Math.max(1, dur / slot));
  const out = path.join(OUT, sg.id + '.wav');
  const r = spawnSync(FFMPEG, ['-y', '-v', 'error', '-i', tmp, '-af', `atempo=${tempo.toFixed(4)},loudnorm=I=-17:TP=-1.5:LRA=9`, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', out]);
  if (r.status !== 0) throw new Error(String(r.stderr));
  const o = readWav(out); sg.dur = +(o.s.length / o.rate).toFixed(3);
  report.push(`${sg.id} start ${sg.start} dur ${sg.dur} slot ${slot.toFixed(2)} tempo ${tempo.toFixed(3)}`);
});
timing.voice = 'OmniVoice (VoiceStudio engine), male american, voice design'; delete timing.lengthScale;
timing.end = +(segs[segs.length - 1].start + segs[segs.length - 1].dur).toFixed(3);
fs.writeFileSync(path.join(ROOT, 'src', 'timing.json'), JSON.stringify(timing));
console.log(report.join('\n'), '\nend', timing.end);
