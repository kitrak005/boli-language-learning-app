import React, { useState } from 'react';
import { BookOpen, Volume2, Sparkles, ChevronRight, Layers, Bookmark } from 'lucide-react';
import { ClassicalVerse, TraditionId } from '../types';
import { CLASSICAL_VERSES } from '../data/mockData';
import { sound } from '../utils/audio';

interface ExploreViewProps {
  currentTraditionId: TraditionId;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ currentTraditionId }) => {
  const [selectedVerseId, setSelectedVerseId] = useState<string>(CLASSICAL_VERSES[0].id);
  const [showWordAnalysis, setShowWordAnalysis] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedVerse =
    CLASSICAL_VERSES.find((v) => v.id === selectedVerseId) || CLASSICAL_VERSES[0];

  const handlePlayRecital = () => {
    setIsPlaying(true);
    sound.speak(selectedVerse.script, selectedVerse.traditionId);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center sm:text-left">
        <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
          PRIMARY SOURCES
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-2 tracking-tight">
          Classical Library
        </h1>
        <p className="text-sm sm:text-base text-white/60 font-light">
          Study primary sources with word-by-word grammatical analysis and recitation.
        </p>
      </div>

      {/* Manuscript Verse Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CLASSICAL_VERSES.map((verse) => {
          const isSelected = verse.id === selectedVerse.id;
          return (
            <button
              key={verse.id}
              onClick={() => {
                sound.playTileClick();
                setSelectedVerseId(verse.id);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em] font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#C5A059] text-[#0A0A0A] font-bold shadow-md shadow-[#C5A059]/20'
                  : 'bg-[#141414] text-white/60 border border-white/10 hover:border-[#C5A059]/40 hover:text-white'
              }`}
            >
              {verse.workTitle} ({verse.verseRef})
            </button>
          );
        })}
      </div>

      {/* Manuscript Reader Card */}
      <article className="rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden bg-[#121212] border border-white/15 shadow-2xl">
        {/* Header with Title & Audio */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">
              {selectedVerse.chapter}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-white mt-0.5">
              {selectedVerse.workTitle} — {selectedVerse.verseRef}
            </h2>
          </div>

          <button
            onClick={handlePlayRecital}
            className={`btn-gold flex items-center gap-2 px-5 py-2.5 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] cursor-pointer shadow-md ${
              isPlaying ? 'ring-2 ring-white scale-105' : ''
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Recite Verse</span>
          </button>
        </div>

        {/* Primary Sacred Script */}
        <div className="py-6 text-center space-y-3 bg-black/60 rounded-xl p-6 border border-white/10">
          <p className="text-2xl sm:text-3xl leading-relaxed text-[#C5A059] font-normal font-serif whitespace-pre-line">
            {selectedVerse.script}
          </p>
          <p className="text-sm sm:text-base italic text-white/60 leading-relaxed whitespace-pre-line font-light">
            {selectedVerse.transliteration}
          </p>
        </div>

        {/* Translation */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Philosophical Translation
          </h3>
          <p className="text-base sm:text-lg text-white/90 leading-relaxed font-serif font-light">
            "{selectedVerse.translation}"
          </p>
        </div>

        {/* Word-by-word Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
              Word-by-Word Sandhi Breakdown
            </h3>
            <button
              onClick={() => setShowWordAnalysis(!showWordAnalysis)}
              className="text-xs font-semibold text-[#C5A059] hover:underline cursor-pointer"
            >
              {showWordAnalysis ? 'Hide breakdown' : 'Show breakdown'}
            </button>
          </div>

          {showWordAnalysis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in duration-200">
              {selectedVerse.wordByWord.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => sound.speak(item.word, selectedVerse.traditionId)}
                  className="p-3.5 bg-[#171717] rounded-xl border border-white/10 hover:border-[#C5A059]/50 transition-all cursor-pointer flex justify-between items-center group shadow-sm"
                >
                  <div>
                    <span className="text-base font-serif text-white group-hover:text-[#C5A059] transition-colors">
                      {item.word}
                    </span>
                    <span className="text-xs text-white/40 block font-light">
                      {item.transliteration}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-white/70 text-right">
                    {item.meaning}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Philosophical Note */}
        <div className="bg-gradient-to-br from-[#161410] to-[#0F0E0C] border border-[#C5A059]/30 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commentary & Meaning</span>
          </div>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
            {selectedVerse.philosophicalNote}
          </p>
        </div>
      </article>
    </div>
  );
};
