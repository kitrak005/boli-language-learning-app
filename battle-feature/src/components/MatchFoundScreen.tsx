import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  X,
  Sparkles,
  Landmark,
  Award,
  MapPin,
  Lightbulb,
  BookOpen,
  Zap,
  BadgeCheck,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export interface FaceOffPlayer {
  name: string;
  title?: string;
  level?: number;
  streakDays?: number;
  winRatePct?: number;
  rank?: number;
  location?: string;
  xpGoal?: number;
  track?: string;
  avatarUrl?: string;
}

export interface MatchFoundScreenProps {
  currentPlayer: FaceOffPlayer;
  opponent: FaceOffPlayer;
  languageDisplay: string;
  languageLabel: string;
  totalRounds: number;
  sutraFocus: string;
  focusLevel: string;
  guruQuoteSanskrit?: string;
  guruQuoteTranslation?: string;
  countdownSeconds?: number;
  onCountdownComplete: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export function MatchFoundScreen({
  currentPlayer,
  opponent,
  languageDisplay,
  languageLabel,
  totalRounds,
  sutraFocus,
  focusLevel,
  guruQuoteSanskrit = 'प्रवचनं वादे न तु विजिगीषा',
  guruQuoteTranslation = 'Argue to discover truth, not merely to vanquish the opponent.',
  countdownSeconds = 3,
  onCountdownComplete,
  onBack,
  onClose,
}: MatchFoundScreenProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setEntering(true);
      const t = setTimeout(onCountdownComplete, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, onCountdownComplete]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(timeLeft, 0) / countdownSeconds;
  const dashOffset = circumference * (1 - progress);

  const focusTruncated = useMemo(
    () => (sutraFocus.length > 12 ? `${sutraFocus.slice(0, 10)}...` : sutraFocus),
    [sutraFocus]
  );

  return (
    <div className="relative w-full max-w-[420px] mx-auto bg-[#121212] text-white min-h-screen flex flex-col justify-between p-5 pb-6 overflow-hidden selection:bg-[#C5A059]/30">
      {/* Ambient watermark */}
      <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.03] text-8xl font-serif text-[#C5A059] leading-none text-center">
        {languageDisplay}
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between pt-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-[#161616] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <span className="w-10 h-10" />
        )}

        <div className="flex items-center gap-1.5 font-serif text-lg tracking-wide text-[#C5A059]">
          <span className="font-normal">{languageDisplay}</span>
          <span className="text-xs text-[#C5A059]/60">•</span>
          <span className="font-light tracking-normal text-white/80">Sādhana</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-1 rounded-full border border-[#C5A059]/20">
            <Volume2 className="w-3.5 h-3.5" />
            <span>SABHĀ ON</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-[#161616] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-4 space-y-4">
        <div className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#C5A059]/30 px-3.5 py-1 rounded-full shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-[#C5A059] uppercase">Match Found</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} stroke="#2a2a2a" strokeWidth="4" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#C5A059"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="transparent"
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }}
              />
            </svg>
            <span className="absolute font-serif text-4xl font-normal text-white tracking-tighter">
              {Math.max(timeLeft, 0)}
            </span>
          </div>
          <h2 className="text-lg font-serif font-normal text-white mt-2 text-center">
            {entering ? (
              'Duel begins now'
            ) : (
              <>
                Duel commences in <span className="text-[#C5A059]">{timeLeft}...</span>
              </>
            )}
          </h2>
          <p className="text-xs text-white/50 text-center max-w-[270px] mt-0.5 leading-relaxed font-light">
            Opponent matched! Concurrence established in {languageLabel} Sabhā.
          </p>
        </div>

        {/* Face-off */}
        <div className="relative w-full space-y-3 pt-1">
          {/* You */}
          <div className="relative bg-[#161616] border border-[#C5A059]/40 rounded-2xl p-4 shadow-lg">
            <span className="absolute -top-2.5 right-4 bg-[#C5A059] text-[#121212] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow">
              Sādhaka • You
            </span>
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-[#C5A059] p-0.5 bg-white/5 flex items-center justify-center">
                  {currentPlayer.avatarUrl ? (
                    <img src={currentPlayer.avatarUrl} alt={currentPlayer.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Landmark className="w-7 h-7 text-[#C5A059]" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 bg-[#121212] border border-[#C5A059]/40 text-[10px] text-[#C5A059] px-1 rounded-full font-serif">
                  ॐ
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif font-normal text-base text-white tracking-wide truncate">{currentPlayer.name}</h3>
                  {currentPlayer.streakDays != null && (
                    <span className="shrink-0 flex items-center text-[11px] font-semibold text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded border border-[#C5A059]/20">
                      🔥 {currentPlayer.streakDays} Day{currentPlayer.streakDays === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 font-light">
                  {currentPlayer.level != null && <>Level {currentPlayer.level} • </>}
                  <span className="text-white/70">{currentPlayer.title}</span>
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-white/50">
                  {currentPlayer.xpGoal != null && (
                    <span className="flex items-center gap-1 text-[#C5A059]/90 font-medium">
                      <Zap className="w-3 h-3" />
                      {currentPlayer.xpGoal} XP Goal
                    </span>
                  )}
                  {currentPlayer.track && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {currentPlayer.track}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* VS badge */}
          <div className="absolute left-1/2 top-[47.5%] -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-14 h-14 rounded-full bg-[#161616] border-2 border-[#C5A059] shadow-xl flex flex-col items-center justify-center text-center">
              <span className="font-serif font-bold text-sm tracking-wider text-[#C5A059] leading-none">VS</span>
              <span className="font-serif text-[9px] text-white/50 tracking-tight leading-none mt-0.5">द्वन्द्व</span>
            </div>
          </div>

          {/* Opponent */}
          <div className="relative bg-[#161616] border border-white/10 rounded-2xl p-4 shadow-lg">
            <span className="absolute -top-2.5 right-4 bg-white/10 text-white/80 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              Pratidvandvī • Opponent
            </span>
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-white/20 p-0.5 bg-white/5 flex items-center justify-center">
                  {opponent.avatarUrl ? (
                    <img src={opponent.avatarUrl} alt={opponent.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="font-serif font-bold text-white/60 text-lg">
                      {opponent.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 bg-[#121212] border border-white/20 text-white/50 rounded-full p-0.5 flex items-center justify-center">
                  <BadgeCheck className="w-2.5 h-2.5" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif font-normal text-base text-white tracking-wide truncate">{opponent.name}</h3>
                  {opponent.winRatePct != null && (
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {opponent.winRatePct}% Win
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 font-light">
                  {opponent.level != null && <>Level {opponent.level} • </>}
                  <span className="text-white/70">{opponent.title}</span>
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-white/50">
                  {opponent.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {opponent.location}
                    </span>
                  )}
                  {opponent.rank != null && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[#C5A059]/90 font-medium">
                        <Award className="w-3 h-3" />
                        Rank #{opponent.rank} Sabhā
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="w-full bg-[#161616] border border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
              <Landmark className="w-4 h-4 text-[#C5A059]" />
              <span>SABHĀ CONDITIONS • शास्त्रार्थ</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              Live Arena
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Language</span>
              <span className="font-serif text-xs font-normal text-[#C5A059] block mt-0.5">{languageDisplay}</span>
              <span className="text-[9px] text-white/50">{languageLabel}</span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Format</span>
              <span className="text-xs font-bold text-white block mt-0.5">1v1 Duel</span>
              <span className="text-[9px] text-white/50">{totalRounds} Rounds</span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Sūtra Focus</span>
              <span className="text-xs font-bold text-white truncate block mt-0.5">{focusTruncated}</span>
              <span className="text-[9px] text-[#C5A059]">{focusLevel}</span>
            </div>
          </div>
        </div>

        {/* Guru quote */}
        <div className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/5 border border-[#C5A059]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]/90">Guru Vidyadhar's Observation</div>
            <p className="text-xs text-white/70 italic font-serif mt-0.5 leading-snug">
              &ldquo;{guruQuoteSanskrit}&rdquo; —{' '}
              <span className="font-sans not-italic text-white/50 text-[11px]">{guruQuoteTranslation}</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pt-2 space-y-2">
        <div className="w-full h-13 py-3.5 bg-[#C5A059] rounded-xl font-serif font-bold text-[#121212] flex items-center justify-center gap-2 shadow-lg text-base">
          <Loader2 className="w-4.5 h-4.5 animate-spin" />
          <span>{entering ? 'Entering Sabhā...' : 'Preparing arena...'}</span>
          <ArrowRight className="w-4.5 h-4.5" />
        </div>
        <div className="flex items-center justify-between px-2 text-[11px] text-white/50">
          <span className="flex items-center gap-1 font-light">Both scholars gain XP</span>
          <span className="italic text-white/50 font-light">May epistemic truth prevail</span>
        </div>
      </footer>
    </div>
  );
}
