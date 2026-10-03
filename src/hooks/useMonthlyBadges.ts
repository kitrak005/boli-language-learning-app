import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface BadgeTheme {
  month_number: number;
  label: string;
  icon: string;
  accent_color: string;
  threshold: number;
}

export interface EarnedBadge {
  year_month: string;
  earned_at: string;
  theme: BadgeTheme;
}

export function useMonthlyBadges(userId: string | null) {
  const [currentTheme, setCurrentTheme] = useState<BadgeTheme | null>(null);
  const [progress, setProgress] = useState(0);
  const [period, setPeriod] = useState<string>('');
  const [history, setHistory] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const currentMonth = new Date().getMonth() + 1;
    const [{ data: theme }, { data: profile }, { data: earned }] = await Promise.all([
      supabase.from('monthly_badge_themes').select('*').eq('month_number', currentMonth).single(),
      supabase.from('profiles').select('monthly_quest_count, monthly_quest_period').eq('id', userId).single(),
      supabase
        .from('user_monthly_badges')
        .select('year_month, earned_at, monthly_badge_themes(*)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
    ]);

    setCurrentTheme((theme as BadgeTheme) ?? null);
    setProgress(profile?.monthly_quest_count ?? 0);
    setPeriod(profile?.monthly_quest_period ?? '');
    setHistory(
      (earned ?? []).map((row: any) => ({
        year_month: row.year_month,
        earned_at: row.earned_at,
        theme: row.monthly_badge_themes,
      }))
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { currentTheme, progress, period, history, loading, refresh };
}
