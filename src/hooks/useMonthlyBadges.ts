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

// Static fallback catalog — mirrors the seeds in 009_monthly_badges.sql.
// Used when the DB table doesn't exist yet (migration not yet run).
const STATIC_THEMES: BadgeTheme[] = [
  { month_number: 1,  label: "Śiśira's Winter Śloka",        icon: '❄️', accent_color: '#9FD8FF', threshold: 20 },
  { month_number: 2,  label: "Vasanta's Blossom Verse",       icon: '🌸', accent_color: '#FFB3D1', threshold: 20 },
  { month_number: 3,  label: "Grīṣma's Rising Scholar",       icon: '☀️', accent_color: '#FFD166', threshold: 20 },
  { month_number: 4,  label: "Varṣā's First Rain Wisdom",     icon: '🌧️', accent_color: '#6FAFE0', threshold: 20 },
  { month_number: 5,  label: "Śarad's Harvest Hymn",          icon: '🌾', accent_color: '#D9A441', threshold: 20 },
  { month_number: 6,  label: "Hemanta's Steady Flame",        icon: '🔥', accent_color: '#E0703A', threshold: 20 },
  { month_number: 7,  label: "Guru Vidyadhar's Midyear Māyā", icon: '📿', accent_color: '#C5A059', threshold: 20 },
  { month_number: 8,  label: "Sabhā's Summer Śāstrārtha",     icon: '🏛️', accent_color: '#C5A059', threshold: 20 },
  { month_number: 9,  label: "Ṛṣi's Autumn Awakening",        icon: '🍂', accent_color: '#B5651D', threshold: 20 },
  { month_number: 10, label: "Deepāvali's Golden Diya",       icon: '🪔', accent_color: '#FFC14D', threshold: 20 },
  { month_number: 11, label: "Sādhaka's Late Bloom",          icon: '🌙', accent_color: '#9D8CFF', threshold: 20 },
  { month_number: 12, label: "Varṣānta's Year-End Vidyā",     icon: '❄️', accent_color: '#9FD8FF', threshold: 20 },
];

export function useMonthlyBadges(userId: string | null) {
  const [currentTheme, setCurrentTheme] = useState<BadgeTheme | null>(null);
  const [progress, setProgress] = useState(0);
  const [period, setPeriod] = useState<string>('');
  const [history, setHistory] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const currentMonth = new Date().getMonth() + 1;
    const staticFallback = STATIC_THEMES.find((t) => t.month_number === currentMonth) ?? STATIC_THEMES[9];

    if (!userId) {
      // Not logged in — still show the static badge theme so the card is visible
      setCurrentTheme(staticFallback);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: theme }, { data: profile }, { data: earned }] = await Promise.all([
      supabase.from('monthly_badge_themes').select('*').eq('month_number', currentMonth).single(),
      supabase.from('profiles').select('monthly_quest_count, monthly_quest_period').eq('id', userId).single(),
      supabase
        .from('user_monthly_badges')
        .select('year_month, earned_at, monthly_badge_themes(*)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
    ]);

    // If DB table doesn't exist yet (migration not run), fall back to the static catalog
    setCurrentTheme((theme as BadgeTheme) ?? staticFallback);
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
