// supabase/functions/generate-battle-questions/index.ts
//
// Called by the client right after a match becomes 'active' (either the
// player whose find_match() call paired them, or the player who just
// joined via join_match_by_code()). Idempotent: if questions already
// exist for the match, it's a no-op — safe even if both clients race.
//
// deploy:  supabase functions deploy generate-battle-questions
// secrets: supabase secrets set GEMINI_API_KEY=...  (reuse the same key
//          your voice-agent.ts / picture-quiz.ts already use)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedQuestion {
  round: number;
  question_tag: string;
  instruction: string;
  question_text: string;
  answers: [string, string, string, string];
  correct_index: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { match_id } = await req.json();
    if (!match_id) {
      return json({ error: 'match_id is required' }, 400);
    }

    // Client scoped to the caller's own JWT — used only to verify they're
    // actually a participant in this match (RLS enforces it for us).
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: match, error: matchErr } = await callerClient
      .from('battle_matches')
      .select('id, category, total_rounds, status')
      .eq('id', match_id)
      .single();

    if (matchErr || !match) {
      return json({ error: 'Match not found or you are not a participant' }, 403);
    }

    // Elevated client for the actual writes — RLS has no insert policy
    // for battle_match_questions, so this is the only way to populate it.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { count } = await adminClient
      .from('battle_match_questions')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match_id);

    if (count && count > 0) {
      return json({ status: 'already_generated' });
    }

    const questions = await generateQuestionsWithGemini(match.category, match.total_rounds);

    const rows = questions.map((q) => ({ match_id, ...q }));
    const { error: insertErr } = await adminClient.from('battle_match_questions').insert(rows);

    // A unique(match_id, round) violation here just means the other
    // player's call won the race — that's fine, not an error for us.
    if (insertErr && insertErr.code !== '23505') {
      throw insertErr;
    }

    return json({ status: 'generated', count: rows.length });
  } catch (err) {
    console.error('[generate-battle-questions] error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Hardcoded backup questions, used whenever Gemini is unavailable (missing
// key, or a quota exhaustion like the 429s hit earlier) — this way a
// GEMINI_API_KEY problem degrades a match's question quality instead of
// breaking it outright.
const FALLBACK_QUESTIONS: GeneratedQuestion[] = [
  {
    round: 1,
    question_tag: 'Sandhi & Basics',
    instruction: 'Identify the combined form',
    question_text: 'What is the Sandhi of: "देव + आलयः" (deva + ālayaḥ)?',
    answers: ['देवालयः', 'देवलयः', 'देवकालयः', 'देव्यालयः'],
    correct_index: 0,
  },
  {
    round: 2,
    question_tag: 'Grammar',
    instruction: 'Identify the grammatical case',
    question_text: 'In "रामेण हतः", what vibhakti (case) is "रामेण"?',
    answers: ['Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī'],
    correct_index: 1,
  },
  {
    round: 3,
    question_tag: 'Vocabulary',
    instruction: 'Select the correct translation',
    question_text: 'What is the classical term for "Elephant"?',
    answers: ['अश्वः', 'सिंहः', 'गजः', 'मर्कटः'],
    correct_index: 2,
  },
  {
    round: 4,
    question_tag: 'Classical Literature',
    instruction: 'Complete the saying',
    question_text: '"विद्वान् सर्वत्र ..." complete the aphorism:',
    answers: ['पूज्यते', 'गच्छति', 'तिष्ठति', 'जयति'],
    correct_index: 0,
  },
  {
    round: 5,
    question_tag: 'Dhātu Root',
    instruction: 'Identify the verb root',
    question_text: 'What is the root (Dhātu) of "गच्छति" (gacchati)?',
    answers: ['√चल्', '√गम्', '√स्था', '√दृश्'],
    correct_index: 1,
  },
];

function getFallbackQuestions(category: string, totalRounds: number): GeneratedQuestion[] {
  const tagged = FALLBACK_QUESTIONS.map((q) => ({ ...q, question_tag: `${category} • ${q.question_tag}` }));
  // Repeat the bank if a match needs more rounds than we have fallbacks for.
  const result: GeneratedQuestion[] = [];
  for (let i = 0; i < totalRounds; i++) {
    result.push({ ...tagged[i % tagged.length], round: i + 1 });
  }
  return result;
}

async function generateQuestionsWithGemini(
  category: string,
  totalRounds: number
): Promise<GeneratedQuestion[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    console.warn('[generate-battle-questions] GEMINI_API_KEY not configured, using fallback questions');
    return getFallbackQuestions(category, totalRounds);
  }

  // Try both, in case one is quota-exhausted while the other still has
  // headroom — free-tier quotas are tracked per-model, so this actually
  // helps rather than just being a formality.
  const modelsToTry = ['gemini-3.6-flash', 'gemini-3.7-flash'];

  const prompt = `You are generating a ${totalRounds}-round multiple-choice quiz battle for a
Sanskrit/Pali/classical-language learning app. Topic/tradition: "${category}".

Return ONLY a JSON array (no markdown fences, no commentary) with exactly ${totalRounds}
objects, one per round, in this shape:
{
  "round": <1-based integer>,
  "question_tag": "<short grammar/topic label, e.g. 'Sandhi Rules • Intermediate'>",
  "instruction": "<short imperative, e.g. 'Translate to Sanskrit'>",
  "question_text": "<the actual prompt/sentence/word>",
  "answers": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correct_index": <0-3, index into answers>
}

Vary difficulty slightly across rounds and keep each question answerable in under 10 seconds.`;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!res.ok) {
        console.warn(`[generate-battle-questions] ${model} returned ${res.status}, trying next model`);
        continue;
      }

      const data = await res.json();
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned) as GeneratedQuestion[];

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[generate-battle-questions] Error with ${model}:`, err);
    }
  }

  console.warn('[generate-battle-questions] All Gemini models failed, using fallback questions');
  return getFallbackQuestions(category, totalRounds);
}