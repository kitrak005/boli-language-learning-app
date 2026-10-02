import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowRight,
  Brain,
  ChevronRight,
  Sun,
  Volume2,
  Globe2,
  Zap,
  Sparkles,
  RefreshCw,
  Info,
  Swords,
  Trophy,
} from 'lucide-react';
import { LanguageTradition, UserProfile, WordOfTheDay } from '../types';
import { WORDS_OF_THE_DAY } from '../data/mockData';
import { sound } from '../utils/audio';
import { IndianTeacher } from './IndianTeacher';
import { DailyGoalTracker } from './DailyGoalTracker';
import { LeagueBadge } from './LeagueBadge.tsx';
import { LeagueProgressBar } from './LeagueProgressBar.tsx';
import { getLeague } from '../lib/leagues.ts';
import { getPlayer, ensurePlayer, type PlayerRecord } from '../lib/repository.ts';

interface HomeViewProps {
  currentTradition: LanguageTradition;
  profile: UserProfile;
  onContinueLesson: () => void;
  onStartReview: () => void;
  onOpenTraditions: () => void;
  onUpdateDailyGoal?: (newGoal: number) => void;
  onCelebrateGoal?: () => void;
  onStartMatch?: () => void;
  onOpenLeaderboard?: () => void;
  userId?: string | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentTradition,
  profile,
  onContinueLesson,
  onStartReview,
  onOpenTraditions,
  onUpdateDailyGoal,
  onCelebrateGoal,
  onStartMatch,
  onOpenLeaderboard,
  userId,
}) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [playerRecord, setPlayerRecord] = useState<PlayerRecord | null>(null);

  useEffect(() => {
    const id = userId || 'local_user';
    const player = ensurePlayer(id, profile.name || 'Scholar', profile.avatarUrl);
    setPlayerRecord(player);
  }, [userId, profile.name, profile.avatarUrl]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showWordDetails, setShowWordDetails] = useState(false);

  // Filter words relevant to tradition or cycle
  const currentWord: WordOfTheDay =
    WORDS_OF_THE_DAY.find((w) => w.languageId === currentTradition.id) ||
    WORDS_OF_THE_DAY[wordIndex % WORDS_OF_THE_DAY.length];

  const handlePronounce = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.unlockAudio();
    setIsPlayingAudio(true);
    sound.speak(
      currentWord.script,
      currentTradition.id,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false),
      currentWord.transliteration
    );
  };

  const getGreeting = () => {
    switch (currentTradition.id) {
      case 'pali':
        return 'Namo Buddhāya 🙏';
      case 'tamil':
        return 'Vanakkam 🙏';
      default:
        return 'Namaste 👋';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Status Bar */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="font-serif text-3xl sm:text-5xl font-light text-white tracking-tight">
            {getGreeting()}
          </h1>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-tag-tradition"
              onClick={onOpenTraditions}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-semibold hover:bg-[#C5A059]/20 transition-colors cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="uppercase tracking-widest text-[10px]">
                {currentTradition.name.toUpperCase()}
              </span>
            </button>

            <div
              id="badge-xp-daily"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs font-medium"
            >
              <Zap className="w-3.5 h-3.5 text-[#C5A059] fill-[#C5A059]" />
              <span>
                {profile.dailyXp}/{profile.maxDailyXp} XP
              </span>
            </div>

            <div
              id="badge-streak-days"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs font-medium"
            >
              <span>🔥 {profile.streakDays} Days</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2D Animated Indian Teacher Companion Section */}
      <section className="relative">
        <IndianTeacher
          size="md"
          traditionId={currentTradition.id}
          showBubble={true}
          interactive={true}
          className="w-full"
        />
      </section>

      {/* Daily Goal Tracking Section with Circular Progress */}
      <DailyGoalTracker
        dailyXp={profile.dailyXp}
        maxDailyXp={profile.maxDailyXp}
        streakDays={profile.streakDays}
        onUpdateGoal={onUpdateDailyGoal}
        onStartStudy={onContinueLesson}
        onCelebrate={onCelebrateGoal}
      />

      {/* Prominent Ranked Arena League & Matchmaking Section */}
      {playerRecord && (() => {
        const league = getLeague(playerRecord.rating, playerRecord.leagueId);
        return (
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#18150F] via-[#121212] to-[#0A0A0A] border border-[#C5A059]/40 p-5 sm:p-7 shadow-2xl group">
            {/* Ambient gold glow */}
            <div
              className="absolute -right-8 -top-8 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ backgroundColor: league.glow }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
              {/* Left: Badge + League details */}
              <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto">
                <LeagueBadge league={league} size="lg" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded border border-[#C5A059]/30">
                      RANKED ARENA
                    </span>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
                      League {league.roman}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">{league.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    <span className="font-serif text-lg font-bold text-white">{playerRecord.rating}</span>
                    <span className="text-[10px] uppercase font-mono text-[#C5A059] font-bold">ELO</span>
                    <span className="text-white/30">•</span>
                    <span>{playerRecord.wins}W - {playerRecord.losses}L</span>
                    {playerRecord.winStreak > 1 && (
                      <>
                        <span className="text-white/30">•</span>
                        <span className="text-amber-400 font-semibold">🔥 {playerRecord.winStreak} Streak</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Progress Bar + Action Buttons */}
              <div className="flex flex-col sm:items-end gap-3.5 w-full md:w-auto">
                <LeagueProgressBar
                  rating={playerRecord.rating}
                  league={league}
                  className="w-full sm:w-64"
                />
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {onOpenLeaderboard && (
                    <button
                      type="button"
                      id="btn-home-leaderboard"
                      onClick={() => {
                        sound.playTileClick();
                        onOpenLeaderboard();
                      }}
                      className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Ranks</span>
                    </button>
                  )}
                  {onStartMatch && (
                    <button
                      type="button"
                      id="btn-home-find-match"
                      onClick={() => {
                        sound.playTileClick();
                        onStartMatch();
                      }}
                      className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Swords className="w-4 h-4 stroke-[2.2]" />
                      <span>Find Match</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Primary Action: Current Lesson Card */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#161616] to-[#0E0E0E] border border-[#C5A059]/30 shadow-2xl p-6 sm:p-8 group">
          {/* Ambient background glow */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row gap-6 md:items-center justify-between z-10">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2 text-[#C5A059]">
                <BookOpen className="w-4 h-4 text-[#C5A059]" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059]">
                  CURRENT LESSON
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                Greetings & Introductions
              </h2>

              {/* Progress Bar with stripes */}
              <div className="space-y-2 max-w-sm">
                <div className="flex justify-between text-xs font-medium text-white/60">
                  <span className="uppercase tracking-wider text-[10px]">Progress</span>
                  <span className="text-[#C5A059] font-bold">{currentTradition.progressPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C5A059] rounded-full progress-bar-stripes-dark relative transition-all duration-700"
                    style={{ width: `${currentTradition.progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <button
              id="btn-continue-current-lesson"
              onClick={() => {
                sound.playTileClick();
                onContinueLesson();
              }}
              className="btn-gold w-full md:w-auto min-h-[48px] px-8 py-3.5 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer group shadow-lg shadow-[#C5A059]/20"
            >
              <span>Continue Lesson</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid: Daily Review & Word of the Day */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Daily Review Card */}
        <div
          id="card-daily-review"
          onClick={() => {
            sound.playTileClick();
            onStartReview();
          }}
          className="rounded-2xl bg-[#121212] border border-white/10 hover:border-[#C5A059]/40 p-6 flex flex-col justify-between group transition-all cursor-pointer relative overflow-hidden shadow-lg"
        >
          {/* Subtle watermark */}
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#C5A059]">
            <Brain className="w-32 h-32" />
          </div>

          <div className="relative space-y-4 z-10">
            <div className="w-12 h-12 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
              <Brain className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-white">Daily Review</h3>
              <p className="text-sm text-white/60 mt-1.5 leading-relaxed font-light">
                Strengthen your classical memory with 10 interactive flashcards.
              </p>
            </div>
          </div>

          <div className="relative mt-6 flex items-center text-[#C5A059] text-[11px] font-bold uppercase tracking-[0.15em] group-hover:translate-x-1 transition-transform z-10">
            <span>Start Review</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Word of the Day Card */}
        <div
          id="card-word-of-the-day"
          className="rounded-2xl bg-gradient-to-br from-[#161410] to-[#0F0E0C] border border-[#C5A059]/35 p-6 flex flex-col justify-between relative overflow-hidden group shadow-lg"
        >
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059] flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-[#C5A059]" />
                Word of the Day
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  id="btn-pronounce-wotd"
                  onClick={handlePronounce}
                  title="Pronounce word with voice"
                  className={`w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C5A059] hover:bg-white/10 hover:border-[#C5A059]/40 transition-all cursor-pointer ${
                    isPlayingAudio ? 'ring-2 ring-[#C5A059] scale-110' : ''
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>

                <button
                  id="btn-wotd-details"
                  onClick={() => setShowWordDetails(!showWordDetails)}
                  title="Etymology & verse example"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C5A059] hover:bg-white/10 hover:border-[#C5A059]/40 transition-all cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Large Script Character with Tap-to-Pronounce */}
            <div
              onClick={handlePronounce}
              className="text-center py-2 sm:py-3 cursor-pointer group/word"
              title="Click to hear pronunciation"
            >
              <h3 className="text-5xl sm:text-6xl text-[#C5A059] mb-1.5 font-serif font-normal tracking-wide group-hover/word:scale-105 transition-transform">
                {currentWord.script}
              </h3>
              <p className="text-sm uppercase tracking-[0.2em] text-[#C5A059]/80 font-medium font-mono">
                {currentWord.transliteration}
              </p>
              <span className="text-[10px] text-white/40 block mt-1 flex items-center justify-center gap-1">
                <Volume2 className="w-2.5 h-2.5 text-[#C5A059]" /> Tap to pronounce
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-2 text-center border-t border-white/10 pt-3.5">
            <p className="text-sm sm:text-base text-white/90 font-medium">
              {currentWord.englishMeaning}
            </p>

            {showWordDetails && (
              <div className="mt-3 text-left p-3.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white/70 space-y-1.5 animate-in fade-in duration-200">
                <p className="font-semibold text-[#C5A059]">Etymology: {currentWord.etymology}</p>
                {currentWord.verseExample && (
                  <div className="pt-1.5 border-t border-white/10">
                    <p className="font-serif text-white/90 text-sm">{currentWord.verseExample.script}</p>
                    <p className="italic text-white/50 text-[11px]">
                      "{currentWord.verseExample.translation}" — {currentWord.verseExample.source}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
