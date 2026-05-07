import {
  SeededRandom,
  type ParkourGuideState,
  type ParkourBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

/**
 * 2D grid platformer. Player must reach the goal cell. Server applies
 * gravity periodically; player actions move / jump in grid units.
 */
interface State {
  width: number;
  height: number;
  solid: boolean[][];          // platforms
  hazards: boolean[][];        // spikes
  start: [number, number];
  goal: [number, number];
  pos: [number, number];
  lastFeedback: ParkourBlindState["lastFeedback"];
  ticksSinceGravity: number;
  ticksPerGravity: number;
  done: boolean;
  success: boolean;
}

function cellOpen(s: State, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return false;
  return !s.solid[y][x];
}
function isGrounded(s: State): boolean {
  const [x, y] = s.pos;
  if (y + 1 >= s.height) return true; // floor
  return s.solid[y + 1][x];
}

export class ParkourEngine implements MinigameEngine {
  readonly kind = "parkour" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const W = 9;
    const H = 14;
    const solid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const hazards: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    // Floor across the bottom.
    for (let x = 0; x < W; x++) solid[H - 1][x] = true;

    const platformLevels = 5 + Math.floor(difficulty * 2); // 5..7
    const topLevelsY: number[] = [];

    // First platform ALWAYS covers the spawn column so a straight JUMP-UP
    // from the starting cell lands on it (previously jumps fell back to the
    // floor because no platform was at x=0, which felt like "can't move").
    const firstLen = rng.int(3, 5);
    const firstY = H - 3;
    for (let k = 0; k < firstLen; k++) solid[firstY][k] = true;
    topLevelsY.push(firstY);
    let prevX = Math.floor(firstLen / 2);

    for (let i = 1; i < platformLevels; i++) {
      const y = H - 3 - i * 2;
      if (y < 1) break;
      topLevelsY.push(y);
      const len = rng.int(2, 4);
      const maxX = W - len;
      // Bias the next platform to be adjacent or within a jump's reach of
      // the previous one so the route is always climbable.
      const jitter = rng.int(-1, 3);
      const x = Math.max(0, Math.min(maxX, prevX + jitter));
      for (let k = 0; k < len; k++) solid[y][x + k] = true;
      prevX = x + Math.floor(len / 2);
    }

    // Spikes: never in the first 3 columns (spawn safety).
    const floorSpikes = 1 + Math.floor(difficulty * 2); // 1..3
    for (let i = 0; i < floorSpikes; i++) {
      const minX = 3;
      const maxX = W - 2;
      if (maxX < minX) break;
      const hx = rng.int(minX, maxX + 1);
      hazards[H - 2][hx] = true;
    }

    const start: [number, number] = [0, H - 2];
    const topY = topLevelsY[topLevelsY.length - 1] ?? H - 3;
    let goalX = prevX;
    for (let x = 0; x < W; x++) {
      if (solid[topY][x]) { goalX = x; break; }
    }
    const goal: [number, number] = [goalX, topY - 1];

    this.s = {
      width: W, height: H,
      solid, hazards,
      start, goal,
      pos: [...start],
      lastFeedback: "none",
      ticksSinceGravity: 0,
      ticksPerGravity: 5, // 500ms
      done: false, success: false,
    };
  }

  tick(_dtMs: number) {
    const s = this.s;
    if (!s || s.done) return;
    s.ticksSinceGravity++;
    if (s.ticksSinceGravity < s.ticksPerGravity) return;
    s.ticksSinceGravity = 0;
    if (isGrounded(s)) return;
    const [x, y] = s.pos;
    const ny = y + 1;
    if (ny >= s.height) {
      s.lastFeedback = "fall";
      s.done = true;
      s.success = false;
      return;
    }
    s.pos = [x, ny];
    s.lastFeedback = "fall";
    if (s.hazards[ny]?.[x]) {
      s.done = true;
      s.success = false;
      return;
    }
    this.checkGoal();
  }

  private checkGoal() {
    const s = this.s!;
    if (s.pos[0] === s.goal[0] && s.pos[1] === s.goal[1]) {
      s.lastFeedback = "goal";
      s.done = true;
      s.success = true;
    }
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    const [x, y] = s.pos;

    if (a.type === "left" || a.type === "right") {
      const nx = x + (a.type === "left" ? -1 : 1);
      if (!cellOpen(s, nx, y)) { s.lastFeedback = "bump"; return; }
      s.pos = [nx, y];
      if (s.hazards[y]?.[nx]) { s.done = true; s.success = false; return; }
      s.lastFeedback = "move";
      this.checkGoal();
      return;
    }

    // Jump variants. Must be grounded to initiate a jump.
    if (!isGrounded(s)) { s.lastFeedback = "bump"; return; }

    let dx = 0;
    if (a.type === "jumpLeft") dx = -1;
    else if (a.type === "jumpRight") dx = 1;
    else if (a.type !== "jumpUp") return;

    const tx = x + dx;
    // Land in the highest open cell reachable in the jump arc.
    //   jumpUp        : try y-2, then y-1
    //   jumpLeft/Right: try y-2, then y-1, then y (slide-over at same height)
    // Jump is a grid teleport (not a swept body), which avoids the old
    // "ceiling-above-spawn blocks takeoff" bug: if the platform directly
    // above spawn is solid, we just land on top of it.
    const ladder: number[] = dx === 0 ? [y - 2, y - 1] : [y - 2, y - 1, y];
    let targetY: number | null = null;
    for (const cy of ladder) {
      if (cy < 0) continue;
      if (cellOpen(s, tx, cy)) { targetY = cy; break; }
    }
    if (targetY === null) { s.lastFeedback = "bump"; return; }

    s.pos = [tx, targetY];
    s.lastFeedback = "jump";
    if (s.hazards[targetY]?.[tx]) { s.done = true; s.success = false; return; }
    this.checkGoal();
  }

  getGuideState(): ParkourGuideState {
    const s = this.s!;
    return {
      kind: "parkour",
      width: s.width,
      height: s.height,
      solid: s.solid,
      hazards: s.hazards,
      goal: s.goal,
      playerPos: s.pos,
      onGround: isGrounded(s),
    };
  }

  getBlindState(): ParkourBlindState {
    const s = this.s!;
    return {
      kind: "parkour",
      onGround: isGrounded(s),
      lastFeedback: s.lastFeedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
