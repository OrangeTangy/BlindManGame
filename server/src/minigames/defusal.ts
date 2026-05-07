import {
  SeededRandom,
  type WireColor,
  type DefusalPublicState,
  type DefusalBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

const WIRE_COLORS: WireColor[] = ["red", "blue", "yellow", "white", "black"];

interface State {
  wires: WireColor[];
  rules: string[];
  correctIndex: number;
  cutIndex: number | null;
  switches: { label: string; on: boolean; target: boolean }[];
  digitsTarget: number[];
  digitsEntered: number[];
  stage: "wires" | "switches" | "code" | "done";
  failed: boolean;
  feedback: string | null;
}

function chooseWireToCut(wires: WireColor[]): { index: number; rules: string[] } {
  const n = wires.length;
  const countOf = (c: WireColor) => wires.filter((w) => w === c).length;
  const lastIndexOf = (c: WireColor) => wires.lastIndexOf(c);
  const firstIndexOf = (c: WireColor) => wires.indexOf(c);

  const rulesText: string[] = [
    "If there are more red wires than blue, cut the last red wire.",
    "Otherwise, if the first wire is yellow, cut the second wire.",
    "Otherwise, if there is exactly one black wire, cut the wire after it.",
    "Otherwise, cut the last wire.",
  ];

  let index: number;
  if (countOf("red") > countOf("blue") && countOf("red") > 0) index = lastIndexOf("red");
  else if (wires[0] === "yellow" && n >= 2) index = 1;
  else if (countOf("black") === 1) {
    const b = firstIndexOf("black");
    index = Math.min(b + 1, n - 1);
  } else index = n - 1;
  return { index, rules: rulesText };
}

export class DefusalEngine implements MinigameEngine {
  readonly kind = "defusal" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const wireCount = 4 + Math.floor(difficulty * 2); // 4..6
    const wires: WireColor[] = [];
    for (let k = 0; k < wireCount; k++) wires.push(rng.pick(WIRE_COLORS));
    const { index: correctIndex, rules } = chooseWireToCut(wires);

    const switchLabels = ["ALPHA", "BETA", "GAMMA", "DELTA"];
    const switches = switchLabels.map((label) => ({
      label, on: false, target: rng.next() > 0.5,
    }));

    const digitsTarget = [rng.int(0, 10), rng.int(0, 10), rng.int(0, 10)];

    this.s = {
      wires, rules, correctIndex, cutIndex: null,
      switches,
      digitsTarget, digitsEntered: [],
      stage: "wires", failed: false, feedback: null,
    };
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.stage === "done") return;

    if (a.type === "cut" && s.stage === "wires") {
      s.cutIndex = a.index;
      if (a.index === s.correctIndex) {
        s.feedback = "Wire cut. Stage 1 clear.";
        s.stage = "switches";
      } else {
        s.feedback = "Wrong wire!";
        s.failed = true;
        s.stage = "done";
      }
      return;
    }
    if (a.type === "toggle" && s.stage === "switches") {
      s.switches[a.index].on = !s.switches[a.index].on;
      s.feedback = null;
      if (s.switches.every((sw) => sw.on === sw.target)) {
        s.feedback = "Switches locked. Stage 2 clear.";
        s.stage = "code";
      }
      return;
    }
    if (s.stage === "code") {
      if (a.type === "digit") {
        if (s.digitsEntered.length < 3) s.digitsEntered.push(a.value);
        return;
      }
      if (a.type === "clearCode") {
        s.digitsEntered = [];
        return;
      }
      if (a.type === "submitCode") {
        if (s.digitsEntered.length !== 3) {
          s.feedback = "Enter 3 digits.";
          return;
        }
        const ok = s.digitsEntered.every((d, i) => d === s.digitsTarget[i]);
        if (ok) {
          s.feedback = "Defused!";
          s.stage = "done";
        } else {
          s.feedback = "Code incorrect!";
          s.failed = true;
          s.stage = "done";
        }
        return;
      }
    }
  }

  getGuideState(): DefusalPublicState {
    const s = this.s!;
    return {
      kind: "defusal",
      wires: s.wires, rules: s.rules,
      correctIndex: s.correctIndex, cutIndex: s.cutIndex,
      switches: s.switches,
      digitsTarget: s.digitsTarget, digitsEntered: s.digitsEntered,
      stage: s.stage, failed: s.failed,
    };
  }

  getBlindState(): DefusalBlindState {
    const s = this.s!;
    return {
      kind: "defusal",
      wireCount: s.wires.length,
      switches: s.switches.map((sw) => ({ label: sw.label, on: sw.on })),
      digitsEntered: s.digitsEntered,
      stage: s.stage, failed: s.failed, feedback: s.feedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.stage === "done", success: s.stage === "done" && !s.failed };
  }
}
