import React, { useState, useEffect, useMemo } from 'react';
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
  Mic,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { LanguageTradition, UserProfile, WordOfTheDay } from '../types';
import { WORDS_OF_THE_DAY } from '../data/mockData';
import { sound } from '../utils/audio';
import { IndianTeacher } from './IndianTeacher';
import { DailyGoalTracker } from './DailyGoalTracker';
import { LeagueBadge } from './LeagueBadge.tsx';
import { LeagueProgressBar } from './LeagueProgressBar.tsx';
import { getLeague } from '../lib/leagues.ts';
import { ensurePlayer, getTopPlayers, type PlayerRecord } from '../lib/repository.ts';

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
  onStartVoice?: () => void;
  onAskGuru?: () => void;
  userId?: string | null;
}

const GURU_WISDOM_QUOTES = [
  {
    sanskrit: 'अभ्यासात् धार्यते विद्या।',
    transliteration: 'Abhyāsāt dhāryatē vidyā.',
    english: 'Through regular practice, sacred knowledge is retained.',
  },
  {
    sanskrit: 'विद्या ददाति विनयम्।',
    transliteration: 'Vidyā dadāti vinayam.',
    english: 'True knowledge bestows humility and poise.',
  },
  {
    sanskrit: 'सत्यमेव जयते नानृतम्।',
    transliteration: 'Satyameva jayate nānṛtam.',
    english: 'Truth alone triumphs, not untruth.',
  },
  {
    sanskrit: 'वसुधैव कुटुम्बकम्।',
    transliteration: 'Vasudhaiva kuṭumbakam.',
    english: 'The entire cosmos is one single family.',
  },
  {
    sanskrit: 'उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत।',
    transliteration: 'Uttiṣṭhata jāgrata prāpya varānnibodhata.',
    english: 'Arise, awake, and learn from the wise masters.',
  },
];

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
  onStartVoice,
  onAskGuru,
  userId,
}) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [playerRecord, setPlayerRecord] = useState<PlayerRecord | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showWordDetails, setShowWordDetails] = useState(false);
  const [guruQuoteIdx, setGuruQuoteIdx] = useState(0);
  const [isSpeakingGuru, setIsSpeakingGuru] = useState(false);

  useEffect(() => {
    const id = userId || 'local_user';
    const player = ensurePlayer(id, profile.name || 'Scholar', profile.avatarUrl);
    setPlayerRecord(player);
  }, [userId, profile.name, profile.avatarUrl]);

  const currentGuruQuote = GURU_WISDOM_QUOTES[guruQuoteIdx % GURU_WISDOM_QUOTES.length];

  const handlePronounceGuruWisdom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.unlockAudio();
    setIsSpeakingGuru(true);
    sound.speak(
      currentGuruQuote.sanskrit,
      currentTradition.id,
      () => setIsSpeakingGuru(true),
      () => setIsSpeakingGuru(false),
      currentGuruQuote.transliteration
    );
  };

  const handleNextGuruWisdom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.playTileClick();
    setGuruQuoteIdx((prev) => (prev + 1) % GURU_WISDOM_QUOTES.length);
  };

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
        return 'Namo Buddhāya';
      case 'tamil':
        return 'Vanakkam';
      default:
        return 'Namaste';
    }
  };

  // Active League calculation
  const league = playerRecord
    ? getLeague(playerRecord.rating, playerRecord.leagueId)
    : getLeague(profile.totalXp || 800);

  // Standings list calculation for preview leaderboard
  const { standings, userRank } = useMemo(() => {
    const list = getTopPlayers(10);
    const effectiveUserId = userId || 'local_user';

    if (list.length >= 3) {
      const userIdx = list.findIndex((p) => p.id === effectiveUserId);
      const computedRank = userIdx >= 0 ? userIdx + 1 : 4;
      const topRows = list.slice(0, 4).map((p, idx) => ({
        rank: idx + 1,
        name: p.id === effectiveUserId ? `YOU (${profile.name || p.name})` : p.name,
        xp: p.rating,
        isCurrent: p.id === effectiveUserId,
        status: idx === 0 ? '👑' : idx < 3 ? '🟢' : '⭐',
      }));

      const isUserInTop4 = userIdx >= 0 && userIdx < 4;
      if (!isUserInTop4 && playerRecord) {
        topRows.push({
          rank: computedRank,
          name: `YOU (${profile.name || playerRecord.name})`,
          xp: playerRecord.rating,
          isCurrent: true,
          status: '⭐',
        });
      }
      return { standings: topRows, userRank: computedRank };
    }

    // Default high-polish standings fallback matching design requirements
    return {
      standings: [
        { rank: 1, name: 'Aarav S.', xp: 2450, isCurrent: false, status: '🟢' },
        { rank: 2, name: 'Ananya M.', xp: 1980, isCurrent: false, status: '🟢' },
        { rank: 3, name: 'Dev K.', xp: 1220, isCurrent: false, status: '🟢' },
        { rank: 4, name: `YOU (${profile.name || 'Kartik'})`, xp: playerRecord?.rating || 800, isCurrent: true, status: '⭐' },
        { rank: 5, name: 'Priya R.', xp: 710, isCurrent: false, status: '🔴' },
      ],
      userRank: 4,
    };
  }, [userId, profile.name, playerRecord]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Status Bar */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="font-serif text-3xl sm:text-5xl font-light text-white tracking-tight">
            {getGreeting()}{profile.name ? `, ${profile.name}` : ''} 🙏
          </h1>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-tag-tradition"
              onClick={onOpenTraditions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-semibold hover:bg-[#C5A059]/20 transition-colors cursor-pointer min-h-[36px]"
            >
              <Globe2 className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="uppercase tracking-widest text-[10px]">
                {currentTradition.name.toUpperCase()}
              </span>
            </button>

            <div
              id="badge-xp-daily"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs font-medium min-h-[36px]"
            >
              <Zap className="w-3.5 h-3.5 text-[#C5A059] fill-[#C5A059]" />
              <span>
                {profile.dailyXp}/{profile.maxDailyXp} XP
              </span>
            </div>

            <div
              id="badge-streak-days"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs font-medium min-h-[36px]"
            >
              <span>🔥 {profile.streakDays} Days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard Content: 2-Column Responsive Grid on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* ============================================================== */}
        {/* ITEM 1: HERO GURU CARD (Mobile Order 1, Desktop Row 1 Col 1-2) */}
        {/* ============================================================== */}
        <section
          id="hero-guru-card"
          className="order-1 lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#121110] border border-amber-500/30 p-4 sm:p-6 shadow-2xl transition-all"
        >
          {/* Ambient warm background glow */}
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 relative z-10">
            {/* Mascot Character Avatar */}
            <div className="shrink-0 flex flex-col items-center">
              <IndianTeacher
                size="md"
                traditionId={currentTradition.id}
                showBubble={false}
                interactive={true}
              />
            </div>

            {/* Guidance Content & Wisdom Quote */}
            <div className="flex-1 w-full text-center sm:text-left space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C5A059]">
                  TEACHER'S GUIDANCE
                </span>

                <div className="flex items-center gap-1">
                  <button
                    id="btn-guru-audio"
                    onClick={handlePronounceGuruWisdom}
                    title="Hear Guru Pronounce"
                    className={`p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[#C5A059] border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                      isSpeakingGuru ? 'ring-2 ring-amber-400 scale-105' : ''
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="btn-guru-next"
                    onClick={handleNextGuruWisdom}
                    title="Next Wisdom Quote"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <h2 className="font-serif text-2xl sm:text-3xl text-[#C5A059] font-normal leading-snug">
                  {currentGuruQuote.sanskrit}
                </h2>
                <p className="text-xs sm:text-sm font-mono text-white/50 tracking-wide mt-0.5">
                  {currentGuruQuote.transliteration}
                </p>
                <p className="text-xs sm:text-sm text-white/90 font-light italic mt-1.5 leading-relaxed">
                  "{currentGuruQuote.english}"
                </p>
              </div>

              {/* Primary Action Area CTAs */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4 pt-1">
                <button
                  id="btn-hero-continue-lesson"
                  onClick={() => {
                    sound.playTileClick();
                    onContinueLesson();
                  }}
                  className="min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                >
                  <span>CONTINUE LESSON</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="btn-hero-ask-guru"
                  onClick={() => {
                    sound.playTileClick();
                    if (onAskGuru) onAskGuru();
                    else onContinueLesson();
                  }}
                  className="min-h-[44px] border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>ASK GURU 💬</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ITEM 2: SĀDHANĀ RHYTHM CARD (Mobile Order 2, Desktop Row 1 Col 3) */}
        {/* ============================================================== */}
        <div className="order-2 lg:order-none lg:col-start-3 lg:row-start-1 lg:col-span-1">
          <DailyGoalTracker
            dailyXp={profile.dailyXp}
            maxDailyXp={profile.maxDailyXp}
            streakDays={profile.streakDays}
            onUpdateGoal={onUpdateDailyGoal}
            onStartStudy={onContinueLesson}
            onCelebrate={onCelebrateGoal}
            className="w-full"
          />
        </div>

        {/* ============================================================== */}
        {/* ITEM 3: FEATURE CARDS & FEED (Mobile Order 3, Desktop Row 2 Col 1-2) */}
        {/* ============================================================== */}
        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2 lg:col-span-2 space-y-6">
          {/* Feature Launcher Cards (2-Grid on Desktop, Stacked on Mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* VĀK VOICE MODE CARD */}
            <div
              id="card-vak-voice"
              className="bg-[#121110] p-4 sm:p-5 rounded-2xl border border-amber-500/25 hover:border-amber-500/50 transition-all flex flex-col justify-between group relative overflow-hidden shadow-lg"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <Mic className="w-4 h-4 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059]">
                      VĀK VOICE MODE
                    </span>
                  </div>

                  {/* Animated Waveform Indicator */}
                  <div className="flex items-center gap-0.5 h-4">
                    <span className="w-0.5 h-2 bg-amber-400/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-0.5 h-4 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-0.5 h-3 bg-amber-400/80 rounded-full animate-bounce" />
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed font-light">
                  Real-time AI voice conversation in {currentTradition.name}. Practice spontaneous dialogue with instant feedback.
                </p>
              </div>

              <button
                id="btn-trigger-vak-voice"
                onClick={() => {
                  sound.playTileClick();
                  if (onStartVoice) onStartVoice();
                }}
                className="min-h-[44px] mt-4 w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>START VĀK VOICE 🎙️</span>
              </button>
            </div>

            {/* ASK GURU / PRACTICE HUB CARD */}
            <div
              id="card-ask-guru-hub"
              className="bg-[#121110] p-4 sm:p-5 rounded-2xl border border-amber-500/25 hover:border-amber-500/50 transition-all flex flex-col justify-between group relative overflow-hidden shadow-lg"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059]">
                      ASK GURU AI / PRACTICE
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed font-light">
                  Direct access for quick AI grammar questions, root etymologies, and classical Sanskrit practice drills.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  id="btn-trigger-ask-guru"
                  onClick={() => {
                    sound.playTileClick();
                    if (onAskGuru) onAskGuru();
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>OPEN CHAT 💬</span>
                </button>

                <button
                  id="btn-trigger-practice-hub"
                  onClick={() => {
                    sound.playTileClick();
                    onStartReview();
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>DRILLS ⚡</span>
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action: Current Lesson Card */}
          <section>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#161616] to-[#0E0E0E] border border-amber-500/30 shadow-2xl p-5 sm:p-7 group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

              <div className="relative flex flex-col md:flex-row gap-5 md:items-center justify-between z-10">
                <div className="space-y-3 flex-1">
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
                  <div className="space-y-1.5 max-w-sm">
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
                  className="btn-gold w-full md:w-auto min-h-[48px] px-8 py-3 rounded-xl text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer group shadow-lg shadow-amber-500/20"
                >
                  <span>Continue Lesson</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </section>

          {/* Bento Grid: Daily Review & Word of the Day */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Daily Review Card */}
            <div
              id="card-daily-review"
              onClick={() => {
                sound.playTileClick();
                onStartReview();
              }}
              className="rounded-2xl bg-[#121212] border border-white/10 hover:border-amber-500/40 p-5 sm:p-6 flex flex-col justify-between group transition-all cursor-pointer relative overflow-hidden shadow-lg min-h-[200px]"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#C5A059]">
                <Brain className="w-32 h-32" />
              </div>

              <div className="relative space-y-3 z-10">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
                  <Brain className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-serif text-xl font-normal text-white">Daily Review</h3>
                  <p className="text-xs sm:text-sm text-white/60 mt-1 leading-relaxed font-light">
                    Strengthen your classical memory with 10 interactive flashcards.
                  </p>
                </div>
              </div>

              <div className="relative mt-4 flex items-center text-[#C5A059] text-[11px] font-bold uppercase tracking-[0.15em] group-hover:translate-x-1 transition-transform z-10">
                <span>Start Review</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Word of the Day Card */}
            <div
              id="card-word-of-the-day"
              className="rounded-2xl bg-gradient-to-br from-[#161410] to-[#0F0E0C] border border-amber-500/35 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group shadow-lg min-h-[200px]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

              <div className="relative z-10 space-y-3">
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
                      className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#C5A059] hover:bg-white/10 hover:border-amber-500/40 transition-all cursor-pointer min-h-[36px] min-w-[36px] ${
                        isPlayingAudio ? 'ring-2 ring-amber-400 scale-105' : ''
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id="btn-wotd-details"
                      onClick={() => setShowWordDetails(!showWordDetails)}
                      title="Etymology & verse example"
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#C5A059] hover:bg-white/10 hover:border-amber-500/40 transition-all cursor-pointer min-h-[36px] min-w-[36px]"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Large Script Character with Tap-to-Pronounce */}
                <div
                  onClick={handlePronounce}
                  className="text-center py-1 sm:py-2 cursor-pointer group/word"
                  title="Click to hear pronunciation"
                >
                  <h3 className="text-4xl sm:text-5xl text-[#C5A059] mb-1 font-serif font-normal tracking-wide group-hover/word:scale-105 transition-transform">
                    {currentWord.script}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#C5A059]/80 font-medium font-mono">
                    {currentWord.transliteration}
                  </p>
                  <span className="text-[10px] text-white/40 block mt-1 flex items-center justify-center gap-1">
                    <Volume2 className="w-2.5 h-2.5 text-[#C5A059]" /> Tap to pronounce
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-2 text-center border-t border-white/10 pt-3">
                <p className="text-xs sm:text-sm text-white/90 font-medium">
                  {currentWord.englishMeaning}
                </p>

                {showWordDetails && (
                  <div className="mt-3 text-left p-3 rounded-lg bg-black/60 border border-white/10 text-xs text-white/70 space-y-1.5 animate-in fade-in duration-200">
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

        {/* ============================================================== */}
        {/* ITEM 4: RANK & LEADERBOARD (Mobile Order 4, Desktop Row 2 Col 3) */}
        {/* ============================================================== */}
        <div className="order-4 lg:order-none lg:col-start-3 lg:row-start-2 lg:col-span-1 space-y-4">
          <section
            id="sanctuary-leaderboard-preview"
            className="rounded-2xl bg-[#121110] border border-amber-500/20 p-4 sm:p-5 shadow-xl space-y-4 relative overflow-hidden"
          >
            {/* Ambient gold glow */}
            <div
              className="absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-25"
              style={{ backgroundColor: league.glow }}
            />

            {/* Header: League Badge + User Rank */}
            <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <LeagueBadge league={league} size="sm" />
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059] block">
                    SANCTUARY RANK
                  </span>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-white leading-tight">
                    {league.name}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Rank #{userRank}
                </span>
              </div>
            </div>

            {/* League Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>Rating: <strong className="text-white">{playerRecord?.rating ?? 800}</strong></span>
                <span>{playerRecord?.wins ?? 0}W - {playerRecord?.losses ?? 0}L</span>
              </div>
              <LeagueProgressBar
                rating={playerRecord?.rating ?? 800}
                league={league}
                className="w-full"
              />
            </div>

            {/* Mini Standings List */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-white/40 px-1">
                <span>Learner</span>
                <span>XP</span>
              </div>

              {standings.map((item) => (
                <div
                  key={`${item.rank}-${item.name}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    item.isCurrent
                      ? 'bg-amber-500/10 border border-amber-500/40 text-amber-200 font-semibold shadow-xs'
                      : 'bg-white/[0.02] border border-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 text-xs font-bold text-center ${
                        item.rank === 1 ? 'text-amber-400' : 'text-white/40'
                      }`}
                    >
                      {item.rank}
                    </span>
                    <span className="text-xs truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-white/70">
                      {item.xp.toLocaleString()} XP
                    </span>
                    <span className="text-xs">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons: Find Match & Full Leaderboard */}
            <div className="pt-2 space-y-2 relative z-10">
              {onStartMatch && (
                <button
                  type="button"
                  id="btn-sidebar-find-match"
                  onClick={() => {
                    sound.playTileClick();
                    onStartMatch();
                  }}
                  className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Swords className="w-4 h-4 stroke-[2.2]" />
                  <span>FIND MATCH</span>
                </button>
              )}

              {onOpenLeaderboard && (
                <button
                  type="button"
                  id="btn-sidebar-full-leaderboard"
                  onClick={() => {
                    sound.playTileClick();
                    onOpenLeaderboard();
                  }}
                  className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>FULL LEADERBOARD →</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
