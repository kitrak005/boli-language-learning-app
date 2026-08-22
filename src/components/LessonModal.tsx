import React, { useState } from 'react';
import { X, Heart, Volume2, Sparkles, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Award } from 'lucide-react';
import { Exercise, SkillNode, WordTile } from '../types';
import { sound } from '../utils/audio';

interface LessonModalProps {
  node: SkillNode;
  onClose: () => void;
  onCompleteLesson: (xpEarned: number) => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ node, onClose, onCompleteLesson }) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [placedWords, setPlacedWords] = useState<WordTile[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(0);

  // Fallback default exercise if none provided in node
  const defaultExercise: Exercise = {
    id: 'default-ex',
    type: 'translate',
    instruction: 'Translate this sentence',
    promptText: 'I am knowledge.',
    targetTranslation: 'अहम् ज्ञानम् अस्मि',
    targetScript: 'अहम् ज्ञानम् अस्मि',
    targetTransliteration: 'aham jñānam asmi',
    wordBank: [
      { id: 'w-aham', script: 'अहम्', transliteration: 'aham', english: 'I' },
      { id: 'w-jnanam', script: 'ज्ञानम्', transliteration: 'jñānam', english: 'knowledge' },
      { id: 'w-asmi', script: 'अस्मि', transliteration: 'asmi', english: 'am' },
      { id: 'w-gacchami', script: 'गच्छामि', transliteration: 'gacchāmi', english: 'I go' },
    ],
    correctSequence: ['w-aham', 'w-jnanam', 'w-asmi'],
    explanation: 'अहम् (aham = I) + ज्ञानम् (jñānam = knowledge) + अस्मि (asmi = am).',
    culturalContext: 'In classical Indian epistemology, self and knowledge unite in sacred discourse.',
  };

  const exercises = node.exercises.length > 0 ? node.exercises : [defaultExercise];
  const currentExercise = exercises[currentExerciseIndex] || defaultExercise;

  const progressPercent = Math.round(((currentExerciseIndex + 1) / exercises.length) * 100);

  const handlePlaceWord = (word: WordTile) => {
    if (feedbackStatus !== 'idle') return;
    if (placedWords.some((w) => w.id === word.id)) return;

    sound.playTileClick();
    sound.speak(word.script);
    setPlacedWords([...placedWords, word]);
  };

  const handleRemoveWord = (wordId: string) => {
    if (feedbackStatus !== 'idle') return;
    sound.playTileClick();
    setPlacedWords(placedWords.filter((w) => w.id !== wordId));
  };

  const handleCheck = () => {
    if (placedWords.length === 0 || feedbackStatus !== 'idle') return;

    const placedIds = placedWords.map((w) => w.id);
    const isCorrect =
      placedIds.length === currentExercise.correctSequence.length &&
      placedIds.every((id, idx) => id === currentExercise.correctSequence[idx]);

    if (isCorrect) {
      sound.playSuccessChime();
      setFeedbackStatus('correct');
      setTotalXpEarned((prev) => prev + 15);
    } else {
      sound.playErrorChime();
      setFeedbackStatus('incorrect');
      setHearts((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setPlacedWords([]);
      setFeedbackStatus('idle');
    } else {
      setIsCompleted(true);
      onCompleteLesson(totalXpEarned + 15);
    }
  };

  const handleRetry = () => {
    setPlacedWords([]);
    setFeedbackStatus('idle');
  };

  const handlePronouncePrompt = () => {
    sound.speak(currentExercise.targetScript || currentExercise.targetTranslation);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#C5A059] selection:text-black">
      {/* Top Header / Progress Shell */}
      <header className="w-full flex justify-between items-center px-4 sm:px-8 h-16 pt-2 max-w-4xl mx-auto border-b border-white/10">
        <button
          id="btn-close-lesson"
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-grow mx-4 max-w-lg">
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C5A059] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center text-rose-400 text-xs font-bold gap-1 px-3 py-1 bg-rose-950/40 rounded-full border border-rose-800/40">
          <span>{hearts}</span>
          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
        </div>
      </header>

      {/* Main Interactive Canvas */}
      {!isCompleted ? (
        <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-8 w-full max-w-2xl mx-auto pb-32">
          {/* Challenge Prompt */}
          <div className="w-full text-center mb-6 sm:mb-8 animate-in fade-in duration-200">
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
              SACRED TRANSLATION
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-white mb-2">
              {currentExercise.instruction}
            </h1>
            <div className="inline-flex items-center gap-2">
              <p className="text-lg sm:text-xl text-white/70 font-light">
                {currentExercise.promptText}
              </p>
              <button
                id="btn-pronounce-sentence"
                onClick={handlePronouncePrompt}
                title="Listen to Sanskrit"
                className="p-1.5 rounded-full bg-white/5 text-[#C5A059] hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Construction Area */}
          <div className="w-full min-h-[128px] flex flex-wrap items-center justify-center gap-3 p-4 sm:p-6 bg-[#121212] border border-white/10 rounded-2xl mb-8 shadow-2xl">
            {/* Active Placed Tiles */}
            {placedWords.map((word) => (
              <div
                key={word.id}
                id={`placed-tile-${word.id}`}
                onClick={() => handleRemoveWord(word.id)}
                className="h-16 px-5 bg-[#1C1C1E] border border-[#C5A059]/40 rounded-xl flex flex-col items-center justify-center cursor-pointer shadow-md relative overflow-hidden group hover:border-rose-500 transition-all"
              >
                <span className="text-2xl leading-tight text-white font-serif">
                  {word.script}
                </span>
                <span className="text-[11px] text-[#C5A059]/80 font-mono tracking-wider">{word.transliteration}</span>

                {/* Hover overlay to remove */}
                <div className="absolute inset-0 bg-rose-950/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-5 h-5 text-rose-300" />
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({
              length: Math.max(0, currentExercise.correctSequence.length - placedWords.length),
            }).map((_, idx) => (
              <div
                key={`empty-slot-${idx}`}
                className={`h-16 w-28 border-b-2 flex items-center justify-center transition-colors ${
                  idx === 0 ? 'border-[#C5A059]' : 'border-white/20'
                }`}
              />
            ))}
          </div>

          {/* Word Bank Tiles */}
          <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {currentExercise.wordBank.map((word) => {
              const isPlaced = placedWords.some((w) => w.id === word.id);

              return (
                <button
                  key={word.id}
                  id={`word-bank-${word.id}`}
                  onClick={() => handlePlaceWord(word)}
                  disabled={isPlaced}
                  className={`h-[72px] px-6 sm:px-8 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isPlaced
                      ? 'bg-white/[0.02] text-white/20 opacity-30 cursor-not-allowed border border-white/5'
                      : 'bg-[#161616] border border-white/15 text-white hover:border-[#C5A059] hover:bg-[#1E1E1E] active:scale-95 cursor-pointer group shadow-lg'
                  }`}
                >
                  <span className="text-2xl sm:text-[26px] leading-tight text-white group-hover:text-[#C5A059] font-serif transition-colors">
                    {word.script}
                  </span>
                  <span className="text-xs text-white/50 group-hover:text-white/70 font-mono">{word.transliteration}</span>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        /* Victory Completion Screen */
        <main className="flex-grow flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto py-12 animate-in zoom-in-95 duration-300">
          <div className="w-24 h-24 rounded-full bg-[#C5A059]/15 border-2 border-[#C5A059] flex items-center justify-center mb-6 glow-gold shadow-2xl">
            <Award className="w-12 h-12 text-[#C5A059]" />
          </div>

          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
            SACRED REVELATION COMPLETE
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-2">
            Lesson Completed
          </h2>
          <p className="text-sm text-white/60 mb-6 font-light">
            You have deepened your resonance with the classical canon.
          </p>

          <div className="w-full bg-[#121212] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4 mb-8">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-xs uppercase tracking-wider text-white/60">Total XP Earned</span>
              <span className="text-lg font-bold text-[#C5A059]">+{totalXpEarned + 15} XP</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-xs uppercase tracking-wider text-white/60">Daily Streak</span>
              <span className="text-lg font-bold text-white">4 Days 🔥</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs uppercase tracking-wider text-white/60">Accuracy</span>
              <span className="text-lg font-bold text-[#C5A059]">100%</span>
            </div>
          </div>

          <button
            id="btn-finish-lesson"
            onClick={onClose}
            className="btn-gold w-full py-4 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.2em] transition-all cursor-pointer shadow-lg"
          >
            Return to Learning Path
          </button>
        </main>
      )}

      {/* Bottom Action / Feedback Area */}
      {!isCompleted && (
        <footer
          className={`fixed bottom-0 left-0 w-full transition-all duration-300 z-50 p-4 sm:p-6 ${
            feedbackStatus === 'correct'
              ? 'bg-[#0d2818] border-t border-[#1e6f43]'
              : feedbackStatus === 'incorrect'
              ? 'bg-[#2a0e0e] border-t border-[#7f1d1d]'
              : 'bg-[#0A0A0A]/95 backdrop-blur-md border-t border-white/10'
          }`}
        >
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            {feedbackStatus === 'idle' ? (
              <>
                <button
                  id="btn-skip-exercise"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-full text-xs font-semibold text-white/50 hover:text-white uppercase tracking-[0.15em] cursor-pointer"
                >
                  Skip
                </button>

                <button
                  id="btn-check-exercise"
                  onClick={handleCheck}
                  disabled={placedWords.length === 0}
                  className={`w-full sm:w-64 py-3.5 rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
                    placedWords.length > 0
                      ? 'btn-gold cursor-pointer'
                      : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  Check
                </button>
              </>
            ) : feedbackStatus === 'correct' ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold text-emerald-300 text-lg">
                      Excellent! +15 XP
                    </h4>
                    {currentExercise.explanation && (
                      <p className="text-xs text-emerald-300/80 mt-0.5 max-w-md">
                        {currentExercise.explanation}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  id="btn-feedback-next"
                  onClick={handleNext}
                  className="w-full sm:w-48 py-3.5 rounded-lg bg-emerald-500 text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-emerald-400 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold text-rose-300 text-lg">
                      Not quite right
                    </h4>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      Correct sequence:{' '}
                      <span className="font-serif text-white font-medium">{currentExercise.targetTranslation}</span>
                    </p>
                  </div>
                </div>

                <button
                  id="btn-feedback-retry"
                  onClick={handleRetry}
                  className="w-full sm:w-48 py-3.5 rounded-lg bg-rose-600 text-white text-xs font-bold uppercase tracking-[0.15em] hover:bg-rose-500 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
