# Blind & Guide — Communication Party Minigames

A browser-based party game for duos. One player is the **Blind** — they can only see buttons. The other is the **Guide** — they see everything and must verbally instruct their partner. Multiple duos can compete in the same room. Rounds are short, procedurally generated, and built for laughs.

Ships with **three** communication-heavy minigames:

1. **Maze Escape** — Guide sees a maze with hazards and a goal. Blind only sees four arrows and feedback like "bump" or "hazard". Hit a trap and you're out for the round.
2. **Color Sequence** — Guide sees a target color sequence. Blind has 4–6 colored buttons and must press them in order. 3 mistakes = fail.
3. **Bomb Defusal** — Guide has a rulebook (wires, switches, 3-digit code). Blind has unlabeled wire-cutters, toggle switches, and a keypad. Three stages to survive before the timer hits zero.

Each round is seeded fresh, so no two are the same.

## Stack

- **Client:** React + TypeScript, Vite, Tailwind CSS, Zustand, socket.io-client
- **Server:** Node.js, Express, Socket.IO (server-authoritative, in-memory rooms)
- **Shared:** TypeScript types, events, seeded PRNG (Mulberry32)
- **Monorepo:** npm workspaces (`shared` / `server` / `client`)

## Project layout

```
BlindManGame/
├── package.json            # workspace root
├── shared/                 # types, events, seeded RNG
├── server/                 # Express + Socket.IO, room & game logic
└── client/                 # Vite + React UI
```

## Run locally

Prerequisites: Node.js 18+ and npm 9+.

```bash
# 1. install
npm install

# 2. build shared types (server+client import from here)
npm run build:shared

# 3. in two terminals (or use the combined dev script):
npm run dev:server   # -> http://localhost:3001
npm run dev:client   # -> http://localhost:5173

# or all at once:
npm run dev
```

Open `http://localhost:5173` in two browser windows (or a phone on the same Wi-Fi using the LAN IP printed by Vite). One hosts, the other joins with the room code.

### Environment variables

Server reads `PORT` and `CLIENT_ORIGIN` (see `.env.example` at root).
Client reads `VITE_SERVER_URL` (see `client/.env.example`). Leave defaults for local dev.

## Testing a full match

1. Open tab A → **Create Room** → name yourself "Alex" → copy the 4-char code.
2. Open tab B → **Join Room** → paste the code → name yourself "Sam".
3. Both tabs show roles (BLIND / GUIDE). Both hit **Ready**. Host hits **Start Game**.
4. Play 3 rounds (Maze → Sequence → Defusal). Match summary appears; host can **Play Again**.

Add more duos by opening additional tabs and pressing **Join this team** on any empty team card in the lobby.

## Deployment

### Frontend → Vercel

1. Import this repo into Vercel.
2. **Root directory:** `client`
3. **Build command:** `npm install && npm run build` (Vercel runs in the `client` dir; the shared package is installed as a workspace linked dep at the repo root — either set the root directory to the repo root with **Output Directory** `client/dist` and **Install Command** `npm install` + **Build Command** `npm run build`, or publish `@blindman/shared` to a private registry).
4. **Environment variable:** `VITE_SERVER_URL=https://your-backend.onrender.com`

Simplest Vercel recipe (uses repo root so workspaces resolve):

- Root Directory: *(leave as repo root)*
- Install Command: `npm install`
- Build Command: `npm run build:shared && npm run build -w client`
- Output Directory: `client/dist`

### Backend → Render or Railway

**Render** (free tier works):

1. New → **Web Service** → connect repo.
2. **Root directory:** leave as repo root.
3. **Build Command:** `npm install && npm run build:shared && npm run build -w server`
4. **Start Command:** `npm run start -w server`
5. Add env var `CLIENT_ORIGIN=https://your-frontend.vercel.app` and `PORT` is set by Render.

**Railway** is nearly identical — same build and start commands, set the same env vars in the service settings.

### CORS / Origin

On the deployed backend, set `CLIENT_ORIGIN` to your Vercel URL. The server mirrors it into both the Express CORS middleware and the Socket.IO CORS config.

## How to extend with more minigames

Everything flows through one `MinigameEngine` interface and one `MinigameId` union.

1. Add the id to `shared/src/types.ts` (`type MinigameId = ... | "newgame";`).
2. Add the state shapes to `shared/src/minigameTypes.ts` — one **blind** state, one **guide** state, and a typed action union.
3. Add your engine file under `server/src/minigames/newgame.ts` implementing `MinigameEngine`:
   - `init(duoIds, seed)` — use `new SeededRandom(seed + duoIndex)` for per-duo variation.
   - `handleAction(duoId, action)` — validate and mutate state.
   - `getGuideState` / `getBlindState` — return **role-filtered** views. Never leak hidden info into the blind state.
   - `isDoneFor(duoId)` — `{ done, success }`.
4. Register it in `server/src/minigames/index.ts` (`createEngine` switch + add to `MINIGAME_ROTATION`).
5. Build the UI under `client/src/minigames/NewGame/{Blind,Guide}.tsx`.
6. Wire it in `client/src/screens/Game.tsx` alongside the existing `if (mg === "..." )` branches.

The existing `ClientToServerEvents["action"]` channel is generic — your new action type just needs to union into `AnyMinigameAction`. The server dispatches to the active engine by player's duoId.

## Known limitations

- **In-memory rooms.** Restarting the server wipes all rooms. Persistence would need a Redis or Postgres layer (the shape of `Room` is already serializable).
- **No authentication.** Name collisions within a room are used for rejoin, which is a soft identity. A real deployment should tie sessions to cookies or stable device IDs.
- **Mid-game disconnect recovery is minimal.** A player can rejoin with the same name, but if both players of a duo drop for longer than the round timer, that duo just forfeits the round.
- **Role assignment is deterministic by socket id order.** There's no "swap roles" button yet — restart the duo by leaving and rejoining to swap.
- **Single Socket.IO node.** Horizontal scaling would need the Redis adapter (`@socket.io/redis-adapter`) and shared room storage.
- **No anti-cheat.** The server strips data that shouldn't go to the blind player, but we don't obscure it further (e.g. rate-limiting blind spam presses beyond engine-level checks).
- **Accessibility.** Keyboard focus and screen-reader labels are basic; color-based buttons in the Sequence game assume color vision.

## First things I would improve next

1. **Voice-activity indicator per duo** so spectators know which pair is "talking" — pure visual, no audio sent anywhere.
2. **Round variety knobs** — difficulty scaling (maze size grows, sequence longer, defusal adds a Simon-says stage) across rounds 1 → N.
3. **Persistent rooms** via Redis and host reconnection with a stable `hostKey` cookie.
4. **Spectator view** — a third role that watches any duo's full state, great for streaming.
5. **More minigames** — "describe this shape and I'll draw it", "rotate valves in the correct order", "translate a garbled code book".
6. **Reaction-log animations** in the round results (watch each duo's final 5 seconds replayed simultaneously).
7. **Automated tests** — the engines are pure given a seed, so snapshot tests per minigame would be easy and high-value.
