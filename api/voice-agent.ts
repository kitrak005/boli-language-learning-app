import { GoogleGenAI } from '@google/genai';

// Lazy-initialized Gemini AI Client - reused across warm invocations of this
// serverless function (same singleton pattern as api/ask-guru.ts).
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            aiClient = new GoogleGenAI({ apiKey });
        } else {
            console.error('[VAKYA] GEMINI_API_KEY is not set - Voice Agent will use offline fallback responses only.');
        }
    }
    return aiClient;
}

const MAX_SESSION_TOKENS = 2500;

function estimateTokens(text: string): number {
    return Math.ceil((text.length + 150) / 3.5);
}

function buildLanguageInstruction(language: string): string {
    switch (language) {
        case 'sanskrit':
            return 'Respond primarily as a Sanskrit-tradition spiritual guide.';
        case 'tamil':
            return 'Respond primarily as a Classical Tamil-tradition spiritual guide.';
        case 'pali':
            return 'Respond primarily as a Pali/Buddhist-tradition spiritual guide.';
        case 'all':
        default:
            return 'Respond as a universal classical-wisdom guide, drawing from whichever tradition (Sanskrit, Pali, or Classical Tamil) best fits the question.';
    }
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
    }

    try {
        const {
            message,
            language = 'all',
            sessionTokensUsed = 0,
            conversationHistory = [],
        } = req.body || {};

        if (!message || typeof message !== 'string' || !message.trim()) {
            res.status(400).json({ error: 'Please provide a message to send to the Guru.' });
            return;
        }

        if (sessionTokensUsed >= MAX_SESSION_TOKENS) {
            res.status(200).json({
                quotaExceeded: true,
                tokensUsed: 0,
            });
            return;
        }

        const trimmedMessage = message.trim();
        const ai = getAIClient();

        if (ai) {
            try {
                const languageInstruction = buildLanguageInstruction(language);

                const historyText = Array.isArray(conversationHistory) && conversationHistory.length > 0
                    ? conversationHistory
                        .map((h: any) => `${h.sender === 'user' ? 'Seeker' : 'Guru'}: ${h.text}`)
                        .join('\n')
                    : '';

                const systemPrompt = `You are the AI Guru in Vakya, a warm and wise spiritual guide. ${languageInstruction}

Language Rule (very important):
- Always reply in the SAME language the seeker used to ask their question. If they wrote in Hindi (Devanagari or Hinglish/romanized Hindi), reply naturally in Hindi. If they wrote in English, reply in English. If they wrote in Tamil, reply in Tamil.
- Match their register: if they wrote casually (like "aap kaise hai"), reply warmly and conversationally in that same style, not with a formal or textbook tone.

Persona Rules:
- Speak like a real, approachable spiritual guru having a genuine conversation, not like an encyclopedia entry. Use natural warmth, gentle humor when it fits, and occasional traditional touches (like "Om Shanti", a soft blessing, or addressing them affectionately) where it feels authentic and not forced.
- Keep your spoken response short and conversational (2-4 sentences) - this will be read aloud via text-to-speech, so avoid bullet points, headers, citations-heavy language, or markdown formatting.
- Never invent scriptural citations you are not confident about.
- If the seeker's message is unrelated to spiritual guidance, wisdom, or classical teachings, gently and warmly redirect them back to the purpose of this space in 1-2 sentences, still in their language.
- Give a short "topic" label (2-4 words, in English) summarizing what this exchange was about.

Respond ONLY with a valid JSON object in this exact shape, and nothing else (no markdown fences, no preamble):
{
  "spokenResponse": "the response to be spoken aloud, in the SAME language the seeker used",
  "spokenResponseTranslation": "an English translation, only if spokenResponse is not already in English, otherwise omit this field",
  "topic": "short topic label in English"
}`;

                const userPrompt = historyText
                    ? `Recent conversation:\n${historyText}\n\nSeeker's new message: "${trimmedMessage}"`
                    : `Seeker's message: "${trimmedMessage}"`;

                const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash'];
                let textOutput = '';
                let lastError: any = null;

                for (const modelName of modelsToTry) {
                    try {
                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: `${systemPrompt}\n\n${userPrompt}`,
                        });
                        textOutput = response.text || '';
                        lastError = null;
                        break;
                    } catch (attemptError: any) {
                        lastError = attemptError;
                        console.error(`[VAKYA] Gemini model "${modelName}" failed:`, attemptError.message);
                    }
                }

                if (lastError) {
                    throw lastError;
                }

                const cleaned = textOutput.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleaned);

                const spokenResponse = parsed.spokenResponse || 'Stillness reveals inner truth.';
                const tokensUsed = estimateTokens(trimmedMessage + spokenResponse);
                const newTotal = sessionTokensUsed + tokensUsed;

                res.status(200).json({
                    spokenResponse,
                    spokenResponseTranslation: parsed.spokenResponseTranslation,
                    topic: parsed.topic || 'Voice Session',
                    tokensUsed,
                    quotaExceeded: newTotal >= MAX_SESSION_TOKENS,
                });
                return;
            } catch (geminiError: any) {
                console.error('[VAKYA] All Gemini models failed for voice-agent, falling back:', geminiError.message);
            }
        }

        const fallbackText = 'I sense the sincerity in your voice. Let us abide in the peace of wisdom.';
        const tokensUsed = estimateTokens(trimmedMessage + fallbackText);

        res.status(200).json({
            spokenResponse: fallbackText,
            topic: 'Voice Session',
            tokensUsed,
            quotaExceeded: (sessionTokensUsed + tokensUsed) >= MAX_SESSION_TOKENS,
        });

    } catch (error: any) {
        console.error('[VAKYA] Error in /api/voice-agent:', error);
        res.status(500).json({
            error: 'An error occurred while consulting the Guru.',
            details: error.message,
        });
    }
}
