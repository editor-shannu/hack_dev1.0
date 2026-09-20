import { ensureSecretsLoaded } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PrescriptionModel } from '@/models/Prescription';
import { Prescription, ExplainerLanguage } from '@/types/prescription';
import { resolveAuthenticatedUser, enforceTenantAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { geminiCircuitBreaker } from '@/lib/circuitBreaker';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const LANGUAGE_NAMES: Record<ExplainerLanguage, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
  ta: 'Tamil',
};

interface ExplainRequestBody {
  prescriptionId?: string;
  language: ExplainerLanguage;
  prescription?: Prescription;
}

function formatPrescriptionSummary(rx: Prescription): string {
  const lines: string[] = [];
  if (rx.title) lines.push(`Prescription Title: ${rx.title}`);
  if (rx.doctorName) lines.push(`Doctor: ${rx.doctorName}`);
  if (rx.clinicOrHospital) lines.push(`Clinic/Hospital: ${rx.clinicOrHospital}`);
  if (rx.diagnosis) lines.push(`Diagnosis / Condition: ${rx.diagnosis}`);
  if (rx.notes) lines.push(`Doctor Notes: ${rx.notes}`);

  lines.push('\nPrescribed Medicines:');
  if (rx.medications && rx.medications.length > 0) {
    rx.medications.forEach((med, idx) => {
      const parts = [
        `${idx + 1}. ${med.name}`,
        med.dosage ? `Dosage: ${med.dosage}` : '',
        med.frequency ? `Frequency: ${med.frequency}` : '',
        med.timing ? `Timing: ${med.timing.replace('_', ' ')}` : '',
        med.duration ? `Duration: ${med.duration}` : '',
        med.instructions ? `Special Instructions: ${med.instructions}` : '',
      ].filter(Boolean);
      lines.push(parts.join(' | '));
    });
  } else {
    lines.push('No specific medicines listed.');
  }

  return lines.join('\n');
}

async function callGeminiForExplanation(prescriptionSummary: string, language: ExplainerLanguage): Promise<string> {
  ensureSecretsLoaded();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey.includes('your_gemini_api_key')) {
    throw new Error('Gemini API key is not configured');
  }

  if (geminiCircuitBreaker.isOpen()) {
    throw new Error('Gemini service circuit breaker is open. Please try again later.');
  }

  const targetLangName = LANGUAGE_NAMES[language] || 'English';

  const prompt = `You are a warm, empathetic clinical pharmacist explaining a doctor's prescription directly to a patient.
Explain this prescription in simple, everyday ${targetLangName} that a patient with zero medical background would easily understand.

Guidelines:
- Explain what each prescribed medicine is generally used for in one simple sentence.
- Specify clearly how many times a day to take it, whether before or after food, and for how many days.
- If there are special warnings or instructions, mention them clearly in plain language.
- Keep sentences short, comforting, and crystal clear.
- Output ONLY the spoken explanation text in ${targetLangName}. Do NOT include headers, bullet points, asterisks, markdown, introductory pleasantries (like "Sure, here is..."), or greetings. Write as natural spoken prose ready for text-to-speech audio.

Prescription Details:
${prescriptionSummary}`;

  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
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
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          // Clean any markdown formatting so TTS sounds natural
          return text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#+\s*/g, '')
            .replace(/`+/g, '')
            .trim();
        }
      }
    } catch (err: any) {
      logger.warn(`Gemini explanation model ${model} failed`, {
        module: 'voiceExplainer',
        error: err?.message,
      });
    }
  }

  throw new Error('All Gemini explanation models failed to respond');
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Rate limiting: 25 requests per minute
  const rateCheck = checkRateLimit(req, {
    keyPrefix: 'explain',
    maxRequests: 25,
    windowMs: 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return rateCheck.response!;
  }

  try {
    const body = (await req.json()) as ExplainRequestBody;
    const { prescriptionId, language, prescription: clientPrescription } = body;

    if (!language || !['en', 'te', 'hi', 'ta'].includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unsupported language. Use en, te, hi, or ta.' },
        { status: 400 }
      );
    }

    // 1. Authenticate user & check tenant isolation
    const auth = await resolveAuthenticatedUser(req, clientPrescription?.userId);
    const targetUserId = auth.userId || 'demo-clinician-001';

    let targetPrescription: Prescription | null = clientPrescription || null;

    // 2. Connect to database if prescriptionId is provided
    if (prescriptionId) {
      try {
        await connectToDatabase();
        const dbDoc = await PrescriptionModel.findOne({ id: prescriptionId }).lean();
        if (dbDoc) {
          const accessCheck = enforceTenantAccess(auth, dbDoc.userId);
          if (!accessCheck.allowed) {
            return accessCheck.response!;
          }

          targetPrescription = dbDoc as any as Prescription;

          // Check if explanation is already cached in MongoDB
          if (targetPrescription.explanations && targetPrescription.explanations[language]) {
            const cachedExplanation = targetPrescription.explanations[language];
            logger.info('Returning cached prescription explanation', {
              module: 'voiceExplainer',
              durationMs: Date.now() - start,
              meta: { prescriptionId, language },
            });

            return NextResponse.json({
              success: true,
              explanation: cachedExplanation,
              cached: true,
              language,
            });
          }
        }
      } catch (dbErr: any) {
        logger.warn('Failed to query MongoDB for cached explanation, proceeding with generation', {
          module: 'voiceExplainer',
          error: dbErr?.message,
        });
      }
    }

    if (!targetPrescription) {
      return NextResponse.json(
        { success: false, error: 'Prescription details not found' },
        { status: 404 }
      );
    }

    // 3. Generate plain-language explanation via Gemini
    const summary = formatPrescriptionSummary(targetPrescription);
    const explanation = await callGeminiForExplanation(summary, language);

    // 4. Cache explanation in MongoDB if prescriptionId exists
    if (prescriptionId) {
      try {
        await connectToDatabase();
        await PrescriptionModel.updateOne(
          { id: prescriptionId },
          {
            $set: {
              [`explanations.${language}`]: explanation,
            },
          }
        );
      } catch (cacheErr: any) {
        logger.warn('Failed to update explanation cache in MongoDB', {
          module: 'voiceExplainer',
          error: cacheErr?.message,
        });
      }
    }

    logger.info('Generated new prescription explanation', {
      module: 'voiceExplainer',
      durationMs: Date.now() - start,
      meta: { prescriptionId: prescriptionId || 'client-side', language },
    });

    return NextResponse.json({
      success: true,
      explanation,
      cached: false,
      language,
    });
  } catch (error: any) {
    logger.error('Failed to generate prescription explanation', {
      module: 'voiceExplainer',
      durationMs: Date.now() - start,
      error: error?.message || error,
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate explanation. Please try again.',
      },
      { status: 500 }
    );
  }
}
