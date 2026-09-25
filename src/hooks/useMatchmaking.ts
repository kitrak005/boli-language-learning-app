import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

type MatchmakingStatus = 'idle' | 'searching' | 'matched' | 'error';

/**
 * Drives both ways a battle can start:
 *  - findMatch(category): queues the player, pairs immediately if someone
 *    else is already waiting, otherwise waits on realtime for a match to
 *    appear naming them as a participant.
 *  - createInvite(category) / joinInvite(code): the link-based flow.
 *
 * In both cases, whichever client is the one that causes the match to
 * become 'active' also kicks off question generation — the Edge Function
 * is idempotent, so even if both sides raced, it's harmless.
 */
export function useMatchmaking(currentUserId: string) {
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupSearchChannels = useCallback(() => {
    searchChannelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    searchChannelsRef.current = [];
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => cleanupSearchChannels, [cleanupSearchChannels]);

  const triggerQuestionGeneration = useCallback(async (id: string, category = 'Sanskrit') => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    try {
      const res = await fetch('/api/generate-battle-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ match_id: id, category, total_rounds: 5 }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.questions && !json.insertedByServer) {
          const { error: insErr } = await supabase
            .from('battle_match_questions')
            .upsert(json.questions, { onConflict: 'match_id,round' });
          if (insErr) {
            console.warn('[useMatchmaking] Client questions upsert note:', insErr.message);
          }
        }
        return;
      }
    } catch (e: any) {
      console.warn('[useMatchmaking] /api/generate-battle-questions attempt failed, falling back to edge fn:', e.message);
    }

    if (token) {
      const { error: fnErr } = await supabase.functions.invoke('generate-battle-questions', {
        body: { match_id: id },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fnErr) {
        console.warn('[useMatchmaking] Edge function question generation failed:', fnErr.message);
      }
    }
  }, []);

  /** Random online matchmaking. */
  const findMatch = useCallback(
    async (category: string) => {
      setStatus('searching');
      setError(null);

      const { data, error: rpcErr } = await supabase.rpc('find_match', { p_category: category });

      if (rpcErr) {
        setStatus('error');
        setError(rpcErr.message);
        return;
      }

      if (data) {
        // Paired immediately — we're the one who created the match, so we
        // own question generation.
        setMatchId(data as string);
        setStatus('matched');
        await triggerQuestionGeneration(data as string, category);
        return;
      }

      // No opponent yet: we're queued. Listen for a battle_matches row
      // that names us as either player.
      const onMatched = (row: { id: string; status: string }) => {
        if (row.status !== 'active') return;
        cleanupSearchChannels();
        setMatchId(row.id);
        setStatus('matched');
        // The opponent's client triggers generation in this branch (they're
        // the one whose find_match() call created the row), so we don't
        // need to call it again — but it's idempotent if we did.
      };

      const asPlayer1 = supabase
        .channel(`match_wait_p1_${currentUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'battle_matches', filter: `player1_id=eq.${currentUserId}` },
          (payload) => onMatched(payload.new as { id: string; status: string })
        )
        .subscribe();

      const asPlayer2 = supabase
        .channel(`match_wait_p2_${currentUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'battle_matches', filter: `player2_id=eq.${currentUserId}` },
          (payload) => onMatched(payload.new as { id: string; status: string })
        )
        .subscribe();

      searchChannelsRef.current = [asPlayer1, asPlayer2];

      // Realtime fallback: some networks (mobile data, campus wifi,
      // corporate firewalls) block or drop the websocket connection
      // Realtime needs. Without this, a player on such a network would
      // stay stuck on "Finding an Opponent..." forever even after another
      // player's find_match() call successfully paired them — the match
      // row would exist in the database, they'd just never hear about it.
      // Polling every 2s guarantees they find out regardless of whether
      // the websocket ever connects.
      pollIntervalRef.current = setInterval(async () => {
        const { data: row } = await supabase
          .from('battle_matches')
          .select('id, status')
          .or(`player1_id.eq.${currentUserId},player2_id.eq.${currentUserId}`)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (row) onMatched(row);
      }, 2000);
    },
    [currentUserId, cleanupSearchChannels, triggerQuestionGeneration]
  );

  const cancelSearch = useCallback(async () => {
    cleanupSearchChannels();
    await supabase.rpc('leave_queue');
    setStatus('idle');
  }, [cleanupSearchChannels]);

  /** Invite-by-link: create side. Returns the shareable code. */
  const createInvite = useCallback(async (category: string) => {
    setError(null);
    const { data, error: rpcErr } = await supabase
      .rpc('create_invite_match', { p_category: category })
      .single();

    if (rpcErr || !data) {
      setStatus('error');
      setError(rpcErr?.message ?? 'Could not create invite');
      return null;
    }

    const { match_id, invite_code } = data as { match_id: string; invite_code: string };
    setMatchId(match_id);
    setStatus('idle'); // still waiting for someone to join — not "matched" yet
    return invite_code;
  }, []);

  // Once we've created an invite, listen for the match flipping to active.
  useEffect(() => {
    if (!matchId || status === 'matched') return;

    const channel = supabase
      .channel(`invite_wait_${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'battle_matches', filter: `id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as { status: string };
          if (row.status === 'active') {
            setStatus('matched');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, status]);

  /** Invite-by-link: join side. */
  const joinInvite = useCallback(
    async (code: string) => {
      setError(null);
      const { data, error: rpcErr } = await supabase.rpc('join_match_by_code', { p_code: code });

      if (rpcErr || !data) {
        setStatus('error');
        setError(rpcErr?.message ?? 'Could not join match');
        return;
      }

      setMatchId(data as string);
      setStatus('matched');
      // We're the one who flipped the match to active — we own generation.
      await triggerQuestionGeneration(data as string);
    },
    [triggerQuestionGeneration]
  );

  return {
    status,
    matchId,
    error,
    findMatch,
    cancelSearch,
    createInvite,
    joinInvite,
  };
}