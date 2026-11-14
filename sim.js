/* RIFT RUMBLE — shared deterministic simulation (runs in browser and on the server) */
(function (root) {
'use strict';
const A = 1, B = 2, J = 4, SH = 8, GR = 16, C = 32;
const BK = [A, B, J, SH, GR, C];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sgn = v => v > 0 ? 1 : v < 0 ? -1 : 0;
const H = (s, e, x0, y0, x1, y1, r, d, a, b, g, o) => Object.assign({ s, e, x0, y0, x1, y1, r, d, a, b, g }, o || {});
const TH = (t, rel, d, a, b, g, o) => Object.assign({ t, th: { rel, d, a, b, g }, hits: [] }, o || {});
const T = { tp: 1, fx: 'slash' };
const tp = o => Object.assign({ tp: 1, fx: 'slash' }, o || {});

function rnd(S) { S.rng = (Math.imul(S.rng, 1664525) + 1013904223) >>> 0; return S.rng / 4294967296; }
function ev(S, o) { o.i = ++S.evN; o.f = S.f; S.ev.push(o); if (S.ev.length > 60) S.ev.shift(); }
function setState(f, s) { f.state = s; f.t = 0; }
function mv(f) { return CH[f.ch].moves[f.move] || GEN[f.move]; }
function startMove(S, f, name) {
  const c = CH[f.ch];
  if (!f.grounded && c.moves[name + 'Air']) name += 'Air';
  if (f.state !== 'attack') f.chain = 0;
  f.state = 'attack'; f.t = 0; f.move = name; f.mf = 0; f.hitIds = []; f.charge = 0; f.chgDone = false; f.loops = 0; f.conn = 0; f.gcM = false;
  const m = mv(f); if (m.start) m.start(S, f, m);
}
function endMove(S, f) {
  const m = mv(f);
  if (f.grounded) setState(f, 'idle'); else setState(f, m.helpless ? 'helpless' : 'air');
}
function spawnProj(S, f, k, x, y, vx, vy, o) {
  S.pr.push(Object.assign({ k, o: f.id, x, y, vx, vy, life: 80, r: 12, d: 5, a: 50, b: 12, g: 25, hit: [], gr: false, id: ++S.idN }, o));
}
const stickDir = I => { const ax = Math.abs(I.x) > 0.4 ? sgn(I.x) : 0, ay = I.y < -0.4 ? -1 : I.y > 0.4 ? 1 : 0; return [ax, ay]; };

/* ---------- generic moves ---------- */
const GEN = {
  itemthrow: { t: 18, hits: [], any: 1 },
  itemuse: { t: 14, hits: [], any: 1 },
};

/* ---------- chain helper for Astra's Comet Waltz ---------- */
function chain(stage) {
  return function (S, f, m) {
    if (stage >= 4) return;
    if (f.mf >= 9 && f.mf <= m.t - 3 && take(f, B)) {
      const [, ay] = stickDir(f.inp); const n = stage + 1;
      let v = ay < 0 ? 'u' : ay > 0 ? 'd' : 'n'; if (n === 2 && v === 'd') v = 'n';
      const keepV = f.vx; startMove(S, f, 's' + n + v); f.vx = keepV;
    }
  };
}

/* ---------- characters ---------- */
const CH = [
/* 0 — EMBER, the Forge Tinker: balanced all-rounder */
{
  name: 'EMBER', title: 'Forge Tinker', style: 'Balanced all-rounder', w: 34, h: 62, wt: 98, jumps: 3,
  walk: 2.7, run: 6.2, acc: 1.4, air: 4.9, aacc: 0.52, grav: 0.48, fall: 8.5, ff: 13, jump: 12.2, sh: 7.6, dj: 11.6, reach: 55, pm: 1.3,
  spec: ['Ember Skip', 'Mirror Fan', 'Flare Riser', 'Steam Vent'],
  moves: {
    jab: { t: 16, hits: [H(3, 5, 22, 38, 46, 38, 13, 2.5, 75, 14, 30)] },
    ftilt: { t: 27, lb: 'f', hits: [H(6, 10, 22, 24, 58, 34, 16, 8, 38, 22, 85)] },
    utilt: { t: 25, hits: [H(5, 11, 30, 40, -8, 94, 17, 6, 95, 30, 95, { fx: 'fire', v: [34, 90] })] },
    dtilt: { t: 22, lb: 'f', hits: [H(5, 8, 24, 8, 56, 8, 14, 5.5, 78, 26, 60)] },
    fsmash: { t: 46, chg: [9, 60, A | C], hits: [H(14, 18, 30, 36, 74, 40, 22, 17, 42, 28, 100, { fx: 'fire' })] },
    usmash: { t: 42, chg: [7, 60, A | C], lb: 'hd', hits: [H(10, 15, 34, 44, -22, 96, 22, 14, 88, 32, 96, { v: [20, 104] })] },
    dsmash: { t: 42, chg: [5, 60, A | C], lb: 'f', hits: [H(7, 10, 28, 10, 56, 10, 18, 11, 32, 30, 82), H(15, 18, -28, 10, -56, 10, 18, 12, 148, 30, 84)] },
    nair: { t: 40, air: 1, lag: 8, lb: 'f', hits: [H(4, 8, 10, 28, 16, 28, 26, 8, 48, 22, 90), H(9, 28, 10, 28, 16, 28, 20, 5, 48, 12, 80, { grp: 0 })] },
    fair: { t: 50, air: 1, lag: 16, hits: [H(16, 20, 8, 78, 40, 8, 20, 13, 282, 22, 84, { fx: 'fire', v: [60, 60] })] },
    bair: { t: 34, air: 1, lag: 8, lb: 'f', hits: [H(6, 9, -22, 34, -58, 34, 18, 10.5, 142, 16, 100)] },
    uair: { t: 30, air: 1, lag: 7, lb: 'f', hits: [H(4, 9, 32, 52, -32, 80, 18, 7, 78, 12, 96, { v: [4, 100] })] },
    dair: { t: 40, air: 1, lag: 14, lb: 'f', hits: [H(5, 22, 0, 4, 0, -8, 22, 1.4, 90, 0, 0, { fix: 26, re: 4 }), H(24, 27, 0, 0, 0, -6, 28, 5, 62, 34, 100)] },
    grab: { t: 32, hits: [H(6, 8, 28, 36, 40, 36, 15, 0, 0, 0, 0, { grab: 1 })] },
    fthrow: TH(28, 14, 8, 42, 62, 62), bthrow: TH(36, 22, 11, 140, 62, 70), uthrow: TH(28, 14, 7, 90, 72, 50), dthrow: TH(30, 16, 5, 72, 62, 30),
    nspecial: { t: 40, any: 1, hits: [], on(S, f) { if (f.mf === 14) { spawnProj(S, f, 'ember', f.x + f.face * 30, f.y - 40, f.face * 5.6, -1.5, { life: 90, d: 5, a: 55, b: 14, g: 22, r: 11, fx: 'fire' }); ev(S, { k: 'cast', x: f.x + f.face * 30, y: f.y - 40, fx: 'fire' }); } } },
    sspecial: { t: 36, any: 1, hits: [H(10, 16, 26, 36, 52, 36, 28, 6, 0, 0, 0, { flip: 1, refl: 1, nokb: 1, fx: 'wind' })],
      start(S, f) { if (!f.grounded && !f.stall) { f.stall = true; f.vy = Math.min(f.vy, -3.5); } } },
    uspecial: { t: 44, any: 1, helpless: 1, landEnd: 1, lag: 14,
      hits: [H(5, 20, 14, 50, 14, 62, 24, 0.8, 88, 0, 0, { fix: 70, re: 3, fx: 'fire' }), H(21, 24, 14, 66, 14, 72, 30, 4.5, 70, 62, 110, { fx: 'fire' })],
      start(S, f) { f.upUsed = true; },
      on(S, f) { if (f.mf === 5) { f.grounded = false; f.vx = f.inp.x * 3 + f.face * 1; } if (f.mf >= 5 && f.mf <= 19) f.vy = -10.8; } },
    dspecial: { t: 62, any: 1, hits: [H(12, 48, 46, 34, 104, 34, 34, 0, 0, 0, 0, { push: 2.4, fx: 'steam' }), H(12, 48, 120, 34, 176, 36, 42, 0, 0, 0, 0, { push: 1.5, fx: 'steam' })],
      on(S, f) { if (f.mf >= 12 && f.mf <= 48) { if (!f.grounded) f.vx -= f.face * 0.12; if (f.mf % 3 === 0) ev(S, { k: 'steam', x: f.x + f.face * 30, y: f.y - 34, d: f.face }); } } },
  }
},
/* 1 — FLICK, the Storm Sprite: tiny, extremely fast */
{
  name: 'FLICK', title: 'Storm Sprite', style: 'Lightning-fast rushdown', w: 28, h: 44, wt: 79, jumps: 3,
  walk: 3.3, run: 8.5, acc: 2.0, air: 5.9, aacc: 0.72, grav: 0.52, fall: 9, ff: 14.5, jump: 12.8, sh: 8, dj: 12.6, reach: 42, pm: 1.0,
  spec: ['Spark Crawler', 'Bolt Ram', 'Blink Dash', 'Skyfall'],
  moves: {
    jab: { t: 10, lb: 'hd', hits: [H(2, 3, 14, 26, 30, 26, 12, 1.4, 70, 10, 15)] },
    ftilt: { t: 22, lb: 'f', hits: [H(5, 8, 16, 20, 44, 26, 14, 7, 40, 18, 80)] },
    utilt: { t: 20, lb: 'f', hits: [H(4, 9, -24, 30, 24, 54, 15, 5, 96, 28, 90, { v: [0, 72] })] },
    dtilt: { t: 16, lb: 'f', hits: [H(4, 6, 16, 6, 42, 6, 12, 4.5, 25, 18, 55)] },
    fsmash: { t: 44, chg: [10, 60, A | C], hits: [H(14, 22, 26, 26, 64, 26, 20, 16, 40, 28, 98, { fx: 'elec' })] },
    usmash: { t: 40, chg: [7, 60, A | C], lb: 'f', hits: [H(9, 13, 28, 26, -20, 72, 20, 13, 85, 34, 98, { v: [14, 80] })] },
    dsmash: { t: 48, chg: [6, 60, A | C], lb: 'b', hits: [H(8, 22, 0, 14, 0, 14, 38, 1.6, 20, 0, 0, { fix: 22, re: 3, fx: 'elec' }), H(24, 27, 0, 14, 0, 14, 44, 6, 35, 42, 105, { rad: 1, fx: 'elec' })] },
    nair: { t: 36, air: 1, lag: 7, lb: 'b', hits: [H(3, 6, 0, 22, 0, 22, 26, 8.5, 45, 20, 95), H(7, 22, 0, 22, 0, 22, 20, 4.5, 45, 10, 85, { grp: 0 })] },
    fair: { t: 36, air: 1, lag: 10, lb: 'hd', hits: [H(8, 22, 24, 24, 30, 24, 18, 1.5, 20, 0, 0, { fix: 22, re: 4, fx: 'elec' }), H(24, 26, 30, 24, 36, 24, 22, 3.5, 50, 30, 100, { fx: 'elec' })] },
    bair: { t: 40, air: 1, lag: 12, lb: 'f', hits: [H(4, 20, -22, 22, -28, 22, 18, 1.3, 160, 0, 0, { fix: 20, re: 4 }), H(22, 24, -28, 22, -32, 22, 22, 4, 140, 30, 110)] },
    uair: { t: 26, air: 1, lag: 6, lb: 'f', hits: [H(3, 8, -26, 28, 24, 52, 14, 5, 70, 20, 80, { v: [0, 66] })] },
    dair: { t: 42, air: 1, lag: 16, lb: 'hd', hits: [H(14, 24, 0, 6, 0, -8, 22, 13, 275, 22, 84, { fx: 'elec' })] },
    grab: { t: 30, hits: [H(6, 8, 20, 24, 30, 24, 13, 0, 0, 0, 0, { grab: 1 })] },
    fthrow: TH(26, 14, 6, 45, 55, 65, { fx: 'elec' }), bthrow: TH(34, 24, 9, 135, 60, 60), uthrow: TH(26, 12, 5, 90, 65, 45), dthrow: TH(28, 16, 5, 70, 50, 45),
    nspecial: { t: 34, any: 1, hits: [], on(S, f) { if (f.mf === 12) { spawnProj(S, f, 'spark', f.x + f.face * 20, f.y - 22, f.face * 6.4, 2, { life: 115, d: 5.5, a: 60, b: 14, g: 30, r: 10, fx: 'elec' }); ev(S, { k: 'cast', x: f.x + f.face * 20, y: f.y - 22, fx: 'elec' }); } } },
    sspecial: { t: 58, any: 1, slide: 1, chg: [14, 70, B], chgM: 1.6, hits: [H(15, 34, 10, 22, 14, 22, 24, 7, 45, 40, 70, { fx: 'elec' })],
      on(S, f) {
        if (f.mf === 15) { f.dashV = 9 + f.charge * 0.17; ev(S, { k: 'cast', x: f.x, y: f.y - 20, fx: 'elec' }); }
        if (f.mf >= 15 && f.mf <= 34) { f.vx = f.face * f.dashV; if (!f.grounded) f.vy = 0.2; }
        else if (f.mf > 34) f.vx *= 0.85; else { f.vx *= 0.8; if (!f.grounded && f.vy > 2) f.vy = 2; }
      } },
    uspecial: { t: 42, any: 1, helpless: 1, landEnd: 1, lag: 16, hits: [],
      start(S, f) { f.upUsed = true; f.dn = 0; },
      on(S, f) {
        const I = f.inp, pick = () => { let x = I.x, y = I.y; const m = Math.hypot(x, y); if (m < 0.4) { x = 0; y = -1; } else { x /= m; y /= m; } return [x, y]; };
        if (f.mf < 6) { f.vx *= 0.5; f.vy = 0; }
        if (f.mf === 6) { const d = pick(); f.ax = d[0]; f.ay = d[1]; f.dn = 1; ev(S, { k: 'blink', x: f.x, y: f.y - 20 }); }
        if (f.mf === 16) {
          const d = pick(), m = Math.hypot(I.x, I.y);
          if (m >= 0.4 && d[0] * f.ax + d[1] * f.ay < 0.9) { f.ax = d[0]; f.ay = d[1]; f.dn = 2; ev(S, { k: 'blink', x: f.x, y: f.y - 20 }); }
          else { f.mf = 26; }
        }
        if (f.mf >= 6 && f.mf < 26) { f.vx = f.ax * 19; f.vy = f.ay * 19; if (f.ay < -0.1) f.grounded = false; if (f.ax) f.face = sgn(f.ax) || f.face; }
        if (f.mf === 26) { f.vx *= 0.3; f.vy *= 0.3; }
      } },
    dspecial: { t: 60, any: 1, hits: [H(10, 26, 0, 430, 0, 40, 22, 8, 270, 20, 40, { fx: 'elec' }), H(26, 32, 0, 24, 0, 24, 62, 14, 82, 50, 92, { rad: 1, fx: 'elec' })],
      start(S, f) { if (!f.grounded) { f.vy *= 0.4; } },
      on(S, f) { if (f.mf === 8) ev(S, { k: 'cloud', x: f.x, y: f.y - 430 }); if (f.mf === 26) ev(S, { k: 'bolt', x: f.x, y: f.y }); } },
  }
},
/* 2 — ASTRA, the Star Knight: precision plasma-blade fighter */
{
  name: 'ASTRA', title: 'Star Knight', style: 'Precision blade spacing', w: 32, h: 70, wt: 90, jumps: 3,
  walk: 2.5, run: 6.6, acc: 1.4, air: 4.7, aacc: 0.5, grav: 0.44, fall: 8, ff: 12.5, jump: 12.4, sh: 7.6, dj: 11.4, reach: 80, pm: 1.2,
  spec: ['Piercing Star', 'Comet Waltz', 'Rising Nova', 'Riposte'],
  moves: {
    jab: { t: 22, hits: [H(5, 8, 34, 64, 74, 34, 15, 5, 65, 22, 45, tp({ v: [70, 62] }))] },
    ftilt: { t: 32, hits: [H(8, 12, 26, 78, 82, 26, 16, 9.5, 40, 28, 88, tp({ v: [84, 70] }))] },
    utilt: { t: 32, hits: [H(6, 13, 60, 36, -44, 96, 16, 7, 95, 34, 95, tp({ v: [20, 130] }))] },
    dtilt: { t: 20, hits: [H(6, 8, 36, 10, 86, 8, 13, 7.5, 28, 25, 45, T)] },
    fsmash: { t: 52, chg: [9, 60, A | C], hits: [H(13, 17, 20, 104, 94, 22, 17, 13.5, 42, 34, 92, tp({ v: [100, 96] }))] },
    usmash: { t: 52, chg: [9, 60, A | C], hits: [H(12, 17, 8, 70, 8, 132, 16, 13, 90, 42, 88, T)] },
    dsmash: { t: 58, chg: [5, 60, A | C], hits: [H(6, 9, 32, 16, 86, 10, 15, 10, 35, 36, 82, T), H(21, 24, -32, 16, -86, 10, 15, 13, 145, 36, 84, T)] },
    nair: { t: 44, air: 1, lag: 9, hits: [H(6, 9, -50, 40, 62, 36, 16, 3.5, 70, 0, 0, tp({ fix: 28, v: [0, -24] })), H(15, 21, 62, 36, -62, 36, 18, 8.5, 45, 30, 90, tp({ v: [0, 110] }))] },
    fair: { t: 36, air: 1, lag: 10, hits: [H(6, 10, 26, 92, 66, 2, 16, 9.5, 48, 26, 92, tp({ v: [92, 60] }))] },
    bair: { t: 38, air: 1, lag: 10, hits: [H(7, 11, -26, 84, -72, 6, 16, 10, 138, 28, 94, tp({ v: [-92, 56] }))] },
    uair: { t: 40, air: 1, lag: 10, hits: [H(5, 12, 60, 44, -60, 60, 16, 9.5, 82, 24, 88, tp({ v: [0, 140] }))] },
    dair: { t: 50, air: 1, lag: 16, hits: [H(9, 13, 54, 24, -54, 24, 16, 11, 70, 30, 85, tp({ v: [0, -60] }))] },
    grab: { t: 32, hits: [H(7, 9, 28, 40, 42, 40, 14, 0, 0, 0, 0, { grab: 1 })] },
    fthrow: TH(26, 13, 4, 50, 60, 45), bthrow: TH(30, 16, 4, 125, 65, 50), uthrow: TH(34, 18, 5, 90, 60, 105), dthrow: TH(28, 15, 4, 68, 60, 40),
    nspecial: { t: 62, any: 1, chg: [12, 60, B], chgM: 1.3, hits: [H(13, 17, 36, 38, 98, 38, 16, 9, 40, 30, 85, tp({ sd: 22 }))] },
    sspecial: { t: 30, any: 1, hits: [H(6, 9, 30, 60, 72, 30, 16, 3, 60, 0, 0, tp({ fix: 30, v: [70, 56] }))], on: chain(1),
      start(S, f) { if (!f.grounded && !f.stall) { f.stall = true; f.vy = Math.min(f.vy, -2.5); } } },
    s2n: { t: 30, any: 1, hits: [H(5, 8, 50, 26, 78, 44, 16, 3, 70, 0, 0, tp({ fix: 30 }))], on: chain(2) },
    s2u: { t: 30, any: 1, hits: [H(5, 8, 36, 40, 54, 86, 16, 3, 86, 0, 0, tp({ fix: 36 }))], on: chain(2) },
    s3n: { t: 34, any: 1, hits: [H(6, 9, 36, 44, 88, 38, 16, 4, 40, 40, 50, T)], on: chain(3) },
    s3u: { t: 34, any: 1, hits: [H(6, 9, 56, 26, 36, 96, 18, 4, 88, 46, 50, T)], on: chain(3) },
    s3d: { t: 34, any: 1, hits: [H(6, 9, 44, 26, 84, 8, 16, 4, 20, 36, 50, T)], on: chain(3) },
    s4n: { t: 46, any: 1, hits: [H(8, 12, 24, 96, 88, 18, 20, 6, 45, 50, 110, tp({ v: [96, 84] }))] },
    s4u: { t: 46, any: 1, hits: [H(8, 12, 64, 16, 26, 108, 20, 7, 90, 55, 105, tp({ v: [80, 90] }))] },
    s4d: { t: 50, any: 1, hits: [H(6, 26, 50, 14, 86, 14, 16, 2, 70, 0, 0, tp({ fix: 18, re: 4 })), H(28, 31, 60, 14, 92, 14, 18, 5, 30, 42, 100, T)] },
    uspecial: { t: 42, any: 1, helpless: 1, landEnd: 1, lag: 16,
      hits: [H(4, 6, 20, 46, 32, 96, 22, 11, 80, 50, 90, T), H(7, 16, 24, 76, 24, 90, 18, 6, 75, 30, 60, tp({ grp: 0 }))],
      start(S, f) { f.upUsed = true; },
      on(S, f) { if (f.mf === 4) { f.grounded = false; f.vy = -16.5; f.vx = f.face * 2 + f.inp.x * 2.5; } } },
    dspecial: { t: 58, any: 1, counter: [5, 28], hits: [], start(S, f) { if (!f.grounded) f.vy = Math.min(f.vy, 1); } },
    riposte: { t: 38, any: 1, hits: [H(5, 10, 16, 80, 84, 26, 26, 0, 45, 40, 85, { ctrD: 1, fx: 'slash', v: [90, 84] })] },
  }
},
/* 3 — MOSS, the Stone Golem: heavyweight grappler */
{
  name: 'MOSS', title: 'Stone Golem', style: 'Heavyweight grappler', w: 54, h: 84, wt: 127, jumps: 3,
  walk: 2.1, run: 5.2, acc: 1.0, air: 4.4, aacc: 0.42, grav: 0.5, fall: 9, ff: 14, jump: 11.8, sh: 7.2, dj: 11, reach: 75, pm: 1.6,
  spec: ['Quarry Punch', 'Stake Bash', 'Rock Tornado', 'Tremor'],
  moves: {
    jab: { t: 24, hits: [H(5, 8, 36, 50, 72, 50, 20, 6, 60, 22, 50, { fx: 'rock' })] },
    ftilt: { t: 34, hits: [H(8, 12, 36, 48, 90, 48, 22, 10, 38, 25, 90)] },
    utilt: { t: 36, hits: [H(6, 14, 74, 50, -64, 96, 24, 9.5, 95, 36, 95, { v: [0, 160] })] },
    dtilt: { t: 24, hits: [H(6, 9, 40, 10, 86, 10, 18, 6, 25, 22, 60)] },
    fsmash: { t: 64, chg: [14, 60, A | C], lb: '2h', hits: [H(22, 26, 46, 46, 92, 46, 30, 22, 40, 30, 96, { fx: 'rock' })] },
    usmash: { t: 58, chg: [10, 60, A | C], lb: '2h', hits: [H(14, 18, 0, 104, 0, 122, 30, 19, 90, 36, 92, { fx: 'rock' })] },
    dsmash: { t: 62, chg: [8, 60, A | C], lb: '2h', hits: [H(11, 15, 60, 70, 86, 10, 26, 17, 48, 30, 90, { fx: 'rock' }), H(11, 15, -60, 70, -86, 10, 26, 17, 132, 30, 90, { grp: 0, fx: 'rock' })] },
    nair: { t: 40, air: 1, lag: 12, lb: 'b', hits: [H(8, 24, 0, 44, 0, 44, 50, 11, 45, 30, 80, { rad: 1 })] },
    fair: { t: 62, air: 1, lag: 22, lb: '2h', hits: [H(18, 23, 14, 118, 56, 6, 28, 16, 280, 28, 90, { fx: 'rock', v: [84, 90] })] },
    bair: { t: 36, air: 1, lag: 12, lb: 'f', hits: [H(7, 10, -36, 40, -86, 40, 24, 13, 140, 22, 95), H(11, 20, -40, 40, -80, 40, 18, 8, 140, 12, 90, { grp: 0 })] },
    uair: { t: 36, air: 1, lag: 12, lb: 'hd', hits: [H(6, 11, 0, 92, 0, 114, 28, 13, 88, 32, 92)] },
    dair: { t: 54, air: 1, lag: 20, lb: 'f', hits: [H(14, 19, 0, 6, 0, -16, 28, 16, 272, 22, 92)] },
    grab: { t: 36, hits: [H(8, 11, 40, 46, 66, 46, 20, 0, 0, 0, 0, { grab: 1 })] },
    fthrow: TH(30, 16, 9, 45, 70, 60), bthrow: TH(34, 18, 11, 140, 70, 72), uthrow: TH(32, 16, 9, 90, 75, 70), dthrow: TH(34, 20, 7, 80, 65, 35),
    nspecial: { t: 99999, any: 1, hits: [],
      start(S, f) { if (f.stored >= 100) startMove(S, f, 'qpunch'); },
      on(S, f) {
        f.stored = Math.min(100, f.stored + 1.1);
        if (f.mf > 6 && take(f, B)) { startMove(S, f, 'qpunch'); return; }
        if ((f.inp.b & SH) || f.stored >= 100) { if (f.stored >= 100) ev(S, { k: 'charged', x: f.x, y: f.y - 50 }); endMove(S, f); }
      } },
    qpunch: { t: 50, any: 1, hits: [H(14, 19, 36, 44, 88, 44, 30, 10, 40, 30, 80, { fx: 'rock', store: 1 })],
      on(S, f) { if (f.mf === 14 && f.grounded) f.vx = f.face * 4; if (f.mf === 49) f.stored = 0; } },
    sspecial: { t: 58, any: 1, lb: 'hd', hits: [H(20, 26, 36, 80, 56, 26, 26, 10, 280, 20, 80, { bury: 1, fx: 'rock', v: [64, 70] })],
      on(S, f) { if (f.mf >= 12 && f.mf <= 24 && f.grounded) f.vx = f.face * 4; } },
    uspecial: { t: 60, any: 1, helpless: 1, slide: 1, lb: 'b',
      hits: [H(6, 44, 52, 50, 52, 50, 26, 1.6, 85, 0, 0, { fix: 34, re: 6 }), H(6, 44, -52, 50, -52, 50, 26, 1.6, 95, 0, 0, { fix: 34, re: 6, grp: 0 }), H(46, 50, 0, 50, 0, 50, 62, 5, 50, 52, 110, { rad: 1, fx: 'rock' })],
      start(S, f) { if (!f.grounded) f.upUsed = true; },
      on(S, f) {
        if (f.mf === 6 && !f.grounded) f.vy = -11.5;
        if (f.mf >= 6 && f.mf <= 46) { f.vx = f.inp.x * (f.grounded ? 5.6 : 6.6); }
      } },
    dspecial: { t: 30, hits: [H(10, 13, 52, 14, 52, 14, 30, 6, 275, 22, 60, { air: 1, fx: 'rock' }), H(10, 13, -52, 14, -52, 14, 30, 6, 265, 22, 60, { air: 1, grp: 0, fx: 'rock' })], lb: '2h',
      on(S, f) {
        if (f.mf === 10) {
          for (const d of [-1, 1]) spawnProj(S, f, 'wave', f.x + d * 40, f.y, d * 10, 0, { life: 15, d: 8.5, a: 85, b: 46, g: 70, r: 20, gnd: 1, fx: 'rock' });
          ev(S, { k: 'quake', x: f.x, y: f.y });
        }
        if (f.mf === 26 && (f.inp.b & B) && f.loops < 4) { f.loops++; f.mf = 4; f.hitIds = []; }
      } },
    dspecialAir: { t: 46, any: 1, air: 1, lag: 16, lb: '2h', hits: [H(14, 30, 26, 16, 26, -14, 32, 12, 275, 25, 85, { fx: 'rock' })],
      start(S, f) { f.vy = -4; f.vx *= 0.4; },
      on(S, f) { if (f.mf === 13) f.vy = 12; } },
  }
}];
const MOVE_NAMES = { nspecial: 0, sspecial: 1, uspecial: 2, dspecial: 3 };

/* ---------- stages ---------- */
const STAGES = [
  { name: 'Skyhold', sub: 'One deck, two floaters, sheer cliff walls', blast: { l: -1150, r: 1150, t: -900, b: 560 },
    plats: [{ x: -430, y: 0, w: 860, h: 700, solid: 1, ledge: 1 }, { x: -310, y: -135, w: 190, soft: 1 }, { x: 120, y: -135, w: 190, soft: 1 }] },
  { name: 'Zenith Deck', sub: 'Flat. No excuses', blast: { l: -1250, r: 1250, t: -900, b: 560 },
    plats: [{ x: -520, y: 0, w: 1040, h: 700, solid: 1, ledge: 1 }] },
  { name: 'Neon City', sub: 'Floating towers to climb, moving platforms', blast: { l: -1300, r: 1300, t: -980, b: 580 },
    plats: [{ x: -380, y: 0, w: 760, h: 700, solid: 1, ledge: 1 },
      { x: -760, y: -250, w: 100, h: 360, solid: 1 }, { x: 660, y: -250, w: 100, h: 360, solid: 1 },
      { x: -590, y: -70, w: 150, soft: 1 }, { x: 440, y: -70, w: 150, soft: 1 },
      { x: -270, y: -150, w: 140, soft: 1, mv: { ax: 0, ay: 60, p: 300 } }, { x: 130, y: -150, w: 140, soft: 1, mv: { ax: 0, ay: -60, p: 300 } },
      { x: -75, y: -300, w: 150, soft: 1, mv: { ax: 250, ay: 0, p: 480 } }] },
  { name: 'Volcano Arena', sub: 'Lava eruptions, wall-jump shafts', hazard: 1, blast: { l: -1250, r: 1250, t: -900, b: 540 },
    plats: [{ x: -300, y: 0, w: 600, h: 700, solid: 1, ledge: 1 },
      { x: -700, y: 70, w: 230, h: 640, solid: 1, ledge: 1 }, { x: 470, y: 70, w: 230, h: 640, solid: 1, ledge: 1 },
      { x: -210, y: -150, w: 130, soft: 1 }, { x: 80, y: -150, w: 130, soft: 1 }, { x: -70, y: -290, w: 140, soft: 1 },
      { x: -640, y: -90, w: 130, soft: 1 }, { x: 510, y: -90, w: 130, soft: 1 }] },
];
function getPlats(S) {
  const st = STAGES[S.stage], out = [];
  for (const p of st.plats) {
    let x = p.x, y = p.y, dx = 0, dy = 0;
    if (p.mv) {
      const a = Math.sin(S.f / p.mv.p * 6.2832), b = Math.sin((S.f - 1) / p.mv.p * 6.2832);
      x += p.mv.ax * a; y += p.mv.ay * a; dx = p.mv.ax * (a - b); dy = p.mv.ay * (a - b);
    }
    out.push({ x, y, w: p.w, h: p.h || 14, solid: p.solid, soft: p.soft, ledge: p.ledge, dx, dy });
  }
  return out;
}

const ITEMS = ['bomb', 'boomerang', 'blaster', 'heart', 'boots', 'gauntlet', 'bubble', 'crate'];
const INSTANT = { heart: 1, boots: 1, gauntlet: 1, bubble: 1 };

/* ---------- game creation ---------- */
function newFighter(i, s) {
  return { id: i, ch: s.ch, cos: s.cos || 0, team: s.team || 0, name: s.name || ('P' + (i + 1)), cpu: s.cpu === undefined ? -1 : s.cpu,
    x: 0, y: 0, vx: 0, vy: 0, kvx: 0, kvy: 0, face: 1, grounded: false, plat: -1, jumps: 3, pct: 0, stocks: 3, kos: 0, falls: 0, dmg: 0, sd: 0,
    state: 'respawn', t: 0, move: '', mf: 0, hitIds: [], charge: 0, chgDone: false, loops: 0, hitlag: 0, hitstun: 0, stun: 0, lag: 0,
    shield: 50, invuln: 0, stored: 0, victim: -1, by: -1, grabT: 0, pumT: 0, bury: 0, ledgeS: 0, lx: 0, ly: 0, ledgeCd: 0, ledgeUsed: false,
    ff: false, dodged: false, upUsed: false, stall: false, drop: 0, ctr: 0, ax: 0, ay: 0, dn: 0, dashV: 0, runT: 0, parry: 0,
    inp: { x: 0, y: 0, b: 0 }, pb: 0, px: 0, py: 0, buf: { 1: 0, 2: 0, 4: 0, 8: 0, 16: 0, 32: 0 },
    spd: 0, pow: 0, armor: 0, item: -1, itemCd: 0, dead: 0, out: false, outAt: 0, lastBy: -1, lastF: -9999, aiT: 0, aiS: 0, aiJ: 0, aiX: 0, wallS: 0, wallF: -9, wallCd: 0, wallN: 0, conn: 0, chain: 0, cmb: 0, hitF: -99, djT: 0, gc: false, gcM: false, chaseD: 0 };
}
function newGame(cfg, slots, seed) {
  const S = { f: 0, rng: (seed || 12345) >>> 0, stage: cfg.stage | 0, cfg: Object.assign({ mode: 'stock', stocks: 3, time: 180, items: true, itemFreq: 2, hazards: true, teams: false, ff: false, training: false }, cfg),
    p: [], pr: [], it: [], ev: [], evN: 0, idN: 0, over: 0, res: null, timer: 0, itemT: 300, hz: { t: 400, x: 0, on: 0 }, start: 150 };
  S.timer = S.cfg.mode === 'time' ? S.cfg.time * 60 : 0;
  const P = getPlats(S), main = P[0], n = slots.length;
  slots.forEach((s, i) => {
    const f = newFighter(i, s);
    f.stocks = S.cfg.mode === 'time' || S.cfg.training ? 99 : S.cfg.stocks;
    f.x = main.x + main.w * (i + 1) / (n + 1); f.y = main.y; f.face = f.x < main.x + main.w / 2 ? 1 : -1;
    f.grounded = true; f.plat = 0; f.state = 'idle';
    S.p.push(f);
  });
  return S;
}

/* ---------- helpers ---------- */
function take(f, k) { if (f.buf[k] > 0) { f.buf[k] = 0; return true; } return false; }
function alive(f) { return !f.out && f.dead <= 0; }
function invul(f) {
  if (f.invuln > 0) return true;
  const s = f.state, t = f.t;
  return (s === 'roll' && t >= 2 && t <= 9) || (s === 'spot' && t >= 3 && t <= 18) || (s === 'airdodge' && t >= 3 && t <= 26) || s === 'climb' || s === 'respawn';
}
function rectOf(f) {
  const c = CH[f.ch]; let h = c.h;
  if (f.state === 'crouch') h *= 0.62; else if (f.state === 'buried') h *= 0.5;
  return { x: f.x - c.w / 2, y: f.y - h, w: c.w, h };
}
function circRect(cx, cy, r, R) {
  const nx = clamp(cx, R.x, R.x + R.w), ny = clamp(cy, R.y, R.y + R.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= r * r;
}
function hitLocal(f, h) {
  let p = clamp((f.mf - h.s) / Math.max(1, h.e - h.s), 0, 1), x, y;
  if (h.v) { const q = 1 - p; x = q * q * h.x0 + 2 * q * p * h.v[0] + p * p * h.x1; y = q * q * h.y0 + 2 * q * p * h.v[1] + p * p * h.y1; }
  else { x = h.x0 + (h.x1 - h.x0) * p; y = h.y0 + (h.y1 - h.y0) * p; }
  return [x, y];
}
function hitPos(f, h) { const l = hitLocal(f, h); return [f.x + f.face * l[0], f.y - l[1]]; }
function enemies(S, a, v) { return !(S.cfg.teams && a.team === v.team && !S.cfg.ff); }
function dropItem(S, f) {
  if (f.item < 0) return; const it = S.it.find(i => i.id === f.item); f.item = -1;
  if (it) { it.held = -1; it.vy = -5; it.vx = -f.face * 2; it.grounded = false; }
}

/* ---------- hit application ---------- */
function applyHit(S, att, vic, h, dir, px, py, mult, melee) {
  if (invul(vic) || vic.state === 'grabbed' && att && vic.by !== att.id && h.grab) return 0;
  if (h.gnd && !vic.grounded) return 0;
  if (h.air && vic.grounded) return 0;
  if (h.grab) {
    if (vic.state === 'grabbed' || vic.state === 'grabbing' || vic.state === 'carry' || vic.state === 'ledge' || vic.state === 'buried') return 0;
    att.victim = vic.id; setState(att, 'grabbing'); att.grabT = Math.min(170, 75 + vic.pct * 0.45); att.pumT = 0;
    vic.by = att.id; setState(vic, 'grabbed'); vic.vx = vic.vy = vic.kvx = vic.kvy = 0; vic.hitstun = 0; dropItem(S, vic);
    ev(S, { k: 'grab', x: px, y: py }); return 1;
  }
  if (h.push) { vic.kvx = clamp(vic.kvx + dir * h.push * 0.5, -11, 11); return 0; }
  let d = h.d * mult;
  if (att && att.pow > 0) d *= 1.4;
  /* counter */
  if (att && att !== vic && vic.state === 'attack') {
    const m = mv(vic);
    if (m.counter && vic.mf >= m.counter[0] && vic.mf <= m.counter[1]) {
      vic.ctr = clamp(d * 1.3, 8, 40); vic.face = sgn(att.x - vic.x) || vic.face;
      startMove(S, vic, 'riposte'); vic.invuln = 14; vic.hitlag = 10; if (melee) att.hitlag = 10;
      ev(S, { k: 'counter', x: vic.x, y: vic.y - 40 }); return 2;
    }
  }
  /* shield */
  if (vic.state === 'shield' || vic.state === 'shieldstun') {
    if (vic.state === 'shield' && vic.t <= 4) {
      vic.parry = 12; if (melee && att) att.hitlag = 16; vic.hitlag = 6;
      ev(S, { k: 'parry', x: px, y: py }); return 2;
    }
    vic.shield -= d + (h.sd || 0) * (att && h.sd ? 1 + (att.charge / 60) * 1.5 : 1);
    const hl = Math.min(12, Math.floor(d / 3 + 3));
    if (melee && att) att.hitlag = hl;
    if (vic.shield <= 0) {
      vic.shield = 0; setState(vic, 'dizzy'); vic.grounded = false; vic.vy = -9; vic.vx = 0;
      ev(S, { k: 'break', x: vic.x, y: vic.y - 30 }); return 2;
    }
    setState(vic, 'shieldstun'); vic.stun = Math.floor(d * 0.8 + 3); vic.hitlag = hl; vic.kvx = dir * Math.min(8, 1 + d * 0.35);
    ev(S, { k: 'shield', x: px, y: py }); return 2;
  }
  if (!h.fix) vic.cmb = (vic.state === 'hitstun' || S.f - vic.hitF < 24) ? vic.cmb + 1 : 1;
  vic.hitF = S.f;
  vic.pct = Math.min(999, vic.pct + d);
  if (att && att !== vic) att.dmg += d;
  if (att && att !== vic) { vic.lastBy = att.id; vic.lastF = S.f; }
  if (h.flip) { vic.face = -vic.face; vic.vx = -vic.vx; }
  if (vic.armor > 0) { vic.armor -= d; if (vic.armor <= 0) { vic.armor = 0; ev(S, { k: 'break', x: vic.x, y: vic.y - 30 }); } ev(S, { k: 'hit', x: px, y: py, d, kb: 0, fx: h.fx, id: vic.id }); return 1; }
  if (h.nokb) { vic.hitlag = 3; ev(S, { k: 'hit', x: px, y: py, d, kb: 0, fx: h.fx, id: vic.id }); return 1; }
  if (h.bury && vic.grounded) {
    setState(vic, 'buried'); vic.bury = Math.min(170, 55 + vic.pct * 0.7); vic.vx = vic.kvx = vic.kvy = 0; vic.hitstun = 0; vic.hitlag = 8; if (melee) att.hitlag = 8;
    ev(S, { k: 'hit', x: px, y: py, d, kb: 60, fx: 'rock', id: vic.id }); ev(S, { k: 'quake', x: vic.x, y: vic.y }); return 1;
  }
  const w = CH[vic.ch].wt, p = vic.pct;
  let g = h.g; if (h.store && att) g *= 1 + att.stored / 100 * 0.35;
  let kb = h.fix ? h.fix : ((p / 10 + p * d / 20) * 200 / (w + 100) * 1.4 + 18) * g / 100 + h.b;
  if (mult > 1.3 && h.tp) kb *= 1.15;
  if (vic.state === 'crouch') kb *= 0.85;
  let ang = h.a * Math.PI / 180, cx = Math.cos(ang) * dir, cy = -Math.sin(ang);
  if (!h.fix) { const I = vic.inp, cr = cx * I.y - cy * I.x, a2 = Math.atan2(cy, cx) + clamp(cr, -1, 1) * 0.17; cx = Math.cos(a2); cy = Math.sin(a2); }
  const v = kb * 0.15;
  let kx = cx * v, ky = cy * v;
  if (vic.grounded) { if (ky > 0.5) ky = -ky * 0.8; if (ky < -1.2) vic.grounded = false; else ky = 0; }
  vic.kvx = kx; vic.kvy = ky; vic.vx *= 0.2; vic.vy = 0; vic.ff = false;
  setState(vic, 'hitstun'); vic.hitstun = Math.max(3, Math.floor(kb * 0.4) + (h.fix ? 0 : 6));
  vic.upUsed = false; vic.dodged = false; vic.ledgeUsed = false; vic.stall = false; vic.bury = 0;
  let hl = h.fix ? 2 : Math.min(20, Math.floor(d / 2.6 + 3)); if (h.fx === 'elec' && !h.fix) hl = Math.floor(hl * 1.4);
  vic.hitlag = hl; if (melee && att) att.hitlag = hl;
  if (kb > 70) dropItem(S, vic);
  ev(S, { k: 'hit', x: px, y: py, d, kb, fx: h.fx, id: vic.id, cmb: h.fix ? 0 : vic.cmb, kx, ky, tip: mult > 1.3 && h.tp ? 1 : 0, vx: vic.x, vy: vic.y });
  return 1;
}

/* ---------- actions ---------- */
function pickMoveDir(I) {
  const [ax, ay] = stickDir(I);
  if (ay && (!ax || Math.abs(I.y) >= Math.abs(I.x))) return ay < 0 ? 'u' : 'd';
  return ax ? 'f' : 'n';
}
function specialName(S, f) {
  const I = f.inp, d = pickMoveDir(I), [ax] = stickDir(I);
  if (ax) f.face = ax;
  if (d === 'u') { if (f.upUsed) return null; return 'uspecial'; }
  return d === 'd' ? 'dspecial' : d === 'f' ? 'sspecial' : 'nspecial';
}
function nearItem(S, f) {
  for (const it of S.it) if (it.held < 0 && it.thrown < 0 && !INSTANT[it.type] && Math.abs(it.x - f.x) < 46 && Math.abs(it.y - (f.y - 20)) < 60) return it;
  return null;
}
function useItem(S, f, forceThrow) {
  const it = S.it.find(i => i.id === f.item); if (!it) { f.item = -1; return false; }
  if (it.type === 'blaster' && !forceThrow && it.ammo > 0) {
    if (f.itemCd > 0) return true;
    it.ammo--; f.itemCd = 14;
    spawnProj(S, f, 'shot', f.x + f.face * 30, f.y - CH[f.ch].h * 0.55, f.face * 16, 0, { life: 46, d: 4, a: 30, b: 10, g: 18, r: 8, fx: 'elec' });
    ev(S, { k: 'cast', x: f.x + f.face * 30, y: f.y - CH[f.ch].h * 0.55, fx: 'elec' });
    startMove(S, f, 'itemuse'); return true;
  }
  const d = pickMoveDir(f.inp); const [ax] = stickDir(f.inp); if (ax) f.face = ax;
  it.held = -1; it.thrown = f.id; it.tT = 0; it.hit = []; it.grounded = false; f.item = -1;
  it.x = f.x + f.face * 20; it.y = f.y - CH[f.ch].h * 0.6;
  if (d === 'u') { it.vx = 0; it.vy = -16; } else if (d === 'd') { it.vx = 0; it.vy = 13; } else { it.vx = f.face * 14; it.vy = -3.5; }
  if (it.type === 'boomerang') { it.vy = d === 'u' ? -13 : d === 'd' ? 11 : -0.5; it.ret = 0; it.ox = it.vx; it.oy = it.vy; }
  startMove(S, f, 'itemthrow'); return true;
}
function startDash(S, f, ax, chase) { setState(f, 'roll'); f.ax = ax; f.face = ax; f.chaseD = chase ? 1 : 0; ev(S, { k: 'dust', x: f.x, y: f.y, big: 1 }); }
function groundActions(S, f, noShield) {
  const I = f.inp, d = pickMoveDir(I), [ax, ay] = stickDir(I);
  if (take(f, GR)) { if (f.item >= 0) return useItem(S, f, true); if (ax) f.face = ax; startMove(S, f, 'grab'); return true; }
  if (take(f, B)) { const n = specialName(S, f); if (n) { startMove(S, f, n); return true; } }
  if (take(f, C)) { if (ax) f.face = ax; startMove(S, f, d === 'u' ? 'usmash' : d === 'd' ? 'dsmash' : 'fsmash'); return true; }
  if (take(f, A)) {
    if (f.item >= 0) return useItem(S, f, false);
    const it = nearItem(S, f); if (it) { it.held = f.id; f.item = it.id; ev(S, { k: 'pick', x: it.x, y: it.y }); return true; }
    if (ax) f.face = ax; startMove(S, f, d === 'u' ? 'utilt' : d === 'd' ? 'dtilt' : d === 'f' ? 'ftilt' : 'jab'); return true;
  }
  if (take(f, J)) {
    const P = S._P, p = P[f.plat];
    if (ay > 0 && p && p.soft) { f.grounded = false; f.drop = 14; f.y += 3; f.vy = 2; setState(f, 'air'); f.jumps = CH[f.ch].jumps - 1; return true; }
    setState(f, 'jumpsquat'); return true;
  }
  if (take(f, SH) && ax) { startDash(S, f, ax, noShield); return true; }
  if (!noShield && (I.b & SH) && f.shield > 5) { setState(f, 'shield'); return true; }
  return false;
}
function airActions(S, f) {
  const I = f.inp, c = CH[f.ch], d = pickMoveDir(I), [ax] = stickDir(I);
  if (take(f, B)) { const n = specialName(S, f); if (n) { startMove(S, f, n); return true; } }
  const a = take(f, A), cs = !a && take(f, C);
  if (a || cs) {
    if (f.item >= 0 && a) return useItem(S, f, false);
    if (a) { const it = nearItem(S, f); if (it) { it.held = f.id; f.item = it.id; ev(S, { k: 'pick', x: it.x, y: it.y }); return true; } }
    startMove(S, f, d === 'u' ? 'uair' : d === 'd' ? 'dair' : d === 'f' ? (ax === f.face ? 'fair' : 'bair') : 'nair'); return true;
  }
  if (take(f, GR) && f.item >= 0) return useItem(S, f, true);
  if (take(f, J) && f.jumps > 0) {
    f.jumps--; f.vy = -c.dj; f.ff = false; f.djT = 16; if (ax) { f.vx = ax * c.air * 0.9; } ev(S, { k: 'djump', x: f.x, y: f.y }); return true;
  }
  if (take(f, SH) && !f.dodged) {
    f.dodged = true; setState(f, 'airdodge'); const m = Math.hypot(I.x, I.y); f.gc = m <= 0.4; f.chaseD = 0;
    if (m > 0.4) { f.vx = I.x / m * 9; f.vy = I.y / m * 9; } else { f.vx *= 0.5; f.vy = 0; }
    f.ff = false; return true;
  }
  return false;
}
function airDrift(f, c, k) {
  const I = f.inp, sp = c.air * (f.spd > 0 ? 1.3 : 1);
  if (Math.abs(I.x) > 0.25) { f.vx += I.x * c.aacc * (k || 1); if (Math.abs(f.vx) > sp) f.vx = f.vx > 0 ? Math.max(sp, f.vx - c.aacc * 1.5) : Math.min(-sp, f.vx + c.aacc * 1.5); }
  else f.vx *= 0.97;
  if (!f.ff && f.vy > 0 && I.y > 0.6 && f.py <= 0.6) f.ff = true;
}
function onLand(S, f) {
  const c = CH[f.ch];
  f.grounded = true; f.jumps = c.jumps; f.upUsed = false; f.dodged = false; f.ledgeUsed = false; f.stall = false; f.wallN = 0; f.djT = 0;
  const wasFF = f.ff; f.ff = false; f.drop = 0;
  ev(S, { k: 'dust', x: f.x, y: f.y });
  const s = f.state;
  if (s === 'air' || s === 'wall') { setState(f, 'land'); f.lag = wasFF ? 4 : 2; }
  else if (s === 'helpless') { setState(f, 'land'); f.lag = 12; }
  else if (s === 'airdodge') { setState(f, 'land'); f.lag = 10; }
  else if (s === 'attack') { const m = mv(f); if (m.air || m.landEnd) { if (f.mf > 3 || m.landEnd) { if (m.landEnd && f.mf < 8) return; setState(f, 'land'); f.lag = Math.round((m.lag || 10) * (m.air ? 0.7 : 1)); } else { setState(f, 'land'); f.lag = 3; } } }
  else if (s === 'carry') { }
}
const GROUND_ST = { idle: 1, walk: 1, crouch: 1, land: 1, jumpsquat: 1, shielddrop: 1 };
const CLAMP_ST = { shield: 1, shieldstun: 1, roll: 1, spot: 1, grabbing: 1, buried: 1, dizzy: 1, climb: 1 };

/* ---------- physics ---------- */
function phys(S, f, P) {
  const c = CH[f.ch], hw = c.w / 2;
  const km = Math.hypot(f.kvx, f.kvy);
  if (km > 0) { const n = Math.max(0, km - 0.26) / km; f.kvx *= n; f.kvy *= n; }
  if (f.drop > 0) f.drop--;
  if (f.grounded) {
    let p = P[f.plat];
    if (p) { f.x += p.dx; f.y = p.y; }
    f.x += f.vx + f.kvx;
    for (let qi = 0; qi < P.length; qi++) { const q = P[qi]; if (!q.solid || qi === f.plat) continue;
      if (f.x + hw > q.x && f.x - hw < q.x + q.w && f.y > q.y + 8 && f.y - c.h < q.y + q.h) { const left = f.x < q.x + q.w / 2; f.x = left ? q.x - hw : q.x + q.w + hw; if (f.state === 'hitstun') f.kvx *= -0.6; else { f.vx = 0; f.kvx = 0; } } }
    if (f.kvy < 0 && f.state === 'hitstun') f.grounded = false;
    else {
      f.kvy = 0; f.vy = 0;
      if (f.state === 'hitstun') f.kvx *= 0.9;
      if (!p || f.x < p.x || f.x > p.x + p.w) {
        let q = -1; for (let i = 0; i < P.length; i++) if (Math.abs(P[i].y - f.y) < 2 && f.x >= P[i].x && f.x <= P[i].x + P[i].w) q = i;
        const isAtk = f.state === 'attack', m = isAtk ? mv(f) : null;
        if (q >= 0) f.plat = q;
        else if (p && (CLAMP_ST[f.state] || (isAtk && !m.slide))) { f.x = clamp(f.x, p.x + 1, p.x + p.w - 1); f.vx = 0; f.kvx = 0; }
        else { f.grounded = false; f.plat = -1; f.jumps = Math.min(f.jumps, c.jumps - 1); if (GROUND_ST[f.state]) setState(f, 'air'); }
      }
    }
    if (f.grounded) return;
  }
  if (!f.noG) { f.vy += c.grav; const mx = f.ff ? c.ff : c.fall; if (f.vy > mx) f.vy = mx; }
  const py = f.y, dy = f.vy + f.kvy;
  f.x += f.vx + f.kvx; f.y += dy;
  if (dy >= 0) {
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (py <= p.y - p.dy + 1 && f.y >= p.y && f.x >= p.x && f.x <= p.x + p.w) {
        if (p.soft && (f.drop > 0 || (f.inp.y > 0.6 && f.state !== 'hitstun' && f.state !== 'helpless' && f.state !== 'attack'))) continue;
        f.y = p.y; f.plat = i;
        if (f.state === 'hitstun' && f.hitstun > 0 && Math.hypot(f.kvx, f.kvy) > 7 && f.kvy > 2) { f.kvy *= -0.8; f.vy = 0; f.y -= 1; ev(S, { k: 'dust', x: f.x, y: f.y, big: 1 }); }
        else { f.vy = 0; f.kvy = 0; onLand(S, f); }
        break;
      }
    }
  }
  if (!f.grounded) for (const p of P) {
    if (!p.solid) continue;
    if (f.x + hw > p.x && f.x - hw < p.x + p.w && f.y > p.y + 8 && f.y - c.h < p.y + p.h) {
      if (py - c.h >= p.y + p.h - 2 && dy < 0) { f.y = p.y + p.h + c.h; if (f.state === 'hitstun') f.kvy = Math.abs(f.kvy) * 0.8; f.vy = Math.max(0, f.vy); }
      else {
        const left = f.x < p.x + p.w / 2; f.x = left ? p.x - hw : p.x + p.w + hw;
        if (f.state === 'hitstun' && Math.abs(f.kvx) > 5) { f.kvx *= -0.75; ev(S, { k: 'dust', x: f.x, y: f.y - 20, big: 1 }); } else { if (left ? f.vx + f.kvx > 0 : f.vx + f.kvx < 0) { f.vx = 0; f.kvx = 0; } if (f.state !== 'hitstun') { f.wallS = left ? 1 : -1; f.wallF = S.f; } }
      }
    }
  }
}
function tryLedge(S, f, P) {
  if (f.grounded || f.ledgeCd > 0 || f.vy + f.kvy < -1 || f.inp.y > 0.6) return;
  const s = f.state; if (!(s === 'air' || s === 'helpless' || s === 'wall' || (s === 'attack' && mv(f).helpless && f.mf > 14))) return;
  const c = CH[f.ch], top = f.y - c.h;
  for (const p of P) {
    if (!p.ledge) continue;
    for (const side of [-1, 1]) {
      const lx = side < 0 ? p.x : p.x + p.w;
      const rel = (f.x - lx) * side;
      if (rel > -6 && rel < 44 + c.w / 2 && top > p.y - 34 && top < p.y + 30) {
        if (S.p.some(o => o !== f && o.state === 'ledge' && o.lx === lx && o.ly === p.y)) continue;
        setState(f, 'ledge'); f.ledgeS = side; f.lx = lx; f.ly = p.y; f.x = lx + side * (c.w / 2 + 2); f.y = p.y + c.h * 0.88;
        f.vx = f.vy = f.kvx = f.kvy = 0; f.face = -side; f.jumps = Math.max(f.jumps, 1); f.upUsed = false; f.dodged = false; f.ff = false; f.stall = false;
        f.wallN = 0;
        if (!f.ledgeUsed) { f.invuln = 36; f.ledgeUsed = true; }
        ev(S, { k: 'ledge', x: lx, y: p.y }); return;
      }
    }
  }
}

/* ---------- KO ---------- */
function ko(S, f, B_) {
  ev(S, { k: 'ko', x: clamp(f.x, B_.l, B_.r), y: clamp(f.y, B_.t, B_.b), id: f.id, ch: f.ch, name: f.name });
  f.falls++;
  const k = S.p[f.lastBy];
  if (k && k !== f && S.f - f.lastF < 600) k.kos++; else f.sd++;
  dropItem(S, f);
  if (f.victim >= 0) f.victim = -1;
  if (S.cfg.mode !== 'time' && !S.cfg.training) f.stocks--;
  f.lastBy = -1; f.pct = 0; f.spd = f.pow = f.armor = 0; f.stored = 0; f.kvx = f.kvy = f.vx = f.vy = 0; f.hitstun = 0; f.hitlag = 0;
  if (f.stocks <= 0) { f.out = true; f.outAt = S.f; f.dead = 0; f.state = 'dead'; f.x = 0; f.y = -9999; }
  else { f.dead = 70; f.state = 'dead'; f.x = 0; f.y = -9999; }
}

/* ---------- fighter update ---------- */
function upd(S, f, P) {
  const c = CH[f.ch], I = f.inp;
  const pr = I.b & ~f.pb; f.pb = I.b;
  for (const k of BK) { if (pr & k) f.buf[k] = 7; else if (f.buf[k] > 0) f.buf[k]--; }
  if (f.out) return;
  if (f.dead > 0) {
    if (--f.dead <= 0) {
      const main = P[0]; f.x = main.x + main.w / 2 + ((f.id % 4) - 1.5) * 70; f.y = main.y - 330; f.vx = f.vy = 0; f.grounded = false;
      setState(f, 'respawn'); f.shield = 50; f.jumps = c.jumps; f.face = f.x < main.x + main.w / 2 ? 1 : -1; f.upUsed = false; f.dodged = false;
      ev(S, { k: 'respawn', x: f.x, y: f.y });
    }
    f.px = I.x; f.py = I.y; return;
  }
  if (f.invuln > 0) f.invuln--; if (f.ledgeCd > 0) f.ledgeCd--; if (f.spd > 0) f.spd--; if (f.pow > 0) f.pow--; if (f.itemCd > 0) f.itemCd--; if (f.parry > 0) f.parry--; if (f.wallCd > 0) f.wallCd--; if (f.djT > 0) f.djT--;
  if (f.state !== 'shield' && f.state !== 'shieldstun' && f.shield < 50) f.shield = Math.min(50, f.shield + 0.07);
  if (f.hitlag > 0) { f.hitlag--; f.px = I.x; f.py = I.y; return; }
  const [ax, ay] = stickDir(I);
  const flickX = Math.abs(I.x) > 0.6 && Math.abs(f.px) <= 0.6, flickY = Math.abs(I.y) > 0.6 && Math.abs(f.py) <= 0.6;
  const spdM = f.spd > 0 ? 1.35 : 1;
  let doPhys = true;
  f.t++; f.noG = false;
  switch (f.state) {
    case 'idle': case 'walk': case 'crouch': {
      if (groundActions(S, f)) break;
      if (ay > 0 && !ax) { if (f.state !== 'crouch') setState(f, 'crouch'); f.vx *= 0.8; f.runT = 0; break; }
      if (Math.abs(I.x) > 0.25) {
        f.face = sgn(I.x); if (f.state !== 'walk') setState(f, 'walk');
        const full = Math.abs(I.x) > 0.75; f.runT = full ? f.runT + 1 : 0;
        if (full && flickX) { f.vx = f.face * c.run * 1.3 * spdM; ev(S, { k: 'dust', x: f.x, y: f.y }); }
        const target = (full ? c.run : c.walk * Math.max(0.5, Math.abs(I.x))) * spdM * f.face;
        if (Math.abs(target - f.vx) <= c.acc) f.vx = target; else f.vx += sgn(target - f.vx) * c.acc;
      } else { f.runT = 0; f.vx *= 0.76; if (Math.abs(f.vx) < 0.1) f.vx = 0; if (f.state !== 'idle') setState(f, 'idle'); }
      break;
    }
    case 'jumpsquat': {
      f.vx *= 0.9;
      if (f.t >= 3) { f.grounded = false; f.vy = (I.b & J) ? -c.jump : -c.sh; f.jumps = c.jumps - 1; if (ax) f.vx = clamp(f.vx + ax * 1.5, -c.run, c.run); setState(f, 'air'); ev(S, { k: 'dust', x: f.x, y: f.y }); }
      break;
    }
    case 'air': { if (!airActions(S, f)) airDrift(f, c); else airDrift(f, c); break; }
    case 'helpless': { airDrift(f, c, 0.7); break; }
    case 'land': { f.vx *= 0.8; if (f.t >= f.lag) { setState(f, 'idle'); } break; }
    case 'attack': {
      const m = mv(f); let hold = false;
      if (f.gcM && !f.grounded) { f.noG = true; f.vy = 0; f.vx *= 0.9; }
      if (m.chg && f.mf === m.chg[0] && !f.chgDone) { if ((I.b & m.chg[2]) && f.charge < m.chg[1]) { f.charge++; hold = true; } else { f.chgDone = true; if (f.charge > 10) ev(S, { k: 'release', x: f.x, y: f.y - c.h / 2 }); } }
      if (!hold) {
        f.mf++;
        for (let hi = 0; hi < m.hits.length; hi++) { const h = m.hits[hi]; if (h.re && f.mf > h.s && f.mf <= h.e && (f.mf - h.s) % h.re === 0) { const g = h.grp === undefined ? hi : h.grp; f.hitIds = f.hitIds.filter(k => k % 10 !== g); } }
      }
      if (f.grounded) { if (!m.keepV) f.vx *= 0.82; } else if (m.air || m.any) { if (!m.helpless || f.mf > 24) airDrift(f, c, m.air ? 1 : 0.5); }
      if (m.on && f.state === 'attack' && mv(f) === m) m.on(S, f, m);
      if (f.state === 'attack' && mv(f) === m && f.conn && f.chain < 3 && !m.th && !m.helpless && !m.counter && m.hits.length && !m.hits[0].grab) {
        let le = 0; for (const h of m.hits) if (h.e > le) le = h.e;
        if (f.mf > le + 1) {
          const ch = f.chain; let acted;
          if (f.grounded) acted = groundActions(S, f, true);
          else { acted = airActions(S, f); if (acted && f.state === 'attack' && mv(f) === m && f.mf > 0) setState(f, 'air'); if (f.state === 'airdodge') f.chaseD = 1; }
          if (acted) { f.chain = ch + 1; break; }
        }
      }
      if (f.state === 'attack' && mv(f) === m) {
        if (m.th && f.mf === m.th.rel) {
          const v = S.p[f.victim];
          if (v && v.state === 'grabbed' && v.by === f.id) {
            v.state = 'air'; v.by = -1; v.grounded = false; v.x = f.x + f.face * (Math.cos(m.th.a * Math.PI / 180) >= 0 ? 1 : -1) * (c.w / 2 + 6); v.y = f.y - 8;
            applyHit(S, f, v, { d: m.th.d, a: m.th.a, b: m.th.b, g: m.th.g, fx: m.fx }, f.face, v.x, v.y - 30, 1, false);
          }
          f.victim = -1;
        }
        if (f.mf >= m.t) endMove(S, f);
      }
      break;
    }
    case 'shield': {
      f.vx *= 0.7; f.shield -= 0.14;
      if (f.shield <= 0) { f.shield = 0; setState(f, 'dizzy'); f.grounded = false; f.vy = -9; ev(S, { k: 'break', x: f.x, y: f.y - 30 }); break; }
      if (take(f, J)) { setState(f, 'jumpsquat'); break; }
      if (take(f, GR) || take(f, A)) { startMove(S, f, 'grab'); break; }
      if (f.t > 2 && flickX) { setState(f, 'roll'); f.ax = sgn(I.x); break; }
      if (f.t > 2 && ay > 0 && flickY) { setState(f, 'spot'); break; }
      if (!(I.b & SH)) { if (f.parry > 0) setState(f, 'idle'); else setState(f, 'shielddrop'); }
      break;
    }
    case 'shielddrop': { f.vx *= 0.7; if (f.t >= 7) setState(f, 'idle'); break; }
    case 'shieldstun': { if (f.t >= f.stun) { f.state = 'shield'; f.t = 10; } break; }
    case 'roll': {
      f.vx = f.t <= 11 ? f.ax * 10.5 : f.vx * 0.8;
      if (f.t >= (f.chaseD ? 7 : 12)) { const cd = f.chaseD; f.chaseD = 0; if (groundActions(S, f, true)) break; f.chaseD = cd; }
      if (f.t >= 20) { f.chaseD = 0; setState(f, Math.abs(I.x) > 0.25 ? 'walk' : 'idle'); }
      break;
    }
    case 'spot': { f.vx = 0; if (f.t >= 24) setState(f, 'idle'); break; }
    case 'airdodge': {
      if (f.t < 18) { f.noG = true; f.vx *= 0.9; f.vy *= 0.9; } else airDrift(f, c, 0.6);
      if (f.gc && f.t >= 2 && f.t <= 22) {
        const a = take(f, A), cs = !a && take(f, C);
        if (a || cs) { const d = pickMoveDir(I); if (ax) f.face = ax; startMove(S, f, a ? (d === 'u' ? 'utilt' : d === 'd' ? 'dtilt' : d === 'f' ? 'ftilt' : 'jab') : (d === 'u' ? 'usmash' : d === 'd' ? 'dsmash' : 'fsmash')); f.gcM = true; f.vy = 0; break; }
      }
      if (f.chaseD && f.t >= 10 && airActions(S, f)) { if (f.state === 'airdodge') setState(f, 'air'); f.chaseD = 0; break; }
      if (f.t >= 36) setState(f, 'air'); break;
    }
    case 'hitstun': {
      f.hitstun--;
      if (f.hitstun <= 0) { if (f.grounded) setState(f, 'idle'); else setState(f, 'air'); }
      break;
    }
    case 'dizzy': { f.vx *= 0.8; if (f.t >= 200) { f.shield = 30; setState(f, f.grounded ? 'idle' : 'air'); } break; }
    case 'buried': { f.vx = 0; if (f.t >= f.bury) { f.grounded = false; f.vy = -7; setState(f, 'air'); ev(S, { k: 'dust', x: f.x, y: f.y, big: 1 }); } doPhys = f.t >= f.bury; break; }
    case 'ledge': {
      doPhys = false; f.x = f.lx + f.ledgeS * (c.w / 2 + 2); f.y = f.ly + c.h * 0.88;
      const toward = ax === -f.ledgeS, away = ax === f.ledgeS;
      if (f.t > 8) {
        if (take(f, J)) { f.vy = -c.jump * 1.05; f.vx = -f.ledgeS * 1.5; f.ledgeCd = 30; setState(f, 'air'); }
        else if (take(f, SH)) { setState(f, 'climb'); f.dn = 1; }
        else if (ay < 0 || toward || take(f, A)) { setState(f, 'climb'); f.dn = 0; }
        else if (ay > 0 || away || f.t > 300) { f.ledgeCd = 30; f.vy = 1; setState(f, 'air'); }
      }
      break;
    }
    case 'climb': {
      doPhys = false;
      if (f.t >= 20) {
        f.x = f.lx - f.ledgeS * (c.w / 2 + 8 + (f.dn ? 110 : 0)); f.y = f.ly; f.grounded = true; f.jumps = c.jumps; f.vx = f.vy = 0; f.invuln = 4;
        for (let i = 0; i < P.length; i++) if (Math.abs(P[i].y - f.y) < 2 && f.x >= P[i].x && f.x <= P[i].x + P[i].w) f.plat = i;
        setState(f, 'idle');
      }
      break;
    }
    case 'grabbing': {
      f.vx *= 0.7; const v = S.p[f.victim];
      if (!v || v.state !== 'grabbed' || v.by !== f.id) { f.victim = -1; setState(f, 'idle'); break; }
      if (f.pumT > 0) f.pumT--;
      if (f.t >= f.grabT) { v.state = 'air'; v.by = -1; v.grounded = false; v.vy = -5; v.vx = f.face * 3; f.victim = -1; setState(f, 'land'); f.lag = 20; break; }
      if (f.t > 8) {
        if (f.ch === 3 && take(f, B)) { setState(f, 'carry'); f.grabT += 60; f.t = 9; break; }
        if (take(f, A) && f.pumT <= 0) { f.pumT = 14; v.pct += c.pm; f.dmg += c.pm; v.lastBy = f.id; v.lastF = S.f; ev(S, { k: 'hit', x: v.x, y: v.y - 30, d: c.pm, kb: 0, id: v.id }); break; }
        if (flickX || flickY || (f.t === 9 && (ax || ay))) {
          const d = pickMoveDir(I);
          if (d !== 'n') { const nm = d === 'u' ? 'uthrow' : d === 'd' ? 'dthrow' : (ax === f.face ? 'fthrow' : 'bthrow'); const vi = f.victim; startMove(S, f, nm); f.victim = vi; }
        }
      }
      break;
    }
    case 'carry': {
      const v = S.p[f.victim];
      if (!v || v.state !== 'grabbed' || v.by !== f.id) { f.victim = -1; setState(f, f.grounded ? 'idle' : 'air'); break; }
      if (f.t >= f.grabT) { v.state = 'air'; v.by = -1; v.grounded = false; v.vy = -6; f.victim = -1; setState(f, f.grounded ? 'idle' : 'air'); break; }
      if (f.grounded) { if (ax) { f.face = ax; f.vx = ax * c.walk * 1.1; } else f.vx *= 0.7; if (take(f, J)) { f.grounded = false; f.vy = -c.jump * 0.85; f.jumps = 0; } }
      else airDrift(f, c, 0.8);
      if (take(f, A) || take(f, GR) || take(f, C)) {
        const d = pickMoveDir(I); const nm = d === 'u' ? 'uthrow' : d === 'd' ? 'dthrow' : (d === 'f' && ax !== f.face ? 'bthrow' : 'fthrow');
        const vi = f.victim, g = f.grounded; f.state = 'attack'; f.t = 0; f.move = nm; f.mf = 0; f.hitIds = []; f.charge = 0; f.victim = vi;
      }
      break;
    }
    case 'grabbed': {
      doPhys = false; const g = S.p[f.by];
      const ok = g && g.victim === f.id && alive(g) && (g.state === 'grabbing' || g.state === 'carry' || (g.state === 'attack' && mv(g).th));
      if (!ok) { f.by = -1; f.grounded = false; f.vy = -4; setState(f, 'air'); break; }
      const gc = CH[g.ch];
      if (g.state === 'carry' || (g.state === 'attack' && g.move === 'uthrow')) { f.x = g.x; f.y = g.y - gc.h + 6; }
      else if (g.state === 'attack' && g.move === 'bthrow') { const p = Math.min(1, g.mf / mv(g).th.rel); f.x = g.x + g.face * (gc.w / 2 + c.w / 2) * Math.cos(p * Math.PI); f.y = g.y - Math.sin(p * Math.PI) * gc.h * 0.8; }
      else if (g.state === 'attack' && g.move === 'dthrow') { f.x = g.x + g.face * (gc.w / 2 + 6); f.y = g.y; }
      else { f.x = g.x + g.face * (gc.w / 2 + c.w / 2 - 4); f.y = g.y - (g.ch === 3 ? 14 : 0); }
      f.face = -g.face; f.grounded = false;
      break;
    }
    case 'wall': {
      doPhys = false; const hw = c.w / 2; let on = false;
      for (const p of P) if (p.solid && (f.wallS > 0 ? Math.abs(f.x + hw - p.x) < 5 : Math.abs(f.x - hw - (p.x + p.w)) < 5) && f.y - 8 > p.y && f.y - c.h + 8 < p.y + p.h) { on = true; f.x = f.wallS > 0 ? p.x - hw : p.x + p.w + hw; }
      f.face = -f.wallS; f.vx = 0; f.kvx = f.kvy = 0;
      if (!on) { setState(f, 'air'); doPhys = true; break; }
      if (take(f, J)) {
        f.vy = -c.jump * Math.max(0.62, 1 - 0.09 * (f.wallN - 1)); f.vx = -f.wallS * (ay < 0 ? 2.4 : ax === f.wallS ? 3.4 : 6.2); f.wallCd = 9; f.ff = false;
        setState(f, 'air'); ev(S, { k: 'walljump', x: f.x + f.wallS * hw, y: f.y - c.h / 2, d: -f.wallS }); doPhys = true; break;
      }
      if (ax === -f.wallS && f.t > 5) { f.vx = -f.wallS * 2.5; f.wallCd = 12; setState(f, 'air'); doPhys = true; break; }
      if (airActions(S, f)) { f.wallCd = 12; if (f.state === 'wall') setState(f, 'air'); doPhys = true; break; }
      f.vy = I.y > 0.6 ? 7 : f.t > 140 ? 4.5 : f.t < 10 ? 0.4 : 1.5; f.y += f.vy;
      if (f.t % 6 === 0 && f.vy > 1) ev(S, { k: 'slide', x: f.x + f.wallS * hw, y: f.y - c.h * 0.4 });
      tryLedge(S, f, P);
      break;
    }
    case 'respawn': {
      doPhys = false; f.vx = f.vy = 0;
      if (f.t > 20 && (ax || ay || I.b) || f.t > 170) { setState(f, 'air'); f.invuln = 100; }
      break;
    }
  }
  if (doPhys && f.state !== 'grabbed' && f.state !== 'ledge' && f.state !== 'climb' && f.state !== 'respawn') {
    phys(S, f, P); tryLedge(S, f, P);
    if ((f.state === 'air' || f.state === 'helpless') && !f.grounded && f.wallF === S.f && f.wallCd <= 0 && f.vy > -5 && I.y < 0.6 && I.x * f.wallS > -0.4) {
      setState(f, 'wall'); f.vx = 0; f.vy = Math.min(f.vy, 1); f.ff = false; f.djT = 0;
      if (f.wallN < 5) { f.jumps = Math.max(f.jumps, c.jumps - 1); f.upUsed = false; f.dodged = false; }
      f.wallN++;
    }
  }
  f.px = I.x; f.py = I.y;
}

/* ---------- melee hit detection ---------- */
function melee(S) {
  for (const f of S.p) {
    if (!alive(f) || f.state !== 'attack') continue;
    const m = mv(f);
    for (let hi = 0; hi < m.hits.length; hi++) {
      const h = m.hits[hi]; if (f.mf < h.s || f.mf > h.e) continue;
      const grp = h.grp === undefined ? hi : h.grp, pos = hitPos(f, h);
      let mult = 1;
      if (m.chg) mult = 1 + (f.charge / m.chg[1]) * (m.chgM || 0.4);
      if (h.store) mult = (10 + f.stored * 0.18) / 10;
      if (h.ctrD) mult = 1;
      if (h.refl) {
        for (const p of S.pr) if (p.o !== f.id && Math.hypot(p.x - pos[0], p.y - pos[1]) < h.r + p.r) { p.o = f.id; p.vx = -p.vx * 1.3; p.d *= 1.4; p.hit = []; p.life = Math.max(p.life, 60); ev(S, { k: 'parry', x: p.x, y: p.y }); }
        for (const it of S.it) if (it.thrown >= 0 && it.thrown !== f.id && Math.hypot(it.x - pos[0], it.y - pos[1]) < h.r + 16) { it.thrown = f.id; it.vx = -it.vx * 1.2; it.hit = []; it.tT = 0; ev(S, { k: 'parry', x: it.x, y: it.y }); }
      }
      for (const v of S.p) {
        if (v === f || !alive(v) || !enemies(S, f, v)) continue;
        const key = v.id * 10 + grp; if (f.hitIds.indexOf(key) >= 0) continue;
        if (v.state === 'grabbed' && v.by === f.id) continue;
        const R = rectOf(v);
        if (!circRect(pos[0], pos[1], h.r, R)) continue;
        let mu = mult, hh = h;
        if (h.ctrD) hh = Object.assign({}, h, { d: f.ctr });
        if (h.tp) { const l = hitLocal(f, h), ix = f.x + f.face * l[0] * 0.5, iy = f.y - (l[1] * 0.5 + CH[f.ch].h * 0.25); if (!circRect(ix, iy, h.r + 4, R)) mu *= 1.35; }
        const dir = h.rad ? (sgn(v.x - f.x) || f.face) : f.face;
        const r = applyHit(S, f, v, hh, dir, clamp(pos[0], R.x, R.x + R.w), clamp(pos[1], R.y, R.y + R.h), mu, true);
        if (r) f.hitIds.push(key);
        if (r === 1) { f.conn = 1; f.dodged = false; }
        if (f.state !== 'attack' || mv(f) !== m) break;
      }
      if (f.state !== 'attack' || mv(f) !== m) break;
    }
  }
}

/* ---------- projectiles ---------- */
function projs(S, P) {
  for (const p of S.pr) {
    p.life--;
    if (p.k === 'ember') {
      p.vy += 0.36; const py = p.y; p.x += p.vx; p.y += p.vy;
      if (p.vy > 0) for (const q of P) if (py <= q.y + 1 && p.y + p.r >= q.y && p.x >= q.x && p.x <= q.x + q.w && py + p.r <= q.y + 12) { p.y = q.y - p.r; p.vy = -5.6; }
    } else if (p.k === 'spark') {
      if (p.gr) {
        p.x += p.vx; const q = P[p.pl];
        if (!q || p.x < q.x || p.x > q.x + q.w) { p.gr = false; p.vy = 0; } else { p.x += q.dx; p.y = q.y - p.r; }
      } else {
        p.vy = Math.min(9, p.vy + 0.5); const py = p.y; p.x += p.vx * 0.6; p.y += p.vy;
        for (let i = 0; i < P.length; i++) { const q = P[i]; if (py + p.r <= q.y + 2 && p.y + p.r >= q.y && p.x >= q.x && p.x <= q.x + q.w) { p.y = q.y - p.r; p.gr = true; p.pl = i; } }
      }
    } else if (p.k === 'wave') {
      p.x += p.vx; const q = P.find(q => Math.abs(q.y - p.y) < 3 && p.x >= q.x && p.x <= q.x + q.w); if (!q) p.life = 0;
    } else { p.x += p.vx; p.y += p.vy; }
    if (p.life <= 0) continue;
    const o = S.p[p.o];
    for (const v of S.p) {
      if (!alive(v) || v.id === p.o || (o && !enemies(S, o, v)) || p.hit.indexOf(v.id) >= 0) continue;
      const R = rectOf(v), cy = p.k === 'wave' ? p.y - 14 : p.y;
      if (!circRect(p.x, cy, p.r, R)) continue;
      const r = applyHit(S, o, v, p, sgn(p.vx) || 1, p.x, cy, 1, false);
      if (r) { p.hit.push(v.id); if (p.k !== 'wave') { p.life = 0; break; } }
    }
    const Bz = STAGES[S.stage].blast; if (p.x < Bz.l || p.x > Bz.r || p.y > Bz.b) p.life = 0;
  }
  S.pr = S.pr.filter(p => p.life > 0);
}

/* ---------- items ---------- */
function explode(S, it) {
  ev(S, { k: 'boom', x: it.x, y: it.y });
  const o = S.p[it.thrown >= 0 ? it.thrown : -1] || null;
  for (const v of S.p) {
    if (!alive(v)) continue; const R = rectOf(v);
    if (circRect(it.x, it.y, 105, R)) applyHit(S, o, v, { d: 20, a: 62, b: 50, g: 88, fx: 'fire' }, sgn(v.x - it.x) || 1, v.x, v.y - 30, 1, false);
  }
  it.life = 0;
}
function items(S, P) {
  const cfg = S.cfg;
  if (cfg.items && !S.over) {
    if (--S.itemT <= 0) {
      S.itemT = [0, 780, 480, 260][cfg.itemFreq] * (0.7 + rnd(S) * 0.6);
      if (S.it.length < 7) {
        const main = P[0], type = ITEMS[Math.floor(rnd(S) * ITEMS.length)];
        const it = { id: ++S.idN, type, x: main.x + 30 + rnd(S) * (main.w - 60), y: main.y - 520, vx: 0, vy: 0, grounded: false, held: -1, thrown: -1, tT: 0, life: 1300, ammo: 12, fuse: 0, ret: 0, ox: 0, oy: 0, hit: [], pl: -1 };
        S.it.push(it); ev(S, { k: 'spawn', x: it.x, y: it.y });
      }
    }
  }
  for (const it of S.it) {
    if (it.held >= 0) {
      const f = S.p[it.held];
      if (!f || !alive(f) || f.item !== it.id) { it.held = -1; it.grounded = false; continue; }
      it.x = f.x + f.face * (CH[f.ch].w / 2 + 6); it.y = f.y - CH[f.ch].h * 0.5; it.life = Math.max(it.life, 400);
      continue;
    }
    it.life--;
    if (it.thrown >= 0) {
      it.tT++;
      const o = S.p[it.thrown];
      if (it.type === 'boomerang') {
        if (it.tT < 60) { it.vx -= it.ox / 24; it.vy -= it.oy / 24; }
        else if (o && alive(o)) { const dx = o.x - it.x, dy = o.y - 30 - it.y, m = Math.hypot(dx, dy) || 1; it.vx = dx / m * 13; it.vy = dy / m * 13; if (m < 30) { if (o.item < 0) { it.held = o.id; o.item = it.id; it.thrown = -1; continue; } it.thrown = -1; it.vx = 0; } }
        if (it.tT > 130) { it.thrown = -1; it.vx *= 0.3; }
        it.x += it.vx; it.y += it.vy;
      } else {
        it.vy = Math.min(14, it.vy + 0.42); const py = it.y; it.x += it.vx; it.y += it.vy;
        if (it.vy > 0) for (let i = 0; i < P.length; i++) { const q = P[i]; if (py + 10 <= q.y + 2 && it.y + 10 >= q.y && it.x >= q.x && it.x <= q.x + q.w) { it.y = q.y - 10; if (it.type === 'bomb') { explode(S, it); } else { it.thrown = -1; it.grounded = true; it.pl = i; it.vx = 0; it.vy = 0; if (it.type === 'crate') ev(S, { k: 'dust', x: it.x, y: it.y, big: 1 }); } break; } }
      }
      if (it.life > 0 && it.thrown >= 0) for (const v of S.p) {
        if (!alive(v) || (v.id === it.thrown && it.tT < 30) || it.hit.indexOf(v.id) >= 0) continue;
        if (v.id === it.thrown && it.type !== 'bomb') continue;
        if (o && v !== o && !enemies(S, o, v)) continue;
        const R = rectOf(v); if (!circRect(it.x, it.y, 16, R)) continue;
        if (it.type === 'bomb') { explode(S, it); break; }
        const hd = it.type === 'crate' ? { d: 14, a: 45, b: 32, g: 72, fx: 'rock' } : it.type === 'boomerang' ? { d: it.tT < 60 ? 7 : 5, a: 60, b: 24, g: 50, fx: 'slash' } : { d: 6, a: 50, b: 20, g: 40 };
        const r = applyHit(S, o, v, hd, sgn(it.vx) || 1, it.x, it.y, 1, false);
        if (r) { it.hit.push(v.id); if (it.type === 'crate') { it.life = 0; ev(S, { k: 'crack', x: it.x, y: it.y }); } else if (it.type !== 'boomerang') { it.vx *= -0.3; it.vy = -4; it.thrown = -1; } }
      }
    } else if (!it.grounded) {
      it.vy = Math.min(7, it.vy + 0.3); const py = it.y; it.x += it.vx; it.y += it.vy; it.vx *= 0.96;
      for (let i = 0; i < P.length; i++) { const q = P[i]; if (py + 10 <= q.y + 2 && it.y + 10 >= q.y && it.x >= q.x && it.x <= q.x + q.w) { it.y = q.y - 10; it.grounded = true; it.pl = i; it.vy = 0; it.vx = 0; } }
    } else {
      const q = P[it.pl]; if (!q || it.x < q.x || it.x > q.x + q.w) it.grounded = false; else { it.x += q.dx; it.y = q.y - 10; }
    }
    if (it.type === 'bomb' && it.life < 180 && it.life > 0 && it.held < 0 && it.life === 1) explode(S, it);
    if (INSTANT[it.type] && it.life > 0) for (const f of S.p) {
      if (!alive(f) || f.state === 'respawn') continue; const R = rectOf(f);
      if (circRect(it.x, it.y, 16, R)) {
        if (it.type === 'heart') f.pct = Math.max(0, f.pct - 30); else if (it.type === 'boots') f.spd = 600; else if (it.type === 'gauntlet') f.pow = 600; else f.armor = 30;
        ev(S, { k: 'power', x: f.x, y: f.y - 30, t: it.type, id: f.id }); it.life = 0; break;
      }
    }
    const Bz = STAGES[S.stage].blast; if (it.y > Bz.b || it.x < Bz.l || it.x > Bz.r) it.life = 0;
  }
  for (const it of S.it) if (it.life <= 0 && it.held >= 0) { const f = S.p[it.held]; if (f) f.item = -1; }
  S.it = S.it.filter(i => i.life > 0);
}

/* ---------- hazards ---------- */
function hazards(S, P) {
  if (!STAGES[S.stage].hazard || !S.cfg.hazards || S.over) return;
  const z = S.hz; z.t--;
  if (z.t === 100) { const main = P[0]; z.x = main.x - 220 + rnd(S) * (main.w + 440); z.on = 1; ev(S, { k: 'warn', x: z.x, y: 0 }); }
  if (z.t <= 0 && z.t > -50) {
    z.on = 2;
    if (z.t === 0) ev(S, { k: 'erupt', x: z.x, y: 0 });
    for (const v of S.p) {
      if (!alive(v) || Math.abs(v.x - z.x) > 46 + CH[v.ch].w / 2) continue;
      if (v.hzF && S.f - v.hzF < 40) continue;
      if (applyHit(S, null, v, { d: 16, a: 84, b: 60, g: 80, fx: 'fire' }, sgn(v.x - z.x) || 1, v.x, v.y - 20, 1, false) === 1) v.hzF = S.f;
    }
  }
  if (z.t <= -50) { z.on = 0; z.t = 380 + Math.floor(rnd(S) * 300); }
}

/* ---------- CPU ---------- */
function ai(S, f, P) {
  const lv = f.cpu, c = CH[f.ch], prev = f.inp;
  if (lv <= 0) { f.inp = { x: 0, y: 0, b: 0 }; return; }
  const main = P[0], cx = main.x + main.w / 2;
  let tgt = null, bd = 1e9;
  for (const o of S.p) if (o !== f && alive(o) && !(S.cfg.teams && o.team === f.team) && o.state !== 'respawn') { const d = Math.abs(o.x - f.x) + Math.abs(o.y - f.y); if (d < bd) { bd = d; tgt = o; } }
  let x = 0, y = 0, b = 0;
  if (f.aiS > 0) { f.aiS--; b |= SH; }
  if (f.aiJ > 0) { f.aiJ--; b |= J; }
  f.aiT--;
  const off = !f.grounded && (f.x < main.x - 6 || f.x > main.x + main.w + 6 || f.y > main.y + 20);
  if (f.state === 'wall') { y = -1; b &= ~SH; if (f.t > 3 && !(prev.b & J)) b |= J; }
  else if (f.state === 'ledge') {
    if (f.t > 14 + (10 - lv) * 3) { const r = rnd(S); if (r < 0.5) y = -1; else if (r < 0.8) b = J; else b = SH; }
  } else if (f.state === 'grabbing' || f.state === 'carry') {
    if (f.t > 12 && f.aiT <= 0) { f.aiT = 10; const r = rnd(S); if (r < 0.35) b = A; else if (r < 0.55) { x = f.face; if (f.state === 'carry') b = A; } else if (r < 0.75) { x = -f.face; if (f.state === 'carry') b = A; } else if (r < 0.9) { y = -1; if (f.state === 'carry') b = A; } else { y = 1; if (f.state === 'carry') b = A; } }
  } else if (off && f.state !== 'hitstun') {
    x = f.x < cx ? 1 : -1; b &= ~SH;
    if (f.vy > -1) {
      if (f.jumps > 0 && f.y > main.y - 60) { if (!(prev.b & J)) { b |= J; f.aiJ = 6; } }
      else if (!f.upUsed && f.y > main.y - 20 && f.state === 'air') { y = -1; if (!(prev.b & B)) b |= B; }
    }
    if (f.state === 'attack' && mv(f).helpless) { y = -1; }
  } else if (tgt) {
    const dx = tgt.x - f.x, dy = tgt.y - f.y, adx = Math.abs(dx), dirx = sgn(dx) || 1, reach = c.w / 2 + c.reach;
    const danger = tgt.state === 'attack' && adx < 150 && Math.abs(dy) < 100 && tgt.mf < 14;
    const tOff = tgt.x < main.x - 20 || tgt.x > main.x + main.w + 20;
    if (danger && f.grounded && f.aiS <= 0 && rnd(S) < lv * 0.035) { f.aiS = 14; b |= SH; if (rnd(S) < 0.25) x = -dirx; }
    else if (f.aiS > 0) { }
    else if (adx < reach + 24 && Math.abs(dy) < 80) {
      if (f.state === 'attack' && f.ch === 2 && f.move[0] === 's' && f.mf > 9 && rnd(S) < 0.25) { b |= B; const q = rnd(S); y = q < 0.33 ? -1 : q < 0.66 ? 1 : 0; }
      if (f.aiT <= 0) {
        f.aiT = 6 + Math.floor((10 - lv) * 4 * rnd(S));
        const r = rnd(S), kill = tgt.pct > 85;
        if (rnd(S) < (10 - lv) * 0.05) { }
        else if (f.grounded) {
          if ((tgt.state === 'shield' && r < 0.6) || r < 0.08) { x = dirx; b |= GR; }
          else if (r < 0.2 && f.face === dirx) b |= A;
          else if (r < 0.38) { x = dirx; b |= A; }
          else if (r < 0.48) { y = dy < -30 ? -1 : 1; b |= A; }
          else if (r < 0.48 + (kill ? 0.25 : 0.1)) { if (dy < -40) y = -1; else if (rnd(S) < 0.2) y = 1; else x = dirx; b |= C; }
          else if (r < 0.8) { if (r < 0.7) x = dirx; else if (r < 0.75) y = 1; b |= B; }
          else if (r < 0.9) { b |= J; f.aiJ = r < 0.85 ? 0 : 6; x = dirx; }
          else { f.aiS = 10; b |= SH; }
        } else {
          if (dy < -34) y = -1; else if (dy > 44) y = 1; else if (r < 0.75) x = dirx;
          b |= r < 0.9 ? A : B; if (b & B && y < 0) { y = 0; }
        }
      } else if (adx > reach * 0.7) x = dirx;
    } else {
      x = dirx;
      if (f.aiT <= 0) {
        f.aiT = 8 + Math.floor((10 - lv) * 3 * rnd(S));
        if (dy < -70 && (f.grounded || (f.jumps > 0 && f.vy > 0)) && rnd(S) < 0.5) { b |= J; f.aiJ = 6; }
        else if (dy > 60 && f.grounded && P[f.plat] && P[f.plat].soft && rnd(S) < 0.5) { y = 1; x = 0; b |= J; }
        else if (adx > 220 && Math.abs(dy) < 60 && rnd(S) < 0.05 * lv && f.face === dirx) { x = 0; b |= B; }
        else if (f.item >= 0 && rnd(S) < 0.5) { b |= A; }
        else if (f.item < 0 && nearItem(S, f) && rnd(S) < 0.6) { x = 0; b |= A; }
      }
    }
    if (f.grounded && f.plat === 0 && !tOff) { const nx = f.x + x * 40; if (nx < main.x + 12 || nx > main.x + main.w - 12) x = 0; }
    if (f.grounded && tOff) { const nx = f.x + x * 30; if (nx < main.x + 20 || nx > main.x + main.w - 20) x = 0; }
    if (!f.grounded && !off && tOff && Math.abs(f.x - cx) > main.w / 2 - 40) x = f.x < cx ? 1 : -1;
  }
  f.inp = { x, y, b };
}

/* ---------- results ---------- */
function finish(S) {
  S.over = S.f;
  const P = S.p.slice();
  if (S.cfg.mode === 'time') P.sort((a, b) => (b.kos - b.falls) - (a.kos - a.falls) || b.dmg - a.dmg);
  else P.sort((a, b) => (a.out ? 0 : 1) !== (b.out ? 0 : 1) ? (b.out ? 0 : 1) - (a.out ? 0 : 1) : a.out ? b.outAt - a.outAt : (b.stocks - a.stocks) || (a.pct - b.pct));
  let wt = P[0].team;
  S.res = P.map((f, i) => ({ id: f.id, name: f.name, ch: f.ch, cos: f.cos, team: f.team, place: S.cfg.teams ? (f.team === wt ? 1 : 2) : i + 1, kos: f.kos, falls: f.falls, sd: f.sd, dmg: Math.round(f.dmg), cpu: f.cpu }));
  if (S.cfg.mode === 'time' && !S.cfg.teams) for (let i = 1; i < P.length; i++) if (P[i].kos - P[i].falls === P[i - 1].kos - P[i - 1].falls) S.res[i].place = S.res[i - 1].place;
  ev(S, { k: 'game' });
}

/* ---------- main step ---------- */
function step(S, inputs) {
  S.f++;
  const P = getPlats(S); S._P = P;
  if (S.start > 0) { S.start--; if (S.start === 0) ev(S, { k: 'go' }); }
  const frozen = S.start > 0 || (S.over && S.f - S.over > 90);
  for (const f of S.p) {
    if (frozen) { f.inp = { x: 0, y: 0, b: 0 }; f.pb = 0; continue; }
    if (f.cpu >= 0) ai(S, f, P);
    else if (inputs && inputs[f.id]) { const n = inputs[f.id]; f.inp = { x: clamp(+n.x || 0, -1, 1), y: clamp(+n.y || 0, -1, 1), b: n.b | 0 }; }
  }
  if (!frozen) {
    for (const f of S.p) upd(S, f, P);
    melee(S); projs(S, P); items(S, P); hazards(S, P);
    const Bz = STAGES[S.stage].blast;
    for (const f of S.p) if (alive(f) && (f.x < Bz.l || f.x > Bz.r || f.y > Bz.b || f.y < Bz.t)) ko(S, f, Bz);
    if (!S.over && !S.cfg.training) {
      if (S.cfg.mode === 'time') { if (--S.timer <= 0) finish(S); }
      else {
        const al = S.p.filter(f => !f.out);
        const groups = S.cfg.teams ? new Set(al.map(f => f.team)).size : al.length;
        if (S.p.length > 1 && groups <= 1) finish(S);
      }
    }
  }
  delete S._P;
  return S;
}

const API = { CH, STAGES, ITEMS, BTN: { A, B, J, SH, GR, C }, newGame, step, getPlats, hitPos, hitLocal, rectOf, mv, alive, invul };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SIM = API;
})(typeof window !== 'undefined' ? window : globalThis);
