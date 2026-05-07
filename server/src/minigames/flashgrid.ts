import {
  SeededRandom,
  type FlashGridGuideState,
  type FlashGridBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

interface State {
  target: number[];
  input: number[];
  phase: "showing" | "inputting";
  showTicksLeft: number;      // server ticks remaining in show phase
  inputTicksLeft: number;     // ticks remaining in input phase (timeout)
  done: boolean;
  success: boolean;
  lastFeedback: FlashGridBlindState["lastFeedback"];
}

export class FlashGridEngine implements MinigameEngine {
  readonly kind = "flashgrid" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const n = 3 + Math.floor(difficulty * 2); // 3..5 cells
    // Pick n distinct cells from 0..8
    const all = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const target = all.slice(0, n);
    // Show for 2500ms at tick rate ~100ms = 25 ticks
    const showTicks = 25;
    // Input timeout: 20s = 200 ticks
    const inputTicks = 200;
    this.s = {
      target,
      input: [],
      phase: "showing",
      showTicksLeft: showTicks,
      inputTicksLeft: inputTicks,
      done: false,
      success: false,
      lastFeedback: "none",
    };
  }

  tick(_dtMs: number) {
    const s = this.s;
    if (!s || s.done) return;
    if (s.phase === "showing") {
      s.showTicksLeft--;
      if (s.showTicksLeft <= 0) s.phase = "inputting";
    } else {
      s.inputTicksLeft--;
      if (s.inputTicksLeft <= 0) {
        s.done = true;
        s.success = false;
      }
    }
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done || s.phase !== "inputting") return;
    if (a.type !== "tap") return;
    const { index } = a;
    if (s.input.includes(index)) return; // already tapped — ignore duplicate
    if (!s.target.includes(index)) {
      // Wrong cell
      s.lastFeedback = "wrong";
      s.done = true;
      s.success = false;
      return;
    }
    s.input.push(index);
    s.lastFeedback = "correct";
    if (s.input.length === s.target.length) {
      s.done = true;
      s.success = true;
    }
  }

  getGuideState(): FlashGridGuideState {
    const s = this.s!;
    return {
      kind: "flashgrid",
      width: 3,
      height: 3,
      target: s.target,
      input: s.input,
      phase: s.phase,
    };
  }

  getBlindState(): FlashGridBlindState {
    const s = this.s!;
    return {
      kind: "flashgrid",
      phase: s.phase,
      remaining: s.target.length - s.input.length,
      input: s.input,
      lastFeedback: s.lastFeedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
