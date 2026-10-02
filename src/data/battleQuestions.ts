/**
 * Classical quiz questions bank for Sanskrit, Pali, and Tamil.
 * Used for battle quizzes, bot matchmaking, and fallback question generation.
 */

export interface BattleQuestionItem {
  id: string;
  round: number;
  question_tag: string;
  instruction: string;
  question_text: string;
  answers: [string, string, string, string];
  correct_index: number;
}

export const QUESTION_BANK: Record<string, BattleQuestionItem[]> = {
  Sanskrit: [
    {
      id: 'sk_1',
      round: 1,
      question_tag: 'Sandhi & Basics',
      instruction: 'Identify the combined form',
      question_text: 'What is the Sandhi of: "देव + आलयः" (deva + ālayaḥ)?',
      answers: ['देवालयः', 'देवलयः', 'देवकालयः', 'देव्यालयः'],
      correct_index: 0,
    },
    {
      id: 'sk_2',
      round: 2,
      question_tag: 'Grammar',
      instruction: 'Identify the grammatical case',
      question_text: 'In "रामेण हतः", what vibhakti (case) is "रामेण"?',
      answers: ['Dvitīyā', 'Tṛtīyā (Instrumental)', 'Caturthī', 'Pañcamī'],
      correct_index: 1,
    },
    {
      id: 'sk_3',
      round: 3,
      question_tag: 'Vocabulary',
      instruction: 'Select the correct translation',
      question_text: 'What is the classical Sanskrit term for "Elephant"?',
      answers: ['अश्वः', 'सिंहः', 'गजः', 'मर्कटः'],
      correct_index: 2,
    },
    {
      id: 'sk_4',
      round: 4,
      question_tag: 'Classical Literature',
      instruction: 'Complete the aphorism',
      question_text: '"विद्वान् सर्वत्र ..." complete the verse:',
      answers: ['पूज्यते', 'गच्छति', 'तिष्ठति', 'जयति'],
      correct_index: 0,
    },
    {
      id: 'sk_5',
      round: 5,
      question_tag: 'Dhātu Root',
      instruction: 'Identify the verb root',
      question_text: 'What is the root (Dhātu) of "गच्छति" (gacchati)?',
      answers: ['√चल्', '√गम् (gam)', '√स्था', '√दृश्'],
      correct_index: 1,
    },
    {
      id: 'sk_6',
      round: 6,
      question_tag: 'Subhāṣita',
      instruction: 'Identify the meaning',
      question_text: 'What does "सत्यमेव जयते" mean?',
      answers: ['Truth alone triumphs', 'Wisdom conquers all', 'Knowledge is power', 'Peace is supreme'],
      correct_index: 0,
    },
    {
      id: 'sk_7',
      round: 7,
      question_tag: 'Sandhi',
      instruction: 'Split the compound',
      question_text: 'What is the Vigraha of "सूर्योदयः"?',
      answers: ['सूर्य + उदयः', 'सूर्यो + दयः', 'सूर्य + दयः', 'सूर्या + उदयः'],
      correct_index: 0,
    },
  ],
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

export function getQuestionsForCategory(category: string, count = 5): BattleQuestionItem[] {
  let list = QUESTION_BANK[category];
  if (!list || list.length === 0) {
    list = QUESTION_BANK['Sanskrit'];
  }
  // Shuffle or slice
  const result: BattleQuestionItem[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      ...list[i % list.length],
      round: i + 1,
    });
  }
  return result;
}
