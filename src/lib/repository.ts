/**
 * localStorage-backed persistence layer with a repository interface.
 * Designed to be easily swapped for a real database later.
 */

import type { PlayerRating } from './elo.ts';
import { createDefaultRating } from './elo.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerRecord {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: number;
  peakRating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
  leagueId: number;
  updatedAt: string;
  isBot?: boolean;
}

export interface MatchRecord {
  id: string;
  playerAId: string;
  playerBId: string;
  ratingsBefore: { a: number; b: number };
  ratingsAfter: { a: number; b: number };
  scores: { a: number; b: number };
  winnerId: string | null; // null = draw
  createdAt: string;
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const PLAYERS_KEY = 'boli_elo_players';
const MATCHES_KEY = 'boli_elo_matches';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Repository ──────────────────────────────────────────────────────────────

export function getPlayer(id: string): PlayerRecord | null {
  const players = readJSON<PlayerRecord[]>(PLAYERS_KEY, []);
  return players.find((p) => p.id === id) ?? null;
}

export function savePlayer(player: PlayerRecord): void {
  const players = readJSON<PlayerRecord[]>(PLAYERS_KEY, []);
  const idx = players.findIndex((p) => p.id === player.id);
  player.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    players[idx] = player;
  } else {
    players.push(player);
  }
  writeJSON(PLAYERS_KEY, players);
}

export function listPlayers(): PlayerRecord[] {
  return readJSON<PlayerRecord[]>(PLAYERS_KEY, []);
}

export function listPlayersByLeague(leagueId: number): PlayerRecord[] {
  return listPlayers().filter((p) => p.leagueId === leagueId);
}

export function getTopPlayers(limit = 50): PlayerRecord[] {
  return listPlayers()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function recordMatch(match: MatchRecord): void {
  const matches = readJSON<MatchRecord[]>(MATCHES_KEY, []);
  matches.push(match);
  writeJSON(MATCHES_KEY, matches);
}

export function listMatches(): MatchRecord[] {
  return readJSON<MatchRecord[]>(MATCHES_KEY, []);
}

/**
 * Gets the recent opponents for a player, newest first.
 */
export function getRecentOpponents(playerId: string, limit = 5): string[] {
  const matches = listMatches()
    .filter((m) => m.playerAId === playerId || m.playerBId === playerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return matches.map((m) =>
    m.playerAId === playerId ? m.playerBId : m.playerAId
  );
}

/**
 * Ensures the current user exists in the player repository.
 * Creates with default ELO if not present.
 */
export function ensurePlayer(id: string, name: string, avatarUrl?: string): PlayerRecord {
  let player = getPlayer(id);
  if (!player) {
    const defaults = createDefaultRating();
    const cleanName = (name && name !== 'Ananda M.') ? name : 'Scholar';
    player = {
      id,
      name: cleanName,
      avatarUrl,
      rating: defaults.rating,
      peakRating: defaults.peakRating,
      matchesPlayed: defaults.matchesPlayed,
      wins: defaults.wins,
      losses: defaults.losses,
      winStreak: defaults.winStreak,
      leagueId: 1,
      updatedAt: new Date().toISOString(),
    };
    savePlayer(player);
  } else {
    // If the stored player has the old placeholder name 'Ananda M.' or if a newer valid name is passed
    const cleanName = (name && name !== 'Ananda M.') ? name : '';
    let changed = false;
    if (player.name === 'Ananda M.' || (cleanName && cleanName !== 'Scholar' && player.name !== cleanName)) {
      player.name = cleanName || 'Scholar';
      changed = true;
    }
    if (avatarUrl && player.avatarUrl !== avatarUrl) {
      player.avatarUrl = avatarUrl;
      changed = true;
    }
    if (changed) {
      savePlayer(player);
    }
  }
  return player;
}

/**
 * Converts a PlayerRecord to a PlayerRating (for elo.ts functions).
 */
export function toPlayerRating(record: PlayerRecord): PlayerRating {
  return {
    rating: record.rating,
    matchesPlayed: record.matchesPlayed,
    wins: record.wins,
    losses: record.losses,
    peakRating: record.peakRating,
    winStreak: record.winStreak,
  };
}

/**
 * Applies a PlayerRating back onto a PlayerRecord.
 */
export function applyRatingUpdate(
  record: PlayerRecord,
  updated: PlayerRating,
  newLeagueId: number
): PlayerRecord {
  return {
    ...record,
    rating: updated.rating,
    peakRating: updated.peakRating,
    matchesPlayed: updated.matchesPlayed,
    wins: updated.wins,
    losses: updated.losses,
    winStreak: updated.winStreak,
    leagueId: newLeagueId,
    updatedAt: new Date().toISOString(),
  };
}
