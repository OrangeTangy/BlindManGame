/**
 * amoebaLogic.ts — Pure game-state functions for Amoeba.
 *
 * All state mutations happen here. The room manager calls these functions
 * and then broadcasts the result. No Socket.IO knowledge here.
 *
 * Amoeba merge rules (key invariants):
 *   • Every player starts as sole captain of their own single-member amoeba.
 *   • Only captains take guessing turns.
 *   • Correct guess of a NON-captain: that player moves to the guesser's amoeba.
 *   • Correct guess of a CAPTAIN: the captain's ENTIRE amoeba merges into the guesser's amoeba.
 *   • Prompt writer has no submitted answer and cannot be guessed as a target.
 *   • Game over when all players who submitted answers are in one amoeba.
 */

import type {
  AmoebaPlayer,
  Amoeba,
  AmoebaLogEntry,
  AmoebaSettings,
  AmoebaRoomPublic,
  RevealedAnswer,
  AmoebaPhase,
} from "@blindman/shared";
import { isCloseEnough } from "./fuzzyMatch";

// ─── Internal state (never sent to client) ───────────────────────────────────

export interface AmoebaState {
  code: string;
  hostId: string;
  phase: AmoebaPhase;
  players: AmoebaPlayer[];
  settings: AmoebaSettings;
  promptWriterId: string | null;
  prompt: string | null;
  /** SERVER-ONLY: never serialised to clients. Maps playerId → answer text. */
  answersByPlayerId: Record<string, string>;
  // Public fields (safe to broadcast)
  anonymousAnswers: string[] | null;
  revealedAnswers: RevealedAnswer[];
  submittedPlayerIds: string[];
  amoebas: Amoeba[];
  currentCaptainId: string | null;
  /** Ordered captain IDs — maintained as captains get absorbed. */
  turnOrder: string[];
  log: AmoebaLogEntry[];
  winnerId: string | null;
  answerRevealEndsAt: number | null;
  /** Server-side timer for auto-advancing from showing_answers → guessing. */
  revealTimer: ReturnType<typeof setTimeout> | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function addLog(
  state: AmoebaState,
  text: string,
  kind: AmoebaLogEntry["kind"] = "info"
): void {
  state.log.push({ id: genId(), text, at: Date.now(), kind });
  if (state.log.length > 100) state.log.splice(0, state.log.length - 100);
}

function playerName(state: AmoebaState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? "?";
}

function amoebaOfCaptain(state: AmoebaState, captainId: string): Amoeba | undefined {
  return state.amoebas.find((a) => a.captainId === captainId);
}

function amoebaContaining(state: AmoebaState, playerId: string): Amoeba | undefined {
  return state.amoebas.find((a) => a.memberIds.includes(playerId));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function createLobbyState(code: string, hostId: string): AmoebaState {
  return {
    code,
    hostId,
    phase: "lobby",
    players: [],
    settings: { answerDisplaySeconds: 20 },
    promptWriterId: null,
    prompt: null,
    answersByPlayerId: {},
    anonymousAnswers: null,
    revealedAnswers: [],
    submittedPlayerIds: [],
    amoebas: [],
    currentCaptainId: null,
    turnOrder: [],
    log: [],
    winnerId: null,
    answerRevealEndsAt: null,
    revealTimer: null,
  };
}

/** Pick a random prompt writer and initialise one amoeba per player. */
export function startGame(state: AmoebaState): void {
  const connected = state.players.filter((p) => p.connected);
  if (connected.length < 2) throw new Error("Need at least 2 players.");

  // Clear previous round state.
  state.answersByPlayerId = {};
  state.anonymousAnswers = null;
  state.revealedAnswers = [];
  state.submittedPlayerIds = [];
  state.log = [];
  state.winnerId = null;
  state.answerRevealEndsAt = null;
  state.prompt = null;

  const shuffled = shuffle(connected);
  state.promptWriterId = shuffled[0].id;

  // One amoeba per player, each player is their own captain.
  state.amoebas = connected.map((p, i) => ({
    id: genId(),
    captainId: p.id,
    memberIds: [p.id],
    colorIndex: i % 8,
  }));

  state.phase = "writing_prompt";
  addLog(
    state,
    `Game started! ${playerName(state, state.promptWriterId)} is writing the prompt.`,
    "system"
  );
}

export function submitPrompt(
  state: AmoebaState,
  playerId: string,
  prompt: string
): void {
  if (state.phase !== "writing_prompt") throw new Error("Not in prompt-writing phase.");
  if (state.promptWriterId !== playerId) throw new Error("You are not the prompt writer.");
  const text = prompt.trim();
  if (!text) throw new Error("Prompt cannot be empty.");

  state.prompt = text;
  state.phase = "submitting_answers";
  addLog(state, `Prompt: "${text}"`, "info");
}

export function submitAnswer(
  state: AmoebaState,
  playerId: string,
  answer: string
): void {
  if (state.phase !== "submitting_answers")
    throw new Error("Not in answer-submission phase.");
  if (playerId === state.promptWriterId)
    throw new Error("The prompt writer does not submit an answer.");
  const text = answer.trim();
  if (!text) throw new Error("Answer cannot be empty.");

  state.answersByPlayerId[playerId] = text;
  if (!state.submittedPlayerIds.includes(playerId))
    state.submittedPlayerIds.push(playerId);

  addLog(state, `${playerName(state, playerId)} submitted their answer.`, "info");
}

/** True once every non-prompt-writer has answered. */
export function allAnswersSubmitted(state: AmoebaState): boolean {
  return state.players
    .filter((p) => p.id !== state.promptWriterId && p.connected)
    .every((p) => state.answersByPlayerId[p.id] !== undefined);
}

/**
 * Shuffle and reveal answers, start the display countdown.
 * Returns the epoch ms when the display window ends.
 */
export function startAnswerReveal(state: AmoebaState): number {
  state.anonymousAnswers = shuffle(Object.values(state.answersByPlayerId));
  state.phase = "showing_answers";
  const endsAt = Date.now() + state.settings.answerDisplaySeconds * 1000;
  state.answerRevealEndsAt = endsAt;
  addLog(state, "Answers revealed! Memorise them — they'll hide soon.", "info");
  return endsAt;
}

/** Hide answers and begin the guessing phase with a random first captain. */
export function startGuessing(state: AmoebaState): void {
  state.anonymousAnswers = null;
  state.answerRevealEndsAt = null;
  state.phase = "guessing";

  const captainIds = state.amoebas.map((a) => a.captainId);
  state.turnOrder = shuffle(captainIds);
  state.currentCaptainId = state.turnOrder[0];

  addLog(
    state,
    `Guessing starts! ${playerName(state, state.currentCaptainId!)} goes first.`,
    "system"
  );
}

/**
 * Advance to the next active captain in the cyclic turn order.
 * Prunes absorbed captains from the stored order as it goes.
 */
export function advanceTurn(state: AmoebaState): void {
  const activeCaptains = new Set(state.amoebas.map((a) => a.captainId));
  const active = state.turnOrder.filter((id) => activeCaptains.has(id));
  state.turnOrder = active; // keep it tidy
  if (active.length === 0) return;

  const idx = active.indexOf(state.currentCaptainId!);
  const next = active[(idx + 1) % active.length];
  state.currentCaptainId = next;
  addLog(state, `Turn passes to ${playerName(state, next)}.`, "info");
}

/**
 * Win condition: all players who submitted answers are inside one amoeba.
 * The prompt-writer's singleton amoeba doesn't count as a blocker — they
 * couldn't be guessed, so the game ends without needing to absorb them.
 * Returns the winning captainId or null if the game is still ongoing.
 */
function checkGameOver(state: AmoebaState): string | null {
  // Amoebas that contain at least one answer-submitter.
  const real = state.amoebas.filter((a) =>
    a.memberIds.some((id) => state.answersByPlayerId[id] !== undefined)
  );
  if (real.length === 1) return real[0].captainId;
  // Edge: prompt writer absorbed everyone (their amoeba IS the real amoeba).
  if (state.amoebas.length === 1) return state.amoebas[0].captainId;
  return null;
}

/** At game-end, expose all answer→player mappings that were never guessed. */
function revealAllRemaining(state: AmoebaState): void {
  const done = new Set(state.revealedAnswers.map((r) => r.playerId));
  for (const [pid, answer] of Object.entries(state.answersByPlayerId)) {
    if (!done.has(pid)) {
      state.revealedAnswers.push({
        playerId: pid,
        playerName: playerName(state, pid),
        answer,
      });
    }
  }
}

/**
 * Absorb targetPlayerId into captainId's amoeba.
 *
 * If target IS a captain → their entire amoeba merges in (captain-absorb).
 * If target is a plain member → only that player moves (member-absorb).
 */
function absorb(state: AmoebaState, captainId: string, targetPlayerId: string): void {
  const captainAm = amoebaOfCaptain(state, captainId)!;
  const targetAm = amoebaContaining(state, targetPlayerId)!;
  const capName = playerName(state, captainId);
  const tgtName = playerName(state, targetPlayerId);

  if (targetAm.captainId === targetPlayerId) {
    // ── Captain-absorb: entire amoeba merges ──────────────────────────────
    for (const mid of targetAm.memberIds) {
      if (!captainAm.memberIds.includes(mid)) captainAm.memberIds.push(mid);
    }
    state.amoebas = state.amoebas.filter((a) => a.id !== targetAm.id);
    state.turnOrder = state.turnOrder.filter((id) => id !== targetPlayerId);
    addLog(
      state,
      `🦠 ${tgtName}'s entire amoeba absorbed into ${capName}'s amoeba!`,
      "merge"
    );
  } else {
    // ── Member-absorb: just the one player ───────────────────────────────
    targetAm.memberIds = targetAm.memberIds.filter((id) => id !== targetPlayerId);
    captainAm.memberIds.push(targetPlayerId);
    addLog(state, `${tgtName} absorbed into ${capName}'s amoeba.`, "merge");
  }
}

/**
 * Main guessing action. Called by the room manager when a captain submits a guess.
 * Returns { correct } so the caller can react (e.g. broadcast immediately).
 */
export function processGuess(
  state: AmoebaState,
  captainId: string,
  targetPlayerId: string,
  guessedAnswer: string
): { correct: boolean } {
  if (state.phase !== "guessing") throw new Error("Not in guessing phase.");
  if (state.currentCaptainId !== captainId) throw new Error("Not your turn.");
  if (!amoebaOfCaptain(state, captainId)) throw new Error("You are not a captain.");

  const captainAm = amoebaOfCaptain(state, captainId)!;
  if (captainAm.memberIds.includes(targetPlayerId))
    throw new Error("Cannot guess your own team member.");
  if (targetPlayerId === state.promptWriterId)
    throw new Error("The prompt writer has no answer to guess.");

  const actualAnswer = state.answersByPlayerId[targetPlayerId];
  if (!actualAnswer) throw new Error("That player has no submitted answer.");

  const capName = playerName(state, captainId);
  const tgtName = playerName(state, targetPlayerId);

  if (isCloseEnough(actualAnswer, guessedAnswer)) {
    // ── Correct ──────────────────────────────────────────────────────────
    state.revealedAnswers.push({
      playerId: targetPlayerId,
      playerName: tgtName,
      answer: actualAnswer,
    });
    addLog(
      state,
      `✓ ${capName} correctly guessed ${tgtName}: "${actualAnswer}"`,
      "correct"
    );

    absorb(state, captainId, targetPlayerId);

    const winner = checkGameOver(state);
    if (winner) {
      state.winnerId = winner;
      state.phase = "game_over";
      revealAllRemaining(state);
      addLog(state, `🏆 ${playerName(state, winner)} wins!`, "win");
    }
    // Captain keeps their turn on a correct guess — no advanceTurn call.
    return { correct: true };
  } else {
    // ── Incorrect ────────────────────────────────────────────────────────
    addLog(
      state,
      `✗ ${capName} guessed "${guessedAnswer}" for ${tgtName}. Wrong!`,
      "incorrect"
    );
    advanceTurn(state);
    return { correct: false };
  }
}

/** Serialise to the shape that is safe to broadcast to all clients. */
export function toPublicState(state: AmoebaState): AmoebaRoomPublic {
  return {
    code: state.code,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players,
    settings: state.settings,
    promptWriterId: state.promptWriterId,
    prompt: state.prompt,
    anonymousAnswers: state.anonymousAnswers,
    revealedAnswers: state.revealedAnswers,
    submittedPlayerIds: state.submittedPlayerIds,
    amoebas: state.amoebas,
    currentCaptainId: state.currentCaptainId,
    log: state.log,
    winnerId: state.winnerId,
    answerRevealEndsAt: state.answerRevealEndsAt,
  };
}
