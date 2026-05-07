import {
  SeededRandom,
  type TapVoidGuideState,
  type TapVoidBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

interface State {
  rng: SeededRandom;
  target: { x: number; y: number };
  lastTap: { x: number; y: number } | null;
  /** Distance of the last tap from the target. Used to compute warmer/colder. */
  lastDistance: number | null;
  threshold: number;
  cleared: number;
  total: number;
  lastFeedback: TapVoidBlindState["lastFeedback"];
  done: boolean;
  success: boolean;
}

function pickTarget(rng: SeededRandom): { x: number; y: number } {
  // Keep target away from edges so the tap zone is reachable on mobile.
  return { x: 0.1 + rng.next() * 0.8, y: 0.1 + rng.next() * 0.8 };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export class TapVoidEngine implements MinigameEngine {
  readonly kind = "tapvoid" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    // Threshold shrinks with difficulty: 0.12 → 0.07.
    const threshold = 0.12 - difficulty * 0.05;
    this.s = {
      rng,
      target: pickTarget(rng),
      lastTap: null,
      lastDistance: null,
      threshold,
      cleared: 0,
      total: 5,
      lastFeedback: "none",
      done: false,
      success: false,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "tapAt") return;
    const tap = {
      x: Math.max(0, Math.min(1, a.x)),
      y: Math.max(0, Math.min(1, a.y)),
    };
    const d = dist(tap, s.target);
    s.lastTap = tap;
    if (d <= s.threshold) {
      s.cleared++;
      s.lastFeedback = "hit";
      if (s.cleared >= s.total) {
        s.done = true;
        s.success = true;
        return;
      }
      // Warp the target; reset lastDistance so the first post-warp tap is
      // neither warmer nor colder.
      s.target = pickTarget(s.rng);
      s.lastDistance = null;
      return;
    }
    if (s.lastDistance === null) {
      // First tap of this target — no comparison possible.
      s.lastFeedback = "colder";
    } else if (d < s.lastDistance) {
      s.lastFeedback = "warmer";
    } else {
      s.lastFeedback = "colder";
    }
    s.lastDistance = d;
  }

  getGuideState(): TapVoidGuideState {
    const s = this.s!;
    return {
      kind: "tapvoid",
      target: s.target,
      lastTap: s.lastTap,
      cleared: s.cleared,
      total: s.total,
      threshold: s.threshold,
    };
  }

  getBlindState(): TapVoidBlindState {
    const s = this.s!;
    return {
      kind: "tapvoid",
      cleared: s.cleared,
      total: s.total,
      lastFeedback: s.lastFeedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
