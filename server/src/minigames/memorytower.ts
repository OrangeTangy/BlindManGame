import {
  SeededRandom,
  type MemoryTowerGuideState,
  type MemoryTowerBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

interface State {
  target: number[];
  built: number[];
  paletteSize: number;
  collapses: number;
  maxCollapses: number;
  lastFeedback: MemoryTowerBlindState["lastFeedback"];
  done: boolean;
  success: boolean;
}

export class MemoryTowerEngine implements MinigameEngine {
  readonly kind = "memorytower" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const paletteSize = 6;
    const stackLen = 5 + Math.floor(difficulty * 2); // 5..7
    const target: number[] = [];
    for (let i = 0; i < stackLen; i++) {
      // SeededRandom.int(min, max) is [min, max) — pass paletteSize to reach all 6 indices.
      target.push(rng.int(0, paletteSize));
    }
    this.s = {
      target,
      built: [],
      paletteSize,
      collapses: 0,
      maxCollapses: 2,
      lastFeedback: "none",
      done: false,
      success: false,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "place") return;
    if (a.index < 0 || a.index >= s.paletteSize) return;
    const nextExpected = s.target[s.built.length];
    if (a.index === nextExpected) {
      s.built.push(a.index);
      s.lastFeedback = "correct";
      if (s.built.length === s.target.length) {
        s.done = true;
        s.success = true;
      }
    } else {
      s.collapses++;
      s.built = [];
      s.lastFeedback = "wrong";
      if (s.collapses > s.maxCollapses) {
        s.done = true;
        s.success = false;
      }
    }
  }

  getGuideState(): MemoryTowerGuideState {
    const s = this.s!;
    return {
      kind: "memorytower",
      target: s.target,
      built: s.built,
      paletteSize: s.paletteSize,
    };
  }

  getBlindState(): MemoryTowerBlindState {
    const s = this.s!;
    return {
      kind: "memorytower",
      built: s.built,
      remaining: s.target.length - s.built.length,
      paletteSize: s.paletteSize,
      lastFeedback: s.lastFeedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
