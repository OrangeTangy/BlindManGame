import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import { RoomManager } from "./roomManager";
import { CoupRoomManager } from "./coup/coupRoomManager";

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/health", (_req, res) => res.json({ ok: true }));

const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");
const hasClientBuild = fs.existsSync(path.join(CLIENT_DIST, "index.html"));

if (hasClientBuild) {
  console.log(`[server] serving client from ${CLIENT_DIST}`);
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!socket\.io|health).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  app.get("/", (_req, res) =>
    res.json({ ok: true, service: "gamehub-server", note: "client build not bundled — running API only" })
  );
}

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const blindmanRooms = new RoomManager(io as any);
const coupRooms = new CoupRoomManager(io as any);

io.on("connection", (socket: any) => {
  // ---- BlindMan events ----
  socket.on("createRoom", ({ name }: any, cb: any) => {
    try {
      const { code, playerId } = blindmanRooms.createRoom(socket, name);
      cb({ ok: true, data: { code, playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "create failed" });
    }
  });
  socket.on("joinRoom", ({ code, name }: any, cb: any) => {
    try {
      const { playerId } = blindmanRooms.joinRoom(socket, code, name);
      cb({ ok: true, data: { playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "join failed" });
    }
  });
  socket.on("rejoinRoom", ({ code, name }: any, cb: any) => {
    try {
      const { playerId } = blindmanRooms.rejoin(socket, code, name);
      cb({ ok: true, data: { playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "rejoin failed" });
    }
  });
  socket.on("setReady", ({ ready }: any) => blindmanRooms.setReady(socket, ready));
  socket.on("switchDuo", ({ duoId }: any) => blindmanRooms.switchDuo(socket, duoId));
  socket.on("startGame", () => blindmanRooms.startGame(socket));
  socket.on("playAgain", () => blindmanRooms.playAgain(socket));
  socket.on("leaveRoom", () => blindmanRooms.leaveRoom(socket));
  socket.on("action", ({ action }: any) => blindmanRooms.handleAction(socket, action));

  // ---- Coup events ----
  socket.on("coupCreateRoom", ({ name }: any, cb: any) => {
    try {
      const { code, playerId } = coupRooms.createRoom(socket, name);
      cb({ ok: true, data: { code, playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "create failed" });
    }
  });
  socket.on("coupJoinRoom", ({ code, name }: any, cb: any) => {
    try {
      const { playerId } = coupRooms.joinRoom(socket, code, name);
      cb({ ok: true, data: { playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "join failed" });
    }
  });
  socket.on("coupRejoinRoom", ({ code, name }: any, cb: any) => {
    try {
      const { playerId } = coupRooms.rejoin(socket, code, name);
      cb({ ok: true, data: { playerId } });
    } catch (e: any) {
      cb({ ok: false, error: e.message || "rejoin failed" });
    }
  });
  socket.on("coupStartGame", () => coupRooms.startGame(socket));
  socket.on("coupPlayAgain", () => coupRooms.playAgain(socket));
  socket.on("coupLeaveRoom", () => coupRooms.leaveRoom(socket));
  socket.on("coupAction", ({ action, targetId }: any) =>
    coupRooms.handleAction(socket, action, targetId)
  );
  socket.on("coupChallenge", () => coupRooms.handleChallenge(socket));
  socket.on("coupPassChallenge", () => coupRooms.handlePassChallenge(socket));
  socket.on("coupBlock", ({ claimedRole }: any) =>
    coupRooms.handleBlock(socket, claimedRole)
  );
  socket.on("coupPassBlock", () => coupRooms.handlePassBlock(socket));
  socket.on("coupChallengeBlock", () => coupRooms.handleChallengeBlock(socket));
  socket.on("coupPassBlockChallenge", () =>
    coupRooms.handlePassBlockChallenge(socket)
  );
  socket.on("coupLoseInfluence", ({ card }: any) =>
    coupRooms.handleLoseInfluence(socket, card)
  );
  socket.on("coupExchangeReturn", ({ returnCards }: any) =>
    coupRooms.handleExchangeReturn(socket, returnCards)
  );

  // ---- Shared disconnect ----
  socket.on("disconnect", () => {
    blindmanRooms.handleDisconnect(socket);
    coupRooms.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
