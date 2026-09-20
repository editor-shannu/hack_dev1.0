import { ensureSecretsLoaded } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';
import { ExplainerLanguage } from '@/types/prescription';
import { checkRateLimit } from '@/lib/rateLimit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SARVAM_LANGUAGE_CODES: Record<ExplainerLanguage, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
};

const SARVAM_DEFAULT_SPEAKERS: Record<ExplainerLanguage, string> = {
  en: 'priya',
  te: 'kavitha',
  hi: 'priya',
  ta: 'priya',
};

interface SpeakRequestBody {
  text: string;
  language: ExplainerLanguage;
}

function chunkTextForSarvam(text: string, maxChars = 450): string[] {
  const chunks: string[] = [];
  if (!text || text.trim().length === 0) return chunks;

  // Split along sentence, punctuation, and newline boundaries
  const sentences = text
    .split(/(?<=[.?!।॥\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxChars) {
      currentChunk = (currentChunk + ' ' + sentence).trim();
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      if (sentence.length <= maxChars) {
        currentChunk = sentence;
      } else {
        // Break long sentences by words
        const words = sentence.split(/\s+/);
        for (const word of words) {
          if ((currentChunk + ' ' + word).trim().length <= maxChars) {
            currentChunk = (currentChunk + ' ' + word).trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = word;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Rate limiting for TTS calls (30 per minute)
  const rateCheck = checkRateLimit(req, {
    keyPrefix: 'speak',
    maxRequests: 30,
    windowMs: 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return rateCheck.response!;
  }

  try {
    const body = (await req.json()) as SpeakRequestBody;
    const { text, language } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid text parameter' },
        { status: 400 }
      );
    }

    if (!language || !['en', 'te', 'hi', 'ta'].includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Invalid language code. Supported: en, te, hi, ta' },
        { status: 400 }
      );
    }

    ensureSecretsLoaded();
    const sarvamApiKey = process.env.SARVAM_API_KEY;
    if (!sarvamApiKey || sarvamApiKey.trim() === '' || sarvamApiKey.includes('your_sarvam_api_key')) {
      logger.info('SARVAM_API_KEY is not configured. Directing client to browser TTS fallback.', {
        module: 'sarvamTTS',
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Sarvam AI API key is not configured.',
          fallbackToLocal: true,
        },
        { status: 503 }
      );
    }

    const targetLangCode = SARVAM_LANGUAGE_CODES[language] || 'en-IN';
    const speaker = SARVAM_DEFAULT_SPEAKERS[language] || 'priya';
    const cleanText = text.slice(0, 2400).trim();
    const chunks = chunkTextForSarvam(cleanText, 450);

    // Model: bulbul:v3 is the active multi-lingual model supporting standard speakers (priya, kavitha, etc.)
    const modelsToTry = ['bulbul:v3'];
    let lastError = 'Unknown error';

    for (const model of modelsToTry) {
      try {
        const payload: Record<string, any> = {
          inputs: chunks,
          target_language_code: targetLangCode,
          speaker,
          model,
          enable_preprocessing: true,
        };

        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': sarvamApiKey.trim(),
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          const base64Audio = data.audios?.[0];

          if (base64Audio && typeof base64Audio === 'string') {
            const buffer = Buffer.from(base64Audio, 'base64');

            logger.info('Sarvam TTS generated audio successfully', {
              module: 'sarvamTTS',
              durationMs: Date.now() - start,
              meta: { model, language: targetLangCode, audioBytes: buffer.length },
            });

            return NextResponse.json({
              success: true,
              audio: `data:audio/wav;base64,${base64Audio}`,
              model,
              language: targetLangCode,
            });
          }
        } else {
          const errText = await response.text();
          lastError = `Status ${response.status}: ${errText}`;
          console.error(`[Sarvam TTS Upstream Error] HTTP ${response.status}:`, errText);
          logger.warn(`Sarvam TTS call with model ${model} failed`, {
            module: 'sarvamTTS',
            error: errText,
            meta: { status: response.status, model },
          });
        }
      } catch (callErr: any) {
        lastError = callErr?.message || String(callErr);
        console.error(`[Sarvam TTS Network Error]:`, lastError);
        logger.warn(`Sarvam TTS network/timeout error with model ${model}`, {
          module: 'sarvamTTS',
          error: lastError,
        });
      }
    }

    // If all Sarvam model attempts fail, signal client to fallback to browser SpeechSynthesis
    return NextResponse.json(
      {
        success: false,
        error: `Sarvam AI TTS service unavailable: ${lastError}`,
        fallbackToLocal: true,
      },
      { status: 503 }
    );
  } catch (error: any) {
    logger.error('Unexpected error in TTS synthesis proxy', {
      module: 'sarvamTTS',
      error: error?.message || error,
      durationMs: Date.now() - start,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to synthesize speech.',
        fallbackToLocal: true,
      },
      { status: 500 }
    );
  }
}
