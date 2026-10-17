import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Volume2,
  RotateCcw,
  BookOpen,
  Award,
  Filter,
  Trash2,
  ArrowRight,
  Brain,
  HelpCircle,
  ShieldCheck,
  Check
} from 'lucide-react';
import { TraditionId } from '../types';
import { sound } from '../utils/audio';
import { GuruEmotion } from './IndianTeacher';
import {
  MistakeItem,
  getMistakesVault,
  resolveMistake,
  clearAllMistakes,
  logMistake
} from '../utils/mistakesVault';

interface MistakesVaultPanelProps {
  currentTraditionId: TraditionId;
  onEarnXp: (amount: number) => void;
  onUpdateTeacher?: (emotion: GuruEmotion, message: string) => void;
  onSwitchTab?: (tab: 'flashcards' | 'voicelab' | 'alphabet') => void;
}

export const MistakesVaultPanel: React.FC<MistakesVaultPanelProps> = ({
  currentTraditionId,
  onEarnXp,
  onUpdateTeacher,
  onSwitchTab,
}) => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | TraditionId>('all');
  const [activePracticeId, setActivePracticeId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [practiceFeedback, setPracticeFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [floatingXp, setFloatingXp] = useState<{ id: string; amount: number } | null>(null);

  // Sync state with local storage & custom event
  const loadVault = () => {
    setMistakes(getMistakesVault());
  };

  useEffect(() => {
    loadVault();

    const handleUpdate = () => {
      loadVault();
    };

    window.addEventListener('mistakes_vault_updated', handleUpdate);
    return () => window.removeEventListener('mistakes_vault_updated', handleUpdate);
  }, []);

  // Filtered by selected language tab
  const filteredMistakes = useMemo(() => {
    if (selectedLanguage === 'all') return mistakes;
    return mistakes.filter((m) => m.languageId === selectedLanguage);
  }, [mistakes, selectedLanguage]);

  // Audio pronunciation helper
  const handlePronounce = (scriptText: string, lang: TraditionId, translit?: string) => {
    sound.unlockAudio();
    sound.speak(scriptText, lang, undefined, undefined, translit);
    onUpdateTeacher?.('speaking', `Listening to sacred recitation: "${scriptText}"`);
  };

  // Generate plausible practice options for a mistake item
  const getPracticeOptions = (item: MistakeItem): string[] => {
    if (item.options && item.options.length >= 2) {
      // Use existing options (shuffled)
      const opts = [...item.options];
      return opts.sort(() => 0.5 - Math.random()).slice(0, 4);
    }

    // Default options using plausible distractors
    const correct = item.correctAnswer;
    const pool = [
      correct,
      item.userWrongAnswer && item.userWrongAnswer !== '(Incomplete)' && item.userWrongAnswer !== '(Empty)'
        ? item.userWrongAnswer
        : null,
      'अहं न जानामि',
      'कृपया पुनः वदतु',
      'शान्तिः शान्तिः',
      'सत्यमेव जयते',
      'धम्मं सरणं',
      'வணக்கம் நண்பா',
    ].filter(Boolean) as string[];

    const unique = Array.from(new Set(pool));
    return unique.slice(0, 3).sort(() => 0.5 - Math.random());
  };

  const handleStartPractice = (item: MistakeItem) => {
    sound.playTileClick();
    setActivePracticeId(item.id);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setPracticeFeedback(null);
    onUpdateTeacher?.('thinking', `Re-attempting: "${item.question}". Focus and recall.`);
  };

  const handleSelectPracticeOption = (item: MistakeItem, choice: string) => {
    if (practiceFeedback) return;
    sound.unlockAudio();
    setSelectedAnswer(choice);

    const isMatch = choice.trim().toLowerCase() === item.correctAnswer.trim().toLowerCase();
    if (isMatch) {
      sound.playSuccessChime();
      setPracticeFeedback('correct');
      handleMasterMistake(item);
    } else {
      sound.playErrorChime();
      setPracticeFeedback('wrong');
      onUpdateTeacher?.('encouraging', 'Not quite yet. Study the correct term and try once more.');
    }
  };

  const handleMasterMistake = (item: MistakeItem) => {
    sound.playSuccessChime();
    // Floating XP animation
    setFloatingXp({ id: item.id, amount: 10 });
    setTimeout(() => setFloatingXp(null), 1400);

    // Reward XP globally
    onEarnXp(10);
    onUpdateTeacher?.('happy', `साधु! (Sadhu!) +10 XP awarded! Mistake transformed into mastery.`);

    // Remove from vault after slight delay so user sees success feedback
    setTimeout(() => {
      resolveMistake(item.id);
      setActivePracticeId(null);
      setPracticeFeedback(null);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
    }, 600);
  };

  const handleClearVault = () => {
    if (window.confirm('Clear all mistakes in this language view?')) {
      clearAllMistakes(selectedLanguage === 'all' ? undefined : selectedLanguage);
      sound.playTileClick();
      onUpdateTeacher?.('namaste', 'Vault cleared. Your slate is completely clean.');
    }
  };

  // Seed sample mistake if user wants to demo the feature
  const handleSeedSample = () => {
    logMistake({
      source: 'lesson',
      languageId: currentTraditionId,
      question: currentTraditionId === 'sanskrit'
        ? 'Introduce two family members: "This is my mother; this is my father."'
        : currentTraditionId === 'pali'
        ? 'Translate polite request: "Please give me food."'
        : 'Translate: "This is my mother; this is my father."',
      userWrongAnswer: currentTraditionId === 'sanskrit' ? 'एषः मम माता' : currentTraditionId === 'pali' ? 'अहं भोजनं' : 'இது என் அம்மா',
      correctAnswer: currentTraditionId === 'sanskrit' ? 'एषा मम माता एषः मम पिता' : currentTraditionId === 'pali' ? 'कृपया भोजनं देहि' : 'இது என் அம்மா இது என் அப்பா',
      transliteration: currentTraditionId === 'sanskrit' ? 'eṣā mama mātā eṣaḥ mama pitā' : currentTraditionId === 'pali' ? 'kṛpayā bhojanaṁ dehi' : 'itu en ammā itu en appā',
      explanation: 'Notice gender concordance: feminine uses "एषा" while masculine uses "एषः".',
      options: currentTraditionId === 'sanskrit'
        ? ['एषा मम माता एषः मम पिता', 'एषः मम माता एषा मम पिता', 'मम माता मम पिता']
        : ['कृपया भोजनं देहि', 'अहं भोजनं इच्छामि', 'भोजनं नास्ति'],
    });
    sound.playTileClick();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#121212]/95 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Mistakes Vault
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#C5A059]/20 text-[#DFC386] border border-[#C5A059]/30">
                  +10 XP per Mastery
                </span>
              </div>
              <p className="text-xs text-white/60 font-light mt-0.5">
                Targeted review of past exercise slips to reinforce memory and transform weaknesses into wisdom.
              </p>
            </div>
          </div>

          {/* Quick Stats & Clear Action */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-white/40 block">Vault Slips</span>
              <span className="text-lg font-bold text-[#C5A059] font-mono">
                {filteredMistakes.length}
              </span>
            </div>

            {mistakes.length > 0 && (
              <button
                onClick={handleClearVault}
                title="Clear reviewed mistakes"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 hover:text-rose-300 text-white/40 border border-white/10 hover:border-rose-800/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs: All | Sanskrit | Pali | Tamil */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-1.5 p-1 bg-[#1A1A1A] rounded-xl border border-white/5">
            {(['all', 'sanskrit', 'pali', 'tamil'] as const).map((lang) => {
              const count = lang === 'all'
                ? mistakes.length
                : mistakes.filter((m) => m.languageId === lang).length;

              return (
                <button
                  key={lang}
                  onClick={() => {
                    sound.playTileClick();
                    setSelectedLanguage(lang);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLanguage === lang
                      ? 'bg-[#C5A059] text-black font-bold shadow-md'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <span>{lang === 'all' ? 'All Languages' : lang}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 rounded-full font-mono ${
                        selectedLanguage === lang ? 'bg-black/30 text-black' : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Practice All or Seed Sample */}
          {filteredMistakes.length === 0 && (
            <button
              onClick={handleSeedSample}
              className="text-[11px] text-[#C5A059] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Simulate exercise slip for demo</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mistakes Review List */}
      {filteredMistakes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredMistakes.map((item, index) => {
            const isPracticing = activePracticeId === item.id;
            const options = getPracticeOptions(item);

            return (
              <div
                key={item.id}
                id={`mistake-card-${item.id}`}
                className={`relative rounded-2xl border transition-all duration-300 p-5 sm:p-6 bg-[#141414] shadow-xl ${
                  isPracticing
                    ? 'border-[#C5A059] shadow-[0_0_25px_rgba(197,160,89,0.2)] bg-[#171717]'
                    : 'border-white/10 hover:border-[#C5A059]/40'
                }`}
              >
                {/* Floating XP Reward Indicator */}
                {floatingXp?.id === item.id && (
                  <div className="absolute top-2 right-8 z-30 pointer-events-none animate-bounce flex items-center gap-1 bg-[#C5A059] text-black px-3 py-1 rounded-full text-xs font-bold shadow-2xl">
                    <Sparkles className="w-4 h-4" />
                    <span>+{floatingXp.amount} XP Earned!</span>
                  </div>
                )}

                {/* Card Header: Source & Language Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/5 text-[#C5A059] border border-[#C5A059]/30">
                      {item.languageId}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-white/[0.03] text-white/40 border border-white/5">
                      {item.source.replace('_', ' ')}
                    </span>
                  </div>

                  <span className="text-[10px] text-white/30 font-mono">
                    Slip #{index + 1}
                  </span>
                </div>

                {/* Question Prompt */}
                <div className="mb-4">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold block mb-1">
                    CHALLENGE QUESTION
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl text-white font-medium leading-snug">
                    {item.question}
                  </h3>
                </div>

                {/* Wrong Answer vs Correct Answer Section */}
                {!isPracticing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Previous Wrong Attempt */}
                      {item.userWrongAnswer && (
                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30">
                          <span className="text-[10px] uppercase font-mono text-rose-400/70 block mb-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Your Previous Slip</span>
                          </span>
                          <p className="font-serif text-white/70 line-through text-sm sm:text-base">
                            {item.userWrongAnswer}
                          </p>
                        </div>
                      )}

                      {/* Correct Sacred Answer */}
                      <div className="p-3 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-[#DFC386] block mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#C5A059]" />
                            <span>Correct Mastered Form</span>
                          </span>
                          <p className="font-serif text-white font-bold text-base sm:text-lg text-[#F5E6C8]">
                            {item.correctAnswer}
                          </p>
                          {item.transliteration && (
                            <p className="text-[11px] font-mono text-[#C5A059]/80 mt-0.5">
                              {item.transliteration}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handlePronounce(item.correctAnswer, item.languageId, item.transliteration)}
                            title="Hear pronunciation"
                            className="p-1.5 rounded-full bg-white/5 hover:bg-[#C5A059]/20 text-[#C5A059] transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Grammatical Explanation */}
                    {item.explanation && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/60">
                        <span className="text-[#C5A059] font-semibold mr-1.5">Grammar Note:</span>
                        <span>{item.explanation}</span>
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleStartPractice(item)}
                        className="btn-gold px-5 py-2.5 rounded-xl text-black font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-[#C5A059]/20 hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Brain className="w-4 h-4" />
                        <span>Practice & Recall (+10 XP)</span>
                      </button>

                      <button
                        onClick={() => handleMasterMistake(item)}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-950/40 hover:text-emerald-300 text-white/60 border border-white/10 hover:border-emerald-600/40 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Mark as learned without quiz"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Mark Mastered (+10 XP)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active Interactive Practice / Re-Attempt Mode */
                  <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#C5A059] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Select the Correct Sequence / Answer</span>
                      </span>

                      <button
                        onClick={() => {
                          setActivePracticeId(null);
                          setPracticeFeedback(null);
                          setSelectedAnswer(null);
                        }}
                        className="text-xs text-white/40 hover:text-white px-2 py-1 bg-white/5 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Interactive Multiple Choices */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {options.map((opt, optIdx) => {
                        const isSelected = selectedAnswer === opt;
                        const isThisCorrect = opt.trim().toLowerCase() === item.correctAnswer.trim().toLowerCase();

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectPracticeOption(item, opt)}
                            disabled={practiceFeedback !== null}
                            className={`p-3.5 rounded-xl border text-left font-serif text-base sm:text-lg transition-all flex items-center justify-between cursor-pointer ${
                              isSelected && practiceFeedback === 'correct'
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : isSelected && practiceFeedback === 'wrong'
                                ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                                : 'bg-[#1C1C1E] border-white/10 text-white hover:border-[#C5A059] hover:bg-[#252528] active:scale-[0.99]'
                            }`}
                          >
                            <span className="leading-snug">{opt}</span>
                            {isSelected && practiceFeedback === 'correct' && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                            )}
                            {isSelected && practiceFeedback === 'wrong' && (
                              <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Audio clue button */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handlePronounce(item.correctAnswer, item.languageId, item.transliteration)}
                        className="text-xs text-[#C5A059] hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Hear Guru Pronunciation Clue</span>
                      </button>

                      <button
                        onClick={() => handleMasterMistake(item)}
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>I understand now, Mark Mastered</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State: Guru Vidyadhar Encouragement */
        <div className="bg-[#121212]/95 border border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 mx-auto flex items-center justify-center text-[#C5A059] mb-4 shadow-[0_0_25px_rgba(197,160,89,0.2)]">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-2">
            चित्तं प्रसन्नम् • SERENE MASTERY
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl text-white font-normal mb-3">
            The Sanctuary of Flawless Memory
          </h3>
          <p className="text-sm text-white/60 font-light max-w-md mx-auto mb-6 leading-relaxed">
            Your mistakes vault is currently empty! As you practice sacred sentence building, oral recitation, or flashcards, any question you find challenging will be safely preserved here for disciplined re-attempt and +10 XP rewards.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onSwitchTab?.('flashcards')}
              className="btn-gold px-6 py-3 rounded-xl text-black font-serif font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#C5A059]/20 hover:brightness-110 active:scale-95 transition-all"
            >
              Practice Flashcards
            </button>

            <button
              onClick={handleSeedSample}
              className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all"
            >
              Test Vault With Sample Slip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
