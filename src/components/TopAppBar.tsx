import React, { useState } from 'react';
import { BookOpen, Globe2, Volume2, VolumeX } from 'lucide-react';
import { LanguageTradition } from '../types';
import { sound } from '../utils/audio';

interface TopAppBarProps {
  currentTradition: LanguageTradition;
  streakDays: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenTraditions: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTradition,
  streakDays,
  activeTab,
  onTabChange,
  onOpenTraditions,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      sound.playSuccessChime();
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-4 sm:px-8 h-16 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/10 transition-all duration-200">
      {/* Left: Book / Tradition switcher */}
      <div className="flex items-center gap-3">
        <button
          id="btn-open-traditions"
          onClick={onOpenTraditions}
          title="Switch Tradition"
          className="p-2 -ml-2 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 group cursor-pointer"
        >
          <BookOpen className="w-5 h-5 text-[#C5A059] group-hover:scale-105 transition-transform" />
          <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-1 rounded-full border border-[#C5A059]/30">
            {currentTradition.name}
          </span>
        </button>

        <h1
          onClick={() => onTabChange('home')}
          className="font-serif text-2xl font-bold tracking-widest text-[#C5A059] cursor-pointer hover:opacity-85 transition-opacity flex items-center gap-1.5"
        >
          VĀKYA
        </h1>
      </div>

      {/* Center: Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        {[
          { id: 'home', label: 'Home' },
          { id: 'learn', label: 'Learn' },
          { id: 'explore', label: 'Explore' },
          { id: 'practice', label: 'Practice' },
          { id: 'profile', label: 'Profile' },
        ].map((item) => (
          <button
            key={item.id}
            id={`nav-link-${item.id}`}
            onClick={() => onTabChange(item.id)}
            className={`text-xs uppercase tracking-[0.15em] font-medium transition-all duration-200 px-3.5 py-1.5 rounded-lg cursor-pointer ${
              activeTab === item.id
                ? 'text-[#C5A059] bg-white/[0.06] border border-[#C5A059]/30 font-semibold shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Right: Sound Controls, Tradition quick switch & Streak Badge */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          id="btn-sound-mute-toggle"
          onClick={handleToggleSound}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-2 rounded-full bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#C5A059]" />}
        </button>

        <button
          id="btn-quick-tradition"
          onClick={onOpenTraditions}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/15 text-xs text-white/90 hover:border-[#C5A059]/40 hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Globe2 className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="font-serif tracking-wide">{currentTradition.nativeScript}</span>
        </button>

        <div
          id="badge-streak-header"
          title={`${streakDays} ${streakDays === 1 ? 'day' : 'days'} daily study streak`}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] font-semibold text-xs tracking-wide shadow-xs cursor-default"
        >
          <span>{streakDays}</span>
          <span className="text-sm">🔥</span>
        </div>
      </div>
    </header>
  );
};
