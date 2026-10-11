import React, { useState } from 'react';
import { Target, Zap, Trophy, Sparkles, CheckCircle, Edit3, Plus, Minus, Flame, ArrowUpRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface DailyGoalTrackerProps {
  dailyXp: number;
  maxDailyXp: number;
  streakDays: number;
  onUpdateGoal?: (newGoal: number) => void;
  onStartStudy?: () => void;
  onCelebrate?: () => void;
  className?: string;
}

const PRESET_GOALS = [
  { value: 15, label: 'Casual', desc: '1 lesson daily' },
  { value: 30, label: 'Scholar', desc: '2–3 lessons daily' },
  { value: 50, label: 'Devoted', desc: '4–5 lessons daily' },
  { value: 80, label: 'Rishi', desc: 'Mastery immersion' },
];

export const DailyGoalTracker: React.FC<DailyGoalTrackerProps> = ({
  dailyXp,
  maxDailyXp,
  streakDays,
  onUpdateGoal,
  onStartStudy,
  onCelebrate,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<number>(maxDailyXp || 20);

  const goal = maxDailyXp || selectedGoal || 20;
  const rawPercentage = (dailyXp / goal) * 100;
  const percentage = Math.min(100, Math.round(rawPercentage));
  const isGoalReached = dailyXp >= goal;
  const remainingXp = Math.max(0, goal - dailyXp);

  // SVG Circular progress mathematics
  const radius = 46;
  const circumference = 2 * Math.PI * radius; // ≈ 289.026
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleSelectPreset = (value: number) => {
    sound.playTileClick();
    setSelectedGoal(value);
    if (onUpdateGoal) {
      onUpdateGoal(value);
    }
  };

  const handleAdjustGoal = (delta: number) => {
    const nextVal = Math.max(5, Math.min(200, goal + delta));
    sound.playTileClick();
    setSelectedGoal(nextVal);
    if (onUpdateGoal) {
      onUpdateGoal(nextVal);
    }
  };

  const handleTriggerCelebrate = () => {
    sound.unlockAudio();
    sound.playSuccessChime();
    if (onCelebrate) {
      onCelebrate();
    }
  };

  return (
    <section
      id="daily-goal-section"
      className={`relative overflow-hidden rounded-2xl bg-[#121110] border border-amber-500/20 hover:border-amber-500/40 transition-all p-5 shadow-xl group ${className}`}
    >
      {/* Subtle background glow when achieved */}
      {isGoalReached && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#C5A059]/15 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C5A059] block">
              SĀDHANĀ RHYTHM
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-normal text-white">Daily XP Goal</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-edit-daily-goal"
            onClick={() => {
              sound.playTileClick();
              setIsEditing(!isEditing);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isEditing
                ? 'bg-[#C5A059] text-black border-[#C5A059] font-bold'
                : 'bg-white/5 text-white/70 border-white/10 hover:border-[#C5A059]/40 hover:text-white'
            }`}
            title="Adjust daily XP target"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done' : 'Set Goal'}</span>
          </button>
        </div>
      </div>

      {/* Main Tracker Layout: Circular Progress + Analytics */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Visual Circular Progress Indicator */}
          <div className="relative flex items-center justify-center select-none flex-shrink-0">
            <svg className="w-24 h-24 sm:w-28 sm:h-28 -rotate-90 transform" viewBox="0 0 110 110">
              <defs>
                <linearGradient id="gold-goal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#DFC386" />
                  <stop offset="50%" stopColor="#C5A059" />
                  <stop offset="100%" stopColor="#9C7733" />
                </linearGradient>
                <filter id="goal-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Track Circle */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                className="text-white/10 stroke-current"
                strokeWidth="8"
                fill="transparent"
              />

              {/* Glowing / Active Stroke Progress Circle */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                stroke="url(#gold-goal-grad)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
                filter={isGoalReached ? 'url(#goal-glow)' : undefined}
              />
            </svg>

            {/* Center Visual Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xl sm:text-2xl font-bold font-serif text-white leading-none">
                {percentage}%
              </span>
            </div>
          </div>

          {/* Narrative & Motivation Card */}
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="font-serif text-base sm:text-lg font-bold text-white leading-snug">
              {isGoalReached ? 'XP GOAL ACHIEVED' : `${percentage}% OF DAILY GOAL`}
            </h4>
            <p className="text-xs text-white/60">
              {dailyXp} / {goal} XP earned today
            </p>
            {isGoalReached && onCelebrate && (
              <button
                id="btn-celebrate-daily-goal"
                onClick={handleTriggerCelebrate}
                className="mt-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#DFC386] to-[#C5A059] text-black text-[10px] font-bold tracking-wide shadow-sm hover:brightness-110 transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                title="View Level Up celebration"
              >
                <Sparkles className="w-3 h-3" />
                <span>Celebrate ✨</span>
              </button>
            )}
          </div>
        </div>

        {/* Daily Goal Summary Header */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-white/50 block">
            DAILY GOAL SUMMARY
          </span>
          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase text-white/40 font-medium block">Streak</span>
              <span className="text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                <Flame className="w-3 h-3 text-[#C5A059] fill-[#C5A059]" /> {streakDays}d
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase text-white/40 font-medium block">Target</span>
              <span className="text-xs sm:text-sm font-bold text-[#C5A059] mt-0.5 block">{goal} XP</span>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase text-white/40 font-medium block">Earned</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5 block">+{dailyXp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Customizer / Preset Tier Selector Drawer */}
      {isEditing && (
        <div className="mt-6 pt-5 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A059]">
              Choose Your Daily Practice Intensity
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAdjustGoal(-5)}
                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 cursor-pointer"
                title="Decrease by 5 XP"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs font-mono font-bold text-white">{goal} XP</span>
              <button
                onClick={() => handleAdjustGoal(5)}
                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 cursor-pointer"
                title="Increase by 5 XP"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESET_GOALS.map((preset) => {
              const isSelected = goal === preset.value;
              return (
                <button
                  key={preset.value}
                  id={`btn-goal-preset-${preset.value}`}
                  onClick={() => handleSelectPreset(preset.value)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#C5A059]/15 border-[#C5A059] shadow-md shadow-[#C5A059]/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-[#C5A059]' : 'text-white/90'
                      }`}
                    >
                      {preset.label}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        isSelected ? 'text-[#C5A059]' : 'text-white/50'
                      }`}
                    >
                      {preset.value} XP
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block mt-1 font-light leading-tight">
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
