import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
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
app.get("/", (_req, res) => res.json({ ok: true, service: "blindman-server" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

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
