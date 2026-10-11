import React, { useState } from 'react';
import { BookOpen, Globe2, Volume2, VolumeX, LogOut, UserCircle, Mic, Zap } from 'lucide-react';
import { LanguageTradition } from '../types';
import { sound } from '../utils/audio';

interface TopAppBarProps {
  currentTradition: LanguageTradition;
  streakDays: number;
  dailyXp?: number;
  avatarUrl?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenTraditions: () => void;
  onSignOut: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTradition,
  streakDays,
  dailyXp,
  avatarUrl,
  activeTab,
  onTabChange,
  onOpenTraditions,
  onSignOut,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      sound.playSuccessChime();
    }
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'learn', label: 'Learn' },
    { id: 'explore', label: 'Explore' },
    { id: 'practice', label: 'Practice' },
    { id: 'battle', label: 'Battles' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'askguru', label: 'Ask Guru' },
    { id: 'voice', label: 'Voice' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-40 px-3 sm:px-6 lg:px-8 pt-3 pb-1 transition-all duration-200">
      <div className="flex items-center justify-between gap-3 bg-[#121110]/90 backdrop-blur-md px-4 py-2.5 sm:py-3 rounded-2xl border border-amber-500/20 max-w-7xl mx-auto shadow-2xl">
        {/* Left side: Logo & Primary nav links */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-open-traditions"
              onClick={onOpenTraditions}
              title={`Switch Tradition (${currentTradition.name})`}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 group cursor-pointer"
            >
              <BookOpen className="w-5 h-5 text-[#C5A059] group-hover:scale-105 transition-transform" />
              <span className="hidden md:inline-block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full border border-[#C5A059]/30">
                {currentTradition.name}
              </span>
            </button>

            <h1
              onClick={() => onTabChange('home')}
              className="font-serif text-lg sm:text-xl font-bold tracking-widest text-[#C5A059] cursor-pointer hover:opacity-85 transition-opacity"
            >
              BOLVANI
            </h1>
          </div>

          {/* Primary Nav Links: horizontal scrollable strip on mobile, flex on desktop */}
          <nav className="flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 py-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`text-[11px] sm:text-xs uppercase tracking-[0.12em] font-medium transition-all duration-200 px-2.5 sm:px-3 py-1.5 rounded-lg shrink-0 cursor-pointer min-h-[36px] ${
                  activeTab === item.id
                    ? 'text-[#C5A059] bg-white/[0.08] border border-amber-500/30 font-semibold shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side: User Metrics Cleanly Grouped */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Vāk Voice Quick Toggle */}
          <button
            id="btn-topbar-vak-ai"
            onClick={() => onTabChange('voice')}
            title="Real-time Vāk Voice AI"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 hover:border-amber-400 text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Vāk AI</span>
          </button>

          {/* Streak Pill */}
          <div
            id="badge-streak-header"
            title={`${streakDays} days study streak`}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] border border-amber-500/30 text-amber-300 font-semibold text-xs tracking-wide min-h-[36px]"
          >
            <span className="text-sm leading-none">🔥</span>
            <span>{streakDays}d</span>
          </div>

          {/* XP Pill */}
          <div
            id="badge-xp-header"
            title={`${dailyXp ?? 80} XP Earned Today`}
            className="hidden xs:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] border border-amber-500/30 text-amber-200 font-semibold text-xs tracking-wide min-h-[36px]"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{dailyXp ?? 80}</span>
          </div>

          {/* Profile Avatar / Language badge */}
          <button
            id="btn-topbar-profile"
            onClick={() => onTabChange('profile')}
            title="Profile"
            className="flex items-center gap-1.5 p-1 sm:px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-white/80 transition-all cursor-pointer min-h-[36px]"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-amber-500/40" />
            ) : (
              <UserCircle className="w-5 h-5 text-[#C5A059]" />
            )}
            <span className="hidden md:inline font-serif text-[11px] text-[#C5A059]">
              {currentTradition.nativeScript}
            </span>
          </button>

          {/* Sound Controls */}
          <button
            id="btn-sound-mute-toggle"
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[36px]"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#C5A059]" />}
          </button>

          {/* Sign Out */}
          <button
            id="btn-sign-out"
            onClick={onSignOut}
            title="Sign Out"
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/50 hover:text-rose-400 hover:border-rose-400/30 hover:bg-rose-950/20 transition-colors cursor-pointer min-h-[36px]"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};