import { TraditionId } from '../types';

export interface MistakeItem {
  id: string;
  source: 'lesson' | 'flashcard' | 'picture_quiz' | 'battle';
  languageId: TraditionId;
  question: string;
  userWrongAnswer?: string;
  correctAnswer: string;
  transliteration?: string;
  explanation?: string;
  timestamp: number;
  options?: string[]; // for multiple choice re-attempt
  correctIndex?: number;
}

const STORAGE_KEY = 'vakya_mistakes_vault';

export function getMistakesVault(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMistakesVault(items: MistakeItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mistakes_vault_updated', { detail: items }));
    }
  } catch (err) {
    console.warn('[mistakesVault] Failed to save mistakes:', err);
  }
}

export function logMistake(entry: Omit<MistakeItem, 'id' | 'timestamp'>): MistakeItem {
  const current = getMistakesVault();
  
  // Prevent duplicate logs of the identical question within the vault
  const existingIdx = current.findIndex(
    (m) => m.question.trim().toLowerCase() === entry.question.trim().toLowerCase() && m.languageId === entry.languageId
  );

  const newMistake: MistakeItem = {
    ...entry,
    id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  let updated: MistakeItem[];
  if (existingIdx >= 0) {
    // Update existing mistake with newest attempt
    updated = [...current];
    updated[existingIdx] = newMistake;
  } else {
    updated = [newMistake, ...current];
  }

  saveMistakesVault(updated);
  return newMistake;
}

export function resolveMistake(id: string): MistakeItem[] {
  const current = getMistakesVault();
  const filtered = current.filter((m) => m.id !== id);
  saveMistakesVault(filtered);
  return filtered;
}

export function clearAllMistakes(languageId?: TraditionId): void {
  if (!languageId) {
    saveMistakesVault([]);
    return;
  }
  const current = getMistakesVault();
  saveMistakesVault(current.filter((m) => m.languageId !== languageId));
}
