/**
 * Seeds 30 fake players across all five leagues for testing.
 * Call once on app init — it's idempotent (checks if players already exist).
 */

import { savePlayer, listPlayers, type PlayerRecord } from './repository.ts';

const FAKE_NAMES = [
  // Bronze Griffin (0–999) — 8 players
  { name: 'Arjun P.', rating: 620 },
  { name: 'Meera D.', rating: 740 },
  { name: 'Kavi S.', rating: 510 },
  { name: 'Priya M.', rating: 880 },
  { name: 'Rahul K.', rating: 450 },
  { name: 'Devi L.', rating: 790 },
  { name: 'Rohan T.', rating: 920 },
  { name: 'Ananya B.', rating: 680 },

  // Silver Phoenix (1000–1299) — 7 players
  { name: 'Vikram R.', rating: 1050 },
  { name: 'Sita N.', rating: 1150 },
  { name: 'Arun G.', rating: 1200 },
  { name: 'Lakshmi V.', rating: 1080 },
  { name: 'Krishna J.', rating: 1250 },
  { name: 'Padma H.', rating: 1120 },
  { name: 'Ganesh W.', rating: 1010 },

  // Gold Lion (1300–1599) — 6 players
  { name: 'Saraswati A.', rating: 1350 },
  { name: 'Ravi C.', rating: 1450 },
  { name: 'Uma F.', rating: 1500 },
  { name: 'Shiva P.', rating: 1380 },
  { name: 'Durga S.', rating: 1550 },
  { name: 'Bharat M.', rating: 1420 },

  // Crystal Aegis (1600–1899) — 5 players
  { name: 'Indra V.', rating: 1650 },
  { name: 'Parvati K.', rating: 1750 },
  { name: 'Vishnu R.', rating: 1800 },
  { name: 'Shakti D.', rating: 1700 },
  { name: 'Agni T.', rating: 1850 },

  // Crimson Dragon (1900+) — 4 players
  { name: 'Brahma G.', rating: 1950 },
  { name: 'Kali N.', rating: 2100 },
  { name: 'Surya B.', rating: 2000 },
  { name: 'Vayu J.', rating: 1920 },
];

function getLeagueId(rating: number): number {
  if (rating >= 1900) return 5;
  if (rating >= 1600) return 4;
  if (rating >= 1300) return 3;
  if (rating >= 1000) return 2;
  return 1;
}

/**
 * Seeds fake players if not already present.
 * Returns the count of newly seeded players.
 */
export function seedFakePlayers(): number {
  const existing = listPlayers();
  const existingIds = new Set(existing.map((p) => p.id));

  let seeded = 0;

  FAKE_NAMES.forEach((fake, index) => {
    const id = `bot_${index + 1}`;
    if (existingIds.has(id)) return;

    // Generate somewhat realistic stats
    const matchesPlayed = 20 + Math.floor(Math.random() * 80);
    const winRate = 0.35 + Math.random() * 0.35; // 35% to 70%
    const wins = Math.floor(matchesPlayed * winRate);
    const losses = matchesPlayed - wins;

    const player: PlayerRecord = {
      id,
      name: fake.name,
      rating: fake.rating,
      peakRating: fake.rating + Math.floor(Math.random() * 100),
      matchesPlayed,
      wins,
      losses,
      winStreak: Math.floor(Math.random() * 5),
      leagueId: getLeagueId(fake.rating),
      updatedAt: new Date().toISOString(),
      isBot: true,
    };

    savePlayer(player);
    seeded++;
  });

  return seeded;
}
