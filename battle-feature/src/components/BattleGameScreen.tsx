import { useEffect, useMemo, useRef, useState } from 'react';
import { Swords, Brain, Volume2, CheckCircle2, XCircle, Flag } from 'lucide-react';

export interface BattlePlayer {
  name: string;
  score: number;
  avatarUrl?: string;
  level?: number;
  flagEmoji?: string;
}

export interface BattleGameScreenProps {
  currentPlayer: BattlePlayer;
  opponent: BattlePlayer;
  round: number;
  totalRounds: number;
  category: string;
  streak: number;
  duration: number;
  questionKey: string;
  questionTag: string;
  instruction: string;
  questionText: string;
  answers: [string, string, string, string];
  correctIndex: number;
  opponentAnswered: boolean;
  onAnswer: (index: number) => void;
  onTimeUp: () => void;
  onTaunt?: (taunt: string) => void;
  onForfeit?: () => void;
  latencyMs?: number;
  onPlayAudio?: () => void;
}

const TAUNTS = ['👏', '⚡', '🤯'];

export function BattleGameScreen({
  currentPlayer,
  opponent,
  round,
  totalRounds,
  category,
  streak,
  duration,
  questionKey,
  questionTag,
  instruction,
  questionText,
  answers,
  correctIndex,
  opponentAnswered,
  onAnswer,
  onTimeUp,
  onTaunt,
  onForfeit,
  latencyMs = 24,
  onPlayAudio,
}: BattleGameScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(duration);
  const timeUpFiredRef = useRef(false);

  useEffect(() => {
    setSelectedIndex(null);
    setTimeLeft(duration);
    timeUpFiredRef.current = false;
  }, [questionKey, duration]);

  useEffect(() => {
    if (selectedIndex !== null) return;
    if (timeLeft <= 0) {
      if (!timeUpFiredRef.current) {
        timeUpFiredRef.current = true;
        onTimeUp();
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, selectedIndex, onTimeUp]);

  const locked = selectedIndex !== null;

  const handleSelect = (index: number) => {
    if (locked) return;
    setSelectedIndex(index);
    onAnswer(index);
  };

  const timeLabel = `0:${String(Math.max(timeLeft, 0)).padStart(2, '0')}`;

  const momentum = useMemo(() => {
    const total = currentPlayer.score + opponent.score;
    if (total === 0) return { mine: 50, theirs: 50 };
    const mine = Math.round((currentPlayer.score / total) * 100);
    return { mine, theirs: 100 - mine };
  }, [currentPlayer.score, opponent.score]);

  const letters = ['A', 'B', 'C', 'D'] as const;

  return (
    <div className="min-h-screen bg-[#121212] text-white flex justify-center selection:bg-[#C5A059]/30">
      <main className="w-full max-w-[420px] min-h-screen flex flex-col justify-between p-4 pb-6 select-none">
        {/* TOP: Match info & live HUD */}
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] border border-white/10 text-xs font-semibold tracking-wide text-white/60">
              <Swords className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>
                Round {round} of {totalRounds} • {category}
              </span>
            </div>
            {streak > 1 && (
              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161616] border border-[#C5A059]/40 text-xs font-bold text-[#C5A059]">
                <span>🔥</span>
                <span>
                  {streak}x streak (+{100 + (streak - 1) * 10} pts)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {/* You */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                {currentPlayer.avatarUrl ? (
                  <img
                    src={currentPlayer.avatarUrl}
                    alt={currentPlayer.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-[#C5A059]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/5 border-2 border-[#C5A059] flex items-center justify-center font-serif font-bold text-[#C5A059]">
                    {currentPlayer.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {currentPlayer.level != null && (
                  <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-[9px] font-extrabold bg-[#C5A059] text-[#121212] leading-none">
                    LV.{currentPlayer.level}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <span>You</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-2xl font-normal font-serif tracking-tight text-white">
                  {currentPlayer.score} <span className="text-xs font-bold text-white/50">pts</span>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div
              className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-full bg-[#161616] border-2 shadow-lg ${
                timeLeft <= 3 ? 'border-red-500' : 'border-[#C5A059]'
              }`}
            >
              <span
                className={`text-xs font-bold font-serif leading-tight ${
                  timeLeft <= 3 ? 'text-red-400' : 'text-[#C5A059]'
                }`}
              >
                {timeLabel}
              </span>
              <span className="text-[8px] font-bold text-white/50 tracking-wider">sec</span>
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-2.5 flex-row-reverse text-right">
              <div className="relative">
                {opponent.avatarUrl ? (
                  <img
                    src={opponent.avatarUrl}
                    alt={opponent.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/5 border-2 border-white/20 flex items-center justify-center font-serif font-bold text-white/70">
                    {opponent.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {opponent.level != null && (
                  <span className="absolute -bottom-1 -left-1 px-1 py-0.5 rounded text-[9px] font-extrabold bg-white/20 text-white leading-none">
                    LV.{opponent.level}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center justify-end gap-1 text-xs text-white/50 font-medium">
                  {opponent.flagEmoji && <span className="text-xs">{opponent.flagEmoji}</span>}
                  <span>{opponent.name}</span>
                </div>
                <div className="text-2xl font-normal font-serif tracking-tight text-white">
                  <span className="text-xs font-bold text-white/50">pts</span> {opponent.score}
                </div>
              </div>
            </div>
          </div>

          {/* Momentum bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#C5A059] rounded-l-full transition-all duration-500"
              style={{ width: `${momentum.mine}%` }}
            />
            <div
              className="h-full bg-white/20 rounded-r-full transition-all duration-500"
              style={{ width: `${momentum.theirs}%` }}
            />
          </div>
        </header>

        {/* CENTER: Question card */}
        <section className="my-auto py-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-[#C5A059]/30 text-[11px] font-semibold tracking-wider text-[#C5A059] uppercase">
                <Brain className="w-3 h-3" />
                <span>{questionTag}</span>
              </div>
              {onPlayAudio && (
                <button
                  type="button"
                  onClick={onPlayAudio}
                  aria-label="Listen to pronunciation"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-white/60 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">{instruction}</p>
              <h1 className="text-2xl sm:text-3xl font-normal font-serif leading-tight tracking-tight text-white">
                {questionText}
              </h1>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white/50">
                {opponent.flagEmoji && <span>{opponent.flagEmoji}</span>}
                <span className="font-medium">
                  {opponentAnswered ? `${opponent.name} has locked in an answer` : `${opponent.name} is thinking...`}
                </span>
                {!opponentAnswered && (
                  <span className="inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </div>
        </section>

        {/* BOTTOM: Answer grid + taunt dock */}
        <footer className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {answers.map((answer, index) => {
              const isSelected = selectedIndex === index;
              const isCorrectAnswer = index === correctIndex;
              const showResult = locked;

              let stateClasses = 'bg-[#161616] hover:bg-white/5 border border-white/10 hover:border-[#C5A059]/40';
              if (showResult && isCorrectAnswer) {
                stateClasses = 'bg-emerald-600 border-2 border-emerald-400';
              } else if (showResult && isSelected && !isCorrectAnswer) {
                stateClasses = 'bg-red-600 border-2 border-red-400';
              } else if (isSelected) {
                stateClasses = 'bg-[#C5A059] border-2 border-[#C5A059]';
              }

              return (
                <button
                  key={index}
                  type="button"
                  disabled={locked}
                  onClick={() => handleSelect(index)}
                  className={`relative group p-4 rounded-xl text-left transition-all active:scale-[0.98] disabled:active:scale-100 shadow-md ${stateClasses}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-6 h-6 rounded-md font-serif font-bold text-xs flex items-center justify-center ${
                        (isSelected && !showResult) || (showResult && isCorrectAnswer)
                          ? 'bg-black/20 text-[#121212]'
                          : isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {letters[index]}
                    </span>
                    {showResult && isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-white" />}
                    {showResult && isSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 text-white" />}
                  </div>
                  <p
                    className={`font-serif font-medium text-sm sm:text-base leading-snug ${
                      isSelected && !showResult
                        ? 'text-[#121212]'
                        : isSelected || (showResult && isCorrectAnswer)
                          ? 'text-white'
                          : 'text-white/90'
                    }`}
                  >
                    {answer}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#161616] border border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest mr-1">Taunt</span>
              {TAUNTS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onTaunt?.(emoji)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-90 flex items-center justify-center text-sm transition-transform"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onTaunt?.('GG!')}
                className="px-2 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-90 flex items-center justify-center text-xs font-bold text-[#C5A059] transition-transform"
              >
                GG!
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-medium text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{latencyMs}ms</span>
              </div>
              {onForfeit && (
                <button
                  type="button"
                  onClick={onForfeit}
                  aria-label="Forfeit match"
                  className="w-8 h-8 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-red-400 active:scale-90 flex items-center justify-center transition-transform"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
