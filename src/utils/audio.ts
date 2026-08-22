/**
 * Web Audio API synthesized cues and SpeechSynthesis for Classical Pronunciation
 * with Voice Sync callbacks for 2D Teacher Mascot & Resonant Vedic Chanting Synthesizer
 */

type SpeechCallback = () => void;

// Simple and robust Devanagari to Latin phonetic transliterator for TTS on English voices
export function devanagariToPhonetic(text: string): string {
  if (!text) return '';
  // If not containing devanagari characters, return as is
  if (!/[\u0900-\u097F]/.test(text)) {
    return text;
  }

  const vowels: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'aha',
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'm', 'ः': 'h', 'ँ': 'n',
  };

  const consonants: Record<string, string> = {
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gyan', 'श्र': 'shra',
  };

  let result = '';
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];
    const virama = '\u094D'; // halant/virama

    if (consonants[char]) {
      const cons = consonants[char];
      if (nextChar === virama) {
        result += cons.slice(0, -1);
        i += 2;
      } else if (nextChar && vowels[nextChar]) {
        result += cons.slice(0, -1) + vowels[nextChar];
        i += 2;
      } else {
        result += cons;
        i += 1;
      }
    } else if (vowels[char]) {
      result += vowels[char];
      i += 1;
    } else {
      result += char;
      i += 1;
    }
  }

  return result.replace(/।|॥/g, '.').replace(/\s+/g, ' ').trim();
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private speechListeners: Set<(isSpeaking: boolean, text?: string) => void> = new Set();
  private isMuted: boolean = false;
  private volume: number = 1.0;
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      
      // Auto unlock on first user gesture anywhere on page
      const unlockHandler = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
        window.removeEventListener('touchstart', unlockHandler);
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
    }
  }

  public initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list && list.length > 0) {
          this.voices = list;
        }
      } catch (e) {
        console.warn('Could not load speech voices', e);
      }
    }
  }

  public unlockAudio() {
    this.isAudioUnlocked = true;
    this.initCtx();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Subscribe to speech state changes (used by animated Guru)
  onSpeechStateChange(listener: (isSpeaking: boolean, text?: string) => void) {
    this.speechListeners.add(listener);
    return () => {
      this.speechListeners.delete(listener);
    };
  }

  private notifySpeechState(isSpeaking: boolean, text?: string) {
    this.speechListeners.forEach((fn) => {
      try {
        fn(isSpeaking, text);
      } catch (err) {
        console.error('Error notifying speech state', err);
      }
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSpeaking();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Tactile parchment tap sound
  playTileClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio fallback silent
    }
  }

  // Harmonic classical chime for correct answers (Bhairav / Bilawal scale tones)
  playSuccessChime() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // Sa Ga Pa Sa' Ga'
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);

        gain.gain.setValueAtTime(0, this.ctx.currentTime + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.18 * this.volume, this.ctx.currentTime + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.05 + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.05);
        osc.stop(this.ctx.currentTime + idx * 0.05 + 0.7);
      });
    } catch {
      // Audio fallback
    }
  }

  // Soft low gong for mistakes
  playErrorChime() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(196, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(98, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.16 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Audio fallback
    }
  }

  // Harmonic Tanpura / Tambura resonance string pluck with drone overtones
  playTanpuraPluck(freq: number = 220, duration: number = 1.6) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t0 = this.ctx.currentTime;
      // Multi-harmonic rich acoustic string synthesis
      const harmonics = [
        { f: freq, gain: 0.15 },
        { f: freq * 1.5, gain: 0.10 }, // Pa (5th harmonic)
        { f: freq * 2, gain: 0.08 },   // Sa octave
        { f: freq * 0.5, gain: 0.12 }, // Mandra low base
      ];

      harmonics.forEach(({ f, gain: gWeight }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t0);
        osc.frequency.exponentialRampToValueAtTime(f * 0.998, t0 + duration);

        gainNode.gain.setValueAtTime(gWeight * this.volume, t0);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(t0);
        osc.stop(t0 + duration);
      });
    } catch {
      // fallback
    }
  }

  // Vedic Chanting Vocal Resonator (Harmonic acoustic formant synthesis for Om / sacred chants)
  playVedicChantResonance(durationSeconds: number = 2.0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const baseFreq = 136.1; // 136.1 Hz = Traditional 'Om' / Cosmic Frequency (C#3)

      // Fundamental and vowel formants (A-U-M formant filters)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      // Natural chanting pitch drift
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.01, now + durationSeconds * 0.5);
      osc.frequency.linearRampToValueAtTime(baseFreq, now + durationSeconds);

      // Formant vowel filter sweeping from 'Ah' (800Hz) to 'Oo' (400Hz) to 'Mm' (250Hz)
      filter.type = 'bandpass';
      filter.Q.value = 4.5;
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + durationSeconds * 0.6);
      filter.frequency.exponentialRampToValueAtTime(240, now + durationSeconds);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22 * this.volume, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSeconds);
    } catch {
      // fallback
    }
  }

  // Speak classical word or quote using Web Speech API with fail-safe fallbacks
  speak(
    text: string,
    langId: string = 'sanskrit',
    onStart?: SpeechCallback,
    onEnd?: SpeechCallback,
    customPhonetic?: string
  ) {
    if (typeof window === 'undefined' || this.isMuted) return;

    this.unlockAudio();

    // Always trigger rich acoustic Tanpura chord as warm musical foundation
    this.playTanpuraPluck(langId === 'tamil' ? 240 : 220, 2.2);

    if (!('speechSynthesis' in window)) {
      // Fallback: acoustic chant resonance + visual speech sync
      this.playVedicChantResonance(2.2);
      this.notifySpeechState(true, text);
      onStart?.();
      setTimeout(() => {
        this.notifySpeechState(false);
        onEnd?.();
      }, 2200);
      return;
    }

    try {
      // Resume speech synthesis to prevent browser stuck state
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      if (this.voices.length === 0) {
        this.loadVoices();
      }

      // Check available voices for Indian or suitable language match
      const indianVoice = this.voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.lang.toLowerCase().startsWith('ta') ||
          v.lang.toLowerCase().startsWith('te') ||
          v.lang.toLowerCase().startsWith('kn') ||
          v.lang.toLowerCase().startsWith('mr') ||
          v.lang.toLowerCase().startsWith('sa') ||
          v.lang.toLowerCase().includes('in') ||
          v.name.toLowerCase().includes('india') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.toLowerCase().includes('tamil') ||
          v.name.toLowerCase().includes('veena') ||
          v.name.toLowerCase().includes('kalpana') ||
          v.name.toLowerCase().includes('rishi')
      );

      // Clean text of punctuation
      const cleanText = text.replace(/[:|।॥]/g, ' ').trim();

      // If an Indian voice is available, use native script.
      // If ONLY Western/English voices exist, convert Devanagari to clean phonetic Latin so it speaks clearly!
      let spokenText = cleanText;
      let targetLangTag = 'hi-IN';

      if (langId === 'tamil') {
        targetLangTag = 'ta-IN';
      } else {
        targetLangTag = 'hi-IN';
      }

      if (!indianVoice) {
        // Fallback to phonetic romanization for standard English voices
        spokenText = customPhonetic || devanagariToPhonetic(cleanText);
        targetLangTag = 'en-IN';
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      this.activeUtterance = utterance;
      // Prevent browser garbage collection of active utterance
      (window as any).__vākya_active_utterance = utterance;

      if (indianVoice) {
        utterance.voice = indianVoice;
        utterance.lang = indianVoice.lang;
      } else if (this.voices.length > 0) {
        // Use best available fallback voice (e.g. English)
        const englishVoice =
          this.voices.find((v) => v.lang.startsWith('en')) || this.voices[0];
        if (englishVoice) {
          utterance.voice = englishVoice;
          utterance.lang = englishVoice.lang;
        }
      }

      utterance.volume = this.volume;
      utterance.rate = 0.85; // Classical measured cadence
      utterance.pitch = 1.05; // Warm, reverent guru pitch

      let hasEnded = false;
      const safeEnd = () => {
        if (!hasEnded) {
          hasEnded = true;
          this.notifySpeechState(false);
          this.activeUtterance = null;
          (window as any).__vākya_active_utterance = null;
          onEnd?.();
        }
      };

      utterance.onstart = () => {
        this.notifySpeechState(true, cleanText);
        onStart?.();
      };

      utterance.onend = safeEnd;
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis utterance error, running acoustic fallback', e);
        // Play acoustic Vedic resonance so user still hears Guru's chant!
        this.playVedicChantResonance(1.8);
        safeEnd();
      };

      // Fallback timer in case onend never fires (common browser bug)
      const estimatedDuration = Math.max(1500, (spokenText.length / 8) * 1000);
      setTimeout(() => {
        if (!hasEnded && this.activeUtterance === utterance) {
          safeEnd();
        }
      }, estimatedDuration + 1500);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis exception, fallback to acoustic resonance', err);
      this.playVedicChantResonance(2.0);
      this.notifySpeechState(true, text);
      onStart?.();
      setTimeout(() => {
        this.notifySpeechState(false);
        onEnd?.();
      }, 2000);
    }
  }

  // Pronounce Guru greeting or tip
  speakGuruWisdom(
    phrase: string,
    onStart?: SpeechCallback,
    onEnd?: SpeechCallback,
    phonetic?: string
  ) {
    this.speak(phrase, 'sanskrit', onStart, onEnd, phonetic);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.notifySpeechState(false);
      this.activeUtterance = null;
    }
  }
}

export const sound = new SoundEngine();
