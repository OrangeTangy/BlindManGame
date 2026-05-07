import type { Server, Socket } from "socket.io";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type Player,
  type Duo,
  type RoomPublic,
  type GamePhase,
  type Role,
  type GauntletStage,
  type GauntletNotification,
  type AnyMinigameAction,
  makeSeed,
} from "@blindman/shared";
import { createEngine, type MinigameEngine } from "./minigames";
import { planGauntlet, GAUNTLET_LENGTH } from "./gauntlet/plan";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

interface Room {
  code: string;
  hostId: string;
  phase: GamePhase;
  players: Map<string, Player>;
  socketToPlayer: Map<string, string>;
  duos: Duo[];
  plan: GauntletStage[] | null;
  notifications: GauntletNotification[];
  engines: Map<string, MinigameEngine>; // duoId -> active engine
  timers: { roomBroadcast?: NodeJS.Timeout };
}

const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_DUOS = 6;
const TICK_MS = 100;
const ROOM_BROADCAST_MS = 400;
const NOTIFICATION_KEEP = 30;

function genCode(len = 4) {
  let s = "";
  for (let i = 0; i < len; i++) s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return s;
}
function genPlayerId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
}
function genNotificationId() {
  return "n_" + Math.random().toString(36).slice(2, 10);
}
function freshDuo(playerIds: string[], index: number): Duo {
  return {
    id: "d_" + Math.random().toString(36).slice(2, 8),
    label: `Team ${index + 1}`,
    playerIds,
    stageIndex: -1,
    runStartedAt: null,
    runEndedAt: null,
    stageStartedAt: null,
    penaltyMs: 0,
    totalTimeMs: null,
    rank: null,
    stageResults: [],
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketIndex = new Map<string, string>(); // socketId -> roomCode
  private tickTimer: NodeJS.Timeout;

  constructor(private io: IO) {
    this.tickTimer = setInterval(() => this.tickAll(), TICK_MS);
  }

  // ---------- lifecycle ----------
  createRoom(socket: Sock, name: string) {
    name = (name || "Player").trim().slice(0, 20) || "Player";
    let code = genCode();
    while (this.rooms.has(code)) code = genCode();
    const playerId = genPlayerId();
    const duo = freshDuo([playerId], 0);
    const room: Room = {
      code,
      hostId: playerId,
      phase: "lobby",
      players: new Map(),
      socketToPlayer: new Map(),
      duos: [duo],
      plan: null,
      notifications: [],
      engines: new Map(),
      timers: {},
    };
    const player: Player = {
      id: playerId, name, duoId: duo.id,
      role: null, isHost: true, ready: false, connected: true,
    };
    room.players.set(playerId, player);
    room.socketToPlayer.set(socket.id, playerId);
    this.rooms.set(code, room);
    this.socketIndex.set(socket.id, code);
    socket.join(code);
    this.recomputeRoles(room);
    this.emitYouAre(socket, player);
    this.startRoomBroadcast(room);
    this.broadcast(room);
    return { code, playerId };
  }

  joinRoom(socket: Sock, code: string, name: string) {
    code = (code || "").toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    name = (name || "Player").trim().slice(0, 20) || "Player";
    const existing = this.findPlayerByName(room, name);
    if (existing && !existing.connected) return this.bindSocket(socket, room, existing);
    if (room.phase !== "lobby" && room.phase !== "match_summary") {
      if (existing) return this.bindSocket(socket, room, existing);
      throw new Error("Game in progress — rejoin with your original name");
    }
    const playerId = genPlayerId();
    const duo = this.findOrCreateOpenDuo(room);
    const player: Player = {
      id: playerId, name, duoId: duo.id,
      role: null, isHost: false, ready: false, connected: true,
    };
    duo.playerIds.push(playerId);
    room.players.set(playerId, player);
    room.socketToPlayer.set(socket.id, playerId);
    this.socketIndex.set(socket.id, code);
    socket.join(code);
    this.recomputeRoles(room);
    this.emitYouAre(socket, player);
    this.broadcast(room);
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

  private bindSocket(socket: Sock, room: Room, player: Player) {
    for (const [sid, pid] of room.socketToPlayer.entries()) {
      if (pid === player.id) room.socketToPlayer.delete(sid);
    }
    room.socketToPlayer.set(socket.id, player.id);
    this.socketIndex.set(socket.id, room.code);
    socket.join(room.code);
    player.connected = true;
    this.emitYouAre(socket, player);
    this.broadcast(room);
    if (room.phase === "gauntlet") {
      // replay current stage start + state
      const duo = room.duos.find((d) => d.id === player.duoId);
      if (duo && duo.stageIndex >= 0 && duo.runEndedAt === null && room.plan) {
        const stage = room.plan[duo.stageIndex];
        if (stage && duo.stageStartedAt !== null) {
          socket.emit("stageStart", { duoId: duo.id, stage, startedAt: duo.stageStartedAt });
          this.emitMinigameToPlayer(socket, room, player);
        }
      }
    }
    return { playerId: player.id };
  }

  private findPlayerByName(room: Room, name: string): Player | undefined {
    const n = (name || "").trim().toLowerCase();
    for (const p of room.players.values()) if (p.name.toLowerCase() === n) return p;
    return undefined;
  }
  private findOrCreateOpenDuo(room: Room): Duo {
    const open = room.duos.find((d) => d.playerIds.length < 2);
    if (open) return open;
    if (room.duos.length >= MAX_DUOS) throw new Error("Room is full");
    const duo = freshDuo([], room.duos.length);
    room.duos.push(duo);
    return duo;
  }

  // ---------- lobby controls ----------
  setReady(socket: Sock, ready: boolean) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    if (ctx.room.phase !== "lobby" && ctx.room.phase !== "match_summary") return;
    ctx.player.ready = ready;
    this.broadcast(ctx.room);
  }

  switchDuo(socket: Sock, duoId: string) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== "lobby") return;
    const target = room.duos.find((d) => d.id === duoId);
    if (!target) return;
    if (target.playerIds.length >= 2 && !target.playerIds.includes(player.id)) return;
    const current = room.duos.find((d) => d.id === player.duoId);
    if (current) current.playerIds = current.playerIds.filter((id) => id !== player.id);
    if (!target.playerIds.includes(player.id)) target.playerIds.push(player.id);
    player.duoId = target.id;
    room.duos = room.duos.filter((d, i) => d.playerIds.length > 0 || i === 0);
    room.duos.forEach((d, i) => (d.label = `Team ${i + 1}`));
    this.recomputeRoles(room);
    this.broadcastYouAre(room);
    this.broadcast(room);
  }

  startGame(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { room, player } = ctx;
    if (player.id !== room.hostId) return;
    if (room.phase !== "lobby" && room.phase !== "match_summary") return;
    const completeDuos = room.duos.filter((d) => d.playerIds.length === 2);
    if (completeDuos.length < 1) {
      this.sendError(socket, "Need at least one full duo (2 players).");
      return;
    }
    const allReady = Array.from(room.players.values()).every((p) => p.ready || !p.connected);
    if (!allReady) {
      this.sendError(socket, "All players must be ready.");
      return;
    }

    // Plan the gauntlet — identical stages for all duos.
    room.plan = planGauntlet(makeSeed(), GAUNTLET_LENGTH);
    room.phase = "gauntlet";
    room.notifications = [];
    this.addNotification(room, {
      kind: "start",
      duoId: null,
      duoLabel: null,
      text: `Gauntlet started! ${GAUNTLET_LENGTH} minigames — fastest duo wins.`,
    });

    const now = Date.now();
    for (const duo of room.duos) {
      // reset run state
      duo.stageIndex = -1;
      duo.runStartedAt = null;
      duo.runEndedAt = null;
      duo.stageStartedAt = null;
      duo.penaltyMs = 0;
      duo.totalTimeMs = null;
      duo.rank = null;
      duo.stageResults = [];
      if (duo.playerIds.length === 2) {
        duo.runStartedAt = now;
        duo.stageIndex = 0;
        this.startStageForDuo(room, duo);
      }
    }
    this.broadcast(room);
  }

  playAgain(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { room, player } = ctx;
    if (player.id !== room.hostId) return;
    if (room.phase !== "match_summary") return;
    // Reset to lobby.
    room.phase = "lobby";
    room.plan = null;
    room.notifications = [];
    room.engines.forEach((e) => e.dispose?.());
    room.engines.clear();
    for (const duo of room.duos) {
      duo.stageIndex = -1;
      duo.runStartedAt = null;
      duo.runEndedAt = null;
      duo.stageStartedAt = null;
      duo.penaltyMs = 0;
      duo.totalTimeMs = null;
      duo.rank = null;
      duo.stageResults = [];
    }
    for (const p of room.players.values()) p.ready = false;
    this.broadcast(room);
  }

  leaveRoom(socket: Sock) {
    this.handleDisconnect(socket, true);
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
      for (const d of room.duos) d.playerIds = d.playerIds.filter((id) => id !== playerId);
      room.duos = room.duos.filter((d, i) => d.playerIds.length > 0 || i === 0);
      room.duos.forEach((d, i) => (d.label = `Team ${i + 1}`));
      if (room.hostId === playerId) {
        const next = Array.from(room.players.values()).find((p) => p.connected);
        if (next) { room.hostId = next.id; next.isHost = true; }
      }
      if (room.players.size === 0) { this.destroyRoom(room); return; }
    } else {
      player.connected = false;
      if (room.hostId === playerId) {
        const next = Array.from(room.players.values()).find(
          (p) => p.connected && p.id !== playerId
        );
        if (next) { room.hostId = next.id; player.isHost = false; next.isHost = true; }
      }
    }
    this.recomputeRoles(room);
    this.broadcast(room);
  }

  // ---------- gauntlet loop ----------
  private startStageForDuo(room: Room, duo: Duo) {
    if (!room.plan) return;
    const stage = room.plan[duo.stageIndex];
    if (!stage) return;
    const engine = createEngine(stage.kind);
    engine.init(duo.id, stage.seed, stage.difficulty);
    room.engines.set(duo.id, engine);
    // The engine is initialised but the playable phase doesn't start until
    // the intro window has elapsed. `stageStartedAt` is set to that future
    // moment so the client can detect the intro phase via `now < stageStartedAt`,
    // and the run-clock + stage-timeout only count playable time.
    duo.stageStartedAt = Date.now() + (stage.introMs ?? 0);
    // Emit stageStart immediately so the client renders the overlay; the
    // overlay reads `startedAt` and shows itself until that timestamp.
    this.emitToDuo(room, duo, (sock) =>
      sock.emit("stageStart", { duoId: duo.id, stage, startedAt: duo.stageStartedAt! })
    );
    this.emitMinigameForDuo(room, duo);
  }

  private endStageForDuo(room: Room, duo: Duo, success: boolean) {
    if (!room.plan) return;
    const stage = room.plan[duo.stageIndex];
    if (!stage) return;
    const engine = room.engines.get(duo.id);
    const now = Date.now();
    const timeMs = Math.max(0, now - (duo.stageStartedAt ?? now));
    duo.stageResults.push({ stageIndex: duo.stageIndex, success, timeMs });
    if (!success) duo.penaltyMs += stage.penaltyMs;

    // Fire stageEnd to room.
    this.io.to(room.code).emit("stageEnd", {
      duoId: duo.id,
      stageIndex: duo.stageIndex,
      success,
      timeMs,
      penaltyMs: success ? 0 : stage.penaltyMs,
    });

    const nameOfStage = stage.kind.toUpperCase();
    if (success) {
      this.addNotification(room, {
        kind: "stage_complete",
        duoId: duo.id,
        duoLabel: duo.label,
        text: `${duo.label} cleared ${nameOfStage} — stage ${stage.index + 1}/${GAUNTLET_LENGTH} in ${(timeMs / 1000).toFixed(1)}s`,
      });
    } else {
      this.addNotification(room, {
        kind: "stage_failed",
        duoId: duo.id,
        duoLabel: duo.label,
        text: `${duo.label} failed ${nameOfStage} — +${(stage.penaltyMs / 1000).toFixed(0)}s penalty`,
      });
    }

    engine?.dispose?.();
    room.engines.delete(duo.id);

    duo.stageIndex++;

    if (duo.stageIndex >= room.plan.length) {
      // Run complete!
      duo.runEndedAt = now;
      duo.totalTimeMs = (now - (duo.runStartedAt ?? now)) + duo.penaltyMs;
      const finished = room.duos
        .filter((d) => d.runEndedAt !== null)
        .sort((a, b) => (a.totalTimeMs ?? Infinity) - (b.totalTimeMs ?? Infinity));
      duo.rank = finished.findIndex((d) => d.id === duo.id) + 1;
      // Re-rank everyone who's finished, based on total time.
      finished.forEach((d, i) => (d.rank = i + 1));
      this.io.to(room.code).emit("runEnd", {
        duoId: duo.id, totalMs: duo.totalTimeMs, rank: duo.rank,
      });
      this.addNotification(room, {
        kind: "run_complete",
        duoId: duo.id,
        duoLabel: duo.label,
        text: `${duo.label} FINISHED in ${(duo.totalTimeMs / 1000).toFixed(1)}s (rank #${duo.rank})`,
      });
      // If every playable duo is done, end the match.
      const playable = room.duos.filter((d) => d.playerIds.length === 2);
      if (playable.every((d) => d.runEndedAt !== null)) {
        this.endMatch(room);
      }
    } else {
      // Immediately start the next stage — no round-results screen.
      this.startStageForDuo(room, duo);
    }
    this.broadcast(room);
  }

  private endMatch(room: Room) {
    room.phase = "match_summary";
    const standings = room.duos
      .filter((d) => d.playerIds.length === 2)
      .map((d) => ({
        duoId: d.id,
        label: d.label,
        totalMs: d.totalTimeMs ?? Infinity,
        rank: d.rank ?? 999,
        finished: d.runEndedAt !== null,
      }))
      .sort((a, b) => a.totalMs - b.totalMs);
    this.io.to(room.code).emit("matchEnd", { standings });
    this.broadcast(room);
  }

  // Main tick — drives time-based engines (Runner, Parkour) and stage timeouts.
  private tickAll() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.phase !== "gauntlet" || !room.plan) continue;
      for (const duo of room.duos) {
        if (duo.playerIds.length !== 2) continue;
        if (duo.runEndedAt !== null) continue;
        if (duo.stageIndex < 0 || duo.stageIndex >= room.plan.length) continue;
        const engine = room.engines.get(duo.id);
        if (!engine) continue;
        // Skip ticking + timeout while the duo is still inside the pre-stage
        // intro window. We DO still emit minigame state so the client can
        // show the initial position / glyph / palette while the player reads
        // the rules; we just don't advance time-based state.
        const inIntro = duo.stageStartedAt !== null && now < duo.stageStartedAt;
        if (!inIntro) {
          engine.tick?.(TICK_MS);
          const status = engine.isDoneFor(duo.id);
          if (status.done) {
            this.endStageForDuo(room, duo, status.success);
            continue;
          }
          // Stage timeout
          const stage = room.plan[duo.stageIndex];
          if (duo.stageStartedAt && now - duo.stageStartedAt > stage.durationMs) {
            this.endStageForDuo(room, duo, false);
            continue;
          }
        }
        // Broadcast current minigame state to that duo's players.
        this.emitMinigameForDuo(room, duo);
      }
    }
  }

  handleAction(socket: Sock, action: AnyMinigameAction) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== "gauntlet") return;
    if (player.role !== "blind") return;
    const duo = room.duos.find((d) => d.id === player.duoId);
    if (!duo || duo.runEndedAt !== null) return;
    // Reject all actions during the pre-stage intro window so blind players
    // can't fat-finger their way through the rules screen.
    if (duo.stageStartedAt !== null && Date.now() < duo.stageStartedAt) return;
    const engine = room.engines.get(duo.id);
    if (!engine) return;
    engine.handleAction(duo.id, action);
    const status = engine.isDoneFor(duo.id);
    if (status.done) {
      this.endStageForDuo(room, duo, status.success);
    } else {
      this.emitMinigameForDuo(room, duo);
    }
  }

  // ---------- role assignment ----------
  private recomputeRoles(room: Room) {
    for (const duo of room.duos) {
      if (duo.playerIds.length === 2) {
        const [a, b] = duo.playerIds;
        const pa = room.players.get(a);
        const pb = room.players.get(b);
        if (pa && pb) {
          if (pa.role == null && pb.role == null) {
            const [first, second] = [a, b].sort();
            room.players.get(first)!.role = "blind";
            room.players.get(second)!.role = "guide";
          } else if (pa.role == null && pb.role) {
            pa.role = pb.role === "blind" ? "guide" : "blind";
          } else if (pb.role == null && pa.role) {
            pb.role = pa.role === "blind" ? "guide" : "blind";
          }
        }
      } else {
        for (const pid of duo.playerIds) {
          const p = room.players.get(pid);
          if (p) p.role = null;
        }
      }
    }
  }

  // ---------- notifications ----------
  private addNotification(room: Room, n: Omit<GauntletNotification, "id" | "at">) {
    const notif: GauntletNotification = {
      id: genNotificationId(),
      at: Date.now(),
      ...n,
    };
    room.notifications.push(notif);
    if (room.notifications.length > NOTIFICATION_KEEP) {
      room.notifications.splice(0, room.notifications.length - NOTIFICATION_KEEP);
    }
    this.io.to(room.code).emit("notification", notif);
  }

  // ---------- broadcast helpers ----------
  private publicRoom(room: Room): RoomPublic {
    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      players: Array.from(room.players.values()),
      duos: room.duos,
      plan: room.plan,
      notifications: room.notifications,
      serverNow: Date.now(),
      totalStages: GAUNTLET_LENGTH,
    };
  }

  private broadcast(room: Room) {
    this.io.to(room.code).emit("room", this.publicRoom(room));
  }

  /** Throttled room broadcast so the global timer stays fresh for everyone. */
  private startRoomBroadcast(room: Room) {
    if (room.timers.roomBroadcast) return;
    room.timers.roomBroadcast = setInterval(() => {
      if (!this.rooms.has(room.code)) return;
      this.broadcast(room);
    }, ROOM_BROADCAST_MS);
  }

  private broadcastYouAre(room: Room) {
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      const sock = this.io.sockets.sockets.get(socketId);
      const player = room.players.get(playerId);
      if (sock && player) this.emitYouAre(sock, player);
    }
  }
  private emitYouAre(socket: Sock, player: Player) {
    socket.emit("youAre", {
      playerId: player.id, role: player.role, duoId: player.duoId,
    });
  }

  private emitToDuo(room: Room, duo: Duo, fn: (sock: Sock) => void) {
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      if (!duo.playerIds.includes(playerId)) continue;
      const sock = this.io.sockets.sockets.get(socketId) as Sock | undefined;
      if (sock) fn(sock);
    }
  }

  private emitMinigameForDuo(room: Room, duo: Duo) {
    const engine = room.engines.get(duo.id);
    if (!engine) return;
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      if (!duo.playerIds.includes(playerId)) continue;
      const sock = this.io.sockets.sockets.get(socketId) as Sock | undefined;
      const player = room.players.get(playerId);
      if (!sock || !player) continue;
      this.emitMinigameToPlayer(sock, room, player);
    }
  }

  private emitMinigameToPlayer(socket: Sock, room: Room, player: Player) {
    const engine = room.engines.get(player.duoId);
    if (!engine) return;
    if (player.role === "blind") {
      socket.emit("minigameState", { state: engine.getBlindState(player.duoId) });
    } else if (player.role === "guide") {
      socket.emit("minigameState", { state: engine.getGuideState(player.duoId) });
    } else {
      socket.emit("minigameState", { state: engine.getBlindState(player.duoId) });
    }
  }

  private sendError(socket: Sock, message: string) {
    socket.emit("errorMessage", { message });
  }

  private ctx(socket: Sock): { room: Room; player: Player } | null {
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

  private destroyRoom(room: Room) {
    if (room.timers.roomBroadcast) clearInterval(room.timers.roomBroadcast);
    for (const e of room.engines.values()) e.dispose?.();
    room.engines.clear();
    this.rooms.delete(room.code);
  }
}
