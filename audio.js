'use strict';
/* Música y efectos sintetizados con Web Audio: un swing de jazz corto (bajo caminante,
   platillo ride, escobillas y golpes de bronce). Sin archivos externos. */
window.SFX = (() => {
  let ctx = null, master = null, music = null, fx = null, noise = null;
  let muted = false, running = false, timer = 0, nextT = 0, step = 0, intensity = 1;
  try { muted = localStorage.getItem('subida-muted') === '1'; } catch (e) { /* sin almacenamiento */ }

  const BPM = 164;
  const BEAT = 60 / BPM;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  // ii-V-I-VI en Re menor / Do mayor, un compás por acorde
  const BASS = [
    [38, 41, 45, 42], // Dm7  → aproximación a G
    [31, 35, 38, 37], // G7   → aproximación a C
    [36, 40, 43, 34], // Cmaj7 → aproximación a A
    [33, 37, 40, 39], // A7   → aproximación a D
  ];
  const STABS = [
    [62, 65, 69, 72], // Dm7 (voicing medio)
    [59, 65, 67, 71], // G7
    [64, 67, 71, 74], // Cmaj7
    [61, 67, 69, 73], // A7
  ];

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.3; music.connect(master);
    fx = ctx.createGain(); fx.gain.value = 0.55; fx.connect(master);
    const len = ctx.sampleRate * 1.5;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function env(g, t, a, peak, dcy, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + dcy);
  }

  function tone(dest, type, f, t, a, peak, dcy, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dcy);
    env(g, t, a, peak, dcy);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + dcy + 0.05);
  }

  function hiss(dest, t, dur, peak, type, freq, q = 1) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, 0.003, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  }

  function bass(m, t) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.value = midi(m); o2.frequency.value = midi(m) / 2;
    lp.type = 'lowpass'; lp.frequency.value = 700;
    env(g, t, 0.012, 0.55, BEAT * 0.9);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(music);
    o.start(t); o2.start(t); o.stop(t + BEAT); o2.stop(t + BEAT);
  }

  function stab(chord, t, peak = 0.07) {
    const lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.25);
    env(g, t, 0.015, peak, 0.22);
    lp.connect(g); g.connect(music);
    chord.forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = midi(m); o.detune.value = (i - 1.5) * 6;
      o.connect(lp); o.start(t); o.stop(t + 0.3);
    });
  }

  // Grilla de corcheas con swing: 8 pasos por compás
  function schedule() {
    while (nextT < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 8) % 4;
      const s = step % 8;
      const beat = s >> 1;
      const off = s & 1;
      if (!off) bass(BASS[bar][beat], nextT);
      // ride: 1, 2, 2&, 3, 4, 4&
      if (!off || beat === 1 || beat === 3) hiss(music, nextT, off ? 0.07 : 0.22, off ? 0.05 : 0.08, 'highpass', 7200, 0.7);
      // hi-hat de pie en 2 y 4
      if (!off && (beat === 1 || beat === 3)) hiss(music, nextT, 0.04, 0.06, 'bandpass', 9000, 2);
      // escobillas suaves
      if (off && Math.random() < 0.5) hiss(music, nextT, 0.09, 0.02 * intensity, 'bandpass', 2200, 0.8);
      // bronces: anticipación del compás impar
      if (intensity > 0.5 && bar % 2 === 1 && s === 7) stab(STABS[(bar + 1) % 4], nextT, 0.06);
      if (intensity > 0.5 && bar === 0 && s === 0 && step % 64 === 0) stab(STABS[0], nextT, 0.05);
      nextT += off ? BEAT / 3 : (BEAT * 2) / 3;
      step++;
    }
  }

  return {
    init,
    get muted() { return muted; },
    startMusic() {
      if (!init()) return;
      resume();
      if (running) return;
      running = true;
      nextT = ctx.currentTime + 0.08;
      timer = setInterval(schedule, 25);
    },
    stopMusic() { running = false; clearInterval(timer); },
    setIntensity(v) { intensity = v; if (music && ctx) music.gain.setTargetAtTime(0.12 + 0.18 * v, ctx.currentTime, 0.3); },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('subida-muted', muted ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
      return muted;
    },
    pickup(k) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      if (k === 'hyd') { tone(fx, 'sine', 659, t, 0.005, 0.3, 0.12); tone(fx, 'sine', 988, t + 0.07, 0.005, 0.25, 0.18); }
      if (k === 'en') { tone(fx, 'triangle', 523, t, 0.005, 0.3, 0.1); tone(fx, 'triangle', 784, t + 0.06, 0.005, 0.28, 0.18); }
      if (k === 'fat') { hiss(fx, t, 0.35, 0.25, 'bandpass', 900, 0.6); tone(fx, 'sine', 440, t, 0.02, 0.18, 0.3, 880); }
    },
    over() { if (!ctx || muted) return; const t = ctx.currentTime; tone(fx, 'sawtooth', 220, t, 0.01, 0.16, 0.4, 70); },
    hit() { if (!ctx || muted) return; const t = ctx.currentTime; hiss(fx, t, 0.25, 0.5, 'lowpass', 500); tone(fx, 'sine', 140, t, 0.005, 0.5, 0.25, 45); },
    lane() { if (!ctx || muted) return; hiss(fx, ctx.currentTime, 0.05, 0.08, 'highpass', 3000); },
    splash() { if (!ctx || muted) return; const t = ctx.currentTime; hiss(fx, t, 0.6, 0.35, 'bandpass', 1400, 0.5); hiss(fx, t + 0.1, 0.5, 0.2, 'highpass', 4000); },
    alarm() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) { tone(fx, 'square', 960, t + i * 0.22, 0.005, 0.09, 0.09); tone(fx, 'square', 720, t + i * 0.22 + 0.1, 0.005, 0.09, 0.09); }
    },
    ping() { if (!ctx || muted) return; tone(fx, 'sine', 1320, ctx.currentTime, 0.005, 0.12, 0.15); },
    beat() { if (!ctx || muted) return; const t = ctx.currentTime; tone(fx, 'sine', 70, t, 0.005, 0.4, 0.12, 40); tone(fx, 'sine', 66, t + 0.16, 0.005, 0.3, 0.12, 40); },
    count(final) { if (!ctx || muted) return; tone(fx, 'square', final ? 1046 : 523, ctx.currentTime, 0.005, 0.12, final ? 0.35 : 0.12); },
    fanfare() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      stab([62, 65, 69, 72], t, 0.12); stab([64, 67, 71, 74], t + 0.24, 0.12); stab([62, 66, 69, 74, 78], t + 0.48, 0.14);
    },
  };
})();
