import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  BookOpen,
  RotateCcw,
  AudioLines,
  Flame,
  Globe2,
  Check,
  Radio,
  Send
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
  RemoteAudioTrack,
  createAudioAnalyser
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
  timestamp: string;
  topic?: string;
}

const LANGUAGE_OPTIONS = [
  { id: 'sanskrit', label: 'संस्कृतम् • Sanskrit', fullLabel: 'संस्कृतम् • Sanskrit (Live AI Voice)', script: 'संस्कृतम्' },
  { id: 'tamil', label: 'தமிழ் • Tamil', fullLabel: 'தமிழ் • Tamil (Live AI Voice)', script: 'தமிழ்' },
  { id: 'pali', label: 'पालि • Pali', fullLabel: 'पालि • Pali (Live AI Voice)', script: 'पालि' },
  { id: 'all', label: 'सर्वभाषा • Universal', fullLabel: 'सर्वभाषा • Multilingual (All Tongues)', script: 'सर्व' },
];

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
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);

  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptItem[]>([
    {
      id: 'welcome-dialogue',
      sender: 'guru',
      verse: 'ॐ असतो मा सद्गमय । तमसो मा ज्योतिर्गमय । मृत्योर्माऽमृतं गमय ॥',
      verseTranslation: 'Lead me from the unreal to the real, from darkness to light, from mortality to immortality.',
      text: 'Hari Om. I am Guru Vidyadhar. Speak freely in Sanskrit, Tamil, Hindi, or English — of philosophy, sacred verses, or the quiet quest within.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: 'Upanishadic Dialogue',
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript when new items arrive
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptHistory, liveUserSpeech, isTranscriptOpen]);

  // Sync selected language with prop if updated
  useEffect(() => {
    if (currentTraditionId && LANGUAGE_OPTIONS.some((l) => l.id === currentTraditionId)) {
      setSelectedLanguage(currentTraditionId);
    }
  }, [currentTraditionId]);

  // Connect to LiveKit Room if keys are present
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
            audioCaptureDefaults: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          room.on(RoomEvent.Connected, () => {
            if (isSubscribed) setIsLiveKitConnected(true);
          });

          room.on(RoomEvent.Disconnected, () => {
            if (isSubscribed) setIsLiveKitConnected(false);
          });

          // Only attach remote participant audio (prevents local echo!)
          room.on(
            RoomEvent.TrackSubscribed,
            (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
              if (track.kind === Track.Kind.Audio) {
                const audioElement = track.attach();
                audioElement.play().catch((e) => console.warn('[LiveKit Audio Play]', e));

                try {
                  const analyser = createAudioAnalyser(track as RemoteAudioTrack);
                  const updateVolume = () => {
                    if (!analyser) return;
                    const val = analyser.calculateVolume();
                    setAudioLevel(val);
                    setIsSpeaking(val > 0.1);
                    animFrameRef.current = requestAnimationFrame(updateVolume);
                  };
                  updateVolume();
                } catch (err) {
                  console.warn('[LiveKit Analyser]', err);
                }
              }
            }
          );

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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      sound.stopSpeaking();
    };
  }, []);

  // Web Audio Analyser (strictly for visualizer, zero speaker echo routing)
  const startAudioCapture = async () => {
    try {
      if (mediaStreamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // CRITICAL: Connect source ONLY to analyser, NEVER to audioCtx.destination to prevent echo!
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(average / 90, 1.0);
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn('[VoiceMode] Microphone visual capture warning:', err);
    }
  };

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
    setAudioLevel(0);
  };

  // Process and Speak Guru Response
  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    sound.unlockAudio();
    setIsProcessing(true);
    setIsListening(false);
    stopAudioCapture();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const userMessage: TranscriptItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTranscriptHistory((prev) => [...prev, userMessage]);
    setLiveUserSpeech('');

    try {
      const res = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText.trim(),
          language: selectedLanguage,
          conversationHistory: transcriptHistory.map((t) => ({
            sender: t.sender,
            text: t.text,
          })),
        }),
      });

      const data = await res.json();

      const guruMessage: TranscriptItem = {
        id: `guru-${Date.now()}`,
        sender: 'guru',
        verse: data.verse,
        verseTranslation: data.verseTranslation,
        text: data.spokenResponse || 'Stillness reveals inner truth.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: data.topic || 'Spiritual Inquiry',
      };

      setTranscriptHistory((prev) => [...prev, guruMessage]);

      // Speak Guru response aloud with speech synthesis
      setIsSpeaking(true);
      if (onEarnXp) {
        onEarnXp(15);
      }

      const textToVocalize = data.spokenResponse || data.verse || 'Hari Om.';
      sound.speak(
        textToVocalize,
        selectedLanguage === 'tamil' ? 'tamil' : 'sanskrit',
        () => setIsSpeaking(true),
        () => {
          setIsSpeaking(false);
          sound.playSuccessChime();
        }
      );
    } catch (err) {
      console.error('[VoiceMode] Query failed:', err);
      const fallbackMsg: TranscriptItem = {
        id: `guru-fallback-${Date.now()}`,
        sender: 'guru',
        verse: 'ॐ शान्तिः शान्तिः शान्तिः',
        verseTranslation: 'Peace, peace, supreme peace.',
        text: 'I sense the sincerity in your voice. Let us abide in the peace of wisdom.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: 'Sanctuary of Silence',
      };
      setTranscriptHistory((prev) => [...prev, fallbackMsg]);
      setIsSpeaking(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Live Microphone Listening (always runs SpeechRecognition reliably)
  const toggleListening = () => {
    sound.unlockAudio();
    sound.playTileClick();

    if (isSpeaking) {
      sound.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      stopAudioCapture();
      if (liveUserSpeech.trim()) {
        handleQuery(liveUserSpeech);
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // Determine recognition language: default to Hindi/English/Tamil/Sanskrit based on selection
      recognition.lang =
        selectedLanguage === 'tamil'
          ? 'ta-IN'
          : selectedLanguage === 'sanskrit'
          ? 'hi-IN' // Chrome speech recognition handles Sanskrit phonetics best via hi-IN or sa-IN
          : 'en-US';

      let accumulatedTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
        startAudioCapture();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = (final || interim).trim();
        if (currentText) {
          accumulatedTranscript = currentText;
          setLiveUserSpeech(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceMode] Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          stopAudioCapture();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        stopAudioCapture();
        if (accumulatedTranscript.trim()) {
          handleQuery(accumulatedTranscript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[VoiceMode] Speech recognition start error:', err);
      setIsListening(false);
      stopAudioCapture();
    }
  };

  const currentLangObj =
    LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguage) || LANGUAGE_OPTIONS[0];

  const latestGuruMessage =
    [...transcriptHistory].reverse().find((m) => m.sender === 'guru') || transcriptHistory[0];

  return (
    <div className="relative min-h-[82vh] flex flex-col items-center justify-between px-3 sm:px-6 pb-24 max-w-2xl mx-auto select-none animate-in fade-in duration-300">
      {/* Top Bar Navigation & Status */}
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

        {/* Eyebrow Label with Audio Wave Status */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-[#C5A059] uppercase font-mono">
            VOICE MODE
          </span>
          <AudioLines className="w-3.5 h-3.5 text-[#C5A059]" />
        </div>

        <button
          id="btn-voice-reset"
          onClick={() => {
            sound.playTileClick();
            setTranscriptHistory([transcriptHistory[0]]);
            setLiveUserSpeech('');
          }}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Restart Dialogue"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Language Selector Dropdown Pill */}
      <div className="relative z-30 my-3">
        <button
          id="btn-voice-language-selector"
          onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181818]/90 hover:bg-[#222222] border border-white/15 text-xs text-white/90 shadow-lg hover:border-[#C5A059]/50 transition-all cursor-pointer group"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-serif font-medium tracking-wide text-[#DFC386]">
            {currentLangObj.fullLabel}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/40 group-hover:text-white transition-transform ${
              isLangDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isLangDropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-2xl bg-[#141414] border border-[#C5A059]/30 shadow-2xl p-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-1.5 text-[9.5px] uppercase font-bold tracking-widest text-[#C5A059]/60">
              Select Voice Language Context
            </div>
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
                  <span>{lang.label.split('•')[1] || lang.label}</span>
                </div>
                {selectedLanguage === lang.id && <Check className="w-3.5 h-3.5 text-[#C5A059]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center: The Radiant Voice Powered Orb (Contained within Sacred Circle) */}
      <div className="relative my-2 sm:my-3 flex flex-col items-center justify-center">
        <VoicePoweredOrb
          audioLevel={audioLevel}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isActive={true}
        />

        {/* Live speech feedback pill */}
        {liveUserSpeech && (
          <div className="absolute -bottom-3 bg-black/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#C5A059]/50 text-xs text-[#DFC386] animate-pulse shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>"{liveUserSpeech}"</span>
          </div>
        )}
      </div>

      {/* Spoken Action Control & Mic Toggle Button */}
      <div className="flex flex-col items-center gap-2.5 my-2">
        <Button
          id="btn-voice-mic-toggle"
          variant="gold"
          size="pill"
          onClick={toggleListening}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold shadow-xl transition-all cursor-pointer ${
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
              <span>Listening... Tap when Done</span>
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Guru Speaking • Tap to Stop</span>
            </>
          ) : isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Seeking eternal wisdom...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Tap to Speak with Guru</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-white/40 font-light text-center">
          {isListening
            ? 'Speak your inquiry clearly in any language.'
            : isSpeaking
            ? 'Listen deeply to the Guru’s spoken wisdom.'
            : 'Ask any question or recite a mantra to receive live spoken guidance.'}
        </p>
      </div>

      {/* Suggested Spoken Prompts Quick Chips */}
      <div className="w-full flex items-center justify-center gap-2 flex-wrap my-1.5">
        {[
          'ॐ असतो मा सद्गमय',
          'What is Dharma in daily life?',
          'மனத்துக்கண் மாசிலன் ஆதல்',
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

      {/* Bottom Collapsible Sheet: LIVE SACRED TRANSCRIPT */}
      <div className="w-full mt-3 bg-[#121212]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Transcript Header Toggle */}
        <button
          id="btn-toggle-transcript"
          onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          className="w-full px-5 py-3 flex items-center justify-between bg-white/[0.02] border-b border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#C5A059]">
            <BookOpen className="w-4 h-4" />
            <span>Live Sacred Transcript</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
              {latestGuruMessage?.topic || 'Upanishadic Dialogue'}
            </span>
            {isTranscriptOpen ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white/50" />
            )}
          </div>
        </button>

        {/* Transcript Body */}
        {isTranscriptOpen && (
          <div className="p-4 sm:p-5 max-h-56 overflow-y-auto space-y-4 text-sm leading-relaxed no-scrollbar">
            {transcriptHistory.map((item) => {
              const isGuru = item.sender === 'guru';
              return (
                <div
                  key={item.id}
                  className={`space-y-1.5 ${
                    isGuru ? 'text-left' : 'text-right bg-white/[0.03] p-2.5 rounded-xl border border-white/5'
                  }`}
                >
                  <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 ${
                    !isGuru ? 'justify-end' : ''
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                    <span>{item.timestamp}</span>
                    <span>•</span>
                    <span className="font-semibold text-white/60">
                      {isGuru ? 'AI GURU' : 'SEEKER'}
                    </span>
                    {item.topic && isGuru && (
                      <>
                        <span>•</span>
                        <span className="text-[#C5A059]/80">{item.topic}</span>
                      </>
                    )}
                  </div>

                  {/* Sacred Verse in Gold Italic Serif */}
                  {item.verse && (
                    <p className="font-serif italic text-base sm:text-lg text-[#DFC386] leading-relaxed pt-1">
                      "{item.verse}"
                    </p>
                  )}

                  {/* Verse translation */}
                  {item.verseTranslation && (
                    <p className="text-xs text-white/60 italic leading-relaxed">
                      "{item.verseTranslation}"
                    </p>
                  )}

                  {/* Spoken Prose */}
                  <div className={`text-xs sm:text-sm text-white/85 leading-relaxed ${
                    isGuru ? 'pl-2 border-l-2 border-[#C5A059]/40 mt-1.5' : ''
                  }`}>
                    {item.text}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming User Speech in Transcript */}
            {liveUserSpeech && isListening && (
              <div className="text-right bg-[#C5A059]/10 p-2.5 rounded-xl border border-[#C5A059]/30 space-y-1 animate-pulse">
                <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider text-[#C5A059]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>Speaking Now • SEEKER</span>
                </div>
                <p className="text-xs sm:text-sm text-white/90 italic">
                  "{liveUserSpeech}"
                </p>
              </div>
            )}

            <div ref={transcriptBottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};
