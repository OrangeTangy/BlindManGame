import {
  SeededRandom,
  type WordSniperWord,
  type WordSniperGuideState,
  type WordSniperBlindState,
  type AnyMinigameAction,
} from "@blindman/shared";
import type { MinigameEngine } from "./index";

const WORD_POOL = [
  "apple", "tiger", "cloud", "river", "stone", "smile", "panda", "pizza",
  "lemon", "grape", "honey", "mango", "robot", "ocean", "flame", "spoon",
  "chair", "horse", "frog", "moon", "leaf", "wave", "spark", "bear",
  "bread", "stork", "raven", "snail", "duck", "vine",
];

const LANES = 3;
const FIRE_ZONE: [number, number] = [0.4, 0.6];

interface ServerWord extends WordSniperWord {
  /** Speed in 0..1 units per server tick. */
  speed: number;
  /** Has the miss been counted (when it left the screen)? */
  countedMiss: boolean;
}

interface State {
  rng: SeededRandom;
  words: ServerWord[];
  /** Counter for unique stable ids. */
  nextId: number;
  /** Ticks until next spawn. */
  spawnCooldown: number;
  /** Base spawn cooldown in ticks. */
  baseCooldown: number;
  /** Probability per spawn that a word is a target. */
  targetProb: number;
  minSpeed: number;
  maxSpeed: number;
  hits: number;
  misses: number;
  hitsRequired: number;
  missesAllowed: number;
  lastFeedback: WordSniperBlindState["lastFeedback"];
  done: boolean;
  success: boolean;
}

export class WordSniperEngine implements MinigameEngine {
  readonly kind = "wordsniper" as const;
  private s: State | null = null;

  init(_duoId: string, seed: number, difficulty: number) {
    const rng = new SeededRandom(seed);
    const baseCooldown = Math.max(7, Math.round(14 - difficulty * 7));
    const targetProb = 0.22;
    const minSpeed = 0.012 + difficulty * 0.004;
    const maxSpeed = 0.022 + difficulty * 0.008;
    this.s = {
      rng,
      words: [],
      nextId: 1,
      spawnCooldown: 0,
      baseCooldown,
      targetProb,
      minSpeed,
      maxSpeed,
      hits: 0,
      misses: 0,
      hitsRequired: 8,
      missesAllowed: 3,
      lastFeedback: "none",
      done: false,
      success: false,
    };
  }

  private spawn() {
    const s = this.s!;
    const isTarget = s.rng.next() < s.targetProb;
    const speed = s.minSpeed + s.rng.next() * (s.maxSpeed - s.minSpeed);
    s.words.push({
      id: s.nextId++,
      text: s.rng.pick(WORD_POOL),
      x: 0,
      lane: s.rng.int(0, LANES), // [0, LANES) — covers all 3 lanes
      target: isTarget,
      speed,
      countedMiss: false,
    });
  }

  tick(_dtMs: number) {
    const s = this.s;
    if (!s || s.done) return;

    // Advance words; missed targets that leave the screen count as misses.
    for (const w of s.words) {
      w.x += w.speed;
      if (w.x >= 1 && w.target && !w.countedMiss) {
        w.countedMiss = true;
        s.misses++;
      }
    }
    s.words = s.words.filter((w) => w.x < 1.05);

    s.spawnCooldown--;
    if (s.spawnCooldown <= 0) {
      this.spawn();
      s.spawnCooldown = s.baseCooldown + s.rng.int(0, 5); // 0..4 jitter
    }

    if (s.hits >= s.hitsRequired) {
      s.done = true;
      s.success = true;
    } else if (s.misses > s.missesAllowed) {
      s.done = true;
      s.success = false;
    }
  }

  handleAction(_duoId: string, a: AnyMinigameAction) {
    const s = this.s;
    if (!s || s.done) return;
    if (a.type !== "fire") return;
    const inZone = s.words.find((w) => w.x >= FIRE_ZONE[0] && w.x <= FIRE_ZONE[1]);
    if (!inZone) {
      s.misses++;
      s.lastFeedback = "miss";
    } else if (inZone.target) {
      s.words = s.words.filter((w) => w.id !== inZone.id);
      s.hits++;
      s.lastFeedback = "hit";
    } else {
      s.words = s.words.filter((w) => w.id !== inZone.id);
      s.misses++;
      s.lastFeedback = "miss";
    }
  }

  getGuideState(): WordSniperGuideState {
    const s = this.s!;
    return {
      kind: "wordsniper",
      words: s.words.map(({ id, text, x, lane, target }) => ({ id, text, x, lane, target })),
      fireZone: FIRE_ZONE,
      hits: s.hits,
      misses: s.misses,
      hitsRequired: s.hitsRequired,
      missesAllowed: s.missesAllowed,
    };
  }

  getBlindState(): WordSniperBlindState {
    const s = this.s!;
    return {
      kind: "wordsniper",
      hits: s.hits,
      misses: s.misses,
      hitsRequired: s.hitsRequired,
      missesAllowed: s.missesAllowed,
      lastFeedback: s.lastFeedback,
    };
  }

  isDoneFor() {
    const s = this.s!;
    return { done: s.done, success: s.success };
  }
}
