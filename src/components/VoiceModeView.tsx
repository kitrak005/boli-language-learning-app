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
  ShieldAlert,
  Radio,
  Zap,
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
  text: string;
  textTranslation?: string;
  timestamp: string;
  topic?: string;
  verse?: string;
  verseTranslation?: string;
  isQuotaAlert?: boolean;
}

const LANGUAGE_OPTIONS = [
  { id: 'sanskrit', label: 'संस्कृतम् • Sanskrit', fullLabel: 'संस्कृतम् • Sanskrit', script: 'संस्कृतम्', lang: 'hi-IN' },
  { id: 'tamil', label: 'தமிழ் • Tamil', fullLabel: 'தமிழ் • Tamil', script: 'தமிழ்', lang: 'ta-IN' },
  { id: 'pali', label: 'पालि • Pali', fullLabel: 'पालि • Pali', script: 'पालि', lang: 'en-US' },
  { id: 'all', label: 'Universal', fullLabel: 'सर्वभाषा • Universal', script: 'सर्व', lang: 'en-US' },
];

const MAX_SESSION_TOKENS = 2500;
const VAD_MIN_RMS = 0.028;
const VAD_NOISE_MULTIPLIER = 2.1;
const VAD_SPEECH_MARGIN = 0.018;
const VAD_OPEN_FRAMES = 6;
const VAD_CLOSE_FRAMES = 28; // ~ SILENCE_TIMEOUT_MS worth of frames at ~60fps analysis tick, gives similar "pause before commit" feel
const VAD_MIN_SPEECH_MS = 400;

function pickSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:audio/webm;base64," prefix - we only want raw base64.
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const VoiceModeView: React.FC<VoiceModeViewProps> = ({
  currentTraditionId,
  onBack,
  onEarnXp,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    currentTraditionId || 'sanskrit'
  );
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [liveUserSpeech, setLiveUserSpeech] = useState('');
  const [textInput, setTextInput] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptItem[]>([]);

  const getTodayQuotaKey = () => {
    const today = new Date().toISOString().slice(0, 10);
    return `vakya_voice_tokens_${today}`;
  };

  const [tokensUsed, setTokensUsed] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(getTodayQuotaKey());
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [quotaReached, setQuotaReached] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(getTodayQuotaKey());
      return (stored ? parseInt(stored, 10) || 0 : 0) >= MAX_SESSION_TOKENS;
    } catch {
      return false;
    }
  });

  const recordTokens = (additionalTokens: number) => {
    setTokensUsed((prev) => {
      const next = prev + additionalTokens;
      try {
        localStorage.setItem(getTodayQuotaKey(), next.toString());
      } catch (err) {
        console.warn('Could not save quota to localStorage', err);
      }
      if (next >= MAX_SESSION_TOKENS) {
        setQuotaReached(true);
      }
      return next;
    });
  };

  const livekitRoomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const isContinuousRef = useRef<boolean>(false);
  const quotaReachedRef = useRef<boolean>(quotaReached);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const energySpeechRef = useRef(false);
  const noiseFloorRef = useRef(0.018);
  const speechFramesRef = useRef(0);
  const silenceFramesRef = useRef(0);
  const speechStartedAtRef = useRef<number | null>(null);

  // MediaRecorder-based capture (replaces browser SpeechRecognition, which
  // proved unreliable on Android: continuous=false never fired onresult on
  // some devices, and continuous=true started hallucinating/repeating
  // phrases on others. Recording raw audio and sending it to Gemini for
  // transcription+response sidesteps the flaky Web Speech API entirely.)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const mimeTypeRef = useRef<string>('');

  isSpeakingRef.current = isSpeaking;
  isProcessingRef.current = isProcessing;
  isContinuousRef.current = isContinuousListening;
  quotaReachedRef.current = quotaReached;

  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptHistory, liveUserSpeech, isTranscriptOpen]);

  useEffect(() => {
    if (currentTraditionId && LANGUAGE_OPTIONS.some((l) => l.id === currentTraditionId)) {
      setSelectedLanguage(currentTraditionId);
    }
  }, [currentTraditionId]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (status.state === 'denied') {
            setVoiceError(
              'Microphone access is blocked for this site. Tap the icon next to the address bar to Permissions to Microphone to Allow, then reload the page.'
            );
          }
          status.onchange = () => {
            if (status.state === 'denied') {
              setVoiceError(
                'Microphone access is blocked for this site. Tap the icon next to the address bar to Permissions to Microphone to Allow, then reload the page.'
              );
            } else if (status.state === 'granted') {
              setVoiceError(null);
            }
          };
        })
        .catch(() => {
          // Permissions API not supported in all browsers - fail silently.
        });
    }
  }, []);

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
                    if (isSpeakingRef.current) {
                      setAudioLevel(val);
                    }
                    animFrameRef.current = requestAnimationFrame(updateVol);
                  };
                  updateVol();
                } catch (err) {
                  console.warn('[LiveKit Analyser]', err);
                }
              }
            }
          );

          room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
            try {
              const decoded = JSON.parse(new TextDecoder().decode(payload));
              if (decoded?.type === 'transcript' && decoded?.text) {
                const guruMsg: TranscriptItem = {
                  id: `guru-lk-${Date.now()}`,
                  sender: 'guru',
                  text: decoded.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setTranscriptHistory((prev) => [...prev, guruMsg]);
              }
            } catch (_) { }
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

  const stopAudioCapture = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) { }
    }
    mediaRecorderRef.current = null;
    isRecordingRef.current = false;
    recordedChunksRef.current = [];
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    energySpeechRef.current = false;
    speechFramesRef.current = 0;
    silenceFramesRef.current = 0;
    speechStartedAtRef.current = null;
    setAudioLevel(0);
    setIsVoiceActive(false);
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      stopAudioCapture();
      sound.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send a recorded audio clip to the backend for transcription + response.
  const handleAudioQuery = useCallback(
    async (blob: Blob) => {
      if (isProcessingRef.current) return;

      if (quotaReachedRef.current || tokensUsed >= MAX_SESSION_TOKENS) {
        const quotaMsg: TranscriptItem = {
          id: `quota-${Date.now()}`,
          sender: 'guru',
          text: 'You have reached the end of your quota today.',
          textTranslation: 'You have reached the end of your quota today.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: 'Daily Quota Limit',
          isQuotaAlert: true,
        };
        setTranscriptHistory((prev) => [...prev, quotaMsg]);
        setQuotaReached(true);
        return;
      }

      sound.unlockAudio();
      setIsProcessing(true);
      setVoiceError(null);
      setLiveUserSpeech('Listening to your recording...');

      try {
        const base64Audio = await blobToBase64(blob);

        const res = await fetch('/api/voice-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            audioMimeType: mimeTypeRef.current || 'audio/webm',
            language: selectedLanguage,
            sessionTokensUsed: tokensUsed,
            conversationHistory: transcriptHistory.slice(-4).map((t) => ({
              sender: t.sender,
              text: t.text,
            })),
          }),
        });

        const data = await res.json();
        setLiveUserSpeech('');

        if (data.quotaExceeded) {
          recordTokens(data.tokensUsed || 100);
          setQuotaReached(true);
          const limitMsg: TranscriptItem = {
            id: `quota-${Date.now()}`,
            sender: 'guru',
            text: 'You have reached the end of your quota today.',
            textTranslation: 'You have reached the end of your quota today.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            topic: 'Daily Quota Limit',
            isQuotaAlert: true,
          };
          setTranscriptHistory((prev) => [...prev, limitMsg]);
          return;
        }

        const userTranscript = data.transcript && data.transcript.trim()
          ? data.transcript.trim()
          : '(could not transcribe audio)';

        const userMessage: TranscriptItem = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: userTranscript,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setTranscriptHistory((prev) => [...prev, userMessage]);

        const consumed = data.tokensUsed || Math.ceil((userTranscript.length + 150) / 3);
        recordTokens(consumed);

        const spokenText = data.spokenResponse || "Let's keep practicing together.";
        const guruMessage: TranscriptItem = {
          id: `guru-${Date.now()}`,
          sender: 'guru',
          text: spokenText,
          textTranslation: data.spokenResponseTranslation,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: data.topic || 'Voice Session',
        };
        setTranscriptHistory((prev) => [...prev, guruMessage]);

        if (onEarnXp) onEarnXp(15);

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
            if (isContinuousRef.current && !quotaReachedRef.current) {
              setTimeout(() => {
                if (isContinuousRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
                  startListeningLoop();
                }
              }, 900);
            }
          },
          englishFallback
        );
      } catch (err) {
        console.error('[VoiceMode] Audio query failed:', err);
        setLiveUserSpeech('');
        const fallback: TranscriptItem = {
          id: `guru-fallback-${Date.now()}`,
          sender: 'guru',
          text: "Hmm, I didn't quite catch that. Let's try again - what would you like to talk about?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: 'Voice Session',
        };
        setTranscriptHistory((prev) => [...prev, fallback]);
        setIsSpeaking(false);

        if (isContinuousRef.current && !quotaReachedRef.current) {
          setTimeout(() => {
            if (isContinuousRef.current && !isProcessingRef.current) {
              startListeningLoop();
            }
          }, 600);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedLanguage, transcriptHistory, onEarnXp, tokensUsed]
  );

  const startRecordingClip = () => {
    if (!mediaStreamRef.current || isRecordingRef.current) return;
    const mimeType = mimeTypeRef.current;
    try {
      const recorder = mimeType
        ? new MediaRecorder(mediaStreamRef.current, { mimeType })
        : new MediaRecorder(mediaStreamRef.current);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        isRecordingRef.current = false;
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'audio/webm' });
        recordedChunksRef.current = [];
        if (blob.size > 500) {
          // Small blobs (a few hundred bytes) are essentially silence/noise -
          // not worth sending to the backend.
          handleAudioQuery(blob);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setLiveUserSpeech('Recording...');
    } catch (err) {
      console.error('[VoiceMode] Could not start MediaRecorder:', err);
    }
  };

  const stopRecordingClip = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) { }
    }
  };

  // Amplitude-based Voice Activity Detection: analyses raw mic audio to
  // decide when the user starts/stops talking, and drives MediaRecorder
  // start/stop accordingly. This replaces browser SpeechRecognition, which
  // proved unreliable across Android devices/browsers.
  const runVadTick = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / timeData.length);
    const freqAvg = freqData.reduce((s, v) => s + v, 0) / freqData.length;
    setAudioLevel(Math.min(Math.max(rms * 5, freqAvg / 90), 1));

    if (isSpeakingRef.current || isProcessingRef.current) {
      energySpeechRef.current = false;
      speechFramesRef.current = 0;
      setIsVoiceActive(false);
      animFrameRef.current = requestAnimationFrame(runVadTick);
      return;
    }

    if (!energySpeechRef.current) {
      noiseFloorRef.current = Math.min(0.04, noiseFloorRef.current * 0.97 + rms * 0.03);
    }

    const threshold = Math.max(
      VAD_MIN_RMS,
      noiseFloorRef.current * VAD_NOISE_MULTIPLIER + VAD_SPEECH_MARGIN
    );

    if (rms > threshold) {
      speechFramesRef.current += 1;
      silenceFramesRef.current = 0;
      if (speechFramesRef.current >= VAD_OPEN_FRAMES) {
        if (!energySpeechRef.current) {
          energySpeechRef.current = true;
          if (!speechStartedAtRef.current) {
            speechStartedAtRef.current = Date.now();
          }
          setIsVoiceActive(true);
          startRecordingClip();
        }
      }
    } else {
      silenceFramesRef.current += 1;
      speechFramesRef.current = 0;
      if (silenceFramesRef.current >= VAD_CLOSE_FRAMES && energySpeechRef.current) {
        energySpeechRef.current = false;
        setIsVoiceActive(false);
        const startedAt = speechStartedAtRef.current;
        const speechMs = startedAt ? Date.now() - startedAt : 0;
        speechStartedAtRef.current = null;
        if (speechMs >= VAD_MIN_SPEECH_MS) {
          stopRecordingClip();
        } else {
          // Too short to be real speech - discard without sending.
          if (mediaRecorderRef.current && isRecordingRef.current) {
            try {
              mediaRecorderRef.current.onstop = () => {
                isRecordingRef.current = false;
                recordedChunksRef.current = [];
              };
              mediaRecorderRef.current.stop();
            } catch (_) { }
          }
          setLiveUserSpeech('');
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(runVadTick);
  };

  const startListeningLoop = useCallback(async () => {
    if (quotaReachedRef.current) return;
    if (isProcessingRef.current || isSpeakingRef.current) return;
    if (mediaStreamRef.current) return; // already running

    setVoiceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      mediaStreamRef.current = stream;
      mimeTypeRef.current = pickSupportedMimeType();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setVoiceError('Audio processing is not supported in this browser.');
        return;
      }
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.45;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      runVadTick();
    } catch (err) {
      console.error('[VoiceMode] Could not start listening:', err);
      setVoiceError('Could not access the microphone - please check permissions or type below.');
      setIsListening(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isContinuousListening && !quotaReached) {
      const timer = setTimeout(() => startListeningLoop(), 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContinuousListening, selectedLanguage, quotaReached]);

  const toggleContinuousListening = async () => {
    sound.unlockAudio();
    sound.playTileClick();

    if (quotaReached) {
      return;
    }

    if (isSpeaking) {
      sound.stopSpeaking();
      setIsSpeaking(false);
    }

    if (isContinuousListening) {
      setIsContinuousListening(false);
      isContinuousRef.current = false;
      stopAudioCapture();
      return;
    }

    setVoiceError(null);
    setIsContinuousListening(true);
    isContinuousRef.current = true;
    startListeningLoop();
  };

  const handleResetSession = () => {
    sound.playTileClick();
    stopAudioCapture();
    sound.stopSpeaking();
    setTranscriptHistory([]);
    setLiveUserSpeech('');
    setTextInput('');
    setVoiceError(null);
    setIsSpeaking(false);
    setIsProcessing(false);

    if (isContinuousListening && !quotaReached) {
      setTimeout(() => startListeningLoop(), 300);
    }
  };

  const handleResetQuotaForTesting = () => {
    try {
      localStorage.removeItem(getTodayQuotaKey());
    } catch { }
    setTokensUsed(0);
    setQuotaReached(false);
    quotaReachedRef.current = false;
    if (isContinuousListening) {
      setTimeout(() => startListeningLoop(), 200);
    }
  };

  // Text input still goes through the original text-based flow.
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    if (quotaReachedRef.current || tokensUsed >= MAX_SESSION_TOKENS) return;

    const queryText = textInput.trim();
    sound.unlockAudio();
    setIsProcessing(true);
    setVoiceError(null);

    const userMessage: TranscriptItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTranscriptHistory((prev) => [...prev, userMessage]);
    setTextInput('');

    try {
      const res = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          language: selectedLanguage,
          sessionTokensUsed: tokensUsed,
          conversationHistory: transcriptHistory.slice(-4).map((t) => ({ sender: t.sender, text: t.text })),
        }),
      });
      const data = await res.json();

      if (data.quotaExceeded) {
        recordTokens(data.tokensUsed || 100);
        setQuotaReached(true);
        const limitMsg: TranscriptItem = {
          id: `quota-${Date.now()}`,
          sender: 'guru',
          text: 'You have reached the end of your quota today.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: 'Daily Quota Limit',
          isQuotaAlert: true,
        };
        setTranscriptHistory((prev) => [...prev, limitMsg]);
        return;
      }

      const consumed = data.tokensUsed || Math.ceil((queryText.length + 150) / 3);
      recordTokens(consumed);

      const spokenText = data.spokenResponse || "Let's keep practicing together.";
      const guruMessage: TranscriptItem = {
        id: `guru-${Date.now()}`,
        sender: 'guru',
        text: spokenText,
        textTranslation: data.spokenResponseTranslation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: data.topic || 'Voice Session',
      };
      setTranscriptHistory((prev) => [...prev, guruMessage]);
      if (onEarnXp) onEarnXp(15);

      const ttsLangId = selectedLanguage === 'tamil' ? 'tamil' : 'sanskrit';
      setIsSpeaking(true);
      sound.speak(
        spokenText,
        ttsLangId,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        data.spokenResponseTranslation || undefined
      );
    } catch (err) {
      console.error('[VoiceMode] Text query failed:', err);
      const fallback: TranscriptItem = {
        id: `guru-fallback-${Date.now()}`,
        sender: 'guru',
        text: "Hmm, I didn't quite catch that. Let's try again - what would you like to talk about?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: 'Voice Session',
      };
      setTranscriptHistory((prev) => [...prev, fallback]);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentLangObj =
    LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguage) || LANGUAGE_OPTIONS[0];

  const quotaPercent = Math.min(100, Math.round((tokensUsed / MAX_SESSION_TOKENS) * 100));

  return (
    <div className="relative flex flex-col items-center px-3 sm:px-6 pb-6 max-w-2xl mx-auto select-none animate-in fade-in duration-300">

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

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-emerald-400 animate-ping' : isListening ? 'bg-[#C5A059] animate-pulse' : 'bg-white/30'}`} />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-[#C5A059] uppercase font-mono">
            VĀK VOICE SESSION
          </span>
          <AudioLines className="w-3.5 h-3.5 text-[#C5A059]" />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-voice-reset"
            onClick={handleResetSession}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Reset Transcript"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full mt-2.5 px-3.5 py-2 rounded-xl bg-[#141414]/80 border border-white/10 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${quotaReached ? 'text-red-400' : 'text-[#C5A059]'}`} />
          <span className="text-[11px] text-white/60 font-medium">Daily Token Quota:</span>
          <span className={`font-mono text-[11px] font-semibold ${quotaReached ? 'text-red-400' : 'text-[#DFC386]'}`}>
            {tokensUsed.toLocaleString()} / {MAX_SESSION_TOKENS.toLocaleString()} tokens
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-20 sm:w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${quotaReached ? 'bg-red-500' : quotaPercent > 80 ? 'bg-amber-400' : 'bg-[#C5A059]'}`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/40">{quotaPercent}%</span>

          {quotaReached && (
            <button
              onClick={handleResetQuotaForTesting}
              className="text-[10px] text-[#C5A059] hover:underline ml-1 cursor-pointer"
              title="Reset today's usage for testing"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {quotaReached && (
        <div className="w-full mt-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center gap-2.5 text-xs text-red-200 animate-in fade-in">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-300">You have reached the end of your quota today.</p>
            <p className="text-[11px] text-red-300/70 mt-0.5">Your daily token barrier has been reached. Quota refreshes daily.</p>
          </div>
        </div>
      )}

      <div className="relative z-30 my-2.5">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${selectedLanguage === lang.id
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

      <div className="relative my-2 sm:my-3 flex flex-col items-center">
        <VoicePoweredOrb
          audioLevel={audioLevel}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isActive={!quotaReached}
          className="w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64"
        />

        {liveUserSpeech && isListening && !isSpeaking && !isProcessing && (
          <div className="mt-2.5 max-w-xs bg-black/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#C5A059]/50 text-xs text-[#DFC386] shadow-lg flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate">{liveUserSpeech}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 my-2 w-full">
        <Button
          id="btn-voice-vad-toggle"
          variant="gold"
          size="pill"
          onClick={toggleContinuousListening}
          disabled={quotaReached || isProcessing}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold shadow-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${quotaReached
            ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            : isVoiceActive
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black animate-pulse shadow-emerald-500/30 scale-105'
              : isSpeaking
                ? 'bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-emerald-500/20'
                : isProcessing
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-purple-500/30'
                  : isContinuousListening
                    ? 'bg-gradient-to-r from-[#DFC386] to-[#C5A059] text-black hover:brightness-110 shadow-[#C5A059]/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white/80 border border-white/10'
            }`}
        >
          {quotaReached ? (
            <>
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Quota Exceeded</span>
            </>
          ) : isVoiceActive ? (
            <>
              <Radio className="w-4 h-4 animate-ping text-black" />
              <span>Voice Detected • Listening…</span>
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Speaking Response • Tap to Mute</span>
            </>
          ) : isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Synthesizing response…</span>
            </>
          ) : isContinuousListening ? (
            <>
              <Mic className="w-4 h-4 text-black animate-pulse" />
              <span>Continuous VAD Active • Listening</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4" />
              <span>Resume Continuous Listening</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-white/50 font-light text-center px-2">
          {quotaReached
            ? 'Daily session quota exhausted. Quota resets tomorrow.'
            : isVoiceActive
              ? 'Voice activity detected — pause speaking to send query.'
              : isSpeaking
                ? 'Playing audio response in selected tradition.'
                : isProcessing
                  ? 'Formulating response from classical corpus.'
                  : isContinuousListening
                    ? 'Continuous Voice Activity Detection is active. Speak naturally at any time.'
                    : 'Continuous listening is paused. Tap button above to resume.'}
        </p>

        {voiceError && (
          <div className="flex items-start gap-2 text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-500/20 rounded-xl px-3 py-2 max-w-sm text-center">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleTextSubmit}
        className="w-full flex items-center gap-2 mt-2 mb-3"
      >
        <input
          ref={textInputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={quotaReached ? 'Quota exceeded for today.' : 'Type your inquiry here…'}
          disabled={quotaReached || isProcessing}
          className="flex-1 bg-[#161616] border border-white/10 focus:border-[#C5A059]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || quotaReached || isProcessing}
          className="p-2.5 rounded-xl bg-[#C5A059]/20 hover:bg-[#C5A059]/30 border border-[#C5A059]/40 text-[#DFC386] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="w-full bg-[#121212]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <button
          id="btn-toggle-transcript"
          onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          className="w-full px-5 py-3 flex items-center justify-between bg-white/[0.02] border-b border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#C5A059]">
            <BookOpen className="w-4 h-4" />
            <span>Session Transcript</span>
            <span className="ml-1 text-[10px] font-normal text-white/30 normal-case tracking-normal">
              ({transcriptHistory.length} message{transcriptHistory.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
              {transcriptHistory.length > 0 ? 'Active Session' : 'Ready'}
            </span>
            {isTranscriptOpen
              ? <ChevronDown className="w-4 h-4 text-white/50" />
              : <ChevronUp className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {isTranscriptOpen && (
          <div className="p-4 sm:p-5 max-h-64 overflow-y-auto space-y-4 text-sm leading-relaxed no-scrollbar">
            {transcriptHistory.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-xs">
                <p className="font-medium text-white/60">Voice Assistant Ready</p>
                <p className="mt-1 text-[11px]">Continuous Voice Activity Detection (VAD) is active. Speak in your chosen language or select a prompt.</p>
              </div>
            ) : (
              transcriptHistory.map((item) => {
                const isGuru = item.sender === 'guru';
                const isAlert = item.isQuotaAlert;
                return (
                  <div
                    key={item.id}
                    className={`space-y-1.5 ${isAlert
                      ? 'bg-red-950/20 border border-red-500/30 p-3 rounded-xl'
                      : isGuru
                        ? 'text-left'
                        : 'text-right bg-white/[0.03] p-2.5 rounded-xl border border-white/5'
                      }`}
                  >
                    <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 ${!isGuru ? 'justify-end' : ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-red-400' : 'bg-[#C5A059]'}`} />
                      <span>{item.timestamp}</span>
                      <span>•</span>
                      <span className="font-semibold text-white/60">{isGuru ? 'AI GURU' : 'SEEKER'}</span>
                      {item.topic && isGuru && (
                        <>
                          <span>•</span>
                          <span className={isAlert ? 'text-red-400' : 'text-[#C5A059]/80'}>{item.topic}</span>
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

                    <div className={`text-xs sm:text-sm ${isAlert ? 'text-red-300 font-medium' : 'text-white/85'} leading-relaxed ${isGuru ? 'pl-2 border-l-2 border-[#C5A059]/40 mt-1.5' : ''
                      }`}>
                      {item.text}
                    </div>

                    {item.textTranslation && isGuru && !isAlert && (
                      <p className="text-[11px] text-white/45 italic mt-1 pl-2">
                        ↳ {item.textTranslation}
                      </p>
                    )}
                  </div>
                );
              })
            )}

            <div ref={transcriptBottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};