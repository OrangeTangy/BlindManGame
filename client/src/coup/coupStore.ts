import { create } from "zustand";
import type {
  CoupRoomPublic,
  CoupRoomPrivate,
  CoupCard,
} from "@blindman/shared";

export type CoupScreen = "landing" | "room";

interface CoupStore {
  screen: CoupScreen;
  room: CoupRoomPublic | null;
  myPlayerId: string | null;
  myInfluences: CoupCard[];
  exchangeCards: CoupCard[] | undefined;
  myName: string;
  toast: string | null;

  setScreen: (s: CoupScreen) => void;
  setRoom: (r: CoupRoomPublic | null) => void;
  setPrivate: (d: CoupRoomPrivate) => void;
  setMyPlayerId: (id: string) => void;
  setName: (n: string) => void;
  setToast: (s: string | null) => void;
  reset: () => void;
}

export const useCoupStore = create<CoupStore>((set) => ({
  screen: "landing",
  room: null,
  myPlayerId: null,
  myInfluences: [],
  exchangeCards: undefined,
  myName: localStorage.getItem("coup:name") || localStorage.getItem("blindman:name") || "",
  toast: null,

  setScreen: (s) => set({ screen: s }),
  setRoom: (r) => set({ room: r }),
  setPrivate: (d) => set({ myInfluences: d.myInfluences, exchangeCards: d.exchangeCards }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setName: (n) => {
    localStorage.setItem("coup:name", n);
    set({ myName: n });
  },
  setToast: (s) => set({ toast: s }),
  reset: () =>
    set({
      screen: "landing",
      room: null,
      myPlayerId: null,
      myInfluences: [],
      exchangeCards: undefined,
    }),
}));
