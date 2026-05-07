// ---------- Maze ----------
export type MazeCell = 0 | 1;
export interface MazePublicState {
  kind: "maze";
  width: number;
  height: number;
  grid: MazeCell[][];
  start: [number, number];
  goal: [number, number];
  hazards: [number, number][];
  playerPos: [number, number];
}
export interface MazeBlindState {
  kind: "maze";
  width: number;
  height: number;
  lastFeedback: "none" | "move" | "bump" | "hazard" | "goal";
  stepsTaken: number;
}
export type MazeAction = { type: "move"; dir: "up" | "down" | "left" | "right" };

// ---------- Sequence ----------
export type ColorKey = "red" | "green" | "blue" | "yellow" | "purple" | "orange";
export interface SequencePublicState {
  kind: "sequence";
  palette: ColorKey[];
  target: ColorKey[];
  progress: number;
  mistakes: number;
}
export interface SequenceBlindState {
  kind: "sequence";
  palette: ColorKey[];
  progress: number;
  mistakes: number;
  lastPress: ColorKey | null;
  lastPressOk: boolean | null;
}
export type SequenceAction = { type: "press"; color: ColorKey };

// ---------- Defusal ----------
export type WireColor = "red" | "blue" | "yellow" | "white" | "black";
export interface DefusalPublicState {
  kind: "defusal";
  wires: WireColor[];
  rules: string[];
  correctIndex: number;
  cutIndex: number | null;
  switches: { label: string; on: boolean; target: boolean }[];
  digitsTarget: number[];
  digitsEntered: number[];
  stage: "wires" | "switches" | "code" | "done";
  failed: boolean;
}
export interface DefusalBlindState {
  kind: "defusal";
  wireCount: number;
  switches: { label: string; on: boolean }[];
  digitsEntered: number[];
  stage: "wires" | "switches" | "code" | "done";
  failed: boolean;
  feedback: string | null;
}
export type DefusalAction =
  | { type: "cut"; index: number }
  | { type: "toggle"; index: number }
  | { type: "digit"; value: number }
  | { type: "submitCode" }
  | { type: "clearCode" };

// ---------- Runner (dinosaur jump) ----------
export interface RunnerObstacle {
  x: number;          // absolute track position
  high: boolean;      // visually tall (still cleared by jump)
}
export interface RunnerGuideState {
  kind: "runner";
  trackLength: number;     // visual width for UI
  scrollX: number;         // current left edge of visible track
  playerX: number;         // absolute player column
  playerY: number;         // 0=ground, 1=mid-jump, 2=apex
  obstacles: RunnerObstacle[];
  target: number;
  cleared: number;
  ticksPerAdvance: number;
}
export interface RunnerBlindState {
  kind: "runner";
  playerY: number;
  cleared: number;
  target: number;
  lastResult: "none" | "jump" | "hit" | "cleared";
}
export type RunnerAction = { type: "jump" };

// ---------- Parkour (2D platformer) ----------
export interface ParkourGuideState {
  kind: "parkour";
  width: number;
  height: number;
  solid: boolean[][];
  hazards: boolean[][];
  goal: [number, number];
  playerPos: [number, number];
  onGround: boolean;
}
export interface ParkourBlindState {
  kind: "parkour";
  onGround: boolean;
  lastFeedback: "none" | "move" | "bump" | "jump" | "fall" | "goal";
}
export type ParkourAction =
  | { type: "left" }
  | { type: "right" }
  | { type: "jumpUp" }
  | { type: "jumpLeft" }
  | { type: "jumpRight" };

// ---------- Monsters (left/right reaction) ----------
export type MonstersSide = "left" | "right";
export interface MonstersGuideState {
  kind: "monsters";
  total: number;
  killed: number;
  /** The monster currently closing on the player, if any. */
  current: {
    side: MonstersSide;
    /** Absolute ms timestamp (server clock) when this monster became active. */
    spawnAt: number;
    /** Absolute ms timestamp when it will hit the player → fail. */
    reachAt: number;
  } | null;
  /** Next few monsters' sides, so the guide can plan their voice cues. */
  upcoming: MonstersSide[];
  /** Server clock at state-send time — client uses this to animate the approach. */
  serverNow: number;
}
export interface MonstersBlindState {
  kind: "monsters";
  total: number;
  killed: number;
  lastFeedback: "none" | "hit" | "miss" | "fail";
  /** True between monsters — blind can brace but shouldn't attack yet. */
  betweenMonsters: boolean;
}
export type MonstersAction = { type: "strike"; side: MonstersSide };

// ---------- FlashGrid (memory flash) ----------
export interface FlashGridGuideState {
  kind: "flashgrid";
  width: 3;
  height: 3;
  /** Indices (0-8) of cells to tap - shown always so guide can describe them. */
  target: number[];
  /** Indices already correctly tapped by blind. */
  input: number[];
  /** "showing" = cells are lit; "inputting" = guide must recall and describe. */
  phase: "showing" | "inputting";
}
export interface FlashGridBlindState {
  kind: "flashgrid";
  phase: "showing" | "inputting";
  /** How many cells blind still needs to tap. */
  remaining: number;
  /** Indices already correctly tapped (so blind knows which buttons to skip). */
  input: number[];
  lastFeedback: "none" | "correct" | "wrong";
}
export type FlashGridAction = { type: "tap"; index: number };

// ---------- Signal (frequency tuner) ----------
export interface SignalGuideState {
  kind: "signal";
  current: number;          // 0–100
  target: { lo: number; hi: number };
  locked: boolean;
}
export interface SignalBlindState {
  kind: "signal";
  /** 0–10 quantised bars so blind has coarse positional sense but still needs guide. */
  bars: number;
  locked: boolean;
  lastFeedback: "none" | "tune" | "success" | "fail";
}
export type SignalAction =
  | { type: "tuneBig";   dir: "left" | "right" }
  | { type: "tuneSmall"; dir: "left" | "right" }
  | { type: "lock" };

// ---------- Unions ----------
export type AnyMinigameAction =
  | MazeAction
  | SequenceAction
  | DefusalAction
  | RunnerAction
  | ParkourAction
  | MonstersAction
  | FlashGridAction
  | SignalAction;

export type MinigameBlindState =
  | MazeBlindState
  | SequenceBlindState
  | DefusalBlindState
  | RunnerBlindState
  | ParkourBlindState
  | MonstersBlindState
  | FlashGridBlindState
  | SignalBlindState;

export type MinigameGuideState =
  | MazePublicState
  | SequencePublicState
  | DefusalPublicState
  | RunnerGuideState
  | ParkourGuideState
  | MonstersGuideState
  | FlashGridGuideState
  | SignalGuideState;
