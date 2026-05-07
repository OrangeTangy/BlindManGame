import {
  SeededRandom,
  type ColorKey,
  type SequencePublicState,
  type SequenceBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

const ALL_COLORS: ColorKey[] = ["red", "green", "blue", "yellow", "purple", "orange"];

interface State {
  palette: ColorKey[];
  target: ColorKey[];
  progress: number;
  mistakes: number;
  lastPress: ColorKey | null;
  lastPressOk: boolean | null;
  done: boolean;
  success: boolean;
}

export class SequenceEngine implements MinigameEngine {
  readonly kind = "sequence" as const;
  private s: State | null = null;
  private readonly MAX_MISTAKES = 3;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const paletteSize = 4 + Math.floor(difficulty * 2); // 4..6
    const palette = rng.shuffle(ALL_COLORS).slice(0, paletteSize);
    const targetLen = 5 + Math.floor(difficulty * 5); // 5..10
    const target: ColorKey[] = [];
    for (let k = 0; k < targetLen; k++) target.push(rng.pick(palette));
    this.s = {
      palette, target,
      progress: 0, mistakes: 0,
      lastPress: null, lastPressOk: null,
      done: false, success: false,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "press") return;
    const expected = s.target[s.progress];
    s.lastPress = a.color;
    if (a.color === expected) {
      s.progress++;
      s.lastPressOk = true;
      if (s.progress >= s.target.length) {
        s.done = true;
        s.success = true;
      }
    } else {
      s.mistakes++;
      s.lastPressOk = false;
      if (s.mistakes >= this.MAX_MISTAKES) {
        s.done = true;
        s.success = false;
      }
    }
  }

  getGuideState(): SequencePublicState {
    const s = this.s!;
    return {
      kind: "sequence",
      palette: s.palette, target: s.target,
      progress: s.progress, mistakes: s.mistakes,
    };
  }

  getBlindState(): SequenceBlindState {
    const s = this.s!;
    return {
      kind: "sequence",
      palette: s.palette,
      progress: s.progress, mistakes: s.mistakes,
      lastPress: s.lastPress, lastPressOk: s.lastPressOk,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
