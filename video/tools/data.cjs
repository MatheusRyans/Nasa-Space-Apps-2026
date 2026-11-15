// Runs the real AIneedHealth engine on the simulated scenarios used in the video, so every number on screen
// comes from src/engine.js and not from the animation code.
const fs = require('fs');
const path = require('path');
const E = require('../../src/engine.js');
const T = require('../../src/i18n.js');

function rec(id, scenario) {
  const profile = E.makeProfile(id);
  const h = E.makeHistory(id, scenario, profile);
  return { id, profile, readings: h.readings, evaDay: h.evaDay, envChangeDay: null };
}
const r2 = x => (x == null ? null : Math.round(x * 100) / 100);

const trend = E.classify(rec('A-02', 'trend'));
const dust = E.classify(rec('A-02', 'dust'));
const healthy = E.classify(rec('A-01', 'healthy'));
const t = (k, v) => T.t('en', k, v);

const out = {
  sleep: {
    series: trend.inds.sono.series.map(r2),
    mean: trend.inds.sono.baseline.mean,
    sd: trend.inds.sono.baseline.sd,
    level: trend.inds.sono.level,
    persist: trend.inds.sono.persist
  },
  trend: { level: trend.level, pattern: (trend.pats[0] || {}).id, conf: (trend.pats[0] || {}).conf },
  dust: {
    level: dust.level,
    pattern: (dust.pats[0] || {}).id,
    conf: (dust.pats[0] || {}).conf,
    evaDay: 27,
    symptoms: ['sym_olho', 'sym_tosse', 'sym_pele'].map(k => ({
      k, label: t('ind.' + k + '.s'), cur: r2(dust.inds[k].cur), base: r2(dust.inds[k].baseline.mean), dev: r2(dust.inds[k].dev), level: dust.inds[k].level, persist: dust.inds[k].persist
    }))
  },
  healthy: { level: healthy.level },
  copy: {
    msg: t('pat.dust.m1'),
    ifnot: t('pat.dust.ifnot'),
    action: t('pat.dust.a1')[0],
    why: 'Dust particles carried into the habitat after the EVA',
    q: [t('q.1'), t('q.2'), t('q.3'), t('q.4'), t('q.5')]
  },
  limits: { temp: E.LIMITS.temp, spo2: E.LIMITS.spo2 }
};
const dst = path.join(__dirname, '..', 'src', 'data.json');
fs.writeFileSync(dst, JSON.stringify(out, null, 2));
console.log('data.json: sleep level', out.sleep.level, '| dust level', out.dust.level, out.dust.pattern, out.dust.conf, '| symptoms', out.dust.symptoms.map(s => s.label + ' ' + s.cur).join(', '));
