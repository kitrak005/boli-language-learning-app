import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            aiClient = new GoogleGenAI({ apiKey });
        } else {
            console.error('[VAKYA] GEMINI_API_KEY is not set — Picture Quiz cannot run without it.');
        }
    }
    return aiClient;
}

const PICTURE_QUIZ_SYSTEM_PROMPT = `You are an expert AI language-learning game designer creating an interactive vocabulary game for children aged 7–14.
The game is part of a language-learning platform focused on preserving Indian regional and classical languages such as Sanskrit, Pali, and Tamil.

GAME CONCEPT
Show the learner an AI-generated image of an everyday object, animal, food, place, or cultural item.
The learner must identify what the image represents and select the correct word in the language they are currently learning.
Example:
Image: A cat
Question:
"What is this called in Sanskrit?"
Options:
A. अश्वः
B. मार्जारः
C. गजः
D. वृक्षः
Correct answer: मार्जारः

YOUR TASK
Generate ONE complete game question.
First select an appropriate vocabulary item suitable for a 7–14-year-old learner.
Then generate:
1. The English name of the item.
2. The target language.
3. The correct word in the target language.
4. A simple Latin-script pronunciation.
5. Three incorrect but plausible options in the same language.
6. An engaging question for the learner.
7. A detailed prompt for an image-generation model to create the image.
8. A short explanation shown after the learner answers.
9. A simple cultural or memory tip when appropriate.

IMAGE GENERATION REQUIREMENTS
The image must:
* Clearly represent only the target object/concept.
* Be visually appealing to children aged 7–14.
* Use a colorful, friendly educational illustration style.
* Avoid text, letters, numbers, labels, watermarks, or written words inside the image.
* Have a simple, uncluttered background.
* Make the object immediately recognizable.
* Avoid unnecessary cultural stereotypes.
* If the item is culturally significant, represent it accurately and respectfully.

IMPORTANT:
The image prompt must describe the object without revealing its name to the learner.

DIFFICULTY
Choose a difficulty from:
EASY — extremely common everyday vocabulary.
MEDIUM — moderately familiar vocabulary.
HARD — culturally significant, less common, or more advanced vocabulary.
For children aged 7–14, prefer EASY or MEDIUM unless the learner has demonstrated strong proficiency.

DISTRACTOR OPTIONS
The three incorrect answers should:
* Belong to the same general vocabulary category.
* Be plausible enough to require thinking.
* Never have more than one correct answer.
* Avoid confusing synonyms unless the lesson specifically teaches them.
* Match the grammatical form of the correct answer whenever possible.

OUTPUT FORMAT
Return ONLY valid JSON in this exact structure:
{
"targetLanguage": "",
"difficulty": "",
"category": "",
"englishWord": "",
"nativeWord": "",
"pronunciation": "",
"question": "",
"options": [
{ "text": "", "isCorrect": false },
{ "text": "", "isCorrect": true },
{ "text": "", "isCorrect": false },
{ "text": "", "isCorrect": false }
],
"imagePrompt": "",
"explanation": "",
"memoryTip": "",
"culturalNote": ""
}
Make sure the JSON is syntactically valid and contains no additional text outside the JSON.`;

function extractJson(rawText: string): any {
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
    }

    try {
        const { language = 'sanskrit', difficulty } = req.body || {};
        const ai = getAIClient();

        if (!ai) {
            res.status(503).json({
                error: 'Picture Quiz requires a live connection to the Gemini API, which is not currently configured.',
            });
            return;
        }

        const languageLabel =
            language === 'tamil' ? 'Classical Tamil' : language === 'pali' ? 'Pali' : 'Sanskrit';

        const userPrompt = `Generate one Picture Vocabulary Quiz question for the target language: ${languageLabel}.${difficulty ? ` Preferred difficulty: ${difficulty}.` : ''
            }`;

        const textModelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash'];
        let quizData: any = null;
        let lastTextError: any = null;

        for (const modelName of textModelsToTry) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: `${PICTURE_QUIZ_SYSTEM_PROMPT}\n\n${userPrompt}`,
                });
                quizData = extractJson(response.text || '');
                lastTextError = null;
                break;
            } catch (attemptError: any) {
                lastTextError = attemptError;
                console.error(`[VAKYA] Picture Quiz text model "${modelName}" failed:`, attemptError.message);
            }
        }

        if (lastTextError || !quizData) {
            throw lastTextError || new Error('Failed to parse quiz question JSON.');
        }

        let imageUrl: string | null = null;
        try {
            const pixabayKey = process.env.PIXABAY_API_KEY;
            if (!pixabayKey) {
                console.error('[VAKYA] PIXABAY_API_KEY is not set — Picture Quiz will show no image.');
            } else {
                const searchTerm = encodeURIComponent(quizData.englishWord || quizData.category || '');
                const pixabayUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${searchTerm}&image_type=illustration&safesearch=true&per_page=3`;

                const pixabayRes = await fetch(pixabayUrl);
                const pixabayData: any = await pixabayRes.json();

                if (pixabayData.hits && pixabayData.hits.length > 0) {
                    imageUrl = pixabayData.hits[0].webformatURL;
                } else {
                    const photoUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${searchTerm}&image_type=photo&safesearch=true&per_page=3`;
                    const photoRes = await fetch(photoUrl);
                    const photoData: any = await photoRes.json();
                    if (photoData.hits && photoData.hits.length > 0) {
                        imageUrl = photoData.hits[0].webformatURL;
                    }
                }
            }
        } catch (imageError: any) {
            console.error('[VAKYA] Picture Quiz image lookup failed:', imageError.message);
        }

        res.status(200).json({
            ...quizData,
            imageUrl,
        });
    } catch (error: any) {
        console.error('[VAKYA] Error in /api/picture-quiz:', error);
        res.status(500).json({
            error: 'Could not generate a picture quiz question right now. Please try again.',
            details: error.message,
        });
    }
}