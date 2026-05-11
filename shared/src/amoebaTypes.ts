export interface AmoebaPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
}

export type AmoebaPhase =
  | "lobby"
  | "writing_prompt"
  | "submitting_answers"
  | "showing_answers"
  | "guessing"
  | "game_over";

/** One team. The captain is always in memberIds too. */
export interface Amoeba {
  id: string;
  captainId: string;
  memberIds: string[];
  /** 0-7, used to pick a UI color */
  colorIndex: number;
}

export interface AmoebaLogEntry {
  id: string;
  text: string;
  at: number;
  kind: "info" | "correct" | "incorrect" | "merge" | "win" | "system";
}

export interface AmoebaSettings {
  /** Seconds the answers are displayed before hiding. Default 20. */
  answerDisplaySeconds: number;
}

export interface RevealedAnswer {
  playerId: string;
  playerName: string;
  answer: string;
}

export interface AmoebaRoomPublic {
  code: string;
  hostId: string;
  phase: AmoebaPhase;
  players: AmoebaPlayer[];
  settings: AmoebaSettings;
  /** Who writes the prompt — has no answer for their own prompt. */
  promptWriterId: string | null;
  prompt: string | null;
  /** Shuffled answer texts shown during showing_answers (no player IDs). */
  anonymousAnswers: string[] | null;
  /** Grows as correct guesses reveal answer ownership. */
  revealedAnswers: RevealedAnswer[];
  /** Player IDs that have submitted (for progress display, no content). */
  submittedPlayerIds: string[];
  amoebas: Amoeba[];
  currentCaptainId: string | null;
  log: AmoebaLogEntry[];
  winnerId: string | null;
  /** Server epoch ms when the answer-reveal window closes. */
  answerRevealEndsAt: number | null;
}
