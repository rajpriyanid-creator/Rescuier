import axios from 'axios';
import { env } from '../config/env';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

export const LANGUAGE_CODES: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
};

export interface TTSResult {
  base64Audio: string;
  mimeType: string;
}

/**
 * Generate TTS audio via Sarvam Bulbul v1
 * Returns base64-encoded WAV audio
 */
export const generateTTS = async (
  text: string,
  language: string = 'en',
  pace: number = 0.9
): Promise<TTSResult | null> => {
  if (!env.SARVAM_API_KEY) return null;

  const langCode = LANGUAGE_CODES[language] || 'en-IN';

  try {
    const response = await axios.post(
      SARVAM_TTS_URL,
      {
        inputs: [text],
        target_language_code: langCode,
        speaker: 'meera',
        model: 'bulbul:v1',
        pace,
      },
      {
        headers: {
          'api-subscription-key': env.SARVAM_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );

    const { audios } = response.data as { audios: string[] };
    if (!audios?.[0]) return null;

    return { base64Audio: audios[0], mimeType: 'audio/wav' };
  } catch (err) {
    console.error('[Sarvam TTS] Error:', err);
    return null;
  }
};

/**
 * Generate alert audio message
 */
export const generateAlertAudio = async (
  alertTitle: string,
  instructions: string,
  language: string
): Promise<TTSResult | null> => {
  const text = instructions
    ? `${alertTitle}. ${instructions}`
    : alertTitle;
  return generateTTS(text, language, 0.85);
};

/**
 * Generate early warning audio
 */
export const generateEarlyWarningAudio = async (
  secondsUntilWave: number,
  language: string
): Promise<TTSResult | null> => {
  const text = `Earthquake wave arriving in ${Math.round(secondsUntilWave)} seconds. Take cover immediately. Drop, cover, hold on.`;
  return generateTTS(text, language, 0.8);
};
