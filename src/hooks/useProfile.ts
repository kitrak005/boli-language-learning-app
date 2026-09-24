import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  scholar_level: string;
  role_title: string;
  total_xp: number;
  streak_days: number;
  daily_xp: number;
  max_daily_xp: number;
  language_mastery: { sanskrit: number; pali: number; tamil: number };
  weekly_xp_history: unknown[]; // shape matches whatever WeeklyXpD3Chart already expects
  location: string | null;
  wins: number;
  losses: number;
}

/** Fetches a public profile once. Pass null/undefined to skip fetching. */
export function useProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[useProfile] fetch failed:', error.message);
          setProfile(null);
        } else {
          setProfile(data as Profile);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const winRatePct =
    profile && profile.wins + profile.losses > 0
      ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
      : undefined;

  return { profile, loading, winRatePct };
}

export interface AchievementDef {
  id: string;
  title: string;
  level_label: string;
  icon: string;
  icon_bg: string;
  target: number;
  description: string;
  metric: 'streak_days' | 'total_xp' | 'wins';
}

/**
 * Fetches the achievements catalog once (it rarely changes). Combine with
 * a Profile via computeAchievementProgress() to get the Achievement[]
 * shape AchievementsPanel expects — this replaces the hardcoded array
 * that used to live inline in BattleMatchScreen.tsx.
 */
export function useAchievementsCatalog() {
  const [catalog, setCatalog] = useState<AchievementDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('achievements')
      .select('*')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[useAchievementsCatalog] fetch failed:', error.message);
        } else {
          setCatalog((data ?? []) as AchievementDef[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, loading };
}

/**
 * Combines a profile's live stats with the achievements catalog to
 * produce the current/target progress array AchievementsPanel renders.
 * xpDelta lets the result screen show progress *after* this match's XP
 * is added, before the profile row has actually finished updating.
 */
export function computeAchievementProgress(
  profile: Profile | null,
  catalog: AchievementDef[],
  xpDelta = 0
): Array<{
  id: string;
  title: string;
  levelLabel: string;
  icon: string;
  iconBg: string;
  current: number;
  target: number;
  description: string;
}> {
  if (!profile) return [];

  const values: Record<AchievementDef['metric'], number> = {
    streak_days: profile.streak_days,
    total_xp: profile.total_xp + xpDelta,
    wins: profile.wins,
  };

  return catalog.map((a) => ({
    id: a.id,
    title: a.title,
    levelLabel: a.level_label,
    icon: a.icon,
    iconBg: a.icon_bg,
    current: Math.min(values[a.metric], a.target),
    target: a.target,
    description: a.description,
  }));
}
