import {
  SeededRandom,
  type MinigameKind,
  type GauntletStage,
} from "@blindman/shared";

// The pool of minigames that can appear in the gauntlet.
const POOL: MinigameKind[] = [
  "runner", "sequence", "parkour", "maze", "defusal", "monsters",
  "flashgrid", "signal",
  "tapvoid", "symbolscribe", "liarliar", "memorytower", "wordsniper",
];

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
  tapvoid: 40_000,
  symbolscribe: 45_000,
  liarliar: 60_000,
  memorytower: 50_000,
  wordsniper: 35_000,
};

/**
 * Honour-system communication restrictions. Shown on the guide's screen as a
 * banner; not enforced by the server. The pool is intentionally varied so a
 * 10-stage gauntlet rarely repeats one.
 */
const RESTRICTIONS: string[] = [
  "No directional words (no left/right/up/down)",
  "No colour names",
  "No numbers",
  "Three words per sentence, max",
  "Only past tense",
  "Only ask questions",
  "Don't say your partner's name",
  "Whisper only",
  "No proper nouns",
  "Use food metaphors only",
  "No body parts",
  "Speak one word at a time",
  "Don't use the obvious word for what you see",
  "Animal noises only",
  "Talk like a sports announcer",
  "Use 'thingy' instead of 'button'",
  "No words with the letter E",
  "Sing everything you say",
];

function pickRestrictions(rng: SeededRandom, stageIndex: number): string[] {
  // Stages 0–1 stay clean so the round teaches the mechanic; from stage 2
  // onward there's a ramping chance of one or two restrictions.
  if (stageIndex < 2) return [];
  const r1 = rng.next();
  if (r1 > 0.55) return [];
  const first = rng.pick(RESTRICTIONS);
  // 20% chance of a second restriction, never duplicate.
  if (rng.next() > 0.2) return [first];
  let second = rng.pick(RESTRICTIONS);
  // Resample once if duplicate; if still duplicate, return single.
  if (second === first) second = rng.pick(RESTRICTIONS);
  return second === first ? [first] : [first, second];
}

/**
 * Generate a seeded, identical-for-all-duos 10-stage plan.
 * Each duo races the same sequence — fastest total time wins.
 */
export function planGauntlet(masterSeed: number, length = GAUNTLET_LENGTH): GauntletStage[] {
  const rng = new SeededRandom(masterSeed);
  // Two shuffled halves so every kind appears at least once in the first half.
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
      restrictions: pickRestrictions(rng, i),
    });
  }
  return stages;
}
