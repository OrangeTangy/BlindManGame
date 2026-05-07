import { create } from "zustand";
import type {
  RoomPublic,
  Role,
  MinigameBlindState,
  MinigameGuideState,
  GauntletStage,
  GauntletNotification,
} from "@blindman/shared";

export type Screen = "landing" | "room";

interface StageFlash {
  duoId: string;
  stage: GauntletStage;
  startedAt: number;
  shownAt: number;
}

interface StageEndToast {
  duoId: string;
  stageIndex: number;
  success: boolean;
  timeMs: number;
  penaltyMs: number;
  createdAt: number;
}

interface Store {
  screen: Screen;
  connected: boolean;
  connectionError: string | null;
  room: RoomPublic | null;
  myPlayerId: string | null;
  myRole: Role | null;
  myDuoId: string | null;
  myName: string;
  minigameState: MinigameBlindState | MinigameGuideState | null;
  currentStage: GauntletStage | null;
  stageStartedAt: number | null;
  stageFlash: StageFlash | null;
  stageEndToast: StageEndToast | null;
  toast: string | null;
  // server/client clock offset estimate (serverNow - clientNow) in ms
  clockSkewMs: number;

  setScreen: (s: Screen) => void;
  setConnected: (v: boolean) => void;
  setConnectionError: (e: string | null) => void;
  setRoom: (r: RoomPublic | null) => void;
  setYouAre: (p: { playerId: string; role: Role | null; duoId: string | null }) => void;
  setName: (n: string) => void;
  setMinigameState: (s: MinigameBlindState | MinigameGuideState | null) => void;
  setStage: (stage: GauntletStage | null, startedAt: number | null) => void;
  setStageFlash: (f: StageFlash | null) => void;
  setStageEndToast: (t: StageEndToast | null) => void;
  setToast: (s: string | null) => void;
  setClockSkew: (ms: number) => void;
  pushNotification: (n: GauntletNotification) => void;
  reset: () => void;
}

export const useStore = create<Store>((set, get) => ({
  screen: "landing",
  connected: false,
  connectionError: null,
  room: null,
  myPlayerId: null,
  myRole: null,
  myDuoId: null,
  myName: localStorage.getItem("blindman:name") || "",
  minigameState: null,
  currentStage: null,
  stageStartedAt: null,
  stageFlash: null,
  stageEndToast: null,
  toast: null,
  clockSkewMs: 0,
  setScreen: (s) => set({ screen: s }),
  setConnected: (v) => set({ connected: v }),
  setConnectionError: (e) => set({ connectionError: e }),
  setRoom: (r) => set({ room: r }),
  setYouAre: (p) =>
    set({ myPlayerId: p.playerId, myRole: p.role, myDuoId: p.duoId }),
  setName: (n) => {
    localStorage.setItem("blindman:name", n);
    set({ myName: n });
  },
  setMinigameState: (s) => set({ minigameState: s }),
  setStage: (stage, startedAt) =>
    set({ currentStage: stage, stageStartedAt: startedAt, minigameState: null }),
  setStageFlash: (f) => set({ stageFlash: f }),
  setStageEndToast: (t) => set({ stageEndToast: t }),
  setToast: (s) => set({ toast: s }),
  setClockSkew: (ms) => set({ clockSkewMs: ms }),
  pushNotification: (_n) => {
    // Notifications live on room.notifications already; this hook exists
    // so the UI can optionally react to a fresh one (e.g. sound cue).
    // We piggy-back on room broadcasts for the list.
    void _n;
  },
  reset: () =>
    set({
      screen: "landing",
      room: null,
      myPlayerId: null,
      myRole: null,
      myDuoId: null,
      minigameState: null,
      currentStage: null,
      stageStartedAt: null,
      stageFlash: null,
      stageEndToast: null,
    }),
}));
