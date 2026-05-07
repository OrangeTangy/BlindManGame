import {
  SeededRandom,
  type LiarLiarColor,
  type LiarLiarGuideState,
  type LiarLiarBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

const COLORS: LiarLiarColor[] = ["red", "blue", "yellow", "green"];
const ORDINALS = ["first", "second", "third", "last"];

interface State {
  /** Wires laid out in their slot order — which colour is in each slot. */
  wires: LiarLiarColor[];
  /** Indices into wires[], in the order they must be cut. */
  cutOrder: number[];
  rules: string[];
  cuts: number[];
  feedback: LiarLiarBlindState["feedback"];
  done: boolean;
  success: boolean;
}

// SeededRandom.int(min, max) is [min, max) — exclusive upper bound.
// All call sites here account for that.

function colorAtPosition(
  wires: LiarLiarColor[],
  cutOrder: number[],
  pos: number,
): LiarLiarColor {
  return wires[cutOrder[pos]];
}

function genTrueStatement(
  rng: SeededRandom,
  wires: LiarLiarColor[],
  cutOrder: number[],
): string {
  const N = wires.length;
  const choice = rng.int(0, 6); // 0..5 — six template categories
  if (choice === 0) {
    return `Cut ${colorAtPosition(wires, cutOrder, 0)} first.`;
  }
  if (choice === 1) {
    return `Cut ${colorAtPosition(wires, cutOrder, N - 1)} last.`;
  }
  if (choice === 2) {
    const pos = rng.int(1, 3); // 1 or 2 (second or third)
    return `Cut ${colorAtPosition(wires, cutOrder, pos)} ${ORDINALS[pos]}.`;
  }
  if (choice === 3) {
    const a = rng.int(0, N - 1); // 0..N-2
    const b = rng.int(a + 1, N); // a+1..N-1
    return `Cut ${colorAtPosition(wires, cutOrder, a)} before ${colorAtPosition(wires, cutOrder, b)}.`;
  }
  if (choice === 4) {
    const a = rng.int(0, N - 1);
    const b = rng.int(a + 1, N);
    return `Cut ${colorAtPosition(wires, cutOrder, b)} after ${colorAtPosition(wires, cutOrder, a)}.`;
  }
  // choice === 5: "Don't cut X {ordinal}." X must NOT be at that ordinal.
  const ordIdx = rng.int(0, N); // 0..N-1
  const truePos = colorAtPosition(wires, cutOrder, ordIdx);
  const others = COLORS.filter((c) => c !== truePos);
  const pickColor = others[rng.int(0, others.length)];
  const ordWord = ordIdx === N - 1 ? "last" : ORDINALS[ordIdx];
  return `Don't cut ${pickColor} ${ordWord}.`;
}

function genFalseStatement(
  rng: SeededRandom,
  wires: LiarLiarColor[],
  cutOrder: number[],
): string {
  const N = wires.length;
  const choice = rng.int(0, 5); // 0..4
  if (choice === 0) {
    const trueFirst = colorAtPosition(wires, cutOrder, 0);
    const wrong = COLORS.filter((c) => c !== trueFirst)[rng.int(0, 3)];
    return `Cut ${wrong} first.`;
  }
  if (choice === 1) {
    const trueLast = colorAtPosition(wires, cutOrder, N - 1);
    const wrong = COLORS.filter((c) => c !== trueLast)[rng.int(0, 3)];
    return `Cut ${wrong} last.`;
  }
  if (choice === 2) {
    const ord = rng.int(1, 3); // second or third
    const trueColor = colorAtPosition(wires, cutOrder, ord);
    const wrong = COLORS.filter((c) => c !== trueColor)[rng.int(0, 3)];
    return `Cut ${wrong} ${ORDINALS[ord]}.`;
  }
  if (choice === 3) {
    const a = rng.int(0, N - 1);
    const b = rng.int(a + 1, N);
    // True is "a before b" → flip to "b before a".
    return `Cut ${colorAtPosition(wires, cutOrder, b)} before ${colorAtPosition(wires, cutOrder, a)}.`;
  }
  // choice === 4: "Don't cut X {ord}" but X actually IS at ord.
  const ord = rng.int(0, N);
  const trueAtOrd = colorAtPosition(wires, cutOrder, ord);
  const ordWord = ord === N - 1 ? "last" : ORDINALS[ord];
  return `Don't cut ${trueAtOrd} ${ordWord}.`;
}

export class LiarLiarEngine implements MinigameEngine {
  readonly kind = "liarliar" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, _difficulty: number) {
    const rng = new SeededRandom(seed);
    const wires = rng.shuffle([...COLORS]);
    const cutOrder = rng.shuffle([0, 1, 2, 3]);

    const trueStatements = new Set<string>();
    let attempts = 0;
    while (trueStatements.size < 4 && attempts < 40) {
      trueStatements.add(genTrueStatement(rng, wires, cutOrder));
      attempts++;
    }
    const falseStatement = genFalseStatement(rng, wires, cutOrder);
    const rules = rng.shuffle([...trueStatements, falseStatement]);

    this.s = {
      wires,
      cutOrder,
      rules,
      cuts: [],
      feedback: "none",
      done: false,
      success: false,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "cutLL") return;
    if (a.index < 0 || a.index >= s.wires.length) return;
    if (s.cuts.includes(a.index)) return;
    const expected = s.cutOrder[s.cuts.length];
    if (a.index === expected) {
      s.cuts.push(a.index);
      s.feedback = "correct";
      if (s.cuts.length === s.wires.length) {
        s.done = true;
        s.success = true;
      }
    } else {
      s.feedback = "wrong";
      s.done = true;
      s.success = false;
    }
  }

  getGuideState(): LiarLiarGuideState {
    const s = this.s!;
    return {
      kind: "liarliar",
      wires: s.wires,
      rules: s.rules,
      cuts: s.cuts,
      feedback: s.feedback,
    };
  }

  getBlindState(): LiarLiarBlindState {
    const s = this.s!;
    return {
      kind: "liarliar",
      wires: s.wires,
      cuts: s.cuts,
      feedback: s.feedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
