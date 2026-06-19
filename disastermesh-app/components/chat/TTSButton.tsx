import { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS } from '../../utils/constants';

const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY || '';

interface Props { text: string; language?: string; size?: number; }

export function TTSButton({ text, language = 'en-IN', size = 18 }: Props) {
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const play = async () => {
    if (loading) return;
    // Stop any current playback
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); }

    setLoading(true);
    try {
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: { 'api-subscription-key': SARVAM_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [text.slice(0, 500)],
          target_language_code: language,
          speaker: 'meera',
          model: 'bulbul:v1',
          pace: 0.9,
        }),
      });
      const { audios } = await response.json();
      if (!audios?.[0]) return;

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: false });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${audios[0]}` },
        { shouldPlay: true, volume: 1.0 }
      );
      setSound(newSound);
    } catch (err) {
      console.warn('[TTS] Playback failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={play} style={styles.btn}>
      {loading
        ? <ActivityIndicator size="small" color={COLORS.muted} />
        : <Ionicons name="volume-medium-outline" size={size} color={COLORS.muted} />
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
