import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@blindman/shared";
import { RoomManager } from "./roomManager";

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

// Health endpoints — always present so platforms like Render can probe the
// service. /health is the canonical one; / is a friendly JSON for humans.
app.get("/health", (_req, res) => res.json({ ok: true }));

// In production we serve the built client from the same origin as the
// socket. This collapses Render+Vercel into a single Render service. The
// compiled server lives in server/dist, so client/dist is two levels up.
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");
const hasClientBuild = fs.existsSync(path.join(CLIENT_DIST, "index.html"));

if (hasClientBuild) {
  console.log(`[server] serving client from ${CLIENT_DIST}`);
  app.use(express.static(CLIENT_DIST));
  // SPA fallback — everything that didn't match an asset returns index.html.
  // Routes starting with /socket.io/ or /health are handled above and never
  // reach this fallback.
  app.get(/^\/(?!socket\.io|health).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  // No build present (dev mode or backend-only deploy). Keep the original
  // behaviour: a JSON greeting at root so it's obvious the API is up.
  app.get("/", (_req, res) =>
    res.json({ ok: true, service: "blindman-server", note: "client build not bundled — running API only" })
  );
}

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const rooms = new RoomManager(io);

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }, cb) => {
    try {
      const { code, playerId } = rooms.createRoom(socket, name);
      cb({ ok: true, data: { code, playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "create failed" });
    }
  });

  socket.on("joinRoom", ({ code, name }, cb) => {
    try {
      const { playerId } = rooms.joinRoom(socket, code, name);
      cb({ ok: true, data: { playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "join failed" });
    }
  });

  socket.on("rejoinRoom", ({ code, name }, cb) => {
    try {
      const { playerId } = rooms.rejoin(socket, code, name);
      cb({ ok: true, data: { playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "rejoin failed" });
    }
  });

  socket.on("setReady", ({ ready }) => rooms.setReady(socket, ready));
  socket.on("switchDuo", ({ duoId }) => rooms.switchDuo(socket, duoId));
  socket.on("startGame", () => rooms.startGame(socket));
  socket.on("playAgain", () => rooms.playAgain(socket));
  socket.on("leaveRoom", () => rooms.leaveRoom(socket));
  socket.on("action", ({ action }) => rooms.handleAction(socket, action));
  socket.on("disconnect", () => rooms.handleDisconnect(socket));
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
