/**
 * Unit tests for elo.ts and leagues.ts
 * Run with: npx tsx src/lib/elo.test.ts
 */

import {
  expectedScore,
  getKFactor,
  getMovMultiplier,
  computeRatingDelta,
  computeMatchUpdate,
  createDefaultRating,
  type PlayerRating,
} from './elo.ts';

import {
  getLeague,
  getNextLeague,
  getLeagueProgress,
  detectLeagueChange,
  LEAGUES,
  DEMOTION_SHIELD_BUFFER,
} from './leagues.ts';

// ─── Test Utilities ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string): void {
  assert(Math.abs(actual - expected) <= tolerance, `${message} (got ${actual}, expected ~${expected})`);
}

// ─── ELO Tests ───────────────────────────────────────────────────────────────

console.log('\n🎯 ELO Tests\n');

// Expected score for equal ratings
console.log('Expected score:');
assertClose(expectedScore(800, 800), 0.5, 0.001, 'Equal ratings → 0.5');
assert(expectedScore(1200, 800) > 0.5, 'Higher rated player expects > 0.5');
assert(expectedScore(800, 1200) < 0.5, 'Lower rated player expects < 0.5');
assertClose(expectedScore(1200, 800), 1 - expectedScore(800, 1200), 0.001, 'Symmetry check');

// K-factor
console.log('\nK-factor:');
const placement: PlayerRating = { ...createDefaultRating(), matchesPlayed: 5 };
assert(getKFactor(placement) === 40, 'Placement phase (5 matches) → K=40');

const placement19: PlayerRating = { ...createDefaultRating(), matchesPlayed: 19 };
assert(getKFactor(placement19) === 40, 'Placement phase (19 matches) → K=40');

const normal: PlayerRating = { ...createDefaultRating(), matchesPlayed: 20, rating: 1500 };
assert(getKFactor(normal) === 32, 'Post-placement ≤1900 → K=32');

const high: PlayerRating = { ...createDefaultRating(), matchesPlayed: 50, rating: 2000 };
assert(getKFactor(high) === 24, 'Rating > 1900 → K=24');

// Edge: exactly 1900
const at1900: PlayerRating = { ...createDefaultRating(), matchesPlayed: 25, rating: 1900 };
assert(getKFactor(at1900) === 32, 'Rating = 1900 → K=32 (not 24)');

const at1901: PlayerRating = { ...createDefaultRating(), matchesPlayed: 25, rating: 1901 };
assert(getKFactor(at1901) === 24, 'Rating = 1901 → K=24');

// Margin-of-victory multiplier
console.log('\nMoV multiplier:');
assertClose(getMovMultiplier(0), 1.0, 0.001, 'Gap 0 → 1.0');
assertClose(getMovMultiplier(5), 1.25, 0.001, 'Gap 5 → 1.25');
assertClose(getMovMultiplier(10), 1.25, 0.001, 'Gap 10 → 1.25 (capped)');
assert(getMovMultiplier(3) > 1.0, 'Gap 3 → > 1.0');
assert(getMovMultiplier(3) < 1.25, 'Gap 3 → < 1.25');

// Equal rating match
console.log('\nEqual rating match:');
const p1: PlayerRating = { rating: 800, matchesPlayed: 25, wins: 10, losses: 15, peakRating: 850, winStreak: 0 };
const p2: PlayerRating = { rating: 800, matchesPlayed: 25, wins: 12, losses: 13, peakRating: 870, winStreak: 2 };

const equalWin = computeMatchUpdate(p1, p2, { result: 1, scoreGap: 0 });
assert(equalWin.deltaA > 0, 'Winner gains rating');
assert(equalWin.deltaB < 0, 'Loser loses rating');
assertClose(equalWin.deltaA, 16, 2, 'Equal rating win ≈ +16 (K=32, expected=0.5)');
assertClose(equalWin.deltaB, -16, 2, 'Equal rating loss ≈ -16');

// Upset win (low rated beats high rated)
console.log('\nUpset win:');
const underdog: PlayerRating = { rating: 600, matchesPlayed: 30, wins: 8, losses: 22, peakRating: 700, winStreak: 0 };
const favorite: PlayerRating = { rating: 1400, matchesPlayed: 50, wins: 35, losses: 15, peakRating: 1500, winStreak: 3 };

const upset = computeMatchUpdate(underdog, favorite, { result: 1, scoreGap: 3 });
assert(upset.deltaA > 20, `Underdog upset win gives big gain (got ${upset.deltaA})`);
assert(upset.deltaB < -20, `Favorite upset loss gives big loss (got ${upset.deltaB})`);

// Floor at 0
console.log('\nFloor at 0:');
const nearZero: PlayerRating = { rating: 5, matchesPlayed: 30, wins: 0, losses: 30, peakRating: 100, winStreak: 0 };
const strong: PlayerRating = { rating: 2000, matchesPlayed: 100, wins: 80, losses: 20, peakRating: 2100, winStreak: 5 };

const floorTest = computeMatchUpdate(nearZero, strong, { result: 0, scoreGap: 5 });
assert(floorTest.playerA.rating >= 0, `Rating never below 0 (got ${floorTest.playerA.rating})`);

// Placement K
console.log('\nPlacement K (first 20 matches):');
const newbie: PlayerRating = { rating: 800, matchesPlayed: 5, wins: 3, losses: 2, peakRating: 850, winStreak: 1 };
const experienced: PlayerRating = { rating: 800, matchesPlayed: 100, wins: 50, losses: 50, peakRating: 900, winStreak: 0 };

const newbieWin = computeMatchUpdate(newbie, experienced, { result: 1, scoreGap: 0 });
assert(newbieWin.deltaA > 16, `Placement K gives bigger swings (got ${newbieWin.deltaA} vs ~16 for normal)`);
assertClose(newbieWin.deltaA, 20, 2, 'Placement win ≈ +20 (K=40)');

// Bot match (half K)
console.log('\nBot match (half K):');
const botMatch = computeMatchUpdate(p1, p2, { result: 1, scoreGap: 0, isBot: true });
assert(botMatch.deltaA < equalWin.deltaA, `Bot win gives less than human win (${botMatch.deltaA} < ${equalWin.deltaA})`);
assertClose(botMatch.deltaA, equalWin.deltaA / 2, 2, 'Bot match ≈ half the rating change');

// Draw
console.log('\nDraw:');
const draw = computeMatchUpdate(p1, p2, { result: 0.5, scoreGap: 0 });
assertClose(draw.deltaA, 0, 2, 'Equal rating draw ≈ 0 change');
assertClose(draw.deltaB, 0, 2, 'Equal rating draw ≈ 0 change (opponent)');

// ─── League Tests ────────────────────────────────────────────────────────────

console.log('\n\n🏆 League Tests\n');

// Boundary values
console.log('Boundary lookups:');
assert(getLeague(999).id === 1, 'Rating 999 → Bronze Griffin (League 1)');
assert(getLeague(1000).id === 2, 'Rating 1000 → Silver Phoenix (League 2)');
assert(getLeague(1299).id === 2, 'Rating 1299 → Silver Phoenix (League 2)');
assert(getLeague(1300).id === 3, 'Rating 1300 → Gold Lion (League 3)');
assert(getLeague(1599).id === 3, 'Rating 1599 → Gold Lion (League 3)');
assert(getLeague(1600).id === 4, 'Rating 1600 → Crystal Aegis (League 4)');
assert(getLeague(1899).id === 4, 'Rating 1899 → Crystal Aegis (League 4)');
assert(getLeague(1900).id === 5, 'Rating 1900 → Crimson Dragon (League 5)');
assert(getLeague(2500).id === 5, 'Rating 2500 → Crimson Dragon (League 5)');
assert(getLeague(0).id === 1, 'Rating 0 → Bronze Griffin (League 1)');

// Demotion shield
console.log('\nDemotion shield:');
assert(
  getLeague(999, 2).id === 2,
  `Rating 999 with current league 2 → stays in League 2 (shield: min 1000 - ${DEMOTION_SHIELD_BUFFER} = 975)`
);
assert(
  getLeague(975, 2).id === 2,
  'Rating 975 with current league 2 → stays in League 2 (exactly at shield boundary)'
);
assert(
  getLeague(974, 2).id === 1,
  'Rating 974 with current league 2 → demoted to League 1 (below shield)'
);

// Next league
console.log('\nNext league:');
assert(getNextLeague(LEAGUES[0])?.id === 2, 'Bronze → Silver');
assert(getNextLeague(LEAGUES[3])?.id === 5, 'Crystal → Crimson');
assert(getNextLeague(LEAGUES[4]) === null, 'Crimson → null (top)');

// League progress
console.log('\nLeague progress:');
const prog = getLeagueProgress(800, LEAGUES[0]);
assert(prog !== null, 'Bronze has next league progress');
assert(prog!.total === 1000, 'Bronze to Silver = 1000 range');
assertClose(prog!.current, 800, 1, 'Progress at 800 in Bronze = 800');

const topProg = getLeagueProgress(2000, LEAGUES[4]);
assert(topProg === null, 'Top league has no progress (max)');

// League change detection
console.log('\nLeague change detection:');
assert(detectLeagueChange(1, 2) === 'promotion', '1→2 = promotion');
assert(detectLeagueChange(3, 1) === 'demotion', '3→1 = demotion');
assert(detectLeagueChange(2, 2) === null, '2→2 = no change');

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
