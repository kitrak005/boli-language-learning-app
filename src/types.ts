export type TraditionId = 'sanskrit' | 'pali' | 'tamil';

export interface LanguageTradition {
  id: TraditionId;
  name: string;
  nativeScript: string;
  description: string;
  progressPercentage: number;
  levelName: string;
  buttonLabel: string;
  icon: string;
  color: string;
  accentBg: string;
  scriptFont?: string;
}

export type NodeStatus = 'completed' | 'active' | 'locked';
export type NodeIcon = 'check' | 'star' | 'play' | 'lock';

export interface WordTile {
  id: string;
  script: string;
  transliteration: string;
  english?: string;
}

export interface Exercise {
  id: string;
  type: 'translate' | 'multiple_choice' | 'script_match';
  instruction: string;
  promptText: string;
  targetTranslation: string;
  targetScript?: string;
  targetTransliteration?: string;
  wordBank: WordTile[];
  correctSequence: string[]; // array of word tile IDs in order
  explanation?: string;
  culturalContext?: string;
}

export interface SkillNode {
  id: string;
  levelNumber: number;
  title: string;
  subtitle: string;
  status: NodeStatus;
  iconType: NodeIcon;
  alignment: 'center' | 'left' | 'right';
  progressPercentage?: number;
  exercises: Exercise[];
}

export interface XpDayRecord {
  day: string;
  shortDate: string;
  xp: number;
  goalXp: number;
}

export interface UserProfile {
  name: string;
  scholarLevel: string;
  roleTitle: string;
  avatarUrl: string;
  totalXp: number;
  streakDays: number;
  dailyXp: number;
  maxDailyXp: number;
  languageMastery: {
    sanskrit: number;
    pali: number;
    tamil: number;
  };
  weeklyXpHistory?: XpDayRecord[];
  achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    unlocked: boolean;
  }[];
}

export interface WordOfTheDay {
  id: string;
  languageId: TraditionId;
  script: string;
  transliteration: string;
  englishMeaning: string;
  etymology: string;
  verseExample?: {
    script: string;
    transliteration: string;
    translation: string;
    source: string;
  };
}

export interface FlashcardItem {
  id: string;
  languageId: TraditionId;
  script: string;
  transliteration: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence: string;
  masteryLevel: number; // 0 to 5
}

export interface ClassicalVerse {
  id: string;
  traditionId: TraditionId;
  workTitle: string;
  chapter: string;
  verseRef: string;
  script: string;
  transliteration: string;
  translation: string;
  wordByWord: {
    word: string;
    transliteration: string;
    meaning: string;
  }[];
  philosophicalNote: string;
}
