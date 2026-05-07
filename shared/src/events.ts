import type {
  RoomPublic,
  Role,
  GauntletStage,
  GauntletNotification,
} from "./types";
import type {
  AnyMinigameAction,
  MinigameBlindState,
  MinigameGuideState,
} from "./minigameTypes";

export interface ClientToServerEvents {
  createRoom: (payload: { name: string }, cb: Ack<{ code: string; playerId: string }>) => void;
  joinRoom: (payload: { code: string; name: string }, cb: Ack<{ playerId: string }>) => void;
  rejoinRoom: (payload: { code: string; name: string }, cb: Ack<{ playerId: string }>) => void;
  setReady: (payload: { ready: boolean }) => void;
  switchDuo: (payload: { duoId: string }) => void;
  startGame: () => void;
  playAgain: () => void;
  leaveRoom: () => void;
  action: (payload: { action: AnyMinigameAction }) => void;
}

export interface ServerToClientEvents {
  room: (room: RoomPublic) => void;
  youAre: (payload: { playerId: string; role: Role | null; duoId: string | null }) => void;
  stageStart: (payload: { duoId: string; stage: GauntletStage; startedAt: number }) => void;
  stageEnd: (payload: {
    duoId: string;
    stageIndex: number;
    success: boolean;
    timeMs: number;
    penaltyMs: number;
  }) => void;
  minigameState: (payload: { state: MinigameBlindState | MinigameGuideState }) => void;
  notification: (payload: GauntletNotification) => void;
  runEnd: (payload: { duoId: string; totalMs: number; rank: number }) => void;
  matchEnd: (payload: {
    standings: { duoId: string; label: string; totalMs: number; rank: number; finished: boolean }[];
  }) => void;
  errorMessage: (payload: { message: string }) => void;
}

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;
