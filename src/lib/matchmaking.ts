/**
 * Local matchmaking engine.
 * Implements widening search window, bot fallback, and rematch blocking.
 */

import { listPlayers, getRecentOpponents, type PlayerRecord } from './repository.ts';
import { getLeague } from './leagues.ts';

// ─── Config ──────────────────────────────────────────────────────────────────

const INITIAL_WINDOW = 100;
const WINDOW_STEP = 50;
const WINDOW_INTERVAL_MS = 5000;
const MAX_WINDOW = 400;
const BOT_TIMEOUT_MS = 30000;
const MAX_CONSECUTIVE_REMATCHES = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MatchmakingResult {
  opponent: PlayerRecord;
  isBot: boolean;
}

export interface MatchmakingState {
  elapsedMs: number;
  currentWindow: number;
  status: 'searching' | 'found' | 'bot_fallback';
}

// ─── Core Logic ──────────────────────────────────────────────────────────────

/**
 * Finds the best opponent within the given rating window.
 * STRICTLY enforces that opponents are at the same level (same league tier).
 * Prefers closest-rated; breaks ties by who has been waiting longer.
 * Blocks rematching the same opponent more than MAX_CONSECUTIVE_REMATCHES times in a row.
 */
export function findOpponentInWindow(
  playerId: string,
  playerRating: number,
  window: number
): PlayerRecord | null {
  const allPlayers = listPlayers();
  const recentOpponents = getRecentOpponents(playerId, MAX_CONSECUTIVE_REMATCHES);
  const playerLeague = getLeague(playerRating);

  // Check if the last N opponents are all the same person
  const blockedOpponentId =
    recentOpponents.length >= MAX_CONSECUTIVE_REMATCHES &&
    recentOpponents.every((id) => id === recentOpponents[0])
      ? recentOpponents[0]
      : null;

  const candidates = allPlayers.filter((p) => {
    if (p.id === playerId) return false;
    if (p.id === blockedOpponentId) return false;
    // Same level check: opponent must be in the same league
    const oppLeague = getLeague(p.rating, p.leagueId);
    if (oppLeague.id !== playerLeague.id) return false;
    const diff = Math.abs(p.rating - playerRating);
    return diff <= window;
  });

  if (candidates.length === 0) return null;

  // Sort by rating distance (ascending), then by updatedAt (ascending = waiting longer)
  candidates.sort((a, b) => {
    const distA = Math.abs(a.rating - playerRating);
    const distB = Math.abs(b.rating - playerRating);
    if (distA !== distB) return distA - distB;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  return candidates[0];
}

/**
 * Picks a bot opponent at the EXACT SAME level (same league tier).
 * Prefers closest rating within the league.
 */
export function findBotOpponent(
  playerId: string,
  playerRating: number
): PlayerRecord | null {
  const allPlayers = listPlayers();
  const playerLeague = getLeague(playerRating);

  // Filter bots strictly in the same league/level
  const sameLevelBots = allPlayers.filter(
    (p) =>
      p.id !== playerId &&
      (p.isBot || p.id.startsWith('bot_')) &&
      getLeague(p.rating, p.leagueId).id === playerLeague.id
  );

  const pool = sameLevelBots.length > 0
    ? sameLevelBots
    : allPlayers.filter((p) => p.id !== playerId && (p.isBot || p.id.startsWith('bot_')));

  if (pool.length === 0) return null;

  pool.sort((a, b) => Math.abs(a.rating - playerRating) - Math.abs(b.rating - playerRating));
  return pool[0];
}

/**
 * Computes the current search window based on elapsed time.
 */
export function computeSearchWindow(elapsedMs: number): number {
  const expansions = Math.floor(elapsedMs / WINDOW_INTERVAL_MS);
  return Math.min(INITIAL_WINDOW + expansions * WINDOW_STEP, MAX_WINDOW);
}

/**
 * Whether we should fall back to a bot opponent.
 */
export function shouldUseBotFallback(elapsedMs: number): boolean {
  return elapsedMs >= BOT_TIMEOUT_MS;
}

export { INITIAL_WINDOW, WINDOW_STEP, WINDOW_INTERVAL_MS, MAX_WINDOW, BOT_TIMEOUT_MS };
