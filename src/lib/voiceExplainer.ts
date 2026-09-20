import { Prescription, ExplainerLanguage } from '@/types/prescription';
import { authFetch } from '@/lib/storage';

export interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onFallback?: () => void;
}

const BCP47_LANGUAGE_CODES: Record<ExplainerLanguage, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
};

// Global playback references to ensure strictly one voice streams at a time
let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let activePlaybackUrl: string | null = null;

/**
 * Stops any currently playing audio or speech synthesis stream.
 */
export function stopSpeech(): void {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement.src = '';
    currentAudioElement = null;
  }

  if (activePlaybackUrl) {
    URL.revokeObjectURL(activePlaybackUrl);
    activePlaybackUrl = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

/**
 * Checks if any audio or browser speech is currently playing.
 */
export function isSpeaking(): boolean {
  const isAudioPlaying = !!currentAudioElement && !currentAudioElement.paused && !currentAudioElement.ended;
  const isSynthSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return isAudioPlaying || isSynthSpeaking;
}

/**
 * Generates a plain-language explanation of the prescription in the selected language.
 * Checks server/MongoDB cache first; if not present, calls Gemini.
 */
export async function generateExplanation(
  prescription: Prescription,
  language: ExplainerLanguage
): Promise<string> {
  // If already cached locally on the object
  if (prescription.explanations && prescription.explanations[language]) {
    return prescription.explanations[language];
  }

  const response = await authFetch('/api/explain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prescriptionId: prescription.id,
      language,
      prescription,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate explanation (${response.status})`);
  }

  const data = await response.json();
  if (!data.success || !data.explanation) {
    throw new Error(data.error || 'No explanation returned by the server.');
  }

  // Update in-memory prescription cache
  if (!prescription.explanations) {
    prescription.explanations = {};
  }
  prescription.explanations[language] = data.explanation;

  return data.explanation;
}

// Primed audio element to bypass browser user-activation timeouts
let primedAudio: HTMLAudioElement | null = null;

/**
 * Prime audio playback synchronously on user interaction (click/touch).
 * This unlocks the browser media engine so delayed async audio.play() succeeds.
 */
export function primeAudioPlayback(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!primedAudio) {
      primedAudio = new Audio();
    }
    // Silent 1-sample WAV
    primedAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    primedAudio.play().catch(() => {});
  } catch {
    // Ignore autoplay priming errors
  }
}

/**
 * Calls the server-side Sarvam AI TTS proxy route to synthesize Indic speech audio.
 */
export async function synthesizeSpeech(
  text: string,
  language: ExplainerLanguage
): Promise<string> {
  const response = await fetch('/api/explain/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Sarvam TTS proxy failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.audio) {
    throw new Error(data.error || 'No audio returned by Sarvam TTS.');
  }

  return data.audio;
}

/**
 * Speaks the text using Sarvam AI's TTS endpoint with automatic, graceful fallback
 * to the browser's window.speechSynthesis if Sarvam fails (network, rate limit, quota).
 */
export async function speakWithFallback(
  text: string,
  language: ExplainerLanguage,
  callbacks?: SpeakCallbacks
): Promise<void> {
  stopSpeech();

  if (!text || text.trim().length === 0) {
    callbacks?.onEnd?.();
    return;
  }

  // Attempt 1: Sarvam AI Server-Side TTS
  try {
    const audioUrl = await synthesizeSpeech(text, language);

    // Convert data:audio/wav;base64 to a Blob Object URL for reliable, instant browser decoding
    let playableUrl = audioUrl;
    if (audioUrl.startsWith('data:')) {
      try {
        const res = await fetch(audioUrl);
        const blob = await res.blob();
        playableUrl = URL.createObjectURL(blob);
        activePlaybackUrl = playableUrl;
      } catch {
        // Fallback to manual byte conversion if fetch data-uri fails
        try {
          const base64Part = audioUrl.split('base64,')[1];
          if (base64Part) {
            const byteCharacters = atob(base64Part);
            const byteNumbers = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([byteNumbers], { type: 'audio/wav' });
            playableUrl = URL.createObjectURL(blob);
            activePlaybackUrl = playableUrl;
          }
        } catch {
          playableUrl = audioUrl;
        }
      }
    }

    const audio = primedAudio || new Audio();
    primedAudio = null; // Consume primed instance
    currentAudioElement = audio;
    (window as any).__prescriptimeAudio = audio;

    audio.src = playableUrl;
    audio.volume = 1.0;

    audio.onplay = () => {
      callbacks?.onStart?.();
    };

    audio.onended = () => {
      stopSpeech();
      callbacks?.onEnd?.();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback element error, falling back to Web Speech:', e);
      stopSpeech();
      callbacks?.onFallback?.();
      fallbackToSpeechSynthesis(text, language, callbacks);
    };

    await audio.play();
    return;
  } catch (sarvamErr: any) {
    console.warn('Sarvam TTS failed, triggering browser Web Speech fallback:', sarvamErr);
    callbacks?.onFallback?.();
    fallbackToSpeechSynthesis(text, language, callbacks);
  }
}

/**
 * Fallback mechanism using browser native SpeechSynthesis.
 */
function fallbackToSpeechSynthesis(
  text: string,
  language: ExplainerLanguage,
  callbacks?: SpeakCallbacks
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.(new Error('Speech synthesis is not supported on this browser device.'));
    callbacks?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const targetBcp47 = BCP47_LANGUAGE_CODES[language] || 'en-IN';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetBcp47;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Retain globally to prevent GC in Chromium
    (window as any).__prescriptimeUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase() === targetBcp47.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(language)) ||
      voices.find((v) => v.lang.includes('IN')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      (window as any).__prescriptimeUtterance = null;
      currentUtterance = null;
      callbacks?.onEnd?.();
    };

    utterance.onerror = (err) => {
      (window as any).__prescriptimeUtterance = null;
      currentUtterance = null;
      console.warn('Speech synthesis utterance error:', err);
      callbacks?.onEnd?.();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);

    // Unpause immediately if needed in Chrome
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (err) {
    console.warn('Speech synthesis call failed:', err);
    callbacks?.onEnd?.();
  }
}
