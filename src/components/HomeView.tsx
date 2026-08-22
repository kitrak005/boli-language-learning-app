import React, { useState } from 'react';
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
} from 'lucide-react';
import { LanguageTradition, UserProfile, WordOfTheDay } from '../types';
import { WORDS_OF_THE_DAY } from '../data/mockData';
import { sound } from '../utils/audio';

interface HomeViewProps {
  currentTradition: LanguageTradition;
  profile: UserProfile;
  onContinueLesson: () => void;
  onStartReview: () => void;
  onOpenTraditions: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentTradition,
  profile,
  onContinueLesson,
  onStartReview,
  onOpenTraditions,
}) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showWordDetails, setShowWordDetails] = useState(false);

  // Filter words relevant to tradition or cycle
  const currentWord: WordOfTheDay =
    WORDS_OF_THE_DAY.find((w) => w.languageId === currentTradition.id) ||
    WORDS_OF_THE_DAY[wordIndex % WORDS_OF_THE_DAY.length];

  const handlePronounce = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlayingAudio(true);
    sound.speak(currentWord.script, currentTradition.id);
    setTimeout(() => setIsPlayingAudio(false), 1200);
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
      </section>

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
              className="btn-gold w-full md:w-auto min-h-[48px] px-8 py-3.5 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer group"
            >
              <span>Continue</span>
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
              <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
                Strengthen your memory with 10 personalized flashcards.
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
                  title="Pronounce word"
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

            {/* Large Script Character */}
            <div className="text-center py-2 sm:py-3">
              <h3 className="text-5xl sm:text-6xl text-[#C5A059] mb-1.5 font-serif font-normal tracking-wide">
                {currentWord.script}
              </h3>
              <p className="text-sm uppercase tracking-[0.2em] text-[#C5A059]/80 font-medium">
                {currentWord.transliteration}
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-2 text-center border-t border-white/10 pt-3.5">
            <p className="text-sm sm:text-base text-white/90 font-medium">
              {currentWord.englishMeaning}
            </p>

            {showWordDetails && (
              <div className="mt-3 text-left p-3 rounded-lg bg-black/60 border border-white/10 text-xs text-white/70 space-y-1.5 animate-in fade-in duration-200">
                <p className="font-semibold text-[#C5A059]">Etymology: {currentWord.etymology}</p>
                {currentWord.verseExample && (
                  <div className="pt-1 border-t border-white/10">
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
