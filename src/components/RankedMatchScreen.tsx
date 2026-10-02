/**
 * Orchestrator for the ranked matchmaking flow.
 * Handles: search → VS intro → battle quiz → post-match ELO → league change modal.
 * Wraps BattleGameScreen for the actual quiz.
 * Supports both online Supabase matches and offline / bot fallback matches.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient.ts';
import { useMatchmaking } from '../hooks/useMatchmaking.ts';
import { useBattleMatch } from '../hooks/useBattleMatch.ts';
import { useProfile } from '../hooks/useProfile.ts';
import { BattleGameScreen } from './BattleGameScreen.tsx';
import { MatchFoundScreen } from './MatchFoundScreen.tsx';
import { LeagueBadge } from './LeagueBadge.tsx';
import { LeagueProgressBar } from './LeagueProgressBar.tsx';
import { LeagueUpModal } from './LeagueUpModal.tsx';
import { computeMatchUpdate } from '../lib/elo.ts';
import { getLeague, detectLeagueChange, type LeagueConfig } from '../lib/leagues.ts';
import {
  getPlayer,
  savePlayer,
  recordMatch,
  ensurePlayer,
  toPlayerRating,
  applyRatingUpdate,
  type PlayerRecord,
} from '../lib/repository.ts';
import {
  findOpponentInWindow,
  findBotOpponent,
  computeSearchWindow,
  shouldUseBotFallback,
} from '../lib/matchmaking.ts';
import { getQuestionsForCategory, type BattleQuestionItem } from '../data/battleQuestions.ts';
import {
  X, Hourglass, Swords, TrendingUp, TrendingDown, Trophy, Home, RefreshCw, AlertTriangle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase =
  | 'idle'
  | 'searching'
  | 'vs_intro'
  | 'battle'
  | 'post_match'
  | 'league_change';

interface MatchOpponent {
  record: PlayerRecord;
  isBot: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RankedMatchScreen({
  category = 'Sanskrit',
  onExit,
  onLeaderboard,
}: {
  category?: string;
  onExit?: () => void;
  onLeaderboard?: () => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [opponent, setOpponent] = useState<MatchOpponent | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerRecord | null>(null);

  // Post-match data
  const [ratingDelta, setRatingDelta] = useState(0);
  const [animatedDelta, setAnimatedDelta] = useState(0);
  const [matchOutcome, setMatchOutcome] = useState<'win' | 'loss' | 'draw'>('draw');
  const [newRating, setNewRating] = useState(0);
  const [newLeague, setNewLeague] = useState<LeagueConfig | null>(null);
  const [leagueChangeType, setLeagueChangeType] = useState<'promotion' | 'demotion' | null>(null);

  // Search state
  const [searchElapsed, setSearchElapsed] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchStartRef = useRef<number>(0);

  // Local battle state (for bot matches or fallback)
  const [localQuestions, setLocalQuestions] = useState<BattleQuestionItem[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [myStreak, setMyStreak] = useState(0);
  const [botAnswered, setBotAnswered] = useState(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Supabase battle hooks (for real multiplayer when paired)
  const {
    status: mmStatus,
    matchId,
    findMatch,
    cancelSearch,
    updateSearchWindow,
    onlineCount,
  } = useMatchmaking(userId ?? '');
  const battle = useBattleMatch(matchId ?? '', userId ?? '');
  const { profile: myProfile } = useProfile(userId);
  const { profile: opponentProfile, winRatePct: opponentWinRate } = useProfile(battle.opponentId);

  // Initialize current player
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? `guest_${Date.now()}`;
      setUserId(uid);
      const name =
        data.user?.user_metadata?.name ||
        data.user?.user_metadata?.full_name ||
        data.user?.email?.split('@')[0] ||
        'Scholar';
      const player = ensurePlayer(uid, name, data.user?.user_metadata?.avatar_url);
      setMyPlayer(player);
    });
  }, []);

  // Keep myPlayer name and avatar in sync as soon as Supabase profile loads
  useEffect(() => {
    if (myProfile?.name && myPlayer && myPlayer.name !== myProfile.name) {
      setMyPlayer((prev) => (prev ? { ...prev, name: myProfile.name, avatarUrl: myProfile.avatar_url ?? prev.avatarUrl } : prev));
      if (userId) {
        ensurePlayer(userId, myProfile.name, myProfile.avatar_url ?? undefined);
      }
    }
  }, [myProfile?.name, myProfile?.avatar_url, userId]);

  // Sync Supabase online matchmaking status
  useEffect(() => {
    if (mmStatus === 'matched' && battle.match && phase === 'searching') {
      stopSearch();

      const rawOppRating =
        (opponentProfile as any)?.elo_rating ??
        (opponentProfile ? 800 + ((opponentProfile.wins || 0) * 25) - ((opponentProfile.losses || 0) * 15) : (myPlayer?.rating ?? 800));
      const oppRating = Math.max(0, Math.round(rawOppRating));

      setOpponent({
        record: {
          id: battle.opponentId ?? 'online_opponent',
          name: opponentProfile?.name ?? 'Opponent',
          rating: oppRating,
          peakRating: Math.max(oppRating, (opponentProfile as any)?.peak_rating ?? oppRating),
          matchesPlayed: (opponentProfile?.wins || 0) + (opponentProfile?.losses || 0),
          wins: opponentProfile?.wins || 0,
          losses: opponentProfile?.losses || 0,
          winStreak: (opponentProfile as any)?.win_streak || 0,
          leagueId: getLeague(oppRating).id,
          updatedAt: new Date().toISOString(),
          isBot: false,
          avatarUrl: opponentProfile?.avatar_url ?? undefined,
        },
        isBot: false,
      });
      setPhase('vs_intro');
    }
  }, [mmStatus, battle.match, phase, opponentProfile, battle.opponentId, myPlayer?.rating]);

  // Online battle completion
  useEffect(() => {
    if (battle.match?.status === 'finished' && phase === 'battle' && !opponent?.isBot) {
      handleFinalizeMatch(
        battle.myScore,
        battle.opponentScore,
        opponent?.record ?? {
          id: 'opp',
          name: 'Opponent',
          rating: myPlayer?.rating ?? 800,
          peakRating: 800,
          matchesPlayed: 1,
          wins: 0,
          losses: 0,
          winStreak: 0,
          leagueId: 1,
          updatedAt: new Date().toISOString(),
        },
        false
      );
    }
  }, [battle.match?.status, phase, opponent, battle.myScore, battle.opponentScore]);

  // ─── Search Logic ────────────────────────────────────────────────────────

  const startSearch = useCallback(() => {
    setPhase('searching');
    setSearchElapsed(0);
    searchStartRef.current = Date.now();

    // Trigger online matchmaking search with rating and window
    const initialRating = myPlayer?.rating ?? 800;
    try {
      findMatch(category, initialRating, 100);
    } catch {
      // Offline safe
    }

    // Search ticker & bot fallback
    searchTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - searchStartRef.current;
      setSearchElapsed(elapsed);

      if (myPlayer) {
        // Enforce SAME LEVEL matchmaking: restrict window within the player's league
        const currentLeagueConfig = getLeague(myPlayer.rating, myPlayer.leagueId);
        const rawWindow = computeSearchWindow(elapsed);
        const maxAllowedWindow = Math.min(
          rawWindow,
          Math.max(50, myPlayer.rating - currentLeagueConfig.minRating),
          Math.max(50, currentLeagueConfig.maxRating - myPlayer.rating)
        );
        const window = Math.max(50, maxAllowedWindow);
        updateSearchWindow(window);

        // Bot fallback after 30 seconds of searching for real online peers
        if (shouldUseBotFallback(elapsed)) {
          const bot = findBotOpponent(myPlayer.id, myPlayer.rating);
          if (bot) {
            stopSearch();
            cancelSearch();
            setOpponent({ record: bot, isBot: true });
            setupLocalQuiz();
            setPhase('vs_intro');
          }
        }
      }
    }, 1000);
  }, [myPlayer, findMatch, cancelSearch, category, updateSearchWindow]);

  const stopSearch = useCallback(() => {
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSearch();
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [stopSearch]);

  const setupLocalQuiz = () => {
    const qList = getQuestionsForCategory(category, 5);
    setLocalQuestions(qList);
    setCurrentRoundIdx(0);
    setMyScore(0);
    setBotScore(0);
    setMyStreak(0);
    setBotAnswered(false);
  };

  // ─── Bot Simulation ──────────────────────────────────────────────────────

  const scheduleBotAnswer = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setBotAnswered(false);

    // Bot answers between 2.5s and 5.5s
    const delay = 2500 + Math.random() * 3000;
    botTimerRef.current = setTimeout(() => {
      setBotAnswered(true);
      // Accuracy based on bot rating: 800 rating ~ 50%, 1500 rating ~ 75%, 2000 rating ~ 90%
      const botRating = opponent?.record.rating ?? 800;
      const accuracy = Math.min(0.92, Math.max(0.45, 0.45 + (botRating - 600) * 0.00035));
      const isCorrect = Math.random() < accuracy;
      if (isCorrect) {
        setBotScore((prev) => prev + 100);
      }
    }, delay);
  }, [opponent]);

  // When round changes in local bot match, schedule bot answer
  useEffect(() => {
    if (phase === 'battle' && opponent?.isBot) {
      scheduleBotAnswer();
    }
  }, [phase, currentRoundIdx, opponent?.isBot, scheduleBotAnswer]);

  // ─── Match Completion / Forfeit ──────────────────────────────────────────

  const handleFinalizeMatch = (
    finalMyScore: number,
    finalOppScore: number,
    oppRecord: PlayerRecord,
    isBot: boolean,
    wasForfeited = false
  ) => {
    if (!myPlayer) return;

    let outcome: 'win' | 'loss' | 'draw' = 'draw';
    if (wasForfeited) {
      outcome = 'loss';
    } else if (finalMyScore > finalOppScore) {
      outcome = 'win';
    } else if (finalMyScore < finalOppScore) {
      outcome = 'loss';
    }

    const result = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0;
    const myRating = toPlayerRating(myPlayer);
    const oppRating = toPlayerRating(oppRecord);

    const update = computeMatchUpdate(myRating, oppRating, {
      result: result as 1 | 0.5 | 0,
      scoreGap: Math.abs(finalMyScore - finalOppScore),
      isBot,
    });

    const prevLeagueId = myPlayer.leagueId;
    const updatedLeague = getLeague(update.playerA.rating, prevLeagueId);
    const updatedPlayer = applyRatingUpdate(myPlayer, update.playerA, updatedLeague.id);
    savePlayer(updatedPlayer);
    setMyPlayer(updatedPlayer);

    // Update local opponent record if applicable
    if (getPlayer(oppRecord.id)) {
      const oppLeague = getLeague(update.playerB.rating, oppRecord.leagueId);
      const updatedOpp = applyRatingUpdate(oppRecord, update.playerB, oppLeague.id);
      savePlayer(updatedOpp);
    }

    // Persist match history
    recordMatch({
      id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      playerAId: myPlayer.id,
      playerBId: oppRecord.id,
      ratingsBefore: { a: myPlayer.rating, b: oppRecord.rating },
      ratingsAfter: { a: update.playerA.rating, b: update.playerB.rating },
      scores: { a: finalMyScore, b: finalOppScore },
      winnerId: outcome === 'win' ? myPlayer.id : outcome === 'loss' ? oppRecord.id : null,
      createdAt: new Date().toISOString(),
    });

    // Sync to Supabase profiles table if authenticated
    if (userId && !userId.startsWith('guest_')) {
      supabase.from('profiles').update({
        elo_rating: updatedPlayer.rating,
        peak_rating: updatedPlayer.peakRating,
        win_streak: updatedPlayer.winStreak,
        league_id: updatedPlayer.leagueId,
        wins: updatedPlayer.wins,
        losses: updatedPlayer.losses,
      }).eq('id', userId).then(({ error }) => {
        if (error) console.warn('[RankedMatchScreen] Supabase ELO sync note:', error.message);
      });
    }

    setMatchOutcome(outcome);
    setRatingDelta(update.deltaA);
    setNewRating(update.playerA.rating);

    const changeType = detectLeagueChange(prevLeagueId, updatedLeague.id);
    setLeagueChangeType(changeType);
    setNewLeague(updatedLeague);

    setPhase('post_match');
    animateRatingDelta(update.deltaA);
  };

  const handleForfeit = () => {
    if (window.confirm('Forfeit this battle? Leaving mid-match counts as an official defeat.')) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      handleFinalizeMatch(
        myScore,
        botScore + 100,
        opponent?.record ?? {
          id: 'opponent',
          name: 'Opponent',
          rating: myPlayer?.rating ?? 800,
          peakRating: 800,
          matchesPlayed: 1,
          wins: 0,
          losses: 0,
          winStreak: 0,
          leagueId: 1,
          updatedAt: new Date().toISOString(),
        },
        opponent?.isBot ?? false,
        true
      );
    }
  };

  // Local answer submission
  const handleLocalAnswer = (selectedIndex: number) => {
    const q = localQuestions[currentRoundIdx];
    if (!q) return;

    const isCorrect = selectedIndex === q.correct_index;
    if (isCorrect) {
      const bonus = myStreak * 10;
      setMyScore((s) => s + 100 + bonus);
      setMyStreak((st) => st + 1);
    } else {
      setMyStreak(0);
    }
  };

  const handleLocalNextRound = () => {
    if (currentRoundIdx + 1 < localQuestions.length) {
      setCurrentRoundIdx((r) => r + 1);
    } else {
      // Completed all 5 rounds
      if (opponent) {
        handleFinalizeMatch(myScore, botScore, opponent.record, opponent.isBot);
      }
    }
  };

  const animateRatingDelta = (target: number) => {
    setAnimatedDelta(0);
    const steps = 25;
    const stepDuration = 35;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedDelta(Math.round(target * eased));
      if (current >= steps) {
        clearInterval(timer);
        setAnimatedDelta(target);
      }
    }, stepDuration);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!userId || !myPlayer) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  const currentLeague = getLeague(myPlayer.rating, myPlayer.leagueId);

  // ─── 1. IDLE SCREEN ──────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center space-y-3">
          <LeagueBadge league={currentLeague} size="xl" showName />
          <h1 className="font-serif text-3xl sm:text-4xl text-[#C5A059] tracking-wide mt-2">
            Shāstrārtha Arena
          </h1>
          <p className="text-white/60 text-xs sm:text-sm font-light uppercase tracking-widest">
            Ranked {category} Battle
          </p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="font-serif text-3xl text-white font-normal">{myPlayer.rating}</span>
            <span className="text-xs text-[#C5A059] uppercase font-bold tracking-wider">ELO Rating</span>
          </div>
        </div>

        <LeagueProgressBar rating={myPlayer.rating} league={currentLeague} className="w-full max-w-sm" />

        <button
          type="button"
          onClick={startSearch}
          className="w-full max-w-sm py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-[#0A0A0A] font-serif font-bold text-base tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-[#C5A059]/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Swords className="w-5 h-5 stroke-[2.2]" />
          <span>Find Match</span>
        </button>

        <div className="flex gap-3 w-full max-w-sm">
          {onLeaderboard && (
            <button
              type="button"
              onClick={onLeaderboard}
              className="flex-1 py-3 rounded-xl bg-[#161616] border border-white/10 text-white/80 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 hover:border-[#C5A059]/40 transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#C5A059]" />
              Leaderboard
            </button>
          )}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="flex-1 py-3 rounded-xl bg-[#161616] border border-white/10 text-white/80 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          )}
        </div>

        {/* Stats card */}
        <div className="grid grid-cols-4 gap-2.5 w-full max-w-sm mt-1">
          <div className="text-center bg-[#161616] border border-white/5 rounded-xl py-3">
            <span className="text-white font-serif text-lg font-bold block">{myPlayer.matchesPlayed}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-wider">Matches</span>
          </div>
          <div className="text-center bg-[#161616] border border-white/5 rounded-xl py-3">
            <span className="text-emerald-400 font-serif text-lg font-bold block">{myPlayer.wins}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-wider">Wins</span>
          </div>
          <div className="text-center bg-[#161616] border border-white/5 rounded-xl py-3">
            <span className="text-rose-400 font-serif text-lg font-bold block">{myPlayer.losses}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-wider">Losses</span>
          </div>
          <div className="text-center bg-[#161616] border border-white/5 rounded-xl py-3">
            <span className="text-[#C5A059] font-serif text-lg font-bold block">{myPlayer.peakRating}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-wider">Peak</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. SEARCHING SCREEN ─────────────────────────────────────────────────

  if (phase === 'searching') {
    const windowVal = computeSearchWindow(searchElapsed);
    const seconds = Math.floor(searchElapsed / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');

    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-6 select-none">
        <style>{`
          @keyframes pulse-ring-search { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.04); opacity: 0.25; } 100% { transform: scale(0.95); opacity: 0.7; } }
          @keyframes orbit-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .pulse-glow-search { animation: pulse-ring-search 4s ease-in-out infinite; }
          .orbiting-ring { animation: orbit-cw 20s linear infinite; }
        `}</style>

        {/* Searching Status & Live Online Scholars Pill */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 bg-[#161616] border border-emerald-500/30 px-3.5 py-1.5 rounded-full shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
              {onlineCount} {onlineCount === 1 ? 'Scholar' : 'Scholars'} Online
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#161616] border border-[#C5A059]/40 px-3.5 py-1.5 rounded-full shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
            <span className="text-[11px] font-bold tracking-widest text-[#C5A059] uppercase">
              In Queue
            </span>
          </div>
        </div>

        {/* Radar with Badge */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          <div className="absolute inset-2 rounded-full border border-[#C5A059]/20 pulse-glow-search" />
          <div className="absolute inset-8 rounded-full border border-dashed border-[#C5A059]/35 orbiting-ring" />
          <div className="absolute inset-16 rounded-full border border-[#C5A059]/50" />
          <LeagueBadge league={currentLeague} size="lg" />
        </div>

        {/* Dynamic Range Display (No layout shift) */}
        <div className="text-center space-y-1.5">
          <h2 className="font-serif text-2xl text-white font-normal">Rating Matchmaker</h2>
          <p className="text-xs text-[#C5A059] font-mono tracking-wide">
            Searching {myPlayer.rating} ± {windowVal} ({Math.max(0, myPlayer.rating - windowVal)} – {myPlayer.rating + windowVal})
          </p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
            {onlineCount > 1
              ? 'Multiplayer Active • Pairing Closest Rating'
              : 'Expanding Search Window (+50 Every 5s)'}
          </p>
        </div>

        {/* Timer & Window Bar */}
        <div className="w-full max-w-xs bg-[#161616] border border-white/10 rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5 text-white/70">
            <Hourglass className="w-4 h-4 text-[#C5A059] animate-spin" />
            <span className="text-xs font-medium">Range: ±{windowVal}</span>
          </div>
          <span className="font-mono text-sm font-bold text-amber-300">
            {mm}:{ss}
          </span>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={() => {
            stopSearch();
            cancelSearch();
            setPhase('idle');
          }}
          className="w-full max-w-xs py-3.5 bg-[#161616] hover:bg-white/5 border border-white/10 rounded-xl font-semibold text-white/70 hover:text-white flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider cursor-pointer"
        >
          <X className="w-4 h-4" />
          Cancel Queue
        </button>
      </div>
    );
  }

  // ─── 3. VS INTRO SCREEN ──────────────────────────────────────────────────

  if (phase === 'vs_intro') {
    const oppRecord = opponent?.record;
    const oppName = oppRecord?.name ?? opponentProfile?.name ?? 'Opponent';
    const oppRating = oppRecord?.rating ?? myPlayer.rating;
    const oppLeague = getLeague(oppRating);
    const oppWinRate = oppRecord
      ? oppRecord.wins + oppRecord.losses > 0
        ? Math.round((oppRecord.wins / (oppRecord.wins + oppRecord.losses)) * 100)
        : 50
      : (opponentWinRate ?? 50);

    const myWinRate =
      myPlayer.wins + myPlayer.losses > 0
        ? Math.round((myPlayer.wins / (myPlayer.wins + myPlayer.losses)) * 100)
        : 50;

    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-8 p-6 select-none animate-in fade-in duration-300">
        <div className="inline-flex items-center gap-2 bg-[#161616] border border-[#C5A059]/40 px-5 py-1.5 rounded-full shadow-inner">
          <span className="text-xs font-bold tracking-widest text-[#C5A059] uppercase">
            Match Confirmed
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md">
          {/* Player 1 (You) */}
          <div className="flex flex-col items-center gap-2 text-center flex-1">
            <LeagueBadge league={currentLeague} size="lg" />
            <span className="text-base font-semibold text-white truncate max-w-[120px]">
              {myPlayer.name}
            </span>
            <div className="text-xs text-[#C5A059] font-mono font-bold">{myPlayer.rating} ELO</div>
            <span className="text-[10px] text-emerald-400 font-medium">{myWinRate}% Win Rate</span>
          </div>

          {/* VS Medallion */}
          <div className="w-14 h-14 rounded-full bg-[#161616] border-2 border-[#C5A059] flex items-center justify-center shadow-lg shadow-[#C5A059]/20 shrink-0">
            <span className="font-serif font-black text-sm text-[#C5A059]">VS</span>
          </div>

          {/* Player 2 (Opponent) */}
          <div className="flex flex-col items-center gap-2 text-center flex-1">
            <LeagueBadge league={oppLeague} size="lg" />
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-base font-semibold text-white truncate max-w-[100px]">
                {oppName}
              </span>
              {opponent?.isBot && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider">
                  Bot
                </span>
              )}
            </div>
            <div className="text-xs text-white/60 font-mono font-bold">{oppRating} ELO</div>
            <span className="text-[10px] text-emerald-400 font-medium">{oppWinRate}% Win Rate</span>
          </div>
        </div>

        {/* 2-second countdown auto-start */}
        <VSAutoStart onStart={() => setPhase('battle')} />
      </div>
    );
  }

  // ─── 4. BATTLE SCREEN (Wrapping BattleGameScreen) ─────────────────────────

  if (phase === 'battle') {
    // A. Online match via Supabase
    if (battle.match && battle.question && !opponent?.isBot) {
      return (
        <BattleGameScreen
          key={`${battle.match.id}_${battle.match.current_round}`}
          currentPlayer={{
            name: myProfile?.name ?? myPlayer.name,
            score: battle.myScore,
            avatarUrl: myProfile?.avatar_url ?? myPlayer.avatarUrl,
          }}
          opponent={{
            name: opponentProfile?.name ?? opponent?.record.name ?? 'Opponent',
            score: battle.opponentScore,
            avatarUrl: opponentProfile?.avatar_url ?? opponent?.record.avatarUrl,
          }}
          round={battle.match.current_round}
          totalRounds={battle.match.total_rounds}
          category={battle.match.category}
          streak={battle.myStreak}
          duration={10}
          questionKey={battle.question.id}
          questionTag={battle.question.question_tag}
          instruction={battle.question.instruction}
          questionText={battle.question.question_text}
          answers={battle.question.answers}
          correctIndex={battle.question.correct_index}
          opponentAnswered={battle.opponentAnswered}
          onAnswer={battle.submitAnswer}
          onTimeUp={battle.advanceRound}
          onForfeit={handleForfeit}
        />
      );
    }

    // B. Local Bot or Fallback Match
    const currentQ = localQuestions[currentRoundIdx];
    if (!currentQ) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/50">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-wider">Preparing Questions...</p>
          </div>
        </div>
      );
    }

    return (
      <BattleGameScreen
        key={`local_${currentQ.id}_${currentRoundIdx}`}
        currentPlayer={{
          name: myPlayer.name,
          score: myScore,
          avatarUrl: myPlayer.avatarUrl,
        }}
        opponent={{
          name: opponent ? `${opponent.record.name} (Bot)` : 'Guru Bot',
          score: botScore,
          avatarUrl: opponent?.record.avatarUrl,
        }}
        round={currentRoundIdx + 1}
        totalRounds={localQuestions.length}
        category={category}
        streak={myStreak}
        duration={10}
        questionKey={currentQ.id}
        questionTag={currentQ.question_tag}
        instruction={currentQ.instruction}
        questionText={currentQ.question_text}
        answers={currentQ.answers}
        correctIndex={currentQ.correct_index}
        opponentAnswered={botAnswered}
        onAnswer={handleLocalAnswer}
        onTimeUp={handleLocalNextRound}
        onForfeit={handleForfeit}
      />
    );
  }

  // ─── 5. POST MATCH SCREEN ────────────────────────────────────────────────

  if (phase === 'post_match') {
    const updatedLeague = newLeague ?? currentLeague;
    const outcomeConfig = {
      win: { label: 'VICTORY', color: '#C5A059', badgeColor: 'bg-[#C5A059]/20 text-[#C5A059]', icon: '👑' },
      loss: { label: 'DEFEAT', color: '#EF4444', badgeColor: 'bg-red-500/20 text-red-400', icon: '⚔️' },
      draw: { label: 'DRAW', color: '#9CA3AF', badgeColor: 'bg-white/10 text-white/70', icon: '🤝' },
    }[matchOutcome];

    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-5 p-6 animate-in fade-in duration-300">
        {/* Outcome Header */}
        <div className="text-center space-y-2">
          <span className="text-5xl">{outcomeConfig.icon}</span>
          <h1
            className="font-serif text-4xl sm:text-5xl font-bold tracking-widest mt-1"
            style={{ color: outcomeConfig.color }}
          >
            {outcomeConfig.label}
          </h1>
        </div>

        {/* ELO Rating Change Card */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
          {/* Animated Delta */}
          <div className="flex items-center justify-center gap-2">
            {ratingDelta >= 0 ? (
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            ) : (
              <TrendingDown className="w-6 h-6 text-rose-400" />
            )}
            <span
              className={`font-serif text-4xl font-extrabold ${
                ratingDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {animatedDelta >= 0 ? `+${animatedDelta}` : animatedDelta}
            </span>
          </div>

          <div>
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">
              Updated Rating
            </span>
            <div className="font-serif text-3xl text-white font-normal mt-0.5">
              {newRating} <span className="text-xs text-[#C5A059] font-mono">ELO</span>
            </div>
          </div>

          <LeagueBadge league={updatedLeague} size="md" showName />
          <LeagueProgressBar rating={newRating} league={updatedLeague} />
        </div>

        {/* Navigation Buttons */}
        <div className="w-full max-w-sm space-y-2.5 mt-2">
          <button
            type="button"
            onClick={() => {
              setPhase('idle');
              setOpponent(null);
            }}
            className="w-full py-3.5 rounded-xl bg-[#C5A059] text-[#0A0A0A] font-serif font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            Play Again
          </button>

          {onLeaderboard && (
            <button
              type="button"
              onClick={onLeaderboard}
              className="w-full py-3.5 rounded-xl bg-[#161616] border border-white/10 text-white/80 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 hover:border-[#C5A059]/40 transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#C5A059]" />
              Leaderboard
            </button>
          )}

          {onExit && (
            <button
              type="button"
              onClick={() => {
                if (leagueChangeType && newLeague) {
                  setPhase('league_change');
                } else {
                  onExit();
                }
              }}
              className="w-full py-3.5 rounded-xl bg-[#161616] border border-white/10 text-white/80 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          )}
        </div>

        {/* Modal on promotion or demotion */}
        {leagueChangeType && newLeague && (
          <LeagueUpModal
            isOpen={true}
            onClose={() => setLeagueChangeType(null)}
            newLeague={newLeague}
            type={leagueChangeType}
          />
        )}
      </div>
    );
  }

  // ─── 6. LEAGUE CHANGE MODAL ──────────────────────────────────────────────

  if (phase === 'league_change' && newLeague && leagueChangeType) {
    return (
      <LeagueUpModal
        isOpen={true}
        onClose={() => {
          setLeagueChangeType(null);
          onExit?.();
        }}
        newLeague={newLeague}
        type={leagueChangeType}
      />
    );
  }

  return null;
}

// ─── VS Auto-Start Countdown ────────────────────────────────────────────────

function VSAutoStart({ onStart }: { onStart: () => void }) {
  const [count, setCount] = useState(2);

  useEffect(() => {
    if (count <= 0) {
      onStart();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onStart]);

  return (
    <div className="text-center space-y-1">
      <span className="font-serif text-4xl text-[#C5A059] font-bold">{count}</span>
      <p className="text-xs text-white/50 tracking-wider uppercase font-medium">Battle starts in...</p>
    </div>
  );
}
