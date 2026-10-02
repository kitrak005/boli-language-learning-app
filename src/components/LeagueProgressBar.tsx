/**
 * Progress bar toward the next league.
 * Shows "142 / 300 to Gold Lion" style label.
 */

import type { LeagueConfig } from '../lib/leagues.ts';
import { getLeagueProgress } from '../lib/leagues.ts';

interface LeagueProgressBarProps {
  rating: number;
  league: LeagueConfig;
  className?: string;
}

export function LeagueProgressBar({ rating, league, className = '' }: LeagueProgressBarProps) {
  const progress = getLeagueProgress(rating, league);

  if (!progress) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-white/50 font-medium uppercase tracking-wider text-[10px]">
            Max League
          </span>
          <span className="font-bold font-serif" style={{ color: league.accent }}>
            ∞
          </span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: '100%', backgroundColor: league.accent }}
          />
        </div>
      </div>
    );
  }

  const pct = Math.min((progress.current / progress.total) * 100, 100);

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-white/50 font-medium uppercase tracking-wider text-[10px]">
          League Progress
        </span>
        <span className="font-bold font-serif text-white/70">
          {progress.label}
        </span>
      </div>
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 relative"
          style={{ width: `${pct}%`, backgroundColor: league.accent }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
