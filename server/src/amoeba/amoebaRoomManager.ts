import type { Server, Socket } from "socket.io";
import type {
  AmoebaClientToServerEvents,
  AmoebaServerToClientEvents,
  AmoebaPlayer,
} from "@blindman/shared";
import {
  type AmoebaState,
  createLobbyState,
  startGame,
  submitPrompt,
  submitAnswer,
  allAnswersSubmitted,
  startAnswerReveal,
  startGuessing,
  advanceTurn,
  processGuess,
  toPublicState,
} from "./amoebaLogic";

type IO = Server<AmoebaClientToServerEvents, AmoebaServerToClientEvents>;
type Sock = Socket<AmoebaClientToServerEvents, AmoebaServerToClientEvents>;

const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function genCode(len = 4): string {
  let s = "";
  for (let i = 0; i < len; i++)
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return s;
}

function genPlayerId(): string {
  return "ap_" + Math.random().toString(36).slice(2, 10);
}

export class AmoebaRoomManager {
  private rooms = new Map<string, AmoebaState>();
  private socketIndex = new Map<string, string>(); // socketId -> roomCode
  private socketToPlayer = new Map<string, Map<string, string>>(); // code -> (socketId -> playerId)

  constructor(private io: IO) {}

  createRoom(socket: Sock, name: string) {
    name = (name || "Player").trim().slice(0, 20) || "Player";
    let code = genCode();
    while (this.rooms.has(code)) code = genCode();
    const playerId = genPlayerId();

    const state = createLobbyState(code, playerId);
    state.players.push({ id: playerId, name, isHost: true, connected: true });

    const sockMap = new Map([[socket.id, playerId]]);
    this.rooms.set(code, state);
    this.socketToPlayer.set(code, sockMap);
    this.socketIndex.set(socket.id, code);

    socket.join("amoeba:" + code);
    socket.emit("amoebaYouAre", { playerId });
    this.broadcast(state);
    return { code, playerId };
  }

  joinRoom(socket: Sock, code: string, name: string) {
    code = (code || "").toUpperCase().trim();
    const state = this.rooms.get(code);
    if (!state) throw new Error("Room not found");
    name = (name || "Player").trim().slice(0, 20) || "Player";

    const existing = state.players.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return this.bindSocket(socket, state, existing);

    if (state.phase !== "lobby")
      throw new Error("Game in progress — rejoin with your original name");

    const playerId = genPlayerId();
    const player: AmoebaPlayer = { id: playerId, name, isHost: false, connected: true };
    state.players.push(player);

    const sockMap = this.socketToPlayer.get(code)!;
    sockMap.set(socket.id, playerId);
    this.socketIndex.set(socket.id, code);

    socket.join("amoeba:" + code);
    socket.emit("amoebaYouAre", { playerId });
    this.broadcast(state);
    return { playerId };
  }

  rejoin(socket: Sock, code: string, name: string) {
    code = (code || "").toUpperCase().trim();
    const state = this.rooms.get(code);
    if (!state) throw new Error("Room not found");
    const existing = state.players.find(
      (p) => p.name.toLowerCase() === (name || "").trim().toLowerCase()
    );
    if (!existing) throw new Error("No player with that name");
    return this.bindSocket(socket, state, existing);
  }

  private bindSocket(socket: Sock, state: AmoebaState, player: AmoebaPlayer) {
    const sockMap = this.socketToPlayer.get(state.code)!;
    // Remove stale socket mapping for this player
    for (const [sid, pid] of sockMap.entries()) {
      if (pid === player.id) sockMap.delete(sid);
    }
    sockMap.set(socket.id, player.id);
    this.socketIndex.set(socket.id, state.code);
    player.connected = true;
    socket.join("amoeba:" + state.code);
    socket.emit("amoebaYouAre", { playerId: player.id });
    this.broadcast(state);
    return { playerId: player.id };
  }

  handleStartGame(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { state, player } = ctx;
    if (player.id !== state.hostId) {
      this.sendError(socket, "Only the host can start the game.");
      return;
    }
    if (state.phase !== "lobby" && state.phase !== "game_over") {
      this.sendError(socket, "Game already in progress.");
      return;
    }
    try {
      startGame(state);
    } catch (e: any) {
      this.sendError(socket, e.message);
      return;
    }
    this.broadcast(state);
  }

  handleSubmitPrompt(socket: Sock, prompt: string) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    try {
      submitPrompt(ctx.state, ctx.player.id, prompt);
    } catch (e: any) {
      this.sendError(socket, e.message);
      return;
    }
    this.broadcast(ctx.state);
  }

  handleSubmitAnswer(socket: Sock, answer: string) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    try {
      submitAnswer(ctx.state, ctx.player.id, answer);
    } catch (e: any) {
      this.sendError(socket, e.message);
      return;
    }
    this.broadcast(ctx.state);

    if (allAnswersSubmitted(ctx.state)) {
      this.startRevealPhase(ctx.state);
    }
  }

  handleFinishAnswerReveal(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { state, player } = ctx;
    if (state.phase !== "showing_answers") return;
    if (player.id !== state.hostId) {
      this.sendError(socket, "Only the host can skip the reveal.");
      return;
    }
    this.cancelRevealTimer(state);
    startGuessing(state);
    this.broadcast(state);
  }

  handleMakeGuess(socket: Sock, targetPlayerId: string, guessedAnswer: string) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    try {
      processGuess(ctx.state, ctx.player.id, targetPlayerId, guessedAnswer);
    } catch (e: any) {
      this.sendError(socket, e.message);
      return;
    }
    this.broadcast(ctx.state);
  }

  handleUpdateSettings(
    socket: Sock,
    settings: Partial<{ answerDisplaySeconds: number }>
  ) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { state, player } = ctx;
    if (player.id !== state.hostId) return;
    if (state.phase !== "lobby") return;
    if (settings.answerDisplaySeconds !== undefined) {
      state.settings.answerDisplaySeconds = Math.max(
        5,
        Math.min(120, settings.answerDisplaySeconds)
      );
    }
    this.broadcast(state);
  }

  handlePlayAgain(socket: Sock) {
    const ctx = this.ctx(socket);
    if (!ctx) return;
    const { state, player } = ctx;
    if (player.id !== state.hostId) return;
    this.cancelRevealTimer(state);
    // Reset to lobby, keep players
    state.phase = "lobby";
    state.promptWriterId = null;
    state.prompt = null;
    state.answersByPlayerId = {};
    state.anonymousAnswers = null;
    state.revealedAnswers = [];
    state.submittedPlayerIds = [];
    state.amoebas = [];
    state.currentCaptainId = null;
    state.turnOrder = [];
    state.log = [];
    state.winnerId = null;
    state.answerRevealEndsAt = null;
    this.broadcast(state);
  }

  handleLeaveRoom(socket: Sock) {
    this.handleDisconnect(socket, true);
  }

  handleDisconnect(socket: Sock, removeEntirely = false) {
    const code = this.socketIndex.get(socket.id);
    if (!code) return;
    this.socketIndex.delete(socket.id);

    const state = this.rooms.get(code);
    const sockMap = this.socketToPlayer.get(code);
    if (!state || !sockMap) return;

    const playerId = sockMap.get(socket.id);
    sockMap.delete(socket.id);
    if (!playerId) return;

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    if (removeEntirely || state.phase === "lobby") {
      state.players = state.players.filter((p) => p.id !== playerId);
      if (state.hostId === playerId) {
        const next = state.players.find((p) => p.connected);
        if (next) {
          state.hostId = next.id;
          next.isHost = true;
        }
      }
      if (state.players.length === 0) {
        this.cancelRevealTimer(state);
        this.rooms.delete(code);
        this.socketToPlayer.delete(code);
        return;
      }
    } else {
      player.connected = false;
      if (state.hostId === playerId) {
        const next = state.players.find((p) => p.connected && p.id !== playerId);
        if (next) {
          state.hostId = next.id;
          player.isHost = false;
          next.isHost = true;
        }
      }
      // If the current captain disconnects during guessing, advance the turn.
      if (state.phase === "guessing" && state.currentCaptainId === playerId) {
        advanceTurn(state);
      }
    }

    this.broadcast(state);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private startRevealPhase(state: AmoebaState) {
    startAnswerReveal(state);
    this.broadcast(state);

    const delay = state.settings.answerDisplaySeconds * 1000;
    state.revealTimer = setTimeout(() => {
      state.revealTimer = null;
      if (state.phase === "showing_answers") {
        startGuessing(state);
        this.broadcast(state);
      }
    }, delay);
  }

  private cancelRevealTimer(state: AmoebaState) {
    if (state.revealTimer) {
      clearTimeout(state.revealTimer);
      state.revealTimer = null;
    }
  }

  private broadcast(state: AmoebaState) {
    this.io.to("amoeba:" + state.code).emit("amoebaRoom", toPublicState(state));
  }

  private sendError(socket: Sock, message: string) {
    socket.emit("amoebaError", { message });
  }

  private ctx(socket: Sock): { state: AmoebaState; player: AmoebaPlayer } | null {
    const code = this.socketIndex.get(socket.id);
    if (!code) return null;
    const state = this.rooms.get(code);
    if (!state) return null;
    const sockMap = this.socketToPlayer.get(code);
    if (!sockMap) return null;
    const pid = sockMap.get(socket.id);
    if (!pid) return null;
    const player = state.players.find((p) => p.id === pid);
    if (!player) return null;
    return { state, player };
  }
}
