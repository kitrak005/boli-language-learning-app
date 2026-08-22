import React, { useState } from 'react';
import {
  Volume2,
  RotateCcw,
  CheckCircle2,
  Award,
  Sparkles,
  Brain,
  BookMarked,
  Mic,
  Activity,
  Flame,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { FlashcardItem, TraditionId } from '../types';
import { FLASHCARDS_DECK } from '../data/mockData';
import { sound } from '../utils/audio';
import { IndianTeacher, GuruEmotion } from './IndianTeacher';
import { PronunciationCoach } from './PronunciationCoach';
import { SpeechRecognitionResultData } from '../utils/speechRecognition';

interface PracticeViewProps {
  currentTraditionId: TraditionId;
  onEarnXp: (amount: number) => void;
}

interface VoiceLabItem {
  id: string;
  script: string;
  transliteration: string;
  english: string;
  traditionId: TraditionId;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Mastery';
}

const VOICE_LAB_CATALOG: VoiceLabItem[] = [
  {
    id: 'vl-1',
    script: 'सत्यमेव जयते',
    transliteration: 'satyam eva jayate',
    english: 'Truth alone triumphs',
    traditionId: 'sanskrit',
    category: 'Mundaka Upanishad',
    difficulty: 'Beginner',
  },
  {
    id: 'vl-2',
    script: 'तत्त्वमसि',
    transliteration: 'tat tvam asi',
    english: 'That thou art (You are the ultimate reality)',
    traditionId: 'sanskrit',
    category: 'Chandogya Upanishad',
    difficulty: 'Beginner',
  },
  {
    id: 'vl-3',
    script: 'शान्तिः शान्तिः शान्तिः',
    transliteration: 'śāntiḥ śāntiḥ śāntiḥ',
    english: 'Peace, peace, peace in all realms',
    traditionId: 'sanskrit',
    category: 'Shanti Mantra',
    difficulty: 'Beginner',
  },
  {
    id: 'vl-4',
    script: 'अहं ब्रह्मास्मि',
    transliteration: 'ahaṁ brahmāsmi',
    english: 'I am the absolute consciousness',
    traditionId: 'sanskrit',
    category: 'Brihadaranyaka',
    difficulty: 'Intermediate',
  },
  {
    id: 'vl-5',
    script: 'वसुधैव कुटुम्बकम्',
    transliteration: 'vasudhaiva kuṭumbakam',
    english: 'The whole earth is one single family',
    traditionId: 'sanskrit',
    category: 'Maha Upanishad',
    difficulty: 'Intermediate',
  },
  {
    id: 'vl-6',
    script: 'योगः कर्मसु कौशलम्',
    transliteration: 'yogaḥ karmasu kauśalam',
    english: 'Yoga is equanimity and excellence in action',
    traditionId: 'sanskrit',
    category: 'Bhagavad Gita 2.50',
    difficulty: 'Intermediate',
  },
  {
    id: 'vl-7',
    script: 'धम्मं सरणं गच्छामि',
    transliteration: 'dhammaṁ saraṇaṁ gacchāmi',
    english: 'I take refuge in the sacred Dhamma',
    traditionId: 'pali',
    category: 'Buddhist Canonical Refuge',
    difficulty: 'Beginner',
  },
  {
    id: 'vl-8',
    script: 'सब्बे सत्ता भवन्तु सुखितत्ता',
    transliteration: 'sabbe sattā bhavantu sukhitattā',
    english: 'May all sentient beings be happy and peaceful',
    traditionId: 'pali',
    category: 'Metta Sutta',
    difficulty: 'Mastery',
  },
  {
    id: 'vl-9',
    script: 'அன்பே சிவம்',
    transliteration: 'anbē civam',
    english: 'Love is the highest divine consciousness',
    traditionId: 'tamil',
    category: 'Thirumandhiram',
    difficulty: 'Beginner',
  },
  {
    id: 'vl-10',
    script: 'யாதும் ஊரே யாவரும் கேளிர்',
    transliteration: 'yādum ūrē yāvarum kēḷir',
    english: 'To us all towns are one, all humans our kin',
    traditionId: 'tamil',
    category: 'Sangam Purananuru 192',
    difficulty: 'Mastery',
  },
];

export const PracticeView: React.FC<PracticeViewProps> = ({ currentTraditionId, onEarnXp }) => {
  const [activeSubTab, setActiveSubTab] = useState<'flashcards' | 'voicelab' | 'alphabet'>('flashcards');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSpeechCoachOnCard, setShowSpeechCoachOnCard] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [deckFinished, setDeckFinished] = useState(false);
  const [teacherEmotion, setTeacherEmotion] = useState<GuruEmotion>('idle');
  const [teacherMessage, setTeacherMessage] = useState<string>(
    'Recite classical mantras or practice with speech recognition.'
  );

  // Voice Lab state
  const [selectedVoiceLabItem, setSelectedVoiceLabItem] = useState<VoiceLabItem>(VOICE_LAB_CATALOG[0]);
  const [voiceAssessmentsCount, setVoiceAssessmentsCount] = useState<number>(0);
  const [highestScore, setHighestScore] = useState<number>(0);

  // Alphabet test modal / state
  const [selectedLetterForVoice, setSelectedLetterForVoice] = useState<{ char: string; iast: string; type: string } | null>(null);

  const currentCard = FLASHCARDS_DECK[cardIndex] || FLASHCARDS_DECK[0];

  const handleFlip = () => {
    sound.playTileClick();
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setTeacherEmotion('thinking');
      setTeacherMessage(`In classical tradition: "${currentCard.meaning}"`);
    }
  };

  const handlePronounce = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.unlockAudio();
    setTeacherEmotion('speaking');
    sound.speak(
      currentCard.script,
      currentCard.languageId,
      () => setTeacherEmotion('speaking'),
      () => setTeacherEmotion('idle'),
      currentCard.transliteration
    );
  };

  const handleSpeechAssessment = (result: SpeechRecognitionResultData) => {
    setVoiceAssessmentsCount((prev) => prev + 1);
    setHighestScore((prev) => Math.max(prev, result.score));

    if (result.score >= 85) {
      onEarnXp(15);
      setTeacherEmotion('happy');
      setTeacherMessage(`उत्तमम्! ${result.score}% accuracy! You earned +15 XP for sacred recitation.`);
    } else if (result.score >= 65) {
      onEarnXp(10);
      setTeacherEmotion('happy');
      setTeacherMessage(`साधु! ${result.score}% match! You earned +10 XP.`);
    } else {
      setTeacherEmotion('encouraging');
      setTeacherMessage(`Keep practicing "${result.matchedTarget}". Repeat after the Guru.`);
    }
  };

  const handleRateCard = (mastered: boolean) => {
    if (mastered) {
      sound.playSuccessChime();
      setMasteredCount((prev) => prev + 1);
      setTeacherEmotion('happy');
      setTeacherMessage('अद्भुतम्! (Adbhutam!) Memory deepened.');
      onEarnXp(10);
    } else {
      sound.playTileClick();
      setTeacherEmotion('encouraging');
      setTeacherMessage('अभ्यासः (Practice) makes every mantra natural.');
    }

    if (cardIndex < FLASHCARDS_DECK.length - 1) {
      setIsFlipped(false);
      setShowSpeechCoachOnCard(false);
      setCardIndex((prev) => prev + 1);
    } else {
      setDeckFinished(true);
      setTeacherEmotion('namaste');
    }
  };

  const handleRestartDeck = () => {
    setCardIndex(0);
    setIsFlipped(false);
    setShowSpeechCoachOnCard(false);
    setMasteredCount(0);
    setDeckFinished(false);
    setTeacherEmotion('idle');
    setTeacherMessage('Let us begin our sacred review once more.');
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
    <div className="space-y-6 sm:space-y-8 max-w-2xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
          MNEMONIC & ORAL SANCTUARY
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-2 tracking-tight">
          Practice Studio
        </h1>
        <p className="text-sm sm:text-base text-white/60 font-light max-w-lg mx-auto">
          Strengthen long-term retention with active flashcards, live speech recognition feedback, and script tables.
        </p>
      </div>

      {/* Animated Teacher Companion */}
      <div className="w-full">
        <IndianTeacher
          emotion={teacherEmotion}
          customMessage={teacherMessage}
          size="sm"
          showBubble={true}
          interactive={true}
          onSpeak={() => handlePronounce()}
          className="mx-auto"
        />
      </div>

      {/* Sub-Tabs: Flashcards | Voice Lab | Script Explorer */}
      <div className="flex justify-center">
        <div className="bg-[#141414] p-1 rounded-xl flex flex-wrap gap-1 border border-white/10 max-w-full justify-center">
          <button
            id="tab-btn-flashcards"
            onClick={() => {
              sound.playTileClick();
              setActiveSubTab('flashcards');
            }}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs uppercase tracking-[0.15em] font-medium transition-all cursor-pointer ${
              activeSubTab === 'flashcards'
                ? 'bg-[#C5A059] text-[#0A0A0A] font-bold shadow-md shadow-[#C5A059]/20'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Flashcards
          </button>

          <button
            id="tab-btn-voicelab"
            onClick={() => {
              sound.playTileClick();
              setActiveSubTab('voicelab');
            }}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg text-xs uppercase tracking-[0.15em] font-medium transition-all cursor-pointer ${
              activeSubTab === 'voicelab'
                ? 'bg-[#C5A059] text-[#0A0A0A] font-bold shadow-md shadow-[#C5A059]/20'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Lab</span>
          </button>

          <button
            id="tab-btn-alphabet"
            onClick={() => {
              sound.playTileClick();
              setActiveSubTab('alphabet');
            }}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs uppercase tracking-[0.15em] font-medium transition-all cursor-pointer ${
              activeSubTab === 'alphabet'
                ? 'bg-[#C5A059] text-[#0A0A0A] font-bold shadow-md shadow-[#C5A059]/20'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Script Explorer
          </button>
        </div>
      </div>

      {/* TAB 1: Daily Flashcards with Integrated Speech Recognition */}
      {activeSubTab === 'flashcards' && (
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
              className="min-h-[300px] rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-center text-center cursor-pointer relative select-none group border border-white/15 bg-[#121212] transition-transform hover:-translate-y-1 shadow-2xl"
            >
              {/* Header inside card */}
              <div className="w-full flex justify-between items-center text-xs text-white/60">
                <span className="bg-white/5 px-3 py-1 rounded-full uppercase tracking-[0.15em] text-[10px] font-semibold border border-white/10 text-[#C5A059]">
                  {currentCard.partOfSpeech}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePronounce}
                    title="Hear Guru Pronunciation"
                    className="p-2 rounded-full hover:bg-white/10 text-[#C5A059] transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSpeechCoachOnCard(!showSpeechCoachOnCard);
                    }}
                    title="Speak and Assess Pronunciation with Microphone"
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      showSpeechCoachOnCard
                        ? 'bg-[#C5A059] text-black border-[#C5A059]'
                        : 'bg-white/5 border-white/10 text-[#C5A059] hover:bg-white/10'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{showSpeechCoachOnCard ? 'Hide Mic' : 'Speak'}</span>
                  </button>
                </div>
              </div>

              {/* Main Face Content */}
              {!isFlipped ? (
                <div className="my-auto space-y-3 py-4">
                  <h2 className="text-5xl sm:text-6xl font-normal text-[#C5A059] font-serif">
                    {currentCard.script}
                  </h2>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70 font-mono">
                    {currentCard.transliteration}
                  </p>
                  <p className="text-xs text-white/40 font-light pt-2 flex items-center justify-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#C5A059]" /> Tap to reveal meaning & flip
                  </p>
                </div>
              ) : (
                <div className="my-auto space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
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
                {isFlipped ? 'Review Complete — Rate or Speak Below' : 'Tap Card to Flip'}
              </span>
            </div>

            {/* Live Speech Recognition Pronunciation Coach Drawer on Flashcard */}
            {showSpeechCoachOnCard && (
              <div className="animate-in fade-in slide-in-from-top-3 duration-200">
                <PronunciationCoach
                  targetScript={currentCard.script}
                  targetTransliteration={currentCard.transliteration}
                  englishMeaning={currentCard.meaning}
                  languageId={currentCard.languageId}
                  onAssessmentComplete={handleSpeechAssessment}
                  onTeacherReaction={(emotion, message) => {
                    setTeacherEmotion(emotion);
                    setTeacherMessage(message);
                  }}
                />
              </div>
            )}

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
                className="btn-gold py-3.5 px-4 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] transition-all cursor-pointer shadow-md shadow-[#C5A059]/20"
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
              className="btn-gold w-full py-3.5 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#C5A059]/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review Deck Again</span>
            </button>
          </div>
        )
      )}

      {/* TAB 2: Dedicated Voice Lab (Speech Recognition Studio) */}
      {activeSubTab === 'voicelab' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Phrase Recitation & Microphone Assessment */}
          <div className="bg-[#121212] border border-[#C5A059]/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C5A059] block">
                  {selectedVoiceLabItem.category} • {selectedVoiceLabItem.difficulty}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-white mt-1">
                  {selectedVoiceLabItem.script}
                </h3>
                <p className="text-sm font-mono text-[#C5A059] mt-0.5">
                  {selectedVoiceLabItem.transliteration}
                </p>
                <p className="text-xs text-white/60 mt-1 font-light italic">
                  "{selectedVoiceLabItem.english}"
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-white/40 font-mono block">Tradition</span>
                <span className="text-xs font-bold uppercase text-[#C5A059]">
                  {selectedVoiceLabItem.traditionId}
                </span>
              </div>
            </div>

            {/* Dedicated Speech Recognition Coach */}
            <PronunciationCoach
              targetScript={selectedVoiceLabItem.script}
              targetTransliteration={selectedVoiceLabItem.transliteration}
              englishMeaning={selectedVoiceLabItem.english}
              languageId={selectedVoiceLabItem.traditionId}
              onAssessmentComplete={handleSpeechAssessment}
              onTeacherReaction={(emotion, message) => {
                setTeacherEmotion(emotion);
                setTeacherMessage(message);
              }}
            />
          </div>

          {/* Catalog of Sacred Classical Phrases to Recite */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-normal text-white">
                Select Phrase for Oral Practice
              </h4>
              <span className="text-xs text-white/40 font-mono">
                {VOICE_LAB_CATALOG.length} Verses Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VOICE_LAB_CATALOG.map((item) => {
                const isSelected = selectedVoiceLabItem.id === item.id;
                return (
                  <button
                    key={item.id}
                    id={`btn-select-phrase-${item.id}`}
                    onClick={() => {
                      sound.playTileClick();
                      setSelectedVoiceLabItem(item);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#C5A059]/15 border-[#C5A059] shadow-lg shadow-[#C5A059]/10'
                        : 'bg-[#151515] border-white/10 hover:border-white/20 hover:bg-[#1A1A1A]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isSelected ? 'text-[#C5A059]' : 'text-white/40'
                          }`}
                        >
                          {item.traditionId}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                          {item.difficulty}
                        </span>
                      </div>

                      <h5 className="font-serif text-lg text-white font-medium">
                        {item.script}
                      </h5>
                      <p className="text-xs font-mono text-white/60 mt-0.5">
                        {item.transliteration}
                      </p>
                    </div>

                    <p className="text-[11px] text-white/40 font-light truncate">
                      {item.english}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Script Alphabet Grid with Voice Recitation */}
      {activeSubTab === 'alphabet' && (
        <div className="space-y-6">
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white/60 flex items-center justify-between">
            <span>Tap any character to hear its resonance or test your speech recognition.</span>
            <span className="text-[#C5A059] font-semibold text-[11px] flex items-center gap-1">
              <Mic className="w-3.5 h-3.5" /> Live Mic Support
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DEVANAGARI_LETTERS.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#171717] rounded-xl border border-white/10 hover:border-[#C5A059]/50 transition-all text-center group shadow-sm flex flex-col items-center justify-center gap-1.5"
              >
                <span className="text-3xl font-serif text-white group-hover:text-[#C5A059] transition-colors">
                  {item.char}
                </span>
                <span className="text-xs font-mono text-white/60">{item.iast}</span>

                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => {
                      sound.unlockAudio();
                      setTeacherEmotion('speaking');
                      sound.speak(
                        item.char,
                        currentTraditionId,
                        () => setTeacherEmotion('speaking'),
                        () => setTeacherEmotion('idle'),
                        item.iast
                      );
                    }}
                    title="Listen to phoneme"
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-[#C5A059] transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      sound.playTileClick();
                      setSelectedLetterForVoice(item);
                    }}
                    title="Speak and test phoneme pronunciation"
                    className="p-1.5 rounded-full bg-white/5 hover:bg-[#C5A059] hover:text-black text-white/70 transition-colors cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Letter Pronunciation Test Modal / Drawer */}
          {selectedLetterForVoice && (
            <div className="p-5 bg-[#121212] border border-[#C5A059]/40 rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-serif text-[#C5A059]">
                    {selectedLetterForVoice.char}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Phoneme: "{selectedLetterForVoice.iast}" ({selectedLetterForVoice.type})
                    </h4>
                    <p className="text-xs text-white/50">Speak the single sound into the microphone</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLetterForVoice(null)}
                  className="text-xs text-white/50 hover:text-white px-2 py-1 bg-white/5 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>

              <PronunciationCoach
                targetScript={selectedLetterForVoice.char}
                targetTransliteration={selectedLetterForVoice.iast}
                languageId={currentTraditionId}
                onAssessmentComplete={handleSpeechAssessment}
                onTeacherReaction={(emotion, message) => {
                  setTeacherEmotion(emotion);
                  setTeacherMessage(message);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
