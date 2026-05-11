import type { Server, Socket } from "socket.io";
import type {
  CoupClientToServerEvents,
  CoupServerToClientEvents,
  CoupPlayer,
  CoupGamePhase,
} from "@blindman/shared";
import {
  type CoupGameState,
  createGame,
  performAction,
  handleChallenge,
  handlePassChallenge,
  handleBlock,
  handlePassBlock,
  handleChallengeBlock,
  handlePassBlockChallenge,
  handleLoseInfluence,
  handleExchangeReturn,
  toPublicRoom,
  toPrivateData,
  addLog,
} from "./gameLogic";

type IO = Server<CoupClientToServerEvents, CoupServerToClientEvents>;
type Sock = Socket<CoupClientToServerEvents, CoupServerToClientEvents>;

interface CoupRoom {
  code: string;
  hostId: string;
  phase: CoupGamePhase;
  players: Map<string, CoupPlayer>;
  socketToPlayer: Map<string, string>;
  game: CoupGameState | null;
}

const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function genCode(len = 4) {
  let s = "";
  for (let i = 0; i < len; i++)
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return s;
}
function genPlayerId() {
  return "cp_" + Math.random().toString(36).slice(2, 10);
}

export class CoupRoomManager {
  private rooms = new Map<string, CoupRoom>();
  private socketIndex = new Map<string, string>(); // socketId -> roomCode

  constructor(private io: IO) {}

  createRoom(socket: Sock, name: string) {
    name = (name || "Player").trim().slice(0, 20) || "Player";
    let code = genCode();
    while (this.rooms.has(code)) code = genCode();
    const playerId = genPlayerId();
    const player: CoupPlayer = {
      id: playerId,
      name,
      coins: 0,
      influences: [],
      revealedInfluences: [],
      isAlive: true,
      isHost: true,
      connected: true,
    };
    const room: CoupRoom = {
      code,
      hostId: playerId,
      phase: "lobby",
      players: new Map([[playerId, player]]),
      socketToPlayer: new Map([[socket.id, playerId]]),
      game: null,
    };
    this.rooms.set(code, room);
    this.socketIndex.set(socket.id, code);
    socket.join("coup:" + code);
    socket.emit("coupYouAre", { playerId });
    this.broadcastLobby(room);
    return { code, playerId };
  }

  joinRoom(socket: Sock, code: string, name: string) {
    code = (code || "").toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.players.size >= 6) throw new Error("Room is full (max 6)");
    name = (name || "Player").trim().slice(0, 20) || "Player";

    // Check for reconnect by name
    const existing = this.findPlayerByName(room, name);
    if (existing) return this.bindSocket(socket, room, existing);

    if (room.phase !== "lobby") {
      throw new Error("Game in progress — rejoin with your original name");
    }

    const playerId = genPlayerId();
    const player: CoupPlayer = {
      id: playerId,
      name,
      coins: 0,
      influences: [],
      revealedInfluences: [],
      isAlive: true,
      isHost: false,
      connected: true,
    };
    room.players.set(playerId, player);
    room.socketToPlayer.set(socket.id, playerId);
    this.socketIndex.set(socket.id, code);
    socket.join("coup:" + code);
    socket.emit("coupYouAre", { playerId });
    this.broadcastLobby(room);
    return { playerId };
  }

  rejoin(socket: Sock, code: string, name: string) {
    code = (code || "").toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    const existing = this.findPlayerByName(room, name);
    if (!existing) throw new Error("No player with that name");
    return this.bindSocket(socket, room, existing);
  }

  private bindSocket(socket: Sock, room: CoupRoom, player: CoupPlayer) {
    for (const [sid, pid] of room.socketToPlayer.entries()) {
      if (pid === player.id) room.socketToPlayer.delete(sid);
    }
    room.socketToPlayer.set(socket.id, player.id);
    this.socketIndex.set(socket.id, room.code);
    socket.join("coup:" + room.code);
    player.connected = true;
    socket.emit("coupYouAre", { playerId: player.id });
    if (room.game) {
      // Sync the game player state
      const gp = room.game.players.find((p) => p.id === player.id);
      if (gp) gp.connected = true;
      this.broadcastGame(room);
    } else {
      this.broadcastLobby(room);
    }
    return { playerId: player.id };
  }

  private findPlayerByName(room: CoupRoom, name: string): CoupPlayer | undefined {
    const n = (name || "").trim().toLowerCase();
    for (const p of room.players.values())
      if (p.name.toLowerCase() === n) return p;
    return undefined;
  }

  startGame(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { room, player } = ctx;
    if (player.id !== room.hostId) {
      this.sendError(socket, "Only the host can start the game.");
      return;
    }
    if (room.phase !== "lobby" && room.phase !== "game_over") {
      this.sendError(socket, "Game already in progress.");
      return;
    }
    if (room.players.size < 2) {
      this.sendError(socket, "Need at least 2 players.");
      return;
    }

    const gamePlayers: CoupPlayer[] = Array.from(room.players.values()).map((p) => ({
      ...p,
      coins: 0,
      influences: [],
      revealedInfluences: [],
      isAlive: true,
    }));

    room.game = createGame(room.code, gamePlayers);
    room.phase = "playing";
    room.game.hostId = room.hostId;
    addLog(room.game, "Game started!");
    this.broadcastGame(room);
  }

  playAgain(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { room, player } = ctx;
    if (player.id !== room.hostId) return;
    room.phase = "lobby";
    room.game = null;
    this.broadcastLobby(room);
  }

  leaveRoom(socket: Sock) {
    this.handleDisconnect(socket, true);
  }

  handleAction(
    socket: Sock,
    actionType: string,
    targetId?: string
  ) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = performAction(
      ctx.room.game,
      ctx.player.id,
      actionType as any,
      targetId
    );
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handleChallenge(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handleChallenge(ctx.room.game, ctx.player.id);
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handlePassChallenge(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handlePassChallenge(ctx.room.game, ctx.player.id);
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handleBlock(socket: Sock, claimedRole: string) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handleBlock(ctx.room.game, ctx.player.id, claimedRole as any);
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handlePassBlock(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handlePassBlock(ctx.room.game, ctx.player.id);
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handleChallengeBlock(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handleChallengeBlock(ctx.room.game, ctx.player.id);
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handlePassBlockChallenge(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handlePassBlockChallenge(ctx.room.game, ctx.player.id);
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handleLoseInfluence(socket: Sock, card: string) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handleLoseInfluence(ctx.room.game, ctx.player.id, card as any);
    if (err) return this.sendError(socket, err);
    if (ctx.room.game.phase === "game_over") ctx.room.phase = "game_over";
    this.broadcastGame(ctx.room);
  }

  handleExchangeReturn(socket: Sock, returnCards: string[]) {
    const ctx = this.ctx(socket);
    if (!ctx || !ctx.room.game) return;
    const err = handleExchangeReturn(
      ctx.room.game,
      ctx.player.id,
      returnCards as any
    );
    if (err) return this.sendError(socket, err);
    this.broadcastGame(ctx.room);
  }

  handleDisconnect(socket: Sock, removeEntirely = false) {
    const code = this.socketIndex.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const playerId = room.socketToPlayer.get(socket.id);
    this.socketIndex.delete(socket.id);
    room.socketToPlayer.delete(socket.id);
    if (!playerId) return;
    const player = room.players.get(playerId);
    if (!player) return;

    if (removeEntirely || room.phase === "lobby") {
      room.players.delete(playerId);
      if (room.hostId === playerId) {
        const next = Array.from(room.players.values()).find((p) => p.connected);
        if (next) {
          room.hostId = next.id;
          next.isHost = true;
        }
      }
      if (room.players.size === 0) {
        this.rooms.delete(room.code);
        return;
      }
    } else {
      player.connected = false;
      if (room.game) {
        const gp = room.game.players.find((p) => p.id === playerId);
        if (gp) gp.connected = false;
      }
      if (room.hostId === playerId) {
        const next = Array.from(room.players.values()).find(
          (p) => p.connected && p.id !== playerId
        );
        if (next) {
          room.hostId = next.id;
          player.isHost = false;
          next.isHost = true;
        }
      }
    }

    if (room.game) this.broadcastGame(room);
    else this.broadcastLobby(room);
  }

  // ---- broadcast helpers ----
  private broadcastLobby(room: CoupRoom) {
    const pub = {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase as any,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        revealedInfluences: p.revealedInfluences,
        influenceCount: 0,
        isAlive: true,
        isHost: p.isHost,
        connected: p.connected,
      })),
      currentPlayerId: null,
      turnPhase: null,
      pendingAction: null,
      log: [],
      winnerId: null,
    };
    this.io.to("coup:" + room.code).emit("coupRoom", pub);
  }

  private broadcastGame(room: CoupRoom) {
    if (!room.game) return;
    const pub = toPublicRoom(room.game);
    this.io.to("coup:" + room.code).emit("coupRoom", pub);

    // Send private data to each player
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      const sock = this.io.sockets.sockets.get(socketId) as Sock | undefined;
      if (sock) {
        sock.emit("coupPrivate", toPrivateData(room.game, playerId));
      }
    }
  }

  private sendError(socket: Sock, message: string) {
    socket.emit("coupError", { message });
  }

  private ctx(socket: Sock): { room: CoupRoom; player: CoupPlayer } | null {
    const code = this.socketIndex.get(socket.id);
    if (!code) return null;
    const room = this.rooms.get(code);
    if (!room) return null;
    const pid = room.socketToPlayer.get(socket.id);
    if (!pid) return null;
    const player = room.players.get(pid);
    if (!player) return null;
    return { room, player };
  }
}
