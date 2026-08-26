import React, { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, XCircle, Lightbulb, BookOpen, Loader2, ImageOff } from 'lucide-react';
import { TraditionId } from '../types';
import { sound } from '../utils/audio';

interface QuizOption {
    text: string;
    isCorrect: boolean;
}

interface QuizQuestion {
    targetLanguage: string;
    difficulty: string;
    category: string;
    englishWord: string;
    nativeWord: string;
    pronunciation: string;
    question: string;
    options: QuizOption[];
    imagePrompt: string;
    explanation: string;
    memoryTip: string;
    culturalNote: string;
    imageUrl: string | null;
}

interface PictureQuizGameProps {
    currentTraditionId: TraditionId;
    onEarnXp: (amount: number) => void;
}

export const PictureQuizGame: React.FC<PictureQuizGameProps> = ({ currentTraditionId, onEarnXp }) => {
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [shuffledOptions, setShuffledOptions] = useState<QuizOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);

    const shuffleOptions = (options: QuizOption[]): QuizOption[] => {
        const arr = [...options];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const fetchQuestion = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setIsAnswered(false);
        setSelectedIndex(null);

        try {
            const res = await fetch('/api/picture-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: currentTraditionId }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || `Server returned ${res.status}`);
            }

            const data: QuizQuestion = await res.json();

            if (!data.options || data.options.length !== 4) {
                throw new Error('Received an incomplete question. Please try again.');
            }

            setQuestion(data);
            setShuffledOptions(shuffleOptions(data.options));
        } catch (err: any) {
            console.error('Error fetching picture quiz question:', err);
            setError(err.message || 'Could not load a question. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [currentTraditionId]);

    React.useEffect(() => {
        fetchQuestion();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTraditionId]);

    const handleSelectOption = (idx: number) => {
        if (isAnswered || !question) return;

        sound.unlockAudio();
        setSelectedIndex(idx);
        setIsAnswered(true);
        setQuestionsAnswered((prev) => prev + 1);

        const correct = shuffledOptions[idx].isCorrect;
        if (correct) {
            sound.playSuccessChime();
            setScore((prev) => prev + 1);
            setStreak((prev) => prev + 1);
            onEarnXp(10);
        } else {
            sound.playErrorChime();
            setStreak(0);
        }
    };

    const handlePronounce = () => {
        if (!question) return;
        sound.unlockAudio();
        sound.speak(question.nativeWord, currentTraditionId, undefined, undefined, question.pronunciation);
    };

    if (isLoading && !question) {
        return (
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 min-h-[400px]">
                <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                <p className="text-sm text-white/50">Conjuring a new picture quiz...</p>
            </div>
        );
    }

    if (error && !question) {
        return (
            <div className="bg-[#121212] border border-rose-800/40 rounded-2xl p-8 text-center space-y-4">
                <XCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm text-rose-300">{error}</p>
                <button
                    onClick={fetchQuestion}
                    className="btn-gold px-5 py-2.5 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] cursor-pointer"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!question) return null;

    return (
        <div className="space-y-4">
            {/* Score bar */}
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-white/50">
                <span>
                    Score: <span className="text-[#C5A059]">{score}</span> / {questionsAnswered}
                </span>
                {streak > 1 && (
                    <span className="flex items-center gap-1 text-[#C5A059]">
                        <Sparkles className="w-3.5 h-3.5" />
                        {streak} streak!
                    </span>
                )}
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Image */}
                <div className="w-full aspect-square sm:aspect-[16/9] bg-[#0A0A0A] flex items-center justify-center relative">
                    {question.imageUrl ? (
                        <img
                            src={question.imageUrl}
                            alt="Guess this word"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-white/20">
                            <ImageOff className="w-10 h-10" />
                            <span className="text-xs">Image unavailable this round</span>
                        </div>
                    )}
                    {question.difficulty && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 border border-[#C5A059]/40 text-[#C5A059] text-[9px] font-bold uppercase tracking-wider">
                            {question.difficulty}
                        </span>
                    )}
                </div>

                {/* Question + options */}
                <div className="p-5 sm:p-6 space-y-4">
                    <h3 className="font-serif text-xl sm:text-2xl text-white text-center">
                        {question.question}
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        {shuffledOptions.map((opt, idx) => {
                            const isSelected = selectedIndex === idx;
                            const showCorrect = isAnswered && opt.isCorrect;
                            const showWrong = isAnswered && isSelected && !opt.isCorrect;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectOption(idx)}
                                    disabled={isAnswered}
                                    className={`p-4 rounded-xl border text-center font-serif text-lg transition-all ${showCorrect
                                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                                            : showWrong
                                                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                                                : isAnswered
                                                    ? 'bg-white/[0.02] border-white/5 text-white/30'
                                                    : 'bg-[#161616] border-white/15 text-white hover:border-[#C5A059] hover:bg-[#1E1E1E] cursor-pointer active:scale-95'
                                        }`}
                                >
                                    <span className="flex items-center justify-center gap-1.5">
                                        {showCorrect && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                        {showWrong && <XCircle className="w-4 h-4 shrink-0" />}
                                        {opt.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Feedback */}
                    {isAnswered && (
                        <div className="space-y-3 animate-in fade-in duration-200 pt-1">
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-serif text-lg text-[#C5A059]">
                                        {question.nativeWord}
                                    </span>
                                    <button
                                        onClick={handlePronounce}
                                        className="text-xs text-[#C5A059]/70 hover:text-[#C5A059] underline cursor-pointer"
                                    >
                                        🔊 {question.pronunciation}
                                    </button>
                                </div>
                                <p className="text-xs text-white/70 leading-relaxed">{question.explanation}</p>
                            </div>

                            {question.memoryTip && (
                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#C5A059]/[0.06] border border-[#C5A059]/20">
                                    <Lightbulb className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-[#DFC386]/90 leading-relaxed">{question.memoryTip}</p>
                                </div>
                            )}

                            {question.culturalNote && (
                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                                    <BookOpen className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-white/50 leading-relaxed">{question.culturalNote}</p>
                                </div>
                            )}

                            <button
                                onClick={fetchQuestion}
                                disabled={isLoading}
                                className="btn-gold w-full py-3 rounded-lg text-[#0A0A0A] text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                <span>Next Question</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};