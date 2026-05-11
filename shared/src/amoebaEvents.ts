import type { AmoebaRoomPublic, AmoebaSettings } from "./amoebaTypes";

export interface AmoebaClientToServerEvents {
  amoebaCreateRoom: (
    payload: { name: string },
    cb: AmoebaAck<{ code: string; playerId: string }>
  ) => void;
  amoebaJoinRoom: (
    payload: { code: string; name: string },
    cb: AmoebaAck<{ playerId: string }>
  ) => void;
  amoebaRejoinRoom: (
    payload: { code: string; name: string },
    cb: AmoebaAck<{ playerId: string }>
  ) => void;
  amoebaStartGame: () => void;
  amoebaSubmitPrompt: (payload: { prompt: string }) => void;
  amoebaSubmitAnswer: (payload: { answer: string }) => void;
  amoebaFinishAnswerReveal: () => void;
  amoebaMakeGuess: (payload: { targetPlayerId: string; guessedAnswer: string }) => void;
  amoebaUpdateSettings: (payload: { settings: Partial<AmoebaSettings> }) => void;
  amoebaPlayAgain: () => void;
  amoebaLeaveRoom: () => void;
}

export interface AmoebaServerToClientEvents {
  amoebaRoom: (room: AmoebaRoomPublic) => void;
  amoebaYouAre: (payload: { playerId: string }) => void;
  amoebaError: (payload: { message: string }) => void;
}

export type AmoebaAck<T> = (
  res: { ok: true; data: T } | { ok: false; error: string }
) => void;
