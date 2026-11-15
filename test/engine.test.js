const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');

function rec(id, scenario) {
  const profile = E.makeProfile(id);
  const h = E.makeHistory(id, scenario, profile);
  return { id, profile, readings: h.readings, evaDay: h.evaDay, envChangeDay: null };
}
const reading = (r, day, v) => E.addReading(r, day, v);

test('healthy history is good', () => {
  const r = E.classify(rec('A-01', 'healthy'));
  assert.equal(r.level, 0);
  assert.equal(r.pats.length, 0);
});

test('trend scenario: alert from route A with the fatigue pattern', () => {
  const r = E.classify(rec('A-02', 'trend'));
  assert.equal(r.level, 1);
  assert.equal(r.source, 'A');
  const p = r.pats.find(x => x.id === 'fatigue');
  assert.ok(p);
  assert.equal(p.conf, 'high');
});

test('high-risk scenario: attention', () => {
  const r = E.classify(rec('A-03', 'high'));
  assert.equal(r.level, 2);
  assert.ok(r.pats.some(x => x.id === 'fatigue' && x.level === 2));
});

test('dust pattern needs the EVA event', () => {
  const withEva = rec('A-01', 'dust');
  assert.ok(E.classify(withEva).pats.some(p => p.id === 'dust'));
  const noEva = rec('A-01', 'dust');
  noEva.evaDay = null;
  assert.ok(!E.classify(noEva).pats.some(p => p.id === 'dust'));
});

test('one acute fever reading is attention, provisional, without waiting 3 days', () => {
  const r = E.classify(rec('A-01', 'acute'));
  assert.equal(r.level, 2);
  assert.equal(r.source, 'B');
  assert.ok(r.limits.temp.provisional);
});

test('route B: two consecutive limit-2 readings become a critical emergency', () => {
  const r = rec('A-01', 'healthy');
  reading(r, 30, { temp: 39.6 });
  assert.equal(E.classify(r).level, 2);          // first reading: provisional attention
  reading(r, 30, { temp: 39.7 });
  const c = E.classify(r);                       // second consecutive reading: confirmed
  assert.equal(c.level, 3);
  assert.ok(c.limits.temp.confirmed);
});

test('route B: a normal reading after a breach clears the safety flag', () => {
  const r = rec('A-01', 'healthy');
  reading(r, 30, { temp: 38.9 });
  assert.equal(E.classify(r).level, 2);
  reading(r, 30, { temp: 36.7 });
  assert.equal(E.classify(r).level, 0);
});

test('limit comparators follow the profile table', () => {
  const L = E.LIMITS;
  assert.equal(E.limitLevel(L.temp, 38.4), 1);   // >= 38.4
  assert.equal(E.limitLevel(L.temp, 38.3), 0);
  assert.equal(E.limitLevel(L.spo2, 90), 0);     // < 90
  assert.equal(E.limitLevel(L.spo2, 89), 1);
  assert.equal(E.limitLevel(L.spo2, 84), 2);
  assert.equal(E.limitLevel(L.fc, 100), 0);      // > 100
  assert.equal(E.limitLevel(L.fc, 101), 1);
  assert.equal(E.limitLevel(L.fc, 44), 1);
  assert.equal(E.limitLevel(L.fc, 34), 2);
});

test('hysteresis: one good day does not clear attention, two good days do step down', () => {
  const r = rec('A-03', 'high');
  const base = r.profile.baseline;
  const good = { fc: base.fc.mean, sono: base.sono.mean, humor: base.humor.mean, pa: base.pa.mean };
  reading(r, 30, good);
  assert.ok(E.classify(r).level >= 1);
  reading(r, 31, good);
  assert.ok(E.classify(r).level < 2);
});

test('missing data never turns into a good state by omission', () => {
  const r = rec('A-02', 'trend');
  reading(r, 30, { pa: 118 });                   // only one field today
  const c = E.classify(r);
  assert.ok(c.level >= 1);
  assert.ok(c.inds.fc.insufficient === false || c.inds.fc.level >= 0);
});

test('validation rejects out-of-range values', () => {
  const e = E.validate({ fc: 400, sono: 7, spo2: 50 });
  assert.ok(e.fc && e.spo2 && !e.sono);
});

test('incapacitation detector: faint, sleep, sensor loss', () => {
  const lim = { fc: { low: [45, 35], high: [100, 130] } };
  const run = (mode, sleeping) => {
    const r = E.rng(7), buf = [];
    let last = { state: 'ok' };
    for (let t = 0; t < 100; t++) { buf.push(E.simulateSample(mode, t, r)); last = E.detectIncapacitation(buf, { limits: lim, sleeping }); }
    return last.state;
  };
  assert.equal(run('faint', false), 'suspect');
  assert.equal(run('sleep', true), 'sleep');
  assert.equal(run('sleep', false), 'ok');
  assert.equal(run('sensor', false), 'sensor');
});

test('false-alarm rate on random healthy data (no drift, iid noise at 1 sigma)', () => {
  const N = 400, r = E.rng(12345);
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * Math.SQRT2; };
  let alarms = 0, attention = 0;
  for (let s = 0; s < N; s++) {
    const profile = E.makeProfile('A-01');
    const readings = [];
    for (let d = 1; d <= 30; d++) {
      const v = {};
      for (const i of E.INDICATORS) {
        const b = profile.baseline[i.k];
        const x = i.kind === 'ord' ? b.mean + gauss() * (i.k === 'humor' ? 0.5 : 0.35) : b.mean + gauss() * b.sd;
        const f = Math.pow(10, i.dec);
        v[i.k] = Math.round(Math.min(i.max, Math.max(i.min, x)) * f) / f;
      }
      readings.push({ day: d, ts: d * 1440, v });
    }
    const c = E.classify({ id: 'x', profile, readings, evaDay: null, envChangeDay: null });
    if (c.routeA >= 1) alarms++;
    if (c.routeA >= 2) attention++;
  }
  const rate = alarms / N, rateAttn = attention / N;
  console.log(`false-alarm rate, route A, 30 days, ${N} simulated healthy astronauts: alert-or-higher ${(rate * 100).toFixed(1)}%, attention ${(rateAttn * 100).toFixed(1)}%`);
  assert.ok(rate < 0.2, 'alert false-alarm rate should stay under 20%');
  assert.ok(rateAttn < 0.1, 'attention false-alarm rate should stay under 10%');
});
