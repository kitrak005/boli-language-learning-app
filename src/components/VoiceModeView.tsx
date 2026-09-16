import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  BookOpen,
  RotateCcw,
  AudioLines,
  Check,
  Send,
  AlertCircle,
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
  RemoteAudioTrack,
  createAudioAnalyser,
} from 'livekit-client';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';
import { Button } from '@/components/ui/button';
import { TraditionId } from '../types';
import { sound } from '../utils/audio';

interface VoiceModeViewProps {
  currentTraditionId: TraditionId;
  onBack?: () => void;
  onEarnXp?: (amount: number) => void;
}

interface TranscriptItem {
  id: string;
  sender: 'user' | 'guru';
  verse?: string;
  verseTranslation?: string;
  text: string;
  textTranslation?: string; // English translation when text is in Sanskrit/Tamil
  timestamp: string;
  topic?: string;
}

const LANGUAGE_OPTIONS = [
  { id: 'sanskrit', label: 'संस्कृतम् • Sanskrit', fullLabel: 'संस्कृतम् • Sanskrit', script: 'संस्कृतम्', lang: 'hi-IN' },
  { id: 'tamil', label: 'தமிழ் • Tamil', fullLabel: 'தமிழ் • Tamil', script: 'தமிழ்', lang: 'ta-IN' },
  { id: 'pali', label: 'पालि • Pali', fullLabel: 'पालि • Pali', script: 'पालि', lang: 'en-US' },
  { id: 'all', label: 'Universal', fullLabel: 'सर्वभाषा • Universal', script: 'सर्व', lang: 'en-US' },
];

const WELCOME_MESSAGE: TranscriptItem = {
  id: 'welcome-dialogue',
  sender: 'guru',
  verse: 'ॐ असतो मा सद्गमय । तमसो मा ज्योतिर्गमय । मृत्योर्माऽमृतं गमय ॥',
  verseTranslation: 'Lead me from the unreal to the real, from darkness to light, from mortality to immortality.',
  text: 'Hari Om. I am Guru Vidyadhar. Tap the mic or type your question below — about philosophy, sacred verses, or the quiet quest within.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  topic: 'Upanishadic Dialogue',
};

export const VoiceModeView: React.FC<VoiceModeViewProps> = ({
  currentTraditionId,
  onBack,
  onEarnXp,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    currentTraditionId || 'sanskrit'
  );
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [liveUserSpeech, setLiveUserSpeech] = useState('');
  const [textInput, setTextInput] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptItem[]>([WELCOME_MESSAGE]);

  const recognitionRef = useRef<any>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const accTranscriptRef = useRef<string>('');
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptHistory, liveUserSpeech, isTranscriptOpen]);

  // Sync language with prop
  useEffect(() => {
    if (currentTraditionId && LANGUAGE_OPTIONS.some((l) => l.id === currentTraditionId)) {
      setSelectedLanguage(currentTraditionId);
    }
  }, [currentTraditionId]);

  // Connect to LiveKit (for remote agent audio only — does NOT capture local mic)
  useEffect(() => {
    let isSubscribed = true;

    async function initLiveKit() {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: 'vakya-voice-sanctuary',
            participantName: 'Seeker',
            language: selectedLanguage,
          }),
        });

        const data = await res.json();
        if (!isSubscribed) return;

        if (data.isLiveKitConfigured && data.token && data.serverUrl) {
          if (livekitRoomRef.current) {
            await livekitRoomRef.current.disconnect();
          }

          const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            // Do NOT auto-subscribe to publish — we only listen for remote agent audio
            audioCaptureDefaults: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          // Only attach remote AI agent audio (prevents echo)
          room.on(
            RoomEvent.TrackSubscribed,
            (track: Track, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
              if (track.kind === Track.Kind.Audio) {
                const audioElement = track.attach();
                audioElement.play().catch((e) => console.warn('[LiveKit Audio Play]', e));

                try {
                  const analyser = createAudioAnalyser(track as RemoteAudioTrack);
                  const updateVol = () => {
                    if (!analyser || !isSubscribed) return;
                    const val = analyser.calculateVolume();
                    setAudioLevel(val);
                    setIsSpeaking(val > 0.08);
                    animFrameRef.current = requestAnimationFrame(updateVol);
                  };
                  updateVol();
                } catch (err) {
                  console.warn('[LiveKit Analyser]', err);
                }
              }
            }
          );

          // Listen for agent transcription messages via data channel
          room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
            try {
              const decoded = JSON.parse(new TextDecoder().decode(payload));
              if (decoded?.type === 'transcript' && decoded?.text) {
                const guruMsg: TranscriptItem = {
                  id: `guru-lk-${Date.now()}`,
                  sender: 'guru',
                  verse: decoded.verse,
                  verseTranslation: decoded.verseTranslation,
                  text: decoded.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  topic: decoded.topic || 'Live Dialogue',
                };
                setTranscriptHistory((prev) => [...prev, guruMsg]);
              }
            } catch (_) {}
          });

          await room.connect(data.serverUrl, data.token);
          livekitRoomRef.current = room;
        }
      } catch (err) {
        console.warn('[LiveKit Init]', err);
      }
    }

    initLiveKit();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
    };
  }, [selectedLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
      abortRecognition();
      sound.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAudioCapture = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const abortRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
  };

  // Start local mic analyser (ONLY for visualizer — never routed to speakers)
  const startAudioCapture = async () => {
    try {
      if (mediaStreamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      // CRITICAL: source → analyser only (NOT to ctx.destination → avoids echo)
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setAudioLevel(Math.min(avg / 90, 1.0));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('[VoiceMode] Mic capture warning:', err);
    }
  };

  // Core: send text to /api/voice-agent, speak response
  const handleQuery = useCallback(
    async (queryText: string) => {
      if (!queryText.trim() || isProcessing) return;

      sound.unlockAudio();
      setIsProcessing(true);
      setVoiceError(null);

      const userMessage: TranscriptItem = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: queryText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setTranscriptHistory((prev) => [...prev, userMessage]);
      setLiveUserSpeech('');
      setTextInput('');
      accTranscriptRef.current = '';

      try {
        const res = await fetch('/api/voice-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: queryText.trim(),
            language: selectedLanguage,
            conversationHistory: transcriptHistory.slice(-4).map((t) => ({
              sender: t.sender,
              text: t.text,
            })),
          }),
        });

        const data = await res.json();

        const spokenText = data.spokenResponse || 'Stillness reveals inner truth.';
        const guruMessage: TranscriptItem = {
          id: `guru-${Date.now()}`,
          sender: 'guru',
          verse: data.verse,
          verseTranslation: data.verseTranslation,
          text: spokenText,
          textTranslation: data.spokenResponseTranslation,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: data.topic || 'Spiritual Inquiry',
        };

        setTranscriptHistory((prev) => [...prev, guruMessage]);

        if (onEarnXp) onEarnXp(15);

        // Speak the native-script response using the correct language voice.
        // customPhonetic = English translation → used as fallback when no
        // Hindi/Sanskrit TTS voice is installed on the device, so the browser
        // speaks clear English meaning instead of garbled phonetic Devanagari.
        const ttsLangId = selectedLanguage === 'tamil' ? 'tamil' : 'sanskrit';
        const englishFallback = data.spokenResponseTranslation || undefined;
        setIsSpeaking(true);
        sound.speak(
          spokenText,
          ttsLangId,
          () => setIsSpeaking(true),
          () => {
            setIsSpeaking(false);
            sound.playSuccessChime();
          },
          englishFallback  // ← speaks this when no Indian voice is available
        );
      } catch (err) {
        console.error('[VoiceMode] Query failed:', err);
        const fallback: TranscriptItem = {
          id: `guru-fallback-${Date.now()}`,
          sender: 'guru',
          verse: 'ॐ शान्तिः शान्तिः शान्तिः',
          verseTranslation: 'Peace, peace, supreme peace.',
          text: 'I sense the sincerity in your voice. Let us abide in the peace of wisdom.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: 'Sanctuary of Silence',
        };
        setTranscriptHistory((prev) => [...prev, fallback]);
        setIsSpeaking(false);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isProcessing, selectedLanguage, transcriptHistory, onEarnXp]
  );

  // Start speech recognition with network-error recovery
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice recognition not supported — please type your question below.');
      return;
    }

    setVoiceError(null);
    abortRecognition();
    accTranscriptRef.current = '';

    try {
      const recognition = new SpeechRecognition();
      // Use continuous=false for better network error recovery — it restarts cleanly
      recognition.continuous = false;
      recognition.interimResults = true;

      const langObj = LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguage);
      recognition.lang = langObj?.lang || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveUserSpeech('');
        startAudioCapture();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (final || interim).trim();
        if (text) {
          accTranscriptRef.current = text;
          setLiveUserSpeech(text);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        console.warn('[VoiceMode] Speech recognition error:', err);

        if (err === 'network') {
          setVoiceError('Microphone network error — type your question below or try again.');
        } else if (err === 'not-allowed') {
          setVoiceError('Microphone permission denied — please allow mic access and retry.');
        } else if (err === 'no-speech') {
          // Silent — just let it end naturally
        } else {
          setVoiceError(`Voice error: ${err}. Use the text box below.`);
        }
        setIsListening(false);
        stopAudioCapture();
      };

      recognition.onend = () => {
        setIsListening(false);
        stopAudioCapture();
        const finalText = accTranscriptRef.current.trim();
        if (finalText) {
          handleQuery(finalText);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[VoiceMode] Speech recognition start error:', err);
      setIsListening(false);
      setVoiceError('Could not start voice — please type your question below.');
      stopAudioCapture();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
    stopAudioCapture();
    const finalText = accTranscriptRef.current.trim();
    if (finalText) {
      handleQuery(finalText);
    }
  };

  const toggleListening = () => {
    sound.unlockAudio();
    sound.playTileClick();

    if (isSpeaking) {
      sound.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      handleQuery(textInput.trim());
    }
  };

  const currentLangObj = LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguage) || LANGUAGE_OPTIONS[0];
  const latestGuruMessage = [...transcriptHistory].reverse().find((m) => m.sender === 'guru') || transcriptHistory[0];

  return (
    <div className="relative flex flex-col items-center px-3 sm:px-6 pb-6 max-w-2xl mx-auto select-none animate-in fade-in duration-300">

      {/* ── Top Bar ── */}
      <div className="w-full flex items-center justify-between pt-2 pb-4 border-b border-white/10">
        <button
          id="btn-voice-back"
          onClick={onBack}
          className="flex items-center gap-1.5 p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Return to Study"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs uppercase font-medium tracking-wider hidden sm:inline-block">Back</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30">
          <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-[#C5A059] uppercase font-mono">VOICE MODE</span>
          <AudioLines className="w-3.5 h-3.5 text-[#C5A059]" />
        </div>

        <button
          id="btn-voice-reset"
          onClick={() => {
            sound.playTileClick();
            abortRecognition();
            sound.stopSpeaking();
            setTranscriptHistory([WELCOME_MESSAGE]);
            setLiveUserSpeech('');
            setTextInput('');
            setVoiceError(null);
            setIsListening(false);
            setIsSpeaking(false);
          }}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Restart Dialogue"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Language Selector ── */}
      <div className="relative z-30 my-3">
        <button
          id="btn-voice-language-selector"
          onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181818]/90 hover:bg-[#222222] border border-white/15 text-xs text-white/90 shadow-lg hover:border-[#C5A059]/50 transition-all cursor-pointer group"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-serif font-medium tracking-wide text-[#DFC386]">{currentLangObj.fullLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isLangDropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-2xl bg-[#141414] border border-[#C5A059]/30 shadow-2xl p-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-1.5 text-[9.5px] uppercase font-bold tracking-widest text-[#C5A059]/60">Select Voice Language</div>
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  sound.playTileClick();
                  setSelectedLanguage(lang.id);
                  setIsLangDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                  selectedLanguage === lang.id
                    ? 'bg-[#C5A059]/20 text-[#DFC386] font-semibold border border-[#C5A059]/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm text-[#C5A059]">{lang.script}</span>
                  <span>{lang.label}</span>
                </div>
                {selectedLanguage === lang.id && <Check className="w-3.5 h-3.5 text-[#C5A059]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Sacred Orb (fixed inside circle) ── */}
      <div className="relative my-2 sm:my-3 flex flex-col items-center">
        {/* The orb is contained by its own internal circle — fixed size, no overflow */}
        <VoicePoweredOrb
          audioLevel={audioLevel}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isActive={true}
          className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72"
        />

        {/* Live speech badge — shown below the orb, not overlapping */}
        {liveUserSpeech && isListening && (
          <div className="mt-3 max-w-xs bg-black/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#C5A059]/50 text-xs text-[#DFC386] shadow-lg flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="truncate">"{liveUserSpeech}"</span>
          </div>
        )}
      </div>

      {/* ── Mic Toggle Button ── */}
      <div className="flex flex-col items-center gap-2 my-2">
        <Button
          id="btn-voice-mic-toggle"
          variant="gold"
          size="pill"
          onClick={toggleListening}
          disabled={isProcessing}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold shadow-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            isListening
              ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white animate-pulse shadow-rose-500/40 scale-105'
              : isSpeaking
              ? 'bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-emerald-500/20'
              : 'bg-gradient-to-r from-[#DFC386] to-[#C5A059] text-black hover:brightness-110 shadow-[#C5A059]/30'
          }`}
        >
          {isListening ? (
            <>
              <Mic className="w-4 h-4 animate-bounce" />
              <span>Listening… Tap when Done</span>
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Guru Speaking • Tap to Stop</span>
            </>
          ) : isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Seeking eternal wisdom…</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Tap to Speak with Guru</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-white/40 font-light text-center px-2">
          {isListening
            ? 'Speak your inquiry clearly, then tap Done.'
            : isSpeaking
            ? "Listen deeply to the Guru\u2019s spoken wisdom."
            : 'Speak or type a question in any language.'}
        </p>

        {/* Voice error notice */}
        {voiceError && (
          <div className="flex items-start gap-2 text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-500/20 rounded-xl px-3 py-2 max-w-sm text-center">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}
      </div>

      {/* ── Quick Prompt Chips ── */}
      <div className="w-full flex items-center justify-center gap-2 flex-wrap my-1.5">
        {[
          'ॐ असतो मा सद्गमय',
          'What is Dharma in daily life?',
          'மனத்துக்கண் மாசிலன்',
          'Explain Ahimsa and Karma',
        ].map((promptText, pIdx) => (
          <button
            key={pIdx}
            onClick={() => handleQuery(promptText)}
            disabled={isListening || isSpeaking || isProcessing}
            className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-[#C5A059]/15 border border-white/10 text-white/60 hover:text-[#DFC386] text-[11px] transition-all cursor-pointer disabled:opacity-30"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* ── Text Input Fallback (always available) ── */}
      <form
        onSubmit={handleTextSubmit}
        className="w-full flex items-center gap-2 mt-2 mb-3"
      >
        <input
          ref={textInputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Or type your question here…"
          disabled={isListening || isProcessing}
          className="flex-1 bg-[#161616] border border-white/10 focus:border-[#C5A059]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || isListening || isProcessing}
          className="p-2.5 rounded-xl bg-[#C5A059]/20 hover:bg-[#C5A059]/30 border border-[#C5A059]/40 text-[#DFC386] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* ── Live Sacred Transcript ── */}
      <div className="w-full bg-[#121212]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <button
          id="btn-toggle-transcript"
          onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          className="w-full px-5 py-3 flex items-center justify-between bg-white/[0.02] border-b border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#C5A059]">
            <BookOpen className="w-4 h-4" />
            <span>Live Sacred Transcript</span>
            <span className="ml-1 text-[10px] font-normal text-white/30 normal-case tracking-normal">
              ({transcriptHistory.length} message{transcriptHistory.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
              {latestGuruMessage?.topic || 'Upanishadic Dialogue'}
            </span>
            {isTranscriptOpen
              ? <ChevronDown className="w-4 h-4 text-white/50" />
              : <ChevronUp className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {isTranscriptOpen && (
          <div className="p-4 sm:p-5 max-h-64 overflow-y-auto space-y-4 text-sm leading-relaxed no-scrollbar">
            {transcriptHistory.map((item) => {
              const isGuru = item.sender === 'guru';
              return (
                <div
                  key={item.id}
                  className={`space-y-1.5 ${
                    isGuru ? 'text-left' : 'text-right bg-white/[0.03] p-2.5 rounded-xl border border-white/5'
                  }`}
                >
                  <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 ${!isGuru ? 'justify-end' : ''}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                    <span>{item.timestamp}</span>
                    <span>•</span>
                    <span className="font-semibold text-white/60">{isGuru ? 'AI GURU' : 'SEEKER'}</span>
                    {item.topic && isGuru && (
                      <>
                        <span>•</span>
                        <span className="text-[#C5A059]/80">{item.topic}</span>
                      </>
                    )}
                  </div>

                  {item.verse && (
                    <p className="font-serif italic text-base sm:text-lg text-[#DFC386] leading-relaxed pt-1">
                      "{item.verse}"
                    </p>
                  )}

                  {item.verseTranslation && (
                    <p className="text-xs text-white/60 italic leading-relaxed">
                      {item.verseTranslation}
                    </p>
                  )}

                  {/* Guru spoken response in native script */}
                  <div className={`text-xs sm:text-sm text-white/85 leading-relaxed ${
                    isGuru ? 'pl-2 border-l-2 border-[#C5A059]/40 mt-1.5' : ''
                  }`}>
                    {item.text}
                  </div>

                  {/* English translation of Sanskrit/Tamil response */}
                  {item.textTranslation && isGuru && (
                    <p className="text-[11px] text-white/45 italic mt-1 pl-2">
                      ↳ {item.textTranslation}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Live streaming user speech in transcript */}
            {liveUserSpeech && isListening && (
              <div className="text-right bg-[#C5A059]/10 p-2.5 rounded-xl border border-[#C5A059]/30 space-y-1 animate-pulse">
                <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider text-[#C5A059]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>Speaking Now • SEEKER</span>
                </div>
                <p className="text-xs sm:text-sm text-white/90 italic">"{liveUserSpeech}"</p>
              </div>
            )}

            <div ref={transcriptBottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};
