import { create } from "zustand";
import type { AmoebaRoomPublic } from "@blindman/shared";

export type AmoebaScreen = "landing" | "room";

interface AmoebaStore {
  screen: AmoebaScreen;
  room: AmoebaRoomPublic | null;
  myPlayerId: string | null;
  myName: string;
  toast: string | null;

  setScreen: (s: AmoebaScreen) => void;
  setRoom: (r: AmoebaRoomPublic | null) => void;
  setMyPlayerId: (id: string) => void;
  setName: (n: string) => void;
  setToast: (s: string | null) => void;
  reset: () => void;
}

export const useAmoebaStore = create<AmoebaStore>((set) => ({
  screen: "landing",
  room: null,
  myPlayerId: null,
  myName:
    localStorage.getItem("amoeba:name") ||
    localStorage.getItem("coup:name") ||
    localStorage.getItem("blindman:name") ||
    "",
  toast: null,

  setScreen: (s) => set({ screen: s }),
  setRoom: (r) => set({ room: r }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setName: (n) => {
    localStorage.setItem("amoeba:name", n);
    set({ myName: n });
  },
  setToast: (s) => set({ toast: s }),
  reset: () =>
    set({ screen: "landing", room: null, myPlayerId: null }),
}));
