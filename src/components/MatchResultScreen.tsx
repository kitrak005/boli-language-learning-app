import { Award, Handshake, BookOpen, Zap, Lightbulb, Swords } from 'lucide-react';
import { AchievementsPanel, type Achievement } from './AchievementsPanel';

export interface ResultPlayer {
  name: string;
  avatarUrl?: string;
  level?: number;
  title?: string;
  score: number;
  xpEarned: number;
}

export interface MatchResultScreenProps {
  you: ResultPlayer;
  opponent: ResultPlayer;
  totalRounds: number;
  category: string;
  achievements: Achievement[];
  onRematch: () => void;
  onExit: () => void;
  onViewAllAchievements?: () => void;
  guruQuoteSanskrit?: string;
  guruQuoteTranslation?: string;
}

export function MatchResultScreen({
  you,
  opponent,
  totalRounds,
  category,
  achievements,
  onRematch,
  onExit,
  onViewAllAchievements,
  guruQuoteSanskrit = 'यत् भावं तत् भवति',
  guruQuoteTranslation = 'As the intent, so the outcome — return to the Sabhā and refine your craft.',
}: MatchResultScreenProps) {
  const outcome: 'win' | 'loss' | 'tie' =
    you.score > opponent.score ? 'win' : you.score < opponent.score ? 'loss' : 'tie';

  const banner = {
    win: { label: 'Victory', sub: 'You outdueled your opponent', tone: 'text-[#C5A059]', ring: 'border-[#C5A059]' },
    loss: { label: 'Defeat', sub: 'A worthy opponent this round', tone: 'text-white/80', ring: 'border-white/20' },
    tie: { label: 'Draw', sub: 'An evenly matched Sabhā', tone: 'text-white/80', ring: 'border-white/20' },
  }[outcome];

  const BannerIcon = outcome === 'win' ? Award : outcome === 'tie' ? Handshake : BookOpen;

  return (
    <div className="relative w-full max-w-[420px] mx-auto bg-[#121212] text-white min-h-screen flex flex-col p-5 pb-6 overflow-y-auto selection:bg-[#C5A059]/30">
      {/* Outcome banner */}
      <div className="flex flex-col items-center text-center pt-6 pb-2">
        <div className={`w-20 h-20 rounded-full border-2 ${banner.ring} bg-[#161616] flex items-center justify-center shadow-lg`}>
          <BannerIcon className="w-9 h-9 text-[#C5A059]" />
        </div>
        <h1 className={`font-serif text-3xl font-normal mt-3 tracking-wide ${banner.tone}`}>{banner.label}</h1>
        <p className="text-xs text-white/50 mt-1 font-light">{banner.sub}</p>
      </div>

      {/* Final score face-off */}
      <div className="flex items-center justify-between gap-3 bg-[#161616] border border-white/10 rounded-2xl p-4 mt-4">
        <PlayerResultCard player={you} isYou highlighted={outcome === 'win'} />
        <div className="flex flex-col items-center shrink-0 px-1">
          <span className="font-serif text-xs text-white/40 tracking-widest">FINAL</span>
          <span className="font-serif text-lg text-white/30">—</span>
        </div>
        <PlayerResultCard player={opponent} highlighted={outcome === 'loss'} />
      </div>
      <p className="text-center text-[11px] text-white/40 mt-2 font-light">
        {totalRounds} rounds • {category}
      </p>

      {/* XP earned */}
      <div className="flex items-center justify-center gap-2 mt-5 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl py-3">
        <Zap className="w-5 h-5 text-[#C5A059]" />
        <span className="font-serif font-normal text-[#C5A059] text-lg">+{you.xpEarned} XP</span>
        <span className="text-xs text-white/50 font-light">earned this duel</span>
      </div>

      {/* Achievements */}
      <div className="mt-6">
        <AchievementsPanel achievements={achievements} onViewAll={onViewAllAchievements} />
      </div>

      {/* Guru closing note */}
      <div className="w-full bg-[#161616] border border-white/10 rounded-xl p-3 flex items-start gap-2.5 mt-5">
        <div className="w-7 h-7 rounded-full bg-white/5 border border-[#C5A059]/30 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-[#C5A059]" />
        </div>
        <div className="flex-1">
          <div className="font-serif text-xs font-normal text-white/90">{guruQuoteSanskrit}</div>
          <p className="text-[11px] text-white/50 italic mt-0.5 leading-snug font-light">&ldquo;{guruQuoteTranslation}&rdquo;</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={onRematch}
          className="w-full h-12 rounded-xl bg-[#C5A059] font-serif font-bold text-[#121212] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
        >
          <Swords className="w-4.5 h-4.5" />
          Rematch
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full h-12 rounded-xl bg-[#161616] hover:bg-white/5 border border-white/10 font-medium text-white/70 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          Exit to Sabhā
        </button>
      </div>
    </div>
  );
}

function PlayerResultCard({
  player,
  isYou,
  highlighted,
}: {
  player: ResultPlayer;
  isYou?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden border-2 ${
            highlighted ? 'border-[#C5A059]' : 'border-white/20'
          }`}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center font-serif font-normal text-[#C5A059]">
              {player.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        {highlighted && <span className="absolute -top-2 -right-2 text-base">👑</span>}
      </div>
      <span className="text-[11px] font-medium text-white/50 mt-1.5 truncate max-w-full">
        {isYou ? 'You' : player.name}
      </span>
      <span className="font-serif text-xl font-normal text-white">{player.score}</span>
    </div>
  );
}
