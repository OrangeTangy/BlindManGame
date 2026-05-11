export type CoupCard = "duke" | "assassin" | "captain" | "ambassador" | "contessa";

export const ALL_COUP_CARDS: CoupCard[] = ["duke", "assassin", "captain", "ambassador", "contessa"];

export interface CoupPlayer {
  id: string;
  name: string;
  coins: number;
  influences: CoupCard[];
  revealedInfluences: CoupCard[];
  isAlive: boolean;
  isHost: boolean;
  connected: boolean;
}

export type CoupPlayerPublic = Omit<CoupPlayer, "influences"> & {
  influenceCount: number;
};

export type CoupActionType =
  | "income"
  | "foreign_aid"
  | "coup"
  | "tax"
  | "assassinate"
  | "steal"
  | "exchange";

export type CoupTurnPhase =
  | "awaiting_action"
  | "awaiting_challenge"
  | "awaiting_block"
  | "awaiting_block_challenge"
  | "awaiting_lose_influence"
  | "awaiting_exchange";

export type CoupGamePhase = "lobby" | "playing" | "game_over";

export interface CoupPendingAction {
  type: CoupActionType;
  playerId: string;
  targetId?: string;
  claimedRole?: CoupCard;
  blockerId?: string;
  blockerClaimedRole?: CoupCard;
  passedPlayers: string[];
  exchangeCards?: CoupCard[];
  loseInfluencePlayerId?: string;
}

export interface CoupLogEntry {
  id: string;
  text: string;
  at: number;
}

export interface CoupRoomPublic {
  code: string;
  hostId: string;
  phase: CoupGamePhase;
  players: CoupPlayerPublic[];
  currentPlayerId: string | null;
  turnPhase: CoupTurnPhase | null;
  pendingAction: CoupPendingAction | null;
  log: CoupLogEntry[];
  winnerId: string | null;
}

export interface CoupRoomPrivate {
  myInfluences: CoupCard[];
  exchangeCards?: CoupCard[];
}

export const ACTION_CHARACTER_CLAIM: Partial<Record<CoupActionType, CoupCard>> = {
  tax: "duke",
  assassinate: "assassin",
  steal: "captain",
  exchange: "ambassador",
};

export const ACTION_BLOCKERS: Partial<Record<CoupActionType, CoupCard[]>> = {
  foreign_aid: ["duke"],
  assassinate: ["contessa"],
  steal: ["captain", "ambassador"],
};
