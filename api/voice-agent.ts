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
            return 'You are teaching Sanskrit. Respond primarily in natural, everyday Sanskrit (Devanagari script) - the kind a patient tutor would actually speak in conversation, not formal or archaic scripture-style Sanskrit.';
        case 'tamil':
            return 'You are teaching Classical/literary Tamil. Respond primarily in natural, conversational Tamil script - the kind a patient tutor would actually speak, not overly formal or archaic.';
        case 'pali':
            return 'You are teaching Pali. Respond primarily in Pali (Devanagari or romanized script), in a natural, conversational way.';
        case 'all':
        default:
            return 'Pick whichever classical language (Sanskrit, Pali, or Classical Tamil) best fits the question, and teach it conversationally.';
    }
}

function buildSystemPrompt(languageInstruction: string, expectAudio: boolean): string {
    return `You are a friendly, down-to-earth language teacher in Vakya, a voice-based practice space. ${languageInstruction}

${expectAudio ? `The student's message is provided as an AUDIO recording, not text. First, listen to the audio and transcribe exactly what the student said (in whatever language/script they actually spoke - do not translate it in the transcript field, just write down what you heard).` : ''}

Persona Rules (very important):
- Talk like a real friend who's genuinely excited to help someone learn - warm, casual, encouraging, a little playful. NOT a formal instructor, NOT a spiritual figure, NOT an encyclopedia. Think "study buddy who happens to know this language really well," not "wise sage" or "professor."
- Use everyday, natural phrasing. Contractions are fine. React naturally to what the student says - if they make a good attempt, say so; if they're a beginner, be extra encouraging and keep it simple.
- Keep responses short and conversational (2-4 sentences) since this is spoken aloud via text-to-speech. No bullet points, no headers, no formal lecture structure.
- Never invent grammar rules, translations, or facts you're not confident about - if unsure, just say so casually rather than making something up.
- If the student's message is totally unrelated to the language or learning (like asking about sports scores or the weather), gently and warmly steer the conversation back with something like "Ha, let's stick to practicing the language for now - what's a word or phrase you want to try?" in the classical language above.
- Give a short "topic" label (2-4 words, in English) summarizing what this exchange was about.

Language Rule:
- Your spokenResponse MUST be in the classical language described above, regardless of what language the student used to ask their question.
- ALWAYS include a "spokenResponseTranslation" field with a clear, casual English translation of your spokenResponse.

Respond ONLY with a valid JSON object in this exact shape, and nothing else (no markdown fences, no preamble):
{${expectAudio ? `
  "transcript": "exactly what the student said, transcribed from the audio, in the language/script they actually used",` : ''}
  "spokenResponse": "the response in the classical language described above, in a warm/casual teaching tone",
  "spokenResponseTranslation": "a clear, casual English translation of spokenResponse",
  "topic": "short topic label in English"
}`;
}

// Vercel serverless function handler. Vercel automatically parses JSON bodies
// and provides res.status()/.json() helpers for functions in the /api folder.
//
// Accepts EITHER:
//   { message: string, language, sessionTokensUsed, conversationHistory }  (typed text input)
// OR:
//   { audioBase64: string, audioMimeType: string, language, sessionTokensUsed, conversationHistory }  (recorded voice input)
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
    }

    try {
        const {
            message,
            audioBase64,
            audioMimeType,
            language = 'all',
            sessionTokensUsed = 0,
            conversationHistory = [],
        } = req.body || {};

        const hasAudio = typeof audioBase64 === 'string' && audioBase64.length > 0;
        const hasText = typeof message === 'string' && message.trim().length > 0;

        if (!hasAudio && !hasText) {
            res.status(400).json({ error: 'Please provide a message or an audio recording.' });
            return;
        }

        // Server-side token barrier enforcement (mirrors the client-side check,
        // but this is the source of truth - never trust the client alone).
        if (sessionTokensUsed >= MAX_SESSION_TOKENS) {
            res.status(200).json({
                quotaExceeded: true,
                tokensUsed: 0,
            });
            return;
        }

        const ai = getAIClient();

        if (ai) {
            try {
                const languageInstruction = buildLanguageInstruction(language);
                const systemPrompt = buildSystemPrompt(languageInstruction, hasAudio);

                const historyText = Array.isArray(conversationHistory) && conversationHistory.length > 0
                    ? conversationHistory
                        .map((h: any) => `${h.sender === 'user' ? 'Student' : 'Teacher'}: ${h.text}`)
                        .join('\n')
                    : '';

                const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash'];
                let textOutput = '';
                let lastError: any = null;

                // Build the multimodal request contents. For audio input, we
                // send the system prompt as text plus the audio clip as an
                // inline data part; Gemini transcribes and responds in one call.
                const contentsPayload: any = hasAudio
                    ? {
                        parts: [
                            { text: `${systemPrompt}\n\n${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}The student's audio message is attached below.` },
                            {
                                inlineData: {
                                    mimeType: audioMimeType || 'audio/webm',
                                    data: audioBase64,
                                },
                            },
                        ],
                    }
                    : `${systemPrompt}\n\n${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Student's message: "${message.trim()}"`;

                for (const modelName of modelsToTry) {
                    try {
                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: contentsPayload,
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

                // Strip markdown code fences if the model added them despite instructions.
                const cleaned = textOutput.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleaned);

                const transcript = hasAudio ? (parsed.transcript || '') : message.trim();
                const spokenResponse = parsed.spokenResponse || "Let's keep practicing together!";
                const tokensUsed = estimateTokens((transcript || '') + spokenResponse);
                const newTotal = sessionTokensUsed + tokensUsed;

                res.status(200).json({
                    transcript,
                    spokenResponse,
                    spokenResponseTranslation: parsed.spokenResponseTranslation,
                    topic: parsed.topic || 'Practice Session',
                    tokensUsed,
                    quotaExceeded: newTotal >= MAX_SESSION_TOKENS,
                });
                return;
            } catch (geminiError: any) {
                console.error('[VAKYA] All Gemini models failed for voice-agent, falling back:', geminiError.message);
            }
        }

        // Offline / error fallback.
        const fallbackText = "Hey, I didn't quite catch that - mind trying again? What would you like to practice?";
        const tokensUsed = estimateTokens(fallbackText);

        res.status(200).json({
            transcript: hasAudio ? '' : (message || '').trim(),
            spokenResponse: fallbackText,
            topic: 'Practice Session',
            tokensUsed,
            quotaExceeded: (sessionTokensUsed + tokensUsed) >= MAX_SESSION_TOKENS,
        });

    } catch (error: any) {
        console.error('[VAKYA] Error in /api/voice-agent:', error);
        res.status(500).json({
            error: 'Something went wrong on my end.',
            details: error.message,
        });
    }
}