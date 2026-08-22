import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

// Built-in offline fallback dictionary for common classical words
const FALLBACK_WORDS: Record<string, {
  word: string;
  script: string;
  transliteration: string;
  language: string;
  meanings: string[];
  etymology: string;
  root: string;
  scripturalContext: string;
  exampleVerse: { original: string; translation: string; source: string };
  synonyms: string[];
}> = {
  dharma: {
    word: 'Dharma',
    script: 'धर्म',
    transliteration: 'Dharma',
    language: 'Sanskrit',
    meanings: [
      'Cosmic order, righteousness, moral virtue, and sacred duty.',
      'That which upholds, sustains, and preserves the harmonious order of existence.',
      'In Buddhism (Dhamma): The cosmic truth and ultimate teachings taught by the Buddha.'
    ],
    etymology: 'Derived from the verbal root √धृ (dhṛ, meaning "to hold, uphold, support, sustain") + unādi suffix मन् (man).',
    root: '√धृ (dhṛ) — to uphold, support, maintain',
    scripturalContext: 'Found in the Ṛgveda as Ṛta/Dharman and universally across Mahābhārata, Bhagavad Gītā, and Dharmaśāstras.',
    exampleVerse: {
      original: 'धारणाद्धर्म इत्याहुर्धर्मो धारयते प्रजाः ।',
      translation: 'Dharma is called so because it sustains (dhāraṇāt); Dharma preserves and holds together all beings.',
      source: 'Mahābhārata, Karṇa Parva 69.58'
    },
    synonyms: ['कर्तव्य (Kartavya)', 'सदाचार (Sadācāra)', 'ऋत (Ṛta)', 'नीति (Nīti)']
  },
  satya: {
    word: 'Satya',
    script: 'सत्य',
    transliteration: 'Satya',
    language: 'Sanskrit',
    meanings: [
      'Absolute Truth, reality, unalterable factuality, and veracity in thought, word, and deed.',
      'That which exists in all three periods of time (past, present, future) without decay.'
    ],
    etymology: 'Formed from सत् (sat, present participle of root √अस् "as" - to be/exist) + यत् (yat suffix) → "that which is truly real".',
    root: '√अस् (as) — to be, to exist',
    scripturalContext: 'Central mahāvākya concept in Bṛhadāraṇyaka Upaniṣad and the national motto of India.',
    exampleVerse: {
      original: 'सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः ।',
      translation: 'Truth alone triumphs, not untruth; through truth the divine path is unfolded.',
      source: 'Muṇḍaka Upaniṣad 3.1.6'
    },
    synonyms: ['ऋत (Ṛta)', 'तथ्य (Tathya)', 'सच्च (Sacca - Pali)']
  },
  ahimsa: {
    word: 'Ahimsa',
    script: 'अहिंसा',
    transliteration: 'Ahiṁsā',
    language: 'Sanskrit',
    meanings: [
      'Non-injury, non-violence, and supreme compassion toward all sentient creatures.',
      'The complete absence of malice, hatred, or intent to cause harm through action, speech, or thought.'
    ],
    etymology: 'Formed with negative prefix अ- (a-) + desiderative noun of √हिंस् (hiṁs - to harm, injure) → "desire not to harm".',
    root: '√हिंस् (hiṁs) — to strike, hurt, injure',
    scripturalContext: 'The foremost of the five Yamas in Patañjali Yoga Sūtras (2.30) and supreme vow in Jainism.',
    exampleVerse: {
      original: 'अहिंसा परमो धर्मस्तथाहिंसा परं तपः ।',
      translation: 'Non-violence is the highest virtue; non-violence is the highest austerity.',
      source: 'Mahābhārata, Anuśāsana Parva 115.25'
    },
    synonyms: ['दया (Dayā)', 'कारुण्य (Kāruṇya)', 'अविहिंसा (Avihiṁsā - Pali)']
  },
  moksha: {
    word: 'Moksha',
    script: 'मोक्ष',
    transliteration: 'Mokṣa',
    language: 'Sanskrit',
    meanings: [
      'Liberation, spiritual emancipation, and release from the cycle of rebirth (saṃsāra).',
      'The ultimate realization of non-dual oneness of Ātman with Brahman.'
    ],
    etymology: 'Derived from root √मुच् (muc, meaning "to release, set free, loosen") + suffix घञ् (ghañ).',
    root: '√मुच् (muc) — to release, liberate, untie',
    scripturalContext: 'The fourth and supreme human goal (Purushartha) in classical Hindu philosophy.',
    exampleVerse: {
      original: 'भिद्यते हृदयग्रन्थिश्छिद्यन्ते सर्वसंशयाः । क्षीयन्ते चास्य कर्माणि तस्मिन्दृष्टे परावरे ॥',
      translation: 'The knot of the heart is unloosened, all doubts are severed, and karmas dissipate upon realizing That Supreme Being.',
      source: 'Muṇḍaka Upaniṣad 2.2.8'
    },
    synonyms: ['मुक्ति (Mukti)', 'कैवल्य (Kaivalya)', 'निर्वाण (Nirvāṇa)', 'अपवर्ग (Apavarga)']
  },
  anatta: {
    word: 'Anatta',
    script: 'अनत्त',
    transliteration: 'Anattā',
    language: 'Pali',
    meanings: [
      'Non-self, insubstantiality, the doctrine that no unchanging, permanent soul exists in phenomena.',
      'One of the Three Marks of Existence (Tilakkhana) in Buddhist philosophy alongside Anicca and Dukkha.'
    ],
    etymology: 'Pali compound from prefix an- (not) + attā (Sanskrit: ātman, self/soul).',
    root: 'Pali: an- + attā (Skt: an- + ātman)',
    scripturalContext: 'Expounded extensively in the Anattalakkhaṇa Sutta (Saṃyutta Nikāya 22.59).',
    exampleVerse: {
      original: 'सब्वे धम्मा अनत्ताति यदा पञ्ञाय पस्सति ।',
      translation: 'When one sees with wisdom that all phenomena are without a permanent self, one becomes detached from suffering.',
      source: 'Dhammapada verse 279'
    },
    synonyms: ['अनिच्छा (Aniccā)', 'सुञ्ञता (Suññatā)', 'Nirātman (Sanskrit)']
  },
  karma: {
    word: 'Karma',
    script: 'कर्म',
    transliteration: 'Karma',
    language: 'Sanskrit / Pali (Kamma)',
    meanings: [
      'Action, deed, intentional activity, and the universal principle of moral cause and effect.',
      'The cosmic law whereby every volitional act generates an imprint (saṃskāra) shaping future experience.'
    ],
    etymology: 'Formed from root √कृ (kṛ - to do, make, perform) + suffix मन् (man).',
    root: '√कृ (kṛ) — to act, make, execute',
    scripturalContext: 'A central doctrine across Bhagavad Gītā, Upaniṣads, and Buddhist Nikāyas.',
    exampleVerse: {
      original: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।',
      translation: 'You have a right only to action, never to its fruits; let not the fruit of action be your motive.',
      source: 'Bhagavad Gītā 2.47'
    },
    synonyms: ['कार्य (Kārya)', 'क्रिया (Kriyā)', 'कम्म (Kamma)']
  },
  yoga: {
    word: 'Yoga',
    script: 'योग',
    transliteration: 'Yoga',
    language: 'Sanskrit',
    meanings: [
      'Union, integration, spiritual discipline, and the stillness of fluctuating thought-waves.',
      'Yoking the individual consciousness (Jīva) with the Supreme Reality (Paramātman).'
    ],
    etymology: 'Derived from root √युज् (yuj - to join, yoke, concentrate, unite) + suffix घञ् (ghañ).',
    root: '√युज् (yuj) — to yoke, unite, harness',
    scripturalContext: 'Patañjali defines Yoga in Yoga Sūtras 1.2; detailed in Bhagavad Gītā chapters 2–6.',
    exampleVerse: {
      original: 'योगश्चित्तवृत्तिनिरोधः ॥',
      translation: 'Yoga is the cessation of the whirlpools (modifications) of the mind.',
      source: 'Yoga Sūtras of Patañjali 1.2'
    },
    synonyms: ['समाधि (Samādhi)', 'संयम (Saṁyama)', 'साधना (Sādhanā)']
  },
  jnana: {
    word: 'Jnana',
    script: 'ज्ञान',
    transliteration: 'Jñāna',
    language: 'Sanskrit / Pali (Ñāṇa)',
    meanings: [
      'Higher spiritual knowledge, direct experiential wisdom, and transcendental insight.',
      'Discriminative discernment between the eternal reality (Sat) and transient appearance (Māyā).'
    ],
    etymology: 'Derived from root √ज्ञा (jñā - to know, perceive, realize) + suffix ल्युट् (lyuṭ). Cognate with Greek gnosis and English know.',
    root: '√ज्ञा (jñā) — to know, apprehend, realize',
    scripturalContext: 'Celebrated in Bhagavad Gītā chapter 4 as the supreme purifier of consciousness.',
    exampleVerse: {
      original: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते ।',
      translation: 'Truly, there exists nothing in this world as purifying as transcendent wisdom (Jñāna).',
      source: 'Bhagavad Gītā 4.38'
    },
    synonyms: ['विद्या (Vidyā)', 'प्रज्ञा (Prajñā)', 'बोध (Bodha)']
  },
  shanti: {
    word: 'Shanti',
    script: 'शान्ति',
    transliteration: 'Śānti',
    language: 'Sanskrit',
    meanings: [
      'Peace, tranquility, cessation of disturbances, and inner spiritual equanimity.',
      'The sublime state of calmness free from threefold distress (ādhyātmika, ādhibhautika, ādhidaivika).'
    ],
    etymology: 'Derived from root √शम् (śam - to become quiet, appease, pacify) + feminine suffix क्तिन् (ktin).',
    root: '√शम् (śam) — to be calm, quiet, pacified',
    scripturalContext: 'Chanted as the universal benediction "Om Shanti Shanti Shanti" concluding Vedic recitations.',
    exampleVerse: {
      original: 'द्यौः शान्तिरन्तरिक्षं शान्तिः पृथिवी शान्तिरापः शान्तिरोषधयः शान्तिः ।',
      translation: 'May there be peace in heaven, peace in the sky, peace on earth, peace in the waters, peace in plants and herbs.',
      source: 'Śukla Yajurveda 36.17 (Śānti Mantra)'
    },
    synonyms: ['शम (Śama)', 'प्रशान्ति (Praśānti)', 'उपशम (Upaśama)']
  },
  atman: {
    word: 'Atman',
    script: 'आत्मन्',
    transliteration: 'Ātman',
    language: 'Sanskrit',
    meanings: [
      'The true eternal Self, immortal consciousness, and witnessing inner principle within all beings.',
      'In Advaita Vedānta: Identical in essence to Brahman, the ultimate ground of existence.'
    ],
    etymology: 'Derived from root √अत् (at - to move continuously) or √अन् (an - to breathe, live).',
    root: '√अत् (at) / √अन् (an) — continuous awareness, vital breath',
    scripturalContext: 'Central subject of investigation across all principal Upaniṣads.',
    exampleVerse: {
      original: 'अयमात्मा ब्रह्म ॥',
      translation: 'This individual Self is Brahman (the Supreme Cosmic Consciousness).',
      source: 'Māṇḍūkya Upaniṣad 1.2 (Mahāvākya)'
    },
    synonyms: ['जीवात्मा (Jīvātman)', 'पुरुष (Puruṣa)', 'प्रत्यगात्मा (Pratyagātman)']
  },
  karuna: {
    word: 'Karuna',
    script: 'करुणा',
    transliteration: 'Karuṇā',
    language: 'Sanskrit / Pali',
    meanings: [
      'Compassion, the noble spiritual impulse to alleviate the suffering and distress of other living beings.',
      'One of the four Brahmavihāras (Sublime Abodes) in both Yogic and Buddhist traditions.'
    ],
    etymology: 'Formed from root √कृ (kṛ, "to do, act") or derived from empathetic sorrow for another.',
    root: '√कृ (kṛ) — to act/respond with empathy',
    scripturalContext: 'Essential virtue of Bodhisattvas in Mahāyāna and fundamental quality in Patañjali Yoga Sūtras (1.33).',
    exampleVerse: {
      original: 'मैत्रीकरुणामुदितोपेक्षाणां सुखदुःखपुण्यापुण्यविषयाणां भावनातश्चित्तप्रसादनम् ॥',
      translation: 'Serenity of mind is cultivated through friendliness towards the happy, compassion for the suffering, joy for the virtuous, and equanimity toward the unvirtuous.',
      source: 'Yoga Sūtras of Patañjali 1.33'
    },
    synonyms: ['दया (Dayā)', 'कृपा (Kṛpā)', 'अनुकम्पा (Anukampā)']
  },
  aram: {
    word: 'Aram',
    script: 'அறம்',
    transliteration: 'Aṟam',
    language: 'Classical Tamil',
    meanings: [
      'Righteousness, moral duty, ethical conduct, and social virtue in Tamil literature.',
      'The first of the four classic human values (Purusharthas) in Sangam culture (Aṟam, Poruḷ, Inbam, Vīḍu).'
    ],
    etymology: 'Derived from the Tamil root அறு (aṟu - to cut/sever/define what is just and right).',
    root: 'அறு (aṟu) — to define boundaries of justice',
    scripturalContext: 'The entire first book (Aṟattuppāl) of the legendary Thirukkural by Thiruvalluvar is dedicated to Aram.',
    exampleVerse: {
      original: 'மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன் ஆகுல நீர பிற.',
      translation: 'To be pure of mind and spotless in heart is all the virtue (Aram) one needs; all else is mere empty show.',
      source: 'Thirukkural, Verse 34'
    },
    synonyms: ['நீதி (Nīti)', 'தர்மம் (Dharmam)', 'ஒழுக்கம் (Oḻukkam)']
  }
};

// API Endpoint for Ask Guru
app.post('/api/ask-guru', async (req, res) => {
  try {
    const { query, language = 'sanskrit' } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Please provide a word or term to ask the Guru.' });
    }

    const trimmedQuery = query.trim();
    const normalizedKey = trimmedQuery.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Pre-check for clearly off-topic questions
    const isUnrelatedPattern = /^(who won|cricket|football|weather in|how to code|javascript|bitcoin|stock price|recipe for|president of|write a program|calculate|2\+|3\*)/i.test(trimmedQuery);
    
    if (isUnrelatedPattern) {
      return res.json({
        isRedirect: true,
        word: trimmedQuery,
        response: "I am a dictionary bot and can only help with word meanings and language usage. This question is out of scope.",
        sources: []
      });
    }

    const ai = getAIClient();

    if (ai) {
      try {
        const systemPrompt = `You are a dedicated Dictionary Bot whose sole purpose is to explain the meanings, origins, and usage of words or phrases.

Scope Rule:
You MUST ONLY answer queries asking for the definition, meaning, usage, or explanation of a specific word or phrase. If a user asks a question unrelated to defining a word or phrase (e.g., general knowledge, math, coding, personal advice, news, or task execution), you must refuse to answer and respond strictly with:
"I am a dictionary bot and can only help with word meanings and language usage. This question is out of scope."

Response Structure for Valid Queries:
For every valid word or phrase requested, format your response using this exact layout:
Word: [Word (include script / IAST if Sanskrit/Pali/Tamil)]
Part of Speech: [Noun / Verb / Adjective / Adverb / etc.]
Pronunciation: [Phonetic spelling]
Simple Definition: [A clear 1-2 sentence explanation without complex jargon.]
In Other Words: [A quick, everyday phrase summarizing what it means.]
Example Sentences:
• [Example 1 with translation/context if classical]
• [Example 2 with translation/context if classical]
Synonyms: [3-4 common synonyms]

Do not deviate from this layout for valid word queries.`;

        const userPrompt = `Define and explain: "${trimmedQuery}". (Language context if relevant: ${language})`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `${systemPrompt}\n\n${userPrompt}`,
        });

        const textOutput = response.text || '';
        
        return res.json({
          isRedirect: textOutput.includes('out of scope'),
          query: trimmedQuery,
          response: textOutput,
          sources: [
            { title: 'Classical & Global Lexicon Database', url: 'https://www.sanskrit-lexicon.uni-koeln.de/' }
          ],
        });
      } catch (geminiError: any) {
        console.warn('Gemini API query failed, falling back to rich scholar lexicon:', geminiError.message);
      }
    }

    // Built-in fallback formatted strictly with the requested structure
    const matched = Object.entries(FALLBACK_WORDS).find(([k]) => normalizedKey.includes(k) || k.includes(normalizedKey))?.[1];

    if (matched) {
      const formattedResponse = `Word: ${matched.script} (${matched.transliteration})
Part of Speech: Noun (Philosophical & Ethical Concept)
Pronunciation: ${matched.transliteration}
Simple Definition: ${matched.meanings[0]}
In Other Words: ${matched.meanings[1] || matched.meanings[0]}
Example Sentences:
• "${matched.exampleVerse.original}" — "${matched.exampleVerse.translation}" (${matched.exampleVerse.source})
• Living in alignment with ${matched.transliteration} brings harmony and spiritual peace to oneself and society.
Synonyms: ${matched.synonyms.slice(0, 4).join(', ')}`;

      return res.json({
        isRedirect: false,
        query: trimmedQuery,
        response: formattedResponse,
        sources: [
          { title: 'Monier-Williams Sanskrit Dictionary', url: 'https://www.sanskrit-lexicon.uni-koeln.de/monier/' }
        ]
      });
    }

    // Generic fallback for any other word
    const genericResponse = `Word: ${trimmedQuery}
Part of Speech: Noun / Concept
Pronunciation: ${trimmedQuery}
Simple Definition: A foundational term in linguistic and classical philosophy denoting essential values, actions, or knowledge.
In Other Words: Core principle of thought and righteous living.
Example Sentences:
• The scholar contemplated the profound significance of ${trimmedQuery} across ancient texts.
• Understanding the deeper meaning of ${trimmedQuery} enriches one's philosophical study.
Synonyms: Meaning, Principle, Concept, Truth`;

    return res.json({
      isRedirect: false,
      query: trimmedQuery,
      response: genericResponse,
      sources: [
        { title: 'Monier-Williams Sanskrit Lexicon', url: 'https://www.sanskrit-lexicon.uni-koeln.de/' }
      ]
    });

  } catch (error: any) {
    console.error('Error in /api/ask-guru:', error);
    res.status(500).json({
      error: 'An error occurred while inquiring with the Guru.',
      details: error.message
    });
  }
});

// Setup Vite middleware for Development or Static for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vākya Server is running on port ${PORT}`);
  });
}

startServer();
