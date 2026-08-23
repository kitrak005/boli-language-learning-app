import React, { useState } from 'react';
import { Star, Flame, Sparkles, Award, Settings, Check, Volume2 } from 'lucide-react';
import { UserProfile } from '../types';
import { WeeklyXpD3Chart } from './WeeklyXpD3Chart';

interface ProfileViewProps {
  profile: UserProfile;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile }) => {
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Profile Content */}
      <div className="space-y-7">
        {/* Profile Bento Summary */}
        <section className="grid grid-cols-2 gap-4">
          {/* Avatar Card */}
          <div className="col-span-2 flex items-center gap-4 p-5 sm:p-6 bg-[#121212] rounded-2xl shadow-xl border border-white/10">
            <div
              className="w-[68px] h-[68px] rounded-full bg-cover bg-center shrink-0 border-2 border-[#C5A059] shadow-md"
              style={{
                backgroundImage: `url('${profile.avatarUrl}')`,
              }}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em]">
                {profile.scholarLevel}
              </span>
              <h2 className="font-serif text-2xl font-normal text-white tracking-tight">
                {profile.name}
              </h2>
              <span className="text-xs text-white/60 font-light">{profile.roleTitle}</span>
            </div>
          </div>

          {/* Total XP */}
          <div className="col-span-1 bg-[#161616] rounded-2xl p-4 sm:p-5 flex flex-col justify-center shadow-lg border border-white/10">
            <div className="flex items-center gap-1.5 text-[#C5A059] mb-1">
              <Star className="w-4 h-4 fill-[#C5A059] text-[#C5A059]" />
              <span className="text-[10px] font-bold text-white/50 tracking-[0.15em] uppercase">TOTAL XP</span>
            </div>
            <span className="font-serif text-2xl font-normal text-white">
              {profile.totalXp.toLocaleString()}
            </span>
          </div>

          {/* Current Streak */}
          <div className="col-span-1 bg-[#161616] rounded-2xl p-4 sm:p-5 flex flex-col justify-center shadow-lg border border-white/10">
            <div className="flex items-center gap-1.5 text-[#C5A059] mb-1">
              <Flame className="w-4 h-4 fill-[#C5A059] text-[#C5A059]" />
              <span className="text-[10px] font-bold text-white/50 tracking-[0.15em] uppercase">STREAK</span>
            </div>
            <span className="font-serif text-2xl font-normal text-[#C5A059]">
              {profile.streakDays} {profile.streakDays === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </section>

        {/* 7-Day Consistency & XP Progress D3 Chart */}
        <WeeklyXpD3Chart
          data={profile.weeklyXpHistory}
          dailyXp={profile.dailyXp}
          maxDailyXp={profile.maxDailyXp}
          streakDays={profile.streakDays}
        />

        {/* Language Mastery */}
        <section className="space-y-4">
          <h3 className="font-serif text-xl font-normal text-white">Language Mastery</h3>

          <div className="space-y-3">
            {/* Sanskrit */}
            <div className="bg-[#121212] rounded-xl p-4 border border-white/10 shadow-md flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/90">Sanskrit (संस्कृतम्)</span>
                <span className="text-xs font-bold text-[#C5A059]">
                  {profile.languageMastery.sanskrit}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C5A059] rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${profile.languageMastery.sanskrit}%` }}
                />
              </div>
            </div>

            {/* Pali */}
            <div className="bg-[#121212] rounded-xl p-4 border border-white/10 shadow-md flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/90">Pali (पालि)</span>
                <span className="text-xs font-bold text-[#C5A059]">
                  {profile.languageMastery.pali}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C5A059]/80 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${profile.languageMastery.pali}%` }}
                />
              </div>
            </div>

            {/* Classical Tamil */}
            <div className="bg-[#121212] rounded-xl p-4 border border-white/10 shadow-md flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                  Classical Tamil (செந்தமிழ்)
                </span>
                <span className="text-xs font-bold text-[#C5A059]">
                  {profile.languageMastery.tamil}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C5A059]/60 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${profile.languageMastery.tamil}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Recent Triumphs */}
        <section className="space-y-4">
          <h3 className="font-serif text-xl font-normal text-white">Recent Triumphs</h3>

          <div className="grid grid-cols-3 gap-3">
            {profile.achievements.slice(0, 3).map((achievement) => (
              <div
                key={achievement.id}
                className="bg-[#161616] rounded-2xl p-4 flex flex-col items-center text-center gap-2.5 border border-white/10 shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C5A059] shadow-xs">
                  {achievement.id === 'first-lesson' ? (
                    <Sparkles className="w-5 h-5 text-[#C5A059]" />
                  ) : achievement.id === '50-words' ? (
                    <Award className="w-5 h-5 text-[#C5A059]" />
                  ) : (
                    <Star className="w-5 h-5 text-[#C5A059] fill-[#C5A059]" />
                  )}
                </div>
                <span className="text-xs font-medium text-white/70 leading-tight">
                  {achievement.title}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Learning Preferences */}
        <section className="space-y-3 pt-2">
          <h3 className="font-serif text-lg font-normal text-white">Study Preferences</h3>
          <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 space-y-4 shadow-sm">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Show IAST Transliteration</p>
                <p className="text-xs text-white/50 font-light">Displays Romanized phonetic markers (jñānam, aham)</p>
              </div>
              <input
                type="checkbox"
                checked={showTransliteration}
                onChange={(e) => setShowTransliteration(e.target.checked)}
                className="w-4 h-4 rounded text-[#C5A059] focus:ring-[#C5A059] accent-[#C5A059]"
              />
            </label>

            <div className="border-t border-white/10" />

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Chime & Speech Pronunciation</p>
                <p className="text-xs text-white/50 font-light">Audio playback on Sanskrit and Tamil terms</p>
              </div>
              <input
                type="checkbox"
                checked={soundEffectsEnabled}
                onChange={(e) => setSoundEffectsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-[#C5A059] focus:ring-[#C5A059] accent-[#C5A059]"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};