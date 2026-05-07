import type {
  MinigameKind,
  AnyMinigameAction,
  MinigameBlindState,
  MinigameGuideState,
} from "@blindman/shared";
import { MazeEngine } from "./maze";
import { SequenceEngine } from "./sequence";
import { DefusalEngine } from "./defusal";
import { RunnerEngine } from "./runner";
import { ParkourEngine } from "./parkour";
import { MonstersEngine } from "./monsters";
import { FlashGridEngine } from "./flashgrid";
import { SignalEngine } from "./signal";

/**
 * One engine instance manages a single duo's state for a single stage.
 * A new engine is created per (duo × stage).
 */
export interface MinigameEngine {
  readonly kind: MinigameKind;
  init(duoId: string, seed: number, difficulty: number): void;
  /** Called ~every 100ms by RoomManager during a stage. */
  tick?(dtMs: number): void;
  handleAction(duoId: string, action: AnyMinigameAction): void;
  getGuideState(duoId: string): MinigameGuideState;
  getBlindState(duoId: string): MinigameBlindState;
  isDoneFor(duoId: string): { done: boolean; success: boolean };
  dispose?(): void;
}

export function createEngine(kind: MinigameKind): MinigameEngine {
  switch (kind) {
    case "maze":     return new MazeEngine();
    case "sequence": return new SequenceEngine();
    case "defusal":  return new DefusalEngine();
    case "runner":   return new RunnerEngine();
    case "parkour":  return new ParkourEngine();
    case "monsters": return new MonstersEngine();
    case "flashgrid": return new FlashGridEngine();
    case "signal":    return new SignalEngine();
  }
}
