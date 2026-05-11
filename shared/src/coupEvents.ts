import type { CoupRoomPublic, CoupRoomPrivate, CoupActionType, CoupCard } from "./coupTypes";

export interface CoupClientToServerEvents {
  coupCreateRoom: (
    payload: { name: string },
    cb: CoupAck<{ code: string; playerId: string }>
  ) => void;
  coupJoinRoom: (
    payload: { code: string; name: string },
    cb: CoupAck<{ playerId: string }>
  ) => void;
  coupRejoinRoom: (
    payload: { code: string; name: string },
    cb: CoupAck<{ playerId: string }>
  ) => void;
  coupStartGame: () => void;
  coupPlayAgain: () => void;
  coupLeaveRoom: () => void;
  coupAction: (payload: { action: CoupActionType; targetId?: string }) => void;
  coupChallenge: () => void;
  coupPassChallenge: () => void;
  coupBlock: (payload: { claimedRole: CoupCard }) => void;
  coupPassBlock: () => void;
  coupChallengeBlock: () => void;
  coupPassBlockChallenge: () => void;
  coupLoseInfluence: (payload: { card: CoupCard }) => void;
  coupExchangeReturn: (payload: { returnCards: CoupCard[] }) => void;
}

export interface CoupServerToClientEvents {
  coupRoom: (room: CoupRoomPublic) => void;
  coupPrivate: (data: CoupRoomPrivate) => void;
  coupYouAre: (payload: { playerId: string }) => void;
  coupError: (payload: { message: string }) => void;
}

export type CoupAck<T> = (
  res: { ok: true; data: T } | { ok: false; error: string }
) => void;
