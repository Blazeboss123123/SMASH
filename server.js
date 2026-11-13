/* RIFT RUMBLE — authoritative game server. No dependencies: `node server.js` */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const G = require('./sim.js');
const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'public', 'index.html');

/* ---------- minimal WebSocket (RFC 6455) ---------- */
function wsAccept(req, socket) {
  const key = req.headers['sec-websocket-key']; if (!key) { socket.destroy(); return null; }
  const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { socket, open: true, onmsg: null, onclose: null, buf: Buffer.alloc(0), frag: [] };
  c.send = str => {
    if (!c.open) return; const p = Buffer.from(str), n = p.length; let h;
    if (n < 126) h = Buffer.from([0x81, n]); else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); } else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(n, 6); }
    try { socket.write(Buffer.concat([h, p])); } catch (e) { }
  };
  c.close = () => { if (!c.open) return; c.open = false; try { socket.end(Buffer.from([0x88, 0])); } catch (e) { } if (c.onclose) c.onclose(); };
  socket.on('data', d => {
    c.buf = Buffer.concat([c.buf, d]);
    for (;;) {
      if (c.buf.length < 2) return; const b0 = c.buf[0], b1 = c.buf[1], op = b0 & 15, masked = b1 & 128; let len = b1 & 127, off = 2;
      if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (c.buf.length < 10) return; len = c.buf.readUInt32BE(6); off = 10; }
      if (len > 65536) { c.close(); return; }
      const need = off + (masked ? 4 : 0) + len; if (c.buf.length < need) return;
      let pay = c.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = c.buf.subarray(off, off + 4); pay = Buffer.from(pay); for (let i = 0; i < pay.length; i++) pay[i] ^= m[i & 3]; }
      c.buf = c.buf.subarray(need);
      if (op === 8) { c.close(); return; }
      if (op === 9) { try { socket.write(Buffer.concat([Buffer.from([0x8a, pay.length]), pay])); } catch (e) { } continue; }
      if (op === 1 || op === 0) { c.frag.push(pay); if (b0 & 128) { const s = Buffer.concat(c.frag).toString(); c.frag = []; if (c.onmsg) c.onmsg(s); } }
    }
  });
  socket.on('close', () => { if (c.open) { c.open = false; if (c.onclose) c.onclose(); } });
  socket.on('error', () => { if (c.open) { c.open = false; if (c.onclose) c.onclose(); } });
  return c;
}

/* ---------- rooms ---------- */
const rooms = new Map();
const defCfg = () => ({ mode: 'stock', stocks: 3, time: 3, stage: 0, items: true, itemFreq: 2, hazards: true, teams: false, ff: false });
const emptySlot = i => ({ type: 'off', name: '', ch: -1, cos: i, team: i % 2, lvl: 5, ready: false });
function mkCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c; do { c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; } while (rooms.has(c)); return c; }
const cleanName = n => String(n || 'Player').replace(/[^\w \-]/g, '').slice(0, 12) || 'Player';
function sendRoom(room) {
  for (const cl of room.clients) cl.c.send(JSON.stringify({ t: 'room', code: room.code, you: cl.slot, host: cl === room.host, slots: room.slots, cfg: room.cfg, phase: room.S ? 'game' : 'lobby' }));
}
function join(room, c, name) {
  const i = room.slots.findIndex(s => s.type === 'off'); if (i < 0) return null;
  room.slots[i] = Object.assign(emptySlot(i), { type: 'human', name: cleanName(name) });
  const cl = { c, slot: i, room, pi: -1, inp: { x: 0, y: 0, b: 0 } }; room.clients.push(cl); if (!room.host) room.host = cl; return cl;
}
function leave(cl) {
  const room = cl.room; if (!room) return; cl.room = null;
  room.clients = room.clients.filter(x => x !== cl);
  if (room.S && cl.pi >= 0 && room.S.p[cl.pi]) { room.S.p[cl.pi].cpu = 4; room.S.p[cl.pi].name = 'CPU'; }
  room.slots[cl.slot] = emptySlot(cl.slot);
  if (!room.clients.length) { clearInterval(room.timer); rooms.delete(room.code); return; }
  if (room.host === cl) room.host = room.clients[0];
  sendRoom(room);
}
const num = (v, a, b, d) => { v = Math.round(+v); return isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
function startMatch(room) {
  const act = room.slots.map((s, i) => ({ s, i })).filter(o => o.s.type !== 'off');
  if (act.length < 2) return 'Need at least two fighters.';
  if (act.some(o => o.s.ch < 0)) return 'Everyone needs to pick a fighter.';
  if (act.some(o => o.s.type === 'human' && !o.s.ready && room.host.slot !== o.i)) return 'Not everyone is ready.';
  if (room.cfg.teams && new Set(act.map(o => o.s.team)).size < 2) return 'Team battle needs two teams.';
  const cfg = Object.assign({}, room.cfg); cfg.time = cfg.time * 60; if (cfg.stage > 3) cfg.stage = Math.floor(Math.random() * 4);
  const used = {}, slots = [];
  for (const o of act) {
    const s = o.s; let ch = s.ch === 4 ? Math.floor(Math.random() * 4) : s.ch, cos = s.cos % 8; while (used[ch + '_' + cos]) cos = (cos + 1) % 8; used[ch + '_' + cos] = 1;
    const pid = slots.length; const cl = room.clients.find(x => x.slot === o.i); if (cl) { cl.pi = pid; cl.inp = { x: 0, y: 0, b: 0 }; }
    slots.push({ ch, cos, team: s.team, name: s.type === 'cpu' ? 'CPU ' + (o.i + 1) : s.name, cpu: s.type === 'cpu' ? s.lvl : -1 });
  }
  room.S = G.newGame(cfg, slots, (Math.random() * 1e9) | 0);
  for (const cl of room.clients) cl.c.send(JSON.stringify({ t: 'go', pi: cl.pi, s: room.S }));
  room.last = Date.now(); room.acc = 0;
  clearInterval(room.timer); room.timer = setInterval(() => tick(room), 8);
  return null;
}
const rnd2 = (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v;
function tick(room) {
  const S = room.S; if (!S) return; const now = Date.now(); room.acc += now - room.last; room.last = now; if (room.acc > 250) room.acc = 250;
  let stepped = false;
  while (room.acc >= 1000 / 60) {
    room.acc -= 1000 / 60; const inp = {}; for (const cl of room.clients) if (cl.pi >= 0) inp[cl.pi] = cl.inp;
    G.step(S, inp); stepped = true;
    if (S.f % 3 === 0) { const msg = JSON.stringify({ t: 's', s: Object.assign({}, S, { ev: S.ev.filter(e => e.f > S.f - 20) }) }, rnd2); for (const cl of room.clients) cl.c.send(msg); }
    if (S.over && S.f - S.over > 240) { clearInterval(room.timer); room.S = null; for (const cl of room.clients) cl.pi = -1; room.slots.forEach(s => { if (s.type === 'human') s.ready = false; }); sendRoom(room); return; }
  }
}
function onMessage(cl, c, m) {
  if (m.t === 'create') { if (cl.v) return; const room = { code: mkCode(), slots: Array.from({ length: 8 }, (_, i) => emptySlot(i)), cfg: defCfg(), clients: [], host: null, S: null, timer: null }; rooms.set(room.code, room); cl.v = join(room, c, m.name); sendRoom(room); return; }
  if (m.t === 'join') {
    if (cl.v) return; const room = rooms.get(String(m.code || '').toUpperCase());
    if (!room) return c.send(JSON.stringify({ t: 'err', m: 'No room with that code.' }));
    if (room.S) return c.send(JSON.stringify({ t: 'err', m: 'That room is mid-match — try again in a moment.' }));
    cl.v = join(room, c, m.name); if (!cl.v) return c.send(JSON.stringify({ t: 'err', m: 'That room is full.' }));
    sendRoom(room); return;
  }
  const me = cl.v; if (!me || !me.room) return; const room = me.room, isHost = room.host === me;
  if (m.t === 'in') { me.inp = { x: Math.max(-1, Math.min(1, +m.x || 0)), y: Math.max(-1, Math.min(1, +m.y || 0)), b: m.b & 63 }; return; }
  if (room.S) { if (m.t === 'start') { } return; }
  if (m.t === 'slot') {
    const i = m.i | 0, s = room.slots[i], p = m.p || {}; if (!s) return;
    const mine = i === me.slot; if (!mine && !(isHost && s.type !== 'human')) return;
    if (!mine && p.type !== undefined && (p.type === 'off' || p.type === 'cpu')) { s.type = p.type; if (s.type === 'cpu' && s.ch < 0) s.ch = 4; }
    if (p.ch !== undefined) s.ch = num(p.ch, 0, 4, s.ch);
    if (p.cos !== undefined) s.cos = num(p.cos, 0, 7, 0);
    if (p.team !== undefined) s.team = num(p.team, 0, 3, 0);
    if (p.lvl !== undefined) s.lvl = num(p.lvl, 1, 9, 5);
    if (p.ready !== undefined && mine) s.ready = !!p.ready && s.ch >= 0;
    sendRoom(room);
  } else if (m.t === 'cfg' && isHost) {
    const p = m.p || {}, c2 = room.cfg;
    if (p.mode === 'stock' || p.mode === 'time') c2.mode = p.mode;
    if (p.stocks !== undefined) c2.stocks = num(p.stocks, 1, 10, 3);
    if (p.time !== undefined) c2.time = num(p.time, 1, 10, 3);
    if (p.stage !== undefined) c2.stage = num(p.stage, 0, 4, 0);
    if (p.itemFreq !== undefined) c2.itemFreq = num(p.itemFreq, 1, 3, 2);
    for (const k of ['items', 'hazards', 'teams', 'ff']) if (p[k] !== undefined) c2[k] = !!p[k];
    sendRoom(room);
  } else if (m.t === 'start' && isHost) { const e = startMatch(room); if (e) c.send(JSON.stringify({ t: 'err', m: e })); }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  fs.readFile(INDEX, (e, d) => { if (e) { res.writeHead(500); res.end('Run `node build.js` first.'); return; } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(d); });
});
server.on('upgrade', (req, socket) => {
  if (!/^\/ws/.test(req.url)) { socket.destroy(); return; }
  const c = wsAccept(req, socket); if (!c) return; const cl = { v: null };
  c.onmsg = s => { let m; try { m = JSON.parse(s); } catch (e) { return; } if (m && typeof m === 'object') { try { onMessage(cl, c, m); } catch (e) { console.error(e); } } };
  c.onclose = () => { if (cl.v) leave(cl.v); };
});
server.listen(PORT, () => console.log('Rift Rumble server on port ' + PORT));
