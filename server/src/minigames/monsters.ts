import {
  SeededRandom,
  type MonstersGuideState,
  type MonstersBlindState,
  type MonstersSide,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

/**
 * Reaction minigame. Monsters approach from LEFT or RIGHT one at a time.
 * The blind player has two buttons (STRIKE LEFT / STRIKE RIGHT). The guide
 * can see the arena and must call out which side to strike, and when.
 * - Correct side + in time     → kill, next monster spawns after a short gap
 * - Wrong side                 → instant fail (panic-spam penalty)
 * - Timeout (reachAt elapsed)  → instant fail
 * Kill every monster in the wave to clear the stage.
 */
interface State {
  sides: MonstersSide[];     // full wave, fixed at init
  approachMs: number;         // how long a monster takes to reach the player
  gapMs: number;              // between-monster pause
  killed: number;
  activeSpawnAt: number | null; // null while in a gap
  activeReachAt: number | null;
  nextSpawnAt: number | null;   // set during gap — when the next monster appears
  lastFeedback: MonstersBlindState["lastFeedback"];
  done: boolean;
  success: boolean;
}

export class MonstersEngine implements MinigameEngine {
  readonly kind = "monsters" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const count = 6 + Math.floor(difficulty * 4);           // 6..10
    const approachMs = Math.round(1600 - 700 * difficulty); // 1600ms → 900ms
    const gapMs = Math.max(400, Math.round(500 - 200 * difficulty)); // 500ms → 400ms (floor)
    const sides: MonstersSide[] = [];
    // Avoid 4-in-a-row on one side so it doesn't feel rigged.
    let run = 0;
    let last: MonstersSide = rng.next() < 0.5 ? "left" : "right";
    for (let i = 0; i < count; i++) {
      let side: MonstersSide = rng.next() < 0.5 ? "left" : "right";
      if (side === last && run >= 2) side = side === "left" ? "right" : "left";
      sides.push(side);
      if (side === last) run++;
      else { run = 1; last = side; }
    }
    const now = Date.now();
    this.s = {
      sides,
      approachMs,
      gapMs,
      killed: 0,
      activeSpawnAt: now,
      activeReachAt: now + approachMs,
      nextSpawnAt: null,
      lastFeedback: "none",
      done: false,
      success: false,
    };
  }

  tick(_dtMs: number) {
    const s = this.s;
    if (!s || s.done) return;
    const now = Date.now();
    // If a monster is active, check timeout.
    if (s.activeSpawnAt !== null && s.activeReachAt !== null) {
      if (now >= s.activeReachAt) {
        s.lastFeedback = "fail";
        s.done = true;
        s.success = false;
      }
      return;
    }
    // Otherwise we're in a gap, waiting to spawn the next.
    if (s.nextSpawnAt !== null && now >= s.nextSpawnAt) {
      s.activeSpawnAt = now;
      s.activeReachAt = now + s.approachMs;
      s.nextSpawnAt = null;
    }
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "strike") return;
    // If there's no active monster, treat as a miss (no kill, no fail).
    if (s.activeSpawnAt === null || s.activeReachAt === null) {
      s.lastFeedback = "miss";
      return;
    }
    const current = s.sides[s.killed];
    if (a.side === current) {
      // Kill.
      s.killed++;
      s.lastFeedback = "hit";
      s.activeSpawnAt = null;
      s.activeReachAt = null;
      if (s.killed >= s.sides.length) {
        s.done = true;
        s.success = true;
      } else {
        s.nextSpawnAt = Date.now() + s.gapMs;
      }
    } else {
      // Wrong side → fail.
      s.lastFeedback = "fail";
      s.done = true;
      s.success = false;
    }
  }

  getGuideState(): MonstersGuideState {
    const s = this.s!;
    const now = Date.now();
    const currentSide = s.sides[s.killed] ?? null;
    const upcoming = s.sides.slice(s.killed + 1, s.killed + 4);
    return {
      kind: "monsters",
      total: s.sides.length,
      killed: s.killed,
      current:
        s.activeSpawnAt !== null && s.activeReachAt !== null && currentSide !== null
          ? { side: currentSide, spawnAt: s.activeSpawnAt, reachAt: s.activeReachAt }
          : null,
      upcoming,
      serverNow: now,
    };
  }

  getBlindState(): MonstersBlindState {
    const s = this.s!;
    return {
      kind: "monsters",
      total: s.sides.length,
      killed: s.killed,
      lastFeedback: s.lastFeedback,
      betweenMonsters: s.activeSpawnAt === null,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
