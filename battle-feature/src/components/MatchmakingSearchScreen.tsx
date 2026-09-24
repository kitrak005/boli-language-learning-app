import { useEffect, useState } from 'react';
import { X, Languages, Flame, Hourglass, Radar, BadgeCheck, SlidersHorizontal, Swords, BookOpen, Lightbulb } from 'lucide-react';

export interface DuelConfig {
  modeName: string;
  modeSubtitle: string;
  modeTag: string;
  difficultyName: string;
  difficultySubtitle: string;
  difficultyTag: string;
  streakMultiplierLabel: string;
  matchTypeLabel: string;
  rankedLabel?: string;
}

export interface MatchmakingSearchScreenProps {
  languageDisplay: string;
  scanningFocus: string;
  userTitle: string;
  userStreakDays?: number;
  avatarUrl?: string;
  duelConfig: DuelConfig;
  guruQuoteSanskrit?: string;
  guruQuoteTranslit?: string;
  guruQuoteTranslation?: string;
  onCancel: () => void;
  onClose?: () => void;
}

export function MatchmakingSearchScreen({
  languageDisplay,
  scanningFocus,
  userTitle,
  userStreakDays,
  avatarUrl,
  duelConfig,
  guruQuoteSanskrit = 'अभ्यासात् धार्यते विद्या',
  guruQuoteTranslit,
  guruQuoteTranslation = 'Through regular practice, sacred knowledge is retained.',
  onCancel,
  onClose,
}: MatchmakingSearchScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="relative w-full max-w-[420px] mx-auto bg-[#121212] text-white min-h-screen flex flex-col justify-between p-5 pb-6 overflow-hidden selection:bg-[#C5A059]/30">
      <style>{`
        @keyframes pulse-ring { 0% { transform: scale(0.96); opacity: 0.6; } 50% { transform: scale(1.03); opacity: 0.25; } 100% { transform: scale(0.96); opacity: 0.6; } }
        @keyframes orbit-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .orbiting-ring-1 { animation: orbit-cw 36s linear infinite; }
        .orbiting-ring-2 { animation: orbit-ccw 48s linear infinite; }
        .pulse-glow { animation: pulse-ring 4s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.025] text-8xl font-serif text-[#C5A059] leading-none">
        {languageDisplay}
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between pt-2">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-[#161616] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <span className="w-10 h-10" />
        )}

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 font-serif text-lg tracking-wide text-[#C5A059]">
            <span className="font-normal">{languageDisplay}</span>
            <span className="text-xs text-[#C5A059]/60">•</span>
            <span className="font-light tracking-normal text-white/80">Sādhana</span>
          </div>
          <span className="text-[10px] tracking-widest text-white/50 uppercase font-semibold">Shastrartha Arena</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-1 rounded-full border border-[#C5A059]/20">
            <Languages className="w-3.5 h-3.5" />
            <span>{languageDisplay}</span>
          </div>
          {userStreakDays != null && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              <Flame className="w-3.5 h-3.5" />
              <span>{userStreakDays}d</span>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-4 space-y-4">
        <div className="inline-flex items-center gap-2 bg-[#161616] border border-[#C5A059]/30 px-3.5 py-1 rounded-full shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
          <span className="text-[11px] font-bold tracking-wider text-[#C5A059] uppercase">Live Sabha Matchmaking</span>
        </div>

        <div className="text-center px-4">
          <h1 className="text-2xl font-serif font-normal text-white tracking-wide">Finding an Opponent...</h1>
          <p className="text-xs text-white/50 mt-1 leading-relaxed font-light">
            Scanning the scholarly halls for a worthy rival in {scanningFocus}
          </p>
        </div>

        {/* Radar */}
        <div className="relative w-64 h-64 my-2 flex items-center justify-center">
          <span className="absolute top-0 text-xs font-serif text-[#C5A059]/60">अ</span>
          <span className="absolute bottom-0 text-xs font-serif text-[#C5A059]/60">ॐ</span>
          <span className="absolute left-0 text-xs font-serif text-[#C5A059]/60">ज्ञ</span>
          <span className="absolute right-0 text-xs font-serif text-[#C5A059]/60">ऋ</span>

          <div className="absolute inset-4 rounded-full border border-[#C5A059]/20 pulse-glow" />
          <div className="absolute inset-8 rounded-full border border-dashed border-[#C5A059]/30 orbiting-ring-1" />
          <div className="absolute inset-14 rounded-full border border-[#C5A059]/40 orbiting-ring-2" />

          <div className="absolute top-8 right-12 z-20 flex items-center gap-1 bg-[#161616]/90 backdrop-blur-sm border border-[#C5A059]/40 px-2 py-0.5 rounded-full text-[10px] text-[#C5A059] font-medium shadow-md">
            <Radar className="w-3 h-3 animate-pulse" />
            <span>Sabhā 108</span>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full border-2 border-[#C5A059] p-1 bg-[#161616] shadow-lg flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="You" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-[#C5A059]">
                  <svg viewBox="0 0 100 100" className="w-20 h-20 text-[#C5A059]/90" fill="currentColor">
                    <circle cx="50" cy="38" r="18" fill="#C5A059" opacity="0.85" />
                    <path d="M22 84 C22 62, 36 56, 50 56 C64 56, 78 62, 78 84 Z" fill="#C5A059" opacity="0.75" />
                    <circle cx="50" cy="32" r="3" fill="#121212" />
                    <path d="M42 42 Q50 48 58 42" stroke="#121212" strokeWidth="2" fill="transparent" />
                  </svg>
                </div>
              )}
              <span className="absolute bottom-1 right-3 bg-[#121212] border border-[#C5A059]/50 text-[#C5A059] rounded-full p-0.5 flex items-center justify-center">
                <BadgeCheck className="w-2.5 h-2.5" />
              </span>
            </div>
            <span className="mt-2 bg-[#161616] border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
              • {userTitle}
            </span>
          </div>
        </div>

        {/* Timer ticker */}
        <div className="w-full max-w-[340px] bg-[#161616] border border-white/10 rounded-full px-4 py-2 flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center gap-2 text-white/70">
            <Hourglass className="w-4 h-4 text-[#C5A059] animate-spin" />
            <span className="text-[11px] font-medium">Searching across global scholars...</span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-300">
            {mm}:{ss}
          </span>
        </div>

        {/* Duel configuration */}
        <div className="w-full bg-[#161616] border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/70">
              <SlidersHorizontal className="w-4 h-4 text-[#C5A059]" />
              <span>Duel Configuration</span>
            </div>
            {duelConfig.rankedLabel && (
              <span className="text-[11px] font-semibold text-amber-300">{duelConfig.rankedLabel}</span>
            )}
          </div>

          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-normal text-white font-serif">{duelConfig.modeName}</div>
                <div className="text-[10px] text-white/50">{duelConfig.modeSubtitle}</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-white/10 text-white/70 px-2 py-0.5 rounded border border-white/10">
              {duelConfig.modeTag}
            </span>
          </div>

          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-normal text-white font-serif">{duelConfig.difficultyName}</div>
                <div className="text-[10px] text-white/50">{duelConfig.difficultySubtitle}</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-white/10 text-[#C5A059] px-2 py-0.5 rounded border border-[#C5A059]/30">
              {duelConfig.difficultyTag}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-center">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold block">Streak Multiplier</span>
              <span className="text-xs font-bold text-amber-300 font-serif">{duelConfig.streakMultiplierLabel}</span>
            </div>
            <div className="border-l border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold block">Match Type</span>
              <span className="text-xs font-bold text-white/80">{duelConfig.matchTypeLabel}</span>
            </div>
          </div>
        </div>

        {/* Guru guidance */}
        <div className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/5 border border-[#C5A059]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]/90">Classical Teacher's Guidance</div>
            <div className="font-serif text-xs font-normal text-white/90 mt-0.5">{guruQuoteSanskrit}</div>
            {guruQuoteTranslit && <div className="text-[10px] text-white/40 mt-0.5">{guruQuoteTranslit}</div>}
            <p className="text-[11px] text-white/50 italic mt-0.5 leading-snug font-light">&ldquo;{guruQuoteTranslation}&rdquo;</p>
          </div>
        </div>
      </main>

      {/* Cancel */}
      <footer className="relative z-10 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full h-12 py-3 bg-[#161616] hover:bg-white/5 active:scale-[0.99] border border-white/10 rounded-xl font-medium text-white/70 hover:text-white flex items-center justify-center gap-2 transition-all shadow-md text-sm"
        >
          <X className="w-4 h-4" />
          <span>Cancel Search</span>
        </button>
      </footer>
    </div>
  );
}
