import { useMonthlyBadges } from '../hooks/useMonthlyBadges';

interface MonthlyBadgesCardProps {
  currentUserId: string | null;
}

function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function MonthlyBadgesCard({ currentUserId }: MonthlyBadgesCardProps) {
  const { currentTheme, progress, history, loading } = useMonthlyBadges(currentUserId);

  if (loading || !currentTheme) return null;

  const isEarnedThisMonth = history.some((h) => h.year_month === new Date().toISOString().slice(0, 7));
  const pct = Math.min(100, Math.round((progress / currentTheme.threshold) * 100));

  return (
    <section className="space-y-4">
      <h3 className="font-serif text-xl font-normal text-white">Monthly Badges</h3>

      <div className="bg-[#121212] rounded-2xl border border-white/10 p-5 space-y-5">
        {/* Current month progress */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{
              background: isEarnedThisMonth ? `${currentTheme.accent_color}22` : 'rgba(255,255,255,0.05)',
              border: `2px solid ${isEarnedThisMonth ? currentTheme.accent_color : 'rgba(255,255,255,0.15)'}`,
              filter: isEarnedThisMonth ? 'none' : 'grayscale(1) opacity(0.5)',
            }}
          >
            {currentTheme.icon}
          </div>
          <div className="flex-1 min-w-0">
            {isEarnedThisMonth ? (
              <>
                <p className="text-sm font-medium text-white">{currentTheme.label}</p>
                <p className="text-xs text-white/40">Earned this month</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white">
                  Complete {currentTheme.threshold} quests to earn this month's badge
                </p>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: currentTheme.accent_color }}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  {progress} / {currentTheme.threshold}
                </p>
              </>
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            {history.map((h) => (
              <div key={h.year_month} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${h.theme.accent_color}22`, border: `2px solid ${h.theme.accent_color}` }}
                >
                  {h.theme.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{h.theme.label}</p>
                  <p className="text-[10px] text-white/40">{formatYearMonth(h.year_month)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
