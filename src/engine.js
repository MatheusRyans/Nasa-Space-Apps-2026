/* AIneedHealth engine: pure functions, no DOM, no network.
   Two independent routes feed one state (requirements doc, section 3):
   route A = trend against the individual baseline (persistence + hysteresis),
   route B = absolute safety limits (immediate, confirmed by 2 consecutive readings).
   Every number below is a parameter of the Medical Profile, set by the flight medical team. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Levels: 0 good, 1 alert, 2 attention, 3 critical emergency */
  const LEVEL_KEYS = ['good', 'alert', 'attention', 'emergency'];

  /* dir = direction of risk; kind: num (deviation in sigma) | ord (deviation in points) */
  const INDICATORS = [
    { k: 'fc', dir: 'up', kind: 'num', dec: 0, unit: 'bpm', region: 'chest', min: 30, max: 200, step: 1, hz: ['gravity', 'isolation'] },
    { k: 'spo2', dir: 'down', kind: 'num', dec: 0, unit: '%', region: 'chest', min: 70, max: 100, step: 1, hz: ['closedEnv'] },
    { k: 'fr', dir: 'both', kind: 'num', dec: 0, unit: 'rpm', region: 'chest', min: 4, max: 40, step: 1, hz: ['closedEnv', 'gravity'] },
    { k: 'pa', dir: 'both', kind: 'num', dec: 0, unit: 'mmHg', region: 'chest', min: 60, max: 220, step: 1, hz: ['gravity'] },
    { k: 'sym_tosse', dir: 'up', kind: 'ord', dec: 1, unit: '/3', region: 'chest', min: 0, max: 3, step: 1, hz: ['closedEnv'] },
    { k: 'sono', dir: 'down', kind: 'num', dec: 1, unit: 'h', region: 'head', min: 0, max: 14, step: 0.1, hz: ['isolation', 'closedEnv'] },
    { k: 'humor', dir: 'down', kind: 'ord', dec: 1, unit: '/5', region: 'head', min: 1, max: 5, step: 1, hz: ['isolation', 'distance'] },
    { k: 'sym_olho', dir: 'up', kind: 'ord', dec: 1, unit: '/3', region: 'head', min: 0, max: 3, step: 1, hz: ['closedEnv'] },
    { k: 'temp', dir: 'up', kind: 'num', dec: 1, unit: '°C', region: 'arms', min: 34, max: 42, step: 0.1, hz: ['gravity', 'closedEnv'] },
    { k: 'sym_pele', dir: 'up', kind: 'ord', dec: 1, unit: '/3', region: 'arms', min: 0, max: 3, step: 1, hz: ['closedEnv'] },
    { k: 'gli', dir: 'both', kind: 'num', dec: 0, unit: 'mg/dL', region: 'general', min: 30, max: 500, step: 1, hz: [] }
  ];
  const IK = Object.fromEntries(INDICATORS.map(i => [i.k, i]));

  /* Route B: absolute limits [limit 1 -> attention, limit 2 -> critical emergency] */
  const LIMITS = {
    temp: { high: [38.4, 39.5], hiOp: 'ge' },
    spo2: { low: [90, 85] },
    fc: { high: [100, 130], hiOp: 'gt', low: [45, 35] },
    pa: { high: [160, 180], hiOp: 'ge', low: [90, 70] },
    gli: { high: [180, 300], hiOp: 'gt', low: [70, 54] }
  };

  /* Long-term capacity: requirements of NASA-STD-3001 Vol. 1 Rev C, shown as a separate seal */
  const CAPACITY = [
    { k: 'aer', ref: 'V1 4003', req: 80 },
    { k: 'force', ref: 'V1 4024', req: 80 },
    { k: 'bmd', ref: 'V1 4027', req: 95 },
    { k: 'dose', ref: 'V1 4030', max: 600 }
  ];

  const TOLERANCES = {
    alertSigma: 1, attnSigma: 2, enterDays: 3,
    exitAlertSigma: 0.7, exitAttnSigma: 1.5, exitDays: 2,
    ordAlertPts: 1, ordAttnPts: 2, ordExitAlertPts: 0.5, ordExitAttnPts: 1.5,
    evaWindowDays: 3, adaptationDays: 2, adaptFactor: 1.5, minDwellHours: 24
  };

  const BASE = {
    fc: [62, 3], spo2: [97, 1], fr: [14, 2], pa: [118, 6], sym_tosse: [0.3, 0.4],
    sono: [7.2, 0.5], humor: [4.0, 0.5], sym_olho: [0.3, 0.4], temp: [36.6, 0.2], sym_pele: [0.3, 0.4], gli: [92, 6]
  };
  /* small individual differences, deterministic */
  const INDIV = { 'A-01': { fc: -2 }, 'A-02': { fc: -4, sono: 0.2 }, 'A-03': { fc: 3, pa: 4 }, 'A-04': { fc: -1, gli: -3 } };

  function makeProfile(id) {
    const baseline = {};
    for (const i of INDICATORS) {
      const [m, sd] = BASE[i.k];
      baseline[i.k] = { mean: m + ((INDIV[id] || {})[i.k] || 0), sd };
    }
    return {
      version: 3, approvedBy: 'Flight surgeon (simulated)', approvedAt: '2026-10-02', env: 'station',
      baseline, limits: LIMITS, tolerances: Object.assign({}, TOLERANCES),
      capacity: { aer: 93, force: 97, bmd: 98, dose: 42 }
    };
  }

  /* ---------- deterministic noise for the simulated history ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* drift targets: sigma for num indicators, points for ord indicators, in the risk direction */
  const SCENARIOS = {
    healthy: { drift: {}, start: 0 },
    trend: { drift: { fc: 1.6, sono: 1.6, humor: 1.4 }, start: 12 },
    high: { drift: { fc: 2.8, sono: 2.8, humor: 2.6, pa: 1.6 }, start: 10 },
    dust: { drift: { sym_olho: 1.4, sym_tosse: 1.4, sym_pele: 1.4 }, step: 27, eva: 27 },
    acute: { drift: {}, start: 0, lastTemp: 38.9 }
  };

  /* history of days 1..29; day 30 is today and its check-in is still pending */
  function makeHistory(id, scenario, profile) {
    const S = SCENARIOS[scenario] || SCENARIOS.healthy;
    const readings = [];
    const rs = {};
    for (const i of INDICATORS) rs[i.k] = rng(hash(id + i.k));
    for (let d = 1; d <= 29; d++) {
      const v = {};
      for (const i of INDICATORS) {
        const b = profile.baseline[i.k];
        const zt = S.drift[i.k] || 0;
        let ramp = 0;
        if (zt) ramp = S.step != null ? (d >= S.step ? 1 : 0) : Math.max(0, Math.min(1, (d - 1 - S.start) / (24 - S.start)));
        const sign = i.dir === 'down' ? -1 : 1;
        const noise = (rs[i.k]() * 2 - 1);
        let val;
        if (i.kind === 'ord') val = b.mean + sign * zt * ramp + noise * 0.25;
        else val = b.mean + sign * zt * ramp * b.sd + noise * 0.35 * b.sd;
        val = Math.min(i.max, Math.max(i.min, val));
        const f = Math.pow(10, i.dec);
        v[i.k] = Math.round(val * f) / f;
      }
      if (S.lastTemp && d === 29) v.temp = S.lastTemp;
      readings.push({ day: d, ts: d * 1440 + 480, v });
    }
    return { readings, evaDay: S.eva || null };
  }

  /* ---------- helpers ---------- */
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  function badDev(i, value, b) {
    const raw = i.kind === 'ord' ? value - b.mean : (value - b.mean) / b.sd;
    return i.dir === 'up' ? raw : i.dir === 'down' ? -raw : Math.abs(raw);
  }
  function signedDev(i, value, b) { return i.kind === 'ord' ? value - b.mean : (value - b.mean) / b.sd; }

  function dailySeries(rec) {
    const last = {};
    const maxDay = rec.readings.reduce((m, r) => Math.max(m, r.day), 0);
    for (const r of rec.readings) {
      for (const k in r.v) if (r.v[k] != null) { (last[k] = last[k] || {})[r.day] = r.v[k]; }
    }
    const out = {};
    for (const i of INDICATORS) {
      const arr = [];
      for (let d = 1; d <= maxDay; d++) arr.push((last[i.k] && last[i.k][d] != null) ? last[i.k][d] : null);
      out[i.k] = arr;
    }
    return { series: out, maxDay };
  }

  function stepLevel(lvl, hist, th) {
    const n = th.enterDays, m = th.exitDays;
    const a = hist.slice(-n), b = hist.slice(-m);
    const all = (arr, len, f) => arr.length === len && arr.every(x => x != null && f(x));
    if (all(a, n, x => x >= th.t2)) return 2;
    if (lvl < 2 && all(a, n, x => x >= th.t1)) return 1;
    if (lvl === 2) { if (all(b, m, x => x < th.x1)) return 0; if (all(b, m, x => x < th.x2)) return 1; return 2; }
    if (lvl === 1) { return all(b, m, x => x < th.x1) ? 0 : 1; }
    return 0;
  }

  function limitLevel(lim, v) {
    let lv = 0;
    if (lim.high) {
      const ge = lim.hiOp === 'ge';
      const hit = n => ge ? v >= n : v > n;
      if (hit(lim.high[1])) lv = 2; else if (hit(lim.high[0])) lv = 1;
    }
    if (lim.low) {
      if (v < lim.low[1]) lv = Math.max(lv, 2); else if (v < lim.low[0]) lv = Math.max(lv, 1);
    }
    return lv;
  }

  /* patterns: two or more concordant indicators; confidence by count */
  const PATTERNS = [
    { id: 'fatigue', keys: ['fc', 'sono', 'humor'], min: 2, hz: ['isolation', 'closedEnv'] },
    { id: 'dust', keys: ['sym_olho', 'sym_tosse', 'sym_pele'], min: 2, eva: true, hz: ['closedEnv'] },
    { id: 'cardio', keys: ['pa', 'fc'], min: 2, hz: ['gravity'] }
  ];

  /* ---------- classification ---------- */
  function classify(rec) {
    const prof = rec.profile, tol = prof.tolerances;
    const { series, maxDay } = dailySeries(rec);
    const adapting = rec.envChangeDay != null && (maxDay - rec.envChangeDay) < tol.adaptationDays;
    const f = adapting ? tol.adaptFactor : 1;
    const out = { inds: {}, pats: [], watch: [], limits: {}, capacity: [], maxDay, adapting, insufficient: false };

    for (const i of INDICATORS) {
      const b = prof.baseline[i.k], vals = series[i.k];
      const th = i.kind === 'ord'
        ? { t1: tol.ordAlertPts * f, t2: tol.ordAttnPts * f, x1: tol.ordExitAlertPts, x2: tol.ordExitAttnPts, enterDays: tol.enterDays, exitDays: tol.exitDays }
        : { t1: tol.alertSigma * f, t2: tol.attnSigma * f, x1: tol.exitAlertSigma, x2: tol.exitAttnSigma, enterDays: tol.enterDays, exitDays: tol.exitDays };
      const hist = [];
      let lvl = 0;
      for (const v of vals) {
        hist.push(v == null ? null : badDev(i, v, b));
        lvl = stepLevel(lvl, hist, th);
      }
      let persist = 0;
      for (let x = hist.length - 1; x >= 0 && hist[x] != null && hist[x] >= th.t1; x--) persist++;
      const recent = vals.slice(-3).filter(v => v != null);
      const cur = recent.length ? avg(recent) : null;
      const lastV = [...vals].reverse().find(v => v != null);
      const missing = vals.slice(-3).filter(v => v == null).length;
      out.inds[i.k] = {
        k: i.k, level: lvl, persist, cur, last: lastV == null ? null : lastV,
        dev: cur == null ? null : signedDev(i, cur, b), bad: hist.slice(-3).filter(x => x != null).length ? avg(hist.slice(-3).filter(x => x != null)) : 0,
        series: vals, baseline: b, insufficient: missing >= 2
      };
    }
    out.insufficient = INDICATORS.filter(i => out.inds[i.k].insufficient).length >= Math.ceil(INDICATORS.length / 2);

    for (const P of PATTERNS) {
      const act = P.keys.filter(k => out.inds[k].level >= 1);
      let ok = act.length >= P.min;
      if (ok && P.eva) {
        ok = rec.evaDay != null && act.every(k => {
          const onset = maxDay - out.inds[k].persist + 1;
          return onset >= rec.evaDay && onset - rec.evaDay <= tol.evaWindowDays - 1;
        });
      }
      if (ok) out.pats.push({ id: P.id, keys: P.keys, hz: P.hz, act, level: Math.max(...act.map(k => out.inds[k].level)), conf: act.length >= 3 ? 'high' : 'medium' });
    }

    /* route B: last two readings per parameter */
    let b3 = 0;
    for (const k in prof.limits) {
      const lim = prof.limits[k];
      const rd = rec.readings.filter(r => r.v[k] != null).slice(-2);
      if (!rd.length) continue;
      const lastLv = limitLevel(lim, rd[rd.length - 1].v[k]);
      const prevLv = rd.length === 2 ? limitLevel(lim, rd[0].v[k]) : 0;
      if (lastLv === 0) continue;
      const confirmed = prevLv > 0;
      const level = confirmed ? Math.min(lastLv, prevLv) : 1;
      out.limits[k] = { k, value: rd[rd.length - 1].v[k], rawLevel: lastLv, level, confirmed, provisional: !confirmed };
      b3 = Math.max(b3, confirmed ? (level === 2 ? 3 : 2) : 2);
    }

    for (const c of CAPACITY) {
      const v = prof.capacity[c.k];
      const below = c.max ? v >= c.max : v < c.req;
      out.capacity.push({ k: c.k, ref: c.ref, value: v, req: c.req, max: c.max, below });
    }

    let a = 0;
    out.pats.forEach(p => a = Math.max(a, p.level));
    INDICATORS.forEach(i => { if (out.inds[i.k].level === 2) a = 2; });
    const inPat = new Set(out.pats.flatMap(p => p.act));
    out.watch = INDICATORS.filter(i => out.inds[i.k].level === 1 && !inPat.has(i.k)).map(i => i.k);
    out.routeA = a; out.routeB = b3;
    out.level = Math.max(a, b3);
    out.source = b3 > a ? 'B' : a > 0 ? 'A' : null;

    out.region = {};
    for (const r of ['head', 'chest', 'arms']) {
      let m = Math.max(0, ...INDICATORS.filter(i => i.region === r).map(i => out.inds[i.k].level));
      INDICATORS.filter(i => i.region === r && out.limits[i.k]).forEach(i => { m = Math.max(m, out.limits[i.k].level === 2 && out.limits[i.k].confirmed ? 3 : 2); });
      out.region[r] = m;
    }
    out.region.legs = 0;
    let gen = out.level;
    out.region.general = gen;

    const nums = INDICATORS.filter(i => i.kind === 'num');
    const recentBad = avg(nums.map(i => Math.max(0, out.inds[i.k].bad)));
    const early = avg(nums.map(i => {
      const h = out.inds[i.k].series.slice(Math.max(0, maxDay - 24), Math.max(0, maxDay - 17)).filter(v => v != null).map(v => badDev(i, v, out.inds[i.k].baseline));
      return h.length ? Math.max(0, avg(h)) : 0;
    }));
    const d = recentBad - early;
    out.trend = d > 0.3 ? 'worsening' : d < -0.3 ? 'improving' : 'stable';
    return out;
  }

  /* add a check-in reading (same-day repeats count as extra readings for route B) */
  function addReading(rec, day, values, ts) {
    const v = {};
    let any = false;
    for (const i of INDICATORS) {
      const x = values[i.k];
      if (x === '' || x == null || Number.isNaN(Number(x))) v[i.k] = null; else { v[i.k] = Number(x); any = true; }
    }
    if (!any) return false;
    rec.readings.push({ day, ts: ts == null ? day * 1440 + 480 : ts, v });
    return true;
  }

  function validate(values) {
    const errors = {};
    for (const i of INDICATORS) {
      const x = values[i.k];
      if (x === '' || x == null) continue;
      const n = Number(x);
      if (Number.isNaN(n) || n < i.min || n > i.max) errors[i.k] = { min: i.min, max: i.max };
    }
    return errors;
  }

  /* ---------- incapacitation detector (1 sample = 1 second) ---------- */
  const DETECTOR = { win: 20, hrWin: 10, motionMax: 5, qSuspect: 0.6, qLost: 0.4 };
  function detectIncapacitation(buf, ctx) {
    const th = Object.assign({}, DETECTOR, ctx && ctx.th);
    if (buf.length < th.win) return { state: 'ok' };
    const recent = buf.slice(-th.win);
    const q = avg(recent.map(s => s.q));
    if (q < th.qLost || recent.some(s => s.hr == null)) return { state: 'sensor' };
    const hrWin = buf.slice(-th.hrWin);
    const lim = ctx.limits.fc;
    const hrBad = hrWin.every(s => s.hr < lim.low[1] || s.hr > lim.high[1]);
    const still = recent.every(s => s.motion <= th.motionMax);
    if (ctx.sleeping) return hrBad ? { state: 'suspect', reason: 'hr' } : { state: 'sleep' };
    if (q >= th.qSuspect && hrBad && still) return { state: 'suspect', reason: 'hr+still' };
    return { state: 'ok' };
  }

  /* simulated sensor stream for the demo */
  function simulateSample(mode, t, r) {
    const n = () => r() * 2 - 1;
    if (mode === 'faint') {
      if (t < 25) return { hr: 64 + n() * 2, motion: 30 + n() * 8, q: 0.95 };
      const p = Math.min(1, (t - 25) / 20);
      return { hr: 64 - p * 36 + n() * 1, motion: Math.max(0, 30 * (1 - p) + n() * 2), q: 0.95 };
    }
    if (mode === 'sleep') return { hr: 52 + n() * 2, motion: 1 + Math.abs(n()), q: 0.95 };
    if (mode === 'sensor') {
      if (t < 20) return { hr: 64 + n() * 2, motion: 30 + n() * 8, q: 0.95 };
      return { hr: null, motion: 0, q: 0.1 };
    }
    return { hr: 64 + n() * 2, motion: 30 + n() * 8, q: 0.95 };
  }

  return {
    LEVEL_KEYS, INDICATORS, IK, LIMITS, CAPACITY, TOLERANCES, PATTERNS, SCENARIOS, DETECTOR,
    makeProfile, makeHistory, classify, addReading, validate, detectIncapacitation, simulateSample, limitLevel, rng, hash
  };
});
