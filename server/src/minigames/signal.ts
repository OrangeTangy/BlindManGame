import {
  SeededRandom,
  type SignalGuideState,
  type SignalBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

interface State {
  current: number;
  target: { lo: number; hi: number };
  ticksLeft: number;     // global timeout
  locked: boolean;
  done: boolean;
  success: boolean;
  lastFeedback: SignalBlindState["lastFeedback"];
}

export class SignalEngine implements MinigameEngine {
  readonly kind = "signal" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    // Band width shrinks with difficulty: 14 → 8
    const bandW = Math.max(8, Math.round(14 - difficulty * 6));
    // lo ranges from 10 to (90 - bandW) inclusive; int() is maxExclusive so +1
    const lo = rng.int(10, 91 - bandW);
    const hi = lo + bandW;
    // Start position is always outside the band, at least 20 units away
    let start: number;
    do { start = rng.int(0, 101); } while (Math.abs(start - (lo + bandW / 2)) < 20);
    const ticksLeft = 300; // 30 s at 100 ms/tick

    this.s = {
      current: start,
      target: { lo, hi },
      ticksLeft,
      locked: false,
      done: false,
      success: false,
      lastFeedback: "none",
    };
  }

  tick(_dtMs: number) {
    const s = this.s;
    if (!s || s.done) return;
    s.ticksLeft--;
    if (s.ticksLeft <= 0) {
      s.done = true;
      s.success = false;
    }
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;

    if (a.type === "tuneBig") {
      s.current = Math.max(0, Math.min(100, s.current + (a.dir === "right" ? 10 : -10)));
      s.lastFeedback = "tune";
      return;
    }
    if (a.type === "tuneSmall") {
      s.current = Math.max(0, Math.min(100, s.current + (a.dir === "right" ? 3 : -3)));
      s.lastFeedback = "tune";
      return;
    }
    if (a.type === "lock") {
      s.locked = true;
      if (s.current >= s.target.lo && s.current <= s.target.hi) {
        s.lastFeedback = "success";
        s.done = true;
        s.success = true;
      } else {
        s.lastFeedback = "fail";
        s.done = true;
        s.success = false;
      }
    }
  }

  getGuideState(): SignalGuideState {
    const s = this.s!;
    return {
      kind: "signal",
      current: s.current,
      target: s.target,
      locked: s.locked,
    };
  }

  getBlindState(): SignalBlindState {
    const s = this.s!;
    // Expose only 0–10 bars (quantised position) so blind has coarse sense but
    // can't precisely target the band without guide. 0 = far left, 10 = far right.
    return {
      kind: "signal",
      bars: Math.round(s.current / 10),
      locked: s.locked,
      lastFeedback: s.lastFeedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
