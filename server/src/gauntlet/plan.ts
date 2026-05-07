import {
  SeededRandom,
  type MinigameKind,
  type GauntletStage,
} from "@blindman/shared";

// The pool of minigames that can appear in the gauntlet.
const POOL: MinigameKind[] = ["runner", "sequence", "parkour", "maze", "defusal", "monsters", "flashgrid", "signal"];

export const GAUNTLET_LENGTH = 10;

// Pre-tuned per-stage durations (base). Difficulty scales them down.
const BASE_DURATION: Record<MinigameKind, number> = {
  runner: 30_000,
  parkour: 45_000,
  sequence: 40_000,
  maze: 60_000,
  defusal: 75_000,
  monsters: 25_000,
  flashgrid: 35_000,
  signal: 30_000,
};

/**
 * Generate a seeded, identical-for-all-duos 10-stage plan.
 * Each duo races the same sequence — fastest total time wins.
 */
export function planGauntlet(masterSeed: number, length = GAUNTLET_LENGTH): GauntletStage[] {
  const rng = new SeededRandom(masterSeed);
  // Two shuffled halves so every kind appears at least once in the first 5.
  const a = rng.shuffle(POOL);
  const b = rng.shuffle(POOL);
  const order = [...a, ...b].slice(0, length);

  const stages: GauntletStage[] = [];
  for (let i = 0; i < length; i++) {
    const kind = order[i];
    const difficulty = length > 1 ? i / (length - 1) : 0;
    const base = BASE_DURATION[kind];
    const durationMs = Math.round(base * (1 - 0.3 * difficulty));
    stages.push({
      index: i,
      kind,
      seed: (masterSeed ^ (i * 0x9e3779b1)) >>> 0,
      durationMs,
      penaltyMs: 3000 + Math.round(difficulty * 3000), // 3s → 6s
      difficulty,
    });
  }
  return stages;
}
