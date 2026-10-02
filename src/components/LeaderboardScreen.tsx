/**
 * Leaderboard screen with podium top-3, ranked list, and league tabs.
 */

import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Trophy, Crown, Medal, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../utils/supabaseClient.ts';
import { getTopPlayers, listPlayersByLeague, savePlayer, type PlayerRecord } from '../lib/repository.ts';
import { getLeague, LEAGUES } from '../lib/leagues.ts';
import { LeagueBadge } from './LeagueBadge.tsx';

interface LeaderboardScreenProps {
  currentPlayerId: string;
  currentPlayerLeagueId: number;
  onBack: () => void;
  friends?: PlayerRecord[];
}

type TabId = 'global' | 'league' | 'friends';

const PAGE_SIZE = 10;

export function LeaderboardScreen({
  currentPlayerId,
  currentPlayerLeagueId,
  onBack,
  friends = [],
}: LeaderboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>('global');
  const [page, setPage] = useState(0);
  const [remotePlayers, setRemotePlayers] = useState<PlayerRecord[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: PlayerRecord[] = data.map((p: any) => {
            const rating =
              p.elo_rating ?? Math.max(800, 800 + (p.wins || 0) * 25 - (p.losses || 0) * 15);
            return {
              id: p.id,
              name: p.name || 'Scholar',
              avatarUrl: p.avatar_url || undefined,
              rating,
              peakRating: p.peak_rating ?? rating,
              matchesPlayed: (p.wins || 0) + (p.losses || 0),
              wins: p.wins || 0,
              losses: p.losses || 0,
              winStreak: p.win_streak || 0,
              leagueId: p.league_id || getLeague(rating).id,
              updatedAt: p.updated_at || new Date().toISOString(),
              isBot: false,
            };
          });
          setRemotePlayers(mapped);
          mapped.forEach((pl) => savePlayer(pl));
        }
      });
  }, []);

  const hasFriends = friends && friends.length > 0;

  const allPlayers = useMemo(() => {
    // Combine local and remote players, deduplicated by id
    const local = getTopPlayers(200);
    const idMap = new Map<string, PlayerRecord>();
    local.forEach((p) => idMap.set(p.id, p));
    remotePlayers.forEach((p) => idMap.set(p.id, p));
    const merged = Array.from(idMap.values());

    if (activeTab === 'global') {
      return merged.sort((a, b) => b.rating - a.rating);
    }
    if (activeTab === 'league') {
      return merged
        .filter((p) => p.leagueId === currentPlayerLeagueId)
        .sort((a, b) => b.rating - a.rating);
    }
    if (activeTab === 'friends' && hasFriends) {
      return [...friends].sort((a, b) => b.rating - a.rating);
    }
    return merged.sort((a, b) => b.rating - a.rating);
  }, [activeTab, currentPlayerLeagueId, friends, hasFriends, remotePlayers]);

  const totalPages = Math.max(1, Math.ceil(allPlayers.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pagePlayers = allPlayers.slice(pageStart, pageStart + PAGE_SIZE);

  // Top 3 for podium (only on page 0 of global)
  const showPodium = activeTab === 'global' && page === 0;
  const podium = showPodium ? allPlayers.slice(0, 3) : [];
  const listPlayers = showPodium ? pagePlayers.slice(3) : pagePlayers;
  const listStartRank = showPodium ? 4 : pageStart + 1;

  // Current player row
  const currentPlayerIdx = allPlayers.findIndex((p) => p.id === currentPlayerId);
  const currentPlayer = currentPlayerIdx >= 0 ? allPlayers[currentPlayerIdx] : null;
  const isCurrentPlayerVisible = currentPlayerIdx >= pageStart && currentPlayerIdx < pageStart + PAGE_SIZE;

  // Season date range (current week)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const seasonLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}, ${now.getFullYear()}`;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'global', label: 'Global' },
    { id: 'league', label: 'My League' },
    ...(hasFriends ? [{ id: 'friends' as TabId, label: 'Friends' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-lg mx-auto px-4 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3 pt-6 pb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-normal text-[#C5A059] tracking-wide flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Leaderboard
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium mt-0.5">
              {seasonLabel}
            </p>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(0);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-[#C5A059] text-[#121212]'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Podium (top 3) */}
        {showPodium && podium.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-8 px-4">
            {/* 2nd Place */}
            <PodiumCard player={podium[1]} rank={2} height="h-28" />
            {/* 1st Place */}
            <PodiumCard player={podium[0]} rank={1} height="h-36" isFirst />
            {/* 3rd Place */}
            <PodiumCard player={podium[2]} rank={3} height="h-24" />
          </div>
        )}

        {/* Ranked List */}
        <div className="space-y-2">
          {listPlayers.map((player, idx) => {
            const rank = listStartRank + idx;
            const isMe = player.id === currentPlayerId;
            const league = getLeague(player.rating);

            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isMe
                    ? 'bg-[#C5A059]/10 border border-[#C5A059]/30'
                    : 'bg-[#161616] border border-white/5 hover:border-white/10'
                }`}
              >
                {/* Rank */}
                <span
                  className={`w-8 text-center font-serif font-bold text-sm ${
                    isMe ? 'text-[#C5A059]' : 'text-white/40'
                  }`}
                >
                  #{rank}
                </span>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-serif font-bold text-white/50 text-sm shrink-0">
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    player.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium text-sm truncate ${
                        isMe ? 'text-[#C5A059]' : 'text-white/80'
                      }`}
                    >
                      {isMe ? `${player.name} (You)` : player.name}
                    </span>
                    {player.isBot && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 uppercase tracking-wider">
                        Bot
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LeagueBadge league={league} size="sm" />
                    <span className="text-[10px] text-white/40 font-medium">
                      {league.name}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="text-right">
                  <span className="font-serif font-bold text-base text-white">{player.rating}</span>
                  <span className="text-[10px] text-white/40 block">ELO</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pinned current player row (when not visible on current page) */}
        {currentPlayer && !isCurrentPlayerVisible && (
          <div className="sticky bottom-20 mt-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 backdrop-blur-md shadow-lg">
              <span className="w-8 text-center font-serif font-bold text-sm text-[#C5A059]">
                #{currentPlayerIdx + 1}
              </span>
              <div className="w-9 h-9 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center font-serif font-bold text-[#C5A059] text-sm shrink-0">
                {currentPlayer.avatarUrl ? (
                  <img
                    src={currentPlayer.avatarUrl}
                    alt={currentPlayer.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  currentPlayer.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-[#C5A059] truncate block">
                  {currentPlayer.name} (You)
                </span>
              </div>
              <div className="text-right">
                <span className="font-serif font-bold text-base text-[#C5A059]">
                  {currentPlayer.rating}
                </span>
                <span className="text-[10px] text-[#C5A059]/60 block">ELO</span>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-white/50 font-medium">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

function PodiumCard({
  player,
  rank,
  height,
  isFirst,
}: {
  player: PlayerRecord;
  rank: number;
  height: string;
  isFirst?: boolean;
}) {
  const league = getLeague(player.rating);
  const medals: Record<number, { icon: typeof Crown; color: string; bg: string }> = {
    1: { icon: Crown, color: '#FFD700', bg: 'bg-yellow-500/10' },
    2: { icon: Medal, color: '#C0C0C0', bg: 'bg-gray-400/10' },
    3: { icon: Medal, color: '#CD7F32', bg: 'bg-orange-500/10' },
  };
  const medal = medals[rank];
  const MedalIcon = medal.icon;

  return (
    <div className="flex flex-col items-center flex-1 max-w-[130px]">
      {/* Avatar + Badge */}
      <div className="relative mb-2">
        <div
          className={`rounded-full border-2 p-0.5 bg-[#161616] flex items-center justify-center overflow-hidden ${
            isFirst ? 'w-16 h-16' : 'w-13 h-13'
          }`}
          style={{ borderColor: medal.color }}
        >
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="font-serif font-bold text-lg" style={{ color: medal.color }}>
              {player.name.charAt(0)}
            </span>
          )}
        </div>
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${medal.color}20`, border: `1.5px solid ${medal.color}` }}
        >
          <MedalIcon className="w-3.5 h-3.5" style={{ color: medal.color }} />
        </div>
      </div>

      {/* Name */}
      <span className="text-[11px] font-medium text-white/70 truncate max-w-full text-center">
        {player.name}
      </span>

      {/* Podium bar */}
      <div
        className={`w-full ${height} rounded-t-xl mt-2 flex flex-col items-center justify-end pb-2 border border-white/5`}
        style={{
          background: `linear-gradient(180deg, ${medal.color}15 0%, ${medal.color}05 100%)`,
        }}
      >
        <LeagueBadge league={league} size="sm" />
        <span className="font-serif font-bold text-white text-sm mt-1">{player.rating}</span>
        <span className="text-[9px] text-white/40 uppercase tracking-wider">ELO</span>
      </div>
    </div>
  );
}
