/* Visual effects: ambient constellation grid, live ECG trace, lunar-dust particles, count-up, scan sweep.
   Everything is drawn from callbacks the app provides (FX.src) so a DOM re-render never restarts a trace.
   Effects can be switched off (and are off by default for prefers-reduced-motion). */
(function () {
  'use strict';
  const root = document.documentElement;
  const FX = window.FX = {
    enabled: true,
    src: { bpm: () => 62, amp: () => 1, lost: () => false, dust: () => 0, color: () => '#6fe0ee' },
    fmt: (v, d) => Number(v).toFixed(d),
    counts: new Map()
  };
  let pref = null;
  try { pref = localStorage.getItem('ainh-fx'); } catch (e) { /* storage may be blocked */ }
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  FX.reduceSys = reduce && pref == null;
  FX.enabled = pref == null ? true : pref === 'on';
  const apply = () => { root.dataset.fx = FX.enabled ? 'on' : 'off'; };
  FX.set = on => { FX.enabled = on; try { localStorage.setItem('ainh-fx', on ? 'on' : 'off'); } catch (e) { /* ignore */ } apply(); };
  apply();

  /* ---------- ambient background: drifting constellation over the grid ---------- */
  const bg = document.getElementById('bg'), bctx = bg && bg.getContext('2d');
  let W = 0, H = 0, nodes = [];
  function sizeBg() {
    if (!bg) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    bg.style.width = W + 'px'; bg.style.height = H + 'px';
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(64, W * H / 24000));
    nodes = [];
    for (let i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .14, vy: (Math.random() - .5) * .14, r: Math.random() * 1.3 + .5, ph: Math.random() * 6.28 });
  }
  function drawBg(t) {
    if (!bctx) return;
    bctx.clearRect(0, 0, W, H);
    if (!FX.enabled) return;
    for (const p of nodes) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
    }
    bctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = dx * dx + dy * dy;
        if (d2 < 15000) { bctx.strokeStyle = 'rgba(111,224,238,' + (0.28 * (1 - d2 / 15000)).toFixed(3) + ')'; bctx.beginPath(); bctx.moveTo(nodes[i].x, nodes[i].y); bctx.lineTo(nodes[j].x, nodes[j].y); bctx.stroke(); }
      }
    }
    for (const p of nodes) {
      const a = 0.5 + 0.4 * Math.sin(t / 800 + p.ph);
      bctx.fillStyle = 'rgba(190,245,250,' + a.toFixed(2) + ')';
      bctx.beginPath(); bctx.arc(p.x, p.y, p.r, 0, 6.283); bctx.fill();
    }
  }

  /* ---------- ECG trace ---------- */
  const g = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  const wave = p => 0.12 * g(p, 0.16, 0.025) - 0.12 * g(p, 0.285, 0.008) + 1.0 * g(p, 0.31, 0.010) - 0.22 * g(p, 0.335, 0.010) + 0.26 * g(p, 0.60, 0.045);
  const SPS = 110; /* samples per second drawn */
  const ecg = new WeakMap();
  function ecgState(cv) {
    let s = ecg.get(cv);
    if (!s) { s = { buf: [], phase: 0, acc: 0 }; ecg.set(cv, s); }
    return s;
  }
  function pushSample(s, bpm, amp, lost) {
    s.phase = (s.phase + bpm / 60 / SPS) % 1;
    const noise = (Math.random() - .5) * 0.03;
    s.buf.push(lost ? noise * 1.5 : wave(s.phase) * amp + noise);
  }
  function drawEcg(cv, dt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = ecgState(cv), px = 2.2, cap = Math.ceil(w / px) + 2;
    const bpm = Math.max(12, FX.src.bpm()), amp = FX.src.amp(), lost = FX.src.lost();
    if (s.buf.length < cap) while (s.buf.length < cap) pushSample(s, bpm, amp, lost);
    else if (FX.enabled) { s.acc += dt * SPS; while (s.acc >= 1) { s.acc -= 1; pushSample(s, bpm, amp, lost); } }
    while (s.buf.length > cap) s.buf.shift();
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(111,224,238,.10)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); ctx.stroke(); }
    const col = FX.src.color();
    ctx.strokeStyle = col; ctx.lineWidth = 2.3; ctx.lineJoin = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = FX.enabled ? 9 : 0;
    ctx.beginPath();
    const base = h * 0.66, scale = h * 0.55;
    for (let i = 0; i < s.buf.length; i++) { const x = i * px, y = base - s.buf[i] * scale; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (FX.enabled) { const lx = (s.buf.length - 1) * px, ly = base - s.buf[s.buf.length - 1] * scale; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, 6.283); ctx.fill(); }
  }

  /* ---------- lunar dust particles over the hologram ---------- */
  const dust = [];
  const ANCH = [[0.5, 0.15], [0.5, 0.37], [0.32, 0.40], [0.68, 0.40]];
  function drawDust(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const d = FX.src.dust(); if (!d) { dust.length = 0; return; }
    const target = Math.round(18 + d * 120);
    while (dust.length < target) dust.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .0006, vy: .0003 + Math.random() * .0008, r: Math.random() * 2.2 + .9, ph: Math.random() * 6.28, a: Math.random() * 0.4 + 0.55 });
    while (dust.length > target) dust.pop();
    for (const p of dust) {
      if (FX.enabled) {
        const an = ANCH[(p.ph * 100 | 0) % ANCH.length];
        p.x += p.vx + (an[0] - p.x) * 0.0009 * d; p.y += p.vy + (an[1] - p.y) * 0.0009 * d; p.ph += 0.01;
        if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02; else if (p.x > 1.02) p.x = -0.02;
      }
      ctx.fillStyle = 'rgba(238,214,176,' + (p.a * (0.7 + 0.3 * Math.sin(p.ph))).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, 6.283); ctx.fill();
    }
  }

  /* ---------- count-up and scan ---------- */
  FX.countUp = function (scope) {
    (scope || document).querySelectorAll('[data-count]').forEach(el => {
      const key = el.dataset.key || el.id, to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
      const from = FX.counts.has(key) ? FX.counts.get(key) : null;
      FX.counts.set(key, to);
      el.textContent = FX.fmt(to, dec);
      if (!FX.enabled || from == null || from === to || Number.isNaN(from)) return;
      const t0 = performance.now(), dur = 700;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = FX.fmt(from + (to - from) * e, dec);
        if (k < 1 && el.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  FX.scan = function () {
    if (!FX.enabled) return;
    const s = document.querySelector('.stage');
    if (!s) return;
    s.classList.remove('scan'); void s.offsetWidth; s.classList.add('scan');
    setTimeout(() => s.classList.remove('scan'), 1500);
  };

  /* ---------- loop ---------- */
  let last = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (!document.hidden) {
      drawBg(t);
      document.querySelectorAll('canvas[data-fx="ecg"]').forEach(cv => drawEcg(cv, dt));
      document.querySelectorAll('canvas[data-fx="dust"]').forEach(drawDust);
    }
    requestAnimationFrame(frame);
  }
  sizeBg();
  window.addEventListener('resize', sizeBg);
  requestAnimationFrame(frame);
})();
