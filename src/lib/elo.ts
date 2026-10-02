/**
 * Pure ELO rating calculation module.
 * No UI code, no side effects — designed for unit testing.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerRating {
  rating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  peakRating: number;
  winStreak: number;
}

export interface MatchResult {
  /** 1 = win, 0.5 = draw, 0 = loss (from player A's perspective) */
  result: 1 | 0.5 | 0;
  /** Score gap between the two players (0–5 typical for a quiz) */
  scoreGap?: number;
  /** If true, K is halved (bot match) */
  isBot?: boolean;
}

export interface RatingUpdate {
  playerA: PlayerRating;
  playerB: PlayerRating;
  deltaA: number;
  deltaB: number;
}

// ─── K-Factor ────────────────────────────────────────────────────────────────

/**
 * Returns the base K-factor for a player.
 * - 40 during the first 20 matches (placement phase)
 * - 32 for ratings up to 1900
 * - 24 for ratings above 1900
 */
export function getKFactor(player: PlayerRating): number {
  if (player.matchesPlayed < 20) return 40;
  if (player.rating <= 1900) return 32;
  return 24;
}

// ─── Margin-of-Victory Multiplier ────────────────────────────────────────────

/**
 * Returns a multiplier between 1.0 and 1.25 based on the score gap.
 * For a typical 5-round quiz, a gap of 5 gives the max bonus of 1.25.
 */
export function getMovMultiplier(scoreGap: number): number {
  const clamped = Math.max(0, Math.min(scoreGap, 5));
  return 1.0 + (clamped / 5) * 0.25;
}

// ─── Expected Score ──────────────────────────────────────────────────────────

/**
 * Computes the expected score using the standard ELO formula:
 *   E = 1 / (1 + 10^((opponentRating - myRating) / 400))
 */
export function expectedScore(myRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
}

// ─── Core Update ─────────────────────────────────────────────────────────────

/**
 * Computes the new rating for a single player after one match.
 * Returns the integer change (delta) and the new rating (floored at 0).
 */
export function computeRatingDelta(
  player: PlayerRating,
  opponentRating: number,
  result: number, // 1, 0.5, or 0
  scoreGap = 0,
  isBot = false
): number {
  const expected = expectedScore(player.rating, opponentRating);
  let K = getKFactor(player);

  // Margin-of-victory bonus
  if (scoreGap > 0) {
    K *= getMovMultiplier(scoreGap);
    // Cap so effective K never exceeds base * 1.25
    K = Math.min(K, getKFactor(player) * 1.25);
  }

  // Bot matches at half K
  if (isBot) {
    K *= 0.5;
  }

  return Math.round(K * (result - expected));
}

// ─── Atomic Dual-Player Update ───────────────────────────────────────────────

/**
 * Computes both players' rating updates atomically from their pre-match ratings.
 * Rating can never drop below 0.
 */
export function computeMatchUpdate(
  playerA: PlayerRating,
  playerB: PlayerRating,
  match: MatchResult
): RatingUpdate {
  const resultA = match.result;
  const resultB = match.result === 1 ? 0 : match.result === 0 ? 1 : 0.5;
  const gap = match.scoreGap ?? 0;
  const isBot = match.isBot ?? false;

  const deltaA = computeRatingDelta(playerA, playerB.rating, resultA, gap, isBot);
  const deltaB = computeRatingDelta(playerB, playerA.rating, resultB, gap, isBot);

  const newRatingA = Math.max(0, playerA.rating + deltaA);
  const newRatingB = Math.max(0, playerB.rating + deltaB);

  const newA: PlayerRating = {
    rating: newRatingA,
    matchesPlayed: playerA.matchesPlayed + 1,
    wins: playerA.wins + (resultA === 1 ? 1 : 0),
    losses: playerA.losses + (resultA === 0 ? 1 : 0),
    peakRating: Math.max(playerA.peakRating, newRatingA),
    winStreak: resultA === 1 ? playerA.winStreak + 1 : 0,
  };

  const newB: PlayerRating = {
    rating: newRatingB,
    matchesPlayed: playerB.matchesPlayed + 1,
    wins: playerB.wins + (resultB === 1 ? 1 : 0),
    losses: playerB.losses + (resultB === 0 ? 1 : 0),
    peakRating: Math.max(playerB.peakRating, newRatingB),
    winStreak: resultB === 1 ? playerB.winStreak + 1 : 0,
  };

  return {
    playerA: newA,
    playerB: newB,
    deltaA: newRatingA - playerA.rating,
    deltaB: newRatingB - playerB.rating,
  };
}

/**
 * Creates a default fresh player rating object.
 */
export function createDefaultRating(): PlayerRating {
  return {
    rating: 800,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    peakRating: 800,
    winStreak: 0,
  };
}
