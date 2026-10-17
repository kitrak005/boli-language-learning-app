import React, { useState, useMemo } from 'react';
import { X, Heart, Volume2, Sparkles, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Award } from 'lucide-react';
import { Exercise, SkillNode, WordTile, TraditionId } from '../types';
import { sound } from '../utils/audio';
import { IndianTeacher, GuruEmotion } from './IndianTeacher';

interface LessonModalProps {
  node: SkillNode;
  currentTraditionId: TraditionId;
  onClose: () => void;
  onCompleteLesson: (xpEarned: number) => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ node, currentTraditionId, onClose, onCompleteLesson }) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  // Each placed tile gets a unique instanceId so the same word can be placed
  // more than once (needed whenever correctSequence repeats a word id, e.g.
  // "X and X"). Previously placedWords only tracked WordTile objects keyed
  // by their shared word.id, which both disabled re-clicking the same tile
  // AND made it impossible to render/remove duplicate copies independently.
  const [placedWords, setPlacedWords] = useState<{ instanceId: string; word: WordTile }[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [teacherEmotion, setTeacherEmotion] = useState<GuruEmotion>('idle');
  const [teacherTip, setTeacherTip] = useState<string>('Listen to each sacred term and arrange in harmony.');

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

  // Determine target sequence dynamically based on current exercise's word sequence
  const targetSlotSequence = useMemo(() => {
    if (Array.isArray(currentExercise?.correctSequence) && currentExercise.correctSequence.length > 0) {
      return currentExercise.correctSequence;
    }
    const text = currentExercise?.targetTranslation || currentExercise?.targetScript || '';
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const bank = currentExercise?.wordBank || [];
      return tokens.map((t, idx) => {
        const found = bank.find((b) => b.script === t || b.id === t);
        return found ? found.id : `token-${idx}`;
      });
    }
    return (currentExercise?.wordBank || []).map((w) => w.id);
  }, [currentExercise]);

  const totalSlotsNeeded = targetSlotSequence.length;

  // Dynamic slot sizing & font scale based on target sentence word count (e.g. 3 vs 6 vs 8-10 words)
  const slotDims = useMemo(() => {
    if (totalSlotsNeeded <= 4) {
      return {
        height: 'h-16 sm:h-20',
        minWidth: 'min-w-[80px] sm:min-w-[110px]',
        fontSize: 'text-xl sm:text-2xl',
        translitSize: 'text-[11px] sm:text-xs',
        padding: 'px-3 sm:px-5',
        bankBtnHeight: 'min-h-[58px] sm:min-h-[66px]',
        bankBtnPadding: 'px-4 sm:px-6 py-2 sm:py-2.5',
        bankFontSize: 'text-xl sm:text-2xl',
      };
    }
    if (totalSlotsNeeded <= 6) {
      return {
        height: 'h-14 sm:h-16',
        minWidth: 'min-w-[64px] sm:min-w-[86px]',
        fontSize: 'text-lg sm:text-xl',
        translitSize: 'text-[10px] sm:text-[11px]',
        padding: 'px-2.5 sm:px-4',
        bankBtnHeight: 'min-h-[52px] sm:min-h-[60px]',
        bankBtnPadding: 'px-3 sm:px-5 py-1.5 sm:py-2',
        bankFontSize: 'text-lg sm:text-xl',
      };
    }
    if (totalSlotsNeeded <= 8) {
      return {
        height: 'h-12 sm:h-14',
        minWidth: 'min-w-[54px] sm:min-w-[72px]',
        fontSize: 'text-base sm:text-lg',
        translitSize: 'text-[9px] sm:text-[10px]',
        padding: 'px-2 sm:px-3',
        bankBtnHeight: 'min-h-[46px] sm:min-h-[54px]',
        bankBtnPadding: 'px-2.5 sm:px-4 py-1 sm:py-1.5',
        bankFontSize: 'text-base sm:text-lg',
      };
    }
    // 9+ words
    return {
      height: 'h-11 sm:h-13',
      minWidth: 'min-w-[46px] sm:min-w-[62px]',
      fontSize: 'text-sm sm:text-base',
      translitSize: 'text-[8.5px]',
      padding: 'px-2 sm:px-2.5',
      bankBtnHeight: 'min-h-[42px] sm:min-h-[50px]',
      bankBtnPadding: 'px-2 sm:px-3.5 py-1',
      bankFontSize: 'text-sm sm:text-base',
    };
  }, [totalSlotsNeeded]);

  // Shuffle the word bank ONCE per exercise (keyed on currentExerciseIndex),
  // not on every render — otherwise tiles would visibly reorder themselves
  // every time the component re-renders (e.g. after placing a tile).
  const shuffledWordBank = useMemo(() => {
    const arr = [...currentExercise.wordBank];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex]);

  const progressPercent = Math.round(((currentExerciseIndex + 1) / exercises.length) * 100);

  const handlePlaceWord = (word: WordTile) => {
    if (feedbackStatus !== 'idle') return;
    if (placedWords.length >= totalSlotsNeeded) return;
    if (placedWords.some((p) => p.word.id === word.id)) return;

    sound.unlockAudio();
    sound.playTileClick();
    setTeacherEmotion('speaking');
    sound.speak(
      word.script,
      currentTraditionId,
      () => setTeacherEmotion('speaking'),
      () => setTeacherEmotion('idle'),
      word.transliteration
    );
    const instanceId = `${word.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPlacedWords([...placedWords, { instanceId, word }]);
  };

  const handleRemoveWord = (instanceId: string) => {
    if (feedbackStatus !== 'idle') return;
    sound.playTileClick();
    setPlacedWords(placedWords.filter((p) => p.instanceId !== instanceId));
  };

  const handleCheck = () => {
    if (placedWords.length === 0 || feedbackStatus !== 'idle') return;

    // 1. Check matching by tile IDs against targetSlotSequence
    const isIdMatch =
      placedWords.length === targetSlotSequence.length &&
      placedWords.every((p, idx) => p.word.id === targetSlotSequence[idx]);

    // 2. Fallback: compare by script text in case duplicate tiles (-dup, -dup2) were placed in alternative order
    const wordBankById = new Map(currentExercise.wordBank.map((w) => [w.id, w]));
    const correctScripts = targetSlotSequence.map((id) => wordBankById.get(id)?.script?.trim());
    const placedScripts = placedWords.map((p) => p.word.script?.trim());

    const isScriptMatch =
      placedScripts.length === correctScripts.length &&
      placedScripts.every((script, idx) => script === correctScripts[idx]);

    // 3. Normalized comparison (handling colon ':' vs visarga 'ः' and punctuation)
    const normalize = (s?: string) =>
      (s || '')
        .replace(/[:ः]/g, 'ः')
        .replace(/[.,;?!।॥]/g, '')
        .trim();

    const isNormalizedMatch =
      placedScripts.length === correctScripts.length &&
      placedScripts.every((script, idx) => normalize(script) === normalize(correctScripts[idx]));

    const isCorrect = isIdMatch || isScriptMatch || isNormalizedMatch;

    if (isCorrect) {
      sound.playSuccessChime();
      setFeedbackStatus('correct');
      setTeacherEmotion('happy');
      setTeacherTip('उत्तमम्! (Uttamam!) Wonderfully constructed!');
      setTotalXpEarned((prev) => prev + 15);
    } else {
      sound.playErrorChime();
      setFeedbackStatus('incorrect');
      setTeacherEmotion('encouraging');
      setTeacherTip('चिन्ता मा कुरु (Do not worry). Review the Sandhi and try again.');
      setHearts((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setPlacedWords([]);
      setFeedbackStatus('idle');
      setTeacherEmotion('idle');
      setTeacherTip('Observe the word order and subtle inflections.');
    } else {
      setIsCompleted(true);
      setTeacherEmotion('namaste');
      onCompleteLesson(totalXpEarned + 15);
    }
  };

  const handleRetry = () => {
    setPlacedWords([]);
    setFeedbackStatus('idle');
    setTeacherEmotion('thinking');
    setTeacherTip('Rearrange the tiles in classical subject-object-verb order.');
  };

  const handlePronouncePrompt = () => {
    sound.unlockAudio();
    const textToSpeak = currentExercise.targetScript || currentExercise.targetTranslation;
    setTeacherEmotion('speaking');
    sound.speak(
      textToSpeak,
      currentTraditionId,
      () => setTeacherEmotion('speaking'),
      () => setTeacherEmotion('idle'),
      currentExercise.targetTransliteration
    );
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
        <main className="flex-grow flex flex-col items-center justify-start sm:justify-center px-4 sm:px-8 w-full max-w-2xl mx-auto py-4 sm:py-6 pb-6 overflow-y-auto">
          {/* Animated 2D Indian Teacher Mascot Header */}
          <div className="w-full mb-4 sm:mb-6">
            <IndianTeacher
              emotion={teacherEmotion}
              customMessage={teacherTip}
              size="sm"
              showBubble={true}
              interactive={true}
              onSpeak={() => handlePronouncePrompt()}
              className="max-w-xl mx-auto"
            />
          </div>

          {/* Challenge Prompt */}
          <div className="w-full text-center mb-5 sm:mb-6 animate-in fade-in duration-200">
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
              SACRED TRANSLATION
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-white mb-2">
              {currentExercise.instruction}
            </h1>
            <div className="inline-flex items-center gap-2">
              <p className="text-lg sm:text-xl text-white/80 font-light">
                {currentExercise.promptText}
              </p>
              <button
                id="btn-pronounce-sentence"
                onClick={handlePronouncePrompt}
                title="Listen to Sanskrit pronunciation"
                className="p-2 rounded-full bg-white/5 text-[#C5A059] hover:bg-white/15 border border-white/10 hover:border-[#C5A059]/40 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Construction Area / Sentence Assembly Drop Zone Container */}
          <div
            className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 p-3.5 sm:p-5 bg-[#121212]/95 border border-white/10 rounded-2xl mb-5 sm:mb-6 shadow-2xl backdrop-blur-md transition-all duration-300"
            style={{ minHeight: totalSlotsNeeded > 5 ? '132px' : '110px' }}
          >
            {Array.from({ length: totalSlotsNeeded }).map((_, slotIndex) => {
              const placed = placedWords[slotIndex];
              const isNextSlot = slotIndex === placedWords.length;

              if (placed) {
                const { instanceId, word } = placed;
                return (
                  <div
                    key={instanceId}
                    id={`placed-tile-${instanceId}`}
                    onClick={() => handleRemoveWord(instanceId)}
                    className={`relative ${slotDims.height} ${slotDims.minWidth} ${slotDims.padding} bg-[#1C1C1E] border border-[#C5A059]/60 rounded-xl flex flex-col items-center justify-center cursor-pointer shadow-lg hover:border-rose-500 hover:bg-rose-950/20 active:scale-95 transition-all group overflow-hidden select-none animate-in zoom-in-95 duration-150`}
                    title="Click to remove word"
                  >
                    <span className={`leading-tight text-white font-serif font-medium text-center truncate max-w-full ${slotDims.fontSize}`}>
                      {word.script}
                    </span>
                    <span className={`text-[#C5A059]/90 font-mono tracking-wider text-center truncate max-w-full ${slotDims.translitSize}`}>
                      {word.transliteration}
                    </span>

                    {/* Hover overlay to remove */}
                    <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300" />
                    </div>

                    {/* Slot number index */}
                    <div className="absolute bottom-0.5 right-1 text-[8px] font-mono text-white/20 select-none">
                      {slotIndex + 1}
                    </div>
                  </div>
                );
              }

              // Empty interactive drop slot
              return (
                <div
                  key={`empty-slot-${slotIndex}`}
                  className={`relative ${slotDims.height} ${slotDims.minWidth} ${slotDims.padding} rounded-xl flex flex-col items-center justify-center transition-all duration-200 select-none ${
                    isNextSlot
                      ? 'border-2 border-dashed border-[#C5A059] bg-[#C5A059]/10 shadow-[0_0_15px_rgba(197,160,89,0.25)] animate-pulse'
                      : 'border-2 border-dashed border-white/15 bg-white/[0.02]'
                  }`}
                  title={isNextSlot ? 'Next word will drop here' : `Slot ${slotIndex + 1}`}
                >
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-medium tracking-wider transition-colors ${
                      isNextSlot ? 'text-[#C5A059]' : 'text-white/25'
                    }`}
                  >
                    {slotIndex + 1}
                  </span>
                  <div
                    className={`w-4 h-0.5 mt-1 rounded-full ${
                      isNextSlot ? 'bg-[#C5A059]' : 'bg-white/10'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Word Bank Tiles — shuffled per exercise. Duplicate words have unique IDs (-dup, -dup2)
              so each tile can only be placed once into a slot. */}
          <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-xl mx-auto px-1">
            {shuffledWordBank.map((word) => {
              const isTilePlaced = placedWords.some((p) => p.word.id === word.id);
              const allSlotsFilled = placedWords.length >= totalSlotsNeeded;

              return (
                <button
                  key={word.id}
                  id={`word-bank-${word.id}`}
                  onClick={() => handlePlaceWord(word)}
                  disabled={allSlotsFilled || isTilePlaced}
                  className={`relative ${slotDims.bankBtnHeight} ${slotDims.bankBtnPadding} rounded-xl flex flex-col items-center justify-center transition-all ${
                    isTilePlaced
                      ? 'bg-white/[0.02] text-white/20 opacity-30 cursor-not-allowed border border-white/5 scale-95'
                      : allSlotsFilled
                      ? 'bg-white/[0.03] text-white/30 opacity-40 cursor-not-allowed border border-white/10'
                      : 'bg-[#161616] border border-white/15 text-white hover:border-[#C5A059] hover:bg-[#1E1E1E] hover:shadow-[0_0_15px_rgba(197,160,89,0.2)] active:scale-95 cursor-pointer group shadow-lg'
                  }`}
                >
                  <span
                    className={`leading-tight text-white group-hover:text-[#C5A059] font-serif transition-colors truncate max-w-full ${slotDims.bankFontSize}`}
                  >
                    {word.script}
                  </span>
                  <span className="text-[10px] sm:text-xs text-white/50 group-hover:text-white/70 font-mono truncate max-w-full">
                    {word.transliteration}
                  </span>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        /* Victory Completion Screen with Celebrating Teacher */
        <main className="flex-grow flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto py-8 sm:py-12 animate-in zoom-in-95 duration-300">
          <div className="mb-4">
            <IndianTeacher
              emotion="happy"
              customMessage="विजयी भव! You have mastered this classical lesson with distinction!"
              size="lg"
              showBubble={true}
              interactive={true}
              className="mx-auto justify-center"
            />
          </div>

          <div className="w-full bg-[#121212] rounded-2xl border border-white/10 p-5 shadow-xl space-y-3 mb-6">
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
            className="btn-gold w-full py-4 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.2em] transition-all cursor-pointer shadow-lg shadow-[#C5A059]/20"
          >
            Return to Learning Path
          </button>
        </main>
      )}

      {/* Bottom Action / Feedback Area */}
      {!isCompleted && (
        <footer
          className={`w-full shrink-0 transition-all duration-300 z-50 p-4 sm:p-6 ${feedbackStatus === 'correct'
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
                  className={`w-full sm:w-64 py-3.5 rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 ${placedWords.length > 0
                    ? 'btn-gold cursor-pointer shadow-lg shadow-[#C5A059]/20'
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