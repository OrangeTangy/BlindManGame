import {
  SeededRandom,
  type RunnerGuideState,
  type RunnerBlindState,
  type RunnerObstacle,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

/**
 * Dinosaur-style runner. The track auto-scrolls. Blind hits JUMP to hop
 * over the next obstacle. Guide sees obstacles coming and calls out timing.
 */
interface State {
  scrollX: number;         // left edge of visible window (column index)
  playerX: number;         // fixed-ish column; we model movement via scrollX increases
  playerY: number;         // 0=ground, 1=rising, 2=apex, 1=falling, 0=ground
  jumpTicksLeft: number;
  obstacles: RunnerObstacle[];
  target: number;
  cleared: number;
  lastResult: RunnerBlindState["lastResult"];
  ticksPerAdvance: number;
  ticksSinceAdvance: number;
  done: boolean;
  success: boolean;
}

const PLAYER_COLUMN = 4; // blind player sits 4 cols from the left edge

export class RunnerEngine implements MinigameEngine {
  readonly kind = "runner" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const target = 7 + Math.floor(difficulty * 7); // 7..14
    // tighter spacing at higher difficulty
    const minGap = Math.max(3, 5 - Math.floor(difficulty * 2));
    const maxGap = Math.max(minGap + 1, 8 - Math.floor(difficulty * 3));
    const obstacles: RunnerObstacle[] = [];
    let x = PLAYER_COLUMN + 6;
    for (let i = 0; i < target; i++) {
      obstacles.push({ x, high: rng.next() < 0.35 });
      x += rng.int(minGap, maxGap);
    }
    // server tick ~100ms. advance every ticksPerAdvance ticks.
    const ticksPerAdvance = Math.max(2, 4 - Math.floor(difficulty * 2)); // 4..2 (400ms..200ms)
    this.s = {
      scrollX: 0,
      playerX: PLAYER_COLUMN,
      playerY: 0,
      jumpTicksLeft: 0,
      obstacles,
      target,
      cleared: 0,
      lastResult: "none",
      ticksPerAdvance,
      ticksSinceAdvance: 0,
      done: false,
      success: false,
    };
  }

  tick(_dtMs: number) {
    const s = this.s;
    if (!s || s.done) return;
    s.ticksSinceAdvance++;
    if (s.ticksSinceAdvance < s.ticksPerAdvance) return;
    s.ticksSinceAdvance = 0;

    // Step jump arc over 5 advance-ticks. Pattern after each decrement:
    //   4 → rising  (still y=1)
    //   3 → apex    (y=2)
    //   2 → apex    (y=2, hold)
    //   1 → falling (y=1)
    //   0 → landed  (y=0)
    // The hold at apex gives the blind player a wider grace window to clear
    // tight obstacle spacing at high difficulty.
    if (s.jumpTicksLeft > 0) {
      s.jumpTicksLeft--;
      if (s.jumpTicksLeft === 4) s.playerY = 1;
      else if (s.jumpTicksLeft === 3) s.playerY = 2;
      else if (s.jumpTicksLeft === 2) s.playerY = 2;
      else if (s.jumpTicksLeft === 1) s.playerY = 1;
      else s.playerY = 0;
    }

    // Scroll world left by advancing scrollX (player stays at same column).
    s.scrollX++;
    const playerAbsX = s.scrollX + PLAYER_COLUMN;

    // Collision: any obstacle at exactly the player's column?
    const hit = s.obstacles.find((o) => o.x === playerAbsX);
    if (hit) {
      if (s.playerY === 0) {
        s.lastResult = "hit";
        s.done = true;
        s.success = false;
        return;
      } else {
        s.cleared++;
        s.lastResult = "cleared";
        if (s.cleared >= s.target) {
          s.done = true;
          s.success = true;
        }
      }
    }
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "jump") return;
    if (s.playerY === 0 && s.jumpTicksLeft === 0) {
      s.jumpTicksLeft = 5; // rise-apex-apex-fall-land over 5 advance ticks
      s.playerY = 1;
      s.lastResult = "jump";
    }
  }

  getGuideState(): RunnerGuideState {
    const s = this.s!;
    return {
      kind: "runner",
      trackLength: 20, // visible columns
      scrollX: s.scrollX,
      playerX: s.scrollX + PLAYER_COLUMN,
      playerY: s.playerY,
      obstacles: s.obstacles.filter(
        (o) => o.x >= s.scrollX - 1 && o.x < s.scrollX + 20
      ),
      target: s.target,
      cleared: s.cleared,
      ticksPerAdvance: s.ticksPerAdvance,
    };
  }

  getBlindState(): RunnerBlindState {
    const s = this.s!;
    return {
      kind: "runner",
      playerY: s.playerY,
      cleared: s.cleared,
      target: s.target,
      lastResult: s.lastResult,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
