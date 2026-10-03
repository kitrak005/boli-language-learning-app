import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface FriendProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  total_xp: number;
}

export function useFriends(currentUserId: string | null) {
  const [following, setFollowing] = useState<FriendProfile[]>([]);
  const [followers, setFollowers] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUserId) {
      setFollowing([]);
      setFollowers([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
      supabase
        .from('friendships')
        .select('followed_id, profiles!friendships_followed_id_fkey(id, name, avatar_url, total_xp)')
        .eq('follower_id', currentUserId),
      supabase
        .from('friendships')
        .select('follower_id, profiles!friendships_follower_id_fkey(id, name, avatar_url, total_xp)')
        .eq('followed_id', currentUserId),
    ]);

    setFollowing((followingRows ?? []).map((r: any) => r.profiles).filter(Boolean));
    setFollowers((followerRows ?? []).map((r: any) => r.profiles).filter(Boolean));
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const follow = useCallback(
    async (targetUserId: string) => {
      if (!currentUserId) return;
      await supabase.from('friendships').insert({ follower_id: currentUserId, followed_id: targetUserId });
      await refresh();
    },
    [currentUserId, refresh]
  );

  const unfollow = useCallback(
    async (targetUserId: string) => {
      if (!currentUserId) return;
      await supabase.from('friendships').delete().eq('follower_id', currentUserId).eq('followed_id', targetUserId);
      await refresh();
    },
    [currentUserId, refresh]
  );

  const searchProfiles = useCallback(async (query: string): Promise<FriendProfile[]> => {
    if (!query.trim()) return [];
    const { data } = await supabase.rpc('search_profiles', { p_query: query.trim() });
    return (data ?? []) as FriendProfile[];
  }, []);

  return { following, followers, loading, follow, unfollow, searchProfiles, refresh };
}
