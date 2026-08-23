// Web SpeechRecognition helper with phonetic & Devanagari similarity evaluation

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechRecognitionResultData {
  transcript: string;
  confidence: number;
  score: number; // 0 to 100
  status: 'perfect' | 'good' | 'close' | 'retry';
  feedback: string;
  matchedTarget: string;
}

export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

// Normalize Devanagari text for comparison
export function normalizeDevanagari(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[।॥,.!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Normalize Latin/IAST transliterations
export function normalizeTransliteration(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[āáàâäã]/g, 'a')
    .replace(/[īíìîï]/g, 'i')
    .replace(/[ūúùûü]/g, 'u')
    .replace(/[ṛṝ]/g, 'ri')
    .replace(/[ḹḷ]/g, 'li')
    .replace(/[ēéèêë]/g, 'e')
    .replace(/[ōóòôö]/g, 'o')
    .replace(/[ñṅṇ]/g, 'n')
    .replace(/[ṃṁ]/g, 'm')
    .replace(/[ḥ]/g, 'h')
    .replace(/[śṣ]/g, 'sh')
    .replace(/[ṭ]/g, 't')
    .replace(/[ḍ]/g, 'd')
    .replace(/[jñ]/g, 'gy')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Compute Levenshtein distance
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = [];
  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[m][n];
}

// Calculate similarity ratio between 0 and 1
export function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  // Check substring contains
  if (longer.includes(shorter) && shorter.length >= 2) {
    return 0.9;
  }

  const distance = levenshteinDistance(longer, shorter);
  return Math.max(0, (longer.length - distance) / longer.length);
}

// Evaluate spoken transcript against target word (script and IAST)
export function evaluatePronunciation(
  transcript: string,
  targetScript: string,
  targetIast: string,
  englishMeaning?: string
): SpeechRecognitionResultData {
  const cleanTranscript = transcript.trim();
  const normSpokenDeva = normalizeDevanagari(cleanTranscript);
  const normSpokenLatin = normalizeTransliteration(cleanTranscript);

  const normTargetDeva = normalizeDevanagari(targetScript);
  const normTargetLatin = normalizeTransliteration(targetIast);
  const normEnglish = normalizeTransliteration(englishMeaning || '');

  // Compare script similarity
  const devaSim = calculateSimilarity(normSpokenDeva, normTargetDeva);
  // Compare transliteration similarity
  const latinSim = calculateSimilarity(normSpokenLatin, normTargetLatin);
  // Compare against English if user spoke translation
  const engSim = normEnglish ? calculateSimilarity(normSpokenLatin, normEnglish) * 0.75 : 0;

  // Maximum similarity
  const bestSimilarity = Math.max(devaSim, latinSim, engSim);
  let score = Math.round(bestSimilarity * 100);

  // Direct exact match boost
  if (normSpokenDeva === normTargetDeva || normSpokenLatin === normTargetLatin) {
    score = 100;
  } else if (normSpokenDeva.includes(normTargetDeva) || normTargetDeva.includes(normSpokenDeva)) {
    score = Math.max(score, 88);
  } else if (normSpokenLatin.includes(normTargetLatin) || normTargetLatin.includes(normSpokenLatin)) {
    score = Math.max(score, 85);
  }

  let status: 'perfect' | 'good' | 'close' | 'retry' = 'retry';
  let feedback = '';

  if (score >= 85) {
    status = 'perfect';
    feedback = 'उत्तमम्! (Uttamam!) Flawless classical articulation and rhythm.';
  } else if (score >= 65) {
    status = 'good';
    feedback = 'साधु! (Sādhu!) Very good pronunciation. Focus slightly on vowel length and aspiration.';
  } else if (score >= 40) {
    status = 'close';
    feedback = 'Close effort. Listen to the audio and recite with open, resonant breath.';
  } else {
    status = 'retry';
    feedback = 'Keep practicing. Repeat the syllables distinctly after listening to the Guru.';
  }

  return {
    transcript: cleanTranscript,
    confidence: bestSimilarity,
    score,
    status,
    feedback,
    matchedTarget: targetScript,
  };
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        this.recognition = new SpeechRecognitionConstructor();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
      }
    }
  }

  public isAvailable(): boolean {
    return !!this.recognition;
  }

  public startListening(
    langCode: string,
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.recognition) {
      onError('Speech Recognition is not supported in this browser.');
      return false;
    }

    try {
      if (this.isListening) {
        this.recognition.stop();
      }

      // Map language tradition to BCP-47 tag for Web Speech API
      let recognitionLang = 'hi-IN'; // Default to Hindi-India for classical Indian scripts
      if (langCode === 'tamil') recognitionLang = 'ta-IN';
      else if (langCode === 'telugu') recognitionLang = 'te-IN';
      else if (langCode === 'kannada') recognitionLang = 'kn-IN';
      else if (langCode === 'malayalam') recognitionLang = 'ml-IN';
      else if (langCode === 'sanskrit' || langCode === 'prakrit' || langCode === 'pali') recognitionLang = 'hi-IN';

      this.recognition.lang = recognitionLang;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onResult(finalTranscript, true);
        } else if (interimTranscript) {
          onResult(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        let msg = 'Speech recognition error';
        if (event.error === 'not-allowed') {
          msg = 'Microphone access was denied. Please allow microphone permissions.';
        } else if (event.error === 'no-speech') {
          msg = 'No speech was detected. Please try speaking closer to the microphone.';
        } else if (event.error === 'network') {
          msg = 'Network error occurred during speech recognition.';
        }
        onError(msg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.isListening = false;
      onError(err?.message || 'Failed to start speech recognition.');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore stop error
      }
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechRecognitionService();
