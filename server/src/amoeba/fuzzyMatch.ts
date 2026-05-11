/**
 * Normalise a string for comparison: lowercase, strip punctuation,
 * collapse whitespace, trim. This is the single place to tune normalisation.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Standard dynamic-programming Levenshtein distance. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Return true when a player's guess is "close enough" to the real answer.
 *
 * Strategy (in order):
 *   1. Exact match after normalisation.
 *   2. Contains match: one string contains the other AND the shorter string
 *      is at least 55 % of the longer one (avoids single-word matches for
 *      long answers).
 *   3. Levenshtein similarity >= 0.75 (edit distance / max-length).
 *
 * Keep this function small and self-contained so it's easy to tune later.
 */
export function isCloseEnough(answer: string, guess: string): boolean {
  const a = normalise(answer);
  const b = normalise(guess);

  if (!a || !b) return false;
  if (a === b) return true;

  const longer = Math.max(a.length, b.length);
  const shorter = Math.min(a.length, b.length);

  if ((a.includes(b) || b.includes(a)) && shorter / longer >= 0.55) return true;

  const dist = levenshtein(a, b);
  const similarity = 1 - dist / longer;
  return similarity >= 0.75;
}
