import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, Flame, CheckCircle, ArrowRight, Star, Volume2, X } from 'lucide-react';
import { ConfettiCanvas } from './ConfettiCanvas';
import { sound } from '../utils/audio';
import { UserProfile } from '../types';

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  traditionName?: string;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  onClose,
  profile,
  traditionName = 'Sanskrit',
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSpeakingBlessing, setIsSpeakingBlessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      sound.unlockAudio();
      sound.playSuccessChime();
      sound.playTanpuraPluck(220, 2.5);
    } else {
      setShowConfetti(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpeakBlessing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.unlockAudio();
    setIsSpeakingBlessing(true);
    sound.speak(
      'सिद्धिर्भवति कर्मजा',
      'sanskrit',
      () => setIsSpeakingBlessing(true),
      () => setIsSpeakingBlessing(false),
      'Siddhir bhavati karmajaa'
    );
  };

  const handleReplayConfetti = () => {
    setShowConfetti(false);
    setTimeout(() => {
      setShowConfetti(true);
      sound.playSuccessChime();
    }, 50);
  };

  return (
    <div
      id="level-up-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Confetti particles overlay */}
      <ConfettiCanvas
        active={showConfetti}
        particleCount={75}
        duration={4500}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Modal Container */}
      <div
        id="level-up-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-gradient-to-b from-[#181818] via-[#121212] to-[#0A0A0A] border border-[#C5A059]/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-[#C5A059]/15 overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Top Close Button */}
        <button
          id="btn-close-level-up-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close celebration"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient background aura glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#C5A059]/25 rounded-full blur-3xl pointer-events-none" />

        {/* Decorative Indian Mandir Arch Top Motif */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#C5A059]/60" />
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#C5A059]">
            SĀDHANĀ SIDDHI • साधना सिद्धि
          </span>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#C5A059]/60" />
        </div>

        {/* Central Glowing Trophy & Mandala Badge */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated pulsing outer halo */}
          <div className="absolute w-24 h-24 rounded-full bg-[#C5A059]/20 animate-ping opacity-35" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#DFC386] via-[#C5A059] to-[#8C6B28] p-[2px] shadow-lg shadow-[#C5A059]/30">
            <div className="w-full h-full rounded-[14px] bg-[#121212] flex flex-col items-center justify-center">
              <Trophy className="w-9 h-9 text-[#DFC386] animate-bounce duration-1000" />
            </div>
          </div>

          {/* Sparkle decorative badges */}
          <div className="absolute -top-1 -right-1 bg-[#C5A059] text-black p-1 rounded-full shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Headings */}
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide mb-1">
          Daily Goal Achieved!
        </h2>
        <p className="text-xs sm:text-sm text-[#C5A059] font-medium tracking-wide mb-5">
          Level Up Progress Unlocked • {profile.roleTitle}
        </p>

        {/* Accomplishment Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-5 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl font-bold text-white font-serif">
              {profile.dailyXp} <span className="text-xs text-[#C5A059]">XP</span>
            </span>
            <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider mt-0.5">
              Daily Target
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-white/10 px-2">
            <div className="flex items-center gap-1 text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span className="text-lg sm:text-xl font-bold text-white font-serif">
                {profile.streakDays}
              </span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider mt-0.5">
              Day Streak
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[#C5A059]">
              <Star className="w-3.5 h-3.5 fill-[#C5A059]" />
              <span className="text-lg sm:text-xl font-bold text-white font-serif">
                +{profile.maxDailyXp}
              </span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider mt-0.5">
              Mastery Boost
            </span>
          </div>
        </div>

        {/* Sacred Sanskrit Blessing Card with Audio recitation */}
        <div
          onClick={handleSpeakBlessing}
          className="my-5 p-3.5 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-left relative group cursor-pointer hover:bg-[#C5A059]/15 transition-all"
          title="Click to hear Guru's blessing"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#C5A059] block mb-0.5">
                Vedic Blessing • Bhagavad Gītā 4.12
              </span>
              <p className="font-serif text-sm font-semibold text-white tracking-wide">
                "सिद्धिर्भवति कर्मजा"
              </p>
              <p className="text-[11px] text-white/70 italic mt-0.5">
                "Accomplishment arises through dedicated regular practice."
              </p>
            </div>
            <button
              id="btn-play-blessing-audio"
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                isSpeakingBlessing
                  ? 'bg-[#C5A059] text-black shadow-md shadow-[#C5A059]/30 animate-pulse'
                  : 'bg-white/10 text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6">
          <button
            id="btn-celebrate-replay"
            onClick={handleReplayConfetti}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-medium tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Sparks ✨</span>
          </button>

          <button
            id="btn-continue-post-celebration"
            onClick={onClose}
            className="w-full flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-[#DFC386] via-[#C5A059] to-[#9C7733] hover:brightness-110 text-black font-semibold text-xs uppercase tracking-[0.15em] shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Continue Sādhanā</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
