(function () {
  'use strict';
  const E = window.Engine, TT = window.I18N;
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- language ---------- */
  let lang = 'en';
  try { lang = localStorage.getItem('ainh-lang') || 'en'; } catch (e) { /* storage may be blocked */ }
  const t = (k, v) => TT.t(lang, k, v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => Number(v).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const sgn = (v, d) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v), d == null ? 1 : d);
  const un = u => (u.charAt(0) === '/' || u === '%' ? u : ' ' + u);

  /* ---------- state ---------- */
  const ROSTER = [
    { id: 'A-01', name: 'M. Alves', scn: 'healthy' },
    { id: 'A-02', name: 'K. Tanaka', scn: 'trend' },
    { id: 'A-03', name: 'R. Okafor', scn: 'high' },
    { id: 'A-04', name: 'E. Lindqvist', scn: 'healthy' }
  ];
  const TABS = ['overview', 'checkin', 'history', 'profile'];
  const S = { user: 1, tab: 'overview', region: 'chest', ind: 'sono', recs: [], events: [], eid: 0, clock: 30 * 1440 + 480, sim: null, result: null, errors: {}, form: {}, gateMsg: null, demoOpen: window.innerWidth > 700, anim: false, scanNext: false, fresh: false };

  function mkRec(i, scn) {
    const id = ROSTER[i].id, profile = E.makeProfile(id), h = E.makeHistory(id, scn, profile);
    const rec = { i, id, name: ROSTER[i].name, profile, readings: h.readings, evaDay: h.evaDay, evaOn: false, envChangeDay: null, env: scn === 'dust' ? 'moon' : 'station', today: 30, fresh: false, em: null, loss: false, sleeping: false, scenario: scn };
    recompute(rec);
    return rec;
  }
  function recompute(rec) {
    rec.res = E.classify(rec);
    rec.level = (rec.em && rec.em.stage === 'declared') ? 3 : rec.res.level;
  }
  const cur = () => S.recs[S.user];
  const checkedToday = rec => rec.readings.some(r => r.day === rec.today);

  function tstr(m) {
    const d = Math.floor(m / 1440), mm = m % 1440;
    return 'D+' + d + ' ' + String(Math.floor(mm / 60)).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0');
  }
  function addEv(who, lv, key, vars, pub) { S.events.push({ id: S.eid++, m: S.clock, who, lv, key, vars: vars || {}, pub: !!pub }); }
  function evText(ev) {
    const v = Object.assign({}, ev.vars);
    v.name = ROSTER[ev.who].name;
    if (v.ind) v.param = t('ind.' + v.ind + '.s');
    if (v.pattern) v.pattern = t('pat.' + v.pattern + '.name');
    if (v.from != null) v.from = t('lv.' + v.from);
    if (v.to != null) v.to = t('lv.' + v.to);
    if (v.conf) v.conf = t('conf.' + v.conf);
    if (v.scenario) v.scenario = t('demo.sc.' + v.scenario);
    return t(ev.key, v);
  }
  function logChange(rec, prev) {
    const now = rec.res;
    if (rec.level !== prev.level) addEv(rec.i, rec.level, 'evt.state', { from: prev.level, to: rec.level });
    now.pats.forEach(p => { if (!prev.res.pats.some(q => q.id === p.id)) addEv(rec.i, p.level, 'evt.pattern', { pattern: p.id, conf: p.conf }); });
    Object.keys(now.limits).forEach(k => { if (!prev.res.limits[k]) addEv(rec.i, 2, 'evt.limit', { ind: k }); });
  }
  function snap(rec) { return { level: rec.level, res: rec.res }; }

  /* ---------- icons ---------- */
  const IC = {
    0: '<circle cx="8" cy="8" r="6.5"/><path d="M5 8.3l2.2 2.2L11 6"/>',
    1: '<path d="M8 2.2L14.2 13H1.8Z"/><path d="M8 6.5v3.3M8 11.6v.1"/>',
    2: '<path d="M5 2.2h6L14.2 8 11 13.8H5L1.8 8Z"/><path d="M8 5.6v3.2M8 10.6v.1"/>',
    3: '<path d="M5.2 1.8h5.6l3.4 3.4v5.6l-3.4 3.4H5.2L1.8 10.8V5.2Z"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"/>'
  };
  const icon = l => '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[l] + '</svg>';
  const pill = (l, txt) => '<span class="pill lv' + l + '">' + icon(l) + esc(txt || t('lv.' + l)) + '</span>';

  /* ---------- charts ---------- */
  function spark(series, base, lv, w, h) {
    w = w || 96; h = h || 26;
    const vals = series.slice(-30), nn = vals.filter(v => v != null);
    if (nn.length < 2) return '';
    const sd = base.sd || 0.4, lo = Math.min(base.mean - 2.2 * sd, ...nn), hi = Math.max(base.mean + 2.2 * sd, ...nn);
    const x = i => 2 + i * (w - 4) / (vals.length - 1), y = v => h - 2 - (v - lo) / (hi - lo) * (h - 4);
    let d = '', pen = false, lastI = 0;
    vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true; lastI = i; });
    return '<svg class="sp lv' + lv + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="30-day trend"><rect class="sp-band" x="0" y="' + y(base.mean + sd).toFixed(1) + '" width="' + w + '" height="' + (y(base.mean - sd) - y(base.mean + sd)).toFixed(1) + '"/><path class="sp-line draw" pathLength="1" d="' + d + '"/><circle class="sp-dot" cx="' + x(lastI).toFixed(1) + '" cy="' + y(vals[lastI]).toFixed(1) + '" r="2.6"/></svg>';
  }
  function niceStep(range) { const raw = range / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
  function bigChart(I, rec) {
    const d = rec.res.inds[I.k], vals = d.series.slice(-30), base = d.baseline, sd = base.sd || 0.4;
    const W = 640, H = 220, L = 50, R = 14, T = 14, B = 28, n = vals.length, maxDay = rec.res.maxDay, d0 = maxDay - n + 1;
    const nn = vals.filter(v => v != null);
    if (!nn.length) return '';
    let lo = Math.min(base.mean - 2.5 * sd, ...nn), hi = Math.max(base.mean + 2.5 * sd, ...nn);
    const st = niceStep(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
    const x = i => L + i * (W - L - R) / Math.max(1, n - 1), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    let g = '';
    for (let v = lo; v <= hi + 1e-9; v += st) g += '<line class="gridl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (y(v) + 3).toFixed(1) + '" text-anchor="end">' + fmt(v, st < 1 ? 1 : 0) + '</text>';
    [0, Math.round((n - 1) / 3), Math.round(2 * (n - 1) / 3), n - 1].forEach(i => { g += '<text class="ax" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">D+' + (d0 + i) + '</text>'; });
    let path = '', pen = false;
    vals.forEach((v, i) => { if (v == null) { pen = false; return; } path += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true; });
    const dots = vals.map((v, i) => (v != null && i >= n - 3) ? '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.6" fill="var(--c)"/>' : '').join('');
    let eva = '';
    if (rec.evaDay != null && rec.evaDay >= d0) { const xi = x(rec.evaDay - d0); eva = '<line x1="' + xi.toFixed(1) + '" x2="' + xi.toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--accent)" stroke-dasharray="4 3"/><text class="ax" x="' + (xi - 4).toFixed(1) + '" y="' + (T + 10) + '" text-anchor="end" style="fill:var(--accent)">' + t('hist.eva') + ' D+' + rec.evaDay + '</text>'; }
    return '<svg class="lv' + d.level + '" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(t('ind.' + I.k)) + '">' + g + '<rect class="band" x="' + L + '" y="' + y(base.mean + sd).toFixed(1) + '" width="' + (W - L - R) + '" height="' + (y(base.mean - sd) - y(base.mean + sd)).toFixed(1) + '"/>' + eva + '<path class="ln draw" pathLength="1" d="' + path + '"/>' + dots + '</svg>';
  }
  function emChart(buf, lim) {
    const s = buf.slice(-100), n = s.length;
    if (n < 2) return '';
    const W = 640, H = 250, L = 50, R = 14, T = 22, hh = 120, gap = 26, ah = 46, Y0 = 20, Y1 = 90;
    const x = i => L + i * (W - L - R) / (n - 1), yh = v => T + hh * (1 - (Math.min(Y1, Math.max(Y0, v)) - Y0) / (Y1 - Y0)), ya = v => T + hh + gap + ah * (1 - Math.min(60, v) / 60);
    let g = '';
    [30, 50, 70, 90].forEach(v => { g += '<line class="gridl" x1="' + L + '" x2="' + (W - R) + '" y1="' + yh(v).toFixed(1) + '" y2="' + yh(v).toFixed(1) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (yh(v) + 3).toFixed(1) + '" text-anchor="end">' + v + '</text>'; });
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yh(lim).toFixed(1) + '" y2="' + yh(lim).toFixed(1) + '" stroke="var(--lv3)" stroke-dasharray="4 3"/>';
    const p = (key, f) => { let d = '', pen = false; s.forEach((q, i) => { const v = q[key]; if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + f(v).toFixed(1); pen = true; }); return d; };
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(t('em.chart.title')) + '">' + g + '<text class="ax" x="' + L + '" y="' + (T - 8) + '">' + esc(t('em.chart.hr')) + '</text><text class="ax" x="' + L + '" y="' + (T + hh + gap - 6) + '">' + esc(t('em.chart.motion')) + '</text><text class="ax" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">t0</text><path class="ln" d="' + p('hr', yh) + '"/><path class="ln" style="stroke:var(--accent)" d="' + p('motion', ya) + '"/></svg>';
  }

  /* ---------- explanation ---------- */
  function worstLimit(res) {
    const arr = Object.values(res.limits);
    arr.sort((a, b) => (b.confirmed ? b.level + 1 : 0) - (a.confirmed ? a.level + 1 : 0));
    return arr[0] || null;
  }
  function primaryPat(res) { return [...res.pats].sort((a, b) => b.level - a.level || b.act.length - a.act.length)[0]; }
  function headline(rec) {
    const res = rec.res;
    if (rec.em && rec.em.stage === 'declared') return t('head.em');
    if (res.source === 'B') {
      const l = worstLimit(res), param = t('ind.' + l.k);
      return l.provisional ? t('head.limitProv', { param }) : (l.level === 2 ? t('head.limit2', { param }) : t('head.limit1', { param }));
    }
    const p = primaryPat(res);
    if (res.level >= 1 && p) return t('pat.' + p.id + (res.level === 1 ? '.m1' : '.m2'));
    if (res.level >= 2) return t('head.single', { list: INDS_OF(res, 2).map(k => t('ind.' + k + '.s')).join(', ') });
    if (res.watch.length) return t('head.watch', { list: res.watch.map(k => t('ind.' + k + '.s')).join(', ') });
    return t('head.good');
  }
  const INDS_OF = (res, lv) => E.INDICATORS.filter(i => res.inds[i.k].level >= lv).map(i => i.k);
  function limitText(k) {
    const L = E.LIMITS[k], parts = [];
    if (L.high) parts.push(t('prof.high') + ' ' + (L.hiOp === 'ge' ? '≥ ' : '> ') + L.high[0]);
    if (L.low) parts.push(t('prof.low') + ' < ' + L.low[0]);
    return parts.join(' · ');
  }
  function explain(rec) {
    const res = rec.res, lv = rec.level, p = primaryPat(res), lims = Object.values(res.limits);
    const what = [], hz = [];
    let why = '', ifnot = '', acts = [], urg = '';
    const dev = E.INDICATORS.filter(i => res.inds[i.k].level >= 1).sort((a, b) => res.inds[b.k].bad - res.inds[a.k].bad);
    if (lv === 0) {
      what.push(t('q.none.1'));
      if (res.watch.length) what.push(res.watch.map(k => t('ind.' + k + '.s') + ' ' + sgn(res.inds[k].dev) + (E.IK[k].kind === 'ord' ? '' : 'σ')).join(', '));
      why = t('q.none.2'); ifnot = t('q.none.4'); acts = [t('q.none.5a'), t('q.none.5b')]; urg = t('q.urg.0');
    } else {
      lims.forEach(l => { const I = E.IK[l.k]; what.push(t('ind.' + l.k) + ': ' + fmt(l.value, I.dec) + un(I.unit) + ' (' + limitText(l.k) + ') — ' + (l.confirmed ? t('q.limit.conf') : t('q.limit.prov'))); });
      dev.slice(0, 5).forEach(I => { const d = res.inds[I.k]; what.push(t('ind.' + I.k) + ': ' + fmt(d.cur, I.dec) + un(I.unit) + ' · ' + t('region.base') + ' ' + fmt(d.baseline.mean, I.dec) + ' (' + sgn(d.dev) + (I.kind === 'ord' ? '' : 'σ') + ', ' + d.persist + ' d)'); });
      if (res.source === 'B') {
        const w = worstLimit(res);
        why = t('q.limit.2'); ifnot = t('q.limit.4');
        const crit = lv === 3;
        acts = crit ? [t('q.limit.crit.5a'), t('q.limit.crit.5b')] : [t('q.limit.5a'), t('q.limit.5b')];
        urg = crit ? t('q.limit.crit.urg') : t('q.limit.urg');
        if (w) E.IK[w.k].hz.forEach(h => hz.push(h));
      } else if (p) {
        why = t('pat.' + p.id + '.hyp'); ifnot = t('pat.' + p.id + '.ifnot');
        acts = t('pat.' + p.id + (lv === 1 ? '.a1' : '.a2')); urg = t('pat.' + p.id + (lv === 1 ? '.u1' : '.u2'));
        p.hz.forEach(h => hz.push(h));
        if (p.id === 'dust' && rec.evaDay != null) what.push(t('pat.dust.note', { eva: rec.evaDay }));
        res.pats.filter(q => q !== p).forEach(q => what.push(t('pat.' + q.id + '.name')));
      } else {
        why = t('q.single.2'); ifnot = t('q.single.4'); acts = [t('q.single.5a'), t('q.single.5b')]; urg = t('lv.act.2');
      }
    }
    const rows = [];
    lims.forEach(l => { const I = E.IK[l.k]; rows.push('<tr class="lv' + (l.confirmed && l.level === 2 ? 3 : 2) + '"><td class="name">' + esc(t('ind.' + l.k + '.s')) + '</td><td>' + esc(limitText(l.k)) + '</td><td>' + fmt(l.value, I.dec) + esc(un(I.unit)) + '</td><td>—</td><td>' + (l.confirmed ? 2 : 1) + '×</td><td>' + pill(l.confirmed && l.level === 2 ? 3 : 2) + '</td></tr>'); });
    (dev.length ? dev : E.INDICATORS.slice().sort((a, b) => res.inds[b.k].bad - res.inds[a.k].bad).slice(0, 3)).slice(0, 5).forEach(I => {
      const d = res.inds[I.k];
      rows.push('<tr><td class="name">' + esc(t('ind.' + I.k + '.s')) + '</td><td>' + fmt(d.baseline.mean, I.dec) + ' ± ' + fmt(d.baseline.sd, I.dec) + '</td><td>' + (d.cur == null ? '—' : fmt(d.cur, I.dec) + esc(un(I.unit))) + '</td><td>' + (d.dev == null ? '—' : sgn(d.dev) + (I.kind === 'ord' ? '' : 'σ')) + '</td><td>' + (d.persist || '—') + '</td><td>' + pill(d.level) + '</td></tr>');
    });
    return { what, why, ifnot, acts, urg, hz, p, rows };
  }

  /* ---------- body map ---------- */
  function regionLevel(rec, r) {
    if (rec.level === 3 && rec.em) return 3;
    if (r === 'legs') return rec.res.capacity.some(c => c.below) ? 1 : 0;
    if (r === 'general') return rec.level;
    return rec.res.region[r];
  }
  function bodyMap(rec) {
    const em = rec.level === 3 && rec.em && rec.em.stage === 'declared';
    const pin = (r, x, y, ax, ay, side) => {
      const lv = regionLevel(rec, r), w = 146;
      return '<g class="pin lv' + lv + (S.region === r ? ' sel' : '') + '" data-act="region" data-r="' + r + '" tabindex="0" role="button" aria-label="' + esc(t('reg.' + r) + ': ' + t('lv.' + lv)) + '"><path class="link" d="M' + ax + ' ' + ay + ' L' + (side === 'r' ? x : x + w) + ' ' + (y + 22) + '"/><circle class="node" cx="' + ax + '" cy="' + ay + '" r="3"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="44" rx="3"/><text class="pn" x="' + (x + 10) + '" y="' + (y + 17) + '">' + esc(t('reg.' + r).toUpperCase()) + '</text><text class="ps" x="' + (x + 10) + '" y="' + (y + 35) + '">' + esc(lv === 3 ? t('lv.s.3') : t('lv.' + lv)) + '</text></g>';
    };
    const reg = (r, inner) => '<g class="reg lv' + regionLevel(rec, r) + (S.region === r ? ' sel' : '') + (em ? ' em' : '') + '" data-act="region" data-r="' + r + '" tabindex="0" role="button" aria-label="' + esc(t('reg.' + r) + ': ' + t('lv.' + regionLevel(rec, r))) + '">' + inner + '</g>';
    const rows = (a, b, n) => Array.from({ length: n }, (_, i) => Math.round(a + (b - a) * i / (n - 1)));
    const sl = (x1, x2, ys) => '<path class="slice" d="' + ys.map(y => 'M' + x1 + ' ' + y + 'H' + x2).join('') + '"/>';
    const defs = '<defs><linearGradient id="beamg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#6fe0ee" stop-opacity=".5"/><stop offset="1" stop-color="#6fe0ee" stop-opacity="0"/></linearGradient><linearGradient id="sweepg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aeef7" stop-opacity="0"/><stop offset=".5" stop-color="#9aeef7" stop-opacity=".85"/><stop offset="1" stop-color="#9aeef7" stop-opacity="0"/></linearGradient><clipPath id="figclip"><rect x="120" y="10" width="240" height="462"/></clipPath></defs>';
    const emitter = '<polygon class="beam" points="140,468 340,468 300,10 180,10"/><ellipse class="emit" cx="240" cy="468" rx="140" ry="26"/><ellipse class="emit" cx="240" cy="468" rx="100" ry="19"/><ellipse class="emit" cx="240" cy="468" rx="62" ry="12"/><ellipse class="ring r1" cx="240" cy="468" rx="140" ry="26"/><ellipse class="ring r2" cx="240" cy="468" rx="140" ry="26"/><ellipse class="ring r3" cx="240" cy="468" rx="140" ry="26"/>';
    const fig = '<g class="fig"><rect class="part" x="198" y="128" width="84" height="118" rx="10"/>' +
      reg('chest', '<rect class="shape" x="190" y="122" width="100" height="146" rx="24"/>' + sl(196, 284, rows(140, 256, 8)) + '<rect x="214" y="150" width="52" height="34" rx="5" fill="rgba(111,224,238,.10)" stroke="var(--line-2)"/><path d="M220 168 h8 l4-9 5 16 4-7 h20" fill="none" stroke="var(--fg)" stroke-width="1.5" opacity=".8"/>') +
      '<rect class="part" x="190" y="240" width="100" height="10" rx="4"/>' +
      reg('head', '<rect class="shape" x="220" y="108" width="40" height="14" rx="6"/><circle class="shape" cx="240" cy="70" r="44"/><ellipse cx="240" cy="74" rx="30" ry="24" fill="rgba(3,12,20,.85)" stroke="var(--line-2)"/><path d="M222 66 q10-10 22-8" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2"/>') +
      reg('arms', '<rect class="shape" x="156" y="128" width="34" height="128" rx="17" transform="rotate(8 173 128)"/><rect class="shape" x="290" y="128" width="34" height="128" rx="17" transform="rotate(-8 307 128)"/><circle class="shape" cx="155" cy="266" r="14"/><circle class="shape" cx="325" cy="266" r="14"/>') +
      reg('legs', '<rect class="shape" x="194" y="266" width="42" height="160" rx="18"/><rect class="shape" x="244" y="266" width="42" height="160" rx="18"/><rect class="shape" x="190" y="420" width="50" height="34" rx="12"/><rect class="shape" x="240" y="420" width="50" height="34" rx="12"/>' + sl(198, 232, rows(284, 408, 8)) + sl(248, 282, rows(284, 408, 8))) + '</g>';
    return '<svg class="map" viewBox="0 0 480 500" role="group" aria-label="' + esc(t('map.title')) + '">' + defs + emitter + fig +
      '<g clip-path="url(#figclip)"><rect class="sweep" x="120" y="0" width="240" height="26" fill="url(#sweepg)"/></g><circle class="heart lv' + regionLevel(rec, 'chest') + '" cx="240" cy="167" r="7"/>' +
      pin('head', 330, 40, 284, 68, 'r') + pin('chest', 4, 150, 190, 170, 'l') + pin('arms', 330, 206, 326, 222, 'r') + pin('legs', 4, 330, 194, 352, 'l') + '</svg>';
  }
  function telemetryHtml(rec) {
    const res = rec.res, d = k => res.inds[k];
    const simOn = S.sim && S.sim.who === rec.i;
    const lost = rec.loss || (simOn && S.sim.det && S.sim.det.state === 'sensor');
    const lvOf = k => res.limits[k] ? (res.limits[k].confirmed && res.limits[k].level === 2 ? 3 : 2) : d(k).level;
    const sh = simHr(rec);
    const hr = sh != null ? Math.round(sh) : d('fc').last;
    const hrLv = (sh != null && sh < rec.profile.limits.fc.low[1]) ? 3 : lvOf('fc');
    const big = (key, v, dec, unit) => '<div class="big"><span id="live-' + key + '" data-key="' + key + '" data-count="' + (v == null ? 0 : v) + '" data-dec="' + dec + '">' + (v == null ? '—' : fmt(v, dec)) + '</span><small>' + esc(unit) + '</small></div>';
    const card = (title, lv, inner) => '<div class="card hud lv' + lv + '"><h3 class="hud-title"><i></i>' + esc(title) + '</h3>' + inner + '</div>';
    const sp = d('spo2').last, fr = d('fr').last, tp = d('temp').last;
    const clamp = x => Math.max(0, Math.min(1, x));
    const stream = card(t('tel.title'), hrLv, '<div class="row"><span class="st' + (lost ? ' off' : '') + '">' + esc(lost ? t('tel.nosignal') : t('tel.online')) + ' · ' + esc(t('tel.sim')) + '</span>' + big('hr', lost ? null : hr, 0, 'bpm') + '</div><canvas data-fx="ecg" aria-label="' + esc(t('tel.title')) + '"></canvas><p class="note">' + esc(t('tel.note')) + '</p>');
    const oxy = card(t('tel.spo2'), lvOf('spo2'), big('spo2', sp, 0, '%') + '<div class="gauge" aria-hidden="true"><i style="transform:scaleX(' + clamp(((sp == null ? 97 : sp) - 80) / 20).toFixed(2) + ')"></i></div>');
    const resp = card(t('tel.resp'), lvOf('fr'), big('fr', fr, 0, 'rpm') + '<div class="breath" aria-hidden="true"></div>');
    const temp = card(t('tel.temp'), lvOf('temp'), big('temp', tp, 1, '°C') + '<div class="gauge" aria-hidden="true"><i style="transform:scaleX(' + clamp(((tp == null ? 36.6 : tp) - 35) / 5).toFixed(2) + ')"></i></div>');
    return '<section class="tele" aria-label="' + esc(t('tel.title')) + '">' + stream + oxy + resp + temp + '</section>';
  }
  function irow(I, rec) {
    const d = rec.res.inds[I.k], lim = rec.res.limits[I.k];
    const lv = lim ? (lim.confirmed && lim.level === 2 ? 3 : Math.max(2, d.level)) : d.level;
    return '<div class="irow lv' + lv + '"><div class="nm">' + esc(t('ind.' + I.k)) + pill(lv) + '</div><div class="v">' + esc(t('region.now')) + ' <b>' + (d.last == null ? '—' : fmt(d.last, I.dec) + esc(un(I.unit))) + '</b><br>' + esc(t('region.base')) + ' ' + fmt(d.baseline.mean, I.dec) + ' ± ' + fmt(d.baseline.sd, I.dec) + (d.dev == null ? '' : ' · ' + sgn(d.dev) + (I.kind === 'ord' ? '' : 'σ')) + '</div><div class="spk">' + spark(d.series, d.baseline, lv) + '</div><details><summary>' + esc(t('region.why')) + '</summary><p>' + esc(t('ind.' + I.k + '.why')) + '</p>' + (I.hz.length ? '<div class="hz">' + esc(t('hz.note')) + ': ' + I.hz.map(h => '<span class="tag">' + esc(t('hz.' + h)) + '</span>').join('') + '</div>' : '') + '</details></div>';
  }
  function capRows(rec, noDose) {
    return rec.res.capacity.filter(c => !(noDose && c.k === 'dose')).map(c => '<tr class="lv' + (c.below ? 1 : 0) + '"><td class="name">' + esc(t('cap.' + c.k)) + '</td><td>' + c.value + (c.max ? ' mSv' : '%') + '</td><td>' + esc(t('cap.rule.' + c.k)) + '</td><td><span class="tag nasa">' + c.ref + '</span></td><td>' + pill(c.below ? 1 : 0, t(c.below ? 'cap.low' : 'cap.ok')) + '</td></tr>').join('');
  }
  function regionPanel(rec) {
    const r = S.region;
    let h = '<h3>' + esc(t('reg.' + r)) + ' <span class="muted" style="font-weight:400">· ' + esc(t('reg.' + r + '.s')) + '</span></h3>';
    if (r === 'legs') {
      h += '<p class="sub">' + esc(t('reg.legs.note')) + '</p><div class="tscroll"><table><thead><tr><th>' + esc(t('hist.indicator')) + '</th><th>' + esc(t('region.now')) + '</th><th>' + esc(t('prof.limits')) + '</th><th>' + esc(t('cap.source')) + '</th><th></th></tr></thead><tbody>' + capRows(rec, true) + '</tbody></table></div>';
    } else if (r === 'general') {
      h += '<div class="irow lv' + rec.level + '"><div class="nm">' + esc(t('ov.title')) + pill(rec.level) + '</div><div class="v">' + esc(t('ov.trend')) + ' <b>' + esc(t('trend.' + rec.res.trend)) + '</b></div><div></div></div>' + irow(E.IK.gli, rec);
      const dose = rec.res.capacity.find(c => c.k === 'dose');
      h += '<div class="irow lv' + (dose.below ? 1 : 0) + '"><div class="nm">' + esc(t('cap.dose')) + pill(dose.below ? 1 : 0, dose.value + ' mSv') + '</div><div class="v">' + esc(t('cap.rule.dose')) + ' <span class="tag nasa">' + dose.ref + '</span></div><div></div></div>';
    } else {
      h += E.INDICATORS.filter(i => i.region === r).map(i => irow(i, rec)).join('');
    }
    return h;
  }

  /* ---------- overview ---------- */
  function simPanel(rec) {
    const sim = S.sim;
    if (!sim || sim.who !== rec.i || (rec.em && rec.em.stage === 'declared')) return '';
    const st = sim.det && sim.det.state, last = sim.buf[sim.buf.length - 1] || {};
    const lim = rec.profile.limits.fc.low[1];
    const cl = x => Math.max(0, Math.min(1, x)).toFixed(3);
    const meter = (lbl, id, val, unit, f, extra) => '<div class="m"><span>' + esc(lbl) + '</span><div><b id="sl-' + id + '">' + val + '</b><small>' + esc(unit) + '</small></div><div class="gauge" aria-hidden="true"><i id="sl-' + id + '-b" style="transform:scaleX(' + cl(f) + ')"></i></div>' + (extra || '') + '</div>';
    const live = '<div class="meters">' + meter(t('sim.hr'), 'hr', last.hr == null ? '—' : Math.round(last.hr), 'bpm', last.hr == null ? 0 : (last.hr - 20) / 100, '<em>' + esc(t('sim.limit', { n: lim })) + '</em>') + meter(t('sim.motion'), 'mo', Math.round(last.motion || 0), '', (last.motion || 0) / 60) + meter(t('sim.quality'), 'q', Math.round((last.q || 0) * 100), '%', last.q || 0) + '</div><p class="detstate" id="sl-state">' + esc(t('sim.state.' + st)) + '</p>';
    let msg = '';
    if (rec.em && rec.em.stage === 'suspect') msg = stepsHtml(rec) + '<h3>' + esc(t('em.suspect')) + '</h3><p>' + esc(t('em.suspect.desc')) + '</p>';
    else if (rec.em && rec.em.stage === 'confirm') msg = stepsHtml(rec) + '<div class="confirm"><div class="timer"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tr" cx="60" cy="60" r="52"/><circle class="tp" id="cd-ring" cx="60" cy="60" r="52" pathLength="1" style="stroke-dashoffset:' + (1 - rec.em.cd / 8).toFixed(3) + '"/></svg><div class="num" id="cd-num">' + rec.em.cd + '</div></div><div><h3>' + esc(t('em.confirm')) + '</h3><p>' + esc(t('em.confirm.desc', { n: 8 })) + '</p><p><button class="btn primary" data-act="ack">' + esc(t('em.respond')) + '</button></p></div></div>';
    else if (st === 'sensor') msg = '<h3>' + esc(t('em.sensor')) + '</h3><p>' + esc(t('em.sensor.desc')) + '</p>';
    else if (st === 'sleep') msg = '<h3>' + esc(t('em.sleep')) + '</h3><p>' + esc(t('em.sleep.desc')) + '</p>';
    const lv = rec.em ? (rec.em.stage === 'confirm' ? 2 : 1) : 0;
    return '<div class="result simlive lv' + lv + '" role="status"><h3>' + esc(t('sim.run.' + sim.mode)) + '</h3>' + live + msg + '<p><button class="btn" data-act="simstop">' + esc(t('sim.stop')) + '</button></p><p class="note" style="margin-top:0">' + esc(t('em.note')) + '</p></div>';
  }
  function stepsHtml(rec) {
    const stage = rec.em ? rec.em.stage : null, order = { suspect: 0, confirm: 1, declared: 2 }, c = order[stage];
    const cls = k => (k < c ? 'done' : k === c ? (stage === 'declared' ? 'crit' : 'on') : '');
    return '<div class="steps"><div class="step ' + cls(0) + '"><b>1 · ' + esc(t('em.s1')) + '</b></div><div class="step ' + cls(1) + '"><b>2 · ' + esc(t('em.s2')) + '</b></div><div class="step ' + cls(2) + '"><b>3 · ' + esc(t('em.s3')) + '</b></div><div class="step ' + (stage === 'declared' ? 'crit' : '') + '"><b>4 · ' + esc(t('em.s4')) + '</b></div></div>';
  }
  function gateHtml(rec) {
    let body = '';
    if (rec.evaOn) body = '<p>' + esc(t('op.started', { day: rec.evaDay })) + '</p><button class="btn" data-act="evaend">' + esc(t('op.end')) + '</button>';
    else {
      body = '<p class="muted" style="margin:0">' + esc(rec.fresh ? t('op.ready') : t('op.need')) + '</p>' + (rec.level >= 2 ? '<p class="muted" style="margin:0">' + esc(t('op.warn', { level: t('lv.' + rec.level) })) + '</p>' : '') +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-act="evastart">' + esc(t('op.start')) + '</button>' + (!rec.fresh ? '<button class="btn" data-act="tab" data-tab="checkin">' + esc(t('nav.checkin')) + '</button>' : '') + '</div>' +
        (S.gateMsg ? '<p class="note" style="color:var(--lv2);margin:0" role="alert">' + esc(t('op.need')) + '</p>' : '');
    }
    return '<div class="sep op"><h2 style="margin:0;font-size:var(--t-md)">' + esc(t('op.title')) + '</h2><p class="sub" style="margin:0">' + esc(t('op.desc')) + '</p>' + body + '</div>';
  }
  function renderOverview(rec) {
    const lv = rec.level, ex = explain(rec), res = rec.res, em = rec.em;
    const done = checkedToday(rec);
    let state = simPanel(rec);
    const heroAct = t('lv.act.' + lv);
    state += '<div class="hero lv' + lv + (S.fresh ? ' fresh' : '') + '"><div class="lvl">' + icon(lv) + '<span>' + esc(t('lv.' + lv)) + '</span></div><div class="msg">' + esc(headline(rec)) + '</div><div class="act">' + esc(heroAct) + '</div><div class="meta"><span>' + esc(done ? t('ov.done', { day: rec.today }) : t('ov.last', { day: res.maxDay })) + '</span><span>' + esc(t('ov.trend')) + ': ' + esc(t('trend.' + res.trend)) + '</span>' + (ex.p && lv < 3 ? '<span>' + esc(t('q.conf')) + ': ' + esc(t('conf.' + ex.p.conf)) + '</span>' : '') + '</div></div>';
    if (!done) state += '<p class="note pending"><span>' + esc(t('ov.pending')) + '</span><button class="btn primary" data-act="tab" data-tab="checkin">' + esc(t('ov.pendingBtn')) + '</button></p>';
    if (res.adapting) state += '<p class="note">' + esc(t('ov.adapting', { days: rec.profile.tolerances.adaptationDays })) + '</p>';
    if (res.insufficient) state += '<p class="note" role="status">' + esc(t('ov.insufficient')) + '</p>';
    if (em && em.stage === 'declared') state += stepsHtml(rec) + '<div class="chartbox"><h3>' + esc(t('em.chart.title')) + '</h3><p class="sub">' + esc(t('em.chart.sub')) + '</p>' + emChart(em.buf, rec.profile.limits.fc.low[1]) + '</div><p><button class="btn" data-act="alertopen">' + esc(t('em.view')) + '</button> <button class="btn danger" data-act="endinc">' + esc(t('em.end')) + '</button></p>';
    const qs = [['1', '<ul>' + ex.what.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>', true],
      ['2', '<p>' + esc(ex.why) + '</p>' + (ex.hz.length ? '<div class="hz">' + esc(t('hz.note')) + ': ' + ex.hz.map(h => '<span class="tag">' + esc(t('hz.' + h)) + '</span>').join('') + '</div>' : ''), false],
      ['3', '<div class="tscroll"><table><thead><tr><th>' + esc(t('q.ev.ind')) + '</th><th>' + esc(t('q.ev.base')) + '</th><th>' + esc(t('q.ev.now')) + '</th><th>' + esc(t('q.ev.dev')) + '</th><th>' + esc(t('q.ev.days')) + '</th><th>' + esc(t('q.ev.lv')) + '</th></tr></thead><tbody>' + ex.rows.join('') + '</tbody></table></div><p class="disc">' + esc(t('q.ev.note')) + '</p>', false],
      ['4', '<p>' + esc(ex.ifnot) + '</p>', false],
      ['5', '<ul>' + ex.acts.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul><span class="urg lv' + lv + '">' + esc(ex.urg) + '</span><p class="disc">' + esc(t('q.disc')) + '</p>', true]];
    state += '<div class="sep" style="margin-top:18px;padding-top:0;border-top:0">' + qs.map(q => '<details class="q"' + (q[2] ? ' open' : '') + '><summary>' + esc(t('q.' + q[0])) + '</summary><div class="body">' + q[1] + '</div></details>').join('') + '</div>';
    const low = res.capacity.filter(c => c.below);
    state += '<p class="note">' + (low.length ? esc(t('ov.capacity.low', { list: low.map(c => t('cap.' + c.k)).join(', ') })) + ' ' + esc(t('ov.capacity.action')) : esc(t('ov.capacity.ok'))) + '</p>';
    state += gateHtml(rec);
    state += '<details class="q" style="margin-top:14px"><summary>' + esc(t('how.title')) + '</summary><div class="body"><ol>' + [1, 2, 3, 4, 5].map(n => '<li>' + esc(t('how.' + n)) + '</li>').join('') + '</ol><p class="disc">' + esc(t('how.note')) + '</p></div></details>';
    const emDone = rec.em && rec.em.stage === 'declared';
    const dustOn = FX.src.dust() > 0.05;
    const map = '<div class="stage hud' + (emDone ? ' em' : '') + '"><h2 class="hud-title"><i></i>' + esc(t('map.title')) + ' · ' + esc(rec.name) + '</h2><p class="hint">' + esc(t('map.hint')) + (dustOn ? ' ' + esc(t('dust.note')) : '') + '</p><div class="holo">' + bodyMap(rec) + '<canvas class="dust" data-fx="dust" aria-hidden="true"></canvas></div>' +
      '<div class="whole lv' + lv + '"><button data-act="region" data-r="general" aria-pressed="' + (S.region === 'general') + '">' + esc(t('reg.general')) + pill(lv) + '</button></div></div><div class="region" id="regionPanel">' + regionPanel(rec) + '</div>';
    return telemetryHtml(rec) + '<div class="grid"><section class="pane state-pane" aria-label="' + esc(t('ov.title')) + '"><h2>' + esc(t('ov.title')) + ' · ' + esc(t('ov.today', { day: rec.today })) + '</h2>' + state + '</section><section class="pane map-pane">' + map + '</section></div>';
  }

  /* ---------- check-in ---------- */
  const BADGES = [7, 14, 30];
  function streakOf(rec) {
    const days = new Set(rec.readings.map(r => r.day));
    let d = checkedToday(rec) ? rec.today : rec.today - 1, n = 0;
    while (d >= 1 && days.has(d)) { n++; d--; }
    return n;
  }
  function fieldHtml(I) {
    const val = S.form[I.k] == null ? '' : S.form[I.k], err = S.errors[I.k];
    const id = 'f-' + I.k;
    let ctl;
    if (I.kind === 'ord') {
      const opts = [''].concat(I.k === 'humor' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3]);
      ctl = '<select id="' + id + '" data-bind="' + I.k + '">' + opts.map(o => '<option value="' + o + '"' + (String(o) === String(val) ? ' selected' : '') + '>' + (o === '' ? esc(t('ci.opt.empty')) : o) + '</option>').join('') + '</select>';
    } else {
      ctl = '<input id="' + id + '" data-bind="' + I.k + '" type="number" inputmode="decimal" min="' + I.min + '" max="' + I.max + '" step="' + I.step + '" value="' + esc(val) + '"' + (err ? ' aria-invalid="true"' : '') + ' aria-describedby="' + id + '-h ' + id + '-e">';
    }
    return '<div class="field"><label for="' + id + '">' + esc(t('ind.' + I.k)) + '</label><div class="inp">' + ctl + (I.kind === 'ord' ? '' : '<span class="u">' + esc(I.unit) + '</span>') + '</div><span class="help" id="' + id + '-h">' + esc(I.kind === 'ord' ? (I.k === 'humor' ? t('ci.mood') : t('ci.symptoms')) : t('ci.range', { min: I.min, max: I.max })) + '</span><span class="err" id="' + id + '-e">' + (err ? esc(t('ci.err.range', err)) : '') + '</span></div>';
  }
  function renderCheckin(rec) {
    const meas = ['fc', 'spo2', 'fr', 'pa', 'temp', 'gli', 'sono'].map(k => E.IK[k]), feel = ['humor', 'sym_olho', 'sym_tosse', 'sym_pele'].map(k => E.IK[k]);
    const n = streakOf(rec), nextB = BADGES.find(b => b > n);
    let res = '';
    if (S.result && S.result.who === rec.i) {
      const lv = rec.level;
      res = '<div class="result lv' + lv + '" role="status" tabindex="-1" id="ci-result"><div>' + esc(t('ci.saved')) + ' ' + esc(t('ci.result')) + ': ' + pill(lv) + '</div><div>' + esc(headline(rec)) + '</div>' + (Object.keys(rec.res.limits).length ? '<div class="muted">' + esc(t('ci.repeat')) + '</div>' : '') + '<div><button class="btn" data-act="tab" data-tab="overview">' + esc(t('nav.overview')) + '</button></div></div>';
    }
    return '<section class="pane" style="max-width:920px"><h2>' + esc(t('ci.title')) + ' · ' + esc(t('ci.day', { day: rec.today })) + '</h2><p class="sub">' + esc(t('ci.intro')) + '</p>' +
      '<form class="form" id="ciform" novalidate><fieldset><legend>' + esc(t('ci.measure')) + '</legend>' + meas.map(fieldHtml).join('') + '</fieldset><fieldset><legend>' + esc(t('ci.feel')) + '</legend>' + feel.map(fieldHtml).join('') + '</fieldset><div class="formfoot"><button type="submit" class="btn primary">' + esc(t('ci.submit')) + '</button><span class="err" id="ci-err" role="alert">' + (S.errors._empty ? esc(t('ci.err.empty')) : '') + '</span></div></form>' +
      '<p class="note">' + esc(t('ci.source')) + '</p>' + res +
      '<div class="sep"><div class="streak"><span class="big">' + n + '</span><span>' + esc(t('ci.streak.label')) + '</span><div class="badges">' + BADGES.filter(b => n >= b).map(b => '<span class="tag">' + esc(t('ci.badge', { n: b })) + '</span>').join('') + '</div></div><p class="note" style="margin-top:0">' + esc(nextB ? t('ci.streak.next', { n: nextB }) : t('ci.streak.max')) + ' ' + esc(t('ci.streak.note')) + '</p></div></section>';
  }

  /* ---------- history ---------- */
  function renderHistory(rec) {
    const I = E.IK[S.ind] || E.INDICATORS[0], d = rec.res.inds[I.k];
    const rows = E.INDICATORS.map(i => {
      const q = rec.res.inds[i.k];
      return '<tr class="pick' + (i.k === I.k ? ' on' : '') + ' lv' + q.level + '" data-act="ind" data-k="' + i.k + '" tabindex="0"><td class="name">' + esc(t('ind.' + i.k + '.s')) + '</td><td>' + fmt(q.baseline.mean, i.dec) + ' ± ' + fmt(q.baseline.sd, i.dec) + '</td><td>' + (q.cur == null ? '—' : fmt(q.cur, i.dec) + esc(un(i.unit))) + '</td><td>' + (q.dev == null ? '—' : sgn(q.dev) + (i.kind === 'ord' ? '' : 'σ')) + '</td><td>' + (q.persist || '—') + '</td><td>' + pill(q.level) + '</td><td>' + spark(q.series, q.baseline, q.level) + '</td></tr>';
    }).join('');
    const evs = S.events.filter(e => e.who === rec.i || e.pub).sort((a, b) => b.m - a.m || b.id - a.id).slice(0, 14);
    return '<div class="grid"><section class="pane"><h2>' + esc(t('hist.title')) + ' · ' + esc(rec.name) + '</h2><div class="ctl" style="margin:8px 0 12px"><label for="indsel">' + esc(t('hist.indicator')) + '</label><select id="indsel" data-act-change="ind">' + E.INDICATORS.map(i => '<option value="' + i.k + '"' + (i.k === I.k ? ' selected' : '') + '>' + esc(t('ind.' + i.k)) + '</option>').join('') + '</select></div><div class="chartbox lv' + d.level + '"><h3>' + esc(t('ind.' + I.k)) + '</h3><p class="sub">' + esc(t('hist.sub')) + '</p>' + bigChart(I, rec) + '</div><div class="tscroll"><table><thead><tr><th>' + esc(t('hist.indicator')) + '</th><th>' + esc(t('hist.col.base')) + '</th><th>' + esc(t('hist.col.now')) + '</th><th>' + esc(t('hist.col.dev')) + '</th><th>' + esc(t('hist.col.days')) + '</th><th>' + esc(t('hist.col.lv')) + '</th><th>' + esc(t('hist.col.trend')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="pane"><h2>' + esc(t('hist.events')) + '</h2>' + (evs.length ? '<div class="tscroll"><table><tbody>' + evs.map(e => '<tr class="lv' + e.lv + '"><td>' + esc(tstr(e.m)) + '</td><td class="name">' + esc(evText(e)) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="sub">' + esc(t('hist.none')) + '</p>') + '<div class="sep"><h2>' + esc(t('cap.title')) + '</h2><div class="tscroll"><table><tbody>' + capRows(rec) + '</tbody></table></div></div></section></div>';
  }

  /* ---------- profile ---------- */
  function renderProfile(rec) {
    const p = rec.profile, tol = p.tolerances;
    const base = E.INDICATORS.map(i => {
      const b = p.baseline[i.k], L = p.limits[i.k];
      const l1 = L ? [L.high ? t('prof.high') + ' ' + (L.hiOp === 'ge' ? '≥ ' : '> ') + L.high[0] : '', L.low ? t('prof.low') + ' < ' + L.low[0] : ''].filter(Boolean).join(' · ') : '—';
      const l2 = L ? [L.high ? t('prof.high') + ' ' + (L.hiOp === 'ge' ? '≥ ' : '> ') + L.high[1] : '', L.low ? t('prof.low') + ' < ' + L.low[1] : ''].filter(Boolean).join(' · ') : '—';
      return '<tr><td class="name">' + esc(t('ind.' + i.k)) + '</td><td>' + fmt(b.mean, i.dec) + esc(un(i.unit)) + '</td><td>' + fmt(b.sd, i.dec) + '</td><td>' + esc(l1) + '</td><td>' + esc(l2) + '</td></tr>';
    }).join('');
    return '<section class="pane" style="max-width:1000px"><h2>' + esc(t('prof.title')) + ' · ' + esc(rec.name) + '</h2><p class="sub">' + esc(t('prof.intro')) + '</p><dl class="kv"><dt>' + esc(t('prof.version')) + '</dt><dd>' + p.version + '</dd><dt>' + esc(t('prof.by')) + '</dt><dd>' + esc(p.approvedBy) + '</dd><dt>' + esc(t('prof.at')) + '</dt><dd>' + p.approvedAt + '</dd><dt>' + esc(t('prof.env')) + '</dt><dd>' + esc(t('env.' + rec.env)) + '</dd><dt>' + esc(t('prof.adapt')) + '</dt><dd>' + esc(t('prof.adapt.val', { n: tol.adaptationDays })) + '</dd></dl>' +
      '<div class="tscroll"><table><thead><tr><th>' + esc(t('prof.col.ind')) + '</th><th>' + esc(t('prof.col.mean')) + '</th><th>' + esc(t('prof.col.sd')) + '</th><th>' + esc(t('prof.col.l1')) + '</th><th>' + esc(t('prof.col.l2')) + '</th></tr></thead><tbody>' + base + '</tbody></table></div>' +
      '<div class="sep"><h2 style="margin:0 0 8px;font-size:var(--t-md)">' + esc(t('prof.tol')) + '</h2><dl class="kv"><dt>' + esc(t('prof.tol.alert')) + '</dt><dd>' + esc(t('prof.tol.enter')) + ' ≥ ' + tol.alertSigma + 'σ ' + esc(t('prof.tol.exitAfter')) + ' ' + esc(t('prof.tol.days', { n: tol.enterDays })) + ' · ' + esc(t('prof.tol.exit')) + ' ' + tol.exitAlertSigma + 'σ ' + esc(t('prof.tol.exitAfter')) + ' ' + esc(t('prof.tol.days', { n: tol.exitDays })) + '</dd><dt>' + esc(t('prof.tol.attn')) + '</dt><dd>' + esc(t('prof.tol.enter')) + ' ≥ ' + tol.attnSigma + 'σ ' + esc(t('prof.tol.exitAfter')) + ' ' + esc(t('prof.tol.days', { n: tol.enterDays })) + ' · ' + esc(t('prof.tol.exit')) + ' ' + tol.exitAttnSigma + 'σ ' + esc(t('prof.tol.exitAfter')) + ' ' + esc(t('prof.tol.days', { n: tol.exitDays })) + '</dd><dt>' + esc(t('prof.tol.dwell')) + '</dt><dd>' + esc(t('prof.tol.hours', { n: tol.minDwellHours })) + '</dd></dl><p class="note">' + esc(t('prof.note')) + '</p></div></section>';
  }

  /* ---------- shell ---------- */
  function renderTop() {
    $('#viewas').innerHTML = ROSTER.map((r, i) => '<option value="' + i + '"' + (i === S.user ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('');
    $('#lbl-view').textContent = t('view.as');
    $('#lbl-lang').textContent = t('lang.label');
    $('#sub').textContent = t('app.sub');
    $('#sim').textContent = t('badge.sim');
    const fb = $('#fxbtn'); if (fb) { fb.textContent = t('fx.label') + ': ' + t(FX.enabled ? 'fx.on' : 'fx.off'); fb.setAttribute('aria-pressed', String(FX.enabled)); }
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('#lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $('#tabs').innerHTML = TABS.map(k => '<button role="tab" id="tab-' + k + '" aria-selected="' + (S.tab === k) + '" data-act="tab" data-tab="' + k + '">' + esc(t('nav.' + k)) + '</button>').join('');
    $('#foot').innerHTML = '<p>' + esc(t('foot.disc')) + '</p><span>' + esc(t('foot.sources')) + ':</span><a href="https://standards.nasa.gov/standard/nasa/nasa-std-3001" target="_blank" rel="noopener">NASA-STD-3001</a><a href="https://www.nasa.gov/hrp/hazards/" target="_blank" rel="noopener">NASA HRP</a><a href="https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp" target="_blank" rel="noopener">CSA Bio-Monitor</a><a href="https://www.nasa.gov/directorates/esdmd/hhp/risk-of-adverse-health-performance-effects-of-celestial-dust-exposure/" target="_blank" rel="noopener">NASA dust risk</a>';
  }
  function renderDemo() {
    const open = S.demoOpen ? ' open' : '';
    const sc = ['healthy', 'trend', 'high', 'dust', 'acute'].map(s => '<button class="btn" data-act="scn" data-sc="' + s + '">' + esc(t('demo.sc.' + s)) + '</button>').join('');
    $('#demo').innerHTML = '<details class="demo dock"' + open + ' id="demod"><summary title="' + esc(t('demo.note')) + '">' + esc(t('demo.title')) + '</summary><div class="demo-body"><div class="grp"><span class="gl">' + esc(t('demo.scenario')) + '</span>' + sc + '</div><div class="grp"><span class="gl">' + esc(t('demo.sim')) + '</span><button class="btn danger" data-act="sim" data-mode="faint">' + esc(t('demo.faint')) + '</button><button class="btn" data-act="sim" data-mode="sleep">' + esc(t('demo.sleep')) + '</button><button class="btn" data-act="sim" data-mode="sensor">' + esc(t('demo.sensor')) + '</button></div><div class="grp"><button class="btn" data-act="nextday">' + esc(t('demo.nextday')) + '</button><button class="btn" data-act="reset">' + esc(t('demo.reset')) + '</button></div><p>' + esc(t('demo.note')) + '</p></div></details>';
    const d = $('#demod'); if (d) d.addEventListener('toggle', () => { S.demoOpen = d.open; });
  }
  function renderBanner() {
    const b = $('#alertbar');
    const decl = S.recs.find(r => r.em && r.em.stage === 'declared');
    const me = cur();
    b.className = ''; b.hidden = true; b.innerHTML = '';
    if (decl) {
      b.hidden = false; b.className = 'lv3 live'; b.setAttribute('role', 'alert');
      b.innerHTML = '<strong>' + esc(t('em.banner', { name: decl.name, time: tstr(decl.em.t0) })) + '</strong><button class="btn" data-act="alertopen">' + esc(t('em.view')) + '</button>';
    } else if (me.em && (me.em.stage === 'suspect' || me.em.stage === 'confirm')) {
      b.hidden = false; b.className = 'lv1'; b.setAttribute('role', 'status');
      b.innerHTML = '<strong>' + esc(t('em.banner.suspect', { name: me.name, sec: me.em.stage === 'confirm' ? me.em.cd + ' s' : '…' })) + '</strong>';
    } else if (me.loss) {
      b.hidden = false; b.className = 'lv0'; b.setAttribute('role', 'status');
      b.innerHTML = '<strong style="color:var(--muted)">' + esc(t('em.sensor')) + '</strong><span>' + esc(t('em.sensor.desc')) + '</span>';
    }
  }
  function render() {
    renderTop(); renderBanner();
    const rec = cur(), m = $('#main');
    m.setAttribute('role', 'tabpanel'); m.setAttribute('aria-labelledby', 'tab-' + S.tab);
    m.className = S.anim ? 'anim' : '';
    m.innerHTML = S.tab === 'overview' ? renderOverview(rec) : S.tab === 'checkin' ? renderCheckin(rec) : S.tab === 'history' ? renderHistory(rec) : renderProfile(rec);
    FX.countUp(m);
    applyVars();
    if (S.scanNext && document.querySelector('.stage')) { FX.scan(); S.scanNext = false; }
    S.anim = false; S.fresh = false;
  }

  /* ---------- crew alert dialog ---------- */
  function openAlert() {
    const rec = S.recs.find(r => r.em && r.em.stage === 'declared');
    if (!rec) return;
    const res = rec.res, dev = E.INDICATORS.filter(i => res.inds[i.k].level >= 1).sort((a, b) => res.inds[b.k].bad - res.inds[a.k].bad);
    const trend = dev.slice(0, 3).map(i => t('ind.' + i.k + '.s') + ' ' + sgn(res.inds[i.k].dev) + (i.kind === 'ord' ? '' : 'σ')).join(' · ') || '—';
    const hr = Math.round(rec.em.hrLast);
    const dlg = $('#crew');
    dlg.innerHTML = '<h2 id="crew-title">' + esc(t('em.declared')) + '</h2><p class="muted" style="margin:6px 0 0">' + esc(t('em.alert.title')) + '</p><dl class="kv"><dt>' + esc(t('em.f.name')) + '</dt><dd><b>' + esc(rec.name) + '</b> (' + rec.id + ')</dd><dt>' + esc(t('em.f.time')) + '</dt><dd>' + esc(tstr(rec.em.t0)) + '</dd><dt>' + esc(t('em.f.status')) + '</dt><dd>' + esc(t('lv.3')) + ' · ' + esc(t('em.p1')) + '</dd><dt>' + esc(t('em.f.critical')) + '</dt><dd>' + esc(t('em.crit.val', { hr })) + '</dd><dt>' + esc(t('em.f.trend')) + '</dt><dd>' + esc(trend) + '</dd></dl><b>' + esc(t('em.f.actions')) + '</b><ul>' + t('em.actions').map(a => '<li>' + esc(a) + '</li>').join('') + '</ul><details><summary>' + esc(t('em.ground')) + '</summary><dl class="kv"><dt>' + esc(t('em.g.id')) + '</dt><dd>' + rec.id + ' · ' + esc(rec.name) + '</dd><dt>' + esc(t('em.g.signs')) + '</dt><dd>' + esc(t('em.crit.val', { hr })) + '</dd><dt>' + esc(t('em.g.hist')) + '</dt><dd>' + esc(t('em.g.histv')) + '</dd><dt>' + esc(t('em.g.evo')) + '</dt><dd>' + esc(t('em.g.evov')) + '</dd><dt>' + esc(t('em.g.state')) + '</dt><dd>' + esc(t('lv.3')) + '</dd><dt>' + esc(t('em.g.why')) + '</dt><dd>' + esc(t('em.g.whyv')) + '</dd><dt>' + esc(t('em.g.risk')) + '</dt><dd>' + esc(trend) + '</dd></dl><p class="muted">' + esc(t('em.g.queue')) + '</p></details><p class="muted" style="font-size:var(--t-sm)">' + esc(t('em.privacy')) + ' ' + esc(t('em.note')) + '</p><p><button class="btn primary" data-act="alertclose" id="crew-close">' + esc(t('em.close')) + '</button> <button class="btn" data-act="viewpatient">' + esc(t('em.viewPatient')) + '</button></p>';
    if (!dlg.open && dlg.showModal) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
    const c = $('#crew-close'); if (c) c.focus();
  }
  function closeAlert() { const d = $('#crew'); if (d.open && d.close) d.close(); else d.removeAttribute('open'); }

  /* ---------- simulation of the incapacitation stream ---------- */
  function stopSim() { if (S.sim) { clearInterval(S.sim.timer); clearInterval(S.sim.cdTimer); S.sim = null; } S.recs.forEach(r => { r.sleeping = false; }); }
  function startSim(mode) {
    stopSim();
    const rec = cur(); rec.em = null; rec.loss = false;
    const r = E.rng(7);
    const sim = S.sim = { mode, who: rec.i, t: 0, buf: [], det: { state: 'ok' }, r, timer: null, cdTimer: null, holdSuspect: 0, hr: null, lastDet: 'ok' };
    for (let k = 0; k < 20; k++) { const s = E.simulateSample(mode, sim.t++, r); sim.buf.push(s); if (s.hr != null) sim.hr = s.hr; }
    rec.sleeping = mode === 'sleep';
    sim.det = E.detectIncapacitation(sim.buf, { limits: rec.profile.limits, sleeping: rec.sleeping });
    sim.lastDet = sim.det.state;
    sim.timer = setInterval(tick, 100);
    S.tab = 'overview'; S.scanNext = true; S.fresh = true; S.anim = true; S.demoOpen = false;
    recompute(rec); renderDemo(); render(); window.scrollTo(0, 0);
    toast(t('toast.sim'), mode === 'faint' ? 1 : null);
  }
  function stopSimUser() {
    const sim = S.sim; if (!sim) return;
    const rec = S.recs[sim.who];
    stopSim();
    if (rec.em && rec.em.stage !== 'declared') rec.em = null;
    rec.loss = false; recompute(rec); render(); toast(t('toast.stop'));
  }
  function liveUpdate() {
    const sim = S.sim;
    if (!sim || sim.who !== S.user) return;
    const last = sim.buf[sim.buf.length - 1] || {};
    const set = (id, txt) => { const n = $('#' + id); if (n) n.textContent = txt; };
    const bar = (id, f) => { const n = $('#' + id); if (n) n.style.transform = 'scaleX(' + Math.max(0, Math.min(1, f)).toFixed(3) + ')'; };
    if (sim.hr != null) set('live-hr', Math.round(sim.hr));
    set('sl-hr', last.hr == null ? '—' : Math.round(last.hr)); bar('sl-hr-b', last.hr == null ? 0 : (last.hr - 20) / 100);
    set('sl-mo', Math.round(last.motion || 0)); bar('sl-mo-b', (last.motion || 0) / 60);
    set('sl-q', Math.round((last.q || 0) * 100)); bar('sl-q-b', last.q || 0);
    const st = $('#sl-state'); if (st) st.textContent = t('sim.state.' + sim.det.state);
  }
  function tick() {
    const sim = S.sim; if (!sim) return;
    const rec = S.recs[sim.who];
    const sample = E.simulateSample(sim.mode, sim.t++, sim.r);
    sim.buf.push(sample); if (sim.buf.length > 300) sim.buf.shift();
    if (sample.hr != null) sim.hr = sim.hr == null ? sample.hr : sim.hr + (sample.hr - sim.hr) * 0.25;
    sim.det = E.detectIncapacitation(sim.buf, { limits: rec.profile.limits, sleeping: rec.sleeping });
    let changed = false;
    const wasLoss = rec.loss;
    rec.loss = sim.det.state === 'sensor';
    if (rec.loss !== wasLoss) { addEv(rec.i, 0, rec.loss ? 'evt.sensor' : 'evt.sensorBack'); changed = true; }
    if (!rec.em && sim.det.state === 'suspect') {
      rec.em = { stage: 'suspect', cd: 8, buf: [], t0: S.clock, hrLast: sample.hr };
      addEv(rec.i, 1, 'evt.suspect');
      sim.holdSuspect = sim.t; changed = true;
    } else if (rec.em && rec.em.stage === 'suspect' && sim.t - sim.holdSuspect > 10) {
      rec.em.stage = 'confirm';
      sim.cdTimer = setInterval(countdown, 1000); changed = true;
    }
    if (rec.em && sample.hr != null) rec.em.hrLast = sample.hr;
    if (sim.det.state !== sim.lastDet) { sim.lastDet = sim.det.state; changed = true; }
    if (changed && S.user === rec.i) render(); else liveUpdate();
    if (sim.mode === 'faint' && !rec.em && sim.t > 130) clearInterval(sim.timer);
  }
  function countdown() {
    const sim = S.sim; if (!sim) return;
    const rec = S.recs[sim.who];
    if (!rec.em || rec.em.stage !== 'confirm') { clearInterval(sim.cdTimer); return; }
    rec.em.cd--;
    if (rec.em.cd <= 0) { clearInterval(sim.cdTimer); clearInterval(sim.timer); declare(rec); return; }
    const n = $('#cd-num'); if (n) n.textContent = rec.em.cd;
    const r = $('#cd-ring'); if (r) r.style.strokeDashoffset = (1 - rec.em.cd / 8).toFixed(3);
    renderBanner();
  }
  function declare(rec) {
    S.clock += 4;
    rec.em.stage = 'declared'; rec.em.t0 = S.clock; rec.em.buf = S.sim ? S.sim.buf.slice(-100) : [];
    addEv(rec.i, 3, 'evt.em', {}, true); addEv(rec.i, 3, 'evt.alert', {}, true);
    recompute(rec);
    S.user = (rec.i + 1) % ROSTER.length; S.tab = 'overview';
    render(); openAlert();
  }
  function ackSim() {
    const rec = cur(), sim = S.sim;
    if (!rec.em || rec.em.stage === 'declared') return;
    clearInterval(sim && sim.cdTimer);
    rec.em = null; addEv(rec.i, 0, 'evt.ok');
    if (sim) { clearInterval(sim.timer); S.sim = null; }
    recompute(rec); render(); toast(t('toast.ack'), 0);
  }

  /* ---------- actions ---------- */
  function submitCheckin() {
    const rec = cur(), v = Object.assign({}, S.form);
    S.errors = E.validate(v);
    const any = E.INDICATORS.some(i => v[i.k] !== '' && v[i.k] != null);
    if (!any) S.errors._empty = true;
    if (Object.keys(S.errors).length) { render(); const first = document.querySelector('[aria-invalid="true"]'); if (first) first.focus(); return; }
    const prev = snap(rec);
    E.addReading(rec, rec.today, v, rec.today * 1440 + (S.clock % 1440));
    rec.fresh = true;
    S.clock += 7;
    addEv(rec.i, 0, 'evt.checkin', { day: rec.today });
    recompute(rec); logChange(rec, prev);
    S.form = {}; S.errors = {}; S.result = { who: rec.i }; S.fresh = true; S.scanNext = true;
    render();
    const r = $('#ci-result'); if (r) r.focus();
    live(t('ci.saved') + ' ' + t('lv.' + rec.level));
  }
  function live(text) { const l = $('#live'); if (l) l.textContent = text; }
  let toastTimer = null;
  function toast(text, lv, ms) {
    const el = $('#toast'); if (!el) return;
    el.className = 'toast show' + (lv == null ? '' : ' lv' + lv);
    el.textContent = text;
    live(text);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, ms || 3600);
  }
  function loadScenario(sc) {
    const i = S.user;
    stopSim();
    const prevLevel = S.recs[i].level;
    const rec = mkRec(i, sc); S.recs[i] = rec;
    S.clock += 11; addEv(i, rec.level, 'evt.scenario', { scenario: sc });
    if (rec.level !== prevLevel) addEv(i, rec.level, 'evt.state', { from: prevLevel, to: rec.level });
    rec.res.pats.forEach(p => addEv(i, p.level, 'evt.pattern', { pattern: p.id, conf: p.conf }));
    Object.keys(rec.res.limits).forEach(k => addEv(i, 2, 'evt.limit', { ind: k }));
    S.result = null; S.form = {}; S.errors = {};
    S.tab = 'overview'; S.anim = true; S.scanNext = true; S.fresh = true;
    closeAlert(); render(); window.scrollTo(0, 0);
    toast(t('toast.scenario', { scenario: t('demo.sc.' + sc) }) + ' · ' + t('lv.' + rec.level), rec.level);
  }
  function nextDay() {
    const rec = cur();
    if (rec.em && rec.em.stage === 'declared') return;
    rec.today++; rec.fresh = false; S.clock = rec.today * 1440 + 480;
    addEv(rec.i, 0, 'evt.day', { day: rec.today });
    S.result = null; S.tab = 'overview'; S.scanNext = true; S.fresh = true; S.anim = true;
    recompute(rec); render(); window.scrollTo(0, 0);
    toast(t('toast.day', { day: rec.today }), 1);
  }
  function init() {
    stopSim();
    S.recs = ROSTER.map((r, i) => mkRec(i, r.scn));
    S.events = []; S.eid = 0; S.clock = 30 * 1440 + 480; S.user = 1; S.tab = 'overview'; S.region = 'chest'; S.result = null; S.form = {}; S.errors = {}; S.gateMsg = null;
    S.recs.forEach(rec => { rec.res.pats.forEach(p => addEv(rec.i, p.level, 'evt.pattern', { pattern: p.id, conf: p.conf })); });
    closeAlert(); renderDemo(); render();
    if (FX.reduceSys && !S.noted) { S.noted = true; toast(t('toast.reduce'), null, 9000); }
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    if (a === 'tab') { S.tab = el.dataset.tab; S.gateMsg = null; S.anim = true; if (location.hash !== '#' + S.tab) { try { history.replaceState(null, '', '#' + S.tab); } catch (x) { /* ignore */ } } render(); window.scrollTo(0, 0); }
    else if (a === 'region') { S.region = el.dataset.r; render(); }
    else if (a === 'ind') { S.ind = el.dataset.k; S.anim = true; render(); }
    else if (a === 'scn') loadScenario(el.dataset.sc);
    else if (a === 'nextday') nextDay();
    else if (a === 'reset') { init(); S.scanNext = true; S.fresh = true; S.anim = true; render(); window.scrollTo(0, 0); toast(t('toast.reset')); }
    else if (a === 'sim') startSim(el.dataset.mode);
    else if (a === 'ack') ackSim();
    else if (a === 'simstop') stopSimUser();
    else if (a === 'viewpatient') { const rec = S.recs.find(r => r.em && r.em.stage === 'declared'); if (rec) { S.user = rec.i; S.anim = true; S.scanNext = true; closeAlert(); render(); window.scrollTo(0, 0); } }
    else if (a === 'alertopen') openAlert();
    else if (a === 'alertclose') closeAlert();
    else if (a === 'endinc') { const rec = S.recs.find(r => r.em && r.em.stage === 'declared'); if (rec) { addEv(rec.i, 0, 'evt.end', {}, true); rec.em = null; stopSim(); recompute(rec); closeAlert(); render(); } }
    else if (a === 'evastart') { const rec = cur(); if (!rec.fresh) { S.gateMsg = true; render(); return; } rec.evaOn = true; rec.evaDay = rec.today; rec.fresh = false; S.gateMsg = null; addEv(rec.i, 0, 'evt.eva'); recompute(rec); render(); }
    else if (a === 'evaend') { const rec = cur(); rec.evaOn = false; addEv(rec.i, 0, 'evt.evaEnd'); render(); }
    else if (a === 'fx') { FX.set(!FX.enabled); render(); }
    else if (a === 'lang') { lang = el.dataset.lang; try { localStorage.setItem('ainh-lang', lang); } catch (x) { /* ignore */ } renderDemo(); render(); }
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-act][tabindex]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'viewas') { stopSim(); S.user = +el.value; S.anim = true; S.scanNext = true; S.result = null; S.form = {}; S.errors = {}; S.gateMsg = null; render(); }
    else if (el.dataset && el.dataset.bind) { S.form[el.dataset.bind] = el.value; }
    else if (el.id === 'indsel') { S.ind = el.value; render(); }
  });
  document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.bind) S.form[el.dataset.bind] = el.value; });
  document.addEventListener('submit', e => { if (e.target.id === 'ciform') { e.preventDefault(); submitCheckin(); } });
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (TABS.indexOf(h) >= 0 && h !== S.tab) { S.tab = h; render(); } });

  /* ---------- link the effects engine to the app state ---------- */
  const LVC = ['#6fe0ee', '#ecca4a', '#f79a3a', '#ff5d52'];
  function simHr(rec) {
    if (S.sim && S.sim.who === rec.i && S.sim.hr != null) return S.sim.hr;
    if (rec.em && rec.em.stage === 'declared' && rec.em.hrLast != null) return rec.em.hrLast;
    return null;
  }
  FX.fmt = fmt;
  FX.src.bpm = () => { const rec = cur(); if (!rec) return 62; const s = simHr(rec); if (s != null) return s; const f = rec.res.inds.fc.last; return f == null ? 62 : f; };
  FX.src.amp = () => { const b = FX.src.bpm(); return b < 40 ? 0.45 : 1; };
  FX.src.lost = () => { const rec = cur(); return !!(rec && (rec.loss || (S.sim && S.sim.who === rec.i && S.sim.det && S.sim.det.state === 'sensor'))); };
  FX.src.color = () => { const rec = cur(); return rec ? LVC[rec.level] : LVC[0]; };
  FX.src.dust = () => {
    const rec = cur(); if (!rec) return 0;
    let d = rec.env === 'moon' ? 0.18 : 0;
    const m = Math.max(0, ...['sym_olho', 'sym_tosse', 'sym_pele'].map(k => rec.res.inds[k].dev || 0));
    d += Math.min(0.7, m / 2 * 0.7);
    if (rec.evaOn) d += 0.1;
    return Math.min(1, d);
  };
  function applyVars() {
    const rec = cur(); if (!rec) return;
    const bpm = Math.max(30, FX.src.bpm()), fr = rec.res.inds.fr.last || 14;
    document.documentElement.style.setProperty('--beat', (60 / bpm).toFixed(2) + 's');
    document.documentElement.style.setProperty('--breath', (60 / Math.max(6, fr)).toFixed(2) + 's');
  }

  const h0 = location.hash.replace('#', ''); if (TABS.indexOf(h0) >= 0) S.tab = h0;
  init();
  window.AINH = { S, E, render, init };
})();
