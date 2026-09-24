import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { useBattleMatch } from '../hooks/useBattleMatch';
import { useProfile, useAchievementsCatalog, computeAchievementProgress } from '../hooks/useProfile';
import { MatchmakingSearchScreen } from './MatchmakingSearchScreen';
import { MatchFoundScreen } from './MatchFoundScreen';
import { BattleGameScreen } from './BattleGameScreen';
import { MatchResultScreen } from './MatchResultScreen';

// TODO: static for now — wire to real level/mode logic if you want
// difficulty to vary per match.
const DUEL_CONFIG = {
  modeName: 'Shāstrārtha Duel',
  modeSubtitle: '5 Fast Rounds • Rapid Synapses',
  modeTag: 'Speed',
  difficultyName: 'Madhyama • Intermediate',
  difficultySubtitle: 'Sandhi Roots & Subhāṣita Verses',
  difficultyTag: 'Madhyama',
  streakMultiplierLabel: '1.5× Sādhana XP',
  matchTypeLabel: '1v1 Synchronous',
  rankedLabel: 'Ranked Match',
};

type UiPhase = 'idle' | 'searching' | 'countdown' | 'battle' | 'finished';

export function BattleMatchScreen({
  category = 'Sanskrit',
  onExit,
}: {
  category?: string;
  onExit?: () => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [uiPhase, setUiPhase] = useState<UiPhase>('idle');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { status, matchId, findMatch, cancelSearch } = useMatchmaking(userId ?? '');
  const { profile: myProfile } = useProfile(userId);
  const { catalog: achievementsCatalog } = useAchievementsCatalog();

  const battle = useBattleMatch(matchId ?? '', userId ?? '');
  const { profile: opponentProfile, winRatePct: opponentWinRate } = useProfile(battle.opponentId);

  useEffect(() => {
    if (status === 'searching') setUiPhase('searching');
    if (status === 'matched' && uiPhase === 'idle') setUiPhase('searching');
  }, [status, uiPhase]);

  useEffect(() => {
    if (status === 'matched' && battle.match && uiPhase !== 'battle' && uiPhase !== 'finished') {
      setUiPhase('countdown');
    }
  }, [status, battle.match, uiPhase]);

  useEffect(() => {
    if (battle.match?.status === 'finished') setUiPhase('finished');
  }, [battle.match?.status]);

  if (!userId) {
    return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white/50">Loading...</div>;
  }

  if (uiPhase === 'idle') {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-serif text-2xl text-[#C5A059]">{category} Shāstrārtha Arena</h1>
        <button
          type="button"
          onClick={() => findMatch(category)}
          className="px-6 py-3 rounded-xl bg-[#C5A059] text-[#121212] font-serif font-bold"
        >
          Find Opponent
        </button>
      </div>
    );
  }

  if (uiPhase === 'searching') {
    return (
      <MatchmakingSearchScreen
        languageDisplay="संस्कृतम्"
        scanningFocus="Sandhi & Sutras"
        userTitle={myProfile?.role_title ?? 'Sādhaka'}
        userStreakDays={myProfile?.streak_days}
        avatarUrl={myProfile?.avatar_url ?? undefined}
        duelConfig={DUEL_CONFIG}
        onCancel={async () => {
          await cancelSearch();
          setUiPhase('idle');
        }}
        onClose={async () => {
          await cancelSearch();
          setUiPhase('idle');
        }}
      />
    );
  }

  if (uiPhase === 'countdown' && battle.match) {
    return (
      <MatchFoundScreen
        currentPlayer={{
          name: myProfile?.name ?? 'You',
          title: myProfile?.role_title,
          streakDays: myProfile?.streak_days,
          xpGoal: myProfile?.max_daily_xp,
          avatarUrl: myProfile?.avatar_url ?? undefined,
        }}
        opponent={{
          name: opponentProfile?.name ?? 'Opponent',
          title: opponentProfile?.role_title,
          winRatePct: opponentWinRate,
          location: opponentProfile?.location ?? undefined,
          avatarUrl: opponentProfile?.avatar_url ?? undefined,
        }}
        languageDisplay="संस्कृतम्"
        languageLabel="Classical"
        totalRounds={battle.match.total_rounds}
        sutraFocus="Sandhi & Vibhakti"
        focusLevel="Advanced"
        onCountdownComplete={() => setUiPhase('battle')}
      />
    );
  }

  if (uiPhase === 'battle') {
    if (!battle.match || !battle.question) {
      return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white/50">Loading round...</div>;
    }
    return (
      <BattleGameScreen
        currentPlayer={{ name: myProfile?.name ?? 'You', score: battle.myScore, avatarUrl: myProfile?.avatar_url ?? undefined }}
        opponent={{ name: opponentProfile?.name ?? 'Opponent', score: battle.opponentScore, avatarUrl: opponentProfile?.avatar_url ?? undefined }}
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
      />
    );
  }

  if (uiPhase === 'finished' && battle.match) {
    const xpEarned = battle.myXpAwarded ?? 0;
    const achievements = computeAchievementProgress(myProfile, achievementsCatalog, xpEarned);

    return (
      <MatchResultScreen
        you={{
          name: myProfile?.name ?? 'You',
          avatarUrl: myProfile?.avatar_url ?? undefined,
          score: battle.myScore,
          xpEarned,
        }}
        opponent={{
          name: opponentProfile?.name ?? 'Opponent',
          avatarUrl: opponentProfile?.avatar_url ?? undefined,
          score: battle.opponentScore,
          xpEarned: 0, // not shown for opponent, kept for type symmetry
        }}
        totalRounds={battle.match.total_rounds}
        category={battle.match.category}
        achievements={achievements}
        onRematch={() => {
          setUiPhase('searching');
          findMatch(category);
        }}
        onExit={() => (onExit ? onExit() : setUiPhase('idle'))}
      />
    );
  }

  return null;
}
