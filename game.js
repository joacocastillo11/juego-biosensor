'use strict';
/* La Subida — runner de 3 carriles en pseudo-3D (canvas 2D) sobre sensores bioquímicos. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIn = (a, b, t) => a + (b - a) * t * t;
  const easeIO = (a, b, t) => a + (b - a) * (-Math.cos(Math.PI * t) / 2 + 0.5);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const COL = {
    ink: '#141b2d', bone: '#f2e8d5', mustard: '#e8b92f', oxblood: '#a3322a', teal: '#1f6f73',
    turq: '#3fb8af', granite: '#6f7d8c', skin: '#d9a07a', danger: '#e2553f',
  };

  // ---------------- Configuración del juego ----------------
  const SEG = 200;            // largo de cada tramo
  const ROAD = 1000;          // medio ancho del camino
  const LANE = 0.62;          // desplazamiento de carril (fracción del medio ancho)
  const DRAW = 150;           // tramos visibles
  const CAM_DEPTH = 0.84;
  const PLAYER_DZ = 1500;
  const VMAX = 5600;          // unidades por segundo (≈ 28 tramos/s)
  const FINISH_SEG = 2700;
  const RIVER_SEG = 884;
  const APP_SEG = 1800;
  const TARGET = 120;         // meta: 2:00
  const CAP = 160;            // cierre de ruta: 2:40
  const ERR = { hyd: 17, en: 8, fat: 22 };
  const GAIN = { hyd: 26, en: 28, fat: 30 };
  const NAMES = { hyd: 'hidratación', en: 'energía', fat: 'fatiga' };

  // ---------------- Pista ----------------
  let segs = [];
  let lastY = 0;
  function addSeg(curve, y) {
    const i = segs.length;
    segs.push({ i, curve, y1: lastY, y2: y, band: ((i / 3) | 0) % 2, decor: [], objs: [], water: false,
      p1: { x: 0, y: 0, w: 0, s: 0 }, p2: { x: 0, y: 0, w: 0, s: 0 }, clip: 0, frame: -1 });
    lastY = y;
  }
  function addRoad(enter, hold, leave, curve, height) {
    const startY = lastY, endY = startY + height * SEG, total = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeIO(startY, endY, n / total));
    for (let n = 0; n < hold; n++) addSeg(curve, easeIO(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) addSeg(easeIO(curve, 0, n / leave), easeIO(startY, endY, (enter + hold + n) / total));
  }

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildTrack() {
    segs = []; lastY = 0;
    addRoad(40, 40, 40, 0, 0);
    addRoad(50, 80, 50, 2, 10);
    addRoad(40, 60, 40, -2.5, -5);
    addRoad(60, 120, 60, 1.5, 40);   // la subida grande
    addRoad(40, 80, 40, -1, 0);
    addRoad(30, 40, 30, 0, 0);       // zona del estero
    addRoad(50, 100, 50, 3, -20);
    addRoad(40, 80, 40, -2, 15);
    addRoad(60, 100, 60, 0, -10);
    addRoad(40, 60, 40, 2.5, 20);
    addRoad(30, 60, 30, -1.5, 0);    // zona de la desconexión
    addRoad(40, 80, 40, 1, 0);
    addRoad(60, 120, 60, -2, 45);    // subida final
    addRoad(50, 100, 50, 1.5, 25);
    addRoad(40, 140, 40, 0, 10);
    addRoad(40, 200, 40, 0, 0);
    addRoad(50, 120, 50, 0, 0);
    for (let i = RIVER_SEG - 6; i <= RIVER_SEG + 11; i++) segs[i].water = true;
    for (const i of [RIVER_SEG - 9, RIVER_SEG - 8, RIVER_SEG - 7, RIVER_SEG + 12, RIVER_SEG + 13, RIVER_SEG + 14]) segs[i].bank = true;

    const r = rng(20261124);
    // Paisaje a los lados
    for (let i = 8; i < segs.length - 10; i++) {
      if (i % 9 === 0) segs[i].decor.push({ k: 'post', off: -1.22 }, { k: 'post', off: 1.22 });
      if (r() < 0.16) segs[i].decor.push({ k: r() < 0.55 ? 'lenga' : 'calafate', off: (r() < 0.5 ? -1 : 1) * (1.5 + r() * 2.6), v: r() });
      if (r() < 0.22) segs[i].decor.push({ k: 'coiron', off: (r() < 0.5 ? -1 : 1) * (1.3 + r() * 3.2), v: r() });
      if (r() < 0.035) segs[i].decor.push({ k: 'boulder', off: (r() < 0.5 ? -1 : 1) * (1.45 + r() * 1.6), v: r() });
      if (r() < 0.012) segs[i].decor.push({ k: 'guanacoSide', off: (r() < 0.5 ? -1 : 1) * (2 + r() * 2), v: r() });
    }
    segs[14].decor.push({ k: 'sign', off: -1.65, text: ['PARQUE NACIONAL', 'TORRES DEL PAINE'] });
    segs[RIVER_SEG - 40].decor.push({ k: 'sign', off: 1.65, text: ['ESTERO', 'VADO'] });
    segs[RIVER_SEG - 16].decor.push({ k: 'sign', off: -1.65, text: ['CRUCE', 'DE AGUA'] });
    // juncos en las orillas y piedras dentro del agua, fuera del camino
    for (const i of [RIVER_SEG - 8, RIVER_SEG - 7, RIVER_SEG + 12, RIVER_SEG + 13]) {
      for (const side of [-1, 1]) segs[i].decor.push({ k: 'reeds', off: side * (1.3 + r() * 2.2), v: r() }, { k: 'reeds', off: side * (3 + r() * 2), v: r() });
    }
    for (let i = RIVER_SEG - 5; i <= RIVER_SEG + 10; i += 3) segs[i].decor.push({ k: 'stone', off: (r() < 0.5 ? -1 : 1) * (1.4 + r() * 2.5), v: r() });
    segs[FINISH_SEG - 420].decor.push({ k: 'sign', off: -1.65, text: ['MIRADOR', '→'] });
    segs[FINISH_SEG].decor.push({ k: 'arch', off: 0 });
  }

  function buildObjects() {
    for (const s of segs) s.objs = [];
    const r = rng(7 + Math.floor(Math.random() * 3));
    const types = ['hyd', 'hyd', 'hyd', 'hyd', 'en', 'en', 'en', 'fat', 'fat', 'fat'];
    const pick = () => types[(r() * types.length) | 0];
    const lanes = [-1, 0, 1];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const blocked = i => i > RIVER_SEG - 22 && i < RIVER_SEG + 22;
    let i = 70;
    while (i < FINISH_SEG - 40) {
      if (!blocked(i)) {
        const L = shuffle(lanes.slice());
        const roll = r();
        const a = pick();
        let b = pick(); while (b === a) b = pick();
        if (roll < 0.5) { add(i, L[0], a); add(i, L[1], obstacle()); }
        else if (roll < 0.78) { add(i, L[0], a); add(i, L[1], b); }
        else { add(i, L[0], a); }
      }
      // obstáculo intermedio
      const mid = i + 13 + ((r() * 3) | 0);
      if (!blocked(mid) && mid < FINISH_SEG - 30 && r() < 0.75) {
        if (r() < 0.12) add(mid, r() < 0.5 ? -1 : 1, 'guanaco');
        else add(mid, lanes[(r() * 3) | 0], obstacle());
      }
      i += 26 + ((r() * 8) | 0);
    }
    function obstacle() { return r() < 0.6 ? 'rock' : 'hole'; }
    function add(seg, lane, k) {
      const o = { k, lane, off: lane * LANE, z: seg * SEG + SEG * 0.5, done: false, dir: 0, t: r() * 6 };
      if (k === 'guanaco') { o.dir = -Math.sign(lane) || 1; o.off = lane * LANE * 1.6; }
      segs[seg].objs.push(o);
    }
  }

  // ---------------- Canvas y fondos ----------------
  const cv = $('#world');
  let ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, HZ = 0, U = 1, CAM_H = 1000, RW = 300, SY = 0, unit = 20, spriteK = 1;
  let skyC, mtnC, hillC, vignetteC, grainPat, dotPat;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const hudEl = $('#hud');
    const hudH = hudEl.classList.contains('hidden') ? (W < 760 ? 118 : 104) : hudEl.offsetHeight;
    document.documentElement.style.setProperty('--hud-h', hudH + 'px');
    const portrait = H > W * 1.05;
    HZ = H * (portrait ? 0.34 : 0.37);
    SY = H - hudH - H * (portrait ? 0.05 : 0.04);
    RW = portrait ? 0.46 * W : Math.min(0.28 * W, 0.62 * H);
    CAM_H = ROAD * (SY - HZ) / RW;
    U = (SY - HZ) * PLAYER_DZ / (CAM_DEPTH * CAM_H);
    unit = Math.max(RW / 9.5, H / 56);
    // en ventanas bajas y anchas, el ciclista y los objetos no deben tapar media pantalla
    spriteK = Math.min(1, ((SY - HZ) * 0.11) / (RW / 9.5));
    buildBackgrounds();
  }

  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR)); const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, x]; }

  function ink(x, lw) { x.strokeStyle = COL.ink; x.lineWidth = lw; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(); }

  function buildBackgrounds() {
    // trama de puntos
    const [dc, dx] = mk(8, 8);
    dx.fillStyle = 'rgba(20,27,45,.5)'; dx.beginPath(); dx.arc(4, 4, 1.25, 0, 7); dx.fill();
    dotPat = ctx.createPattern(dc, 'repeat');
    // grano
    const gc = document.createElement('canvas'); gc.width = gc.height = 160;
    const gx = gc.getContext('2d'); const id = gx.createImageData(160, 160);
    for (let p = 0; p < id.data.length; p += 4) { const v = Math.random() * 255; id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = Math.random() < 0.5 ? 18 : 0; }
    gx.putImageData(id, 0, 0);
    grainPat = ctx.createPattern(gc, 'repeat');

    // cielo
    let x;
    [skyC, x] = mk(W, HZ + 40);
    const g = x.createLinearGradient(0, 0, 0, HZ + 40);
    g.addColorStop(0, '#22406a'); g.addColorStop(0.45, '#5f7fa0'); g.addColorStop(0.78, '#e9a95e'); g.addColorStop(1, '#f6d7a0');
    x.fillStyle = g; x.fillRect(0, 0, W, HZ + 40);
    // sol bajo
    const sun = x.createRadialGradient(W * 0.8, HZ * 0.82, 4, W * 0.8, HZ * 0.82, HZ * 0.9);
    sun.addColorStop(0, 'rgba(255,236,190,.9)'); sun.addColorStop(0.12, 'rgba(255,214,150,.55)'); sun.addColorStop(1, 'rgba(255,200,140,0)');
    x.fillStyle = sun; x.fillRect(0, 0, W, HZ + 40);
    // nubes lenticulares
    const lw = Math.max(1.5, W / 600);
    [[0.18, 0.22, 0.2], [0.55, 0.13, 0.26], [0.86, 0.3, 0.16], [0.38, 0.38, 0.12]].forEach(([cx, cy, sz]) => {
      const cw = W * sz, chh = cw * 0.11;
      for (let k = 0; k < 3; k++) {
        const yy = HZ * cy + k * chh * 0.9, ww = cw * (1 - k * 0.18);
        x.beginPath(); x.ellipse(W * cx, yy, ww / 2, chh / 2, 0, 0, Math.PI * 2);
        x.fillStyle = k === 0 ? '#f7e6cf' : k === 1 ? '#f0cfae' : '#e3b08f';
        x.fill(); ink(x, lw);
      }
    });

    // montañas (capa repetible de 2W)
    const MW = W * 2, MH = HZ * 0.95;
    [mtnC, x] = mk(MW, MH + 4);
    const base = MH;
    const lw2 = Math.max(1.6, W / 520);
    const ridge = (t) => base - MH * (0.16 + 0.05 * Math.sin(t * Math.PI * 2 * 3) + 0.04 * Math.sin(t * Math.PI * 2 * 7 + 1) + 0.025 * Math.sin(t * Math.PI * 2 * 13));
    // cordón lejano
    x.beginPath(); x.moveTo(0, base);
    for (let i = 0; i <= 200; i++) { const t = i / 200; x.lineTo(t * MW, ridge(t) - MH * 0.06); }
    x.lineTo(MW, base); x.closePath();
    x.fillStyle = '#7f8fa8'; x.fill(); ink(x, lw2 * 0.8);
    // Paine Grande (macizo ancho con glaciar)
    massif(x, MW * 0.12, base, MW * 0.2, MH * 0.62, lw2);
    // Cuernos (granito claro con cumbres oscuras)
    cuernos(x, MW * 0.32, base, MW * 0.12, MH * 0.7, lw2);
    // Torres (tres agujas)
    torres(x, MW * 0.58, base, MW * 0.075, MH * 0.86, lw2);
    // copia de la segunda mitad para que el borde coincida
    cuernos(x, MW * 0.82, base, MW * 0.1, MH * 0.55, lw2);
    massif(x, MW * 0.98, base, MW * 0.12, MH * 0.4, lw2);
    massif(x, -MW * 0.02, base, MW * 0.12, MH * 0.4, lw2);
    // lago turquesa
    x.fillStyle = COL.turq;
    x.fillRect(0, base - MH * 0.05, MW, MH * 0.05 + 4);
    x.strokeStyle = 'rgba(242,232,213,.75)'; x.lineWidth = Math.max(1, lw2 * 0.6);
    for (let i = 0; i < 26; i++) { const sx = (i * 97.3) % MW, sy = base - MH * 0.035 + (i % 3) * MH * 0.012; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + MW * 0.015, sy); x.stroke(); }
    x.beginPath(); x.moveTo(0, base - MH * 0.05); x.lineTo(MW, base - MH * 0.05); ink(x, lw2 * 0.7);

    // lomas de pampa (repetible)
    const HWd = W * 2, HH = H * 0.16;
    [hillC, x] = mk(HWd, HH);
    const hill = (t, a, ph) => HH * (0.55 - a * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 4 + ph)) * 0.6);
    [['#b58a3e', 0.5, 0], ['#c99b45', 0.7, 2]].forEach(([c, a, ph]) => {
      x.beginPath(); x.moveTo(0, HH);
      for (let i = 0; i <= 160; i++) { const t = i / 160; x.lineTo(t * HWd, hill(t, a, ph)); }
      x.lineTo(HWd, HH); x.closePath(); x.fillStyle = c; x.fill(); ink(x, lw2 * 0.8);
    });
    x.fillStyle = '#5a4a2a';
    for (let i = 0; i < 90; i++) { const t = (i * 0.0111) % 1; const yy = hill(t, 0.7, 2) + 6 + (i % 5) * 4; x.beginPath(); x.arc(t * HWd, Math.min(HH - 2, yy), 1.6 + (i % 3), 0, 7); x.fill(); }

    // viñeta
    [vignetteC, x] = mk(W, H);
    const vg = x.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }

  function shade(x, path, lw) {
    x.save(); path(); x.clip(); x.fillStyle = dotPat || 'rgba(20,27,45,.2)'; x.fillRect(-1e4, -1e4, 2e4, 2e4); x.restore();
  }

  function massif(x, cx, base, w, h, lw) {
    const pts = [[-0.5, 0], [-0.36, -0.55], [-0.2, -0.78], [-0.05, -0.95], [0.08, -1], [0.22, -0.82], [0.38, -0.6], [0.5, 0]];
    const path = () => { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo : x.moveTo).call(x, cx + px * w, base + py * h)); x.closePath(); };
    path(); x.fillStyle = '#5f6d86'; x.fill();
    // glaciar
    x.beginPath(); x.moveTo(cx - 0.3 * w, base - 0.66 * h); x.lineTo(cx - 0.05 * w, base - 0.95 * h); x.lineTo(cx + 0.08 * w, base - h); x.lineTo(cx + 0.25 * w, base - 0.78 * h);
    x.lineTo(cx + 0.12 * w, base - 0.7 * h); x.lineTo(cx, base - 0.76 * h); x.lineTo(cx - 0.12 * w, base - 0.64 * h); x.closePath();
    x.fillStyle = '#f2ece2'; x.fill(); ink(x, lw * 0.7);
    shade(x, () => { x.beginPath(); x.moveTo(cx + 0.08 * w, base - h); x.lineTo(cx + 0.5 * w, base); x.lineTo(cx + 0.05 * w, base); x.closePath(); }, lw);
    path(); ink(x, lw);
  }

  function cuernos(x, cx, base, w, h, lw) {
    const body = () => { x.beginPath(); x.moveTo(cx - 0.6 * w, base); x.lineTo(cx - 0.45 * w, base - 0.55 * h); x.lineTo(cx - 0.3 * w, base - 0.9 * h); x.lineTo(cx - 0.18 * w, base - 0.72 * h); x.lineTo(cx - 0.02 * w, base - h); x.lineTo(cx + 0.14 * w, base - 0.78 * h); x.lineTo(cx + 0.3 * w, base - 0.92 * h); x.lineTo(cx + 0.45 * w, base - 0.6 * h); x.lineTo(cx + 0.6 * w, base); x.closePath(); };
    body(); x.fillStyle = '#d8c7ad'; x.fill();
    // cumbres oscuras (la marca de los Cuernos)
    x.save(); body(); x.clip();
    x.beginPath(); x.moveTo(cx - 0.7 * w, base - 0.62 * h);
    for (let i = 0; i <= 12; i++) { const t = i / 12; x.lineTo(cx - 0.7 * w + t * 1.4 * w, base - (0.6 + 0.06 * Math.sin(i * 1.7)) * h); }
    x.lineTo(cx + 0.7 * w, base - 1.2 * h); x.lineTo(cx - 0.7 * w, base - 1.2 * h); x.closePath();
    x.fillStyle = '#2b2f3c'; x.fill(); ink(x, lw * 0.7);
    // base oscura
    x.fillStyle = '#4b566c'; x.fillRect(cx - w, base - 0.22 * h, 2 * w, 0.22 * h);
    x.fillStyle = dotPat; x.fillRect(cx, base - h, w, h);
    x.restore();
    body(); ink(x, lw);
  }

  function torres(x, cx, base, w, h, lw) {
    // base del macizo
    const foot = () => { x.beginPath(); x.moveTo(cx - 1.1 * w, base); x.lineTo(cx - 0.6 * w, base - 0.42 * h); x.lineTo(cx + 0.65 * w, base - 0.45 * h); x.lineTo(cx + 1.15 * w, base); x.closePath(); };
    foot(); x.fillStyle = '#56627a'; x.fill(); shade(x, () => { x.beginPath(); x.moveTo(cx + 0.1 * w, base - 0.45 * h); x.lineTo(cx + 0.65 * w, base - 0.45 * h); x.lineTo(cx + 1.15 * w, base); x.lineTo(cx + 0.2 * w, base); x.closePath(); }, lw); foot(); ink(x, lw);
    // tres agujas de granito: contorno anguloso, cumbre irregular, cara iluminada y cara en sombra
    const SP = [
      { ox: -0.5, sw: 0.22, sh: 0.82, top: [[0, 0.12], [0.22, 0.03], [0.4, 0.06], [0.58, 0], [0.78, 0.05], [1, 0.15]] },
      { ox: 0.0, sw: 0.27, sh: 1.0, top: [[0, 0.1], [0.16, 0.02], [0.32, 0.05], [0.46, 0], [0.62, 0.02], [0.8, 0.06], [1, 0.12]] },
      { ox: 0.5, sw: 0.2, sh: 0.9, top: [[0, 0.14], [0.24, 0.02], [0.5, 0.07], [0.68, 0], [1, 0.16]] },
    ];
    SP.forEach(({ ox, sw, sh, top }) => {
      const B = base - 0.4 * h, T = base - sh * h, hh = B - T;
      const Lb = cx + (ox - sw / 2) * w, Rb = cx + (ox + sw / 2) * w;          // base más ancha
      const Lt = Lb + sw * w * 0.12, Rt = Rb - sw * w * 0.1;                  // cumbre más angosta
      const spire = () => {
        x.beginPath(); x.moveTo(Lb, B);
        x.lineTo(Lb + sw * w * 0.04, B - hh * 0.45); x.lineTo(Lt, T + hh * 0.12);
        top.forEach(([tx, ty]) => x.lineTo(lerp(Lt, Rt, tx), T + ty * hh));
        x.lineTo(Rb - sw * w * 0.03, B - hh * 0.5); x.lineTo(Rb, B); x.closePath();
      };
      spire(); x.fillStyle = '#e9a77c'; x.fill(); // granito encendido por el amanecer
      x.save(); spire(); x.clip();
      const mid = (Lt + Rt) / 2 + sw * w * 0.06;
      x.beginPath(); x.moveTo(mid, T - 10); x.lineTo(mid - sw * w * 0.12, B + 10); x.lineTo(Rb + 20, B + 10); x.lineTo(Rb + 20, T - 10); x.closePath();
      x.fillStyle = '#8f6670'; x.fill();
      x.fillStyle = dotPat; x.fill();
      // grietas verticales
      x.strokeStyle = 'rgba(20,27,45,.5)'; x.lineWidth = lw * 0.55;
      [0.22, 0.4, 0.74].forEach(fx => { x.beginPath(); x.moveTo(lerp(Lt, Rt, fx), T + hh * (0.1 + fx * 0.1)); x.lineTo(lerp(Lb, Rb, fx) + w * 0.01, B - hh * 0.05); x.stroke(); });
      // nieve en las repisas
      x.fillStyle = '#f4efe6';
      x.beginPath(); x.ellipse(lerp(Lt, Rt, 0.3), T + hh * 0.38, sw * w * 0.12, hh * 0.018, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(lerp(Lt, Rt, 0.65), T + hh * 0.62, sw * w * 0.1, hh * 0.016, 0, 0, 7); x.fill();
      x.restore();
      spire(); ink(x, lw);
    });
  }

  // ---------------- Estado ----------------
  const st = {
    mode: 'title', t: 0, raceT: 0, z: 0, speed: 0, lane: 0, off: 0, lean: 0, pedal: 0,
    hyd: 82, en: 78, fat: 14, est: { hyd: 82, en: 78, fat: 14 }, err: { hyd: 0, en: 0, fat: 0 }, errT: { hyd: 0, en: 0, fat: 0 }, errClock: { hyd: 2, en: 3, fat: 1 },
    offHyd: 0, offAll: 0, heavy: 0, stun: 0, walking: false, finished: false, capped: false,
    events: { river: false, app: false }, mtn: 0, hills: 0, shake: 0, flash: 0,
    hist: [], histClock: 0, log: [], waste: 0, crit: 0, blindCrit: 0, blindT: 0, walkT: 0, grabs: 0, misled: 0, blindGood: 0,
    alertClock: 0, cueShown: false, tips: 0, beatClock: 0, hudClock: 0, profClock: 0, countdown: 0,
  };
  let particles = [];
  let frameId = 0;

  function resetRun() {
    Object.assign(st, {
      t: 0, raceT: 0, z: 0, speed: 0, lane: 0, off: 0, lean: 0,
      hyd: 82, en: 78, fat: 14, offHyd: 0, offAll: 0, heavy: 0, stun: 0, walking: false, finished: false, capped: false,
      events: { river: false, app: false }, hist: [], histClock: 0, log: [], waste: 0, crit: 0, blindCrit: 0, trustCrit: 0, blindT: 0, walkT: 0,
      grabs: 0, misled: 0, blindGood: 0, alertClock: 6, cueShown: false, tips: 0, beatClock: 0, mtn: st.mtn,
      riverT: null, appT: null, won: false,
    });
    st.err = { hyd: 0, en: 0, fat: 0 }; st.errT = { hyd: -9, en: 4, fat: 14 }; st.errClock = { hyd: 4, en: 6, fat: 3 };
    st.est = { hyd: st.hyd, en: st.en, fat: st.fat };
    particles = [];
    buildObjects();
  }

  const segAt = z => segs[clamp(Math.floor(z / SEG), 0, segs.length - 1)];

  // ---------------- Bucle ----------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frameId++;
    update(dt);
    render(dt);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    st.t += dt;
    if (st.mode === 'title' || st.mode === 'intro') {
      st.speed = lerp(st.speed, VMAX * 0.42, dt * 1.5);
      st.z += st.speed * dt;
      if (st.z > 1100 * SEG) st.z = 30 * SEG;
      st.off = lerp(st.off, Math.sin(st.t * 0.35) * 0.25, dt * 2);
      st.pedal += st.speed * dt * 0.0042;
      scroll(dt);
      return;
    }
    if (st.mode === 'countdown') {
      st.countdown -= dt;
      const n = Math.ceil(st.countdown / 0.7);
      if (n !== st._lastCount) { st._lastCount = n; if (n > 0) { toast(String(n), '', 'count', 600); SFX.count(false); } else { toast('¡Vamos!', '', 'count', 700); SFX.count(true); } }
      if (st.countdown <= 0) { st.mode = 'play'; }
      return;
    }
    if (st.mode !== 'play') return;

    st.raceT += dt;
    const seg = segAt(st.z + PLAYER_DZ);
    const grade = (seg.y2 - seg.y1) / SEG;
    const uphill = grade > 0.03;

    // --- cuerpo (valores reales) ---
    const w = st.walking;
    st.hyd -= (1.25 + (uphill ? 0.4 : 0)) * dt * (w ? 0.5 : 1);
    st.en -= (0.9 + (uphill ? 0.3 : 0)) * dt * (w ? 0.45 : 1);
    st.fat += w ? -1.8 * dt : (0.8 + (uphill ? 0.75 : 0) + (st.speed > VMAX * 0.9 ? 0.1 : 0)) * dt;
    st.hyd = clamp(st.hyd, 0, 100); st.en = clamp(st.en, 0, 100); st.fat = clamp(st.fat, 0, 100);

    const f = x => (x >= 40 ? 1 : x >= 15 ? 0.55 + 0.45 * (x - 15) / 25 : 0.5);
    const g = x => (x <= 60 ? 1 : x <= 88 ? 1 - 0.45 * (x - 60) / 28 : 0.5);
    if (!st.walking && (st.hyd < 12 || st.en < 12 || st.fat > 92)) {
      st.walking = true; toast('Te bajaste de la bici', 'Recoge lo que te falta para volver a pedalear', 'bad', 2600); SFX.over();
    } else if (st.walking && st.hyd > 22 && st.en > 22 && st.fat < 70) {
      st.walking = false; toast('¡De vuelta en la bici!', '', 'good', 1400);
    }
    let factor = Math.min(f(st.hyd), f(st.en), g(st.fat));
    if (st.walking) factor = 0.27;
    if (st.heavy > 0) { st.heavy -= dt; factor *= 0.7; }
    if (uphill && !st.walking) factor *= 0.9;
    if (seg.water) factor *= 0.75;
    if (st.stun > 0) st.stun -= dt;
    const target = VMAX * factor;
    st.speed = lerp(st.speed, target, dt * (st.speed < target ? 1.2 : 3));
    st.z += st.speed * dt;
    st.pedal += st.speed * dt * (st.walking ? 0.0065 : 0.0042);
    st.off = lerp(st.off, st.lane * LANE, 1 - Math.exp(-dt * 16));
    st.lean = lerp(st.lean, (st.lane * LANE - st.off) * 0.9, 1 - Math.exp(-dt * 10));
    scroll(dt);

    // --- sensor ---
    for (const k of ['hyd', 'en', 'fat']) {
      st.errClock[k] -= dt;
      if (st.errClock[k] <= 0) {
        st.errClock[k] = 5 + Math.random() * 4;
        // error medio ≠ error máximo: a veces la lectura se sale incluso de su franja
        st.errT[k] = (Math.random() < 0.5 ? -1 : 1) * ERR[k] * (0.5 + Math.random() * (k === 'hyd' ? 1.0 : 0.8));
      }
      st.err[k] = lerp(st.err[k], st.errT[k], dt * 0.55);
      st.est[k] = clamp(st[k] + st.err[k], 0, 100);
    }
    if (st.offHyd > 0) st.offHyd -= dt;
    if (st.offAll > 0) st.offAll -= dt;
    const blind = st.offHyd > 0 || st.offAll > 0;

    // --- registros ---
    const critNow = st.hyd < 28 || st.en < 28 || st.fat > 78;
    if (critNow) {
      st.crit += dt;
      if (blind) st.blindCrit += dt;
      // el cuerpo en rojo mientras el parche (encendido) mostraba que todo iba bien
      const fooled = (st.hyd < 28 && !(st.offHyd > 0 || st.offAll > 0) && st.est.hyd >= 35)
        || (st.en < 28 && !(st.offAll > 0) && st.est.en >= 35)
        || (st.fat > 78 && !(st.offAll > 0) && st.est.fat <= 65);
      if (fooled) st.trustCrit += dt;
    }
    if (blind) st.blindT += dt;
    if (st.walking) st.walkT += dt;
    st.histClock -= dt;
    if (st.histClock <= 0) {
      st.histClock = 0.5;
      st.hist.push({ t: st.raceT, hyd: st.hyd, en: st.en, fat: st.fat,
        eh: st.offHyd > 0 || st.offAll > 0 ? null : st.est.hyd, ee: st.offAll > 0 ? null : st.est.en, ef: st.offAll > 0 ? null : st.est.fat });
    }

    // --- avisos del parche (la "voz" del sensor) ---
    st.alertClock -= dt;
    if (st.alertClock <= 0 && !blind) {
      if (st.est.hyd < 38) { toast('El parche dice: toma agua', `estima ${Math.round(st.est.hyd)}% ±17`, 'sensor', 2000); SFX.ping(); st.alertClock = 11; }
      else if (st.est.en < 36) { toast('El parche dice: come algo', `estima ${Math.round(st.est.en)}% ±8`, 'sensor', 2000); SFX.ping(); st.alertClock = 11; }
      else if (st.est.fat > 70) { toast('El parche dice: baja el ritmo', `estima fatiga ${Math.round(st.est.fat)}% ±22`, 'sensor', 2000); SFX.ping(); st.alertClock = 11; }
    }
    // --- señales del cuerpo: primera vez ---
    if (!st.cueShown && (st.hyd < 45 || st.en < 45 || st.fat > 58)) {
      st.cueShown = true;
      toast('Tu cuerpo también avisa', 'mira las burbujas sobre el ciclista', 'body', 2600);
    }
    // latido cuando la fatiga es alta
    if (st.fat > 78 && !reduceMotion) { st.beatClock -= dt; if (st.beatClock <= 0) { st.beatClock = 0.75; SFX.beat(); } }

    // --- consejos iniciales ---
    if (st.tips === 0 && st.raceT > 0.4) { st.tips = 1; toast('Cambia de carril', 'con las flechas o deslizando el dedo', 'info', 2400); }
    if (st.tips === 1 && st.raceT > 6) { st.tips = 2; toast('Recoge solo lo que te falta', 'si tomas de más, te pesa', 'info', 2400); }
    if (st.tips === 2 && st.raceT > 13) { st.tips = 3; toast('Abajo: lo que estima tu parche', 'la franja punteada es su margen de error', 'info', 2800); }
    if (st.tips === 3 && st.raceT > 20) { st.tips = 4; toast('Marca en la zona amarilla', 'ya estás lleno: no recojas más de eso', 'info', 2800); }

    collide();
    events();

    // guanacos que cruzan
    const pz = st.z + PLAYER_DZ;
    for (let n = 0; n < 60; n++) {
      const s = segs[Math.floor(pz / SEG) + n]; if (!s) break;
      for (const o of s.objs) if (o.k === 'guanaco' && !o.done) { o.off += o.dir * dt * 0.42; if (Math.abs(o.off) > LANE * 1.8) o.dir *= -1; o.t += dt; }
    }

    if (st.z + PLAYER_DZ >= FINISH_SEG * SEG) finish(false);
    else if (st.raceT >= CAP) finish(true);
  }

  function scroll(dt) {
    const seg = segAt(st.z + PLAYER_DZ);
    const dSeg = st.speed * dt / SEG;
    st.mtn += seg.curve * dSeg * 0.00035;
    st.hills += seg.curve * dSeg * 0.0011;
  }

  function collide() {
    const pz = st.z + PLAYER_DZ;
    const base = Math.floor(pz / SEG);
    for (let n = -1; n <= 1; n++) {
      const s = segs[base + n]; if (!s) continue;
      for (const o of s.objs) {
        if (o.done || Math.abs(o.z - pz) > SEG * 0.55) continue;
        if (Math.abs(o.off - st.off) > 0.3) continue;
        o.done = true;
        if (o.k === 'hyd' || o.k === 'en' || o.k === 'fat') grab(o.k);
        else hit(o.k);
      }
    }
  }

  function grab(k) {
    const blindK = k === 'hyd' ? (st.offHyd > 0 || st.offAll > 0) : st.offAll > 0;
    const real = st[k], est = blindK ? null : st.est[k];
    const need = k === 'fat' ? real > 45 : real < 55;
    const sensorNeed = est !== null && (k === 'fat' ? est > 40 : est < 60);
    const fine = k === 'fat' ? real <= 30 : real >= 70;
    st.grabs++;
    if (sensorNeed && fine) st.misled++;
    if (blindK && need) st.blindGood++;
    st.log.push({ t: st.raceT, k, real, est });
    SFX.pickup(k);
    burst(k);
    if (k === 'fat') {
      if (st.fat - GAIN.fat < -10) { st.waste++; toast('No necesitabas viento', 'tu fatiga ya estaba baja', 'bad', 1700); }
      st.fat = clamp(st.fat - GAIN.fat, 0, 100);
    } else {
      if (st[k] + GAIN[k] > 112) {
        st.waste++; st.heavy = 2.6; SFX.over();
        toast(k === 'hyd' ? 'Tomaste de más' : 'Comiste de más', 'te pesa el estómago: vas más lento', 'bad', 1900);
      }
      st[k] = clamp(st[k] + GAIN[k], 0, 100);
    }
  }

  function hit(k) {
    st.speed *= 0.38; st.stun = 0.6; st.fat = clamp(st.fat + 5, 0, 100);
    st.shake = reduceMotion ? 0 : 0.35;
    SFX.hit();
    toast(k === 'rock' ? '¡Piedra!' : k === 'hole' ? '¡Bache!' : '¡Guanaco!', '', 'bad', 900);
  }

  function events() {
    const pz = st.z + PLAYER_DZ;
    if (!st.events.riverWarn && pz >= (RIVER_SEG - 50) * SEG) {
      st.events.riverWarn = true;
      toast('Se viene un estero', 'lo vas a cruzar por el agua', 'info', 2600);
    }
    if (!st.events.splashed && pz >= (RIVER_SEG - 6) * SEG) { st.events.splashed = true; SFX.splash(); splash(); }
    if (!st.events.river && pz >= (RIVER_SEG + 13) * SEG) {
      st.events.river = true;
      showEvent({
        title: 'El parche se mojó',
        body: 'Cruzaste el estero y el agua mojó el parche. Estos parches no son resistentes al agua: por unos segundos tu sensor de hidratación no podrá medir nada.',
        q: '¿Qué te dice tu cuerpo?',
        color: 'card-teal',
        after: () => { st.riverT = st.raceT; st.offHyd = 17; st.errT.hyd = 22; st.err.hyd = 22; st.errClock.hyd = 32; },
      });
    }
    if (!st.events.app && pz >= APP_SEG * SEG) {
      st.events.app = true;
      SFX.alarm();
      showEvent({
        title: 'Se cayó la app',
        body: 'Sin conexión: no llegan datos de ningún sensor. En un estudio real (East Carolina University, 2026) solo se recuperaron los datos de Nix de 24 de 30 personas, por fallas de la app en Android.',
        q: 'Ahora decides tú.',
        color: 'card-oxblood',
        after: () => { st.appT = st.raceT; st.offAll = 15; },
      });
    }
  }

  // ---------------- Partículas ----------------
  function burst(k) {
    const c = k === 'hyd' ? '#7fd3e0' : k === 'en' ? COL.mustard : COL.bone;
    for (let i = 0; i < 14; i++) particles.push({ x: 0, y: -3.5, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 2, life: 0.6, max: 0.6, c, r: 0.18 + Math.random() * 0.12, rel: true });
  }
  function splash() {
    for (let i = 0; i < 40; i++) particles.push({ x: (Math.random() - 0.5) * 2, y: -0.3, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, life: 0.9, max: 0.9, c: '#bfeef0', r: 0.15 + Math.random() * 0.18, rel: true });
  }

  // ---------------- Render ----------------
  function project(p, x, y, z, camX, camY) {
    const s = CAM_DEPTH / z;
    p.s = s;
    p.x = W / 2 + s * (x - camX) * U;
    p.y = HZ - s * (y - camY) * U;
    p.w = s * ROAD * U;
  }

  const fogCache = new Map();
  function fogged(hex, amt) {
    const key = hex + ((amt * 16) | 0);
    let v = fogCache.get(key);
    if (!v) {
      const a = (amt * 16 | 0) / 16 * 0.7;
      const n = parseInt(hex.slice(1), 16), fr = 0xd9, fg = 0xb4, fb = 0x8c;
      const r = Math.round(lerp(n >> 16, fr, a)), g = Math.round(lerp((n >> 8) & 255, fg, a)), b = Math.round(lerp(n & 255, fb, a));
      v = `rgb(${r},${g},${b})`; fogCache.set(key, v);
    }
    return v;
  }

  function render(dt) {
    const pz = st.z + PLAYER_DZ;
    const pSeg = segAt(pz);
    const pPct = (pz % SEG) / SEG;
    const groundY = lerp(pSeg.y1, pSeg.y2, pPct);
    const camY = groundY + CAM_H;
    const camX = st.off * ROAD * 0.55;
    const camZ = st.z;

    let shx = 0, shy = 0;
    if (st.shake > 0) { st.shake -= dt; shx = (Math.random() - 0.5) * 10 * st.shake; shy = (Math.random() - 0.5) * 10 * st.shake; }
    ctx.save();
    ctx.translate(shx, shy);

    // cielo y montañas
    ctx.drawImage(skyC, 0, 0, W, HZ + 40);
    const MW = W * 2;
    let mx = -(((st.mtn + 0.3) % 1 + 1) % 1) * MW;
    const mh = HZ * 0.95;
    for (let k = 0; k < 2; k++) ctx.drawImage(mtnC, mx + k * MW, HZ - mh + 2, MW, mh + 4);
    // pampa y lomas
    ctx.fillStyle = '#c99b45'; ctx.fillRect(0, HZ, W, H - HZ);
    let hx = -((st.hills % 1 + 1) % 1) * MW;
    const hh = H * 0.16;
    for (let k = 0; k < 2; k++) ctx.drawImage(hillC, hx + k * MW, HZ - hh * 0.3, MW, hh);

    // camino
    const baseI = Math.floor(camZ / SEG);
    const basePct = (camZ % SEG) / SEG;
    let x = 0, dx = -((segs[baseI] ? segs[baseI].curve : 0) * basePct);
    let maxY = H;
    const lwBase = Math.max(1.2, RW / 160);
    for (let n = 0; n < DRAW; n++) {
      const s = segs[baseI + n]; if (!s) break;
      const z1 = s.i * SEG - camZ, z2 = z1 + SEG;
      project(s.p1, x, s.y1, Math.max(z1, 1), camX, camY);
      project(s.p2, x + dx, s.y2, Math.max(z2, 1), camX, camY);
      x += dx; dx += s.curve;
      s.clip = maxY; s.frame = frameId;
      if (z1 <= 1 || s.p2.y >= s.p1.y || s.p2.y >= maxY) continue;
      drawSeg(s, n / DRAW, lwBase);
      maxY = s.p2.y;
    }

    // sprites de atrás hacia adelante; el ciclista en su tramo
    const playerN = Math.floor(pz / SEG) - baseI;
    const showObjs = st.mode !== 'title' && st.mode !== 'intro';
    for (let n = DRAW - 1; n >= 0; n--) {
      const s = segs[baseI + n]; if (!s || s.frame !== frameId) continue;
      for (const d of s.decor) drawSprite(s, d, d.off, s.i * SEG + SEG * 0.5, camZ);
      if (showObjs) for (const o of s.objs) if (!o.done) drawSprite(s, o, o.off, o.z, camZ);
      if (n === playerN) drawPlayer(s, pz, dt);
    }

    // efectos del cuerpo sobre la pantalla
    bodyFX();
    ctx.restore();

    // grano de película
    if (grainPat) {
      ctx.save(); ctx.globalAlpha = 0.9; ctx.translate((Math.random() * 160) | 0, (Math.random() * 160) | 0);
      ctx.fillStyle = grainPat; ctx.fillRect(-160, -160, W + 320, H + 320); ctx.restore();
    }

    // HUD y perfil
    if (st.mode === 'play' || st.mode === 'event' || st.mode === 'pause' || st.mode === 'countdown') {
      st.hudClock -= dt; if (st.hudClock <= 0) { st.hudClock = 0.12; updateHUD(); }
      st.profClock -= dt; if (st.profClock <= 0) { st.profClock = 0.2; drawProfile(); }
    }
  }

  function drawSeg(s, fog, lw) {
    const { p1, p2 } = s;
    const grass = fogged(s.band ? '#c99b45' : '#bd8f3e', fog);
    ctx.fillStyle = grass; ctx.fillRect(0, p2.y, W, p1.y - p2.y + 1);
    if (s.water) {
      // el estero cruza todo el paisaje; el vado (donde pasa el camino) es más claro y bajo
      const shimmer = (s.i + Math.floor(st.t * 5)) % 2;
      ctx.fillStyle = fogged(shimmer ? '#2f9a93' : '#2a8c86', fog); ctx.fillRect(0, p2.y, W, p1.y - p2.y + 1);
      quad(p1.x, p1.y, p1.w * 1.15, p2.x, p2.y, p2.w * 1.15, fogged(shimmer ? '#5cc9bf' : '#52bdb3', fog));
      // espuma que corre de lado: muestra la corriente
      const hgt = p1.y - p2.y;
      ctx.fillStyle = 'rgba(242,232,213,.85)';
      for (let j = 0; j < 4; j++) {
        const o = (((st.t * 0.45 + j * 0.25 + s.i * 0.17) % 1) * 5) - 2.5;
        const fx = lerp(p2.x, p1.x, 0.5) + lerp(p2.w, p1.w, 0.5) * o;
        ctx.fillRect(fx - p1.w * 0.14, p2.y + hgt * 0.35, p1.w * 0.28, Math.max(1, hgt * 0.3));
      }
      return;
    }
    if (s.bank) {
      ctx.fillStyle = fogged(s.band ? '#7b6247' : '#6f573e', fog); ctx.fillRect(0, p2.y, W, p1.y - p2.y + 1);
      quad(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, fogged('#8a6a4a', fog));
      return;
    }
    quad(p1.x, p1.y, p1.w * 1.12, p2.x, p2.y, p2.w * 1.12, fogged(s.band ? '#7a5c3c' : '#e3d2ad', fog));
    quad(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, fogged(s.band ? '#b8946a' : '#ae8a60', fog));
    // huellas de neumático entre carriles
    if (s.band) {
      const lw2 = p1.w * 0.025, lw3 = p2.w * 0.025;
      for (const o of [-LANE / 2, LANE / 2]) quad(p1.x + p1.w * o, p1.y, lw2, p2.x + p2.w * o, p2.y, lw3, fogged('#8e6d48', fog));
    }
    // borde de tinta
    if (fog < 0.85) {
      ctx.strokeStyle = COL.ink; ctx.lineWidth = Math.max(1, lw * (1 - fog));
      ctx.beginPath();
      ctx.moveTo(p1.x - p1.w * 1.12, p1.y); ctx.lineTo(p2.x - p2.w * 1.12, p2.y);
      ctx.moveTo(p1.x + p1.w * 1.12, p1.y); ctx.lineTo(p2.x + p2.w * 1.12, p2.y);
      ctx.stroke();
    }
  }

  function quad(x1, y1, w1, x2, y2, w2, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1);
    ctx.closePath(); ctx.fill();
  }

  function screenAt(s, z, off) {
    const f = clamp((z - s.i * SEG) / SEG, 0, 1);
    const p1 = s.p1, p2 = s.p2;
    const w = lerp(p1.w, p2.w, f);
    return { x: lerp(p1.x, p2.x, f) + w * off, y: lerp(p1.y, p2.y, f), w, sc: lerp(p1.s, p2.s, f) };
  }

  function drawSprite(s, o, off, z, camZ) {
    if (z - camZ < 60) return;
    const p = screenAt(s, z, off);
    if (p.w < 1.2) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(-50, -50, W + 100, s.clip + 50); ctx.clip();
    ctx.translate(p.x, p.y);
    const u = (p.w / 9.5) * spriteK; // misma escala que el ciclista
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    switch (o.k) {
      case 'hyd': case 'en': case 'fat': drawPickup(o.k, u, st.t + o.t); break;
      case 'rock': drawRock(u, false); break;
      case 'boulder': drawRock(u * (1.4 + o.v), true); break;
      case 'hole': drawHole(u); break;
      case 'guanaco': drawGuanaco(u, o.dir, o.t); break;
      case 'guanacoSide': drawGuanaco(u * 0.9, o.off > 0 ? -1 : 1, 0, true); break;
      case 'lenga': drawLenga(u * (1.6 + o.v * 1.2), o.v); break;
      case 'calafate': drawCalafate(u * (1 + o.v * 0.6)); break;
      case 'post': drawPost(u); break;
      case 'reeds': drawReeds(u * (0.9 + o.v * 0.5)); break;
      case 'coiron': drawCoiron(u * (0.7 + o.v * 0.6)); break;
      case 'stone': drawStone(u * (0.8 + o.v * 0.6)); break;
      case 'sign': drawSign(u, o.text); break;
      case 'arch': drawArch(p.w); break;
    }
    ctx.restore();
  }

  function stroke(lw) { ctx.strokeStyle = COL.ink; ctx.lineWidth = lw; ctx.stroke(); }

  function drawPickup(k, u, t) {
    const bob = Math.sin(t * 4) * u * 0.35;
    const lw = Math.max(1, u * 0.16);
    // sombra
    ctx.fillStyle = 'rgba(20,27,45,.28)';
    ctx.beginPath(); ctx.ellipse(0, 0, u * 1.2, u * 0.32, 0, 0, 7); ctx.fill();
    ctx.translate(0, -u * 2.4 + bob);
    // halo
    const halo = ctx.createRadialGradient(0, 0, u * 0.3, 0, 0, u * 2.1);
    const hc = k === 'hyd' ? '63,184,175' : k === 'en' ? '232,185,47' : '242,232,213';
    halo.addColorStop(0, `rgba(${hc},.75)`); halo.addColorStop(1, `rgba(${hc},0)`);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, u * 2.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, u * 1.45, 0, 7); ctx.fillStyle = 'rgba(242,232,213,.18)'; ctx.fill();
    ctx.setLineDash([u * 0.35, u * 0.3]); ctx.lineDashOffset = -t * u * 2; stroke(lw * 0.6); ctx.setLineDash([]);
    drawPickupIcon(k, u, lw, t);
  }

  function drawPickupIcon(k, u, lw, t) {
    if (k === 'hyd') { // caramayola
      ctx.save(); ctx.rotate(Math.sin(t * 2) * 0.12);
      rr(-u * 0.55, -u * 0.75, u * 1.1, u * 1.75, u * 0.32); ctx.fillStyle = COL.turq; ctx.fill(); stroke(lw);
      rr(-u * 0.55, -u * 0.2, u * 1.1, u * 0.42, 0); ctx.fillStyle = COL.bone; ctx.fill(); stroke(lw * 0.7);
      rr(-u * 0.3, -u * 1.1, u * 0.6, u * 0.4, u * 0.1); ctx.fillStyle = COL.bone; ctx.fill(); stroke(lw);
      ctx.beginPath(); ctx.moveTo(-u * 0.08, -u * 1.1); ctx.lineTo(-u * 0.08, -u * 1.35); ctx.lineTo(u * 0.12, -u * 1.35); stroke(lw);
      ctx.restore();
    } else if (k === 'en') { // barra de chocolate
      ctx.save(); ctx.rotate(-0.35 + Math.sin(t * 2) * 0.1);
      rr(-u * 0.95, -u * 0.48, u * 1.9, u * 0.96, u * 0.12); ctx.fillStyle = '#5b3424'; ctx.fill(); stroke(lw);
      ctx.strokeStyle = 'rgba(20,27,45,.6)'; ctx.lineWidth = lw * 0.5;
      for (let i = -1; i <= 0; i++) { ctx.beginPath(); ctx.moveTo(-u * 0.95 + u * 0.4 * (i + 2), -u * 0.48); ctx.lineTo(-u * 0.95 + u * 0.4 * (i + 2), u * 0.48); ctx.stroke(); }
      rr(-u * 0.1, -u * 0.55, u * 1.12, u * 1.1, u * 0.08); ctx.fillStyle = COL.oxblood; ctx.fill(); stroke(lw);
      ctx.fillStyle = COL.mustard; ctx.fillRect(u * 0.2, -u * 0.55, u * 0.3, u * 1.1);
      ctx.restore();
    } else { // viento a favor
      ctx.save(); ctx.rotate(t * 1.4);
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath(); ctx.arc(u * 0.3, 0, u * 0.75, -0.2, Math.PI * 0.95);
        ctx.strokeStyle = COL.ink; ctx.lineWidth = lw * 2.4; ctx.stroke();
        ctx.strokeStyle = i === 1 ? COL.turq : COL.bone; ctx.lineWidth = lw * 1.1; ctx.stroke();
      }
      ctx.restore();
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function drawRock(u, side) {
    const lw = Math.max(1, u * 0.14);
    ctx.fillStyle = 'rgba(20,27,45,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, u * 1.5, u * 0.35, 0, 0, 7); ctx.fill();
    const path = () => { ctx.beginPath(); ctx.moveTo(-u * 1.3, 0); ctx.lineTo(-u * 1.1, -u * 1.1); ctx.lineTo(-u * 0.3, -u * 1.7); ctx.lineTo(u * 0.7, -u * 1.45); ctx.lineTo(u * 1.35, -u * 0.6); ctx.lineTo(u * 1.25, 0); ctx.closePath(); };
    path(); ctx.fillStyle = side ? '#8c8a86' : '#9a968e'; ctx.fill();
    ctx.save(); path(); ctx.clip(); ctx.fillStyle = '#6b6a68'; ctx.fillRect(u * 0.1, -u * 2, u * 2, u * 2); ctx.fillStyle = dotPat; ctx.fillRect(u * 0.1, -u * 2, u * 2, u * 2); ctx.restore();
    path(); stroke(lw);
    ctx.beginPath(); ctx.moveTo(-u * 0.3, -u * 1.7); ctx.lineTo(-u * 0.1, -u * 0.7); ctx.lineTo(u * 0.5, -u * 0.4); stroke(lw * 0.6);
  }

  function drawHole(u) {
    const lw = Math.max(1, u * 0.12);
    ctx.beginPath(); ctx.ellipse(0, -u * 0.1, u * 1.5, u * 0.42, 0, 0, 7); ctx.fillStyle = '#6b4c30'; ctx.fill(); stroke(lw);
    ctx.beginPath(); ctx.ellipse(u * 0.1, -u * 0.05, u * 1.05, u * 0.24, 0, 0, 7); ctx.fillStyle = '#3a2a1d'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(u * 0.25, -u * 0.08, u * 0.5, u * 0.1, 0, 0, 7); ctx.fillStyle = 'rgba(127,211,224,.5)'; ctx.fill();
  }

  function drawGuanaco(u, dir, t, still) {
    const lw = Math.max(1, u * 0.13);
    ctx.save(); ctx.scale(dir < 0 ? -1 : 1, 1);
    ctx.fillStyle = 'rgba(20,27,45,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, u * 1.5, u * 0.3, 0, 0, 7); ctx.fill();
    const step = still ? 0 : Math.sin(t * 9) * u * 0.25;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = u * 0.32; ctx.lineCap = 'round';
    [[-0.8, step], [-0.5, -step], [0.6, -step], [0.9, step]].forEach(([lx, s]) => { ctx.beginPath(); ctx.moveTo(u * lx, -u * 1.4); ctx.lineTo(u * lx + s, 0); ctx.stroke(); });
    ctx.strokeStyle = '#c98f55'; ctx.lineWidth = u * 0.18;
    [[-0.8, step], [-0.5, -step], [0.6, -step], [0.9, step]].forEach(([lx, s]) => { ctx.beginPath(); ctx.moveTo(u * lx, -u * 1.4); ctx.lineTo(u * lx + s, -u * 0.05); ctx.stroke(); });
    // cuerpo
    ctx.beginPath(); ctx.ellipse(0, -u * 1.7, u * 1.35, u * 0.62, 0, 0, 7); ctx.fillStyle = '#c98f55'; ctx.fill(); stroke(lw);
    ctx.beginPath(); ctx.ellipse(0, -u * 1.45, u * 1.0, u * 0.32, 0, 0, Math.PI); ctx.fillStyle = '#f0e2c8'; ctx.fill();
    // cuello y cabeza
    ctx.beginPath(); ctx.moveTo(u * 0.9, -u * 1.9); ctx.quadraticCurveTo(u * 1.25, -u * 2.8, u * 1.25, -u * 3.4); ctx.lineTo(u * 1.65, -u * 3.4); ctx.quadraticCurveTo(u * 1.55, -u * 2.6, u * 1.35, -u * 1.75); ctx.closePath();
    ctx.fillStyle = '#c98f55'; ctx.fill(); stroke(lw);
    ctx.beginPath(); ctx.ellipse(u * 1.6, -u * 3.55, u * 0.45, u * 0.26, 0.2, 0, 7); ctx.fillStyle = '#8a6a55'; ctx.fill(); stroke(lw);
    ctx.beginPath(); ctx.moveTo(u * 1.3, -u * 3.75); ctx.lineTo(u * 1.25, -u * 4.15); ctx.lineTo(u * 1.45, -u * 3.8); ctx.fillStyle = '#8a6a55'; ctx.fill(); stroke(lw * 0.7);
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(u * 1.7, -u * 3.62, u * 0.07, 0, 7); ctx.fill();
    ctx.restore();
  }

  // árbol bandera: el viento patagónico dobla el tronco y empuja la copa hacia un lado
  function drawLenga(u, v) {
    const lw = Math.max(1, u * 0.12);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = u * 0.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(u * 0.6, -u * 1.6, u * 0.9, -u * 3); ctx.stroke();
    ctx.strokeStyle = '#4a3324'; ctx.lineWidth = u * 0.3; ctx.stroke();
    const autumn = v > 0.55;
    const tiers = [[0.5, 3.2, 1.9], [0.9, 2.6, 1.6], [0.4, 2.0, 1.1]];
    tiers.forEach(([ox, oy, w], i) => {
      ctx.beginPath(); ctx.ellipse(u * (ox + 0.6), -u * oy, u * w, u * 0.5, -0.15, 0, 7);
      ctx.fillStyle = autumn ? (i % 2 ? '#b4462f' : '#c9643a') : (i % 2 ? '#4f6b3a' : '#5d7a43');
      ctx.fill(); stroke(lw);
    });
    ctx.save(); ctx.beginPath(); ctx.ellipse(u * 1.5, -u * 2.6, u * 1.6, u * 0.5, -0.15, 0, 7); ctx.clip();
    ctx.fillStyle = dotPat; ctx.fillRect(u * 1.2, -u * 3.2, u * 2.2, u * 1.4); ctx.restore();
  }

  function drawCalafate(u) {
    const lw = Math.max(1, u * 0.12);
    ctx.beginPath(); ctx.ellipse(0, -u * 0.7, u * 1.3, u * 0.75, 0, Math.PI, 0); ctx.lineTo(u * 1.3, 0); ctx.lineTo(-u * 1.3, 0); ctx.closePath();
    ctx.fillStyle = '#3f5a33'; ctx.fill(); stroke(lw);
    ctx.fillStyle = '#4b2c5e';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(u * (-0.9 + i * 0.36), -u * (0.4 + (i % 2) * 0.5), u * 0.12, 0, 7); ctx.fill(); }
  }

  function drawReeds(u) {
    const sway = reduceMotion ? 0 : Math.sin(st.t * 2.4) * u * 0.15;
    for (let i = 0; i < 6; i++) {
      const x0 = (i - 2.5) * u * 0.28, h = u * (1.4 + (i % 3) * 0.45);
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + sway * 0.5, -h * 0.6, x0 + sway, -h);
      ctx.strokeStyle = COL.ink; ctx.lineWidth = Math.max(1.5, u * 0.22); ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#a9a24a' : '#7f8b3a'; ctx.lineWidth = Math.max(1, u * 0.12); ctx.stroke();
    }
  }

  // coirón: la mata de pasto dorado típica de la estepa patagónica, peinada por el viento
  function drawCoiron(u) {
    if (u < 1.5) return;
    const lw = Math.max(1, u * 0.14);
    ctx.beginPath(); ctx.ellipse(0, -u * 0.35, u * 1.1, u * 0.5, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = '#b08a3e'; ctx.fill(); stroke(lw);
    ctx.strokeStyle = '#e6c879'; ctx.lineWidth = Math.max(1, u * 0.1);
    for (let i = 0; i < 7; i++) {
      const x0 = (i - 3) * u * 0.28;
      ctx.beginPath(); ctx.moveTo(x0, -u * 0.2); ctx.quadraticCurveTo(x0 + u * 0.3, -u * 1.0, x0 + u * 0.75, -u * (1.15 + (i % 3) * 0.2)); ctx.stroke();
    }
  }

  function drawStone(u) {
    const lw = Math.max(1, u * 0.12);
    ctx.beginPath(); ctx.ellipse(0, -u * 0.25, u * 0.9, u * 0.45, 0, Math.PI, 0); ctx.lineTo(u * 0.9, 0); ctx.lineTo(-u * 0.9, 0); ctx.closePath();
    ctx.fillStyle = '#7d8790'; ctx.fill(); stroke(lw);
    ctx.beginPath(); ctx.ellipse(0, 0, u * 1.2, u * 0.22, 0, 0, 7); ctx.strokeStyle = 'rgba(242,232,213,.8)'; ctx.lineWidth = lw; ctx.stroke();
  }

  function drawPost(u) {
    const lw = Math.max(1, u * 0.1);
    rr(-u * 0.14, -u * 1.6, u * 0.28, u * 1.6, u * 0.05); ctx.fillStyle = '#7a5434'; ctx.fill(); stroke(lw);
  }

  function drawSign(u, text) {
    const lw = Math.max(1, u * 0.12);
    ctx.fillStyle = '#5a3c26';
    [-1.2, 1.2].forEach(px => { rr(u * px - u * 0.15, -u * 3.2, u * 0.3, u * 3.2, 0); ctx.fill(); stroke(lw); });
    rr(-u * 2.3, -u * 4.6, u * 4.6, u * 1.9, u * 0.2); ctx.fillStyle = '#6e4a2e'; ctx.fill(); stroke(lw);
    ctx.fillStyle = COL.mustard; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(6, u * 0.7)}px "League Gothic", sans-serif`;
    ctx.fillText(text[0], 0, -u * 4.05); ctx.fillText(text[1], 0, -u * 3.3);
  }

  function drawArch(w) {
    const u = w / 9.5, lw = Math.max(1.2, u * 0.16);
    [-1, 1].forEach(sx => { rr(sx * w * 1.08 - u * 0.35, -u * 9, u * 0.7, u * 9, u * 0.1); ctx.fillStyle = COL.ink; ctx.fill(); });
    ctx.save(); ctx.rotate(-0.025);
    rr(-w * 1.15, -u * 10.4, w * 2.3, u * 2.4, u * 0.3); ctx.fillStyle = COL.mustard; ctx.fill(); stroke(lw);
    ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(8, u * 1.9)}px "League Gothic", sans-serif`;
    ctx.fillText('MIRADOR · META', 0, -u * 9.15);
    ctx.restore();
  }

  // ---------- Ciclista ----------
  function drawPlayer(s, pz, dt) {
    const p = screenAt(s, pz, st.off);
    const u = (p.w / 9.5) * spriteK;
    ctx.save();
    ctx.translate(p.x, p.y);
    // sombra
    ctx.fillStyle = 'rgba(20,27,45,.32)';
    ctx.beginPath(); ctx.ellipse(0, 0, u * 1.8, u * 0.42, 0, 0, 7); ctx.fill();
    let lean = st.lean * 0.55;
    if (st.stun > 0) lean += Math.sin(st.t * 40) * 0.08 * st.stun;
    if (st.hyd < 28 && st.mode === 'play' && !reduceMotion) lean += Math.sin(st.t * 2.2) * 0.05;
    ctx.rotate(lean);
    const lw = Math.max(1.2, u * 0.16);
    if (st.walking) drawWalker(u, lw); else drawRider(u, lw);
    ctx.rotate(-lean);
    // cruzando el estero: el agua tapa la rueda y salpica
    if (s.water) {
      ctx.beginPath(); ctx.ellipse(0, -u * 0.25, u * 2.1, u * 0.7, 0, 0, 7);
      ctx.fillStyle = 'rgba(92,201,191,.92)'; ctx.fill();
      ctx.strokeStyle = COL.bone; ctx.lineWidth = lw * 1.2; ctx.setLineDash([u * 0.5, u * 0.3]);
      ctx.lineDashOffset = -st.t * u * 4; ctx.stroke(); ctx.setLineDash([]);
      if (Math.random() < 0.8) particles.push({ x: (Math.random() - 0.5) * 2.4, y: -0.6, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6 - 2, life: 0.5, max: 0.5, c: '#d6f5f2', r: 0.12 + Math.random() * 0.14 });
    }

    // partículas relativas al ciclista
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt; if (q.life <= 0) { particles.splice(i, 1); continue; }
      q.vy += 14 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x * u, q.y * u, q.r * u, 0, 7); ctx.fill();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = lw * 0.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // sudor que sale (lo que el parche lee)
    if (st.mode === 'play' && st.speed > VMAX * 0.4 && st.hyd > 40 && Math.random() < 0.12) {
      particles.push({ x: (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.6), y: -6.5 - Math.random(), vx: (Math.random() - 0.5) * 2.4, vy: -1.5, life: 0.5, max: 0.5, c: '#bfeef0', r: 0.11 });
    }
    // polvo
    if (st.speed > VMAX * 0.3 && !s.water && Math.random() < 0.5) {
      particles.push({ x: (Math.random() - 0.5) * 0.6, y: -0.2, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.6, life: 0.45, max: 0.45, c: 'rgba(227,210,173,.9)', r: 0.22 + Math.random() * 0.2 });
    }
    // burbujas del cuerpo
    if (st.mode !== 'title' && st.mode !== 'intro') drawCues(u, lw);
    ctx.restore();
  }

  function limb(x1, y1, x2, y2, w, c) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = COL.ink; ctx.lineWidth = w + Math.max(2, w * 0.35);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function patchLed(x, y, u, lw) {
    rr(x - u * 0.38, y - u * 0.26, u * 0.76, u * 0.52, u * 0.14); ctx.fillStyle = COL.bone; ctx.fill(); stroke(lw * 0.8);
    const off = st.offHyd > 0 || st.offAll > 0;
    const on = off ? Math.sin(st.t * 18) > 0 : Math.sin(st.t * 6) > -0.2;
    ctx.beginPath(); ctx.arc(x + u * 0.12, y, u * 0.11, 0, 7);
    ctx.fillStyle = off ? (on ? COL.danger : '#5a2a24') : (on ? COL.turq : '#1e4f50'); ctx.fill();
  }

  function drawRider(u, lw) {
    const ph = st.pedal;
    const tired = st.fat > 58 && st.mode === 'play';
    const shake = tired && !reduceMotion ? Math.sin(st.t * 30) * u * 0.05 : 0;
    // rueda trasera
    rr(-u * 0.3, -u * 2.9, u * 0.6, u * 2.9, u * 0.3); ctx.fillStyle = '#20232b'; ctx.fill(); stroke(lw);
    ctx.fillStyle = COL.danger; ctx.fillRect(-u * 0.16, -u * 2.35, u * 0.32, u * 0.22);
    // manubrio (detrás del torso)
    limb(-u * 2.05, -u * 5.15, u * 2.05, -u * 5.15, u * 0.22, '#2a2f3a');
    // tija y sillín
    limb(0, -u * 2.9, 0, -u * 3.95, u * 0.24, '#2a2f3a');
    // piernas
    [-1, 1].forEach(side => {
      const fy = -u * 1.55 + Math.sin(ph + (side > 0 ? Math.PI : 0)) * u * 0.62;
      const hipX = side * u * 0.5, hipY = -u * 4.25;
      const footX = side * u * 0.66;
      const kneeX = side * u * 0.78 + shake, kneeY = lerp(hipY, fy, 0.48) - u * 0.1;
      limb(kneeX, kneeY, footX, fy, u * 0.46, COL.skin);
      limb(hipX, hipY, kneeX, kneeY, u * 0.68, '#1c2338');
      ctx.beginPath(); ctx.ellipse(footX, fy + u * 0.1, u * 0.34, u * 0.2, 0, 0, 7); ctx.fillStyle = COL.mustard; ctx.fill(); stroke(lw * 0.8);
    });
    ctx.beginPath(); ctx.ellipse(0, -u * 4.05, u * 0.6, u * 0.24, 0, 0, 7); ctx.fillStyle = '#20232b'; ctx.fill(); stroke(lw);
    // brazos
    const breath = tired && !reduceMotion ? Math.sin(st.t * 9) * u * 0.08 : 0;
    [-1, 1].forEach(side => {
      const sx = side * u * 1.12, sy = -u * 6.65 + breath;
      const ex = side * u * 1.78, ey = -u * 5.95;
      const gx = side * u * 1.95, gy = -u * 5.2;
      limb(ex, ey, gx, gy, u * 0.4, COL.skin);
      limb(sx, sy, ex, ey, u * 0.58, COL.oxblood);
    });
    // torso
    const torso = () => { ctx.beginPath(); ctx.moveTo(-u * 0.78, -u * 4.15); ctx.lineTo(u * 0.78, -u * 4.15); ctx.lineTo(u * 1.25, -u * 6.55 + breath); ctx.quadraticCurveTo(0, -u * 7.25 + breath, -u * 1.25, -u * 6.55 + breath); ctx.closePath(); };
    torso(); ctx.fillStyle = COL.oxblood; ctx.fill();
    ctx.save(); torso(); ctx.clip();
    ctx.fillStyle = COL.mustard; ctx.fillRect(-u * 2, -u * 5.95 + breath, u * 4, u * 0.36);
    ctx.fillStyle = COL.ink; ctx.fillRect(-u * 2, -u * 5.59 + breath, u * 4, u * 0.1);
    ctx.fillStyle = dotPat; ctx.fillRect(u * 0.2, -u * 7.5, u * 1.5, u * 3.5);
    ctx.restore();
    torso(); stroke(lw);
    // dorsal
    ctx.beginPath(); ctx.arc(0, -u * 4.95, u * 0.5, 0, 7); ctx.fillStyle = COL.bone; ctx.fill(); stroke(lw * 0.8);
    ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(6, u * 0.62)}px "League Gothic", sans-serif`; ctx.fillText('25', 0, -u * 4.92);
    // parche en el bíceps izquierdo
    patchLed(-u * 1.5, -u * 6.25 + breath, u, lw);
    // cabeza
    ctx.beginPath(); ctx.ellipse(0, -u * 7.05 + breath, u * 0.38, u * 0.3, 0, 0, 7); ctx.fillStyle = COL.skin; ctx.fill(); stroke(lw * 0.8);
    ctx.beginPath(); ctx.ellipse(0, -u * 7.65 + breath, u * 0.82, u * 0.72, 0, 0, 7); ctx.fillStyle = COL.teal; ctx.fill(); stroke(lw);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -u * 7.65 + breath, u * 0.82, u * 0.72, 0, 0, 7); ctx.clip();
    ctx.fillStyle = COL.mustard; ctx.fillRect(-u * 0.14, -u * 8.5, u * 0.28, u * 1.6);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = lw * 0.7;
    [-0.45, 0.45].forEach(vx => { ctx.beginPath(); ctx.moveTo(u * vx, -u * 8.2 + breath); ctx.lineTo(u * vx * 0.8, -u * 7.3 + breath); ctx.stroke(); });
    ctx.restore();
    // vaho de cansancio
    if (tired && Math.sin(st.t * 4.5) > 0.6 && Math.random() < 0.3) particles.push({ x: (Math.random() - 0.5) * 0.5, y: -7.6, vx: (Math.random() - 0.5) * 1.5, vy: -2, life: 0.5, max: 0.5, c: 'rgba(255,255,255,.85)', r: 0.25 });
  }

  function drawWalker(u, lw) {
    const ph = st.pedal;
    const bob = Math.abs(Math.sin(ph)) * u * 0.12;
    // bicicleta a la derecha
    ctx.save(); ctx.translate(u * 1.2, 0);
    rr(-u * 0.3, -u * 2.9, u * 0.6, u * 2.9, u * 0.3); ctx.fillStyle = '#20232b'; ctx.fill(); stroke(lw);
    ctx.fillStyle = COL.danger; ctx.fillRect(-u * 0.16, -u * 2.35, u * 0.32, u * 0.22);
    limb(0, -u * 2.9, 0, -u * 3.9, u * 0.24, '#2a2f3a');
    ctx.beginPath(); ctx.ellipse(0, -u * 4.0, u * 0.6, u * 0.24, 0, 0, 7); ctx.fillStyle = '#20232b'; ctx.fill(); stroke(lw);
    limb(-u * 1.7, -u * 4.6, u * 1.7, -u * 4.6, u * 0.2, '#2a2f3a');
    ctx.restore();
    // ciclista de pie a la izquierda
    ctx.save(); ctx.translate(-u * 0.9, -bob);
    [-1, 1].forEach(side => {
      const step = Math.sin(ph + (side > 0 ? Math.PI : 0));
      const fy = -Math.max(0, step) * u * 0.4;
      limb(side * u * 0.38, -u * 2.0, side * u * 0.4, fy - u * 0.15, u * 0.46, COL.skin);
      limb(side * u * 0.38, -u * 3.7, side * u * 0.4, -u * 2.0, u * 0.66, '#1c2338');
      ctx.beginPath(); ctx.ellipse(side * u * 0.4, fy, u * 0.32, u * 0.2, 0, 0, 7); ctx.fillStyle = COL.mustard; ctx.fill(); stroke(lw * 0.8);
    });
    limb(u * 1.0, -u * 6.1, u * 2.0, -u * 4.4, u * 0.42, COL.skin);
    limb(-u * 1.0, -u * 6.1, -u * 1.2, -u * 4.3, u * 0.42, COL.skin);
    const torso = () => { ctx.beginPath(); ctx.moveTo(-u * 0.75, -u * 3.6); ctx.lineTo(u * 0.75, -u * 3.6); ctx.lineTo(u * 1.1, -u * 6.3); ctx.quadraticCurveTo(0, -u * 6.8, -u * 1.1, -u * 6.3); ctx.closePath(); };
    torso(); ctx.fillStyle = COL.oxblood; ctx.fill();
    ctx.save(); torso(); ctx.clip(); ctx.fillStyle = COL.mustard; ctx.fillRect(-u * 2, -u * 5.6, u * 4, u * 0.34); ctx.restore();
    torso(); stroke(lw);
    patchLed(-u * 1.05, -u * 5.7, u, lw);
    ctx.beginPath(); ctx.ellipse(0, -u * 7.15, u * 0.8, u * 0.72, 0.15, 0, 7); ctx.fillStyle = COL.teal; ctx.fill(); stroke(lw);
    ctx.restore();
  }

  function drawCues(u, lw) {
    const cues = [];
    if (st.hyd < 45) cues.push({ k: 'hyd', txt: st.hyd < 28 ? '¡MUCHA SED!' : 'SED', sev: st.hyd < 28 });
    if (st.en < 45) cues.push({ k: 'en', txt: st.en < 28 ? '¡SIN FUERZA!' : 'HAMBRE', sev: st.en < 28 });
    if (st.fat > 58) cues.push({ k: 'fat', txt: st.fat > 78 ? '¡PIERNAS DURAS!' : 'CANSANCIO', sev: st.fat > 78 });
    cues.sort((a, b) => b.sev - a.sev);
    const fs = Math.max(11, u * 0.95);
    ctx.font = `${fs}px "League Gothic", sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let y = -u * 9.4;
    const wob = reduceMotion ? 0 : Math.sin(st.t * 5) * u * 0.08;
    cues.slice(0, 3).forEach((c, i) => {
      const tw = ctx.measureText(c.txt).width;
      const bw = tw + fs * 1.6, bh = fs * 1.35;
      const bx = -bw / 2 + (i % 2 ? u * 0.6 : -u * 0.6), by = y - bh + wob;
      rr(bx, by, bw, bh, bh / 2); ctx.fillStyle = c.sev ? COL.danger : COL.bone; ctx.fill(); stroke(lw);
      if (i === 0) { ctx.beginPath(); ctx.moveTo(bx + bw * 0.42, by + bh - lw / 2); ctx.lineTo(bx + bw * 0.5, by + bh + u * 0.5); ctx.lineTo(bx + bw * 0.58, by + bh - lw / 2); ctx.fillStyle = c.sev ? COL.danger : COL.bone; ctx.fill(); stroke(lw); }
      // icono
      ctx.save(); ctx.translate(bx + fs * 0.75, by + bh / 2);
      const s = fs * 0.36;
      if (c.k === 'hyd') { ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.quadraticCurveTo(s, 0, s * 0.8, s * 0.4); ctx.arc(0, s * 0.4, s * 0.8, 0, Math.PI); ctx.quadraticCurveTo(-s, 0, 0, -s * 1.2); ctx.fillStyle = '#7fd3e0'; ctx.fill(); stroke(lw * 0.6); }
      else if (c.k === 'en') { rr(-s * 0.8, -s, s * 1.6, s * 2, s * 0.2); ctx.fillStyle = '#5b3424'; ctx.fill(); stroke(lw * 0.6); }
      else { ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s * 0.2, 0); ctx.lineTo(-s * 0.4, s); ctx.lineTo(s, s); ctx.strokeStyle = COL.ink; ctx.lineWidth = lw * 0.9; ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = c.sev ? COL.bone : COL.ink;
      ctx.fillText(c.txt, bx + fs * 1.3, by + bh / 2 + fs * 0.04);
      y = by - u * 0.35;
    });
  }

  function bodyFX() {
    if (st.mode !== 'play' && st.mode !== 'event' && st.mode !== 'pause') return;
    // deshidratación: neblina cálida
    if (st.hyd < 30) { ctx.fillStyle = `rgba(233,150,70,${(30 - st.hyd) / 30 * 0.28})`; ctx.fillRect(0, 0, W, H); }
    // sin energía: oscurece los bordes
    if (st.en < 30) { ctx.globalAlpha = (30 - st.en) / 30 * 0.75; ctx.drawImage(vignetteC, 0, 0, W, H); ctx.globalAlpha = 1; }
    // fatiga: pulso rojo
    if (st.fat > 78) {
      const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(st.t * 8.4);
      ctx.save(); ctx.globalAlpha = (st.fat - 78) / 22 * 0.55 * pulse; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(163,50,42,1)'; ctx.drawImage(vignetteC, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-atop'; ctx.restore();
      ctx.save(); ctx.globalAlpha = (st.fat - 78) / 22 * 0.22 * pulse; ctx.fillStyle = COL.oxblood; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  // ---------------- HUD ----------------
  // dónde empieza el exceso: con la marca ahí, recoger te sobra (mismas reglas que grab())
  const FULL_AT = { hyd: 112 - GAIN.hyd, en: 112 - GAIN.en, fat: GAIN.fat - 10 };
  const TIPS = {
    hyd: { alert: 'Te falta agua', full: 'Lleno: no tomes' },
    en: { alert: 'Falta energía', full: 'Lleno: no comas' },
    fat: { alert: 'Busca viento', full: 'Descansado' },
  };
  const gaugeEls = {};
  $$('.gauge').forEach(g => {
    const k = g.dataset.k;
    gaugeEls[k] = { root: g, band: $('.g-band', g), tick: $('.g-tick', g), val: $('.g-val b', g), tip: $('.g-tip', g), state: '' };
    g.style.setProperty('--full', FULL_AT[k] + '%');
  });
  function updateHUD() {
    const blindAll = st.offAll > 0;
    for (const k of ['hyd', 'en', 'fat']) {
      const el = gaugeEls[k];
      const off = blindAll || (k === 'hyd' && st.offHyd > 0);
      el.root.classList.toggle('off', off);
      if (off) { el.val.textContent = '--'; el.root.classList.remove('alert', 'full'); continue; }
      const e = st.est[k];
      const lo = clamp(e - ERR[k], 0, 100), hi = clamp(e + ERR[k], 0, 100);
      el.root.style.setProperty('--lo', lo.toFixed(1) + '%');
      el.root.style.setProperty('--hi', hi.toFixed(1) + '%');
      el.root.style.setProperty('--x', e.toFixed(1));
      el.val.textContent = '≈' + Math.round(e);
      const alert = k === 'fat' ? e > 70 : e < 30;
      const full = k === 'fat' ? e < FULL_AT.fat : e > FULL_AT[k];
      el.root.classList.toggle('alert', alert);
      el.root.classList.toggle('full', full);
      const state = full ? 'full' : alert ? 'alert' : '';
      if (state !== el.state) { el.state = state; el.tip.textContent = state ? TIPS[k][state] : ''; }
    }
    $('#led').classList.toggle('off', blindAll || st.offHyd > 0);
    $('#hudState').textContent = blindAll ? 'app desconectada' : st.offHyd > 0 ? 'sin señal (mojado)' : 'en vivo';
    $('#clockNow').textContent = fmt(st.raceT);
    $('.clock').classList.toggle('late', st.raceT > TARGET);
  }

  const prof = $('#profile');
  const pctx = prof.getContext('2d');
  let profPts = null;
  function drawProfile() {
    const w = prof.width, h = prof.height;
    if (!profPts) {
      profPts = [];
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= FINISH_SEG; i += 20) { const y = segs[i].y1; lo = Math.min(lo, y); hi = Math.max(hi, y); profPts.push(y); }
      profPts = profPts.map(y => h - 8 - (y - lo) / (hi - lo || 1) * (h - 22));
    }
    pctx.clearRect(0, 0, w, h);
    const prog = clamp((st.z + PLAYER_DZ) / (FINISH_SEG * SEG), 0, 1);
    const path = () => { pctx.beginPath(); pctx.moveTo(0, h); profPts.forEach((y, i) => pctx.lineTo(i / (profPts.length - 1) * w, y)); pctx.lineTo(w, h); pctx.closePath(); };
    path(); pctx.fillStyle = '#6f7d8c'; pctx.fill();
    pctx.save(); path(); pctx.clip(); pctx.fillStyle = COL.mustard; pctx.fillRect(0, 0, w * prog, h); pctx.restore();
    path(); pctx.strokeStyle = COL.bone; pctx.lineWidth = 2.5; pctx.stroke();
    // marcas de eventos
    [[RIVER_SEG, '#7fd3e0'], [APP_SEG, COL.danger]].forEach(([sg, c]) => {
      const x = sg / FINISH_SEG * w;
      pctx.strokeStyle = c; pctx.lineWidth = 3; pctx.setLineDash([4, 3]);
      pctx.beginPath(); pctx.moveTo(x, 4); pctx.lineTo(x, h); pctx.stroke(); pctx.setLineDash([]);
    });
    const i = Math.min(profPts.length - 1, Math.round(prog * (profPts.length - 1)));
    const px = prog * w, py = profPts[i];
    pctx.beginPath(); pctx.arc(px, py - 2, 7, 0, 7); pctx.fillStyle = COL.oxblood; pctx.fill(); pctx.strokeStyle = COL.bone; pctx.lineWidth = 3; pctx.stroke();
  }

  // ---------------- Toasts ----------------
  const toastEl = $('#toast');
  let toastTimer = 0, toastQueue = [], toastBusy = false;
  function toast(title, small, kind = 'info', ms = 2000) {
    if (kind === 'count') { showToast(title, small, kind, ms); return; }
    toastQueue.push([title, small, kind, ms]);
    if (toastQueue.length > 3) toastQueue.shift();
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const n = toastQueue.shift();
    if (!n) { toastBusy = false; return; }
    toastBusy = true;
    showToast(...n);
  }
  function showToast(title, small, kind, ms) {
    clearTimeout(toastTimer);
    const cls = kind === 'bad' ? 'bad' : kind === 'good' || kind === 'sensor' ? 'good' : '';
    toastEl.innerHTML = '';
    const d = document.createElement('div');
    d.className = 't ' + cls;
    d.textContent = title;
    if (kind === 'count') { d.style.fontSize = 'clamp(3rem, 12vw, 6rem)'; d.style.padding = '6px 28px 2px'; }
    if (small) { const sm = document.createElement('small'); sm.textContent = small; d.appendChild(sm); }
    toastEl.appendChild(d);
    toastTimer = setTimeout(() => {
      d.classList.add('out');
      toastTimer = setTimeout(() => { toastEl.innerHTML = ''; if (kind !== 'count') nextToast(); }, 280);
    }, ms);
  }
  function clearToasts() { toastQueue = []; toastBusy = false; clearTimeout(toastTimer); toastEl.innerHTML = ''; }

  // ---------------- Pantallas ----------------
  const screens = $$('.screen');
  let eventAfter = null;
  function show(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    const scr = id && $('#' + id);
    if (scr) {
      const btn = scr.querySelector('.btn-ink, .end-actions .btn');
      if (btn) setTimeout(() => btn.focus({ preventScroll: true }), 60);
      if (scr.classList.contains('scroll')) scr.scrollTop = 0;
    }
  }
  function setPlayUI(on) {
    $('#hud').classList.toggle('hidden', !on);
    $('#topbar').classList.toggle('hidden', !on);
    $('#touchpad').classList.toggle('hidden', !on);
    resize();
  }

  function showEvent(ev) {
    st.mode = 'event';
    clearToasts();
    const card = $('#eventCard');
    card.classList.remove('card-teal', 'card-oxblood', 'card-mustard');
    card.classList.add(ev.color);
    $('#evH').textContent = ev.title;
    $('#evBody').textContent = ev.body;
    $('#evQ').textContent = ev.q;
    eventAfter = ev.after;
    updateHUD();
    show('scrEvent');
  }

  function startIntro() {
    SFX.startMusic(); SFX.setIntensity(0.6);
    st.mode = 'intro';
    show('scrIntro1');
  }
  function startRace() {
    resetRun();
    st.mode = 'countdown'; st.countdown = 2.1; st._lastCount = null;
    show(null);
    setPlayUI(true);
    profPts = null;
    updateHUD(); drawProfile();
    SFX.startMusic(); SFX.setIntensity(1);
  }
  function pause() {
    if (st.mode !== 'play') return;
    st.mode = 'pause'; show('scrPause');
  }
  function resume() {
    if (st.mode === 'pause') { st.mode = 'play'; show(null); }
    else if (st.mode === 'event') {
      show(null); st.mode = 'play';
      if (eventAfter) { eventAfter(); eventAfter = null; }
      updateHUD();
    }
  }

  const stampEl = $('#stamp');
  let stampTimer = 0;
  function finish(capped) {
    if (st.mode === 'end') return;
    st.mode = 'end'; st.finished = !capped; st.capped = capped;
    st.won = !capped && st.raceT <= TARGET;
    clearToasts();
    if (st.won) SFX.fanfare(); else SFX.over();
    SFX.setIntensity(0.5);
    setPlayUI(false);
    buildEnd();
    // cartel grande: verde si ganaste, rojo si perdiste
    const card = $('#stampCard');
    card.classList.toggle('lose', !st.won);
    $('#stampWord').textContent = st.won ? '¡Ganaste!' : 'Perdiste';
    $('#stampSub').textContent = st.won
      ? `Llegaste en ${fmt(st.raceT)} · meta 2:00`
      : capped ? 'Se cerró la ruta antes de que llegaras' : `Llegaste en ${fmt(st.raceT)} · la meta era 2:00`;
    show(null);
    stampEl.classList.remove('hidden');
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    clearTimeout(stampTimer);
    stampTimer = setTimeout(closeStamp, 2600);
  }
  function closeStamp() {
    if (stampEl.classList.contains('hidden')) return;
    clearTimeout(stampTimer);
    stampEl.classList.add('hidden');
    show('scrEnd');
    requestAnimationFrame(() => drawChart(chartK));
  }
  stampEl.addEventListener('click', closeStamp);

  function toTitle() {
    // cada partida parte desde cero, con todas las instrucciones, para el siguiente jugador
    stampEl.classList.add('hidden');
    st.mode = 'title';
    st.z = 30 * SEG; st.lane = 0;
    particles = [];
    show('scrTitle');
  }

  // ---------------- Final ----------------
  let chartK = 'hyd';
  function buildEnd() {
    const t = st.raceT;
    const head = $('#endHead');
    head.classList.remove('card-mustard', 'win', 'lose');
    head.classList.add(st.won ? 'win' : 'lose');
    $('#endH').textContent = st.won ? '¡Ganaste!' : 'Perdiste';
    $('#endWhy').textContent = st.won ? 'Llegaste al mirador antes de 2:00.'
      : st.capped ? 'Se cerró la ruta antes de que llegaras al mirador.' : 'Llegaste al mirador, pero después de 2:00.';
    $('#endTime').textContent = fmt(t);
    $('#endGoal').textContent = st.capped
      ? `te faltó ${Math.round((1 - (st.z + PLAYER_DZ) / (FINISH_SEG * SEG)) * 100)}% de la ruta`
      : t <= TARGET ? `meta 2:00 · te sobraron ${fmt(TARGET - t)}` : `meta 2:00 · +${fmt(t - TARGET)}`;

    // tipo de ciclista
    const sensorLed = st.blindCrit + st.trustCrit;
    const ownCrit = Math.max(0, st.crit - sensorLed);
    let type;
    if (st.crit <= 10 && st.waste <= 1 && st.misled <= 2) type = 'nav';
    else {
      const auto = st.misled * 1.5 + sensorLed / 3;
      const inst = st.waste * 1.5 + ownCrit / 4;
      type = auto >= inst ? 'auto' : 'inst';
    }
    const TYPES = {
      nav: ['Navegante', 'Usaste el dato y escuchaste a tu cuerpo. Cuando el sensor se cayó, seguiste decidiendo bien. Así, esta tecnología te da más autonomía y no dependencia.'],
      auto: ['Piloto automático', 'Hiciste lo que decía la pantalla, incluso cuando se equivocaba. Y cuando se apagó, quedaste a ciegas. El sensor estima; el que decide eres tú.'],
      inst: ['A puro instinto', 'Fuiste por intuición y dejaste pasar información útil: tomaste o comiste de más, o llegaste tarde a lo que te faltaba. El dato sirve, si sabes leer su margen de error.'],
    };
    $('#typeName').textContent = TYPES[type][0];
    $('#typeText').textContent = TYPES[type][1];
    const stats = [
      [Math.round(st.crit) + ' s', 'con el cuerpo en zona roja'],
      [Math.round(st.trustCrit) + ' s', 'de esos, con el parche diciendo que ibas bien'],
      [st.misled, st.misled === 1 ? 'vez que el parche te hizo tomar algo que no necesitabas' : 'veces que el parche te hizo tomar algo que no necesitabas'],
      [st.waste, st.waste === 1 ? 'vez que tomaste o comiste de más' : 'veces que tomaste o comiste de más'],
      [Math.round(st.blindT) + ' s', 'con el parche sin señal'],
    ];
    const dl = $('#typeStats'); dl.innerHTML = '';
    stats.forEach(([v, l]) => { const dt = document.createElement('dt'); dt.textContent = v; const dd = document.createElement('dd'); dd.textContent = l; dl.append(dt, dd); });
    chartK = 'hyd';
    $$('.tab').forEach(b => { const on = b.dataset.chart === 'hyd'; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    requestAnimationFrame(() => drawChart(chartK));
  }

  function drawChart(k) {
    const c = $('#chart');
    const cw = c.clientWidth || 720, ch = c.clientHeight || 300;
    c.width = Math.round(cw * DPR); c.height = Math.round(ch * DPR);
    const x = c.getContext('2d');
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
    x.clearRect(0, 0, cw, ch);
    const narrow = cw < 460;
    const pad = { l: 40, r: narrow ? 10 : 78, t: 22, b: 26 };
    const T = Math.max(st.raceT, 1);
    const X = t => pad.l + (t / T) * (cw - pad.l - pad.r);
    const Y = v => pad.t + (1 - v / 100) * (ch - pad.t - pad.b);
    const key = { hyd: ['hyd', 'eh'], en: ['en', 'ee'], fat: ['fat', 'ef'] }[k];
    const H_ = st.hist;
    const PW = cw - pad.l - pad.r;
    // zonas: roja (te falta) y amarilla (te sobra), las mismas que en las barras del HUD
    const red = k === 'fat' ? [70, 100] : [0, 30];
    const yel = k === 'fat' ? [0, FULL_AT.fat] : [FULL_AT[k], 100];
    x.fillStyle = 'rgba(226,85,63,.16)'; x.fillRect(pad.l, Y(red[1]), PW, Y(red[0]) - Y(red[1]));
    x.fillStyle = 'rgba(232,185,47,.22)'; x.fillRect(pad.l, Y(yel[1]), PW, Y(yel[0]) - Y(yel[1]));
    x.strokeStyle = 'rgba(163,50,42,.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(pad.l, Y(k === 'fat' ? 70 : 30)); x.lineTo(pad.l + PW, Y(k === 'fat' ? 70 : 30)); x.stroke();
    x.strokeStyle = 'rgba(201,151,26,.8)'; x.beginPath(); x.moveTo(pad.l, Y(k === 'fat' ? yel[1] : yel[0])); x.lineTo(pad.l + PW, Y(k === 'fat' ? yel[1] : yel[0])); x.stroke();
    // grilla
    x.strokeStyle = 'rgba(20,27,45,.12)'; x.lineWidth = 1;
    x.font = '12px "Courier Prime", monospace'; x.fillStyle = COL.ink; x.textAlign = 'right'; x.textBaseline = 'middle';
    [0, 25, 50, 75, 100].forEach(v => { x.beginPath(); x.moveTo(pad.l, Y(v)); x.lineTo(cw - pad.r, Y(v)); x.stroke(); x.fillText(v + '%', pad.l - 5, Y(v)); });
    x.textAlign = 'center'; x.textBaseline = 'top';
    for (let s = 0; s <= T; s += 30) x.fillText(fmt(s), X(s), ch - pad.b + 6);
    // rótulos de zona a la derecha
    if (!narrow) {
      x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = 'bold 12px "Courier Prime", monospace';
      x.fillStyle = COL.oxblood; x.fillText('te falta', pad.l + PW + 8, Y((red[0] + red[1]) / 2));
      x.fillStyle = '#8a6a10'; x.fillText('te sobra', pad.l + PW + 8, Y((yel[0] + yel[1]) / 2));
    }
    // ventanas sin señal
    let start = null; const windows = [];
    H_.forEach((p, i) => {
      const off = p[key[1]] === null;
      if (off && start === null) start = p.t;
      if ((!off || i === H_.length - 1) && start !== null) { windows.push([start, p.t]); start = null; }
    });
    windows.forEach(([a, b]) => {
      x.save(); x.beginPath(); x.rect(X(a), pad.t, Math.max(2, X(b) - X(a)), ch - pad.t - pad.b); x.clip();
      x.fillStyle = 'rgba(20,27,45,.06)'; x.fillRect(0, 0, cw, ch);
      x.strokeStyle = 'rgba(163,50,42,.4)'; x.lineWidth = 2;
      for (let q = -ch; q < cw; q += 8) { x.beginPath(); x.moveTo(q, ch); x.lineTo(q + ch, 0); x.stroke(); }
      x.restore();
      // qué causó el apagón: el estero o la app
      const near = (t0) => t0 !== null && Math.abs(t0 - a) < 2;
      const label = near(st.riverT) ? 'estero' : near(st.appT) ? 'app caída' : 'sin señal';
      x.font = 'bold 12px "Courier Prime", monospace'; x.textAlign = 'center'; x.textBaseline = 'top';
      const lx = (X(a) + X(b)) / 2, tw = x.measureText(label).width + 10;
      x.fillStyle = COL.oxblood; x.beginPath();
      if (x.roundRect) x.roundRect(lx - tw / 2, 3, tw, 16, 4); else x.rect(lx - tw / 2, 3, tw, 16);
      x.fill(); x.fillStyle = COL.bone; x.fillText(label, lx, 5);
    });
    // banda de error del parche
    const E = ERR[k];
    let seg = [];
    const flush = () => {
      if (seg.length > 1) {
        x.beginPath();
        seg.forEach((p, i) => (i ? x.lineTo : x.moveTo).call(x, X(p.t), Y(clamp(p[key[1]] + E, 0, 100))));
        for (let i = seg.length - 1; i >= 0; i--) x.lineTo(X(seg[i].t), Y(clamp(seg[i][key[1]] - E, 0, 100)));
        x.closePath(); x.fillStyle = 'rgba(63,184,175,.22)'; x.fill();
        x.beginPath(); seg.forEach((p, i) => (i ? x.lineTo : x.moveTo).call(x, X(p.t), Y(p[key[1]])));
        x.setLineDash([7, 5]); x.strokeStyle = COL.teal; x.lineWidth = 3; x.stroke(); x.setLineDash([]);
      }
      seg = [];
    };
    H_.forEach(p => { if (p[key[1]] === null) flush(); else seg.push(p); });
    flush();
    // valor real
    x.beginPath(); H_.forEach((p, i) => (i ? x.lineTo : x.moveTo).call(x, X(p.t), Y(p[key[0]])));
    x.strokeStyle = COL.ink; x.lineWidth = 3.5; x.lineJoin = 'round'; x.stroke();
    // recogidas: punto de color si te servía, rojo con cruz si te sobró
    let wasted = 0;
    st.log.filter(l => l.k === k).forEach(l => {
      const over = k === 'fat' ? l.real - GAIN.fat < -10 : l.real + GAIN[k] > 112;
      if (over) wasted++;
      const px = X(l.t), py = Y(l.real);
      x.beginPath(); x.arc(px, py, over ? 7 : 5.5, 0, 7);
      x.fillStyle = over ? COL.danger : k === 'hyd' ? COL.turq : k === 'en' ? COL.mustard : COL.bone; x.fill();
      x.strokeStyle = COL.ink; x.lineWidth = 2; x.stroke();
      if (over) { x.strokeStyle = COL.bone; x.lineWidth = 2; x.beginPath(); x.moveTo(px - 3, py - 3); x.lineTo(px + 3, py + 3); x.moveTo(px + 3, py - 3); x.lineTo(px - 3, py + 3); x.stroke(); }
    });
    // nota
    let maxErr = 0;
    H_.forEach(p => { if (p[key[1]] !== null) maxErr = Math.max(maxErr, Math.abs(p[key[1]] - p[key[0]])); });
    const offT = windows.reduce((a, [s, e]) => a + (e - s), 0);
    const src = k === 'hyd' ? 'Tu parche de sudor' : k === 'en' ? 'Tu sensor de glucosa' : 'Tu sensor de lactato (experimental)';
    const what = k === 'hyd' ? 'agua' : k === 'en' ? 'chocolate' : 'viento';
    const extra = wasted ? ` ${wasted === 1 ? 'Una vez recogiste' : wasted + ' veces recogiste'} ${what} cuando ya estabas lleno (punto rojo).` : '';
    $('#chartNote').textContent = `${src} se equivocó hasta ${Math.round(maxErr)} puntos y estuvo ${Math.round(offT)} segundos sin señal.${extra}`;
  }

  // ---------------- Íconos de la intro ----------------
  function paintIcons() {
    const keep = ctx;
    $$('canvas.pk').forEach(c => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      c.width = 72 * d; c.height = 72 * d;
      ctx = c.getContext('2d');
      ctx.setTransform(d, 0, 0, d, 36 * d, 40 * d);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      drawPickupIcon(c.dataset.pk, 21, 3, 0.6);
    });
    ctx = keep;
  }

  // ---------------- Entrada ----------------
  function laneChange(d) {
    if (st.mode !== 'play' && st.mode !== 'countdown') return;
    const n = clamp(st.lane + d, -1, 1);
    if (n !== st.lane) { st.lane = n; SFX.lane(); }
  }
  const primaryFor = {
    scrTitle: '#btnStart', scrIntro1: '[data-next="scrIntro2"]', scrIntro2: '[data-next="scrIntro3"]', scrIntro3: '#btnGo',
    scrEvent: '#btnEvent', scrPause: '#btnResume', scrEnd: '#btnAgain',
  };
  window.addEventListener('keydown', e => {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { laneChange(-1); e.preventDefault(); return; }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { laneChange(1); e.preventDefault(); return; }
    if (k === 'Escape' || k === 'p' || k === 'P') { if (st.mode === 'play') pause(); else if (st.mode === 'pause') resume(); return; }
    if (k === 'Enter' || k === ' ') {
      if (!stampEl.classList.contains('hidden')) { e.preventDefault(); closeStamp(); return; }
      if (e.target instanceof HTMLButtonElement) return; // el botón enfocado ya lo maneja
      const active = screens.find(s => s.classList.contains('active'));
      if (active && primaryFor[active.id]) { e.preventDefault(); $(primaryFor[active.id]).click(); }
    }
  });
  // gestos
  let touchX = null, touchY = null;
  cv.addEventListener('pointerdown', e => { touchX = e.clientX; touchY = e.clientY; });
  cv.addEventListener('pointerup', e => {
    if (touchX === null) return;
    const dx = e.clientX - touchX, dy = e.clientY - touchY;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) laneChange(dx > 0 ? 1 : -1);
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && e.pointerType !== 'mouse') laneChange(e.clientX < W / 2 ? -1 : 1);
    touchX = null;
  });
  $('#padL').addEventListener('pointerdown', e => { e.preventDefault(); laneChange(-1); });
  $('#padR').addEventListener('pointerdown', e => { e.preventDefault(); laneChange(1); });

  $('#btnStart').addEventListener('click', startIntro);
  $$('[data-next]').forEach(b => b.addEventListener('click', () => show(b.dataset.next)));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => show(b.dataset.back)));
  $$('[data-skip]').forEach(b => b.addEventListener('click', () => show('scrIntro3')));
  $('#btnGo').addEventListener('click', startRace);
  $('#btnEvent').addEventListener('click', resume);
  $('#btnResume').addEventListener('click', resume);
  $('#btnRestart').addEventListener('click', () => { show(null); startRace(); });
  $('#btnAgain').addEventListener('click', toTitle);
  $('#btnPause').addEventListener('click', () => (st.mode === 'play' ? pause() : resume()));
  const muteBtn = $('#btnMute');
  const syncMute = () => { muteBtn.classList.toggle('muted', SFX.muted); muteBtn.setAttribute('aria-label', SFX.muted ? 'Activar sonido' : 'Silenciar sonido'); };
  muteBtn.addEventListener('click', () => { SFX.init(); SFX.toggleMute(); syncMute(); });
  syncMute();
  $$('.tab').forEach(b => b.addEventListener('click', () => {
    chartK = b.dataset.chart;
    $$('.tab').forEach(o => { const on = o === b; o.classList.toggle('active', on); o.setAttribute('aria-selected', on); });
    drawChart(chartK);
  }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('resize', () => { resize(); if (st.mode === 'end') drawChart(chartK); });

  // ---------------- Arranque ----------------
  buildTrack();
  buildObjects();
  resize();
  st.z = 30 * SEG;
  paintIcons();
  // la primera vez la intro no se salta: ahí se explica la tecnología y el caso Nix
  $$('[data-skip]').forEach(b => b.classList.add('hidden'));
  // Modo de prueba: ?debug expone el estado para avanzar cuadros a mano
  if (/[?&]debug/.test(location.search)) {
    window.__subida = {
      st, segs, LANE, SEG, PLAYER_DZ, FINISH_SEG,
      tick(n = 1, dt = 1 / 60, draw = true) { for (let i = 0; i < n; i++) { frameId++; update(dt); if (draw && i === n - 1) render(dt); } },
      lane: laneChange, startRace, resume, show, drawChart,
    };
  }
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildBackgrounds(); });
})();
