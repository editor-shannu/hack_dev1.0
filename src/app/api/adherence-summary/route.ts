import '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * POST /api/adherence-summary
 * --------------------------
 * Accepts pre-computed adherence facts (numbers only, already calculated
 * by the pure adherence.ts logic) and asks Gemini to restate them as a
 * short plain-language prose summary.
 *
 * STRICT CONTRACT:
 *  - Input: already-computed numbers — never raw dose records, never images
 *  - Output: 3–5 sentence factual restatement only
 *  - Gemini is explicitly instructed NOT to add advice, interpretation,
 *    recommendations, or health speculation of any kind
 *  - If the API key is missing or Gemini fails, returns { success: false }
 *    so the UI can silently hide the summary block
 */

export interface AdherenceSummaryRequest {
  period: 'today' | 'week' | 'month';
  /** 0–100 */
  overallRate: number;
  taken: number;
  scheduled: number;
  /** skipped + unlogged past doses */
  missedCount: number;
  currentStreakDays: number;
  bestStreakDays: number;
  /** Top missed medications (name + count), max 5 */
  missedMedications: { name: string; count: number }[];
  /** Lowest-adherence meds (name + rate%), max 3 */
  worstAdherenceMeds: { name: string; rate: number }[];
}

const PERIOD_LABEL: Record<string, string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
};

function cleanName(n: string): string {
  return String(n).replace(/[^a-zA-Z0-9\s\-+().]/g, '').slice(0, 50);
}

function buildSummaryPrompt(data: AdherenceSummaryRequest): string {
  const period = PERIOD_LABEL[data.period] ?? data.period;

  const missedMedStr =
    data.missedMedications.length > 0
      ? data.missedMedications
          .map((m) => `${cleanName(m.name)} (${Number(m.count) || 0} missed dose${m.count !== 1 ? 's' : ''})`)
          .join(', ')
      : 'none';

  const worstMedStr =
    data.worstAdherenceMeds.length > 0
      ? data.worstAdherenceMeds
          .map((m) => `${cleanName(m.name)} at ${Number(m.rate) || 0}%`)
          .join(', ')
      : 'none';

  const hasData = data.scheduled > 0;

  return `You are a factual data reporter. Your only task is to restate the following medication adherence numbers as a short (3–5 sentence) plain-language summary.

ABSOLUTE RULES — violating any rule makes your response a bug:
1. Only restate the numbers provided below. Do not add, infer, or invent any fact not listed.
2. Never use the words "should", "consider", "recommend", "try", "suggest", "it is important", "you need to", "make sure", or any similar directive language.
3. Never interpret what the numbers mean for health, risk, or outcomes. Never speculate about causes of missed doses.
4. Never add a sentence beginning with "To improve", "In order to", "It may help", "This indicates", "This may", "This suggests", or similar.
5. If the data shows zero scheduled doses, state that plainly: say there are no recorded doses for this period, then stop.
6. Write in second person ("You took…", "Your streak…"). Be concise and factual.

ADHERENCE DATA TO RESTATE:
- Period: ${period}
- Overall adherence rate: ${data.overallRate}% (${data.taken} of ${data.scheduled} scheduled doses taken)
- Total missed doses: ${data.missedCount}
- Medications with missed doses: ${missedStr(data.missedMedications)}
- Lowest adherence medications: ${worstMedStr}
- Current consecutive-day streak: ${data.currentStreakDays} days
- Best streak ever recorded: ${data.bestStreakDays} days
${!hasData ? '- NOTE: No doses have been scheduled or recorded for this period.' : ''}

Write only the summary paragraph. No headers, no bullet points, no extra commentary.`;
}

function missedStr(meds: { name: string; count: number }[]): string {
  if (meds.length === 0) return 'none';
  return meds.map((m) => `${m.name} (${m.count})`).join(', ');
}

export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit(request, {
    keyPrefix: 'adherence-summary',
    maxRequests: 20,
    windowMs: 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return rateCheck.response!;
  }

  try {
    const body: AdherenceSummaryRequest = await request.json();

    // Basic validation — refuse to call Gemini with obviously bad data
    if (typeof body.overallRate !== 'number' || typeof body.scheduled !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid adherence data payload' },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 503 }
      );
    }

    const prompt = buildSummaryPrompt(body);

    // Prioritize ultra-fast high-availability models with instant execution
    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-pro-latest',
    ];

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.05, // Minimal creativity — strict factual restatement
                maxOutputTokens: 2048, // Generous limit ensuring complete narrative without mid-sentence cutoff
              },
            }),
          }
        );

        if (!response.ok) {
          console.warn(`[adherence-summary] Model ${model} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const rawText: string =
          data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        if (!rawText.trim()) {
          console.warn(`[adherence-summary] Model ${model} returned empty text`);
          continue;
        }

        // Lightweight advisory-language guardrail — log if triggered
        const advisoryPatterns = [
          /\byou should\b/i,
          /\bconsider\b/i,
          /\brecommend\b/i,
          /\bit('s| is) important\b/i,
          /\bto improve\b/i,
          /\bthis (may|might|could) indicate\b/i,
          /\bthis suggests\b/i,
          /\bmake sure\b/i,
          /\btry (to|setting)\b/i,
        ];

        const foundAdvisory = advisoryPatterns.find((p) => p.test(rawText));
        if (foundAdvisory) {
          // Log the violation so the engineer can review — but still return the
          // summary with a flag so the UI can surface it for developer inspection
          console.error(
            `[adherence-summary] ADVISORY LANGUAGE DETECTED in model output (pattern: ${foundAdvisory}). ` +
              `Raw: "${rawText.slice(0, 200)}"`
          );
          return NextResponse.json({
            success: false,
            error: 'advisory_language_detected',
            flaggedSummary: rawText.trim(),
            model,
          });
        }

        return NextResponse.json({
          success: true,
          summary: rawText.trim(),
          model,
        });
      } catch (modelErr: any) {
        console.warn(`[adherence-summary] Model ${model} error:`, modelErr.message);
        continue;
      }
    }

    // All models failed
    return NextResponse.json(
      { success: false, error: 'All Gemini models failed or timed out' },
      { status: 503 }
    );
  } catch (err: any) {
    console.error('[adherence-summary] Unexpected error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
