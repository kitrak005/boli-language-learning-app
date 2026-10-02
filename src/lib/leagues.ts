/**
 * League configuration and lookup utilities.
 * Stores thresholds in a single, easily tweakable array.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeagueConfig {
  id: number;
  roman: string;
  name: string;
  minRating: number;
  maxRating: number;
  /** Primary accent color (hex) */
  accent: string;
  /** Glow / shadow color (hex with alpha) */
  glow: string;
  /** Path to the badge image */
  badgeImage: string;
}

// ─── Config Array ────────────────────────────────────────────────────────────

export const LEAGUES: LeagueConfig[] = [
  {
    id: 1,
    roman: 'I',
    name: 'Bronze Griffin',
    minRating: 0,
    maxRating: 999,
    accent: '#CD7F32',
    glow: 'rgba(205, 127, 50, 0.4)',
    badgeImage: '/badges/league-1.png',
  },
  {
    id: 2,
    roman: 'II',
    name: 'Silver Phoenix',
    minRating: 1000,
    maxRating: 1299,
    accent: '#7B9ECF',
    glow: 'rgba(123, 158, 207, 0.4)',
    badgeImage: '/badges/league-2.png',
  },
  {
    id: 3,
    roman: 'III',
    name: 'Gold Lion',
    minRating: 1300,
    maxRating: 1599,
    accent: '#C5A059',
    glow: 'rgba(197, 160, 89, 0.4)',
    badgeImage: '/badges/league-3.png',
  },
  {
    id: 4,
    roman: 'IV',
    name: 'Crystal Aegis',
    minRating: 1600,
    maxRating: 1899,
    accent: '#00CED1',
    glow: 'rgba(0, 206, 209, 0.4)',
    badgeImage: '/badges/league-4.png',
  },
  {
    id: 5,
    roman: 'V',
    name: 'Crimson Dragon',
    minRating: 1900,
    maxRating: Infinity,
    accent: '#DC2626',
    glow: 'rgba(220, 38, 38, 0.4)',
    badgeImage: '/badges/league-5.png',
  },
];

// ─── Demotion Shield ─────────────────────────────────────────────────────────

/** Players won't be demoted until they fall this many points below the league minimum. */
export const DEMOTION_SHIELD_BUFFER = 25;

// ─── Lookup ──────────────────────────────────────────────────────────────────

/**
 * Returns the league a player belongs to, with demotion shield logic.
 * If currentLeagueId is provided, the player won't be demoted until they fall
 * `DEMOTION_SHIELD_BUFFER` points below their current league's min.
 */
export function getLeague(rating: number, currentLeagueId?: number): LeagueConfig {
  // If they currently have a league, apply demotion shield
  if (currentLeagueId != null) {
    const currentLeague = LEAGUES.find((l) => l.id === currentLeagueId);
    if (currentLeague) {
      // Still in current league if rating >= (min - shield)
      if (rating >= currentLeague.minRating - DEMOTION_SHIELD_BUFFER) {
        return currentLeague;
      }
    }
  }

  // Normal lookup (highest league that the rating qualifies for)
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (rating >= LEAGUES[i].minRating) {
      return LEAGUES[i];
    }
  }
  return LEAGUES[0];
}

/**
 * Returns the next league above the given one, or null if at the top.
 */
export function getNextLeague(league: LeagueConfig): LeagueConfig | null {
  const idx = LEAGUES.findIndex((l) => l.id === league.id);
  if (idx < 0 || idx >= LEAGUES.length - 1) return null;
  return LEAGUES[idx + 1];
}

/**
 * Computes progress toward the next league.
 * Returns { current, total, label } for a progress bar.
 */
export function getLeagueProgress(
  rating: number,
  league: LeagueConfig
): { current: number; total: number; label: string } | null {
  const next = getNextLeague(league);
  if (!next) return null; // Already at top league

  const rangeStart = league.minRating;
  const rangeEnd = next.minRating;
  const current = Math.max(0, rating - rangeStart);
  const total = rangeEnd - rangeStart;

  return {
    current: Math.min(current, total),
    total,
    label: `${Math.min(current, total)} / ${total} to ${next.name}`,
  };
}

/**
 * Detects promotion or demotion between two league IDs.
 */
export function detectLeagueChange(
  oldLeagueId: number,
  newLeagueId: number
): 'promotion' | 'demotion' | null {
  if (newLeagueId > oldLeagueId) return 'promotion';
  if (newLeagueId < oldLeagueId) return 'demotion';
  return null;
}
