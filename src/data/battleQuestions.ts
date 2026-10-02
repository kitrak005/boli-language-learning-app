/**
 * Classical quiz questions bank for Sanskrit, Pali, and Tamil.
 * Seeded with 30 pre-verified Sanskrit Multiple-Choice Questions (MCQs)
 * eliminating live LLM runtime calls during gameplay.
 */

import SANSKRIT_30_MCQS from './sanskritQuestionsDataset.json';

export interface BattleQuestionItem {
  id: string;
  round: number;
  question_tag: string;
  instruction: string;
  question_text: string;
  answers: [string, string, string, string];
  correct_index: number;
}

export interface RawStaticMCQ {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  category: string;
  time_limit_sec: number;
}

export const SANSKRIT_STATIC_MCQS: RawStaticMCQ[] = SANSKRIT_30_MCQS;

const SANSKRIT_QUESTION_ITEMS: BattleQuestionItem[] = SANSKRIT_30_MCQS.map((q, idx) => ({
  id: q.id,
  round: (idx % 5) + 1,
  question_tag: `संस्कृतम् • ${q.category}`,
  instruction:
    q.category === 'Vyakaran'
      ? 'उचितं व्याकरणविकल्पं चिनुत'
      : 'उचितं साहित्यिकविकल्पं चिनुत',
  question_text: q.question,
  answers: q.options as [string, string, string, string],
  correct_index: q.correct_index,
}));

export const QUESTION_BANK: Record<string, BattleQuestionItem[]> = {
  Sanskrit: SANSKRIT_QUESTION_ITEMS,
  Pali: [
    {
      id: 'pl_1',
      round: 1,
      question_tag: 'Dhammapada',
      instruction: 'Complete the verse',
      question_text: '"मनोपुब्बङ्गमा धम्मा मनोसेट्ठा ..." complete the line:',
      answers: ['मनोमया', 'सुखमेधति', 'पापमेधति', 'तपोधना'],
      correct_index: 0,
    },
    {
      id: 'pl_2',
      round: 2,
      question_tag: 'Vocabulary',
      instruction: 'Identify the term',
      question_text: 'What does "Nibbāna" literally signify?',
      answers: ['Extinguishing of fire/craving', 'Eternal soul', 'Sacred fire', 'Endless journey'],
      correct_index: 0,
    },
    {
      id: 'pl_3',
      round: 3,
      question_tag: 'Grammar',
      instruction: 'Identify the person',
      question_text: 'In "bhavati" (he is), what person is this form?',
      answers: ['Pathama Purisa (3rd person)', 'Majjhima Purisa (2nd)', 'Uttama Purisa (1st)', 'None'],
      correct_index: 0,
    },
    {
      id: 'pl_4',
      round: 4,
      question_tag: 'Tripiṭaka',
      instruction: 'Select the Pitaka',
      question_text: 'Which Basket contains monastic disciplinary rules?',
      answers: ['Vinaya Piṭaka', 'Sutta Piṭaka', 'Abhidhamma Piṭaka', 'Jātaka'],
      correct_index: 0,
    },
    {
      id: 'pl_5',
      round: 5,
      question_tag: 'Phonology',
      instruction: 'Classical correspondence',
      question_text: 'What is the Sanskrit equivalent of Pali "Dhamma"?',
      answers: ['Dharma', 'Karma', 'Brahma', 'Śramana'],
      correct_index: 0,
    },
  ],
  Tamil: [
    {
      id: 'tm_1',
      round: 1,
      question_tag: 'Tirukkural',
      instruction: 'Complete the Kural',
      question_text: '"அகர முதல எழுத்தெல்லாம் ஆதி ..." completes with:',
      answers: ['பகவன் முதற்றே உலகு', 'அறிவினான் ஆகுவது உண்டோ', 'மலர்மிசை ஏகினான்', 'தனக்குவமை இல்லாதான்'],
      correct_index: 0,
    },
    {
      id: 'tm_2',
      round: 2,
      question_tag: 'Grammar (Tolkāppiyam)',
      instruction: 'Identify classification',
      question_text: 'In classical Tamil, what does "Uyir" (உயிர்) refer to?',
      answers: ['Vowels (Life sounds)', 'Consonants (Body sounds)', 'Nouns', 'Verbs'],
      correct_index: 0,
    },
    {
      id: 'tm_3',
      round: 3,
      question_tag: 'Sangam Literature',
      instruction: 'Identify landscape',
      question_text: 'What landscape (Tinai) represents mountains and lovers\' union?',
      answers: ['Kurinji (குறிஞ்சி)', 'Mullai (முல்லை)', 'Marutham (மருதம்)', 'Neythal (நெய்தல்)'],
      correct_index: 0,
    },
    {
      id: 'tm_4',
      round: 4,
      question_tag: 'Vocabulary',
      instruction: 'Select translation',
      question_text: 'What does "அறம்" (Aram) signify in classical Tamil philosophy?',
      answers: ['Virtue / Righteousness', 'Wealth', 'Desire', 'Liberation'],
      correct_index: 0,
    },
    {
      id: 'tm_5',
      round: 5,
      question_tag: 'Classical Canon',
      instruction: 'Identify the epic',
      question_text: 'Which is the famous epic poem of the anklet by Ilango Adigal?',
      answers: ['Silappatikaram', 'Manimekalai', 'Civaka Chintamani', 'Kundalakesi'],
      correct_index: 0,
    },
  ],
};

/**
 * Returns a randomized subset of pre-verified questions for the given category.
 * Shuffles questions so consecutive matches have varied gameplay.
 */
export function getQuestionsForCategory(category: string, count = 5): BattleQuestionItem[] {
  let list = QUESTION_BANK[category];
  if (!list || list.length === 0) {
    list = QUESTION_BANK['Sanskrit'];
  }

  // Fisher-Yates shuffle a clone of the list
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, count);
  return selected.map((q, idx) => ({
    ...q,
    round: idx + 1,
  }));
}
