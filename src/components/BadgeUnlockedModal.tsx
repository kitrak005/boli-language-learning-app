import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../utils/supabaseClient';
import type { BadgeTheme } from '../hooks/useMonthlyBadges';

interface BadgeUnlockedModalProps {
  currentUserId: string | null;
}

type ChestState = 'closed' | 'shaking' | 'open';

/**
 * Listens for a new row in user_monthly_badges naming this user, and pops
 * a tappable reward-chest celebration the moment it happens. The XP bonus
 * itself is already applied server-side by the trigger in
 * 009_monthly_badges.sql — this is purely the player-facing reveal of it.
 */
export function BadgeUnlockedModal({ currentUserId }: BadgeUnlockedModalProps) {
  const [unlockedTheme, setUnlockedTheme] = useState<BadgeTheme | null>(null);
  const [chestState, setChestState] = useState<ChestState>('closed');
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`badge_unlock_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_monthly_badges', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const monthNumber = (payload.new as any).month_number;
          const { data } = await supabase
            .from('monthly_badge_themes')
            .select('*')
            .eq('month_number', monthNumber)
            .single();
          if (data) {
            setUnlockedTheme(data as BadgeTheme);
            setChestState('closed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, [currentUserId]);

  const handleChestClick = () => {
    if (chestState !== 'closed') return;
    setChestState('shaking');

    shakeTimeoutRef.current = setTimeout(() => {
      setChestState('open');

      const accent = unlockedTheme?.accent_color ?? '#FFD700';
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: [accent, '#FFD700', '#FFFFFF'],
        disableForReducedMotion: true,
      });
    }, 800);
  };

  const handleClose = () => {
    setUnlockedTheme(null);
    setChestState('closed');
  };

  if (!unlockedTheme) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={handleClose}>
      <style>{`
        @keyframes chest-rumble {
          0% { transform: translate(2px, 1px) rotate(0deg); }
          25% { transform: translate(-2px, -1px) rotate(-2deg); }
          50% { transform: translate(1px, 2px) rotate(1deg); }
          75% { transform: translate(-1px, -2px) rotate(-1deg); }
          100% { transform: translate(2px, 1px) rotate(0deg); }
        }
        .chest-shaking { animation: chest-rumble 0.1s infinite; }
        .chest-wrapper { perspective: 1000px; }
        .chest-lid {
          transform-origin: bottom center;
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .chest-lid.open { transform: rotateX(-105deg); }
        .chest-lock { transition: opacity 0.2s ease; }
        .chest-lock.open { opacity: 0; }
        .chest-reward {
          opacity: 0;
          transform: translateY(8px) scale(0.95);
          transition: opacity 0.4s ease 0.3s, transform 0.4s ease 0.3s;
        }
        .chest-reward.open { opacity: 1; transform: translateY(0) scale(1); }
      `}</style>

      <div
        className="relative w-full max-w-sm bg-[#121212] rounded-2xl border border-white/15 shadow-2xl p-8 text-center flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-6">Monthly Badge Unlocked</p>

        {/* Chest */}
        <div
          className={`chest-wrapper relative w-[120px] h-[100px] mb-6 ${chestState === 'closed' ? 'cursor-pointer' : ''} ${chestState === 'shaking' ? 'chest-shaking' : ''}`}
          onClick={handleChestClick}
        >
          <div
            className={`chest-lid absolute top-[10px] w-full h-10 rounded-t-[20px] border-4 border-[#78350f] z-[2] ${chestState === 'open' ? 'open' : ''}`}
            style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }}
          />
          <div
            className={`chest-lock absolute top-10 left-1/2 -translate-x-1/2 w-5 h-[25px] rounded-sm border-2 border-[#78350f] bg-[#fbbf24] z-[3] ${chestState === 'open' ? 'open' : ''}`}
          />
          <div
            className="absolute bottom-0 w-full h-[60px] rounded-[5px] border-4 border-[#78350f] shadow-[inset_0_-10px_20px_rgba(0,0,0,0.3)]"
            style={{ background: 'linear-gradient(to bottom, #d97706, #b45309)' }}
          />
        </div>

        {chestState !== 'open' && (
          <p className="text-sm font-semibold text-white/70">
            {chestState === 'shaking' ? 'Opening...' : 'Tap the chest to claim your reward'}
          </p>
        )}

        {/* Revealed reward */}
        <div className={`chest-reward ${chestState === 'open' ? 'open' : ''} flex flex-col items-center`}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3"
            style={{ background: `${unlockedTheme.accent_color}22`, border: `3px solid ${unlockedTheme.accent_color}` }}
          >
            {unlockedTheme.icon}
          </div>
          <h3 className="font-serif text-lg font-normal text-white mb-1">{unlockedTheme.label}</h3>
          <p className="text-sm font-semibold" style={{ color: unlockedTheme.accent_color }}>
            +100 XP Bonus
          </p>
          <button
            onClick={handleClose}
            className="mt-5 px-5 py-2 rounded-full bg-[#C5A059] text-[#121212] text-xs font-bold"
          >
            Nice!
          </button>
        </div>
      </div>
    </div>
  );
}
