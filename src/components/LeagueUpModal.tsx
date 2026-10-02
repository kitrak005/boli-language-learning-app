/**
 * Full-screen animated "League Up!" / "League Down" modal.
 * Shows the new badge with celebration particles.
 */

import { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import type { LeagueConfig } from '../lib/leagues.ts';
import { LeagueBadge } from './LeagueBadge.tsx';

interface LeagueUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLeague: LeagueConfig;
  type: 'promotion' | 'demotion';
}

export function LeagueUpModal({ isOpen, onClose, newLeague, type }: LeagueUpModalProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Generate celebration particles for promotion
      if (type === 'promotion') {
        const p = Array.from({ length: 30 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 4 + Math.random() * 8,
          delay: Math.random() * 1.5,
        }));
        setParticles(p);
      } else {
        setParticles([]);
      }
    } else {
      setVisible(false);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isUp = type === 'promotion';

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Particles (promotion only) */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none animate-bounce"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: newLeague.accent,
            opacity: 0.6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${1.5 + Math.random()}s`,
          }}
        />
      ))}

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-sm w-full mx-4 rounded-3xl border bg-[#121212]/95 backdrop-blur-lg"
        style={{
          borderColor: `${newLeague.accent}40`,
          boxShadow: `0 0 60px ${newLeague.glow}, 0 0 120px ${newLeague.glow}`,
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${newLeague.accent}20`,
            border: `2px solid ${newLeague.accent}50`,
          }}
        >
          {isUp ? (
            <TrendingUp className="w-7 h-7" style={{ color: newLeague.accent }} />
          ) : (
            <TrendingDown className="w-7 h-7" style={{ color: newLeague.accent }} />
          )}
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2
            className="font-serif text-3xl font-normal tracking-wide"
            style={{ color: newLeague.accent }}
          >
            {isUp ? 'League Up!' : 'League Down'}
          </h2>
          <p className="text-sm text-white/50 font-light">
            {isUp
              ? 'Your skill has earned you a promotion!'
              : 'Keep pushing — you\'ll climb back soon.'}
          </p>
        </div>

        {/* Badge (large) */}
        <div className="animate-bounce" style={{ animationDuration: '2s' }}>
          <LeagueBadge league={newLeague} size="xl" showName />
        </div>

        {/* League name + roman */}
        <div className="text-center">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-medium">
            League {newLeague.roman}
          </p>
          <p
            className="font-serif text-xl font-normal mt-0.5"
            style={{ color: newLeague.accent }}
          >
            {newLeague.name}
          </p>
          <p className="text-white/40 text-[11px] mt-1">
            {newLeague.minRating}–{newLeague.maxRating === Infinity ? '∞' : newLeague.maxRating} Rating
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl font-serif font-bold text-sm tracking-wider transition-all active:scale-[0.98]"
          style={{
            backgroundColor: newLeague.accent,
            color: '#121212',
          }}
        >
          {isUp ? 'Let\'s Go!' : 'Keep Fighting'}
        </button>
      </div>
    </div>
  );
}
