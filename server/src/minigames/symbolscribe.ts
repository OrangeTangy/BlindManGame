import {
  SeededRandom,
  type SymbolScribeGuideState,
  type SymbolScribeBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

interface State {
  rng: SeededRandom;
  /** Pool of glyph ids in play this stage (12 unique ids). */
  pool: number[];
  /** Current target id. */
  target: number;
  /** Current grid order (12 ids, includes target). */
  candidates: number[];
  cleared: number;
  total: number;
  mistakes: number;
  maxMistakes: number;
  lastFeedback: SymbolScribeBlindState["lastFeedback"];
  done: boolean;
  success: boolean;
}

const GLYPH_COUNT = 30;

export class SymbolScribeEngine implements MinigameEngine {
  readonly kind = "symbolscribe" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, _difficulty: number) {
    const rng = new SeededRandom(seed);
    const all: number[] = [];
    for (let i = 0; i < GLYPH_COUNT; i++) all.push(i);
    const pool = rng.shuffle(all).slice(0, 12);
    const target = rng.pick(pool);
    this.s = {
      rng,
      pool,
      target,
      candidates: rng.shuffle([...pool]),
      cleared: 0,
      total: 4,
      mistakes: 0,
      maxMistakes: 2,
      lastFeedback: "none",
      done: false,
      success: false,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "pick") return;
    if (a.glyphId === s.target) {
      s.cleared++;
      s.lastFeedback = "correct";
      if (s.cleared >= s.total) {
        s.done = true;
        s.success = true;
        return;
      }
      // Next sub-round: re-shuffle the same pool, pick a new target.
      s.candidates = s.rng.shuffle([...s.pool]);
      s.target = s.rng.pick(s.pool);
    } else {
      s.mistakes++;
      s.lastFeedback = "wrong";
      if (s.mistakes >= s.maxMistakes) {
        s.done = true;
        s.success = false;
      }
    }
  }

  getGuideState(): SymbolScribeGuideState {
    const s = this.s!;
    return {
      kind: "symbolscribe",
      target: s.target,
      cleared: s.cleared,
      total: s.total,
    };
  }

  getBlindState(): SymbolScribeBlindState {
    const s = this.s!;
    return {
      kind: "symbolscribe",
      candidates: s.candidates,
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
