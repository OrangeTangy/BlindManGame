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

// ---------- TapVoid (black-screen tap with warmer/colder) ----------
export interface TapVoidGuideState {
  kind: "tapvoid";
  /** Target position normalised 0..1 inside the arena. */
  target: { x: number; y: number };
  /** Last tap from blind (normalised), or null. */
  lastTap: { x: number; y: number } | null;
  cleared: number;
  total: number;
  /** Hit threshold (Euclidean distance in 0..1 units). */
  threshold: number;
}
export interface TapVoidBlindState {
  kind: "tapvoid";
  cleared: number;
  total: number;
  /** "warmer" / "colder" relative to the previous tap; "hit" on success. */
  lastFeedback: "none" | "warmer" | "colder" | "hit";
}
export type TapVoidAction = { type: "tapAt"; x: number; y: number };

// ---------- SymbolScribe (abstract glyph match) ----------
export interface SymbolScribeGuideState {
  kind: "symbolscribe";
  /** Current target glyph id — guide must describe it without naming it. */
  target: number;
  cleared: number;
  total: number;
}
export interface SymbolScribeBlindState {
  kind: "symbolscribe";
  /** 12 candidate glyph ids; blind picks the right one. */
  candidates: number[];
  cleared: number;
  total: number;
  lastFeedback: "none" | "correct" | "wrong";
}
export type SymbolScribeAction = { type: "pick"; glyphId: number };

// ---------- LiarLiar (defusal with one fake rule) ----------
export type LiarLiarColor = "red" | "blue" | "yellow" | "green";
export interface LiarLiarGuideState {
  kind: "liarliar";
  wires: LiarLiarColor[];
  /** Five statements; exactly one is false. Guide must spot which. */
  rules: string[];
  /** Wire indices already cut, in cut order. */
  cuts: number[];
  feedback: "none" | "correct" | "wrong";
}
export interface LiarLiarBlindState {
  kind: "liarliar";
  wires: LiarLiarColor[];
  cuts: number[];
  feedback: "none" | "correct" | "wrong";
}
export type LiarLiarAction = { type: "cutLL"; index: number };

// ---------- MemoryTower (icon stack with collapse-on-wrong) ----------
export interface MemoryTowerGuideState {
  kind: "memorytower";
  /** Target stack as ordered palette indices, bottom-first. Always visible to guide. */
  target: number[];
  /** Built so far (resets to empty on a wrong placement). */
  built: number[];
  paletteSize: number;
}
export interface MemoryTowerBlindState {
  kind: "memorytower";
  built: number[];
  /** How many items still required. */
  remaining: number;
  paletteSize: number;
  /** "wrong" = stack just collapsed. */
  lastFeedback: "none" | "correct" | "wrong";
}
export type MemoryTowerAction = { type: "place"; index: number };

// ---------- WordSniper (timing + text) ----------
export interface WordSniperWord {
  id: number;
  text: string;
  /** Horizontal position 0..1, 0 = right edge (entry), 1 = left edge (exit). */
  x: number;
  lane: number;
  /** Only the guide sees this flag. */
  target: boolean;
}
export interface WordSniperGuideState {
  kind: "wordsniper";
  words: WordSniperWord[];
  /** Centre fire-zone in normalised coords [lo, hi]. */
  fireZone: [number, number];
  hits: number;
  misses: number;
  hitsRequired: number;
  missesAllowed: number;
}
export interface WordSniperBlindState {
  kind: "wordsniper";
  hits: number;
  misses: number;
  hitsRequired: number;
  missesAllowed: number;
  lastFeedback: "none" | "hit" | "miss";
}
export type WordSniperAction = { type: "fire" };

// ---------- Unions ----------
export type AnyMinigameAction =
  | MazeAction
  | SequenceAction
  | DefusalAction
  | RunnerAction
  | ParkourAction
  | MonstersAction
  | FlashGridAction
  | SignalAction
  | TapVoidAction
  | SymbolScribeAction
  | LiarLiarAction
  | MemoryTowerAction
  | WordSniperAction;

export type MinigameBlindState =
  | MazeBlindState
  | SequenceBlindState
  | DefusalBlindState
  | RunnerBlindState
  | ParkourBlindState
  | MonstersBlindState
  | FlashGridBlindState
  | SignalBlindState
  | TapVoidBlindState
  | SymbolScribeBlindState
  | LiarLiarBlindState
  | MemoryTowerBlindState
  | WordSniperBlindState;

export type MinigameGuideState =
  | MazePublicState
  | SequencePublicState
  | DefusalPublicState
  | RunnerGuideState
  | ParkourGuideState
  | MonstersGuideState
  | FlashGridGuideState
  | SignalGuideState
  | TapVoidGuideState
  | SymbolScribeGuideState
  | LiarLiarGuideState
  | MemoryTowerGuideState
  | WordSniperGuideState;
