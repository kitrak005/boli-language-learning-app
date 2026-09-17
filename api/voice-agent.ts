import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            aiClient = new GoogleGenAI({ apiKey });
        } else {
            console.error('[VAKYA] GEMINI_API_KEY is not set — Voice Agent will use offline fallback responses only.');
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