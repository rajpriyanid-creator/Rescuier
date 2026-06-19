import axios from 'axios';
import { env } from '../config/env';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'normal' | 'high';
}

/**
 * Send push notifications via Expo Push API
 * Batches up to 100 tokens per request
 */
export const sendPushNotifications = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  if (!tokens.length) return;

  const BATCH_SIZE = 100;
  const messages: PushMessage[] = tokens
    .filter((t) => t.startsWith('ExponentPushToken['))
    .map((to) => ({
      to,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    }));

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      await axios.post(env.EXPO_PUSH_URL, batch, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      });
    } catch (err) {
      console.error('[Push] Batch send error:', err);
    }
  }
};
