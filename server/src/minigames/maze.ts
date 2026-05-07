import {
  SeededRandom,
  type MazePublicState,
  type MazeBlindState,
  type MazeCell,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

/**
 * Grid maze. 1 = wall, 0 = floor.
 * The generator is an iterative randomised DFS that produces a guaranteed-
 * connected "perfect" maze over odd-sized grids. After carving we BFS
 * start -> goal to prove reachability and we record the set of cells on one
 * valid path; hazards are placed from cells NOT on that path, which
 * guarantees at least one hazard-free route from start to goal.
 */
interface MazeDuoState {
  width: number;
  height: number;
  grid: MazeCell[][];
  start: [number, number];
  goal: [number, number];
  hazards: [number, number][];
  pos: [number, number];
  lastFeedback: MazeBlindState["lastFeedback"];
  steps: number;
  done: boolean;
  success: boolean;
}

function newGrid(w: number, h: number, fill: MazeCell): MazeCell[][] {
  return Array.from({ length: h }, () => Array<MazeCell>(w).fill(fill));
}

/** Iterative randomised-DFS carver. Produces a connected perfect maze. */
function carveMaze(rng: SeededRandom, w: number, h: number): MazeCell[][] {
  const grid = newGrid(w, h, 1);
  // Cells at odd (x,y) are the "rooms"; walls between them are at even coords.
  const stack: [number, number][] = [];
  grid[1][1] = 0;
  stack.push([1, 1]);
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = rng.shuffle([
      [0, -2],
      [0, 2],
      [-2, 0],
      [2, 0],
    ] as [number, number][]);
    let advanced = false;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && grid[ny][nx] === 1) {
        grid[y + dy / 2][x + dx / 2] = 0;
        grid[ny][nx] = 0;
        stack.push([nx, ny]);
        advanced = true;
        break;
      }
    }
    if (!advanced) stack.pop();
  }
  return grid;
}

/** BFS from start to goal across floor cells. Returns the path, or null. */
function shortestPath(
  grid: MazeCell[][],
  start: [number, number],
  goal: [number, number]
): [number, number][] | null {
  const h = grid.length;
  const w = grid[0].length;
  const seen = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const prev = Array.from({ length: h }, () =>
    Array<[number, number] | null>(w).fill(null)
  );
  const q: [number, number][] = [start];
  seen[start[1]][start[0]] = true;
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === goal[0] && y === goal[1]) {
      const path: [number, number][] = [];
      let cur: [number, number] | null = [x, y];
      while (cur) {
        path.push(cur);
        cur = prev[cur[1]][cur[0]];
      }
      return path.reverse();
    }
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (grid[ny][nx] === 1) continue;
      if (seen[ny][nx]) continue;
      seen[ny][nx] = true;
      prev[ny][nx] = [x, y];
      q.push([nx, ny]);
    }
  }
  return null;
}

export class MazeEngine implements MinigameEngine {
  readonly kind = "maze" as const;
  private s: MazeDuoState | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const size = Math.min(11, 9 + Math.floor(difficulty * 4)); // 9..11
    const W = size % 2 === 0 ? size + 1 : size;
    const H = W;
    const hazardCount = 2 + Math.floor(difficulty * 3); // 2..5

    // Try up to N carves with seed derivations. A perfect maze is always
    // solvable without hazards, but we still BFS-validate as defence-in-depth.
    let grid: MazeCell[][] | null = null;
    let path: [number, number][] | null = null;
    const start: [number, number] = [1, 1];
    const goal: [number, number] = [W - 2, H - 2];
    for (let attempt = 0; attempt < 8; attempt++) {
      const rng = new SeededRandom((seed ^ (attempt * 0x51d7f4b3)) >>> 0);
      const g = carveMaze(rng, W, H);
      // Guarantee start and goal are floor (they should be, but defend).
      g[start[1]][start[0]] = 0;
      g[goal[1]][goal[0]] = 0;
      const p = shortestPath(g, start, goal);
      if (p) {
        grid = g;
        path = p;
        break;
      }
    }
    if (!grid || !path) {
      // Fallback: an empty floor-only grid with a single wall-less path.
      grid = newGrid(W, H, 0);
      // Re-wall the border so the level has shape.
      for (let x = 0; x < W; x++) {
        grid[0][x] = 1;
        grid[H - 1][x] = 1;
      }
      for (let y = 0; y < H; y++) {
        grid[y][0] = 1;
        grid[y][W - 1] = 1;
      }
      grid[start[1]][start[0]] = 0;
      grid[goal[1]][goal[0]] = 0;
      path = shortestPath(grid, start, goal)!;
    }

    // Hazards: place only on floors that are NOT on the found path.
    // This guarantees at least one hazard-free route from start to goal.
    const pathSet = new Set(path.map(([x, y]) => `${x},${y}`));
    const candidates: [number, number][] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y][x] !== 0) continue;
        if (pathSet.has(`${x},${y}`)) continue;
        if (x === start[0] && y === start[1]) continue;
        if (x === goal[0] && y === goal[1]) continue;
        candidates.push([x, y]);
      }
    }
    // Deterministic shuffle based on the same seed so the same seed gives the
    // same hazard set.
    const hazRng = new SeededRandom((seed ^ 0x9e3779b1) >>> 0);
    const hazards = hazRng.shuffle(candidates).slice(0, Math.min(hazardCount, candidates.length));

    this.s = {
      width: W,
      height: H,
      grid,
      start,
      goal,
      hazards,
      pos: [...start],
      lastFeedback: "none",
      steps: 0,
      done: false,
      success: false,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "move") return;
    const [x, y] = s.pos;
    let nx = x;
    let ny = y;
    if (a.dir === "up") ny--;
    else if (a.dir === "down") ny++;
    else if (a.dir === "left") nx--;
    else if (a.dir === "right") nx++;
    if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height || s.grid[ny][nx] === 1) {
      s.lastFeedback = "bump";
      return;
    }
    s.pos = [nx, ny];
    s.steps++;
    if (s.hazards.some(([hx, hy]) => hx === nx && hy === ny)) {
      s.lastFeedback = "hazard";
      s.done = true;
      s.success = false;
      return;
    }
    if (nx === s.goal[0] && ny === s.goal[1]) {
      s.lastFeedback = "goal";
      s.done = true;
      s.success = true;
      return;
    }
    s.lastFeedback = "move";
  }

  getGuideState(): MazePublicState {
    const s = this.s!;
    return {
      kind: "maze",
      width: s.width,
      height: s.height,
      grid: s.grid,
      start: s.start,
      goal: s.goal,
      hazards: s.hazards,
      playerPos: s.pos,
    };
  }

  getBlindState(): MazeBlindState {
    const s = this.s!;
    return {
      kind: "maze",
      width: s.width,
      height: s.height,
      lastFeedback: s.lastFeedback,
      stepsTaken: s.steps,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
