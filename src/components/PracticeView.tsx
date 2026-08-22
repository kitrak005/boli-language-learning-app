import React, { useState } from 'react';
import { Volume2, RotateCcw, CheckCircle2, Award, Sparkles, Brain, BookMarked } from 'lucide-react';
import { FlashcardItem, TraditionId } from '../types';
import { FLASHCARDS_DECK } from '../data/mockData';
import { sound } from '../utils/audio';

interface PracticeViewProps {
  currentTraditionId: TraditionId;
  onEarnXp: (amount: number) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ currentTraditionId, onEarnXp }) => {
  const [activeSubTab, setActiveSubTab] = useState<'flashcards' | 'alphabet'>('flashcards');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [deckFinished, setDeckFinished] = useState(false);

  const currentCard = FLASHCARDS_DECK[cardIndex] || FLASHCARDS_DECK[0];

  const handleFlip = () => {
    sound.playTileClick();
    setIsFlipped(!isFlipped);
  };

  const handlePronounce = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.speak(currentCard.script, currentCard.languageId);
  };

  const handleRateCard = (mastered: boolean) => {
    if (mastered) {
      sound.playSuccessChime();
      setMasteredCount((prev) => prev + 1);
      onEarnXp(10);
    } else {
      sound.playTileClick();
    }

    if (cardIndex < FLASHCARDS_DECK.length - 1) {
      setIsFlipped(false);
      setCardIndex((prev) => prev + 1);
    } else {
      setDeckFinished(true);
    }
  };

  const handleRestartDeck = () => {
    setCardIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setDeckFinished(false);
  };

  const DEVANAGARI_LETTERS = [
    { char: 'अ', iast: 'a', type: 'Vowel' },
    { char: 'आ', iast: 'ā', type: 'Vowel' },
    { char: 'इ', iast: 'i', type: 'Vowel' },
    { char: 'ई', iast: 'ī', type: 'Vowel' },
    { char: 'उ', iast: 'u', type: 'Vowel' },
    { char: 'ऊ', iast: 'ū', type: 'Vowel' },
    { char: 'ऋ', iast: 'ṛ', type: 'Vowel' },
    { char: 'क', iast: 'ka', type: 'Velar' },
    { char: 'ख', iast: 'kha', type: 'Velar' },
    { char: 'ग', iast: 'ga', type: 'Velar' },
    { char: 'घ', iast: 'gha', type: 'Velar' },
    { char: 'ङ', iast: 'ṅa', type: 'Nasal' },
    { char: 'च', iast: 'ca', type: 'Palatal' },
    { char: 'छ', iast: 'cha', type: 'Palatal' },
    { char: 'ज', iast: 'ja', type: 'Palatal' },
    { char: 'झ', iast: 'jha', type: 'Palatal' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
          MNEMONIC SANCTUARY
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-2 tracking-tight">
          Practice Studio
        </h1>
        <p className="text-sm sm:text-base text-white/60 font-light">
          Strengthen long-term retention through active recall flashcards and script tables.
        </p>
      </div>

      {/* Sub-Tabs: Flashcards & Script Alphabet */}
      <div className="flex justify-center">
        <div className="bg-[#141414] p-1 rounded-xl flex gap-1 border border-white/10">
          <button
            onClick={() => setActiveSubTab('flashcards')}
            className={`px-5 py-2 rounded-lg text-xs uppercase tracking-[0.15em] font-medium transition-all cursor-pointer ${
              activeSubTab === 'flashcards'
                ? 'bg-[#C5A059] text-[#0A0A0A] font-bold shadow-md shadow-[#C5A059]/20'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Daily Flashcards
          </button>
          <button
            onClick={() => setActiveSubTab('alphabet')}
            className={`px-5 py-2 rounded-lg text-xs uppercase tracking-[0.15em] font-medium transition-all cursor-pointer ${
              activeSubTab === 'alphabet'
                ? 'bg-[#C5A059] text-[#0A0A0A] font-bold shadow-md shadow-[#C5A059]/20'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Script Explorer
          </button>
        </div>
      </div>

      {activeSubTab === 'flashcards' ? (
        !deckFinished ? (
          <div className="space-y-6">
            {/* Progress counter */}
            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-semibold text-white/50">
              <span>CARD {cardIndex + 1} OF {FLASHCARDS_DECK.length}</span>
              <span className="text-[#C5A059]">{Math.round(((cardIndex + 1) / FLASHCARDS_DECK.length) * 100)}% COMPLETE</span>
            </div>

            {/* Flashcard Component with Tap to Flip */}
            <div
              id="interactive-flashcard"
              onClick={handleFlip}
              className="min-h-[320px] rounded-2xl p-8 flex flex-col justify-between items-center text-center cursor-pointer relative select-none group border border-white/15 bg-[#121212] transition-transform hover:-translate-y-1 shadow-2xl"
            >
              {/* Header inside card */}
              <div className="w-full flex justify-between items-center text-xs text-white/60">
                <span className="bg-white/5 px-3 py-1 rounded-full uppercase tracking-[0.15em] text-[10px] font-semibold border border-white/10 text-[#C5A059]">
                  {currentCard.partOfSpeech}
                </span>

                <button
                  onClick={handlePronounce}
                  title="Hear Pronunciation"
                  className="p-2 rounded-full hover:bg-white/10 text-[#C5A059] transition-colors"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Main Face Content */}
              {!isFlipped ? (
                <div className="my-auto space-y-3">
                  <h2 className="text-5xl sm:text-6xl font-normal text-[#C5A059] font-serif">
                    {currentCard.script}
                  </h2>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70 font-mono">
                    {currentCard.transliteration}
                  </p>
                  <p className="text-xs text-white/40 font-light pt-2">
                    Tap to reveal meaning & example
                  </p>
                </div>
              ) : (
                <div className="my-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                    {currentCard.meaning}
                  </h3>
                  <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-left">
                    <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em] mb-1">
                      Classical Example:
                    </p>
                    <p className="text-sm font-light text-white/90 font-serif">
                      {currentCard.exampleSentence}
                    </p>
                  </div>
                </div>
              )}

              {/* Footer instruction */}
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em]">
                {isFlipped ? 'Review Complete — Rate Below' : 'Tap Card to Flip'}
              </span>
            </div>

            {/* Mastery Rating Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRateCard(false)}
                className="py-3.5 px-4 rounded-lg border border-white/15 bg-white/5 text-white/80 hover:border-[#C5A059] hover:text-white text-xs font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer"
              >
                Still Learning
              </button>

              <button
                onClick={() => handleRateCard(true)}
                className="btn-gold py-3.5 px-4 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] transition-all cursor-pointer shadow-md"
              >
                Mastered (+10 XP)
              </button>
            </div>
          </div>
        ) : (
          /* Deck Complete Screen */
          <div className="bg-[#121212] rounded-2xl border border-white/15 p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-[#C5A059]/15 border-2 border-[#C5A059] text-[#C5A059] flex items-center justify-center mx-auto glow-gold">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-white">
              Review Session Complete!
            </h2>
            <p className="text-sm text-white/60 font-light">
              You reviewed {FLASHCARDS_DECK.length} classical terms and mastered {masteredCount}.
            </p>

            <button
              onClick={handleRestartDeck}
              className="btn-gold w-full py-3.5 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review Deck Again</span>
            </button>
          </div>
        )
      ) : (
        /* Script Alphabet Grid */
        <div className="space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
            {DEVANAGARI_LETTERS.map((item, idx) => (
              <div
                key={idx}
                onClick={() => sound.speak(item.char, currentTraditionId)}
                className="p-4 bg-[#171717] rounded-xl border border-white/10 hover:border-[#C5A059]/50 transition-all cursor-pointer text-center group shadow-sm flex flex-col items-center justify-center gap-1"
              >
                <span className="text-3xl font-serif text-white group-hover:text-[#C5A059] transition-colors">
                  {item.char}
                </span>
                <span className="text-xs font-mono text-white/60">{item.iast}</span>
                <span className="text-[9px] uppercase tracking-wider text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full font-medium mt-0.5 border border-[#C5A059]/20">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
