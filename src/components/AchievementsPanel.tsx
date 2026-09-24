export interface Achievement {
  id: string;
  title: string;
  levelLabel: string;
  icon: string; // emoji
  iconBg: string; // tailwind bg classes for the icon square/circle
  current: number;
  target: number;
  description: string;
}

export interface AchievementsPanelProps {
  achievements: Achievement[];
  onViewAll?: () => void;
}

export function AchievementsPanel({ achievements, onViewAll }: AchievementsPanelProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-xl font-normal text-white">Achievements</h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold uppercase tracking-wider text-[#C5A059] hover:text-[#C5A059]/80 transition-colors"
          >
            View All
          </button>
        )}
      </div>

      <div className="bg-[#161616] border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden shadow-sm">
        {achievements.map((a) => {
          const pct = Math.min(100, Math.round((a.current / a.target) * 100));
          return (
            <div key={a.id} className="p-4 flex items-start gap-3.5">
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${a.iconBg}`}>
                  {a.icon}
                </div>
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#121212] border border-white/10 text-[8px] font-bold text-white/70 px-1.5 py-0.5 rounded-full whitespace-nowrap tracking-wider">
                  {a.levelLabel}
                </span>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif font-normal text-sm text-white truncate">{a.title}</h3>
                  <span className="text-[11px] font-mono text-white/40 shrink-0">
                    {a.current}/{a.target}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#C5A059] rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-white/50 mt-1.5 font-light">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
