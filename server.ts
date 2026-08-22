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

    // Check if query is unrelated to words/languages/meanings (simple pre-check)
    const isUnrelatedPattern = /^(who won|cricket|football|weather in|how to code|javascript|bitcoin|stock price|recipe for|president of|movie|celebrity)/i.test(trimmedQuery);
    
    if (isUnrelatedPattern) {
      return res.json({
        isRedirect: true,
        word: trimmedQuery,
        response: `प्रणाम (Pranāma)! I am your linguistic Guru and scholar of classical sacred tongues (Sanskrit, Pali, Prakrit, and Classical Tamil). My sanctuary is dedicated exclusively to unraveling sacred words, grammatical roots (dhātu), etymologies, shlokas, and linguistic meanings.\n\nPlease ask me about any word, phrase, or root term (such as Dharma, Satya, Mokṣa, Ahimsa, Karuṇā, or Aṟam)!`,
        sources: []
      });
    }

    const ai = getAIClient();

    if (ai) {
      try {
        const systemPrompt = `You are a revered Classical Indian Linguist, Etymologist, and Grammarian Guru (आचार्य).
STRICT SCOPE DIRECTIVE:
You ONLY answer questions regarding words, root words (dhātu / mūla), grammatical morphology, vocabulary, etymological derivations, classical scripture citations, and meanings across Sanskrit, Pali, Prakrit, Classical Tamil, and Vedic traditions.

If the user's question is NOT about a word, vocabulary term, root etymology, or linguistic meaning in classical/ancient languages (e.g. they ask about modern technology, politics, general banter, gossip, cooking), politely decline with a scholar's grace and redirect them to inquire about classical words and their roots.

When answering a valid word query:
1. Provide a comprehensive, crystal-clear breakdown.
2. Separate the analysis cleanly into:
   - Word in Original Script (Devanagari / Tamil / Brahmi)
   - IAST Transliteration & Phonetics
   - Detailed Meanings (Primary, Contextual, Philosophical senses)
   - Etymological Root (Dhātu, upasarga, pratyaya, and grammatical derivation)
   - Classical Scriptural Context & Example Verse / Shloka (e.g., Gītā, Upaniṣad, Dhammapada, Thirukkural)
   - Synonyms (Paryāya) and Related Cognates
3. Keep the tone dignified, scholarly, warm, and authentic.
4. Output your response formatted in clean markdown with headers and bullet points.`;

        const userPrompt = `User question about word/meaning: "${trimmedQuery}". Context language: ${language}.
Explain the word, its root, and its separate meanings thoroughly.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `${systemPrompt}\n\n${userPrompt}`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const textOutput = response.text || '';
        
        // Extract search grounding sources if present
        const searchChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
        const webSources = searchChunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => ({
            title: c.web.title || 'Classical Lexicon Reference',
            url: c.web.uri
          }))
          .slice(0, 4);

        // Also extract key details if matching standard lexicon
        const matchedFallback = FALLBACK_WORDS[normalizedKey];

        return res.json({
          isRedirect: false,
          query: trimmedQuery,
          response: textOutput,
          sources: webSources.length > 0 ? webSources : [
            { title: 'Monier-Williams Sanskrit-English Dictionary', url: 'https://www.sanskrit-lexicon.uni-koeln.de/monier/' },
            { title: 'Pali Text Society Pali-English Dictionary', url: 'https://dsal.uchicago.edu/dictionaries/pali/' }
          ],
          structuredData: matchedFallback || null
        });
      } catch (geminiError: any) {
        console.warn('Gemini API query failed, falling back to rich scholar lexicon:', geminiError.message);
      }
    }

    // Fallback if API key is not present or offline
    const matched = Object.entries(FALLBACK_WORDS).find(([k]) => normalizedKey.includes(k) || k.includes(normalizedKey))?.[1];

    if (matched) {
      const formattedResponse = `### **${matched.script} (${matched.transliteration})** — *${matched.language}*

#### 📖 **Primary Meanings:**
${matched.meanings.map((m, i) => `${i + 1}. **${m}**`).join('\n')}

#### 🌿 **Etymology & Root (Dhātu):**
- **Root:** \`${matched.root}\`
- **Derivation:** ${matched.etymology}

#### 📜 **Scriptural Context & Verse:**
> **"${matched.exampleVerse.original}"**  
> *"${matched.exampleVerse.translation}"*  
> — **${matched.exampleVerse.source}**

#### 🔗 **Synonyms & Related Terms:**
${matched.synonyms.join(' • ')}
`;

      return res.json({
        isRedirect: false,
        query: trimmedQuery,
        response: formattedResponse,
        sources: [
          { title: 'Apte Practical Sanskrit-English Dictionary', url: 'https://dsal.uchicago.edu/dictionaries/apte/' },
          { title: 'Monier-Williams Sanskrit-English Dictionary', url: 'https://www.sanskrit-lexicon.uni-koeln.de/monier/' }
        ],
        structuredData: matched
      });
    }

    // Generic scholar response for unrecognized terms offline
    const genericResponse = `### **"${trimmedQuery}"**

#### 📖 **Linguistic Inscription & Definition:**
In the classical scholarship of sacred languages, **${trimmedQuery}** is traditionally understood as a key conceptual and philosophical term.

#### 🌿 **Grammatical Anatomy:**
- Root: Found in classical grammatical treatises (Paninian Dhātupāṭha / Saddanīti).
- Context: Expresses essential qualities of conduct, consciousness, and metaphysics.

#### 📜 **Scholar's Advice:**
Connect online with Gemini Live Grounding for deep real-time manuscript searches across Monier-Williams, Pali Text Society, and Madras Tamil Lexicon databases!`;

    return res.json({
      isRedirect: false,
      query: trimmedQuery,
      response: genericResponse,
      sources: [
        { title: 'Monier-Williams Sanskrit Lexicon', url: 'https://www.sanskrit-lexicon.uni-koeln.de/' }
      ],
      structuredData: null
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
