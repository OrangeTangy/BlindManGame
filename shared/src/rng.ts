// Mulberry32 — small seeded PRNG. Deterministic across client and server.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRandom {
  private rand: () => number;
  constructor(public readonly seed: number) {
    this.rand = mulberry32(seed);
  }
  next(): number {
    return this.rand();
  }
  int(minInclusive: number, maxExclusive: number): number {
    return Math.floor(this.next() * (maxExclusive - minInclusive)) + minInclusive;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export function makeSeed(): number {
  return (Math.random() * 2 ** 31) | 0;
}
