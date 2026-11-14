/* RIFT RUMBLE — client: rendering, input, menus, netcode */
(function () {
'use strict';
const G = window.SIM, CH = G.CH, ST = G.STAGES, BT = G.BTN;
const $ = id => document.getElementById(id);
const cv = $('cv'); let g = cv.getContext('2d');
let W = 1280, H = 720, DPR = 1, tm = 0;
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth || 1280; H = window.innerHeight || 720; cv.width = W * DPR; cv.height = H * DPR; }
window.addEventListener('resize', resize); resize();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const PC = ['#ff4d5a', '#3d8bff', '#ffc531', '#3ed06b', '#ff8a3d', '#a56bff', '#35d6d0', '#ff6ec7'];
const TC = ['#ff4d5a', '#3d8bff', '#3ed06b', '#ffc531'], TN = ['Red', 'Blue', 'Green', 'Gold'];
const COS = [
  [['#d9542b', '#3a2b45', '#ffd166'], ['#2f6fd6', '#1c2340', '#7ef0ff'], ['#3fae5a', '#20351f', '#eaff7a'], ['#8d5bd6', '#2a1d45', '#ff9df0'], ['#e3e6ee', '#4a5066', '#ff7a3d'], ['#30323d', '#15161c', '#ff3b3b'], ['#e0b02c', '#4a3510', '#fff3b0'], ['#e86fa6', '#4a1f38', '#ffe0f0']],
  [['#7fe3ff', '#2a5fa8', '#fff36b'], ['#c9a2ff', '#5a2fa8', '#7effd2'], ['#ffb37a', '#a84a2a', '#ffffff'], ['#9dffb0', '#2a8a4a', '#ffe96b'], ['#ffffff', '#7a86a8', '#5ad0ff'], ['#5a6078', '#22263a', '#ff5ad0'], ['#ff9db8', '#a82a5a', '#fff36b'], ['#8ab0ff', '#2a3a8a', '#ff9d5a']],
  [['#eef2ff', '#3a4a9a', '#5ae0ff'], ['#ff6b6b', '#5a1a2a', '#ffd36b'], ['#3a3f5a', '#15182a', '#b56bff'], ['#6bd68a', '#1f4a3a', '#eaff7a'], ['#ffc531', '#6a4a10', '#ff5a5a'], ['#6ba8ff', '#1a2a6a', '#ffffff'], ['#ff9de0', '#6a2a5a', '#9dffe8'], ['#b0b6c8', '#4a3020', '#ff8a3d']],
  [['#8a8f9c', '#4f9a4a', '#ffd24a'], ['#a0785a', '#c2562a', '#7ef0ff'], ['#5a6a8a', '#7ad0e0', '#ffffff'], ['#6a5a7a', '#b56bff', '#ff9df0'], ['#3a3a44', '#c22a2a', '#ff8a3d'], ['#c8b890', '#8aa84a', '#3a8aff'], ['#4a7a6a', '#e0c84a', '#ff5a5a'], ['#d0d4e0', '#ff8ab8', '#5a5aff']],
];
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255; const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')'; }
const settings = { sound: true, tap: false, server: '' };
try { const s = JSON.parse(localStorage.getItem('rr_set') || '{}'); Object.assign(settings, s); } catch (e) { }
function saveSettings() { try { localStorage.setItem('rr_set', JSON.stringify(settings)); } catch (e) { } }

/* ================= input ================= */
const keys = {};
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
  if (e.code === 'Escape') togglePause();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const KB = {
  kb1: { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], A: ['KeyF'], B: ['KeyG'], C: ['KeyH'], J: ['Space'], S: ['ShiftLeft'], G: ['KeyR'] },
  kb2: { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], A: ['KeyK', 'Numpad1'], B: ['KeyL', 'Numpad2'], C: ['Semicolon', 'Numpad3'], J: ['ShiftRight', 'Numpad0'], S: ['KeyO', 'Numpad5'], G: ['KeyI', 'Numpad4'] },
};
const DEVN = { kb1: 'Keys WASD', kb2: 'Keys Arrows', pad0: 'Gamepad 1', pad1: 'Gamepad 2', pad2: 'Gamepad 3', pad3: 'Gamepad 4' };
const DEVS = ['kb1', 'kb2', 'pad0', 'pad1', 'pad2', 'pad3'];
function readInput(dev) {
  let x = 0, y = 0, b = 0;
  if (KB[dev]) {
    const m = KB[dev], on = a => a.some(c => keys[c]);
    x = (on(m.r) ? 1 : 0) - (on(m.l) ? 1 : 0); y = (on(m.d) ? 1 : 0) - (on(m.u) ? 1 : 0);
    if (on(m.A)) b |= BT.A; if (on(m.B)) b |= BT.B; if (on(m.C)) b |= BT.C; if (on(m.J)) b |= BT.J; if (on(m.S)) b |= BT.SH; if (on(m.G)) b |= BT.GR;
    if (settings.tap && on(m.u)) b |= BT.J;
  } else {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [], p = pads[+dev.slice(3)];
    if (p) {
      const dz = v => Math.abs(v) < 0.25 ? 0 : v, bt = i => p.buttons[i] && p.buttons[i].pressed;
      x = dz(p.axes[0] || 0); y = dz(p.axes[1] || 0);
      if (bt(14)) x = -1; if (bt(15)) x = 1; if (bt(12)) y = -1; if (bt(13)) y = 1;
      if (bt(0)) b |= BT.A; if (bt(1)) b |= BT.B; if (bt(2) || bt(3)) b |= BT.J; if (bt(4) || bt(5)) b |= BT.GR; if (bt(6) || bt(7)) b |= BT.SH;
      const rx = p.axes[2] || 0, ry = p.axes[3] || 0;
      if (Math.hypot(rx, ry) > 0.5) { b |= BT.C; x = Math.abs(rx) > 0.4 ? Math.sign(rx) : 0; y = Math.abs(ry) > 0.4 ? Math.sign(ry) : 0; }
      if (bt(9) && !readInput.st) { readInput.st = 1; togglePause(); } else if (!bt(9)) readInput.st = 0;
    }
  }
  return { x, y, b };
}

/* ================= audio ================= */
let AC = null, noiseBuf = null;
function audioInit() {
  if (AC) return; try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
window.addEventListener('pointerdown', audioInit); window.addEventListener('keydown', audioInit);
function tone(f, dur, type, vol, slide) {
  if (!AC || !settings.sound) return; try {
    const o = AC.createOscillator(), a = AC.createGain(), t = AC.currentTime; o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    a.gain.setValueAtTime(vol || 0.1, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(a); a.connect(AC.destination); o.start(t); o.stop(t + dur);
  } catch (e) { }
}
function noise(dur, vol, freq) {
  if (!AC || !settings.sound) return; try {
    const s = AC.createBufferSource(), a = AC.createGain(), fl = AC.createBiquadFilter(), t = AC.currentTime; s.buffer = noiseBuf; fl.type = 'lowpass'; fl.frequency.value = freq || 2000;
    a.gain.setValueAtTime(vol || 0.2, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(a); a.connect(AC.destination); s.start(t); s.stop(t + dur);
  } catch (e) { }
}

/* ================= effects ================= */
let parts = [], rings = [], beams = [], anns = [], paths = [], texts = [], shake = 0, flash = 0, lastHit = {}; const hist = {};
function burst(x, y, n, col, sp, life, size, grav) {
  if (parts.length > 700) return;
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = 0.3 + Math.random() * 0.7; parts.push({ x, y, vx: Math.cos(a) * sp * r, vy: Math.sin(a) * sp * r, l: life * (0.5 + Math.random() * 0.5), m: life, s: size * (0.6 + Math.random() * 0.8), c: col, g: grav || 0 }); }
}
const FXC = { fire: '#ff9a3d', elec: '#8ff4ff', slash: '#d8f0ff', rock: '#d1b98f', wind: '#ffffff', steam: '#ffffff' };
function handleEvent(e, S, quiet) {
  const snd = !quiet;
  switch (e.k) {
    case 'hit': {
      const c = FXC[e.fx] || '#ffffff';
      burst(e.x, e.y, Math.min(40, 5 + e.d * 1.3), c, 3 + e.kb * 0.06, 22, 5); rings.push({ x: e.x, y: e.y, r: 8, mr: 26 + e.kb * 0.35, l: 14, m: 14, c });
      if (e.fx === 'elec') burst(e.x, e.y, 6, '#fff36b', 6, 12, 3);
      if (e.kb > 55) shake = Math.max(shake, Math.min(24, e.kb / 8));
      if (e.kb > 115) { flash = 0.22; beams.push({ x: e.x, y: e.y, a: Math.atan2(e.ky || 0, e.kx || 1), l: 16, m: 16, c, star: 1 }); }
      if (e.tip) { rings.push({ x: e.x, y: e.y, r: 4, mr: 60, l: 10, m: 10, c: '#ffffff' }); if (snd) tone(1800, 0.12, 'triangle', 0.12, 1.5); }
      lastHit[e.id] = tm;
      if (e.cmb >= 2) { texts = texts.filter(t => t.id !== e.id); texts.push({ id: e.id, x: e.x, y: e.y - 50, t: e.cmb + ' HITS', l: 55, m: 55, c: e.cmb >= 5 ? '#ff4d5a' : e.cmb >= 3 ? '#ffc531' : '#ffffff', s: Math.min(40, 20 + e.cmb * 3) }); }
      if (snd) { noise(0.08 + Math.min(0.25, e.kb / 600), Math.min(0.5, 0.12 + e.d * 0.015), 900 + e.d * 120); if (e.kb > 80) tone(110, 0.25, 'sawtooth', 0.18, 0.4); }
      if (game && game.mode === 'training' && e.kx !== undefined && $('trPath').checked) addPath(S, e);
      if (game && game.mode === 'training') game.lastHitInfo = e;
      break;
    }
    case 'shield': rings.push({ x: e.x, y: e.y, r: 6, mr: 34, l: 10, m: 10, c: '#8fc7ff' }); if (snd) tone(300, 0.07, 'square', 0.07); break;
    case 'parry': rings.push({ x: e.x, y: e.y, r: 6, mr: 70, l: 16, m: 16, c: '#ffffff' }); burst(e.x, e.y, 14, '#bfe4ff', 7, 18, 4); flash = 0.12; if (snd) tone(1400, 0.16, 'triangle', 0.16, 2); break;
    case 'counter': rings.push({ x: e.x, y: e.y, r: 10, mr: 90, l: 18, m: 18, c: '#ffe27a' }); flash = 0.18; if (snd) tone(900, 0.2, 'sawtooth', 0.14, 2.2); break;
    case 'break': burst(e.x, e.y, 30, '#c78bff', 8, 30, 5); shake = Math.max(shake, 10); if (snd) { noise(0.3, 0.3, 3000); tone(500, 0.3, 'square', 0.12, 0.3); } break;
    case 'ko': {
      const st = ST[S.stage].blast, cx = 0, cy = -150;
      beams.push({ x: e.x, y: e.y, a: Math.atan2(cy - e.y, cx - e.x), l: 50, m: 50, c: PC[e.id % 8], ko: 1 });
      burst(e.x, e.y, 60, PC[e.id % 8], 16, 50, 9); burst(e.x, e.y, 30, '#ffffff', 22, 40, 6);
      shake = 26; flash = 0.3; anns.push({ t: e.name + ' is launched!', c: PC[e.id % 8], l: 110 });
      if (snd) { noise(0.6, 0.5, 1200); tone(700, 0.6, 'sawtooth', 0.2, 0.12); }
      break;
    }
    case 'dust': burst(e.x, e.y, e.big ? 12 : 5, 'rgba(255,255,255,.6)', e.big ? 4 : 2, 18, e.big ? 7 : 5, -0.02); break;
    case 'walljump': rings.push({ x: e.x, y: e.y, r: 6, mr: 34, l: 12, m: 12, c: '#ffffff' }); for (let i = 0; i < 7; i++) parts.push({ x: e.x, y: e.y + (Math.random() - 0.5) * 30, vx: e.d * (1 + Math.random() * 3), vy: 1 + Math.random() * 2, l: 18, m: 18, s: 5, c: 'rgba(255,255,255,.7)', g: 0.05 }); if (snd) tone(420, 0.09, 'triangle', 0.08, 1.6); break;
    case 'slide': parts.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5), vy: -1, l: 14, m: 14, s: 4, c: 'rgba(255,255,255,.55)', g: 0 }); break;
    case 'djump': rings.push({ x: e.x, y: e.y, r: 6, mr: 30, l: 12, m: 12, c: '#ffffff' }); if (snd) tone(520, 0.08, 'sine', 0.06, 1.5); break;
    case 'cast': burst(e.x, e.y, 8, FXC[e.fx] || '#fff', 3, 14, 4); if (snd) tone(e.fx === 'elec' ? 900 : 300, 0.1, 'sawtooth', 0.06, 0.6); break;
    case 'steam': for (let i = 0; i < 4; i++) parts.push({ x: e.x, y: e.y + (Math.random() - 0.5) * 20, vx: e.d * (6 + Math.random() * 7), vy: (Math.random() - 0.5) * 2, l: 22, m: 22, s: 9 + Math.random() * 8, c: 'rgba(235,245,255,.55)', g: -0.03 }); if (snd && tm % 6 === 0) noise(0.1, 0.06, 5000); break;
    case 'blink': rings.push({ x: e.x, y: e.y, r: 6, mr: 44, l: 12, m: 12, c: '#8ff4ff' }); burst(e.x, e.y, 10, '#fff36b', 5, 14, 3); if (snd) tone(1200, 0.08, 'square', 0.07, 2); break;
    case 'cloud': beams.push({ x: e.x, y: e.y, l: 40, m: 40, cloud: 1 }); break;
    case 'bolt': flash = 0.2; shake = Math.max(shake, 8); burst(e.x, e.y - 20, 20, '#fff36b', 9, 18, 4); if (snd) { noise(0.3, 0.35, 6000); tone(90, 0.3, 'sawtooth', 0.2, 0.5); } break;
    case 'quake': shake = Math.max(shake, 7); burst(e.x - 50, e.y, 8, '#b7a27c', 4, 20, 6, 0.2); burst(e.x + 50, e.y, 8, '#b7a27c', 4, 20, 6, 0.2); if (snd) tone(70, 0.2, 'sine', 0.3, 0.6); break;
    case 'boom': burst(e.x, e.y, 50, '#ff9a3d', 12, 34, 10); burst(e.x, e.y, 24, '#ffe27a', 7, 26, 7); rings.push({ x: e.x, y: e.y, r: 20, mr: 130, l: 18, m: 18, c: '#ffd9a0' }); shake = Math.max(shake, 16); flash = 0.18; if (snd) { noise(0.5, 0.5, 700); tone(80, 0.4, 'sine', 0.3, 0.4); } break;
    case 'power': rings.push({ x: e.x, y: e.y, r: 10, mr: 60, l: 20, m: 20, c: ITC[e.t] || '#fff' }); burst(e.x, e.y, 16, ITC[e.t] || '#fff', 5, 26, 5, -0.1); if (snd) { tone(660, 0.1, 'sine', 0.1); setTimeout(() => tone(990, 0.15, 'sine', 0.1), 80); } break;
    case 'spawn': burst(e.x, e.y, 10, '#ffffff', 3, 20, 4); break;
    case 'crack': burst(e.x, e.y, 16, '#b98a52', 6, 26, 6, 0.3); break;
    case 'erupt': shake = Math.max(shake, 12); if (snd) { noise(0.7, 0.35, 500); } break;
    case 'warn': if (snd) tone(220, 0.3, 'square', 0.06); break;
    case 'go': anns.push({ t: 'GO!', c: '#ffc531', l: 50, big: 1 }); if (snd) tone(880, 0.4, 'square', 0.12); break;
    case 'game': anns.push({ t: 'GAME!', c: '#ff4d5a', l: 150, big: 1 }); if (snd) { tone(440, 0.5, 'sawtooth', 0.15); setTimeout(() => tone(660, 0.7, 'sawtooth', 0.15), 200); } break;
    case 'respawn': rings.push({ x: e.x, y: e.y - 30, r: 10, mr: 70, l: 24, m: 24, c: '#ffffff' }); break;
    case 'grab': if (snd) tone(180, 0.08, 'square', 0.09); break;
    case 'pick': if (snd) tone(740, 0.06, 'sine', 0.08); break;
    case 'charged': rings.push({ x: e.x, y: e.y, r: 10, mr: 70, l: 20, m: 20, c: '#ffd24a' }); if (snd) tone(300, 0.3, 'sawtooth', 0.1, 3); break;
    case 'release': rings.push({ x: e.x, y: e.y, r: 10, mr: 50, l: 10, m: 10, c: '#ffffff' }); break;
    case 'ledge': if (snd) tone(400, 0.05, 'square', 0.05); break;
  }
}
function addPath(S, e) {
  const v = S.p[e.id]; if (!v) return; const c = CH[v.ch]; let x = e.vx, y = e.vy, kx = e.kx, ky = e.ky, vy = 0; const pts = [[x, y - c.h / 2]]; const hs = Math.floor(e.kb * 0.4);
  for (let i = 0; i < Math.max(hs, 30) + 40; i++) { const m = Math.hypot(kx, ky); if (m > 0) { const n = Math.max(0, m - 0.26) / m; kx *= n; ky *= n; } vy = Math.min(c.fall, vy + c.grav); x += kx; y += ky + vy; pts.push([x, y - c.h / 2, i === hs ? 1 : 0]); if (y > 60 && Math.abs(x) < 400) break; }
  paths.push({ pts, l: 180 }); if (paths.length > 4) paths.shift();
}
function fxTick() {
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.94; p.vy *= 0.94; p.l--; }
  parts = parts.filter(p => p.l > 0);
  for (const r of rings) r.l--; rings = rings.filter(r => r.l > 0);
  for (const b of beams) b.l--; beams = beams.filter(b => b.l > 0);
  for (const a of anns) a.l--; anns = anns.filter(a => a.l > 0);
  for (const p of paths) p.l--; paths = paths.filter(p => p.l > 0);
  for (const t of texts) { t.l--; t.y -= 0.7; } texts = texts.filter(t => t.l > 0);
  shake *= 0.86; if (shake < 0.3) shake = 0; flash *= 0.8;
}
const ITC = { heart: '#ff6b8a', boots: '#5ad0ff', gauntlet: '#ff5a3d', bubble: '#8fc7ff', bomb: '#333', boomerang: '#ffc531', blaster: '#7ef0ff', crate: '#b98a52' };

/* ================= fighter drawing ================= */
function getPose(f) {
  const c = CH[f.ch], h = c.h, w = c.w, s = f.state, t = f.t;
  const P = { lean: 0, dy: 0, sq: 1, rot: 0, al: 1, hF: [w * 0.5, h * 0.45], hB: [-w * 0.45, h * 0.42], fF: [w * 0.25, 0], fB: [-w * 0.25, 0], hd: [0, 0], tip: null, spin: 0, lb: '', act: false };
  const bob = Math.sin(tm * 0.08 + f.id * 2) * 1.6;
  const airLegs = () => { P.fF = [w * 0.28, h * 0.1]; P.fB = [-w * 0.2, h * 0.2]; };
  if (s === 'idle' || s === 'respawn' || s === 'shielddrop' || s === 'land') { P.dy = bob; P.hF[1] += bob; P.hB[1] += bob; if (s === 'land') P.sq = 0.72 + Math.min(0.28, t * 0.07); else P.sq = 1 + Math.sin(tm * 0.08 + f.id * 2) * 0.015; }
  else if (s === 'walk') {
    const ph = tm * (0.22 + Math.abs(f.vx) * 0.04), st = Math.min(c.h * 0.36, 5 + Math.abs(f.vx) * 3);
    P.fF = [Math.sin(ph) * st, Math.max(0, Math.cos(ph)) * 9]; P.fB = [-Math.sin(ph) * st, Math.max(0, -Math.cos(ph)) * 9];
    P.hF = [-Math.sin(ph) * st * 0.8 + w * 0.25, h * 0.45]; P.hB = [Math.sin(ph) * st * 0.8 - w * 0.25, h * 0.45]; P.lean = Math.min(0.42, Math.abs(f.vx) * 0.05); P.dy = Math.abs(Math.sin(ph)) * 3.5;
  }
  else if (s === 'crouch') { P.sq = 0.62; }
  else if (s === 'jumpsquat') { P.sq = 0.72; }
  else if (s === 'wall') { P.hB = [-w * 0.55, h * 0.85]; P.hF = [-w * 0.35, h * 0.55]; P.fB = [-w * 0.5, h * 0.2]; P.fF = [-w * 0.42, h * 0.02]; P.lean = 0.18; P.dy = Math.sin(tm * 0.3) * (f.vy > 1 ? 1 : 0); }
  else if (s === 'air' || s === 'helpless') { airLegs(); P.sq = f.vy < -5 ? 1.12 : f.vy > 7 ? 1.07 : 1; if (s === 'air' && f.djT > 0) { P.rot = (1 - f.djT / 16) * 6.283; P.fF = [w * 0.2, h * 0.3]; P.fB = [-w * 0.1, h * 0.32]; } const up = f.vy < 0; P.hF = [w * 0.6, h * (up ? 0.5 : 0.8)]; P.hB = [-w * 0.6, h * (up ? 0.5 : 0.8)]; if (s === 'helpless') { P.rot = Math.sin(tm * 0.3) * 0.25; P.al = 0.75 + Math.sin(tm * 0.5) * 0.15; } }
  else if (s === 'hitstun' || s === 'dizzy') {
    P.hF = [w * 0.7, h * 0.8]; P.hB = [-w * 0.7, h * 0.75]; P.fF = [w * 0.4, h * 0.1]; P.fB = [-w * 0.4, h * 0.05];
    if (s === 'hitstun' && !f.grounded) P.rot = t * 0.28 * (f.kvx >= 0 ? 1 : -1) * f.face; else P.lean = s === 'dizzy' ? Math.sin(tm * 0.15) * 0.3 : -0.3;
  }
  else if (s === 'buried') { P.hF = [w * 0.7, h * 0.9]; P.hB = [-w * 0.7, h * 0.9]; P.dy = -h * 0.45 + Math.sin(tm * 0.6) * 1.5; }
  else if (s === 'shield' || s === 'shieldstun') { P.sq = 0.9; P.hF = [w * 0.5, h * 0.6]; P.hB = [w * 0.2, h * 0.55]; }
  else if (s === 'roll') { P.lean = 0.55; P.sq = 0.86; P.al = t >= 2 && t <= 9 ? 0.7 : 1; const ph = t * 0.9; P.fF = [Math.sin(ph) * 20, Math.max(0, Math.cos(ph)) * 8]; P.fB = [-Math.sin(ph) * 20 - 6, Math.max(0, -Math.cos(ph)) * 8]; P.hF = [-w * 0.5, h * 0.5]; P.hB = [-w * 0.9, h * 0.6]; }
  else if (s === 'spot') { P.al = t >= 3 && t <= 18 ? 0.4 : 1; P.lean = -0.25; }
  else if (s === 'airdodge') { P.al = t >= 3 && t <= 26 ? 0.45 : 1; P.rot = t * 0.3; airLegs(); }
  else if (s === 'ledge') { P.hF = [w * 0.55, h * 1.0]; P.hB = [w * 0.35, h * 1.0]; P.fF = [w * 0.1, h * 0.05 + Math.sin(tm * 0.1) * 3]; P.fB = [-w * 0.15, h * 0.08]; }
  else if (s === 'climb') { P.hF = [w * 0.6, h * 0.7]; P.dy = t / 20 * h * 0.88; }
  else if (s === 'grabbing') { P.hF = [w * 0.8, h * 0.58]; P.hB = [w * 0.6, h * 0.5]; if (f.pumT > 8) P.hd = [6, 0]; }
  else if (s === 'carry') { P.hF = [w * 0.3, h * 1.05]; P.hB = [-w * 0.3, h * 1.05]; if (f.grounded && Math.abs(f.vx) > 0.3) { const ph = tm * 0.25; P.fF = [Math.sin(ph) * 12, Math.max(0, Math.cos(ph)) * 7]; P.fB = [-Math.sin(ph) * 12, Math.max(0, -Math.cos(ph)) * 7]; } }
  else if (s === 'grabbed') { const k = Math.sin(tm * 0.5) * 6; P.hF = [w * 0.6 + k, h * 0.7]; P.hB = [-w * 0.6 - k, h * 0.7]; P.fF = [w * 0.3 - k, 0]; P.fB = [-w * 0.3 + k, 0]; }
  else if (s === 'attack') {
    const m = G.mv(f), lb = m.lb || (f.ch === 2 ? 'w' : 'h'); P.lb = lb;
    if (!f.grounded) airLegs();
    const rest = lb === 'f' ? P.fF.slice() : lb === 'hd' ? [0, h * 0.8] : lb === 'w' ? [w * 1.2, h * 0.3] : [w * 0.5, h * 0.45];
    let l = null;
    if (m.th || (m.hits[0] && m.hits[0].grab)) {
      const p = m.th ? Math.min(1, f.mf / m.th.rel) : Math.sin(Math.min(1, f.mf / 12) * Math.PI);
      P.hF = [w * (0.5 + 0.5 * p), h * 0.58]; P.hB = [w * (0.3 + 0.4 * p), h * 0.5]; P.lb = '';
      if (m.th) { P.lean = f.move === 'bthrow' ? -p * 0.7 : f.move === 'dthrow' ? p * 0.6 : f.move === 'uthrow' ? -0.15 : (-0.3 + p * 0.7); if (f.move === 'uthrow') { P.hF = [w * 0.3, h * (0.8 + 0.3 * p)]; P.hB = [-w * 0.3, h * (0.8 + 0.3 * p)]; } }
    } else if (m.hits.length) {
      let idx = m.hits.length - 1; for (let i = 0; i < m.hits.length; i++) if (f.mf <= m.hits[i].e) { idx = i; break; }
      const h0 = m.hits[idx];
      if (f.mf < h0.s) {
        const pe = idx > 0 ? m.hits[idx - 1].e : 0, k = clamp((f.mf - pe) / Math.max(1, h0.s - pe), 0, 1), st = [h0.x0, h0.y0];
        if (idx === 0) { const back = [rest[0] - (st[0] - rest[0]) * 0.35, rest[1] - (st[1] - rest[1]) * 0.35]; l = k < 0.6 ? lerp2(rest, back, k / 0.6) : lerp2(back, st, (k - 0.6) / 0.4); }
        else l = lerp2([m.hits[idx - 1].x1, m.hits[idx - 1].y1], st, k);
      } else if (f.mf <= h0.e) { l = G.hitLocal(f, h0); P.act = true; }
      else { const k = Math.min(1, (f.mf - h0.e) / Math.max(1, m.t - h0.e)); l = lerp2([h0.x1, h0.y1], rest, k * k); }
      if (lb === 'w' && Math.abs(l[1]) > 200) l = rest;
      if (f.move === 'dspecial' && f.ch === 1) { l = [0, h * 1.2]; P.lb = 'h'; P.hB = [-w * 0.4, h * 1.2]; }
    } else {
      const p = Math.sin(Math.min(1, f.mf / Math.min(m.t, 40)) * Math.PI); l = [w * 0.5 + p * w * 0.7, h * 0.45 + p * h * 0.2]; P.lb = 'h';
      if (m.counter) { l = [w * 0.3, h * 0.75]; P.lb = lb; if (lb === 'w') l = [w * 0.6, h * 1.3]; }
      if (f.move === 'nspecial' && f.ch === 3) { const a = tm * 0.5; l = [-w * 0.3 + Math.cos(a) * 16, h * 0.6 + Math.sin(a) * 16]; }
      if (f.move === 'uspecial' && f.ch === 1) { P.rot = f.mf * 0.6; P.al = 0.7; }
    }
    if (l) {
      const b = P.lb;
      if (b === 'h') { P.hF = l; P.lean = clamp(l[0] / 300, -0.3, 0.3); }
      else if (b === 'f') { P.fF = l; P.lean = -clamp(l[0] / 240, -0.35, 0.35); }
      else if (b === 'hd') { P.hd = [l[0] * 0.5, (l[1] - h * 0.8) * 0.5]; P.lean = clamp(l[0] / 110, -0.6, 0.6); }
      else if (b === 'b') { P.spin = f.mf * 0.7; P.hF = [w * 0.95, h * 0.55]; P.hB = [-w * 0.95, h * 0.55]; }
      else if (b === '2h') { P.hF = l; P.hB = [l[0] - 10, l[1] + 4]; P.lean = clamp(l[0] / 300, -0.3, 0.3); }
      else if (b === 'w') { P.tip = l; const sh = [0, h * 0.62]; P.hF = [sh[0] + (l[0] - sh[0]) * 0.36, sh[1] + (l[1] - sh[1]) * 0.36]; P.lean = clamp(l[0] / 420, -0.2, 0.25); }
    }
  }
  return P;
}
function limb(a, b, wd, col, bend) {
  g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], -a[1]);
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], k = bend || 0;
  g.quadraticCurveTo(mx - dy * k, -(my + dx * k), b[0], -b[1]); g.stroke();
}
function circ(x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, -y, r, 0, 6.283); g.fill(); }
const OUT = '#1b1426';
function ik(a, b, l1, l2, dir) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 0.01, L = (l1 + l2) * 0.98;
  if (d > L) { const k = d / L; l1 *= k; l2 *= k; }
  const aa = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
  return [a[0] + dx * aa / d - dy / d * hh * dir, a[1] + dy * aa / d + dx / d * hh * dir];
}
function bone(pts, w, col) {
  g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], -pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], -pts[i][1]);
  g.strokeStyle = OUT; g.lineWidth = w + 4; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
function armB(sh, hand, l, w, col) { bone([sh, ik(sh, hand, l, l, -1), hand], w, col); }
function legB(hip, foot, l, w, col) { const a = [foot[0], foot[1] + 5]; bone([hip, ik(hip, a, l, l, 1), a], w, col); }
function blob(x, y, r, col) { g.beginPath(); g.arc(x, -y, r, 0, 6.283); g.fillStyle = col; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke(); }
function poly(pts, col, lw) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], -p[1]) : g.moveTo(p[0], -p[1])); g.closePath(); g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = lw === undefined ? 4 : lw; if (g.lineWidth) g.stroke(); g.fillStyle = col; g.fill(); }
function boot(p, len, ht, col) { g.beginPath(); g.roundRect(p[0] - len * 0.38, -p[1] - ht, len, ht, ht * 0.45); g.fillStyle = col; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke(); }
function face(cx, cy, r, f, o) {
  o = o || {}; const hurt = f.state === 'hitstun' || f.state === 'dizzy' || f.state === 'grabbed' || f.state === 'buried', atk = f.state === 'attack' || f.state === 'grabbing';
  const e1 = cx + r * 0.2, e2 = cx + r * 0.7, ey = cy + r * 0.02;
  g.lineCap = 'round';
  if (hurt) {
    g.strokeStyle = OUT; g.lineWidth = 2.2; g.beginPath();
    for (const ex of [e1, e2]) { g.moveTo(ex - r * 0.14, -ey - r * 0.14); g.lineTo(ex + r * 0.14, -ey + r * 0.14); g.moveTo(ex + r * 0.14, -ey - r * 0.14); g.lineTo(ex - r * 0.14, -ey + r * 0.14); }
    g.stroke(); g.fillStyle = OUT; g.beginPath(); g.ellipse(cx + r * 0.48, -(cy - r * 0.52), r * 0.17, r * 0.22, 0, 0, 6.283); g.fill();
  } else {
    g.fillStyle = o.eye || '#fff'; g.beginPath(); g.ellipse(e1, -ey, r * 0.19, r * 0.27, 0, 0, 6.283); g.ellipse(e2, -ey, r * 0.13, r * 0.25, 0, 0, 6.283); g.fill();
    if (!o.noPupil) { g.fillStyle = OUT; g.beginPath(); g.arc(e1 + r * 0.07, -ey, r * 0.11, 0, 6.283); g.arc(e2 + r * 0.04, -ey, r * 0.09, 0, 6.283); g.fill(); }
    g.strokeStyle = o.brow || OUT; g.lineWidth = 2.4; g.beginPath(); const k = atk ? r * 0.16 : 0;
    g.moveTo(e1 - r * 0.24, -(ey + r * 0.42 + k)); g.lineTo(e1 + r * 0.2, -(ey + r * 0.42 - k)); g.moveTo(e2 - r * 0.14, -(ey + r * 0.4 - k * 0.5)); g.lineTo(e2 + r * 0.16, -(ey + r * 0.42 + k * 0.3)); g.stroke();
    if (!o.noMouth) { g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); if (atk) { g.fillStyle = '#fff'; g.roundRect(cx + r * 0.25, -(cy - r * 0.42), r * 0.5, r * 0.22, 2); g.fill(); } else { g.moveTo(cx + r * 0.3, -(cy - r * 0.5)); g.quadraticCurveTo(cx + r * 0.5, -(cy - r * 0.62), cx + r * 0.72, -(cy - r * 0.48)); } g.stroke(); }
  }
}
const DRAW = [
  /* EMBER — forge tinker: goggles, swept-back hair, apron, big mitts, scarf */
  function (f, P, pal, c) {
    const skin = '#f0c39a', hair = shade(pal[0], -0.55), tun = pal[0], dk = pal[1], hx = P.hd[0], hy = P.hd[1], hip = 22, sh = 39, cx = 1 + hx, cy = 51 + hy, r = 13;
    armB([-5, sh], P.hB, 10, 7, shade(tun, -0.3)); blob(P.hB[0], P.hB[1], 6, shade(dk, 0.15));
    legB([-4, hip], P.fB, 10.5, 8, shade(dk, 0.2)); boot(P.fB, 17, 8, shade(dk, -0.2));
    const wv = Math.sin(tm * 0.2 + f.id) * 4, tl = 16 + Math.abs(f.vx) * 2;
    poly([[-4, sh + 5], [-12 - tl, sh + 8 + wv], [-10 - tl, sh - 2 - wv], [-4, sh - 2]], pal[2], 3);
    poly([[-9, sh + 3], [9, sh + 3], [8, hip - 2], [-8, hip - 2]], tun);
    poly([[-2, sh - 2], [9, sh - 2], [9, hip - 5], [-1, hip - 5]], dk, 2); g.fillStyle = pal[2]; g.fillRect(-9, -hip - 4, 18, 3);
    legB([4, hip], P.fF, 10.5, 8, shade(dk, 0.35)); boot(P.fF, 17, 8, dk);
    poly([[-8, sh + 6], [8, sh + 7], [9, sh + 1], [-8, sh]], pal[2], 3);
    blob(cx, cy, r, skin);
    poly([[cx + r * 0.95, cy + r * 0.4], [cx + r * 0.5, cy + r * 1.08], [cx + r * 0.1, cy + r * 1.45], [cx - r * 0.5, cy + r * 1.12], [cx - r * 1.5, cy + r * 1.05], [cx - r * 1.05, cy + r * 0.35], [cx - r * 1.55, cy - r * 0.05], [cx - r * 0.95, cy - r * 0.45], [cx - r * 0.55, cy + r * 0.25], [cx + r * 0.3, cy + r * 0.62]], hair, 3);
    g.fillStyle = OUT; g.fillRect(cx - r * 0.7, -(cy + r * 0.92), r * 1.6, r * 0.34); blob(cx + r * 0.15, cy + r * 0.76, 4.4, pal[2]); blob(cx + r * 0.72, cy + r * 0.72, 3.6, pal[2]);
    face(cx, cy - r * 0.12, r, f);
    armB([5, sh], P.hF, 10, 7, shade(tun, -0.12)); blob(P.hF[0], P.hF[1], 7.5, shade(dk, 0.3));
    if (f.state === 'attack') {
      if (P.act && G.mv(f).hits.some(h => h.fx === 'fire')) { circ(P.lb === 'f' ? P.fF[0] : P.hF[0], P.lb === 'f' ? P.fF[1] : P.hF[1], 12 + Math.sin(tm) * 2, 'rgba(255,154,61,.7)'); }
      if (f.move === 'sspecial' && f.mf >= 6 && f.mf <= 20) { const k = (f.mf - 6) / 14; g.fillStyle = 'rgba(220,235,255,.85)'; g.strokeStyle = pal[2]; g.lineWidth = 3; g.beginPath(); g.moveTo(P.hF[0], -P.hF[1]); g.arc(P.hF[0], -P.hF[1], 44, -1.2 + k * 2.2, -0.2 + k * 2.2); g.closePath(); g.fill(); g.stroke(); }
    }
  },
  /* FLICK — storm sprite: a small hooded imp with glowing eyes and a crackling hood-tip */
  function (f, P, pal, c) {
    const hx = P.hd[0], hy = P.hd[1], hip = 14, sh = 25, cx = 1 + hx, cy = 34 + hy, r = 11, lim = pal[1], hood = pal[0];
    armB([-4, sh], P.hB, 7.5, 5, shade(lim, -0.2)); blob(P.hB[0], P.hB[1], 4.5, shade(pal[2], -0.2));
    legB([-3, hip], P.fB, 7, 6, shade(lim, -0.2)); boot(P.fB, 12, 6, shade(lim, -0.4));
    const wv = Math.sin(tm * 0.25 + f.id) * 3, tl = 8 + Math.abs(f.vx) * 1.6;
    poly([[-5, sh + 2], [-8 - tl, sh - 6 + wv], [-6 - tl * 0.6, hip + 2 - wv], [-4, hip + 3]], shade(hood, -0.3), 3);
    poly([[-7, sh + 2], [7, sh + 2], [6, hip - 1], [-6, hip - 1]], hood); g.fillStyle = pal[2]; g.fillRect(-6, -hip - 4, 12, 2.5);
    legB([3, hip], P.fF, 7, 6, lim); boot(P.fF, 12, 6, shade(lim, -0.25));
    poly([[cx - r * 0.2, cy + r * 0.9], [cx - r * 1.1, cy + r * 1.75], [cx - r * 1.9, cy + r * 1.35], [cx - r * 1.0, cy + r * 0.5]], hood, 3);
    blob(cx, cy, r, hood);
    g.fillStyle = '#141a33'; g.beginPath(); g.ellipse(cx + r * 0.3, -cy + r * 0.05, r * 0.72, r * 0.68, 0, 0, 6.283); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
    g.shadowColor = pal[2]; g.shadowBlur = 8; face(cx + r * 0.12, cy - r * 0.02, r * 0.9, f, { eye: pal[2], noPupil: 1, noMouth: 1, brow: 'rgba(0,0,0,0)' }); g.shadowBlur = 0;
    g.strokeStyle = pal[2]; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx - r * 1.8, -(cy + r * 1.4)); g.lineTo(cx - r * 2.3, -(cy + r * 1.9)); g.lineTo(cx - r * 1.7, -(cy + r * 2.1)); g.lineTo(cx - r * 2.2, -(cy + r * 2.6)); g.stroke();
    blob(cx - r * 2.2, cy + r * 2.6, 2.6 + Math.sin(tm * 0.3), pal[2]);
    armB([4, sh], P.hF, 7.5, 5, lim); blob(P.hF[0], P.hF[1], 5, pal[2]);
    if (f.state === 'attack') {
      const m = G.mv(f);
      if ((P.act && m.hits.some(h => h.fx === 'elec')) || (f.move === 'sspecial' && f.mf >= 14)) zap(0, -22, 26, pal[2]);
      if (f.move === 'sspecial' && f.charge > 0) zap(0, -22, 14 + f.charge * 0.25, pal[2]);
      if (f.move === 'dspecial' && f.mf >= 10 && f.mf <= 34) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.shadowColor = pal[2]; g.shadowBlur = 20; g.beginPath(); let y = -430; g.moveTo(0, y); const end = f.mf >= 26 ? -20 : -430 + (f.mf - 10) / 16 * 390; while (y < end) { y += 40; g.lineTo((Math.random() - 0.5) * 34, Math.min(y, end)); } g.stroke(); g.shadowBlur = 0; if (f.mf >= 26) zap(0, -24, 62, pal[2]); }
    }
  },
  /* ASTRA — star knight: visored helm with crest, plate armour, plasma blade */
  function (f, P, pal, c) {
    const hx = P.hd[0], hy = P.hd[1], hip = 28, sh = 47, cx = 1 + hx, cy = 58 + hy, r = 12.5, arm = pal[0], suit = pal[1];
    armB([-6, sh], P.hB, 12, 6, shade(suit, -0.1)); blob(P.hB[0], P.hB[1], 5, shade(arm, -0.3));
    legB([-4, hip], P.fB, 14, 7, shade(suit, -0.1)); boot(P.fB, 16, 9, shade(arm, -0.3));
    poly([[-16, sh + 1], [-8, sh + 2], [-8, hip + 4], [-15, hip + 6]], suit, 3);
    if (!f.grounded && f.vy < 0) { g.fillStyle = pal[2]; g.beginPath(); g.moveTo(-15, -hip - 5); g.lineTo(-12, -hip + 12 + Math.random() * 10); g.lineTo(-9, -hip - 4); g.fill(); }
    poly([[-10, sh + 4], [10, sh + 4], [7, hip + 6], [8, hip - 2], [-8, hip - 2], [-7, hip + 6]], arm);
    g.fillStyle = suit; g.fillRect(-7.5, -hip - 7, 15, 4); blob(3, sh - 6, 3.2, pal[2]);
    legB([4, hip], P.fF, 14, 7, suit); boot(P.fF, 16, 9, arm);
    blob(cx, cy, r, arm);
    poly([[cx - r * 0.2, cy + r * 0.85], [cx - r * 1.3, cy + r * 1.75], [cx + r * 0.5, cy + r * 0.95]], suit, 3);
    g.fillStyle = '#0f1630'; g.beginPath(); g.ellipse(cx + r * 0.32, -cy, r * 0.68, r * 0.5, 0, 0, 6.283); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
    g.shadowColor = pal[2]; g.shadowBlur = 6; face(cx + r * 0.16, cy - r * 0.02, r * 0.78, f, { eye: pal[2], noPupil: 1, noMouth: 1, brow: 'rgba(0,0,0,0)' }); g.shadowBlur = 0;
    armB([6, sh], P.hF, 12, 6, shade(suit, 0.15)); blob(7, sh + 1, 6.5, arm); blob(P.hF[0], P.hF[1], 5.5, arm);
    const tip = P.tip || [P.hF[0] + 40, P.hF[1] - 30];
    g.shadowColor = pal[2]; g.shadowBlur = P.act ? 22 : 10; g.strokeStyle = pal[2]; g.lineWidth = P.act ? 8 : 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(P.hF[0], -P.hF[1]); g.lineTo(tip[0], -tip[1]); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(P.hF[0], -P.hF[1]); g.lineTo(tip[0], -tip[1]); g.stroke(); g.shadowBlur = 0;
    if (P.act) circ(tip[0], tip[1], 5, '#fff');
    if (f.state === 'attack') {
      const m = G.mv(f);
      if (m.counter && f.mf >= m.counter[0] && f.mf <= m.counter[1]) { g.strokeStyle = 'rgba(255,226,122,' + (0.5 + Math.sin(tm) * 0.3) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(0, -36, 44, 0, 6.283); g.stroke(); }
      if (f.move === 'nspecial' && f.charge > 0) circ(tip[0], tip[1], 4 + f.charge * 0.2, 'rgba(255,255,255,.7)');
    }
  },
  /* MOSS — stone golem: a hulking stone giant with a moss mane and beard */
  function (f, P, pal, c) {
    const st = pal[0], dk = shade(st, -0.3), lt = shade(st, 0.22), hx = P.hd[0] * 0.6, hy = P.hd[1] * 0.6, hip = 28, sh = 61, cx = 5 + hx, cy = 73 + hy, r = 12;
    armB([-15, sh], P.hB, 20, 13, dk); blob(P.hB[0], P.hB[1], 12.5, dk);
    legB([-8, hip], P.fB, 13, 13, dk); boot(P.fB, 24, 11, shade(st, -0.5));
    poly([[-24, sh + 6], [24, sh + 6], [26, sh - 14], [15, hip - 2], [-15, hip - 2], [-26, sh - 14]], st);
    g.fillStyle = lt; g.beginPath(); g.moveTo(-20, -sh - 3); g.lineTo(20, -sh - 3); g.lineTo(12, -sh + 9); g.lineTo(-14, -sh + 8); g.fill();
    g.strokeStyle = shade(st, -0.45); g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -hip - 6); g.lineTo(-7, -hip - 16); g.lineTo(-12, -hip - 25); g.moveTo(12, -hip - 4); g.lineTo(15, -hip - 15); g.stroke();
    poly([[-16, hip + 6], [16, hip + 6], [15, hip - 3], [4, hip - 12], [-4, hip - 3], [-15, hip - 3]], shade(pal[1], -0.5), 3);
    legB([8, hip], P.fF, 13, 13, st); boot(P.fF, 24, 11, shade(st, -0.35));
    for (const q of [[-20, sh + 8, 8], [-9, sh + 11, 7], [19, sh + 8, 7]]) blob(q[0], q[1], q[2], pal[1]);
    blob(cx, cy, r, lt);
    for (const q of [[cx - 7, cy + 9, 7], [cx + 1, cy + 12, 7.5], [cx + 8, cy + 9, 6], [cx - 11, cy + 2, 6]]) blob(q[0], q[1], q[2], pal[1]);
    for (const q of [[cx + 2, cy - 11, 5.5], [cx + 8, cy - 10, 5], [cx + 5, cy - 16, 4.5]]) blob(q[0], q[1], q[2], shade(pal[1], -0.15));
    g.shadowColor = pal[2]; g.shadowBlur = f.stored >= 100 ? 14 : 5; face(cx + 0.5, cy + 0.5, r * 0.95, f, { eye: pal[2], noPupil: 1, noMouth: 1, brow: OUT }); g.shadowBlur = 0;
    armB([15, sh], P.hF, 20, 14, st); blob(16, sh + 1, 9.5, lt); blob(P.hF[0], P.hF[1], 14, lt); circ(P.hF[0] - 3, P.hF[1] - 3, 8, st);
    if (f.stored > 0) { const k = f.stored / 100; circ(P.hF[0], P.hF[1], 15 + k * 8 + Math.sin(tm * 0.6) * 2, 'rgba(255,210,74,' + (0.15 + k * 0.35) + ')'); if (k >= 1 && tm % 4 === 0) parts.push({ x: f.x + f.face * P.hF[0], y: f.y - P.hF[1], vx: (Math.random() - 0.5) * 2, vy: -2, l: 16, m: 16, s: 5, c: '#ffd24a', g: -0.05 }); }
  }
];
function zap(x, y, r, col) {
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, b = a + (Math.random() - 0.5); g.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4); g.lineTo(x + Math.cos(b) * r * 0.8, y + Math.sin(b) * r * 0.8); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.stroke();
}
function hpAt(h, p) { if (h.v) { const q = 1 - p; return [q * q * h.x0 + 2 * q * p * h.v[0] + p * p * h.x1, q * q * h.y0 + 2 * q * p * h.v[1] + p * p * h.y1]; } return [h.x0 + (h.x1 - h.x0) * p, h.y0 + (h.y1 - h.y0) * p]; }
function drawBody(f, P, pal, c, x, y, al, main) {
  g.save(); g.translate(x, y - P.dy);
  if (f.state === 'buried') { g.beginPath(); g.rect(-80, -200, 160, 200 + P.dy); g.clip(); }
  g.scale(f.face, 1);
  if (P.rot) { g.translate(0, -c.h / 2); g.rotate(P.rot); g.translate(0, c.h / 2); }
  if (P.lean) g.rotate(P.lean);
  if (P.spin) g.scale(Math.cos(P.spin) >= 0 ? 1 : -1, 1);
  if (P.sq !== 1) g.scale(1 + (1 - P.sq) * 0.5, P.sq);
  g.globalAlpha = al;
  if (main && f.pow > 0) { g.shadowColor = '#ff5a3d'; g.shadowBlur = 18; }
  DRAW[f.ch](f, P, pal, c);
  g.shadowBlur = 0;
  if (main && f.state === 'attack') {
    const m = G.mv(f);
    for (const h of m.hits) {
      if (h.grab || h.push || f.mf < h.s || f.mf > h.e + 4) continue;
      const moving = Math.hypot(h.x1 - h.x0, h.y1 - h.y0) > 12 || h.v; if (!moving) continue;
      const p1 = clamp((f.mf - h.s) / Math.max(1, h.e - h.s), 0, 1), p0 = Math.max(0, p1 - 0.85), fade = f.mf > h.e ? 1 - (f.mf - h.e) / 4 : 1;
      const col = f.ch === 2 ? pal[2] : (FXC[h.fx] || '#ffffff'); g.lineCap = 'round'; g.strokeStyle = col;
      let pr = hpAt(h, p0);
      for (let i = 1; i <= 10; i++) { const q = hpAt(h, lerp(p0, p1, i / 10)); g.globalAlpha = al * fade * (0.08 + 0.55 * i / 10); g.lineWidth = Math.max(2, h.r * 1.5 * (i / 10)); g.beginPath(); g.moveTo(pr[0], -pr[1]); g.lineTo(q[0], -q[1]); g.stroke(); pr = q; }
      g.globalAlpha = al * fade * 0.9; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); let a0 = hpAt(h, p0); g.moveTo(a0[0], -a0[1]); for (let i = 1; i <= 10; i++) { const q = hpAt(h, lerp(p0, p1, i / 10)); g.lineTo(q[0], -q[1]); } g.stroke();
    }
    g.globalAlpha = al;
    if (f.charge > 3 && m.chg) { const k = f.charge / m.chg[1]; g.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * Math.abs(Math.sin(tm * 0.4))) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(0, -c.h / 2, c.h * 0.5 + k * 14, 0, 6.283); g.stroke(); }
  }
  g.restore(); g.globalAlpha = 1;
}
function drawFighter(f, S) {
  const c = CH[f.ch], P = getPose(f), pal = COS[f.ch][f.cos % 8];
  let al = P.al; if (f.invuln > 0 && f.state !== 'ledge' && tm % 6 < 3) al *= 0.45;
  let jx = 0; if (f.hitlag > 0 && f.state === 'hitstun') jx = (tm % 2 ? 3 : -3);
  const hs = hist[f.id] || (hist[f.id] = []); if (hs.t !== tm) { hs.t = tm; hs.push([f.x, f.y]); if (hs.length > 9) hs.shift(); }
  const sp = hs.length > 1 ? Math.hypot(f.x - hs[hs.length - 2][0], f.y - hs[hs.length - 2][1]) : 0;
  if ((f.state === 'roll' || f.state === 'airdodge' || sp > 13.5 || (f.state === 'attack' && f.ch === 1 && (f.move === 'uspecial' || f.move === 'sspecial'))) && sp < 200) {
    for (const k of [6, 4, 2]) { const q = hs[hs.length - 1 - k]; if (q && Math.hypot(q[0] - f.x, q[1] - f.y) < 400) drawBody(f, P, pal, c, q[0], q[1], al * (0.34 - k * 0.04), false); }
  }
  drawBody(f, P, pal, c, f.x + jx, f.y, al, true);
  if (f.state === 'walk' && f.grounded && Math.abs(f.vx) > c.run * 0.8 && tm % 7 === 0) parts.push({ x: f.x - f.face * 10, y: f.y - 2, vx: -f.face * 1.5, vy: -0.8, l: 16, m: 16, s: 5, c: 'rgba(255,255,255,.5)', g: -0.02 });
  if (f.state === 'shield' || f.state === 'shieldstun') {
    const r = (c.h * 0.42 + 12) * (0.45 + 0.55 * f.shield / 50), col = PC[f.id % 8];
    g.fillStyle = col; g.globalAlpha = 0.32; g.beginPath(); g.arc(f.x, f.y - c.h * 0.45, r, 0, 6.283); g.fill(); g.globalAlpha = 0.9; g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1;
  }
  if (f.armor > 0) { g.strokeStyle = '#8fc7ff'; g.lineWidth = 3; g.globalAlpha = 0.5 + Math.sin(tm * 0.2) * 0.2; g.beginPath(); g.ellipse(f.x, f.y - c.h / 2, c.w * 0.8, c.h * 0.6, 0, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
  if (f.state === 'dizzy') { for (let i = 0; i < 3; i++) { const a = tm * 0.15 + i * 2.09; star(f.x + Math.cos(a) * 18, f.y - c.h - 10 + Math.sin(a) * 5, 5, '#ffe27a'); } }
  if (f.state === 'respawn') { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(f.x, f.y + 4, 46, 9, 0, 0, 6.283); g.fill(); g.fillStyle = PC[f.id % 8]; g.beginPath(); g.ellipse(f.x, f.y + 6, 34, 5, 0, 0, 6.283); g.fill(); }
  if (f.spd > 0 && tm % 3 === 0) parts.push({ x: f.x, y: f.y - c.h * Math.random(), vx: -f.vx * 0.3, vy: 0, l: 10, m: 10, s: 4, c: '#5ad0ff', g: 0 });
  if (f.state === 'hitstun' && Math.hypot(f.kvx, f.kvy) > 7 && tm % 2 === 0) parts.push({ x: f.x, y: f.y - c.h / 2, vx: 0, vy: 0, l: 20, m: 20, s: 11, c: 'rgba(255,255,255,.5)', g: -0.02 });
}
function star(x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * 0.785 + tm * 0.05, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }

/* ================= stage drawing ================= */
function prand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function drawBG(st, cx, w, h) {
  let gr;
  if (st === 0) {
    gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7fe0'); gr.addColorStop(0.55, '#8fd0ff'); gr.addColorStop(1, '#ffe9c4'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,250,220,.9)'; g.beginPath(); g.arc(w * 0.78, h * 0.2, h * 0.07, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,250,220,.25)'; g.beginPath(); g.arc(w * 0.78, h * 0.2, h * 0.12, 0, 6.283); g.fill();
    for (let L = 0; L < 3; L++) for (let i = 0; i < 6; i++) {
      const sp = 0.15 + L * 0.2, x = ((prand(i + L * 9) * w * 1.6 + tm * sp * 0.4 - cx * (0.05 + L * 0.08)) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2, y = h * (0.15 + prand(i * 3 + L) * 0.6), s = h * (0.04 + L * 0.02);
      g.fillStyle = 'rgba(255,255,255,' + (0.35 + L * 0.2) + ')'; g.beginPath(); g.ellipse(x, y, s * 2.4, s * 0.8, 0, 0, 6.283); g.ellipse(x - s, y - s * 0.4, s, s * 0.7, 0, 0, 6.283); g.ellipse(x + s * 0.8, y - s * 0.5, s * 1.2, s * 0.8, 0, 0, 6.283); g.fill();
    }
    for (let i = 0; i < 3; i++) { const x = w * (0.15 + i * 0.36) - cx * 0.12, y = h * (0.5 + prand(i + 40) * 0.2), s = h * 0.06; g.fillStyle = 'rgba(70,110,150,.55)'; g.beginPath(); g.moveTo(x - s * 2, y); g.lineTo(x + s * 2, y); g.lineTo(x + s * 0.4, y + s * 1.8); g.lineTo(x - s * 0.6, y + s * 1.2); g.fill(); g.fillStyle = 'rgba(90,160,110,.6)'; g.fillRect(x - s * 2, y - s * 0.2, s * 4, s * 0.25); }
  } else if (st === 1) {
    gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05061a'); gr.addColorStop(0.6, '#1a1040'); gr.addColorStop(1, '#3a1650'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    gr = g.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, h * 0.6); gr.addColorStop(0, 'rgba(90,60,200,.35)'); gr.addColorStop(1, 'rgba(90,60,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) { const x = ((prand(i) * w * 1.3 - cx * 0.03 * (1 + i % 3)) % w + w) % w, y = prand(i + 500) * h, a = 0.4 + 0.6 * Math.abs(Math.sin(tm * 0.02 + i)); g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.fillRect(x, y, 1 + i % 3 * 0.7, 1 + i % 3 * 0.7); }
    const px = w * 0.76 - cx * 0.06, py = h * 0.3, pr = h * 0.16; gr = g.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr); gr.addColorStop(0, '#ffb88a'); gr.addColorStop(1, '#7a2a5a'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(255,220,180,.6)'; g.lineWidth = h * 0.012; g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.35, -0.3, 0, 6.283); g.stroke();
  } else if (st === 2) {
    gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0624'); gr.addColorStop(0.7, '#3b1060'); gr.addColorStop(1, '#c2307a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let L = 0; L < 3; L++) {
      const base = h * (0.55 + L * 0.13), par = 0.06 + L * 0.1, bw = w * (0.05 + L * 0.015);
      for (let i = -2; i < 26; i++) {
        const x = i * bw * 1.15 - (cx * par) % (bw * 1.15), bh = h * (0.12 + prand(i + L * 31 + Math.floor(cx * par / (bw * 1.15))) * 0.3), id = i + Math.floor(cx * par / (bw * 1.15));
        g.fillStyle = ['#1a1244', '#150d38', '#0d0826'][L]; g.fillRect(x, base - bh, bw, h);
        for (let wy = 0; wy < 7; wy++) for (let wx = 0; wx < 3; wx++) if (prand(id * 7 + wy * 3 + wx + L * 100) > 0.55) { g.fillStyle = prand(id + wy + wx) > 0.5 ? 'rgba(255,214,120,.7)' : 'rgba(120,230,255,.7)'; g.fillRect(x + bw * (0.15 + wx * 0.27), base - bh + 8 + wy * bh * 0.13, bw * 0.16, bh * 0.06); }
        if (prand(id * 13 + L) > 0.75) { const col = ['#ff3da0', '#3df0ff', '#b56bff'][Math.floor(prand(id) * 3)]; g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col; g.fillRect(x + bw * 0.1, base - bh - 6, bw * 0.8, 4); g.shadowBlur = 0; }
      }
    }
    g.strokeStyle = 'rgba(180,200,255,.25)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 60; i++) { const x = prand(i + 900) * w, y = (prand(i + 50) * h + tm * 14) % h; g.moveTo(x, y); g.lineTo(x - 4, y + 16); } g.stroke();
  } else {
    gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a0608'); gr.addColorStop(0.6, '#6a1a10'); gr.addColorStop(1, '#ff7a1a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + i * 0.32) - cx * (0.05 + i * 0.02), by = h * 0.85, s = h * (0.4 + prand(i + 3) * 0.2);
      g.fillStyle = i === 1 ? '#2a0d0c' : '#3a1410'; g.beginPath(); g.moveTo(x - s, by); g.lineTo(x - s * 0.18, by - s); g.lineTo(x + s * 0.18, by - s); g.lineTo(x + s, by); g.fill();
      gr = g.createRadialGradient(x, by - s, 0, x, by - s, s * 0.5); gr.addColorStop(0, 'rgba(255,170,60,.8)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(x - s, by - s * 1.6, s * 2, s * 1.2);
      g.strokeStyle = '#ff9a3d'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - s * 0.05, by - s); g.quadraticCurveTo(x - s * 0.2, by - s * 0.5, x - s * 0.1, by - s * 0.1); g.stroke();
    }
    for (let i = 0; i < 40; i++) { const x = ((prand(i + 70) * w - cx * 0.1) % w + w) % w, y = h - ((prand(i) * h + tm * (0.6 + prand(i + 9))) % h); g.fillStyle = 'rgba(255,' + (140 + i * 2) + ',60,' + (0.3 + prand(i) * 0.5) + ')'; g.fillRect(x + Math.sin(tm * 0.03 + i) * 8, y, 3, 3); }
  }
}
function drawPlat(p, st, i) {
  const x = p.x, y = p.y, w = p.w;
  if (p.solid) {
    const cols = [['#6fb25a', '#8a6a4a', '#4a3426'], ['#aab6e6', '#3a4170', '#1c2040'], ['#3df0ff', '#241a52', '#120a30'], ['#ff8a3d', '#3a2420', '#1a0e0c']][st];
    const deep = p.h > 500, hh = p.h;
    const gr = g.createLinearGradient(0, y, 0, y + Math.min(hh, 420)); gr.addColorStop(0, cols[1]); gr.addColorStop(1, cols[2]); g.fillStyle = gr;
    g.beginPath(); g.roundRect(x, y, w, hh, deep ? [8, 8, 0, 0] : 8); g.fill();
    g.save(); g.beginPath(); g.rect(x, y + 12, w, hh - 12); g.clip();
    if (st === 0 || st === 3) {
      g.strokeStyle = st === 0 ? 'rgba(40,26,16,.45)' : 'rgba(0,0,0,.5)'; g.lineWidth = 3;
      for (let k = 0; k < hh / 54; k++) { const yy = y + 40 + k * 54; g.beginPath(); g.moveTo(x, yy + prand(k + i) * 10); for (let xx = x; xx <= x + w; xx += 40) g.lineTo(xx, yy + prand(xx * 0.1 + k + i * 7) * 14); g.stroke(); }
      for (let k = 0; k < w * hh / 26000; k++) { const bx = x + prand(k * 3 + i) * w, by = y + 30 + prand(k * 5 + 1 + i) * (hh - 60); g.fillStyle = st === 0 ? 'rgba(255,230,190,.10)' : 'rgba(255,120,40,.16)'; g.beginPath(); g.ellipse(bx, by, 16 + prand(k) * 20, 9 + prand(k + 2) * 8, prand(k) * 3, 0, 6.283); g.fill(); }
      if (st === 3) { g.strokeStyle = '#ffb04a'; g.lineWidth = 2.5; g.globalAlpha = 0.55 + Math.sin(tm * 0.05 + i) * 0.3; for (let k = 0; k < w / 80; k++) { const bx = x + k * 80 + 30; g.beginPath(); g.moveTo(bx, y + 16); g.lineTo(bx + 14, y + 60); g.lineTo(bx - 4, y + 120); g.lineTo(bx + 10, y + 200); g.stroke(); } g.globalAlpha = 1; }
    } else if (st === 1) {
      g.strokeStyle = 'rgba(140,160,240,.22)'; g.lineWidth = 2; for (let k = 1; k < w / 80; k++) { g.beginPath(); g.moveTo(x + k * 80, y + 12); g.lineTo(x + k * 80, y + hh); g.stroke(); } for (let k = 1; k < hh / 70; k++) { g.beginPath(); g.moveTo(x, y + k * 70); g.lineTo(x + w, y + k * 70); g.stroke(); }
      for (let k = 0; k < w / 60; k++) { g.fillStyle = (Math.floor(tm / 20) + k) % 4 === 0 ? '#7ef0ff' : '#4a5490'; g.fillRect(x + k * 60 + 22, y + 24, 16, 5); }
    } else {
      for (let ky = 0; ky < hh / 30; ky++) for (let kx = 0; kx < w / 28; kx++) if (prand(kx * 13 + ky * 7 + i * 31) > 0.62) { g.fillStyle = prand(kx + ky * 3 + i) > 0.5 ? 'rgba(255,214,120,.55)' : 'rgba(120,230,255,.5)'; g.fillRect(x + 10 + kx * 28, y + 30 + ky * 30, 12, 14); }
      g.fillStyle = 'rgba(255,61,160,.75)'; g.fillRect(x + 4, y + 16, 4, hh); g.fillRect(x + w - 8, y + 16, 4, hh);
    }
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y + 12, 10, hh); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + w - 10, y + 12, 10, hh);
    g.restore();
    if (!deep && hh < 200) { g.fillStyle = cols[2]; g.beginPath(); g.moveTo(x + 6, y + hh - 4); g.lineTo(x + w - 6, y + hh - 4); g.lineTo(x + w * 0.5, y + hh + 60); g.fill(); }
    if (st === 2) { g.shadowColor = cols[0]; g.shadowBlur = 14; }
    g.fillStyle = cols[0]; g.beginPath(); g.roundRect(x - 4, y - 2, w + 8, 12, 6); g.fill(); g.shadowBlur = 0;
    if (st === 0) { g.fillStyle = '#5a9a48'; for (let k = 0; k < w / 26; k++) g.fillRect(x + k * 26 + 6, y + 10, 10, 4 + prand(k) * 8); }
  } else {
    const col = ['#e8d8a8', '#aab6e6', '#ff3da0', '#5a3a30'][st], top = ['#7ac25e', '#7ef0ff', '#3df0ff', '#ff8a3d'][st];
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(x + 4, y + 6, w - 8, 12, 5); g.fill();
    g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, 12, 5); g.fill();
    if (st === 2) { g.shadowColor = top; g.shadowBlur = 12; }
    g.fillStyle = top; g.beginPath(); g.roundRect(x, y - 2, w, 5, 3); g.fill(); g.shadowBlur = 0;
  }
}
function drawItem(it) {
  const x = it.x, y = it.y, b = it.life < 200 && it.held < 0 && tm % 10 < 4;
  if (b && it.type !== 'bomb') return;
  g.save(); g.translate(x, y);
  switch (it.type) {
    case 'bomb': g.fillStyle = it.life < 200 && tm % 8 < 4 ? '#c22' : '#23252e'; g.beginPath(); g.arc(0, 0, 11, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(-4, -4, 3, 0, 6.283); g.fill(); g.strokeStyle = '#a8894a'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, -9); g.lineTo(9, -15); g.stroke(); star(9, -16, 4 + Math.random() * 2, '#ffb03d'); break;
    case 'boomerang': g.rotate(it.thrown >= 0 ? tm * 0.5 : 0.3); g.strokeStyle = '#ffc531'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-12, 8); g.lineTo(0, -8); g.lineTo(12, 8); g.stroke(); g.strokeStyle = '#c2531a'; g.lineWidth = 2; g.stroke(); break;
    case 'blaster': { const hf = it.held >= 0 && cur ? cur.p[it.held] : null; g.scale(hf ? hf.face : 1, 1); g.fillStyle = '#d7dcf0'; g.beginPath(); g.roundRect(-10, -6, 22, 8, 3); g.fill(); g.fillStyle = '#5a6078'; g.fillRect(-8, 0, 6, 9); g.fillStyle = '#7ef0ff'; g.beginPath(); g.arc(12, -2, 4, 0, 6.283); g.fill(); break; }
    case 'heart': g.fillStyle = '#ff6b8a'; g.beginPath(); g.moveTo(0, 9); g.bezierCurveTo(-18, -4, -8, -16, 0, -6); g.bezierCurveTo(8, -16, 18, -4, 0, 9); g.fill(); g.fillStyle = '#fff'; g.fillRect(-1.5, -6, 3, 9); g.fillRect(-4.5, -3, 9, 3); break;
    case 'boots': g.fillStyle = '#5ad0ff'; g.beginPath(); g.roundRect(-8, -10, 9, 16, 3); g.roundRect(-8, 0, 18, 7, 3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-8, -6); g.lineTo(-18, -12); g.lineTo(-8, 0); g.fill(); break;
    case 'gauntlet': g.fillStyle = '#ff5a3d'; g.beginPath(); g.roundRect(-10, -9, 18, 16, 5); g.fill(); g.fillStyle = '#ffd24a'; g.fillRect(-10, 2, 18, 4); g.fillStyle = '#c22a2a'; for (let i = 0; i < 3; i++) g.fillRect(-8 + i * 6, -12, 4, 5); break;
    case 'bubble': g.fillStyle = 'rgba(143,199,255,.5)'; g.beginPath(); g.arc(0, -2, 12, 0, 6.283); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -6, 3, 0, 6.283); g.fill(); break;
    case 'crate': g.rotate(it.thrown >= 0 ? tm * 0.2 : 0); g.fillStyle = '#b98a52'; g.fillRect(-13, -14, 26, 24); g.strokeStyle = '#6a4a22'; g.lineWidth = 3; g.strokeRect(-13, -14, 26, 24); g.beginPath(); g.moveTo(-13, -14); g.lineTo(13, 10); g.moveTo(13, -14); g.lineTo(-13, 10); g.stroke(); break;
  }
  g.restore();
}
function drawProj(p) {
  if (p.k === 'ember') { g.fillStyle = 'rgba(255,120,40,.5)'; g.beginPath(); g.arc(p.x - p.vx, p.y - p.vy, p.r * 0.9, 0, 6.283); g.fill(); g.fillStyle = '#ff9a3d'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(p.x, p.y, p.r * 0.5, 0, 6.283); g.fill(); }
  else if (p.k === 'spark') { g.save(); g.translate(p.x, p.y); zap(0, 0, 15, '#8ff4ff'); g.restore(); star(p.x, p.y, 8, '#fff36b'); }
  else if (p.k === 'wave') { g.fillStyle = '#b7a27c'; for (let i = 0; i < 3; i++) { const hh = 14 + i * 8 * (p.life / 15); g.beginPath(); g.moveTo(p.x - 8 + i * 7 * Math.sign(p.vx), p.y); g.lineTo(p.x + i * 7 * Math.sign(p.vx), p.y - hh); g.lineTo(p.x + 8 + i * 7 * Math.sign(p.vx), p.y); g.fill(); } }
  else { g.strokeStyle = '#7ef0ff'; g.lineWidth = 5; g.lineCap = 'round'; g.shadowColor = '#7ef0ff'; g.shadowBlur = 10; g.beginPath(); g.moveTo(p.x - p.vx, p.y); g.lineTo(p.x, p.y); g.stroke(); g.shadowBlur = 0; }
}

/* ================= camera & world render ================= */
const cam = { x: 0, y: -120, z: 0.7 };
function camUpdate(S, snap) {
  let l = 1e9, r = -1e9, t = 1e9, b = -1e9, n = 0; const Bz = ST[S.stage].blast;
  for (const f of S.p) { if (!G.alive(f)) continue; n++; const x = clamp(f.x, Bz.l * 0.82, Bz.r * 0.82), y = clamp(f.y, Bz.t * 0.8, Bz.b * 0.75); l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y - CH[f.ch].h); b = Math.max(b, y); }
  if (!n) { l = -300; r = 300; t = -250; b = 0; }
  l = Math.min(l, -160); r = Math.max(r, 160); b = Math.max(b, 20); t = Math.min(t, -160);
  const tx = (l + r) / 2, ty = (t + b) / 2 - 10, z = clamp(Math.min(W / (r - l + 520), H / (b - t + 400)), Math.min(W / 2500, H / 1500), Math.min(W / 1000, H / 600) * 1.05);
  const k = snap ? 1 : 0.07; cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k); cam.z = lerp(cam.z, z, snap ? 1 : 0.05);
}
function drawWorld(S, showHud) {
  const stI = S.stage, P = G.getPlats(S);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBG(stI, cam.x, W, H);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  g.save(); g.translate(W / 2 + sx, H / 2 + sy); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
  if (stI === 3) { const Bz = ST[3].blast, ly = 330 + Math.sin(tm * 0.03) * 8; const gr = g.createLinearGradient(0, ly, 0, ly + 260); gr.addColorStop(0, '#ffb04a'); gr.addColorStop(0.3, '#ff5a1a'); gr.addColorStop(1, '#7a1408'); g.fillStyle = gr; g.beginPath(); g.moveTo(Bz.l * 1.5, ly + 600); g.lineTo(Bz.l * 1.5, ly); for (let x = Bz.l * 1.5; x <= Bz.r * 1.5; x += 60) g.lineTo(x, ly + Math.sin(x * 0.01 + tm * 0.05) * 10); g.lineTo(Bz.r * 1.5, ly + 600); g.fill(); }
  /* hazard */
  if (S.hz && S.hz.on) {
    const z = S.hz;
    if (z.on === 1) { g.fillStyle = 'rgba(255,90,30,' + (0.25 + 0.25 * Math.sin(tm * 0.5)) + ')'; g.fillRect(z.x - 46, -900, 92, 1400); g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(z.x, -70); g.lineTo(z.x - 22, -30); g.lineTo(z.x + 22, -30); g.fill(); g.fillStyle = '#3a1408'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('!', z.x, -36); }
    else { const gr = g.createLinearGradient(z.x - 50, 0, z.x + 50, 0); gr.addColorStop(0, 'rgba(255,90,20,0)'); gr.addColorStop(0.3, '#ff7a1a'); gr.addColorStop(0.5, '#fff0a0'); gr.addColorStop(0.7, '#ff7a1a'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(z.x - 50 + Math.sin(tm) * 4, -1000, 100, 1600); if (tm % 2 === 0) burst(z.x, 0 - Math.random() * 300, 2, '#ffb04a', 6, 20, 6, 0.2); }
  }
  for (let i = 0; i < P.length; i++) drawPlat(P[i], stI, i);
  for (const it of S.it) drawItem(it);
  /* trails */
  for (const b of beams) {
    if (b.cloud) { g.fillStyle = 'rgba(60,70,110,' + (b.l / b.m * 0.9) + ')'; g.beginPath(); g.ellipse(b.x, b.y, 50, 16, 0, 0, 6.283); g.ellipse(b.x - 24, b.y - 8, 22, 14, 0, 0, 6.283); g.ellipse(b.x + 20, b.y - 10, 26, 16, 0, 0, 6.283); g.fill(); }
  }
  const order = S.p.slice().sort((a, b) => (a.state === 'grabbed' ? 1 : 0) - (b.state === 'grabbed' ? 1 : 0));
  for (const f of order) if (G.alive(f)) drawFighter(f, S);
  for (const p of S.pr) drawProj(p);
  /* particles */
  for (const p of parts) { g.globalAlpha = clamp(p.l / p.m, 0, 1); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * (0.4 + 0.6 * p.l / p.m), 0, 6.283); g.fill(); }
  g.globalAlpha = 1;
  for (const r of rings) { const k = 1 - r.l / r.m; g.globalAlpha = 1 - k; g.strokeStyle = r.c; g.lineWidth = 4 * (1 - k) + 1; g.beginPath(); g.arc(r.x, r.y, lerp(r.r, r.mr, k), 0, 6.283); g.stroke(); }
  g.globalAlpha = 1;
  for (const t of texts) { const k = t.l / t.m, sc = (1 + Math.max(0, (k - 0.85)) * 4) / Math.max(0.6, cam.z); g.globalAlpha = Math.min(1, k * 3); g.font = Math.round(t.s * sc) + 'px "Russo One",Impact,sans-serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(t.t, t.x, t.y); g.fillStyle = t.c; g.fillText(t.t, t.x, t.y); }
  g.globalAlpha = 1;
  for (const b of beams) {
    if (b.cloud) continue; const k = b.l / b.m;
    g.save(); g.translate(b.x, b.y);
    if (b.ko) { g.rotate(b.a); for (let i = 0; i < 9; i++) { const a = (i - 4) * 0.13, len = 900 * (1 - k) + 300; g.fillStyle = i % 2 ? b.c : '#ffffff'; g.globalAlpha = k * 0.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.05) * len, Math.sin(a - 0.05) * len); g.lineTo(Math.cos(a + 0.05) * len, Math.sin(a + 0.05) * len); g.fill(); } }
    else { g.globalAlpha = k; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * 0.628 + b.a, r0 = 20 + (1 - k) * 30, r1 = 60 + (1 - k) * 120; g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } g.stroke(); }
    g.restore(); g.globalAlpha = 1;
  }
  /* training overlays */
  if (game && game.mode === 'training' && S === game.S) {
    if ($('trBox').checked) {
      for (const f of S.p) {
        if (!G.alive(f)) continue; const R = G.rectOf(f);
        g.fillStyle = G.invul(f) ? 'rgba(80,160,255,.3)' : 'rgba(255,230,60,.28)'; g.strokeStyle = G.invul(f) ? '#5aa0ff' : '#ffe63c'; g.lineWidth = 1.5; g.fillRect(R.x, R.y, R.w, R.h); g.strokeRect(R.x, R.y, R.w, R.h);
        if (f.state === 'attack') { const m = G.mv(f); for (const h of m.hits) if (f.mf >= h.s && f.mf <= h.e) { const p = G.hitPos(f, h); g.fillStyle = h.grab ? 'rgba(190,90,255,.45)' : h.push ? 'rgba(90,255,200,.35)' : 'rgba(255,50,50,.45)'; g.strokeStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], h.r, 0, 6.283); g.fill(); g.stroke(); if (h.tp) { const l = G.hitLocal(f, h); g.fillStyle = 'rgba(255,150,50,.4)'; g.beginPath(); g.arc(f.x + f.face * l[0] * 0.5, f.y - (l[1] * 0.5 + CH[f.ch].h * 0.25), h.r + 4, 0, 6.283); g.fill(); } } }
      }
      for (const p of S.pr) { g.strokeStyle = '#ff5050'; g.beginPath(); g.arc(p.x, p.k === 'wave' ? p.y - 14 : p.y, p.r, 0, 6.283); g.stroke(); }
      const Bz = ST[S.stage].blast; g.strokeStyle = 'rgba(255,80,80,.6)'; g.setLineDash([16, 12]); g.lineWidth = 3; g.strokeRect(Bz.l, Bz.t, Bz.r - Bz.l, Bz.b - Bz.t); g.setLineDash([]);
    }
    for (const p of paths) { g.globalAlpha = Math.min(1, p.l / 60); g.strokeStyle = '#7effd2'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); p.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.setLineDash([]); for (const q of p.pts) if (q[2]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(q[0], q[1], 6, 0, 6.283); g.fill(); } }
    g.globalAlpha = 1;
  }
  /* tags */
  if (showHud) for (const f of S.p) {
    if (!G.alive(f)) continue; const c = CH[f.ch], col = S.cfg.teams ? TC[f.team % 4] : PC[f.id % 8], y = f.y - c.h - (f.state === 'ledge' ? -10 : 22);
    g.font = '700 ' + Math.round(13 / Math.max(0.6, cam.z)) + 'px Rubik,sans-serif'; g.textAlign = 'center'; const tx = f.cpu >= 0 && f.name.indexOf('CPU') < 0 && !(game && game.mode === 'training') ? f.name : f.name; const tw = g.measureText(tx).width + 12, th = 18 / Math.max(0.6, cam.z);
    g.fillStyle = col; g.beginPath(); g.roundRect(f.x - tw / 2, y - th, tw, th, 5); g.fill(); g.beginPath(); g.moveTo(f.x - 6, y - 1); g.lineTo(f.x + 6, y - 1); g.lineTo(f.x, y + 7); g.fill();
    g.fillStyle = '#fff'; g.fillText(tx, f.x, y - th * 0.26);
  }
  g.restore();
  /* off-screen bubbles */
  if (showHud) for (const f of S.p) {
    if (!G.alive(f)) continue; const px = (f.x - cam.x) * cam.z + W / 2, py = (f.y - CH[f.ch].h / 2 - cam.y) * cam.z + H / 2;
    if (px < -10 || px > W + 10 || py < -10 || py > H + 10) { const bx = clamp(px, 34, W - 34), by = clamp(py, 34, H - 120); g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(bx, by, 26, 0, 6.283); g.fill(); g.strokeStyle = PC[f.id % 8]; g.lineWidth = 4; g.stroke(); g.save(); g.translate(bx, by + 16); g.scale(0.42 * f.face, 0.42); g.translate(-f.x * 0, 0); const ff = Object.assign({}, f, { x: 0, y: 0, face: 1, state: 'air', hitlag: 0, invuln: 0, djT: 0, vy: 0 }); DRAW[f.ch](ff, getPose(ff), COS[f.ch][f.cos % 8], CH[f.ch]); g.restore(); }
  }
  if (flash > 0.01) { g.fillStyle = 'rgba(255,255,255,' + flash + ')'; g.fillRect(0, 0, W, H); }
}

/* ================= HUD ================= */
function pctCol(p) { const k = clamp(p / 150, 0, 1); return 'rgb(255,' + Math.round(255 - k * 200) + ',' + Math.round(255 - Math.min(1, k * 1.6) * 235) + ')'; }
function drawHUD(S) {
  const n = S.p.length, pw = Math.min(176, (W - 16) / n), x0 = (W - n * pw) / 2, y = H - 84, sm = pw < 120;
  for (let i = 0; i < n; i++) {
    const f = S.p[i], x = x0 + i * pw, col = S.cfg.teams ? TC[f.team % 4] : PC[i % 8], out = f.out;
    g.globalAlpha = out ? 0.35 : 1;
    g.fillStyle = 'rgba(10,12,30,.78)'; g.beginPath(); g.roundRect(x + 4, y, pw - 8, 76, 10); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(x + 4, y, pw - 8, 7, [10, 10, 0, 0]); g.fill();
    g.save(); g.beginPath(); g.rect(x + 4, y + 7, 46, 69); g.clip(); g.translate(x + 26, y + 70); const sc = 0.6 * 62 / CH[f.ch].h * (f.ch === 3 ? 0.8 : 1); g.scale(sc, sc); const ff = Object.assign({}, f, { x: 0, y: 0, face: 1, state: 'idle', hitlag: 0, invuln: 0, stored: 0, t: 0 }); if (!sm) DRAW[f.ch](ff, getPose(ff), COS[f.ch][f.cos % 8], CH[f.ch]); g.restore();
    const hk = lastHit[i] && tm - lastHit[i] < 12 ? (12 - (tm - lastHit[i])) : 0, jx = hk ? (Math.random() - 0.5) * hk : 0, jy = hk ? (Math.random() - 0.5) * hk : 0;
    g.textAlign = 'right'; g.font = (sm ? 26 : 36) + 'px "Russo One",Impact,sans-serif'; const tx = x + pw - 30, ty = y + 48;
    const ptxt = out ? '—' : Math.floor(f.pct) + '';
    g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(ptxt, tx + jx, ty + jy); g.fillStyle = pctCol(f.pct); g.fillText(ptxt, tx + jx, ty + jy);
    if (!out) { g.font = (sm ? 12 : 16) + 'px "Russo One",Impact,sans-serif'; g.textAlign = 'left'; g.strokeText('%', tx + 2 + jx, ty + jy); g.fillText('%', tx + 2 + jx, ty + jy); }
    g.font = '600 11px Rubik,sans-serif'; g.textAlign = 'left'; g.fillStyle = '#cfd5ff'; g.fillText(pw < 170 ? f.name.slice(0, sm ? 9 : 12) : (f.name + ' · ' + CH[f.ch].name).slice(0, 20), x + (sm ? 10 : 52), y + 20);
    if (S.cfg.mode === 'time') { g.fillStyle = '#fff'; g.font = '600 12px Rubik,sans-serif'; g.fillText('Score ' + (f.kos - f.falls), x + (sm ? 10 : 52), y + 68); }
    else if (!S.cfg.training) { if (f.stocks <= 5) for (let k = 0; k < f.stocks; k++) { g.fillStyle = col; g.beginPath(); g.arc(x + (sm ? 14 : 58) + k * 13, y + 64, 5, 0, 6.283); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); } else { g.fillStyle = col; g.beginPath(); g.arc(x + (sm ? 14 : 58), y + 64, 5, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.font = '600 12px Rubik,sans-serif'; g.fillText('× ' + f.stocks, x + (sm ? 24 : 68), y + 68); } }
    if (f.item >= 0) { const it = S.it.find(q => q.id === f.item); if (it) { g.fillStyle = ITC[it.type]; g.beginPath(); g.arc(x + pw - 16, y + 66, 5, 0, 6.283); g.fill(); } }
    g.globalAlpha = 1;
  }
  g.textAlign = 'center';
  if (S.cfg.mode === 'time') { const s = Math.max(0, Math.ceil(S.timer / 60)), txt = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); g.font = '34px "Russo One",Impact,sans-serif'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(txt, W / 2, 44); g.fillStyle = s <= 10 ? '#ff4d5a' : '#fff'; g.fillText(txt, W / 2, 44); }
  else if (!S.cfg.training) { const s = Math.floor(S.f / 60), txt = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); g.font = '22px "Russo One",Impact,sans-serif'; g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(txt, W / 2, 34); g.fillStyle = '#fff'; g.fillText(txt, W / 2, 34); }
  if (S.start > 0) { const n = Math.ceil(S.start / 50), k = (S.start % 50) / 50; g.font = Math.round(120 + k * 60) + 'px "Russo One",Impact,sans-serif'; g.globalAlpha = Math.min(1, k * 2); g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText(n, W / 2, H * 0.45); g.fillStyle = '#ffc531'; g.fillText(n, W / 2, H * 0.45); g.globalAlpha = 1; }
  let ay = 84;
  for (const a of anns) {
    g.globalAlpha = Math.min(1, a.l / 20);
    if (a.big) { g.font = '130px "Russo One",Impact,sans-serif'; g.lineWidth = 12; g.strokeStyle = '#000'; g.strokeText(a.t, W / 2, H * 0.45); g.fillStyle = a.c; g.fillText(a.t, W / 2, H * 0.45); }
    else { g.font = '24px "Russo One",Impact,sans-serif'; const tw = g.measureText(a.t).width + 40; g.fillStyle = 'rgba(10,12,30,.85)'; g.beginPath(); g.roundRect(W / 2 - tw / 2, ay - 26, tw, 36, 8); g.fill(); g.fillStyle = a.c; g.fillRect(W / 2 - tw / 2, ay - 26, 7, 36); g.fillStyle = '#fff'; g.fillText(a.t, W / 2, ay); ay += 42; }
  }
  g.globalAlpha = 1;
  if (game && game.mode === 'training' && $('trData').checked) {
    const f = S.p[0], c = CH[f.ch]; let L = ['State: ' + f.state + '  ·  frame ' + f.t];
    if (f.state === 'attack') { const m = G.mv(f); L.push('Move: ' + moveLabel(f) + '  ·  frame ' + f.mf + ' / ' + (m.t > 9000 ? '∞' : m.t)); m.hits.forEach((h, i) => L.push('  hit ' + (i + 1) + ': active ' + h.s + '–' + h.e + (h.grab ? '  grab' : '  ' + h.d + '%  angle ' + h.a + '°  ' + (h.fix ? 'set KB ' + h.fix : 'base ' + h.b + ' growth ' + h.g)) + (f.mf >= h.s && f.mf <= h.e ? '  ◀' : ''))); if (m.air) L.push('  landing lag ' + m.lag); if (m.th) L.push('  throw releases frame ' + m.th.rel + ': ' + m.th.d + '%  angle ' + m.th.a + '°'); }
    const e = game.lastHitInfo; if (e) L.push('Last hit: ' + e.d.toFixed(1) + '%  ·  knockback ' + e.kb.toFixed(0) + '  ·  hitstun ' + Math.floor(e.kb * 0.4) + 'f' + (e.tip ? '  ·  TIPPER' : ''));
    g.font = '13px ui-monospace,Menlo,monospace'; g.textAlign = 'left'; g.fillStyle = 'rgba(10,12,30,.8)'; g.beginPath(); g.roundRect(10, 36, 540, L.length * 18 + 12, 8); g.fill(); g.fillStyle = '#d8ffe8'; L.forEach((s, i) => g.fillText(s, 20, 58 + i * 18));
  }
}
const MOVEL = { jab: 'Jab', ftilt: 'Forward tilt', utilt: 'Up tilt', dtilt: 'Down tilt', fsmash: 'Forward smash', usmash: 'Up smash', dsmash: 'Down smash', nair: 'Neutral air', fair: 'Forward air', bair: 'Back air', uair: 'Up air', dair: 'Down air', grab: 'Grab', fthrow: 'Forward throw', bthrow: 'Back throw', uthrow: 'Up throw', dthrow: 'Down throw', itemthrow: 'Item throw', itemuse: 'Item use', qpunch: 'Quarry Punch (release)', riposte: 'Riposte (counter hit)', dspecialAir: 'Tremor (air)' };
function moveLabel(f) { const c = CH[f.ch], k = { nspecial: 0, sspecial: 1, uspecial: 2, dspecial: 3 }[f.move]; if (k !== undefined) return c.spec[k]; if (/^s[234]/.test(f.move)) return 'Comet Waltz ' + f.move[1] + ' (' + ({ n: 'forward', u: 'up', d: 'down' })[f.move[2]] + ')'; return MOVEL[f.move] || f.move; }

/* ================= UI state ================= */
const ui = { screen: 'menu', mode: 'local', active: 0, slots: [], cfg: null };
let game = null, demo = null, cur = null;
const net = { ws: null, code: '', you: -1, host: false, pi: -1, on: false };
function defCfg() { return { mode: 'stock', stocks: 3, time: 3, stage: 0, items: true, itemFreq: 2, hazards: true, teams: false, ff: false }; }
function defSlots(mode) {
  const s = []; for (let i = 0; i < 8; i++) s.push({ type: 'off', dev: '', ch: -1, cos: i, team: i % 2, lvl: 5, ready: false, name: 'P' + (i + 1) });
  s[0].type = 'human'; s[0].dev = 'kb1'; s[1].type = 'cpu'; s[1].ch = 4;
  if (mode === 'training') { s[1].lvl = 0; s[1].ch = 3; }
  return s;
}
function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === name)); ui.screen = name;
  $('hint').classList.toggle('on', name === 'game'); $('train').classList.toggle('on', name === 'game' && game && game.mode === 'training');
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
function go(where) {
  if (where === 'menu') { netClose(); game = null; show('menu'); }
  else if (where === 'local' || where === 'training') { netClose(); ui.mode = where; ui.slots = defSlots(where); ui.cfg = defCfg(); ui.active = 0; show('select'); renderSelect(); }
  else if (where === 'online') { $('oerr').textContent = ''; $('oname').value = settings.name || ''; show('online'); }
  else if (where === 'settings') { renderSettings(); show('settings'); }
}
function seg(el, opts, val, fn, dis) { el.innerHTML = ''; opts.forEach(o => { const b = document.createElement('button'); b.textContent = o[1]; if (o[0] === val) b.className = 'on'; b.disabled = !!dis; b.onclick = () => fn(o[0]); el.appendChild(b); }); }
function renderSettings() {
  seg($('setSound'), [[true, 'On'], [false, 'Off']], settings.sound, v => { settings.sound = v; saveSettings(); renderSettings(); });
  seg($('setTap'), [[false, 'Off'], [true, 'On']], settings.tap, v => { settings.tap = v; saveSettings(); renderSettings(); });
  $('setServer').value = settings.server || ''; $('setServer').onchange = e => { settings.server = e.target.value.trim(); saveSettings(); };
}

/* ---- select screen ---- */
const portCv = [];
(function buildPorts() {
  const el = $('ports');
  for (let i = 0; i < 5; i++) {
    const d = document.createElement('div'); d.className = 'port' + (i === 4 ? ' rand' : ''); d.dataset.ch = i;
    if (i < 4) { const c = document.createElement('canvas'); c.width = 240; c.height = 252; d.appendChild(c); portCv.push(c); d.insertAdjacentHTML('beforeend', '<div class="nm">' + CH[i].name + '<small>' + CH[i].title + ' · ' + CH[i].style + '</small></div>'); }
    else d.insertAdjacentHTML('beforeend', '?<div class="nm">RANDOM<small>Surprise me</small></div>');
    d.insertAdjacentHTML('beforeend', '<div class="toks"></div>');
    d.addEventListener('click', () => pickChar(i)); el.appendChild(d);
  }
})();
function canEdit(i) { if (ui.mode !== 'online') return true; return i === net.you || (net.host && ui.slots[i].type !== 'human'); }
function canCfg() { return ui.mode !== 'online' || net.host; }
function editSlot(i, p) { if (!canEdit(i)) return; if (ui.mode === 'online') netSend({ t: 'slot', i, p }); else { Object.assign(ui.slots[i], p); renderSelect(); } }
function editCfg(p) { if (!canCfg()) return; if (ui.mode === 'online') netSend({ t: 'cfg', p }); else { Object.assign(ui.cfg, p); renderSelect(); } }
function pickChar(ch) {
  let i = ui.active; if (ui.mode === 'online' && !canEdit(i)) i = net.you;
  const s = ui.slots[i]; if (!s || s.type === 'off') return;
  editSlot(i, { ch, ready: ui.mode === 'online' ? s.ready : true });
  if (ui.mode !== 'online') { for (let k = 1; k <= 8; k++) { const j = (i + k) % 8; if (ui.slots[j].type !== 'off' && ui.slots[j].ch < 0) { ui.active = j; break; } } renderSelect(); }
}
function cycleType(i) {
  const s = ui.slots[i];
  if (ui.mode === 'online') { if (!net.host || s.type === 'human') return; editSlot(i, { type: s.type === 'off' ? 'cpu' : 'off', ch: s.ch < 0 ? 4 : s.ch }); return; }
  if (ui.mode === 'training') return;
  const used = ui.slots.filter((q, j) => j !== i && q.type === 'human').map(q => q.dev);
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const opts = ['off'].concat(DEVS.filter(d => used.indexOf(d) < 0 && (KB[d] || pads[+d.slice(3)]))).concat(['cpu']);
  const curK = s.type === 'human' ? s.dev : s.type; const nx = opts[(opts.indexOf(curK) + 1) % opts.length];
  if (nx === 'off') Object.assign(s, { type: 'off' }); else if (nx === 'cpu') Object.assign(s, { type: 'cpu', dev: '', ch: s.ch < 0 ? 4 : s.ch }); else Object.assign(s, { type: 'human', dev: nx });
  renderSelect();
}
function renderSelect() {
  const on = ui.mode === 'online', tr = ui.mode === 'training', cfg = ui.cfg;
  $('selTitle').textContent = on ? 'Online Lobby' : tr ? 'Training' : 'Local Multiplayer';
  $('selCode').style.display = on ? '' : 'none'; if (on) $('selCode').textContent = 'ROOM ' + net.code;
  if (on) ui.active = canEdit(ui.active) && ui.slots[ui.active].type !== 'off' ? ui.active : net.you;
  document.querySelectorAll('.port').forEach(p => { const ch = +p.dataset.ch, tk = p.querySelector('.toks'); tk.innerHTML = ''; ui.slots.forEach((s, i) => { if (s.type !== 'off' && s.ch === ch) tk.insertAdjacentHTML('beforeend', '<span class="tok" style="background:' + (cfg.teams ? TC[s.team % 4] : PC[i]) + '">' + (s.type === 'cpu' ? 'CPU' : 'P' + (i + 1)) + '</span>'); }); });
  const el = $('slots'); el.innerHTML = '';
  ui.slots.forEach((s, i) => {
    if (tr && i > 1) return;
    const d = document.createElement('div'), off = s.type === 'off', ed = canEdit(i);
    d.className = 'slot' + (off ? ' off' : '') + (i === ui.active && !off ? ' active' : ''); d.style.setProperty('--c', cfg.teams && !off ? TC[s.team % 4] : PC[i]);
    const ready = s.type === 'cpu' ? s.ch >= 0 : on ? s.ready : s.ch >= 0;
    const chn = off ? (on ? 'Open slot' : 'Empty') : s.ch < 0 ? 'Pick a fighter…' : s.ch === 4 ? 'Random' : CH[s.ch].name;
    const tl = off ? (on ? (net.host ? '+ Add CPU' : 'Open') : '+ Add player') : s.type === 'cpu' ? (tr ? 'Dummy' : 'CPU') : on ? (s.name || 'Player') + (i === net.you ? ' (you)' : '') : DEVN[s.dev];
    let h = '<div class="hd"><b>' + (tr ? (i ? 'Dummy' : 'You') : 'P' + (i + 1)) + '</b>' + (off ? '' : '<span class="rdy' + (ready ? ' y' : '') + '">' + (ready ? 'READY' : 'NOT READY') + '</span>') + '</div><div class="chn">' + chn + '</div><div class="ctr">';
    h += '<button class="btn sm" data-a="type"' + (tr || (on && (!net.host || s.type === 'human')) ? ' disabled' : '') + '>' + tl + '</button>';
    if (!off) {
      if (s.ch >= 0 && s.ch < 4) h += '<button class="sw" data-a="cos" title="Costume colour" style="background:linear-gradient(135deg,' + COS[s.ch][s.cos % 8][0] + ' 50%,' + COS[s.ch][s.cos % 8][1] + ' 50%)"' + (ed ? '' : ' disabled') + '></button>';
      if (cfg.teams) h += '<button class="btn sm" data-a="team" style="background:' + TC[s.team % 4] + '"' + (ed ? '' : ' disabled') + '>' + TN[s.team % 4] + '</button>';
      if (s.type === 'cpu' && !tr) h += '<button class="btn sm" data-a="lvl"' + (ed ? '' : ' disabled') + '>Lv ' + s.lvl + '</button>';
    }
    d.innerHTML = h + '</div>';
    d.addEventListener('click', e => {
      const a = e.target.dataset.a;
      if (a === 'type') cycleType(i); else if (a === 'cos') editSlot(i, { cos: (s.cos + 1) % 8 }); else if (a === 'team') editSlot(i, { team: (s.team + 1) % (ui.slots.filter(q => q.type !== 'off').length > 4 ? 2 : 4) }); else if (a === 'lvl') editSlot(i, { lvl: s.lvl >= 9 ? 1 : s.lvl + 2 });
      else if (!off && ed) { ui.active = i; renderSelect(); }
    });
    el.appendChild(d);
  });
  /* rules */
  const R = $('rules'), dis = !canCfg(); R.innerHTML = '';
  const opt = (label, opts, val, key) => { const o = document.createElement('div'); o.className = 'opt'; o.innerHTML = '<span>' + label + '</span>'; const s = document.createElement('div'); s.className = 'seg'; seg(s, opts, val, v => editCfg({ [key]: v }), dis); o.appendChild(s); R.appendChild(o); };
  const stepper = (label, val, mn, mx, key, suf) => { const o = document.createElement('div'); o.className = 'opt'; o.innerHTML = '<span>' + label + '</span>'; const s = document.createElement('div'); s.className = 'seg'; s.innerHTML = '<button' + (dis ? ' disabled' : '') + '>−</button><button class="on" disabled style="opacity:1;min-width:64px">' + val + (suf || '') + '</button><button' + (dis ? ' disabled' : '') + '>+</button>'; s.children[0].onclick = () => editCfg({ [key]: Math.max(mn, val - 1) }); s.children[2].onclick = () => editCfg({ [key]: Math.min(mx, val + 1) }); o.appendChild(s); R.appendChild(o); };
  const hd = t => R.insertAdjacentHTML('beforeend', '<h3>' + t + '</h3>');
  if (!tr) {
    hd('RULES');
    opt('Mode', [['stock', 'Stock'], ['time', 'Time']], cfg.mode, 'mode');
    if (cfg.mode === 'stock') stepper('Stocks', cfg.stocks, 1, 10, 'stocks'); else stepper('Time limit', cfg.time, 1, 10, 'time', ' min');
    opt('Battle', [[false, 'Free-for-all'], [true, 'Teams']], cfg.teams, 'teams');
    if (cfg.teams) opt('Friendly fire', [[false, 'Off'], [true, 'On']], cfg.ff, 'ff');
    hd('ITEMS');
    opt('Items', [[false, 'Off'], [true, 'On']], cfg.items, 'items');
    if (cfg.items) opt('Spawn rate', [[1, 'Low'], [2, 'Medium'], [3, 'High']], cfg.itemFreq, 'itemFreq');
  }
  hd('STAGE'); opt('Stage hazards', [[false, 'Off'], [true, 'On']], cfg.hazards, 'hazards');
  const sg = document.createElement('div'); sg.className = 'stages';
  for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'stg' + (cfg.stage === i ? ' on' : '') + (i === 4 ? ' rnd' : ''); if (i < 4) { d.appendChild(stageThumb(i)); d.insertAdjacentHTML('beforeend', '<span>' + ST[i].name + '</span>'); } else d.textContent = '?'; d.title = i < 4 ? ST[i].name + ' — ' + ST[i].sub : 'Random stage'; d.onclick = () => editCfg({ stage: i }); sg.appendChild(d); }
  R.appendChild(sg);
  R.insertAdjacentHTML('beforeend', '<p class="note" style="margin-top:10px">' + (cfg.stage < 4 ? '<b>' + ST[cfg.stage].name + '</b> — ' + ST[cfg.stage].sub : '<b>Random</b> — picked when the match starts') + '.<br>Click a player card, then a fighter. The colour square changes costume. CPU difficulty is set per CPU (Lv 1–9).</p>');
  if (on && !net.host) R.insertAdjacentHTML('beforeend', '<p class="note">Only the host can change rules.</p>');
  /* start */
  const act = ui.slots.filter(s => s.type !== 'off'); let msg = '';
  if (act.length < 2) msg = 'Add at least two fighters.';
  else if (act.some(s => s.ch < 0)) msg = 'Everyone needs to pick a fighter.';
  else if (cfg.teams && new Set(act.map(s => s.team)).size < 2) msg = 'Team battle needs at least two teams.';
  else if (on && act.some(s => s.type === 'human' && !s.ready)) msg = 'Waiting for everyone to ready up.';
  if (on && !msg && !net.host) msg = 'Waiting for the host to start.';
  $('selMsg').textContent = msg || (on ? 'Share the room code with your friends.' : 'All set.');
  $('selStart').style.display = on && !net.host ? 'none' : ''; $('selStart').disabled = !!msg && !(on && !net.host);
  const me = on ? ui.slots[net.you] : null; $('selReady').style.display = on ? '' : 'none';
  if (me) { $('selReady').textContent = me.ready ? 'Not ready' : 'Ready up'; $('selReady').className = 'btn' + (me.ready ? '' : ' on'); $('selReady').disabled = me.ch < 0; }
}
const thumbs = [];
function stageThumb(i) {
  if (!thumbs[i]) {
    const c = document.createElement('canvas'); c.width = 160; c.height = 100;
    thumbs[i] = c; const x = c.getContext('2d'); swapCtx(x, () => { drawBG(i, 0, 160, 100); x.save(); x.translate(80, 66); x.scale(0.12, 0.12); const P = G.getPlats({ stage: i, f: 0 }); for (let k = 0; k < P.length; k++) drawPlat(P[k], i, k); x.restore(); });
  }
  const c2 = document.createElement('canvas'); c2.width = 160; c2.height = 100; c2.getContext('2d').drawImage(thumbs[i], 0, 0); return c2;
}
function swapCtx(x, fn) { const o = g; g = x; try { fn(); } finally { g = o; } }
$('selBack').onclick = () => go('menu');
$('selStart').onclick = () => { if (ui.mode === 'online') netSend({ t: 'start' }); else startLocal(); };
$('selReady').onclick = () => { const me = ui.slots[net.you]; if (me) editSlot(net.you, { ready: !me.ready }); };

/* ---- match start ---- */
function startLocal() {
  const cfg = Object.assign({}, ui.cfg), tr = ui.mode === 'training'; const slots = [], devs = {};
  cfg.time = cfg.time * 60; if (cfg.stage > 3) cfg.stage = Math.floor(Math.random() * 4);
  if (tr) { cfg.training = true; cfg.items = $('trItems').checked; cfg.mode = 'stock'; cfg.teams = false; }
  const used = {};
  ui.slots.forEach((s, i) => {
    if (s.type === 'off' || (tr && i > 1)) return;
    let ch = s.ch === 4 ? Math.floor(Math.random() * 4) : s.ch, cos = s.cos % 8; while (used[ch + '_' + cos]) cos = (cos + 1) % 8; used[ch + '_' + cos] = 1;
    const pid = slots.length; if (s.type === 'human') devs[pid] = s.dev;
    slots.push({ ch, cos, team: s.team, name: tr ? (i ? 'DUMMY' : 'YOU') : s.type === 'cpu' ? 'CPU ' + (i + 1) : 'P' + (i + 1), cpu: s.type === 'cpu' ? s.lvl : -1 });
  });
  beginGame(G.newGame(cfg, slots, (Math.random() * 1e9) | 0), tr ? 'training' : 'local', devs);
  if (tr) { $('trBeh').value = '0'; $('trPct').value = 0; $('trPctV').textContent = '0%'; }
}
function beginGame(S, mode, devs) {
  game = { S, mode, devs: devs || {}, lastEv: S.evN || 0, paused: false, lastHitInfo: null, sent: null, sentT: 0 };
  parts = []; rings = []; beams = []; anns = []; paths = []; texts = []; lastHit = {}; shake = 0; camUpdate(S, true); show('game');
}
function togglePause() {
  if (!game) return; if (ui.screen === 'results') return;
  if (ui.screen === 'pause') { game.paused = false; show('game'); } else if (ui.screen === 'game') { game.paused = game.mode !== 'online'; show('pause'); }
}
$('pResume').onclick = togglePause;
$('pQuit').onclick = () => { if (game && game.mode === 'online') { go('menu'); } else { game = null; show('select'); renderSelect(); } };
/* training panel */
$('trBeh').onchange = e => { if (game) game.S.p[1].cpu = +e.target.value; };
$('trPct').oninput = e => { $('trPctV').textContent = e.target.value + '%'; if (game) game.S.p[1].pct = +e.target.value; };
$('trItems').onchange = e => { if (game) { game.S.cfg.items = e.target.checked; if (!e.target.checked) { game.S.it = []; game.S.p.forEach(f => f.item = -1); } } };
$('trReset').onclick = () => { if (!game) return; const S = game.S, P = G.getPlats(S)[0]; S.p.forEach((f, i) => { f.x = P.x + P.w * (i ? 0.62 : 0.38); f.y = P.y; f.vx = f.vy = f.kvx = f.kvy = 0; f.grounded = true; f.plat = 0; f.state = 'idle'; f.t = 0; f.hitstun = 0; f.pct = i ? +$('trPct').value : 0; f.face = i ? -1 : 1; f.victim = -1; f.by = -1; }); S.pr = []; };

/* ---- results ---- */
function showResults() {
  const S = game.S, res = S.res || []; const w = res.filter(r => r.place === 1);
  $('resTitle').textContent = S.cfg.teams ? TN[w[0].team % 4].toUpperCase() + ' TEAM WINS!' : w.length > 1 ? 'DRAW!' : (w[0] ? w[0].name + ' WINS!' : 'GAME!');
  let h = '<tr><th>Place</th><th>Player</th><th>Fighter</th><th>KOs</th><th>Falls</th><th>Self-KOs</th><th>Damage dealt</th></tr>';
  const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  for (const r of res) h += '<tr class="' + (r.place === 1 ? 'w' : '') + '"><td style="--c:' + (S.cfg.teams ? TC[r.team % 4] : PC[r.id % 8]) + '">' + ord[r.place - 1] + '</td><td>' + esc(r.name) + (S.cfg.teams ? ' · ' + TN[r.team % 4] : '') + '</td><td>' + CH[r.ch].name + '</td><td>' + r.kos + '</td><td>' + r.falls + '</td><td>' + r.sd + '</td><td>' + r.dmg + '%</td></tr>';
  $('resTable').innerHTML = h;
  const on = game.mode === 'online'; $('resAgain').style.display = on && !net.host ? 'none' : ''; $('resNote').textContent = on && !net.host ? 'The host can start a rematch.' : '';
  show('results');
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
$('resAgain').onclick = () => { if (game && game.mode === 'online') netSend({ t: 'start' }); else startLocal(); };
$('resLobby').onclick = () => { game = null; show('select'); renderSelect(); };
$('resMenu').onclick = () => go('menu');

/* ================= netcode ================= */
function netSend(m) { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(m)); }
function netClose() { if (net.ws) { net.on = false; try { net.ws.close(); } catch (e) { } net.ws = null; } }
function netConnect(first) {
  netClose(); $('oerr').textContent = 'Connecting…';
  const base = (settings.server || location.origin || '').replace(/\/+$/, ''); let ws;
  const fail = () => { $('oerr').textContent = 'Could not reach a game server at ' + (base || 'this address') + '. Online play needs the Rift Rumble server running — open the game from that server, or enter its address in Settings.'; };
  try { if (!/^https?:/.test(base)) throw 0; ws = new WebSocket(base.replace(/^http/, 'ws') + '/ws'); } catch (e) { fail(); return; }
  net.ws = ws; let opened = false;
  ws.onopen = () => { opened = true; net.on = true; $('oerr').textContent = ''; ws.send(JSON.stringify(first)); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onNet(m); };
  ws.onerror = () => { if (!opened) fail(); };
  ws.onclose = () => { if (net.ws !== ws) return; net.ws = null; if (!opened) { fail(); return; } if (net.on) { net.on = false; game = null; show('online'); $('oerr').textContent = 'Disconnected from the server.'; } };
}
function onNet(m) {
  if (m.t === 'room') {
    net.code = m.code; net.you = m.you; net.host = m.host; ui.mode = 'online'; ui.slots = m.slots; ui.cfg = m.cfg;
    if (ui.screen === 'online' || ui.screen === 'select') { show('select'); renderSelect(); }
    else if (ui.screen === 'results') { $('resAgain').style.display = net.host ? '' : 'none'; }
  } else if (m.t === 'go') { net.pi = m.pi; beginGame(m.s, 'online'); game.pi = m.pi; }
  else if (m.t === 's') {
    if (!game || game.mode !== 'online') { if (net.pi >= 0 && ui.screen !== 'results') { beginGame(m.s, 'online'); game.pi = net.pi; } return; }
    const prevF = game.S.f, s = m.s; game.S = s;
    pump(s, false);
    let n = prevF - s.f; if (n > 0 && n <= 14) { const inp = {}; inp[game.pi] = game.myInp || { x: 0, y: 0, b: 0 }; while (n-- > 0) { G.step(game.S, inp); pump(game.S, true); } }
  } else if (m.t === 'err') { $('oerr').textContent = m.m; if (ui.screen === 'select') $('selMsg').textContent = m.m; }
}
function pump(S, quiet) { for (const e of S.ev) if (e.i > game.lastEv) { game.lastEv = e.i; handleEvent(e, S, quiet && e.k !== 'ko' && e.k !== 'game'); } }
$('ocreate').onclick = () => { settings.name = $('oname').value.trim().slice(0, 12); saveSettings(); netConnect({ t: 'create', name: settings.name || 'Player' }); };
$('ojoin').onclick = () => { settings.name = $('oname').value.trim().slice(0, 12); saveSettings(); const code = $('ocode').value.trim().toUpperCase(); if (!code) { $('oerr').textContent = 'Enter a room code.'; return; } netConnect({ t: 'join', code, name: settings.name || 'Player' }); };

/* ================= main loop ================= */
function newDemo() { const sl = []; for (let i = 0; i < 4; i++) sl.push({ ch: i, cos: (Math.random() * 8) | 0, cpu: 8, name: 'CPU' }); demo = G.newGame({ stage: (Math.random() * 4) | 0, stocks: 2, items: true, itemFreq: 3 }, sl, (Math.random() * 1e9) | 0); demo.start = 1; demo.lastEv = 0; }
function tick() {
  tm++;
  if (game && ui.screen !== 'select' ) {
    if (!game.paused) {
      const S = game.S, inp = {};
      if (game.mode === 'online') {
        const me = readInput(navigator.getGamepads && navigator.getGamepads()[0] && !anyKey() ? 'pad0' : 'kb1'); const k2 = readInput('kb2'); if (!me.x && !me.y && !me.b) { me.x = k2.x; me.y = k2.y; me.b = k2.b; }
        game.myInp = me; inp[game.pi] = me;
        const key = me.x + ',' + me.y + ',' + me.b; if (key !== game.sent || tm - game.sentT > 6) { game.sent = key; game.sentT = tm; netSend({ t: 'in', x: me.x, y: me.y, b: me.b }); }
      } else for (const pid in game.devs) inp[pid] = readInput(game.devs[pid]);
      G.step(S, inp); pump(S, false);
      if (game.mode === 'training') { const d = S.p[1]; if ($('trFix').checked && d.state !== 'hitstun' && d.hitlag <= 0 && d.state !== 'grabbed') d.pct = +$('trPct').value; else if (!$('trFix').checked) { $('trPct').value = Math.min(200, Math.floor(d.pct)); $('trPctV').textContent = Math.floor(d.pct) + '%'; } }
      camUpdate(S, false);
      if (S.over && S.f - S.over > 170 && ui.screen === 'game') showResults();
    }
    cur = game.S;
  } else {
    if (!demo || (demo.over && demo.f - demo.over > 200)) newDemo();
    G.step(demo); for (const e of demo.ev) if (e.i > demo.lastEv) { demo.lastEv = e.i; if (e.k !== 'go' && e.k !== 'game' && e.k !== 'ko') handleEvent(e, demo, true); else if (e.k === 'ko') { burst(e.x, e.y, 40, PC[e.id % 8], 14, 40, 8); shake = 12; } }
    camUpdate(demo, false); cur = demo;
  }
  fxTick();
}
function anyKey() { for (const k in keys) if (keys[k]) return true; return false; }
function render() {
  if (!cur) return;
  drawWorld(cur, cur !== demo);
  if (cur !== demo) drawHUD(cur);
  else if (ui.screen !== 'menu') { g.fillStyle = 'rgba(8,10,26,.55)'; g.fillRect(0, 0, W, H); }
  /* portrait previews */
  if (ui.screen === 'select' && tm % 2 === 0) for (let i = 0; i < 4; i++) {
    const c = portCv[i], x = c.getContext('2d'), sl = ui.slots[ui.active], cos = sl && sl.ch === i ? sl.cos % 8 : 0;
    swapCtx(x, () => {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 240, 252); const gr = x.createRadialGradient(120, 130, 10, 120, 130, 170); gr.addColorStop(0, COS[i][cos][0]); gr.addColorStop(1, 'rgba(10,12,30,0)'); x.globalAlpha = 0.35; x.fillStyle = gr; x.fillRect(0, 0, 240, 252); x.globalAlpha = 1;
      const cyc = (tm + i * 50) % 260, c0 = CH[i], mvn = ['jab', 'ftilt', 'utilt', 'fsmash'][Math.floor((tm + i * 50) / 260) % 4], m = c0.moves[mvn];
      const f = { id: i, ch: i, cos, x: 0, y: 0, vx: 0, vy: 0, kvx: 0, kvy: 0, face: 1, grounded: true, state: 'idle', t: tm, mf: 0, move: '', charge: 0, stored: 0, hitlag: 0, invuln: 0, pumT: 0, ax: 0 };
      if (cyc > 200 && cyc - 200 < m.t) { f.state = 'attack'; f.move = mvn; f.mf = cyc - 200; }
      const sc = 150 / c0.h * (i === 3 ? 0.9 : i === 1 ? 0.75 : 1); x.translate(96, 214); x.scale(sc, sc); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(0, 2, c0.w * 0.8, 6, 0, 0, 6.283); x.fill();
      const P = getPose(f); x.translate(0, -P.dy); if (P.lean) x.rotate(P.lean); DRAW[i](f, P, COS[i][cos], c0);
    });
  }
}
let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(100, now - last); last = now; acc += dt; let n = 0;
  while (acc >= 16.6667 && n < 5) { acc -= 16.6667; tick(); n++; } if (n === 5) acc = 0;
  try { render(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
window.__rr = { ui, get game() { return game; }, go, startLocal, pickChar, net };
show('menu'); requestAnimationFrame(frame);
})();
