import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Award, Activity, HelpCircle } from 'lucide-react';
import { speechService, evaluatePronunciation, SpeechRecognitionResultData, isSpeechRecognitionSupported } from '../utils/speechRecognition';
import { sound } from '../utils/audio';
import { GuruEmotion } from './IndianTeacher';

interface PronunciationCoachProps {
  targetScript: string;
  targetTransliteration: string;
  englishMeaning?: string;
  languageId: string;
  onAssessmentComplete?: (result: SpeechRecognitionResultData) => void;
  onTeacherReaction?: (emotion: GuruEmotion, message: string) => void;
  compact?: boolean;
}

export const PronunciationCoach: React.FC<PronunciationCoachProps> = ({
  targetScript,
  targetTransliteration,
  englishMeaning,
  languageId,
  onAssessmentComplete,
  onTeacherReaction,
  compact = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assessmentResult, setAssessmentResult] = useState<SpeechRecognitionResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>([40, 60, 30, 75, 45]);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [referencePlaying, setReferencePlaying] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  // Reset state when target changes
  useEffect(() => {
    setAssessmentResult(null);
    setInterimTranscript('');
    setErrorMessage(null);
    setIsListening(false);
    speechService.stopListening();
  }, [targetScript]);

  // Audio visualizer animation when listening
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel([
          Math.floor(Math.random() * 60 + 30),
          Math.floor(Math.random() * 80 + 20),
          Math.floor(Math.random() * 90 + 30),
          Math.floor(Math.random() * 70 + 25),
          Math.floor(Math.random() * 60 + 30),
        ]);
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const handlePlayReference = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReferencePlaying(true);
    if (onTeacherReaction) {
      onTeacherReaction('speaking', `Listen carefully to the resonance: "${targetScript}"`);
    }
    sound.speak(
      targetScript,
      languageId,
      () => setReferencePlaying(true),
      () => {
        setReferencePlaying(false);
        if (onTeacherReaction) {
          onTeacherReaction('idle', 'Now it is your turn to speak into the microphone.');
        }
      }
    );
  };

  const handleStartSpeaking = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setErrorMessage(null);
    setInterimTranscript('');
    setAssessmentResult(null);

    if (onTeacherReaction) {
      onTeacherReaction('thinking', `I am listening... Recite "${targetTransliteration}" clearly.`);
    }

    const started = speechService.startListening(
      languageId,
      (transcript, isFinal) => {
        setInterimTranscript(transcript);
        if (isFinal) {
          processResult(transcript);
        }
      },
      (error) => {
        setIsListening(false);
        setErrorMessage(error);
        if (onTeacherReaction) {
          onTeacherReaction('encouraging', 'Microphone encountered an issue. You can retry anytime.');
        }
      },
      () => {
        setIsListening(false);
      }
    );

    if (started) {
      setIsListening(true);
      sound.playTileClick();

      // Auto stop after 7 seconds if silence
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (isListening) {
          speechService.stopListening();
          setIsListening(false);
        }
      }, 7000);
    }
  };

  const handleStopSpeaking = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    speechService.stopListening();
    setIsListening(false);
    if (interimTranscript) {
      processResult(interimTranscript);
    }
  };

  const processResult = (transcript: string) => {
    setIsListening(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    const result = evaluatePronunciation(transcript, targetScript, targetTransliteration, englishMeaning);
    setAssessmentResult(result);

    if (result.score >= 85) {
      sound.playSuccessChime();
      if (onTeacherReaction) {
        onTeacherReaction('happy', `उत्तमम्! ${result.score}% accuracy! Flawless classical cadence.`);
      }
    } else if (result.score >= 65) {
      sound.playSuccessChime();
      if (onTeacherReaction) {
        onTeacherReaction('happy', `साधु! ${result.score}% accuracy! Wonderful recitation.`);
      }
    } else {
      sound.playTileClick();
      if (onTeacherReaction) {
        onTeacherReaction('encouraging', `Good effort (${result.score}%). Listen to the reference once more and repeat.`);
      }
    }

    if (onAssessmentComplete) {
      onAssessmentComplete(result);
    }
  };

  // Fallback demo simulation for testing when browser permissions/mic is restricted in sandboxes
  const handleSimulateSpeech = (accuracy: number) => {
    setErrorMessage(null);
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const simulatedTranscript = accuracy >= 85 ? targetScript : targetTransliteration;
      processResult(simulatedTranscript);
    }, 1200);
  };

  return (
    <div
      id="pronunciation-coach-box"
      className={`w-full rounded-2xl transition-all ${
        compact
          ? 'p-3 bg-white/[0.03] border border-white/10'
          : 'p-4 sm:p-5 bg-gradient-to-br from-[#161616] via-[#121212] to-[#0D0D0D] border border-[#C5A059]/30 shadow-xl'
      }`}
    >
      {/* Target Word & Audio Demo Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">
            Oral Pronunciation Assessment
          </span>
        </div>

        <button
          type="button"
          onClick={handlePlayReference}
          disabled={referencePlaying}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
            referencePlaying
              ? 'bg-[#C5A059] text-black font-bold ring-2 ring-[#C5A059]/50'
              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[#C5A059]'
          }`}
          title="Hear classical Guru pronunciation"
        >
          <Volume2 className={`w-3.5 h-3.5 ${referencePlaying ? 'animate-bounce' : ''}`} />
          <span>{referencePlaying ? 'Reciting...' : 'Hear Model'}</span>
        </button>
      </div>

      {/* Main Mic Recording Canvas */}
      <div className="flex flex-col items-center justify-center py-2 sm:py-3 space-y-3">
        {/* Animated Microphone Action Button */}
        <div className="relative">
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-[#C5A059]/30 animate-ping pointer-events-none" />
          )}

          <button
            type="button"
            id="btn-voice-recognize"
            onClick={isListening ? handleStopSpeaking : handleStartSpeaking}
            className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
              isListening
                ? 'bg-rose-600 text-white ring-4 ring-rose-400/40 shadow-rose-600/30'
                : 'btn-gold text-[#0A0A0A] hover:scale-105 shadow-[#C5A059]/20'
            }`}
            title={isListening ? 'Click to finish speaking' : 'Click to speak word'}
          >
            {isListening ? (
              <MicOff className="w-7 h-7 animate-pulse" />
            ) : (
              <Mic className="w-7 h-7 text-[#0A0A0A]" />
            )}
          </button>
        </div>

        {/* Live Audio Waveform Bars when listening */}
        {isListening ? (
          <div className="flex items-center gap-1.5 h-6">
            {audioLevel.map((height, i) => (
              <span
                key={i}
                className="w-1 bg-[#C5A059] rounded-full transition-all duration-100"
                style={{ height: `${height}%` }}
              />
            ))}
            <span className="text-xs font-mono text-[#C5A059] ml-2 animate-pulse font-medium">
              Listening to voice...
            </span>
          </div>
        ) : (
          <span className="text-xs text-white/50 font-light">
            {assessmentResult ? 'Tap mic to recite again' : 'Tap microphone and recite clearly'}
          </span>
        )}

        {/* Interim Spoken Text */}
        {interimTranscript && !assessmentResult && (
          <div className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs font-mono text-white/80">
            Detected: <span className="text-[#C5A059] font-serif font-medium">{interimTranscript}</span>
          </div>
        )}
      </div>

      {/* Real-Time Assessment Score Card */}
      {assessmentResult && (
        <div
          id="pronunciation-score-card"
          className={`mt-3 p-4 rounded-xl border transition-all animate-in fade-in zoom-in-95 duration-300 ${
            assessmentResult.score >= 85
              ? 'bg-emerald-950/40 border-emerald-500/40'
              : assessmentResult.score >= 65
              ? 'bg-[#C5A059]/10 border-[#C5A059]/40'
              : 'bg-amber-950/30 border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              {assessmentResult.score >= 85 ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : assessmentResult.score >= 65 ? (
                <div className="w-6 h-6 rounded-full bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}

              <div>
                <span
                  className={`text-xs font-bold font-serif ${
                    assessmentResult.score >= 85
                      ? 'text-emerald-300'
                      : assessmentResult.score >= 65
                      ? 'text-[#C5A059]'
                      : 'text-amber-300'
                  }`}
                >
                  {assessmentResult.score >= 85
                    ? 'Flawless Recitation'
                    : assessmentResult.score >= 65
                    ? 'Strong Pronunciation'
                    : 'Needs Refinement'}
                </span>
              </div>
            </div>

            {/* Score Percentage Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/50">Match</span>
              <span
                className={`text-sm font-mono font-bold ${
                  assessmentResult.score >= 85
                    ? 'text-emerald-400'
                    : assessmentResult.score >= 65
                    ? 'text-[#C5A059]'
                    : 'text-amber-400'
                }`}
              >
                {assessmentResult.score}%
              </span>
            </div>
          </div>

          {/* Detailed Phonetic Transcript Comparison */}
          <div className="space-y-1.5 text-xs text-white/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Target Scripture:</span>
              <span className="font-serif text-[#C5A059] font-medium text-sm">
                {targetScript} ({targetTransliteration})
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Recognized Voice:</span>
              <span className="font-mono text-white font-medium bg-black/40 px-2 py-0.5 rounded border border-white/5">
                "{assessmentResult.transcript}"
              </span>
            </div>

            <p className="text-xs text-white/70 pt-1 leading-relaxed italic border-t border-white/5 mt-1.5">
              {assessmentResult.feedback}
            </p>
          </div>
        </div>
      )}

      {/* Error / Fallback Notification */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-center justify-between gap-2">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleStartSpeaking}
            className="px-2 py-1 bg-rose-900/60 rounded text-[10px] font-bold uppercase hover:bg-rose-800 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Browser Support Notice if Web Speech isn't natively available */}
      {!isSupported && (
        <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-700/30 text-xs text-amber-300/90 space-y-2">
          <div className="flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Web Speech API Notice</span>
          </div>
          <p className="text-[11px] text-amber-200/70 leading-relaxed">
            Your current browser or iframe environment may restrict live Web Speech access. You can test the evaluation model below:
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSimulateSpeech(95)}
              className="px-3 py-1 rounded bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#C5A059]/30"
            >
              Test Perfect Match (95%)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateSpeech(70)}
              className="px-3 py-1 rounded bg-white/5 text-white/70 border border-white/10 text-[10px] font-medium uppercase cursor-pointer hover:bg-white/10"
            >
              Test Good Match (70%)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
