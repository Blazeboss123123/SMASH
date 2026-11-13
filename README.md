# Rift Rumble

A 2D platform fighter: percentage damage, knockback, stocks, four fighters, four stages, items, CPUs, local and online play for 2–8 players.

## Play locally (no install)
Open `public/index.html` in a browser. Local Multiplayer, Training and CPU matches all work offline.

## Online multiplayer
Online rooms need the server running. It has no dependencies.

```
node build.js     # only after editing sim.js / client.js / index.src.html
node server.js    # serves the game on http://localhost:3000
```

Everyone opens the server's address, one player creates a room and shares the 4-letter code.

### Deploying on Render
1. Push this folder to a GitHub repo.
2. New → Web Service → pick the repo.
3. Build command: `node build.js` · Start command: `node server.js` · Instance: Free.
4. Share the `https://<name>.onrender.com` link. (Free instances sleep when idle; the first visit takes ~30 s to wake.)

## Files
- `sim.js` — the whole game simulation (physics, knockback, movesets, items, CPU). Runs in the browser and on the server.
- `client.js` — rendering, input, menus, netcode.
- `index.src.html` — page shell and styles. `build.js` inlines everything into `public/index.html`.
- `server.js` — rooms, room codes, authoritative 60 Hz simulation, 20 Hz snapshots.

## Tuning
Every move is one line in `sim.js`: `H(start, end, x0, y0, x1, y1, radius, damage, angle, baseKB, growth, options)`.
Fighter stats (speed, weight, jump height) sit at the top of each character block.
