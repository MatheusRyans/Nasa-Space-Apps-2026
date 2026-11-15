// Neural offline narration with Piper (voice en_US-ryan-high). Needs Piper in C:/Users/<you>/piper-aih (ASCII path: espeak data breaks on accents).
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const PIPER = process.env.PIPER_DIR || path.join(os.homedir(), 'piper-aih');
const OUT = path.join(__dirname, '..', 'public', 'narration');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const SEG = [
  { id: 's1', cap: 'We are AIneedHealth.', say: 'We are, A I need health.', gap: 0 },
  { id: 's2', cap: 'Twenty minutes from Earth. No doctor on board. One failing body can put a whole mission at risk.', say: 'Twenty minutes from Earth. No doctor on board. One failing body can put a whole mission at risk.', gap: 0.35 },
  { id: 's3', cap: 'Wireless sensors stream over Bluetooth. No cables. Every reading, instantly.', say: 'Wireless sensors stream over Bluetooth. No cables. Every reading, instantly.', gap: 0.3 },
  { id: 's4', cap: 'We compare each reading with the astronaut\u2019s own baseline, correlate signals, and rate the risk.', say: 'We compare each reading with the astronaut\u2019s own baseline, correlate the signals, and rate the risk.', gap: 0.3 },
  { id: 's5', cap: 'Alert. The system tells the crew what to do, and mission control sees it at once.', say: 'Alert. The system tells the crew what to do, and mission control sees it at once.', gap: 0.3 },
  { id: 's6', cap: 'Protecting astronauts. Preserving missions.', say: 'Protecting astronauts. Preserving missions.', gap: 0.25 },
  { id: 's7', cap: 'Make decisions in real time.', say: 'Make decisions in real time.', gap: 0.3 }
];
function readWav(f) {
  const b = fs.readFileSync(f); let d = 12;
  while (d < b.length - 8 && b.toString('ascii', d, d + 4) !== 'data') d += 8 + b.readUInt32LE(d + 4);
  const rate = b.readUInt32LE(24), n = Math.floor((b.length - d - 8) / 2), s = new Int16Array(n);
  for (let i = 0; i < n; i++) s[i] = b.readInt16LE(d + 8 + 2 * i);
  return { rate, s };
}
function trim({ rate, s }) {
  let a = -1, z = -1; for (let i = 0; i < s.length; i++) if (Math.abs(s[i]) > 400) { if (a < 0) a = i; z = i; }
  const m = Math.floor(rate * 0.05); return { rate, s: s.slice(Math.max(0, a - m), Math.min(s.length, z + m)) };
}
function writeWav(f, { rate, s }) {
  const h = Buffer.alloc(44), n = s.length * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n, 40);
  const d = Buffer.alloc(n); for (let i = 0; i < s.length; i++) d.writeInt16LE(s[i], 2 * i);
  fs.writeFileSync(f, Buffer.concat([h, d]));
}
function synth(text, ls, file) {
  const r = spawnSync(path.join(PIPER, 'piper.exe'), ['-m', 'voice.onnx', '-f', file, '--length_scale', String(ls), '--sentence_silence', '0.18'], { cwd: PIPER, input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('piper failed: ' + r.stderr);
  return trim(readWav(file));
}
const tmp = path.join(PIPER, 'tmp.wav');
let chosen = null;
for (const ls of [1.0, 0.94, 0.9, 0.86, 0.82]) {
  const w = SEG.map(g => synth(g.say, ls, tmp));
  const durs = w.map(x => x.s.length / x.rate);
  const total = 0.9 + durs.reduce((a, d, i) => a + d + SEG[i].gap, 0);
  console.log('length_scale', ls, 'total', total.toFixed(2));
  if (total <= 28.7) { chosen = { ls, w, durs }; break; }
}
if (!chosen) throw new Error('script too long even at fastest scale');
let t = 0.9; const segments = [];
SEG.forEach((g, i) => {
  t += g.gap; const dur = chosen.durs[i];
  writeWav(path.join(OUT, g.id + '.wav'), chosen.w[i]);
  segments.push({ id: g.id, cap: g.cap, start: +t.toFixed(3), dur: +dur.toFixed(3) }); t += dur;
});
fs.writeFileSync(path.join(__dirname, '..', 'src', 'timing.json'), JSON.stringify({ voice: 'piper en_US-ryan-high', lengthScale: chosen.ls, end: +t.toFixed(3), segments }));
console.log(segments.map(s => `${s.id} ${s.start}→${(s.start + s.dur).toFixed(2)}`).join('\n'), '\nend', t.toFixed(2));
