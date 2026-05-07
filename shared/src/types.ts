export type Role = "blind" | "guide";

export type GamePhase = "lobby" | "gauntlet" | "match_summary";

export type MinigameKind =
  | "maze"
  | "sequence"
  | "defusal"
  | "runner"
  | "parkour"
  | "monsters"
  | "flashgrid"
  | "signal"
  | "tapvoid"
  | "symbolscribe"
  | "liarliar"
  | "memorytower"
  | "wordsniper";

// Legacy alias — some older code referred to this.
export type MinigameId = MinigameKind;

export interface Player {
  id: string;
  name: string;
  duoId: string;
  role: Role | null;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
}

export interface StageResult {
  stageIndex: number;
  success: boolean;
  timeMs: number;
}

export interface Duo {
  id: string;
  label: string;
  playerIds: string[];
  // gauntlet run state
  stageIndex: number;            // -1 before start, 0..N-1 during, N when complete
  runStartedAt: number | null;   // epoch ms
  runEndedAt: number | null;     // epoch ms
  stageStartedAt: number | null;
  penaltyMs: number;
  totalTimeMs: number | null;    // set when run ends
  rank: number | null;           // finishing order, 1-based
  stageResults: StageResult[];
}

export interface GauntletStage {
  index: number;
  kind: MinigameKind;
  seed: number;
  durationMs: number;
  penaltyMs: number;
  difficulty: number;            // 0..1
  /**
   * Pre-stage intro window in ms. During this window the client shows a
   * full-screen explanation overlay and the server does not tick the engine
   * or accept actions. The duo's `stageStartedAt` is set to the moment the
   * intro ends, so `durationMs` is fully playable time.
   */
  introMs: number;
  /**
   * Honour-system communication restrictions shown to the guide for this
   * stage. Empty array means no restrictions. The server doesn't enforce
   * these — they're displayed prominently and the spirit of the round
   * depends on the players policing each other.
   */
  restrictions: string[];
}

export interface GauntletNotification {
  id: string;
  at: number;
  kind: "start" | "stage_complete" | "stage_failed" | "run_complete";
  duoId: string | null;
  duoLabel: string | null;
  text: string;
}

export interface RoomPublic {
  code: string;
  hostId: string;
  phase: GamePhase;
  players: Player[];
  duos: Duo[];
  plan: GauntletStage[] | null;
  notifications: GauntletNotification[];
  serverNow: number;
  totalStages: number;
}
